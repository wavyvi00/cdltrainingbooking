/**
 * CDL Training Sessions Availability API
 * 
 * This endpoint returns available training sessions for a given date.
 * Key differences from the original availability API:
 * - Weekend-only (Saturday=6, Sunday=0)
 * - Session-based (not slot-based)
 * - Shows existing sessions students can join
 * - Tracks module-specific capacity
 * - Resource constraints: instructor + truck availability
 */

import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { Database, ModuleType, TrainingSession, TrainingModule } from '@/../shared/types'
import { enforceRateLimit } from '@/lib/rateLimit'
import { addHours, isBefore, parseISO, format } from 'date-fns'
import { fromZonedTime, format as formatTz, toZonedTime } from 'date-fns-tz'

const TIMEZONE = 'America/New_York' // Florida timezone
const ADVANCE_BOOKING_HOURS = 24 // Must book 24 hours in advance

// Fixed 8 AM Pre-Trip session parameters
const FIXED_PRETRIP_START = '08:00'
const FIXED_PRETRIP_END = '09:00'
const FIXED_PRETRIP_CAPACITY = 8

// Training day hours
const TRAINING_START_HOUR = 9 // After fixed pre-trip
const TRAINING_END_HOUR = 17 // 5 PM

export interface AvailableSession {
    id?: string // Existing session ID if joinable
    module_id: string
    module_name: string
    module_type: ModuleType
    session_type: 'private' | 'paired' | 'group'
    start_time: string // HH:mm
    end_time: string // HH:mm
    price_cents: number
    capacity: number
    current_capacity: number
    is_fixed: boolean
    is_new: boolean // True if this would create a new session
    instructor_name?: string
    truck_name?: string
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const dateString = searchParams.get('date') // YYYY-MM-DD
    const moduleTypeFilter = searchParams.get('module_type') as ModuleType | null

    if (!dateString) {
        return NextResponse.json({ error: 'Date is required' }, { status: 400 })
    }

    // Validate date format
    const dateMatch = dateString.match(/^\d{4}-\d{2}-\d{2}$/)
    if (!dateMatch) {
        return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
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

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting
    const rateLimitResponse = await enforceRateLimit(request, {
        prefix: 'cdl-sessions',
        max: 60,
        windowSeconds: 60,
        userId: user.id,
    })
    if (rateLimitResponse) return rateLimitResponse

    // Check user profile and enrollment
    const { data: profile } = await (supabase.from('profiles') as any)
        .select('role')
        .eq('id', user.id)
        .single()

    const isAdmin = profile?.role === 'admin' || profile?.role === 'instructor'

    // Check enrollment (non-admins must be enrolled)
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

    // Parse date and check weekend
    const targetDate = fromZonedTime(`${dateString} 00:00`, TIMEZONE)
    const dayOfWeek = parseInt(formatTz(targetDate, 'i', { timeZone: TIMEZONE })) % 7
    // 0 = Sunday, 6 = Saturday

    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        return NextResponse.json({
            sessions: [],
            status: 'closed',
            message: 'Training is only available on weekends (Saturday & Sunday)'
        })
    }

    // Check advance booking requirement
    const nowUTC = new Date()
    const minBookingTimeUTC = addHours(nowUTC, ADVANCE_BOOKING_HOURS)
    const dayStartUTC = fromZonedTime(`${dateString} ${FIXED_PRETRIP_START}`, TIMEZONE)

    if (isBefore(dayStartUTC, minBookingTimeUTC) && !isAdmin) {
        return NextResponse.json({
            sessions: [],
            status: 'too_late',
            message: `Sessions must be booked at least ${ADVANCE_BOOKING_HOURS} hours in advance`
        })
    }

    // Fetch training modules
    const { data: modules } = await (supabaseAdmin.from('training_modules') as any)
        .select('*')
        .eq('active', true)
        .order('display_order')

    if (!modules || modules.length === 0) {
        return NextResponse.json({ sessions: [], status: 'no_modules' })
    }

    // Fetch existing sessions for this date
    const { data: existingSessions } = await (supabaseAdmin.from('training_sessions') as any)
        .select(`
            *,
            training_modules (name, module_type, price_cents),
            instructors (
                id,
                profiles (full_name)
            ),
            trucks (name)
        `)
        .eq('session_date', dateString)
        .in('status', ['open', 'full'])

    // Fetch available instructors for this day
    const { data: instructorAvailability } = await (supabaseAdmin.from('instructor_availability') as any)
        .select(`
            *,
            instructors (
                id,
                can_teach,
                active,
                profiles (full_name)
            )
        `)
        .eq('day_of_week', dayOfWeek)

    // Fetch active trucks
    const { data: trucks } = await (supabaseAdmin.from('trucks') as any)
        .select('id, name')
        .eq('active', true)

    const availableSessions: AvailableSession[] = []

    // 1. Fixed 8-9 AM Pre-Trip Session (always exists on training days)
    const fixedPretripModule = modules.find((m: any) =>
        m.module_type === 'pretrip' && m.name.includes('8 AM')
    )

    if (fixedPretripModule) {
        const existingFixedPretrip = existingSessions?.find((s: any) =>
            s.is_fixed && s.start_time === FIXED_PRETRIP_START
        )

        if (existingFixedPretrip) {
            // Show existing session (joinable if not full)
            if (existingFixedPretrip.status === 'open') {
                availableSessions.push({
                    id: existingFixedPretrip.id,
                    module_id: fixedPretripModule.id,
                    module_name: fixedPretripModule.name,
                    module_type: 'pretrip',
                    session_type: 'group',
                    start_time: FIXED_PRETRIP_START,
                    end_time: FIXED_PRETRIP_END,
                    price_cents: fixedPretripModule.price_cents,
                    capacity: existingFixedPretrip.max_capacity,
                    current_capacity: existingFixedPretrip.current_capacity,
                    is_fixed: true,
                    is_new: false,
                    instructor_name: existingFixedPretrip.instructors?.profiles?.full_name,
                })
            }
        } else {
            // No existing session - offer to create one
            availableSessions.push({
                module_id: fixedPretripModule.id,
                module_name: fixedPretripModule.name,
                module_type: 'pretrip',
                session_type: 'group',
                start_time: FIXED_PRETRIP_START,
                end_time: FIXED_PRETRIP_END,
                price_cents: fixedPretripModule.price_cents,
                capacity: FIXED_PRETRIP_CAPACITY,
                current_capacity: 0,
                is_fixed: true,
                is_new: true,
            })
        }
    }

    // 2. Flexible sessions after 9 AM
    // Build list of busy time slots per instructor and truck
    const busyInstructorSlots = new Map<string, { start: string, end: string }[]>()
    const busyTruckSlots = new Map<string, { start: string, end: string }[]>()

    existingSessions?.forEach((session: any) => {
        if (session.instructor_id) {
            const slots = busyInstructorSlots.get(session.instructor_id) || []
            slots.push({ start: session.start_time, end: session.end_time })
            busyInstructorSlots.set(session.instructor_id, slots)
        }
        if (session.truck_id) {
            const slots = busyTruckSlots.get(session.truck_id) || []
            slots.push({ start: session.start_time, end: session.end_time })
            busyTruckSlots.set(session.truck_id, slots)
        }
    })

    // Add existing joinable sessions (non-fixed, still open)
    existingSessions?.forEach((session: any) => {
        if (!session.is_fixed && session.status === 'open') {
            const module = session.training_modules
            if (moduleTypeFilter && module?.module_type !== moduleTypeFilter) return

            availableSessions.push({
                id: session.id,
                module_id: session.module_id,
                module_name: module?.name || 'Unknown',
                module_type: module?.module_type || 'road',
                session_type: session.session_type,
                start_time: session.start_time,
                end_time: session.end_time,
                price_cents: module?.price_cents || 0,
                capacity: session.max_capacity,
                current_capacity: session.current_capacity,
                is_fixed: false,
                is_new: false,
                instructor_name: session.instructors?.profiles?.full_name,
                truck_name: session.trucks?.name,
            })
        }
    })

    // 3. Generate potential new session slots
    // Only generate if there are available instructors and (if needed) trucks
    const availableInstructors = instructorAvailability?.filter((ia: any) =>
        ia.instructors?.active
    ) || []

    if (availableInstructors.length > 0) {
        // Generate hourly slots from 9 AM to 5 PM
        for (let hour = TRAINING_START_HOUR; hour < TRAINING_END_HOUR; hour++) {
            const startTime = `${hour.toString().padStart(2, '0')}:00`
            const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`

            // Check if this slot already has a session
            const hasExistingSession = existingSessions?.some((s: any) =>
                s.start_time === startTime
            )

            if (hasExistingSession) continue

            // Check instructor availability for this slot
            const availableForSlot = availableInstructors.filter((ia: any) => {
                const instructorId = ia.instructor_id
                const busySlots = busyInstructorSlots.get(instructorId) || []

                // Check if instructor is within their working hours
                if (ia.start_time > startTime || ia.end_time < endTime) return false

                // Check if instructor is already busy
                return !busySlots.some(slot =>
                    slot.start < endTime && slot.end > startTime
                )
            })

            if (availableForSlot.length === 0) continue

            // Check truck availability for driving modules
            const availableTrucks = trucks?.filter((truck: any) => {
                const busySlots = busyTruckSlots.get(truck.id) || []
                return !busySlots.some(slot =>
                    slot.start < endTime && slot.end > startTime
                )
            }) || []

            // Add potential sessions for each module type
            for (const module of modules) {
                // Skip fixed 8 AM pretrip
                if (module.name.includes('8 AM')) continue

                // Apply module type filter
                if (moduleTypeFilter && module.module_type !== moduleTypeFilter) continue

                // Check if module requires truck and one is available
                if (module.requires_truck && availableTrucks.length === 0) continue

                // Check if any available instructor can teach this module
                const canTeach = availableForSlot.some((ia: any) =>
                    ia.instructors?.can_teach?.includes(module.module_type)
                )
                if (!canTeach) continue

                // Determine session type based on module
                let sessionType: 'private' | 'paired' | 'group'
                if (module.module_type === 'road') {
                    sessionType = 'private'
                } else if (module.module_type === 'backing') {
                    sessionType = 'paired'
                } else {
                    sessionType = 'group'
                }

                availableSessions.push({
                    module_id: module.id,
                    module_name: module.name,
                    module_type: module.module_type,
                    session_type: sessionType,
                    start_time: startTime,
                    end_time: endTime,
                    price_cents: module.price_cents,
                    capacity: module.capacity,
                    current_capacity: 0,
                    is_fixed: false,
                    is_new: true,
                })
            }
        }
    }

    // Sort sessions by start time, then by module type priority
    const modulePriority: Record<ModuleType, number> = { pretrip: 1, road: 2, backing: 3 }
    availableSessions.sort((a, b) => {
        if (a.start_time !== b.start_time) {
            return a.start_time.localeCompare(b.start_time)
        }
        return (modulePriority[a.module_type] || 99) - (modulePriority[b.module_type] || 99)
    })

    return NextResponse.json({
        sessions: availableSessions,
        status: 'open',
        date: dateString,
        is_weekend: true,
    })
}
