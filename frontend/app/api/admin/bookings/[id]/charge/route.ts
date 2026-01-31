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
            .select('client_id, amount_cents, payment_method, payment_status, setup_intent_id, payment_method_id, services(price_cents)')
            .eq('id', id)
            .single()

        if (fetchError || !booking) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
        }

        // 3. Validate: Only cash bookings can be charged via this route
        if (booking.payment_method !== 'cash') {
            return NextResponse.json({ error: 'Only cash bookings can be charged via this route' }, { status: 400 })
        }

        // 4. Get Stripe Customer ID from profile
        if (!booking.client_id) {
            return NextResponse.json({ error: 'No client associated with this booking. Cannot charge.' }, { status: 400 })
        }

        const { data: clientProfile } = await (supabaseAdmin.from('profiles') as any)
            .select('stripe_customer_id')
            .eq('id', booking.client_id)
            .single()

        if (!clientProfile?.stripe_customer_id) {
            return NextResponse.json({ error: 'Customer does not have a Stripe customer ID.' }, { status: 400 })
        }

        const stripeCustomerId = clientProfile.stripe_customer_id

        // 5. Determine the payment method to charge
        let paymentMethodId: string | null = null

        // Priority 1: Explicit payment_method_id on the booking
        if (booking.payment_method_id) {
            paymentMethodId = booking.payment_method_id
        }
        // Priority 2: SetupIntent -> retrieve payment_method from it
        else if (booking.setup_intent_id) {
            try {
                const setupIntent = await stripe.setupIntents.retrieve(booking.setup_intent_id)
                if (setupIntent.payment_method && typeof setupIntent.payment_method === 'string') {
                    paymentMethodId = setupIntent.payment_method
                } else if (setupIntent.payment_method && typeof setupIntent.payment_method === 'object') {
                    paymentMethodId = setupIntent.payment_method.id
                }
            } catch (e) {
                console.error('Failed to retrieve SetupIntent:', e)
            }
        }
        // Priority 3: List customer's payment methods and use the most recent
        if (!paymentMethodId) {
            try {
                const paymentMethods = await stripe.paymentMethods.list({
                    customer: stripeCustomerId,
                    type: 'card',
                    limit: 1,
                })
                if (paymentMethods.data.length > 0) {
                    paymentMethodId = paymentMethods.data[0].id
                }
            } catch (e) {
                console.error('Failed to list payment methods:', e)
            }
        }

        if (!paymentMethodId) {
            return NextResponse.json({ error: 'No valid payment method found for this customer.' }, { status: 400 })
        }

        // 6. Determine amount to charge (server-side source of truth)
        const amountCents = booking.amount_cents || booking.services?.price_cents
        if (!amountCents || amountCents <= 0) {
            return NextResponse.json({ error: 'Invalid booking amount.' }, { status: 400 })
        }

        // 7. Create and confirm PaymentIntent (off-session)
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountCents,
            currency: 'usd',
            customer: stripeCustomerId,
            payment_method: paymentMethodId,
            off_session: true,
            confirm: true,
            description: `No-show charge for booking ${id}`,
            metadata: {
                booking_id: id,
                type: 'no_show_charge'
            }
        })

        // 8. Update booking status
        await (supabaseAdmin.from('bookings') as any)
            .update({
                payment_status: 'no_show_charged',
                payment_intent_id: paymentIntent.id,
                charged_reason: reason
            })
            .eq('id', id)

        return NextResponse.json({ success: true, payment_intent_id: paymentIntent.id })

    } catch (e: any) {
        console.error('Charge API Error:', e)
        // Handle Stripe-specific errors
        if (e.type === 'StripeCardError') {
            return NextResponse.json({ error: `Card error: ${e.message}` }, { status: 400 })
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
