import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

const jsonHeaders = {
  "Content-Type": "application/json",
}

serve(async (req) => {
  const authHeader = req.headers.get("Authorization") ?? ""
  const expected = serviceRoleKey ? `Bearer ${serviceRoleKey}` : ""

  if (!serviceRoleKey || authHeader !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: jsonHeaders,
    })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  const { error } = await supabase.rpc("handle_expired_requests")

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: jsonHeaders,
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: jsonHeaders,
  })
})
