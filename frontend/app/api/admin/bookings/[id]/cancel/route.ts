import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { Database } from '@/../shared/types'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {})

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json().catch(() => ({}))
        const reason = body.reason || null

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
            .select('payment_method, payment_status, payment_intent_id, setup_intent_id')
            .eq('id', id)
            .single()

        if (fetchError || !booking) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
        }

        const isCard = booking.payment_method === 'card'
        const isCash = booking.payment_method === 'cash'

        // 3. Handle Stripe actions for card bookings
        if (isCard && booking.payment_intent_id) {
            if (booking.payment_status === 'paid') {
                // Already captured, need to refund
                try {
                    await stripe.refunds.create({
                        payment_intent: booking.payment_intent_id,
                    })
                } catch (e: any) {
                    console.error('Refund failed:', e)
                    // If refund fails, we still want to mark as cancelled in our system
                    // but we should log/alert this
                }
            } else if (booking.payment_status === 'authorized') {
                // Not captured yet, cancel the PaymentIntent to release the hold
                try {
                    await stripe.paymentIntents.cancel(booking.payment_intent_id)
                } catch (e: any) {
                    console.error('Cancel PaymentIntent failed:', e)
                    // Continue with cancellation in our system
                }
            }
        }

        // For cash bookings, no Stripe action required
        // Optionally cancel the SetupIntent if one exists
        if (isCash && booking.setup_intent_id) {
            try {
                await stripe.setupIntents.cancel(booking.setup_intent_id)
            } catch (e: any) {
                console.error('Cancel SetupIntent failed:', e)
                // Continue with cancellation
            }
        }

        // 4. Update booking status
        const { error: updateError } = await (supabaseAdmin.from('bookings') as any)
            .update({
                status: 'cancelled',
                payment_status: 'cancelled',
                canceled_reason: reason
            })
            .eq('id', id)

        if (updateError) {
            return NextResponse.json({ error: 'Failed to update booking status' }, { status: 500 })
        }

        return NextResponse.json({ success: true })

    } catch (e) {
        console.error('Cancel API Error:', e)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
