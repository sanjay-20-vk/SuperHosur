// Supabase Edge Function: payment-webhook
// Secure Razorpay Webhook Handler & Reconciliation
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'x-razorpay-signature, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// HMAC-SHA256 signature verification helper
async function verifyRazorpaySignature(
  rawBody: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody))
  const hashArray = Array.from(new Uint8Array(signatureBytes))
  const expectedSignature = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

  return expectedSignature === signature
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') || ''

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error: missing service credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const rawBody = await req.text()
    const signature = req.headers.get('x-razorpay-signature')

    // If webhook secret is configured, verify HMAC signature
    if (webhookSecret) {
      if (!signature) {
        return new Response(JSON.stringify({ error: 'Missing x-razorpay-signature header' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const isValid = await verifyRazorpaySignature(rawBody, signature, webhookSecret)
      if (!isValid) {
        return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const event = JSON.parse(rawBody)
    const eventId = event.event_id || event.id || `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`
    const eventType = event.event || 'unknown'

    // Idempotency check: store webhook event in payment_webhook_events
    const { data: existingEvent } = await supabase
      .from('payment_webhook_events')
      .select('id, processed')
      .eq('provider_event_id', eventId)
      .maybeSingle()

    if (existingEvent) {
      return new Response(
        JSON.stringify({ message: 'Event already recorded and processed (idempotent)', event_id: eventId }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Insert pending webhook event
    await supabase.from('payment_webhook_events').insert({
      provider: 'razorpay',
      provider_event_id: eventId,
      event_type: eventType,
      payload: event,
      processed: false,
    })

    // Process Supported Events:
    // 1. payment.captured
    // 2. order.paid
    // 3. refund.processed
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentObj = event.payload?.payment?.entity
      const orderObj = event.payload?.order?.entity
      const providerOrderId = orderObj?.id || paymentObj?.order_id
      const providerPaymentId = paymentObj?.id

      if (providerOrderId && providerPaymentId) {
        const { data: order } = await supabase
          .from('payment_orders')
          .select('*')
          .eq('provider_order_id', providerOrderId)
          .maybeSingle()

        if (order && order.status !== 'paid') {
          // Verify and activate via RPC
          await supabase.rpc('verify_and_activate_payment', {
            p_order_id: order.id,
            p_provider_payment_id: providerPaymentId,
            p_provider_signature: signature || 'webhook_verified',
            p_payment_method: paymentObj.method || 'upi',
          })
        }
      }
    } else if (eventType === 'refund.processed') {
      const refundObj = event.payload?.refund?.entity
      const providerPaymentId = refundObj?.payment_id
      const providerRefundId = refundObj?.id

      if (providerPaymentId && providerRefundId) {
        const { data: tx } = await supabase
          .from('payment_transactions')
          .select('id')
          .eq('provider_payment_id', providerPaymentId)
          .maybeSingle()

        if (tx) {
          await supabase.rpc('process_payment_refund', {
            p_transaction_id: tx.id,
            p_provider_refund_id: providerRefundId,
            p_reason: refundObj.notes?.reason || 'Refund processed via Razorpay',
          })
        }
      }
    }

    // Mark webhook event as processed
    await supabase
      .from('payment_webhook_events')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('provider_event_id', eventId)

    return new Response(
      JSON.stringify({ success: true, event_id: eventId, event_type: eventType }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Webhook processing error'
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
