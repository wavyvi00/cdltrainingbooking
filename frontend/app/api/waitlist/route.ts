import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { Database } from '@/../shared/types'
import { enforceRateLimit } from '@/lib/rateLimit'

export async function POST(request: Request) {
    const { date } = await request.json()

    if (!date) {
        return NextResponse.json({ error: 'Date is required' }, { status: 400 })
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

    const rateLimitResponse = await enforceRateLimit(request, {
        prefix: 'waitlist',
        max: 3,
        windowSeconds: 3600,
        userId: user.id,
    })
    if (rateLimitResponse) {
        return rateLimitResponse
    }

    const { error } = await (supabase
        .from('waitlist') as any) // Cast as any because types.ts might not be updated yet
        .insert({
            client_id: user.id,
            date: date
        })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}
