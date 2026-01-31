import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { Database } from '@/../shared/types'
import { enforceRateLimit } from '@/lib/rateLimit'
import { addMinutes, isBefore, isAfter, addHours } from 'date-fns'
import { fromZonedTime, format as formatTz } from 'date-fns-tz'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    // apiVersion: '2025-01-27.acacia', // Removed to use SDK default
})

const BUFFER_MINUTES = 15
const TIMEZONE = 'America/Chicago' // Hardcoded to Business Time

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const {
            service_id,
            date,
            time,
            customer_name,
            customer_email,
            customer_phone,
            payment_intent_id,
            setup_intent_id,
            payment_method_id,
            payment_method
        } = body

        if (!service_id || !date || !time) {
            return NextResponse.json({ error: 'Missing service, date, or time' }, { status: 400 })
        }

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
                        } catch { }
                    },
                },
            }
        )
        const supabaseAdmin = createClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // 0. Require authenticated user and load profile
        let userId = null
        let finalName = customer_name
        let finalEmail = customer_email
        let finalPhone = customer_phone

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        userId = user.id

        const rateLimitResponse = await enforceRateLimit(request, {
            prefix: 'bookings',
            max: 8,
            windowSeconds: 600,
            userId,
        })
        if (rateLimitResponse) {
            return rateLimitResponse
        }

        const { data: profile } = await (supabase
            .from('profiles') as any)
            .select('full_name, phone, role')
            .eq('id', userId)
            .single()

        const isAdmin = profile?.role === 'admin' || profile?.role === 'barber'

        if (profile) {
            // Prefer profile data for authenticated bookings
            if (profile.full_name) finalName = profile.full_name
            if (profile.phone) finalPhone = profile.phone
        }
        finalEmail = user.email || finalEmail

        // Validate Required Fields (Strict)
        if (!finalName || !finalEmail || !finalPhone) {
            return NextResponse.json({ error: 'Name, Email, and Phone are required.' }, { status: 400 })
        }

        // 1. Fetch Service Details (Duration)
        const { data: service } = await (supabase
            .from('services') as any)
            .select('*')
            .eq('id', service_id)
            .single()

        if (!service) {
            return NextResponse.json({ error: 'Service not found' }, { status: 404 })
        }
        if (!service.active && !isAdmin) {
            return NextResponse.json({ error: 'Service not available' }, { status: 404 })
        }

        // 2. Calculate Start and End Times in OKC Time -> UTC
        // This ensures "2026-01-21 14:00" is treated as 2:00 PM OKC time.
        // fromZonedTime returns a Date object which is inherently UTC.
        const startDateTime = fromZonedTime(`${date} ${time}`, TIMEZONE)
        const endDateTime = addMinutes(startDateTime, service.duration_min)

        // 12-Hour Restriction Check
        // We compare the requested start time (UTC) against the current time (UTC) + 12 hours
        const nowUTC = new Date()
        const minBookingTime = addHours(nowUTC, 12)

        if (isBefore(startDateTime, minBookingTime)) {
            return NextResponse.json(
                { error: 'Bookings must be made at least 12 hours in advance.' },
                { status: 400 }
            )
        }

        if (!isAdmin) {
            const targetDateZoned = fromZonedTime(`${date} 00:00:00`, TIMEZONE)
            const dayOfWeek = parseInt(formatTz(targetDateZoned, 'i', { timeZone: TIMEZONE })) % 7

            const { data: rules } = await (supabaseAdmin
                .from('availability_rules') as any)
                .select('start_time, end_time')
                .eq('day_of_week', dayOfWeek)

            const isWithinRules = (rules || []).some((rule: any) => {
                const ruleStart = fromZonedTime(`${date} ${rule.start_time}`, TIMEZONE)
                const ruleEnd = fromZonedTime(`${date} ${rule.end_time}`, TIMEZONE)
                return !isBefore(startDateTime, ruleStart) && !isAfter(endDateTime, ruleEnd)
            })

            if (!isWithinRules) {
                return NextResponse.json(
                    { error: 'Selected time is outside of availability.' },
                    { status: 400 }
                )
            }

            const { data: timeOff } = await (supabaseAdmin
                .from('time_off') as any)
                .select('id')
                .lt('start_datetime', endDateTime.toISOString())
                .gt('end_datetime', startDateTime.toISOString())

            if (timeOff && timeOff.length > 0) {
                return NextResponse.json(
                    { error: 'Selected time is unavailable.' },
                    { status: 409 }
                )
            }
        }

        // 3. COLLISION CHECK (Double Booking Prevention)
        // We need to check collisions for the DAY of the booking.
        // We calculate the start/end of the day in UTC *based on OKC time*
        const dayStartUTC = fromZonedTime(`${date} 00:00:00`, TIMEZONE)
        const dayEndUTC = fromZonedTime(`${date} 23:59:59.999`, TIMEZONE)

        const { data: globalBookings } = await (supabaseAdmin
            .from('bookings') as any)
            .select('start_datetime, end_datetime')
            .in('status', ['accepted', 'confirmed', 'arrived', 'completed', 'no_show'])
            .gte('end_datetime', dayStartUTC.toISOString())
            .lte('start_datetime', dayEndUTC.toISOString())

        const isBlocked = globalBookings?.some((booking: any) => {
            const bStart = new Date(booking.start_datetime) // UTC
            const bEnd = new Date(booking.end_datetime)     // UTC

            // Add buffer to existing booking
            const bufferedStart = addMinutes(bStart, -BUFFER_MINUTES)
            const bufferedEnd = addMinutes(bEnd, BUFFER_MINUTES)

            return isBefore(startDateTime, bufferedEnd) && isAfter(endDateTime, bufferedStart)
        })

        if (isBlocked) {
            return NextResponse.json(
                { error: 'Slot is no longer available. Please choose another time.' },
                { status: 409 }
            )
        }

        // 3.5 USER DUPLICATE CHECK
        // If the user is logged in, prevent them from booking overlapping slots
        if (userId) {
            const { data: userDuplicates } = await (supabase
                .from('bookings') as any)
                .select('id')
                .eq('client_id', userId)
                .neq('status', 'cancelled')
                .neq('status', 'declined') // Declined doesn't count, they can retry
                .gte('end_datetime', startDateTime.toISOString()) // End is after new Start
                .lte('start_datetime', endDateTime.toISOString()) // Start is before new End

            if (userDuplicates && userDuplicates.length > 0) {
                return NextResponse.json(
                    { error: 'You already have a booking request for this time.' },
                    { status: 400 }
                )
            }
        }

        // 4. Insert Booking
        // 4. Insert Booking
        // Determine payment_status for cash bookings: cash_pending if we have a fallback charge method
        const normalizedPaymentMethod = payment_method === 'cash' ? 'cash' : 'card'
        const hasCashFallback = setup_intent_id || payment_method_id;
        const cashPaymentStatus = hasCashFallback ? 'cash_pending' : 'pending';

        let cardPaymentStatus = 'pending';
        if (normalizedPaymentMethod === 'card' && payment_intent_id) {
            try {
                // Verify the intent exists and is valid
                const intent = await stripe.paymentIntents.retrieve(payment_intent_id);

                // Allow 'succeeded' or 'requires_capture' (if using auth/hold)
                if (intent.status !== 'succeeded' && intent.status !== 'requires_capture') {
                    return NextResponse.json({ error: `Payment Intent has invalid status: ${intent.status}` }, { status: 400 });
                }

                // Verify Amount
                if (intent.amount !== service.price_cents) {
                    return NextResponse.json({
                        error: 'Payment amount mismatch',
                        details: `Expected ${service.price_cents}, got ${intent.amount}`
                    }, { status: 400 });
                }

                if (intent.metadata?.user_id && intent.metadata.user_id !== userId) {
                    return NextResponse.json({ error: 'Payment Intent user mismatch' }, { status: 400 })
                }

                if (intent.metadata?.service_id && intent.metadata.service_id !== service_id) {
                    return NextResponse.json({ error: 'Payment Intent service mismatch' }, { status: 400 })
                }

                cardPaymentStatus = 'authorized';

            } catch (err) {
                console.error('Stripe Verification Error:', err);
                return NextResponse.json({ error: 'Invalid Payment Intent' }, { status: 400 });
            }
        }

        const { data: newBooking, error: insertError } = await (supabase
            .from('bookings') as any)
            .insert({
                service_id,
                client_id: userId, // Can be null
                barber_id: null, // Optional, can be null
                customer_name: finalName,
                customer_email: finalEmail,
                customer_phone: finalPhone,
                start_datetime: startDateTime.toISOString(),
                end_datetime: endDateTime.toISOString(),
                status: 'requested',
                payment_intent_id: normalizedPaymentMethod === 'card' ? payment_intent_id || null : null,
                setup_intent_id: normalizedPaymentMethod === 'cash' ? setup_intent_id || null : null,
                payment_method_id: normalizedPaymentMethod === 'cash' ? payment_method_id || null : null,
                payment_method: normalizedPaymentMethod,
                payment_status: normalizedPaymentMethod === 'cash' ? cashPaymentStatus : cardPaymentStatus,
                amount_cents: service.price_cents
            })
            .select()
            .single()

        if (insertError) {
            console.error("Insert Error:", insertError)
            return NextResponse.json({ error: 'Failed to create booking', details: insertError.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, booking: newBooking })

    } catch (e) {
        console.error("Booking API Error:", e)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
