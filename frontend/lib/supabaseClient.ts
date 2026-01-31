import { createBrowserClient } from '@supabase/ssr'
import { Database } from '../../shared/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Dev-time warning for missing env vars
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        console.warn('[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.warn('[Supabase] Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
    }
}

export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
        detectSessionInUrl: false,
    },
})
