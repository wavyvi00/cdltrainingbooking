import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Database } from '@/../shared/types'

export async function GET() {
    const supabaseAdmin = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await (supabaseAdmin
        .from('gallery_images') as any)
        .select('*')
        .eq('active', true)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const images = await Promise.all((data || []).map(async (img: any) => {
        const path = img.image_path || (img.image_url?.split('/gallery/')[1]?.split('?')[0] ?? null)
        if (!path) return { ...img }
        const { data: signed } = await supabaseAdmin
            .storage
            .from('gallery')
            .createSignedUrl(path, 60 * 60)
        return { ...img, image_url: signed?.signedUrl || img.image_url }
    }))

    return NextResponse.json({ images })
}
