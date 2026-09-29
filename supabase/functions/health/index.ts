// Supabase Edge Function: health
// Phase 18 Step 6: Health Check & Operational Observability
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const startTime = Date.now()
  const checks: Record<string, 'ok' | 'degraded' | 'failed'> = {}

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

    if (!supabaseUrl || !serviceRoleKey) {
      checks['config'] = 'failed'
      return new Response(
        JSON.stringify({
          status: 'error',
          error: 'Configuration missing',
          timestamp: new Date().toISOString(),
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    checks['config'] = 'ok'
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // 1. Database Connectivity Check
    const { error: dbError } = await supabase.from('monetization_plans').select('id').limit(1)
    checks['database'] = dbError ? 'failed' : 'ok'

    // 2. Notification Queue Availability Check
    const { error: notifError } = await supabase.from('notification_deliveries').select('id').limit(1)
    checks['notifications_queue'] = notifError ? 'failed' : 'ok'

    // 3. Payment System Availability Check
    const { error: paymentError } = await supabase.from('payment_orders').select('id').limit(1)
    checks['payments'] = paymentError ? 'failed' : 'ok'

    const allOk = Object.values(checks).every((status) => status === 'ok')
    const responsePayload = {
      status: allOk ? 'healthy' : 'degraded',
      service: 'SuperHosur Platform API',
      checks,
      latency_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    }

    return new Response(JSON.stringify(responsePayload), {
      status: allOk ? 200 : 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({
        status: 'unhealthy',
        error: err instanceof Error ? err.message : 'Health check failed',
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
