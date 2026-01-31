/**
 * CDL Training Session Booking API
 * 
 * This endpoint handles booking a student into a training session.
 * Key features:
 * - Join existing session OR create new session
 * - Enforce capacity limits per module type
 * - Validate enrollment before booking
 * - Handle payment validation
 * - Auto-assign instructor and truck for new sessions
 */

import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { Database, ModuleType, SessionType } from '@/../shared/types'
import { enforceRateLimit } from '@/lib/rateLimit'
import { addMinutes, addHours, isBefore, parseISO } from 'date-fns'
import { fromZonedTime, format as formatTz } from 'date-fns-tz'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {})

const TIMEZONE = 'America/New_York' // Florida
const ADVANCE_BOOKING_HOURS = 24

interface BookSessionRequest {
    // Either session_id (join existing) or module_id + date + time (create new)
    session_id?: string
    module_id?: string
    date?: string // YYYY-MM-DD
    time?: string // HH:mm
    // Payment
    payment_intent_id?: string
    setup_intent_id?: string
    payment_method_id?: string
    payment_method: 'card' | 'cash'
}

export async function POST(request: Request) {
    try {
        const body: BookSessionRequest = await request.json()
        const {
            session_id,
            module_id,
            date,
            time,
            payment_intent_id,
            setup_intent_id,
            payment_method_id,
            payment_method = 'card'
        } = body

        // Validate: either session_id OR (module_id + date + time)
        if (!session_id && (!module_id || !date || !time)) {
            return NextResponse.json({
                error: 'Either session_id or (module_id, date, time) required'
            }, { status: 400 })
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

        const supabaseAdmin = createClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Auth required
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Rate limit
        const rateLimitResponse = await enforceRateLimit(request, {
            prefix: 'session-booking',
            max: 10,
            windowSeconds: 300,
            userId: user.id,
        })
        if (rateLimitResponse) return rateLimitResponse

        // Get profile
        const { data: profile } = await (supabase.from('profiles') as any)
            .select('full_name, phone, role')
            .eq('id', user.id)
            .single()

        if (!profile?.full_name || !profile?.phone) {
            return NextResponse.json({
                error: 'Please complete your profile (name and phone) before booking'
            }, { status: 400 })
        }

        const isAdmin = profile?.role === 'admin' || profile?.role === 'instructor'

        // Check enrollment (non-admins only)
        if (!isAdmin) {
            const { data: enrollment } = await (supabaseAdmin.from('enrollments') as any)
                .select('id, active')
                .eq('student_id', user.id)
                .eq('active', true)
                .single()

            if (!enrollment) {
                return NextResponse.json({
                    error: 'You must be enrolled in a CDL program to book sessions',
                    enrolled: false
                }, { status: 403 })
            }
        }

        let targetSession: any = null
        let targetModule: any = null
        let sessionDate: string
        let startTime: string
        let endTime: string
        let isNewSession = false

        if (session_id) {
            // Join existing session
            const { data: session, error } = await (supabaseAdmin.from('training_sessions') as any)
                .select(`
                    *,
                    training_modules (*)
                `)
                .eq('id', session_id)
                .single()

            if (error || !session) {
                return NextResponse.json({ error: 'Session not found' }, { status: 404 })
            }

            if (session.status !== 'open') {
                return NextResponse.json({
                    error: 'This session is no longer available for booking'
                }, { status: 409 })
            }

            if (session.current_capacity >= session.max_capacity) {
                return NextResponse.json({
                    error: 'This session is full'
                }, { status: 409 })
            }

            targetSession = session
            targetModule = session.training_modules
            sessionDate = session.session_date
            startTime = session.start_time
            endTime = session.end_time
        } else {
            // Create new session
            const { data: module, error } = await (supabaseAdmin.from('training_modules') as any)
                .select('*')
                .eq('id', module_id)
                .eq('active', true)
                .single()

            if (error || !module) {
                return NextResponse.json({ error: 'Module not found' }, { status: 404 })
            }

            targetModule = module
            sessionDate = date!
            startTime = time!
            endTime = `${(parseInt(time!.split(':')[0]) + 1).toString().padStart(2, '0')}:00`
            isNewSession = true
        }

        // Validate weekend
        const targetDateZoned = fromZonedTime(`${sessionDate} 00:00`, TIMEZONE)
        const dayOfWeek = parseInt(formatTz(targetDateZoned, 'i', { timeZone: TIMEZONE })) % 7
        if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isAdmin) {
            return NextResponse.json({
                error: 'Training is only available on weekends'
            }, { status: 400 })
        }

        // Validate advance booking
        const nowUTC = new Date()
        const sessionStartUTC = fromZonedTime(`${sessionDate} ${startTime}`, TIMEZONE)
        const minBookingTime = addHours(nowUTC, ADVANCE_BOOKING_HOURS)

        if (isBefore(sessionStartUTC, minBookingTime) && !isAdmin) {
            return NextResponse.json({
                error: `Sessions must be booked at least ${ADVANCE_BOOKING_HOURS} hours in advance`
            }, { status: 400 })
        }

        // Check for duplicate booking by this user for same session/time
        const sessionEndUTC = fromZonedTime(`${sessionDate} ${endTime}`, TIMEZONE)

        const { data: existingBookings } = await (supabaseAdmin.from('bookings') as any)
            .select('id')
            .eq('client_id', user.id)
            .not('status', 'in', '(cancelled,declined)')
            .gte('end_datetime', sessionStartUTC.toISOString())
            .lte('start_datetime', sessionEndUTC.toISOString())

        if (existingBookings && existingBookings.length > 0) {
            return NextResponse.json({
                error: 'You already have a booking for this time slot'
            }, { status: 409 })
        }

        // Validate payment
        const normalizedPaymentMethod = payment_method === 'cash' ? 'cash' : 'card'
        let paymentStatus = 'pending'

        if (normalizedPaymentMethod === 'card' && payment_intent_id) {
            try {
                const intent = await stripe.paymentIntents.retrieve(payment_intent_id)

                if (intent.status !== 'succeeded' && intent.status !== 'requires_capture') {
                    return NextResponse.json({
                        error: `Payment not completed: ${intent.status}`
                    }, { status: 400 })
                }

                if (intent.amount !== targetModule.price_cents) {
                    return NextResponse.json({
                        error: 'Payment amount mismatch'
                    }, { status: 400 })
                }

                paymentStatus = 'authorized'
            } catch (err) {
                console.error('Stripe verification error:', err)
                return NextResponse.json({ error: 'Invalid payment' }, { status: 400 })
            }
        } else if (normalizedPaymentMethod === 'cash') {
            if (setup_intent_id || payment_method_id) {
                paymentStatus = 'cash_pending' // Has fallback card
            } else {
                return NextResponse.json({
                    error: 'Cash payments require a card on file for no-show protection'
                }, { status: 400 })
            }
        }

        // If new session, create it first
        let finalSessionId = session_id

        if (isNewSession) {
            // Find available instructor for this module
            const { data: instructorAvail } = await (supabaseAdmin.from('instructor_availability') as any)
                .select(`
                    instructor_id,
                    instructors (
                        id,
                        can_teach,
                        active
                    )
                `)
                .eq('day_of_week', dayOfWeek)
                .lte('start_time', startTime)
                .gte('end_time', endTime)

            const availableInstructor = instructorAvail?.find((ia: any) =>
                ia.instructors?.active &&
                ia.instructors?.can_teach?.includes(targetModule.module_type)
            )

            // Find available truck if needed
            let truckId: string | null = null
            if (targetModule.requires_truck) {
                const { data: trucks } = await (supabaseAdmin.from('trucks') as any)
                    .select('id')
                    .eq('active', true)

                // Check which trucks are busy at this time
                const { data: busySessions } = await (supabaseAdmin.from('training_sessions') as any)
                    .select('truck_id')
                    .eq('session_date', sessionDate)
                    .eq('start_time', startTime)
                    .not('truck_id', 'is', null)

                const busyTruckIds = busySessions?.map((s: any) => s.truck_id) || []
                const availableTruck = trucks?.find((t: any) => !busyTruckIds.includes(t.id))

                if (!availableTruck) {
                    return NextResponse.json({
                        error: 'No truck available for this time slot'
                    }, { status: 409 })
                }
                truckId = availableTruck.id
            }

            // Determine session type
            let sessionType: SessionType
            if (targetModule.module_type === 'road') {
                sessionType = 'private'
            } else if (targetModule.module_type === 'backing') {
                sessionType = 'paired'
            } else {
                sessionType = 'group'
            }

            // Create the session
            const { data: newSession, error: sessionError } = await (supabaseAdmin.from('training_sessions') as any)
                .insert({
                    module_id: targetModule.id,
                    instructor_id: availableInstructor?.instructor_id || null,
                    truck_id: truckId,
                    session_date: sessionDate,
                    start_time: startTime,
                    end_time: endTime,
                    session_type: sessionType,
                    max_capacity: targetModule.capacity,
                    current_capacity: 0, // Will be updated by trigger
                    is_fixed: startTime === '08:00' && targetModule.module_type === 'pretrip',
                    status: 'open'
                })
                .select()
                .single()

            if (sessionError || !newSession) {
                console.error('Failed to create session:', sessionError)
                return NextResponse.json({
                    error: 'Failed to create training session'
                }, { status: 500 })
            }

            finalSessionId = newSession.id
            targetSession = newSession
        }

        // Create the booking
        const { data: booking, error: bookingError } = await (supabaseAdmin.from('bookings') as any)
            .insert({
                client_id: user.id,
                module_id: targetModule.id,
                session_id: finalSessionId,
                instructor_id: targetSession?.instructor_id || null,
                truck_id: targetSession?.truck_id || null,
                module_type_enum: targetModule.module_type,
                session_type_enum: targetSession?.session_type || 'private',
                start_datetime: sessionStartUTC.toISOString(),
                end_datetime: sessionEndUTC.toISOString(),
                status: 'confirmed', // CDL sessions are auto-confirmed with payment
                payment_method: normalizedPaymentMethod,
                payment_status: paymentStatus,
                payment_intent_id: normalizedPaymentMethod === 'card' ? payment_intent_id : null,
                setup_intent_id: normalizedPaymentMethod === 'cash' ? setup_intent_id : null,
                payment_method_id: normalizedPaymentMethod === 'cash' ? payment_method_id : null,
                amount_cents: targetModule.price_cents,
                hours_logged: 0
            })
            .select()
            .single()

        if (bookingError) {
            console.error('Failed to create booking:', bookingError)
            return NextResponse.json({
                error: 'Failed to create booking',
                details: bookingError.message
            }, { status: 500 })
        }

        // Return success with confirmation details
        return NextResponse.json({
            success: true,
            booking: {
                id: booking.id,
                module_name: targetModule.name,
                module_type: targetModule.module_type,
                date: sessionDate,
                start_time: startTime,
                end_time: endTime,
                price: targetModule.price_cents / 100,
                session_type: targetSession?.session_type || 'private',
                confirmation: {
                    message: getConfirmationMessage(targetModule.module_type, targetSession?.session_type),
                    notes: [
                        'Arrive 10 minutes early',
                        'Late arrival does not extend session time',
                        'Bring valid ID',
                        targetModule.module_type !== 'pretrip' ? 'Wear closed-toe shoes' : null
                    ].filter(Boolean)
                }
            }
        })

    } catch (e) {
        console.error('Session booking error:', e)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

function getConfirmationMessage(moduleType: ModuleType, sessionType?: SessionType): string {
    switch (moduleType) {
        case 'pretrip':
            return 'Your Pre-Trip Inspection session is confirmed. This is a group classroom session where you will learn comprehensive pre-trip inspection procedures.'
        case 'road':
            return 'Your Road Training session is confirmed. This is a private 1-on-1 session. You will have the full hour of behind-the-wheel driving time with your instructor.'
        case 'backing':
            if (sessionType === 'paired') {
                return 'Your Backing Practice session is confirmed. This session may include up to 2 students sharing wheel time. Each student will practice backing maneuvers with instructor guidance.'
            }
            return 'Your Backing Practice session is confirmed.'
        default:
            return 'Your training session is confirmed.'
    }
}
