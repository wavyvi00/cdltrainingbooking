/**
 * CDL Training Dates API
 * 
 * Returns available training dates (weekends only) for the next N weeks.
 * Also indicates which dates have available sessions.
 */

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Database } from '@/../shared/types'
import { addDays, addWeeks, format, isSaturday, isSunday, isAfter, startOfDay } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

const TIMEZONE = 'America/New_York'
const WEEKS_AHEAD = 8 // Show dates for next 8 weeks

export interface TrainingDate {
    date: string // YYYY-MM-DD
    dayOfWeek: 'Saturday' | 'Sunday'
    hasAvailability: boolean
    hasSessions: boolean // Has existing sessions with spots open
    sessionsCount?: number
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const weeksParam = searchParams.get('weeks')
    const weeksAhead = weeksParam ? Math.min(parseInt(weeksParam), 12) : WEEKS_AHEAD

    const supabaseAdmin = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get today in Florida time
    const nowUTC = new Date()
    const nowFlorida = toZonedTime(nowUTC, TIMEZONE)
    const todayFlorida = startOfDay(nowFlorida)

    // Generate list of weekend days for the next N weeks
    const endDate = addWeeks(todayFlorida, weeksAhead)
    const trainingDates: TrainingDate[] = []

    let currentDate = todayFlorida
    while (isAfter(endDate, currentDate) || format(currentDate, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd')) {
        if (isSaturday(currentDate) || isSunday(currentDate)) {
            trainingDates.push({
                date: format(currentDate, 'yyyy-MM-dd'),
                dayOfWeek: isSaturday(currentDate) ? 'Saturday' : 'Sunday',
                hasAvailability: true, // Will be updated below
                hasSessions: false,
            })
        }
        currentDate = addDays(currentDate, 1)
    }

    if (trainingDates.length === 0) {
        return NextResponse.json({ dates: [], message: 'No training dates available' })
    }

    // Check which dates have existing open sessions
    const dateStrings = trainingDates.map(d => d.date)

    const { data: sessions } = await (supabaseAdmin.from('training_sessions') as any)
        .select('session_date, status')
        .in('session_date', dateStrings)
        .eq('status', 'open')

    const dateSessionCounts = new Map<string, number>()
    sessions?.forEach((s: any) => {
        const count = dateSessionCounts.get(s.session_date) || 0
        dateSessionCounts.set(s.session_date, count + 1)
    })

    // Update dates with session info
    trainingDates.forEach(d => {
        const count = dateSessionCounts.get(d.date) || 0
        d.hasSessions = count > 0
        d.sessionsCount = count
    })

    // Check for instructor availability (at least one instructor must be available)
    const weekDays = [0, 6] // Sunday = 0, Saturday = 6
    const { data: instructorAvail } = await (supabaseAdmin.from('instructor_availability') as any)
        .select('day_of_week')
        .in('day_of_week', weekDays)

    const hasWeekendInstructors = instructorAvail && instructorAvail.length > 0

    if (!hasWeekendInstructors) {
        // No instructors available on weekends
        trainingDates.forEach(d => {
            d.hasAvailability = false
        })
    }

    return NextResponse.json({
        dates: trainingDates,
        timezone: TIMEZONE,
        weeksShown: weeksAhead
    })
}
