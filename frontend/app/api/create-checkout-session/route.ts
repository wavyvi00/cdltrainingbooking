
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { Database } from '@/../shared/types'
import { enforceRateLimit } from '@/lib/rateLimit'

export async function POST(request: Request) {
    const { booking_id, payment_type, success_url, cancel_url } = await request.json()

    const cookieStore = await cookies()

    const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )
    const supabaseAdmin = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rateLimitResponse = await enforceRateLimit(request, {
        prefix: 'checkout',
        max: 6,
        windowSeconds: 3600,
        userId: user.id,
    })
    if (rateLimitResponse) {
        return rateLimitResponse
    }

    // 1. Fetch Booking and Service details
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: booking } = await supabase
        .from('bookings')
        .select('*, services(*)')
        .eq('id', booking_id)
        .single() as any

    if (!booking || !booking.services) {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Security: Ensure the user owns the booking
    if (booking.client_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!['accepted', 'confirmed'].includes(booking.status)) {
        return NextResponse.json({ error: 'Booking must be approved before payment' }, { status: 409 })
    }

    const priceCents = booking.services.price_cents
    let amountToCharge = priceCents

    if (payment_type === 'deposit') {
        amountToCharge = Math.round(priceCents * 0.5) // 50% deposit
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    const getSafeUrl = (candidate: string | null | undefined, fallbackPath: string) => {
        if (!appUrl) return undefined
        try {
            const base = new URL(appUrl)
            if (!candidate) return new URL(fallbackPath, base).toString()
            const parsed = new URL(candidate)
            if (parsed.origin !== base.origin) return new URL(fallbackPath, base).toString()
            return parsed.toString()
        } catch {
            return appUrl ? new URL(fallbackPath, appUrl).toString() : undefined
        }
    }

    const successUrl = getSafeUrl(success_url, '/success')
    const cancelUrl = getSafeUrl(cancel_url, '/cancel')

    // 2. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
            {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `${booking.services.name} (${payment_type === 'deposit' ? 'Deposit' : 'Full Payment'})`,
                    },
                    unit_amount: amountToCharge,
                },
                quantity: 1,
            },
        ],
        mode: 'payment',
        success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/success`,
        cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/cancel`,
        metadata: {
            booking_id: booking.id,
            payment_type,
        },
    })

    // 3. Update booking with session ID (optional, but good for tracking)
    await (supabaseAdmin
        .from('bookings') as any)
        .update({ stripe_checkout_session_id: session.id })
        .eq('id', booking_id)

    return NextResponse.json({ url: session.url })
}
