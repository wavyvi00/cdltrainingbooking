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

export async function GET() {
    const { supabaseAdmin, error } = await getAdminClients()
    if (error) return error

    const { data, error: fetchError } = await (supabaseAdmin!
        .from('gallery_images') as any)
        .select('*')
        .order('created_at', { ascending: false })

    if (fetchError) {
        return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    const images = await Promise.all((data || []).map(async (img: any) => {
        const path = img.image_path || (img.image_url?.split('/gallery/')[1]?.split('?')[0] ?? null)
        if (!path) return { ...img }
        const { data: signed } = await supabaseAdmin!
            .storage
            .from('gallery')
            .createSignedUrl(path, 60 * 60)
        return { ...img, image_url: signed?.signedUrl || img.image_url }
    }))

    return NextResponse.json({ images })
}

export async function POST(request: Request) {
    const { supabaseAdmin, error } = await getAdminClients()
    if (error) return error

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
        return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }
    if (!file.type.startsWith('image/')) {
        return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }
    if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: 'File too large' }, { status: 400 })
    }

    const fileExt = file.name.split('.').pop() || 'jpg'
    const fileName = `${Date.now()}.${fileExt}`

    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabaseAdmin!
        .storage
        .from('gallery')
        .upload(fileName, buffer, {
            contentType: file.type || 'image/jpeg',
            upsert: false,
        })

    if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: { publicUrl } } = supabaseAdmin!
        .storage
        .from('gallery')
        .getPublicUrl(fileName)

    const { data, error: insertError } = await (supabaseAdmin!
        .from('gallery_images') as any)
        .insert({
            image_url: publicUrl,
            image_path: fileName,
            caption: '',
            active: true,
        })
        .select()
        .single()

    if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    const path = data?.image_path || fileName
    let signedUrl = data?.image_url
    if (path) {
        const { data: signed } = await supabaseAdmin!
            .storage
            .from('gallery')
            .createSignedUrl(path, 60 * 60)
        signedUrl = signed?.signedUrl || data?.image_url
    }

    return NextResponse.json({ image: { ...data, image_url: signedUrl } })
}

export async function DELETE(request: Request) {
    const { supabaseAdmin, error } = await getAdminClients()
    if (error) return error

    const body = await request.json().catch(() => ({}))
    const id = body.id
    const imageUrl = body.image_url

    if (!id || !imageUrl) {
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    await (supabaseAdmin!
        .from('gallery_images') as any)
        .delete()
        .eq('id', id)

    const marker = '/gallery/'
    const idx = imageUrl.indexOf(marker)
    if (idx !== -1) {
        const path = imageUrl.slice(idx + marker.length)
        await supabaseAdmin!
            .storage
            .from('gallery')
            .remove([path])
    }

    return NextResponse.json({ success: true })
}
