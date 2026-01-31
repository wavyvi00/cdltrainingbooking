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

        // 1. Get User
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
        if (!user || authError) throw new Error("Unauthorized")

        // 2. Get Customer ID
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('stripe_customer_id')
            .eq('id', user.id)
            .single()

        if (!profile?.stripe_customer_id) {
            return new Response(JSON.stringify({ methods: [] }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            })
        }

        // 3. List Payment Methods
        const paymentMethods = await stripe.paymentMethods.list({
            customer: profile.stripe_customer_id,
            type: 'card',
        })

        return new Response(
            JSON.stringify({ methods: paymentMethods.data }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
