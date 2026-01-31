
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/../shared/types'

// Webhook needs raw body, but Next.js App Router handles parsing differently. 
// For simplicity in this MVP, using standard web request text()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
// NOTE: explicit service role key needed for webhook to bypass RLS or act as admin

export async function POST(request: Request) {
    const body = await request.text()
    const signature = (await headers()).get('Stripe-Signature') as string

    let event

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        )
    } catch (error: any) {
        return NextResponse.json({ error: `Webhook Error: ${error.message}` }, { status: 400 })
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as any
        const bookingId = session.metadata.booking_id
        const amountPaid = session.amount_total // in cents

        const supabase = createClient<Database>(supabaseUrl, supabaseServiceRoleKey)

        const { data: booking } = await (supabase
            .from('bookings') as any)
            .select('status, amount_cents')
            .eq('id', bookingId)
            .single()

        if (!booking || !['accepted', 'confirmed'].includes(booking.status)) {
            console.warn('Checkout completed for non-approved booking', bookingId)
            return NextResponse.json({ received: true })
        }

        const updates: any = {
            paid_amount_cents: amountPaid,
            stripe_payment_intent_id: session.payment_intent,
            payment_status: 'paid',
        }

        if (!booking.amount_cents) {
            updates.amount_cents = amountPaid
        }

        // Update booking
        const { error } = await (supabase
            .from('bookings') as any)
            .update(updates)
            .eq('id', bookingId)

        if (error) {
            console.error('Error updating booking:', error)
            return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
        }
    }

    return NextResponse.json({ received: true })
}
