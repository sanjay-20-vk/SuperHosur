import { useEffect, useState } from 'react'
import {
  getOwnerBillingSummary,
  type PaymentOrderRecord,
  type PaymentTransactionRecord,
  type PaymentRefundRecord,
  type ListingPromotionRecord,
} from '../../services/payments'

export function BillingSection() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [billingData, setBillingData] = useState<{
    orders: PaymentOrderRecord[]
    transactions: PaymentTransactionRecord[]
    refunds: PaymentRefundRecord[]
    promotions: ListingPromotionRecord[]
  }>({
    orders: [],
    transactions: [],
    refunds: [],
    promotions: [],
  })

  async function loadBilling() {
    try {
      setLoading(true)
      setError(null)
      const data = await getOwnerBillingSummary()
      setBillingData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load billing records.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    async function load() {
      try {
        setLoading(true)
        setError(null)
        const data = await getOwnerBillingSummary()
        if (active) {
          setBillingData(data)
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to load billing records.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return (
      <div style={{ padding: '32px 0', textAlign: 'center', color: '#64748b' }}>
        Loading billing &amp; payment records...
      </div>
    )
  }

  if (error) {
    return (
      <div className="state-panel error-state">
        <h3>Billing Information Unavailable</h3>
        <p>{error}</p>
        <button
          type="button"
          className="secondary-button"
          onClick={() => void loadBilling()}
          style={{ marginTop: '12px' }}
        >
          Retry
        </button>
      </div>
    )
  }

  const { orders, transactions, promotions } = billingData

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header */}
      <div className="section-header">
        <div>
          <p className="eyebrow">Monetization &amp; Invoices</p>
          <h2>Billing &amp; Payment History</h2>
          <p>Review your active listing promotions, payment orders, and receipt logs.</p>
        </div>
      </div>

      {/* Active Promotions Cards */}
      <div>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: '#0f172a' }}>
          Active Listing Promotions ({promotions.filter((p) => p.status === 'active').length})
        </h3>
        {promotions.length === 0 ? (
          <div
            style={{
              padding: '24px',
              borderRadius: '12px',
              backgroundColor: '#f8fafc',
              border: '1px dashed #cbd5e1',
              textAlign: 'center',
              color: '#64748b',
              fontSize: '0.9rem',
            }}
          >
            No active or past promotions. You can promote your business or property directly from your listings tab.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {promotions.map((promo) => {
              const isLive = promo.status === 'active' && new Date(promo.expires_at) > new Date()
              const expiresDate = new Date(promo.expires_at).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })

              return (
                <div
                  key={promo.id}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '16px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: isLive ? '#dcfce7' : '#f1f5f9',
                        color: isLive ? '#15803d' : '#64748b',
                      }}
                    >
                      {isLive ? 'Active Spotlight' : promo.status}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {promo.entity_type === 'business' ? 'Business' : 'Property'}
                    </span>
                  </div>

                  <div style={{ marginTop: '12px', fontWeight: 600, fontSize: '0.95rem', color: '#0f172a' }}>
                    {promo.plan_id.replace(/_/g, ' ').toUpperCase()}
                  </div>

                  <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#64748b' }}>
                    {isLive ? `Expires on: ${expiresDate}` : `Status: ${promo.status}`}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Transactions Table */}
      <div>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: '#0f172a' }}>
          Payment Transactions ({transactions.length})
        </h3>
        {transactions.length === 0 ? (
          <div
            style={{
              padding: '24px',
              borderRadius: '12px',
              backgroundColor: '#f8fafc',
              border: '1px dashed #cbd5e1',
              textAlign: 'center',
              color: '#64748b',
              fontSize: '0.9rem',
            }}
          >
            No transactions recorded yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '12px 16px' }}>Date</th>
                  <th style={{ padding: '12px 16px' }}>Transaction ID</th>
                  <th style={{ padding: '12px 16px' }}>Method</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      {new Date(tx.paid_at).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>
                      {tx.provider_payment_id}
                    </td>
                    <td style={{ padding: '12px 16px', textTransform: 'uppercase' }}>
                      {tx.method || 'UPI'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: tx.status === 'captured' ? '#dcfce7' : '#fee2e2',
                          color: tx.status === 'captured' ? '#15803d' : '#991b1b',
                        }}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>
                      ₹{(tx.amount_paise / 100).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Orders Table */}
      <div>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: '#0f172a' }}>
          Payment Orders Log ({orders.length})
        </h3>
        {orders.length === 0 ? (
          <div
            style={{
              padding: '24px',
              borderRadius: '12px',
              backgroundColor: '#f8fafc',
              border: '1px dashed #cbd5e1',
              textAlign: 'center',
              color: '#64748b',
              fontSize: '0.9rem',
            }}
          >
            No orders initiated yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '12px 16px' }}>Order ID</th>
                  <th style={{ padding: '12px 16px' }}>Target</th>
                  <th style={{ padding: '12px 16px' }}>Purpose</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((ord) => (
                  <tr key={ord.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>
                      {ord.provider_order_id}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {ord.metadata?.entity_title || ord.entity_type}
                    </td>
                    <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>
                      {ord.purpose.replace(/_/g, ' ')}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: ord.status === 'paid' ? '#dcfce7' : '#f1f5f9',
                          color: ord.status === 'paid' ? '#15803d' : '#64748b',
                        }}
                      >
                        {ord.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>
                      ₹{(ord.amount_paise / 100).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
