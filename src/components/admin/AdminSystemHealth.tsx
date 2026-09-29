import { useEffect, useState } from 'react'
import { getSupabaseClient } from '../../lib/supabase'

interface HealthMetrics {
  databaseConnected: boolean
  totalErrors: number
  totalWebhookEvents: number
  failedWebhooks: number
  totalNotificationsQueued: number
  failedNotifications: number
  totalOrders: number
  paidOrders: number
  activePromotions: number
  latencyMs: number
}

export function AdminSystemHealth() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null)

  async function loadHealth() {
    const startTime = Date.now()
    try {
      setLoading(true)
      setError(null)
      const supabase = getSupabaseClient()

      const [
        ordersRes,
        webhooksRes,
        failedWebhooksRes,
        deliveriesRes,
        failedDeliveriesRes,
        promotionsRes,
      ] = await Promise.all([
        supabase.from('payment_orders').select('id, status', { count: 'exact' }),
        supabase.from('payment_webhook_events').select('id', { count: 'exact' }),
        supabase.from('payment_webhook_events').select('id', { count: 'exact' }).not('error', 'is', null),
        supabase.from('notification_deliveries').select('id', { count: 'exact' }),
        supabase.from('notification_deliveries').select('id', { count: 'exact' }).eq('status', 'failed'),
        supabase.from('listing_promotions').select('id', { count: 'exact' }).eq('status', 'active'),
      ])

      const latencyMs = Date.now() - startTime

      setMetrics({
        databaseConnected: !ordersRes.error,
        totalErrors: 0,
        totalOrders: ordersRes.count || 0,
        paidOrders: (ordersRes.data || []).filter((o) => o.status === 'paid').length,
        totalWebhookEvents: webhooksRes.count || 0,
        failedWebhooks: failedWebhooksRes.count || 0,
        totalNotificationsQueued: deliveriesRes.count || 0,
        failedNotifications: failedDeliveriesRes.count || 0,
        activePromotions: promotionsRes.count || 0,
        latencyMs,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to query system health metrics.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    async function fetchHealth() {
      const startTime = Date.now()
      try {
        const supabase = getSupabaseClient()
        const [
          ordersRes,
          webhooksRes,
          failedWebhooksRes,
          deliveriesRes,
          failedDeliveriesRes,
          promotionsRes,
        ] = await Promise.all([
          supabase.from('payment_orders').select('id, status', { count: 'exact' }),
          supabase.from('payment_webhook_events').select('id', { count: 'exact' }),
          supabase.from('payment_webhook_events').select('id', { count: 'exact' }).not('error', 'is', null),
          supabase.from('notification_deliveries').select('id', { count: 'exact' }),
          supabase.from('notification_deliveries').select('id', { count: 'exact' }).eq('status', 'failed'),
          supabase.from('listing_promotions').select('id', { count: 'exact' }).eq('status', 'active'),
        ])

        if (!isMounted) return

        const latencyMs = Date.now() - startTime
        setMetrics({
          databaseConnected: !ordersRes.error,
          totalErrors: 0,
          totalOrders: ordersRes.count || 0,
          paidOrders: (ordersRes.data || []).filter((o) => o.status === 'paid').length,
          totalWebhookEvents: webhooksRes.count || 0,
          failedWebhooks: failedWebhooksRes.count || 0,
          totalNotificationsQueued: deliveriesRes.count || 0,
          failedNotifications: failedDeliveriesRes.count || 0,
          activePromotions: promotionsRes.count || 0,
          latencyMs,
        })
      } catch (err) {
        if (!isMounted) return
        setError(err instanceof Error ? err.message : 'Unable to query system health metrics.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    void fetchHealth()

    return () => {
      isMounted = false
    }
  }, [])

  if (loading) {
    return <div style={{ padding: '32px 0', textAlign: 'center', color: '#64748b' }}>Checking system health &amp; telemetry...</div>
  }

  if (error) {
    return (
      <div className="state-panel error-state">
        <h3>Health Check Failed</h3>
        <p>{error}</p>
        <button type="button" className="secondary-button" onClick={() => void loadHealth()} style={{ marginTop: '12px' }}>
          Retry Health Diagnostics
        </button>
      </div>
    )
  }

  if (!metrics) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p className="eyebrow">Observability &amp; Platform Health</p>
          <h2 style={{ margin: 0 }}>System Health &amp; Operational Telemetry</h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b' }}>
            Real-time diagnostics across database connectivity, notification queues, webhook reconciliation, and payments.
          </p>
        </div>
        <button type="button" className="secondary-button" onClick={() => void loadHealth()}>
          🔄 Refresh Diagnostics
        </button>
      </div>

      {/* Status Highlights */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div style={{ padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Database Status</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '8px', color: metrics.databaseConnected ? '#15803d' : '#b91c1c' }}>
            {metrics.databaseConnected ? '● Connected' : '● Disconnected'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>Latency: {metrics.latencyMs}ms</div>
        </div>

        <div style={{ padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Payment Webhooks</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '8px', color: metrics.failedWebhooks === 0 ? '#15803d' : '#b45309' }}>
            {metrics.totalWebhookEvents} Events
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
            {metrics.failedWebhooks > 0 ? `${metrics.failedWebhooks} errors logged` : '0 failures'}
          </div>
        </div>

        <div style={{ padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Notification Queue</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '8px', color: metrics.failedNotifications === 0 ? '#15803d' : '#b45309' }}>
            {metrics.totalNotificationsQueued} Dispatches
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
            {metrics.failedNotifications > 0 ? `${metrics.failedNotifications} permanently failed` : 'All healthy'}
          </div>
        </div>

        <div style={{ padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Listing Promotions</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '8px', color: '#17594d' }}>
            {metrics.activePromotions} Active
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
            {metrics.paidOrders} / {metrics.totalOrders} paid orders
          </div>
        </div>
      </div>
    </div>
  )
}
