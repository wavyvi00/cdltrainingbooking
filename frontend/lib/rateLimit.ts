import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Database } from '@/../shared/types'

type RateLimitConfig = {
    prefix: string
    max: number
    windowSeconds: number
    userId?: string | null
}

const getClientIp = (request: Request) => {
    const forwarded = request.headers.get('x-forwarded-for')
    if (forwarded) {
        return forwarded.split(',')[0]?.trim() || null
    }
    const realIp = request.headers.get('x-real-ip')
    if (realIp) {
        return realIp.trim()
    }
    return null
}

export const enforceRateLimit = async (request: Request, config: RateLimitConfig) => {
    const ip = getClientIp(request) ?? 'unknown'
    const key = [config.prefix, config.userId ?? 'anon', ip].join(':')
    const url = new URL(request.url)
    const endpoint = url.pathname
    const method = request.method

    const supabaseAdmin = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await (supabaseAdmin as any).rpc('check_rate_limit', {
        p_key: key,
        p_max: config.max,
        p_window_seconds: config.windowSeconds,
    })

    if (error) {
        console.error('Rate limit check failed:', error)
        return NextResponse.json({ error: 'Rate limit unavailable' }, { status: 503 })
    }

    if (!data) {
        const { error: logError } = await (supabaseAdmin
            .from('rate_limit_events') as any)
            .insert({
                key,
                prefix: config.prefix,
                user_id: config.userId ?? null,
                ip,
                endpoint,
                method,
            })
        if (logError) {
            console.error('Rate limit log failed:', logError)
        }
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    return null
}
