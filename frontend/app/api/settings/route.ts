import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { Database } from '@/../shared/types'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (!key) {
        return NextResponse.json({ error: 'Key is required' }, { status: 400 })
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ownerId = process.env.OWNER_USER_ID
    const isOwner = ownerId && user.id === ownerId
    const publicKeys = new Set(['booking_window_days'])

    if (!isOwner && !publicKeys.has(key)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabaseAdmin = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data } = await (supabaseAdmin.from('settings') as any)
        .select('value')
        .eq('key', key)
        .single()

    if (!data) {
        return NextResponse.json({ error: 'Setting not found' }, { status: 404 })
    }

    return NextResponse.json({ value: data.value })
}
