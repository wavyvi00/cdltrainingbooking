import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = new Set(['/', '/login', '/book', '/services'])
const PUBLIC_PREFIXES = [
    '/api/webhooks/stripe',
    '/api/auth',
    '/api/gallery',
    '/api/availability',
    '/api/services',
    '/api/bookings', // Allow booking creation
    '/api/settings', // Allow reading settings (e.g. booking window)
    '/arrival',      // Public arrival check-in
    '/_vercel'       // Allow Vercel internals
]

export async function proxy(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    const pathname = request.nextUrl.pathname
    const isPublic =
        PUBLIC_PATHS.has(pathname) ||
        PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))

    if (!user && !isPublic) {
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirectTo', `${pathname}${request.nextUrl.search}`)
        return NextResponse.redirect(loginUrl)
    }

    if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
        if (!user) {
            return pathname.startsWith('/api/')
                ? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
                : NextResponse.redirect(new URL('/login', request.url))
        }

        const ownerId = process.env.OWNER_USER_ID
        if (!ownerId || user.id !== ownerId) {
            return pathname.startsWith('/api/')
                ? NextResponse.json({ error: 'Forbidden' }, { status: 403 })
                : NextResponse.redirect(new URL('/', request.url))
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || profile.role !== 'admin') {
            return pathname.startsWith('/api/')
                ? NextResponse.json({ error: 'Forbidden' }, { status: 403 })
                : NextResponse.redirect(new URL('/', request.url))
        }
    }

    return response
}

export default function middleware(request: NextRequest) {
    return proxy(request)
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|js|css|woff|woff2|ttf|eot)$).*)',
    ],
}
