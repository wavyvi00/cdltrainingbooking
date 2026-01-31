import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { Database } from '@/../shared/types'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {})

// Cancellation window: 4 hours before appointment
const CANCELLATION_WINDOW_HOURS = 4

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

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

        // 1. Verify User Session
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Fetch Booking
        const { data: booking, error: fetchError } = await (supabase.from('bookings') as any)
            .select('id, client_id, status, start_datetime, payment_method, payment_status, payment_intent_id, setup_intent_id')
            .eq('id', id)
            .single()

        if (fetchError || !booking) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
        }

        // 3. SECURITY: Verify ownership - user can only cancel their own bookings
        if (booking.client_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden: You can only cancel your own bookings' }, { status: 403 })
        }

        // 4. Check booking status - can only cancel active bookings
        const cancellableStatuses = ['requested', 'pending', 'accepted', 'confirmed']
        if (!cancellableStatuses.includes(booking.status)) {
            return NextResponse.json({
                error: `Cannot cancel booking with status: ${booking.status}`
            }, { status: 400 })
        }

        // 5. Check 4-hour cancellation window for accepted/confirmed bookings
        if (['accepted', 'confirmed'].includes(booking.status) && booking.start_datetime) {
            const appointmentTime = new Date(booking.start_datetime)
            const now = new Date()
            const hoursUntilAppointment = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60)

            if (hoursUntilAppointment < CANCELLATION_WINDOW_HOURS) {
                return NextResponse.json({
                    error: `Too late to cancel. Appointments must be cancelled at least ${CANCELLATION_WINDOW_HOURS} hours in advance. Please contact the shop directly.`
                }, { status: 403 })
            }
        }

        // 6. Handle Stripe actions
        const isCard = booking.payment_method === 'card'
        const isCash = booking.payment_method === 'cash'

        if (isCard && booking.payment_intent_id) {
            if (booking.payment_status === 'paid') {
                // Already captured - customer cannot self-refund
                return NextResponse.json({
                    error: 'This booking has already been charged. Please contact the shop for a refund.'
                }, { status: 403 })
            } else if (booking.payment_status === 'authorized') {
                // Release the hold by cancelling the PaymentIntent
                try {
                    await stripe.paymentIntents.cancel(booking.payment_intent_id)
                } catch (e: any) {
                    console.error('Cancel PaymentIntent failed:', e)
                    // Continue with cancellation in our system even if Stripe call fails
                }
            }
        }

        // For cash bookings, optionally cancel SetupIntent
        if (isCash && booking.setup_intent_id) {
            try {
                await stripe.setupIntents.cancel(booking.setup_intent_id)
            } catch (e: any) {
                console.error('Cancel SetupIntent failed:', e)
                // Continue with cancellation
            }
        }

        // 7. Update booking status
        const supabaseAdmin = createClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { error: updateError } = await (supabaseAdmin.from('bookings') as any)
            .update({
                status: 'cancelled',
                payment_status: 'cancelled'
            })
            .eq('id', id)

        if (updateError) {
            console.error('Failed to update booking:', updateError)
            return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 })
        }

        return NextResponse.json({ success: true })

    } catch (e) {
        console.error('Customer Cancel API Error:', e)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
