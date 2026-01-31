import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { Database } from '@/../shared/types'

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
            .select('payment_method, payment_status, status')
            .eq('id', id)
            .single()

        if (bookingError || !booking) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
        }

        if (booking.status === 'cancelled' || booking.status === 'declined') {
            return NextResponse.json({ error: 'Booking is not active' }, { status: 400 })
        }

        if (booking.payment_method !== 'cash') {
            return NextResponse.json({ error: 'Not a cash booking' }, { status: 400 })
        }

        if (booking.payment_status !== 'cash_pending') {
            return NextResponse.json({ error: 'Payment status is not cash_pending' }, { status: 400 })
        }

        const { error: updateError } = await (supabaseAdmin
            .from('bookings') as any)
            .update({ payment_status: 'cash_paid' })
            .eq('id', id)

        if (updateError) {
            return NextResponse.json({ error: 'Failed to update payment status' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (e) {
        console.error('Admin Cash Paid API Error:', e)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
