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

export async function GET() {
    const { supabaseAdmin, user, error } = await getAdminClients()
    if (error) return error

    const barberId = user!.id
    const nowIso = new Date().toISOString()

    const [{ data: rules }, { data: timeOffs }, { data: setting }] = await Promise.all([
        (supabaseAdmin!.from('availability_rules') as any)
            .select('*')
            .eq('barber_id', barberId)
            .order('day_of_week'),
        (supabaseAdmin!.from('time_off') as any)
            .select('*')
            .eq('barber_id', barberId)
            .gte('end_datetime', nowIso)
            .order('start_datetime'),
        (supabaseAdmin!.from('settings') as any)
            .select('value')
            .eq('key', 'booking_window_days')
            .single(),
    ])

    return NextResponse.json({
        barberId,
        rules: rules || [],
        timeOffs: timeOffs || [],
        bookingWindowDays: setting?.value ?? '14',
    })
}

export async function POST(request: Request) {
    const { supabaseAdmin, user, error } = await getAdminClients()
    if (error) return error

    const body = await request.json().catch(() => ({}))
    const rules = Array.isArray(body.rules) ? body.rules : []
    const bookingWindowDays = String(body.bookingWindowDays || '14')

    const barberId = user!.id

    await (supabaseAdmin!.from('settings') as any).upsert({
        key: 'booking_window_days',
        value: bookingWindowDays,
    })

    await (supabaseAdmin!.from('availability_rules') as any)
        .delete()
        .eq('barber_id', barberId)

    const toInsert = rules
        .filter((r: any) => r.isActive)
        .map((r: any) => ({
            barber_id: barberId,
            day_of_week: r.day_of_week,
            start_time: r.start_time,
            end_time: r.end_time,
        }))
        .filter((r: any) =>
            Number.isInteger(r.day_of_week) &&
            r.day_of_week >= 0 &&
            r.day_of_week <= 6 &&
            typeof r.start_time === 'string' &&
            typeof r.end_time === 'string' &&
            r.start_time.length >= 4 &&
            r.end_time.length >= 4
        )

    if (toInsert.length > 0) {
        await (supabaseAdmin!.from('availability_rules') as any).insert(toInsert)
    }

    return NextResponse.json({ success: true })
}
