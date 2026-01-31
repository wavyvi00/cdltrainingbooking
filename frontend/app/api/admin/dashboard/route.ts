import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { Database } from '@/../shared/types'
import { startOfMonth, startOfWeek } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

const TIMEZONE = 'America/Chicago'

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

    const now = toZonedTime(new Date(), TIMEZONE)
    const monthStart = startOfMonth(now).toISOString()
    const weekStart = startOfWeek(now).toISOString()

    const { data: bookings } = await (supabaseAdmin!
        .from('bookings') as any)
        .select('id, amount_cents, paid_amount_cents, start_datetime, status, payment_status, created_at, services(name), profiles(full_name)')
        .order('created_at', { ascending: false })

    const { count } = await (supabaseAdmin!
        .from('profiles') as any)
        .select('*', { count: 'exact', head: true })
        .eq('role', 'client')

    const { data: rateLimitHits } = await (supabaseAdmin!
        .from('rate_limit_events') as any)
        .select('id, prefix, endpoint, method, ip, user_id, created_at')
        .order('created_at', { ascending: false })
        .limit(10)

    let revenueMonth = 0
    let appointmentsWeek = 0
    let pendingRequests = 0

    const list = bookings || []
    for (const b of list) {
        const isPaid = ['paid', 'cash_paid', 'no_show_charged'].includes(b.payment_status)
        if (b.start_datetime >= monthStart && isPaid) {
            revenueMonth += (b.paid_amount_cents || b.amount_cents || 0)
        }
        const activeStatuses = ['accepted', 'confirmed', 'arrived', 'completed', 'no_show']
        if (b.start_datetime >= weekStart && activeStatuses.includes(b.status)) {
            appointmentsWeek++
        }
        if (b.status === 'requested') {
            pendingRequests++
        }
    }

    return NextResponse.json({
        metrics: {
            revenueMonth: revenueMonth / 100,
            appointmentsWeek,
            pendingRequests,
            totalClients: count || 0,
        },
        recentActivity: list.slice(0, 5),
        rateLimitHits: rateLimitHits || [],
    })
}
