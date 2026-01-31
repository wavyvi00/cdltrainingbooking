import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { Database } from '@/../shared/types'
import { enforceRateLimit } from '@/lib/rateLimit'
import { addMinutes, isBefore, isAfter, addHours } from 'date-fns'
import { fromZonedTime, format as formatTz } from 'date-fns-tz'

const BUFFER_MINUTES = 15
const SLOT_INTERVAL_MINUTES = 30
const TIMEZONE = 'America/Chicago'

// ... imports

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const dateString = searchParams.get('date') // YYYY-MM-DD
    const durationParam = searchParams.get('duration')
    const serviceDuration = durationParam ? parseInt(durationParam) : 30

    if (!dateString) {
        return NextResponse.json({ error: 'Date is required' }, { status: 400 })
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rateLimitResponse = await enforceRateLimit(request, {
        prefix: 'availability',
        max: 90,
        windowSeconds: 60,
        userId: user.id,
    })
    if (rateLimitResponse) {
        return rateLimitResponse
    }

    const { data: profile } = await (supabase
        .from('profiles') as any)
        .select('role')
        .eq('id', user.id)
        .single()

    const isAdmin = profile?.role === 'admin' || profile?.role === 'barber'

    // 1. Get working hours for this day of week (Logic based on OKC time)
    // Parse the dateString as if it is in OKC time to start of day
    const targetDateZoned = fromZonedTime(`${dateString} 00:00`, TIMEZONE)
    // Get numeric day of week in OKC (0 = Sun, 1 = Mon...)
    const dayOfWeek = parseInt(formatTz(targetDateZoned, 'i', { timeZone: TIMEZONE })) % 7

    const { data: rules } = await supabaseAdmin
        .from('availability_rules')
        .select('*')
        .eq('day_of_week', dayOfWeek)

    if (!rules || rules.length === 0) {
        return NextResponse.json({ slots: [], status: 'closed' }) // Closed today
    }

    // 2. Get existing bookings for this date (Range in UTC)
    // Calculate start and end of day in UTC for the query
    const dayStartUTC = fromZonedTime(`${dateString} 00:00:00`, TIMEZONE)
    const dayEndUTC = fromZonedTime(`${dateString} 23:59:59.999`, TIMEZONE)

    let timeOff: any[] = []
    if (!isAdmin) {
        const { data: timeOffData } = await supabaseAdmin
            .from('time_off')
            .select('start_datetime, end_datetime')
            .lt('start_datetime', dayEndUTC.toISOString())
            .gt('end_datetime', dayStartUTC.toISOString())

        timeOff = timeOffData || []
    }

    const { data: bookings } = await supabaseAdmin
        .from('bookings')
        .select('start_datetime, end_datetime')
        .in('status', ['accepted', 'confirmed', 'arrived', 'completed', 'no_show'])
        .gte('end_datetime', dayStartUTC.toISOString())
        .lte('start_datetime', dayEndUTC.toISOString())

    // 3. Generate slots
    const availableSlots: string[] = []

    // Booking Constraint: Must be at least 12 hours from now
    const nowUTC = new Date()
    const minBookingTimeUTC = addHours(nowUTC, 12)

    for (const rule of (rules as any[])) {
        // Parse rule times (which are just HH:mm) combined with the target date
        // Treat them as OKC times
        let currentSlotZoned = fromZonedTime(`${dateString} ${rule.start_time}`, TIMEZONE)
        const endTimeZoned = fromZonedTime(`${dateString} ${rule.end_time}`, TIMEZONE)

        while (isBefore(currentSlotZoned, endTimeZoned)) {
            // Check if WE can fit the service starting at currentTime
            const proposedSlotEndZoned = addMinutes(currentSlotZoned, serviceDuration)

            // If the service goes past closing time, break
            if (isAfter(proposedSlotEndZoned, endTimeZoned)) {
                break;
            }

            // 12-Hour Rule Check:
            // Compare the UTC equivalent of this slot start time against our minBookingTimeUTC
            if (isBefore(currentSlotZoned, minBookingTimeUTC)) {
                // Skip this slot, it's too soon (or in the past)
                // Move to next interval
                currentSlotZoned = addMinutes(currentSlotZoned, SLOT_INTERVAL_MINUTES)
                continue;
            }

            const isDuringTimeOff = timeOff?.some((block: any) => {
                const blockStart = new Date(block.start_datetime)
                const blockEnd = new Date(block.end_datetime)
                return isBefore(currentSlotZoned, blockEnd) && isAfter(proposedSlotEndZoned, blockStart)
            })

            if (isDuringTimeOff) {
                currentSlotZoned = addMinutes(currentSlotZoned, SLOT_INTERVAL_MINUTES)
                continue;
            }

            // Check collision with bookings + buffer
            const isBlocked = bookings?.some((booking: any) => {
                const bookingStart = new Date(booking.start_datetime) // UTC from DB
                const bookingEnd = new Date(booking.end_datetime)   // UTC from DB

                // Add buffer to booking
                const bufferedStart = addMinutes(bookingStart, -BUFFER_MINUTES)
                const bufferedEnd = addMinutes(bookingEnd, BUFFER_MINUTES)

                // Overlap check in UTC
                return isBefore(currentSlotZoned, bufferedEnd) && isAfter(proposedSlotEndZoned, bufferedStart)
            })

            if (!isBlocked) {
                // Return just the HH:mm time
                // Format in OKC time so it matches what user expects (e.g. 14:00)
                availableSlots.push(formatTz(currentSlotZoned, 'HH:mm', { timeZone: TIMEZONE }))
            }

            // Move to next interval
            currentSlotZoned = addMinutes(currentSlotZoned, SLOT_INTERVAL_MINUTES)
        }
    }

    return NextResponse.json({ slots: availableSlots, status: 'open' })
}
