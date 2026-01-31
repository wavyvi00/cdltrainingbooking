import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno'

// @ts-nocheck

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
    httpClient: Stripe.createFetchHttpClient(),
})

const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN')
if (!allowedOrigin) {
    console.warn('ALLOWED_ORIGIN not set - CORS will be restrictive')
}

const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigin ?? 'https://roycuts.com',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const { service_id, type = 'payment', payment_method_id } = await req.json()

        // 1. Get User - MUST be authenticated
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()

        // SECURITY: Require authentication
        if (!user || authError) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            })
        }

        // 2. Get Service Price
        if (!service_id) throw new Error("Missing service_id")
        const { data: service } = await supabaseClient
            .from('services')
            .select('price_cents')
            .eq('id', service_id)
            .single()
        if (!service) throw new Error("Service not found")

        // 3. Handle Customer (Get or Create)
        let customerId = null;

        // Check profile
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('stripe_customer_id, full_name')
            .eq('id', user.id)
            .single()

        if (profile?.stripe_customer_id) {
            customerId = profile.stripe_customer_id
        } else {
            // Create Customer
            const newCustomer = await stripe.customers.create({
                email: user.email,
                name: profile?.full_name ?? undefined,
                metadata: { supabase_uid: user.id }
            })
            customerId = newCustomer.id
            // Save to profile
            await supabaseClient
                .from('profiles')
                .update({ stripe_customer_id: customerId })
                .eq('id', user.id)
        }

        let result;

        if (type === 'setup') {
            const setupIntent = await stripe.setupIntents.create({
                customer: customerId,
                usage: 'off_session',
                automatic_payment_methods: { enabled: true },
                metadata: {
                    user_id: user.id,
                    service_id,
                },
            })
            result = {
                client_secret: setupIntent.client_secret,
                id: setupIntent.id,
                type: 'setup'
            }
        } else {
            // Payment
            const paymentIntent = await stripe.paymentIntents.create({
                amount: service.price_cents,
                currency: 'usd',
                customer: customerId,
                automatic_payment_methods: { enabled: true },
                capture_method: 'manual',
                metadata: {
                    user_id: user.id,
                    service_id,
                },
            })
            result = {
                client_secret: paymentIntent.client_secret,
                id: paymentIntent.id,
                type: 'payment'
            }
        }

        return new Response(
            JSON.stringify(result),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
