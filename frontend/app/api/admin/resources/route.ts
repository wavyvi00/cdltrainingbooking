/**
 * Resources Admin API
 * 
 * GET/POST - Fetch or create instructors/trucks
 */

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: Request) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => cookieStore.getAll() } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await (supabase.from('profiles') as any)
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'barber')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'instructors'

    const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    try {
        if (type === 'instructors') {
            const { data, error } = await (adminClient.from('instructors') as any)
                .select('*')
                .order('full_name')

            if (error) throw error
            return NextResponse.json({ instructors: data || [] })
        } else {
            const { data, error } = await (adminClient.from('trucks') as any)
                .select('*')
                .order('name')

            if (error) throw error
            return NextResponse.json({ trucks: data || [] })
        }
    } catch (error) {
        console.error('Resources fetch error:', error)
        return NextResponse.json({ error: 'Failed to fetch resources' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => cookieStore.getAll() } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await (supabase.from('profiles') as any)
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || profile.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'instructors'
    const body = await request.json()

    const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    try {
        const table = type === 'instructors' ? 'instructors' : 'trucks'
        const { data, error } = await (adminClient.from(table) as any)
            .insert(body)
            .select()
            .single()

        if (error) throw error
        return NextResponse.json({ success: true, data })
    } catch (error) {
        console.error('Resource create error:', error)
        return NextResponse.json({ error: 'Failed to create resource' }, { status: 500 })
    }
}
