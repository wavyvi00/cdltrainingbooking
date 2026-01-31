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

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { supabaseAdmin, error } = await getAdminClients()
    if (error) return error

    const { id } = await params
    const body = await request.json().catch(() => ({}))

    const updates: any = {}

    if (body.name !== undefined) updates.name = String(body.name).trim()
    if (body.description !== undefined) updates.description = body.description ?? null
    if (body.duration_min !== undefined) {
        const durationMin = Number(body.duration_min)
        if (!Number.isFinite(durationMin) || durationMin <= 0) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
        }
        updates.duration_min = durationMin
    }
    if (body.price !== undefined) {
        const price = Number(body.price)
        if (!Number.isFinite(price) || price < 0) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
        }
        updates.price_cents = Math.round(price * 100)
    }
    if (body.active !== undefined) updates.active = Boolean(body.active)

    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
    }

    const { data, error: updateError } = await (supabaseAdmin!
        .from('services') as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ service: data })
}
