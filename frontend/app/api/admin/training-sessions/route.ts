/**
 * CDL Training Sessions Admin API
 * 
 * GET - Fetch all training sessions with student bookings
 */

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { addDays, format, startOfDay, endOfDay } from 'date-fns'

export async function GET(request: Request) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => cookieStore.getAll() } }
    )

    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const { data: profile } = await (supabase.from('profiles') as any)
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'barber')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') || 'today'

    // Build date filter
    const now = new Date()
    let dateCondition: { gte?: string; lte?: string } = {}

    switch (filter) {
        case 'today':
            dateCondition = {
                gte: format(startOfDay(now), 'yyyy-MM-dd'),
                lte: format(endOfDay(now), 'yyyy-MM-dd')
            }
            break
        case 'upcoming':
            dateCondition = {
                gte: format(addDays(now, 1), 'yyyy-MM-dd')
            }
            break
        case 'past':
            dateCondition = {
                lte: format(addDays(now, -1), 'yyyy-MM-dd')
            }
            break
        // 'all' has no date filter
    }

    // Use service role for full access
    const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    try {
        // Build query
        let query = (adminClient.from('training_sessions') as any)
            .select(`
                *,
                training_modules (name, module_type, duration_min, price_cents),
                instructors (full_name),
                trucks (name),
                bookings (
                    id,
                    customer_id,
                    customer_name,
                    customer_phone,
                    status,
                    payment_status,
                    hours_logged,
                    arrived_at
                )
            `)
            .order('session_date', { ascending: true })
            .order('start_time', { ascending: true })

        if (dateCondition.gte) {
            query = query.gte('session_date', dateCondition.gte)
        }
        if (dateCondition.lte) {
            query = query.lte('session_date', dateCondition.lte)
        }

        const { data: sessions, error } = await query

        if (error) {
            console.error('Sessions query error:', error)
            return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
        }

        // Transform data for frontend
        const formattedSessions = (sessions || []).map((session: any) => ({
            id: session.id,
            module_id: session.module_id,
            module_name: session.training_modules?.name || 'Unknown Module',
            module_type: session.training_modules?.module_type || 'road',
            session_date: session.session_date,
            start_time: session.start_time,
            end_time: session.end_time,
            session_type: session.session_type,
            max_capacity: session.max_capacity,
            current_capacity: session.current_capacity || 0,
            instructor_name: session.instructors?.full_name,
            truck_name: session.trucks?.name,
            status: session.status,
            bookings: (session.bookings || []).map((b: any) => ({
                id: b.id,
                student_id: b.customer_id,
                student_name: b.customer_name,
                student_phone: b.customer_phone,
                status: b.status,
                payment_status: b.payment_status,
                hours_logged: b.hours_logged || 0,
                arrived_at: b.arrived_at
            }))
        }))

        return NextResponse.json({ sessions: formattedSessions })
    } catch (error) {
        console.error('Admin sessions error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
