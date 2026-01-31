import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { Database } from '@/../shared/types'

async function getAdminClients() {
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
    }

    const ownerId = process.env.OWNER_USER_ID
    if (!ownerId || user.id !== ownerId) {
        return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
    }

    const { data: profile } = await (supabase.from('profiles') as any)
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') {
        return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
    }

    const supabaseAdmin = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    return { supabaseAdmin }
}

export async function GET() {
    const { supabaseAdmin, error } = await getAdminClients()
    if (error) return error

    const { data, error: fetchError } = await (supabaseAdmin!
        .from('bookings') as any)
        .select('*, services(name)')
        .eq('status', 'requested')
        .order('created_at', { ascending: true })

    if (fetchError) {
        return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    return NextResponse.json({ requests: data || [] })
}
