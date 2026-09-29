// Supabase Edge Function: dispatch-notification
// Omnichannel Transactional Delivery Dispatcher (Email & WhatsApp)
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface DispatchRequest {
  delivery_id?: string
  batch_size?: number
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

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error: missing service credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Verify caller authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace(/^Bearer\s+/i, '')
    const { data: userData, error: userError } = await supabase.auth.getUser(token)

    // Allow service role invocation or authenticated admin
    const isServiceRole = token === serviceRoleKey
    let isAdmin = false
    if (!isServiceRole && userData?.user?.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userData.user.id)
        .maybeSingle()
      isAdmin = profile?.role === 'admin'
    }

    if (!isServiceRole && !isAdmin && userError) {
      return new Response(JSON.stringify({ error: 'Unauthorized invocation' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = (await req.json().catch(() => ({}))) as DispatchRequest
    const deliveryId = body.delivery_id
    const batchSize = Math.min(body.batch_size || 10, 50)

    // Fetch deliveries to process
    let query = supabase
      .from('notification_deliveries')
      .select('*')
      .in('status', ['pending', 'retrying'])
      .lte('next_attempt_at', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(batchSize)

    if (deliveryId) {
      query = supabase
        .from('notification_deliveries')
        .select('*')
        .eq('id', deliveryId)
        .limit(1)
    }

    const { data: deliveries, error: fetchErr } = await query

    if (fetchErr) {
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const whatsappToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN')
    const whatsappPhoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')

    const results: Array<{ id: string; channel: string; status: string; error?: string }> = []

    for (const delivery of deliveries ?? []) {
      const payload = delivery.payload || {}
      const title = payload.title || 'SuperHosur Notification'
      const message = payload.message || ''
      const actionLink = payload.link ? `https://superhosur.in${payload.link}` : 'https://superhosur.in'

      if (delivery.channel === 'email') {
        if (!resendApiKey) {
          // Provider credentials not configured in environment
          await supabase.rpc('process_notification_delivery', {
            p_delivery_id: delivery.id,
            p_status: 'failed',
            p_provider: 'resend',
            p_error: 'RESEND_API_KEY secret not configured in Supabase Edge Function environment',
          })
          results.push({ id: delivery.id, channel: 'email', status: 'failed', error: 'Missing RESEND_API_KEY' })
          continue
        }

        try {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'SuperHosur <notifications@superhosur.in>',
              to: delivery.recipient_target,
              subject: title,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b;">
                  <div style="margin-bottom: 20px; border-bottom: 2px solid #047857; padding-bottom: 12px;">
                    <h2 style="color: #047857; margin: 0;">SuperHosur</h2>
                    <p style="margin: 4px 0 0; font-size: 0.85rem; color: #64748b;">Hosur Local Marketplace & Business Directory</p>
                  </div>
                  <h3 style="font-size: 1.15rem; color: #0f172a; margin: 0 0 12px;">${title}</h3>
                  <p style="font-size: 0.95rem; line-height: 1.6; color: #334155; margin: 0 0 20px;">${message}</p>
                  <div style="margin: 24px 0;">
                    <a href="${actionLink}" style="background: #047857; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; display: inline-block;">
                      View Details on SuperHosur
                    </a>
                  </div>
                  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0 16px;" />
                  <p style="font-size: 0.75rem; color: #94a3b8; margin: 0;">
                    You received this transactional update based on your SuperHosur notification preferences.<br/>
                    <a href="https://superhosur.in/profile" style="color: #64748b;">Manage preferences</a>
                  </p>
                </div>
              `,
            }),
          })

          const data = await res.json()
          if (res.ok && data?.id) {
            await supabase.rpc('process_notification_delivery', {
              p_delivery_id: delivery.id,
              p_status: 'sent',
              p_provider: 'resend',
              p_provider_message_id: String(data.id),
            })
            results.push({ id: delivery.id, channel: 'email', status: 'sent' })
          } else {
            await supabase.rpc('process_notification_delivery', {
              p_delivery_id: delivery.id,
              p_status: 'retrying',
              p_provider: 'resend',
              p_error: data?.message || 'Resend API dispatch failed',
            })
            results.push({ id: delivery.id, channel: 'email', status: 'retrying', error: data?.message })
          }
        } catch (dispatchErr) {
          await supabase.rpc('process_notification_delivery', {
            p_delivery_id: delivery.id,
            p_status: 'retrying',
            p_provider: 'resend',
            p_error: dispatchErr instanceof Error ? dispatchErr.message : 'Network error during Resend dispatch',
          })
          results.push({ id: delivery.id, channel: 'email', status: 'retrying' })
        }
      } else if (delivery.channel === 'whatsapp') {
        if (!whatsappToken || !whatsappPhoneId) {
          await supabase.rpc('process_notification_delivery', {
            p_delivery_id: delivery.id,
            p_status: 'failed',
            p_provider: 'whatsapp_cloud',
            p_error: 'WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID secret not configured in Supabase environment',
          })
          results.push({ id: delivery.id, channel: 'whatsapp', status: 'failed', error: 'Missing WhatsApp credentials' })
          continue
        }

        try {
          // Standard WhatsApp Cloud API template call
          const cleanPhone = delivery.recipient_target.replace(/\D/g, '')
          const res = await fetch(`https://graph.facebook.com/v18.0/${whatsappPhoneId}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${whatsappToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: cleanPhone,
              type: 'text',
              text: {
                preview_url: true,
                body: `*SuperHosur Alert*: ${title}\n\n${message}\n\nView details: ${actionLink}`,
              },
            }),
          })

          const data = await res.json()
          if (res.ok && data?.messages?.[0]?.id) {
            await supabase.rpc('process_notification_delivery', {
              p_delivery_id: delivery.id,
              p_status: 'sent',
              p_provider: 'whatsapp_cloud',
              p_provider_message_id: String(data.messages[0].id),
            })
            results.push({ id: delivery.id, channel: 'whatsapp', status: 'sent' })
          } else {
            await supabase.rpc('process_notification_delivery', {
              p_delivery_id: delivery.id,
              p_status: 'retrying',
              p_provider: 'whatsapp_cloud',
              p_error: data?.error?.message || 'WhatsApp Cloud API dispatch failed',
            })
            results.push({ id: delivery.id, channel: 'whatsapp', status: 'retrying', error: data?.error?.message })
          }
        } catch (waErr) {
          await supabase.rpc('process_notification_delivery', {
            p_delivery_id: delivery.id,
            p_status: 'retrying',
            p_provider: 'whatsapp_cloud',
            p_error: waErr instanceof Error ? waErr.message : 'Network error during WhatsApp dispatch',
          })
          results.push({ id: delivery.id, channel: 'whatsapp', status: 'retrying' })
        }
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
