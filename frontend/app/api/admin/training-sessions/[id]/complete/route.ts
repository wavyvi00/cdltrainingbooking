/**
 * Complete Training Session
 * 
 * POST - Mark a training session as completed
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

    const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    try {
        // Update session status to completed
        const { error: updateError } = await (adminClient.from('training_sessions') as any)
            .update({
                status: 'completed',
                completed_at: new Date().toISOString()
            })
            .eq('id', id)

        if (updateError) {
            console.error('Update session error:', updateError)
            return NextResponse.json({ error: 'Failed to complete session' }, { status: 500 })
        }

        // Also mark any remaining 'arrived' bookings as completed
        await (adminClient.from('bookings') as any)
            .update({ status: 'completed' })
            .eq('session_id', id)
            .eq('status', 'arrived')

        return NextResponse.json({
            success: true,
            message: 'Session completed successfully'
        })
    } catch (error) {
        console.error('Complete session error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
