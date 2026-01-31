import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { Database } from '@/../shared/types'

const ALLOWED_STATUSES = new Set(['accepted', 'confirmed', 'arrived'])

export async function POST(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

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
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const ownerId = process.env.OWNER_USER_ID
        if (!ownerId || user.id !== ownerId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { data: profile } = await (supabase.from('profiles') as any)
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const supabaseAdmin = createClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data: booking, error: bookingError } = await (supabaseAdmin
            .from('bookings') as any)
            .select('status')
            .eq('id', id)
            .single()

        if (bookingError || !booking) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
        }

        if (booking.status === 'completed') {
            return NextResponse.json({ success: true })
        }

        if (!ALLOWED_STATUSES.has(booking.status)) {
            return NextResponse.json({ error: 'Invalid booking status' }, { status: 400 })
        }

        const { error: updateError } = await (supabaseAdmin
            .from('bookings') as any)
            .update({ status: 'completed' })
            .eq('id', id)

        if (updateError) {
            return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (e) {
        console.error('Admin Complete API Error:', e)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
