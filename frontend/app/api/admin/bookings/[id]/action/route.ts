import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { Database } from '@/../shared/types'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    // apiVersion: '2025-01-27.acacia', 
})

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const { action } = await request.json() // 'accepted' | 'declined'

        if (!['accepted', 'declined'].includes(action)) {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
        }

        const cookieStore = await cookies()
        const supabase = createServerClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll() },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            )
                        } catch { }
                    },
                },
            }
        )

        // 1. Verify Admin
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const ownerId = process.env.OWNER_USER_ID
        if (!ownerId || user.id !== ownerId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { data: profile } = await (supabase.from('profiles') as any)
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const supabaseAdmin = createClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // 2. Fetch Booking
        const { data: booking, error: fetchError } = await (supabaseAdmin.from('bookings') as any)
            .select('payment_intent_id, payment_status, status, payment_method, setup_intent_id, start_datetime, end_datetime')
            .eq('id', id)
            .single()

        if (fetchError || !booking) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
        }

        // 3. Perform Logic depending on Method
        const isCard = booking.payment_method === 'card';
        const isCash = booking.payment_method === 'cash';

        if (action === 'accepted') {
            if (isCard && booking.payment_intent_id) {
                // Capture Payment
                if (booking.payment_status === 'paid') {
                    console.log("Already paid, skipping capture")
                } else {
                    await stripe.paymentIntents.capture(booking.payment_intent_id)
                }
            }
            // If Cash: We just confirm. No Stripe action needed for SetupIntent on accept (it's already set up).
        } else {
            // Declined -> Cancel everything
            if (isCard && booking.payment_intent_id) {
                if (booking.payment_status === 'cancelled') {
                    console.log("Already cancelled, skipping")
                } else {
                    try { await stripe.paymentIntents.cancel(booking.payment_intent_id) } catch (e) { console.error("Cancel PI failed", e) }
                }
            }

            // Optional: Cancel SetupIntent if we want to "release" the card, 
            // but usually we keep it on file. We'll skip canceling it explicitly 
            // unless we want to prevent future charges. 
            // For now, let's leave it alone or cancel it if strict. 
            // Let's cancel it for cleanliness if they are declined.
            if (isCash && booking.setup_intent_id) {
                try { await stripe.setupIntents.cancel(booking.setup_intent_id) } catch (e) { console.error("Cancel SI failed", e) }
            }
        }

        // 4. Update Supabase
        const updates: any = {
            status: action
        }

        if (action === 'accepted') {
            if (isCard) updates.payment_status = 'paid';
            if (isCash) updates.payment_status = 'cash_pending'; // Confirmed but not paid yet
        } else {
            updates.payment_status = 'cancelled';
        }

        const { error: updateError } = await (supabaseAdmin.from('bookings') as any)
            .update(updates)
            .eq('id', id)

        if (updateError) {
            return NextResponse.json({ error: 'Failed to update booking status' }, { status: 500 })
        }

        // If accepted, decline overlapping pending requests for the same time window
        if (action === 'accepted' && booking.start_datetime && booking.end_datetime) {
            const { data: overlaps } = await (supabaseAdmin.from('bookings') as any)
                .select('id, payment_method, payment_intent_id, setup_intent_id, payment_status')
                .neq('id', id)
                .in('status', ['requested', 'pending'])
                .lt('start_datetime', booking.end_datetime)
                .gt('end_datetime', booking.start_datetime)

            for (const other of overlaps || []) {
                try {
                    if (other.payment_method === 'card' && other.payment_intent_id) {
                        if (other.payment_status !== 'cancelled') {
                            await stripe.paymentIntents.cancel(other.payment_intent_id)
                        }
                    }
                    if (other.payment_method === 'cash' && other.setup_intent_id) {
                        await stripe.setupIntents.cancel(other.setup_intent_id)
                    }
                } catch (e) {
                    console.error('Failed to cancel payment for overlap', other?.id, e)
                }

                await (supabaseAdmin.from('bookings') as any)
                    .update({ status: 'declined', payment_status: 'cancelled' })
                    .eq('id', other.id)
            }
        }

        return NextResponse.json({ success: true })

    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
