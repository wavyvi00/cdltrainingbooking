/**
 * Log Hours for a Student Booking
 * 
 * POST - Log training hours for a student's booking
 */

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params

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

    const body = await request.json()
    const { hours } = body

    if (typeof hours !== 'number' || hours < 0 || hours > 12) {
        return NextResponse.json({ error: 'Invalid hours value (0-12)' }, { status: 400 })
    }

    const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    try {
        // Get the booking details first
        const { data: booking, error: bookingError } = await (adminClient.from('bookings') as any)
            .select(`
                id, 
                customer_id, 
                session_id,
                training_sessions (module_id, session_date)
            `)
            .eq('id', id)
            .single()

        if (bookingError || !booking) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
        }

        // Update the booking with logged hours and mark as completed
        const { error: updateError } = await (adminClient.from('bookings') as any)
            .update({
                hours_logged: hours,
                status: 'completed',
                completed_at: new Date().toISOString()
            })
            .eq('id', id)

        if (updateError) {
            console.error('Update booking error:', updateError)
            return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
        }

        // Log hours to student_hour_logs if the table exists
        const session = booking.training_sessions
        if (session?.module_id) {
            const { error: logError } = await (adminClient.from('student_hour_logs') as any)
                .insert({
                    enrollment_id: booking.customer_id, // May need to look up actual enrollment
                    booking_id: id,
                    module_id: session.module_id,
                    hours_logged: hours,
                    session_date: session.session_date,
                    logged_by: user.id
                })

            if (logError) {
                // Non-fatal - the booking is already updated
                console.warn('Failed to create hour log entry:', logError)
            }
        }

        return NextResponse.json({
            success: true,
            message: `${hours} hour(s) logged successfully`,
            hours_logged: hours
        })
    } catch (error) {
        console.error('Log hours error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
