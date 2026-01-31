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

    return { supabaseAdmin, user }
}

export async function POST(request: Request) {
    const { supabaseAdmin, user, error } = await getAdminClients()
    if (error) return error

    const body = await request.json().catch(() => ({}))
    const start = body.start_datetime
    const end = body.end_datetime
    const reason = body.reason ?? null

    if (!start || !end) {
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }
    const startDate = new Date(start)
    const endDate = new Date(end)
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const { data, error: insertError } = await (supabaseAdmin!
        .from('time_off') as any)
        .insert({
            barber_id: user!.id,
            start_datetime: start,
            end_datetime: end,
            reason,
        })
        .select()
        .single()

    if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ timeOff: data })
}

export async function DELETE(request: Request) {
    const { supabaseAdmin, error } = await getAdminClients()
    if (error) return error

    const body = await request.json().catch(() => ({}))
    const id = body.id

    if (!id) {
        return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    const { error: deleteError } = await (supabaseAdmin!
        .from('time_off') as any)
        .delete()
        .eq('id', id)

    if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}
