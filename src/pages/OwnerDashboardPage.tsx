import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCurrentSession, signOut } from '../services/auth'
import {
  deleteBusiness,
  getMyBusinesses,
  type BusinessRecord,
} from '../services/businesses'
import {
  deleteProperty,
  getMyProperties,
  type PropertySummary,
} from '../services/properties'
import {
  getVendorLeads,
  updateVendorLeadStatus,
  submitRequirementQuote,
  type RequirementMatchStatus,
  type VendorLeadRecord,
} from '../services/requirements'

type OwnerBusinessStatus = 'public' | 'pending' | 'rejected' | 'unpublished'

function getOwnerBusinessStatus(business: BusinessRecord): OwnerBusinessStatus {
  if (business.active && business.verified) return 'public'
  if (!business.verified && Boolean(business.rejection_reason)) return 'rejected'
  if (business.active && !business.verified) return 'pending'
  return 'unpublished'
}

export function OwnerDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'leads' | 'businesses' | 'properties'>('leads')
  const [businesses, setBusinesses] = useState<BusinessRecord[]>([])
  const [properties, setProperties] = useState<PropertySummary[]>([])
  const [leads, setLeads] = useState<VendorLeadRecord[]>([])
  const [leadFilter, setLeadFilter] = useState<'all' | 'pending' | 'accepted' | 'dismissed'>('all')
  const [error, setError] = useState<string | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [propertyActionLoadingId, setPropertyActionLoadingId] = useState<string | null>(null)
  const [leadActionLoadingId, setLeadActionLoadingId] = useState<string | null>(null)

  const [quotingLeadId, setQuotingLeadId] = useState<string | null>(null)
  const [quoteAmount, setQuoteAmount] = useState('')
  const [quoteDuration, setQuoteDuration] = useState('')
  const [quoteValidUntil, setQuoteValidUntil] = useState('')
  const [quoteNotes, setQuoteNotes] = useState('')
  const [submittingQuote, setSubmittingQuote] = useState(false)
  const [quoteError, setQuoteError] = useState<string | null>(null)

  async function refreshData() {
    try {
      setError(null)
      const session = await getCurrentSession()

      if (!session) {
        setError('Please sign in to access your dashboard.')
        setLoading(false)
        return
      }

      const [bizData, propData, leadData] = await Promise.all([
        getMyBusinesses(),
        getMyProperties(session.user.id),
        getVendorLeads(),
      ])
      setBusinesses(bizData)
      setProperties(propData)
      setLeads(leadData)
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : 'Unable to load your listings and leads.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    async function init() {
      try {
        const session = await getCurrentSession()

        if (!session) {
          if (active) {
            setError('Please sign in to access your dashboard.')
            setLoading(false)
          }
          return
        }

        const [bizData, propData, leadData] = await Promise.all([
          getMyBusinesses(),
          getMyProperties(session.user.id),
          getVendorLeads(),
        ])
        if (active) {
          setBusinesses(bizData)
          setProperties(propData)
          setLeads(leadData)
        }
      } catch (loadError) {
        if (active) {
          const message =
            loadError instanceof Error ? loadError.message : 'Unable to load your listings and leads.'
          setError(message)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void init()
    return () => {
      active = false
    }
  }, [])

  async function handleDeleteBusiness(businessId: string) {
    if (!window.confirm('Delete this business listing?')) {
      return
    }

    try {
      setActionLoadingId(businessId)
      await deleteBusiness(businessId)
      await refreshData()
    } catch (deleteError) {
      const message =
        deleteError instanceof Error ? deleteError.message : 'Unable to delete this business.'
      setError(message)
    } finally {
      setActionLoadingId(null)
    }
  }

  async function handleDeleteProperty(propertyId: string) {
    if (!window.confirm('Delete this property listing?')) {
      return
    }

    try {
      setPropertyActionLoadingId(propertyId)
      await deleteProperty(propertyId)
      await refreshData()
    } catch (deleteError) {
      const message =
        deleteError instanceof Error ? deleteError.message : 'Unable to delete this property.'
      setError(message)
    } finally {
      setPropertyActionLoadingId(null)
    }
  }

  async function handleUpdateLeadStatus(matchId: string, status: RequirementMatchStatus) {
    try {
      setLeadActionLoadingId(matchId)
      await updateVendorLeadStatus(matchId, status)
      setLeads((prev) =>
        prev.map((lead) => (lead.id === matchId ? { ...lead, status } : lead)),
      )
    } catch (leadError) {
      const message =
        leadError instanceof Error ? leadError.message : 'Unable to update lead status.'
      setError(message)
    } finally {
      setLeadActionLoadingId(null)
    }
  }

  function handleOpenQuoteModal(lead: VendorLeadRecord) {
    setQuotingLeadId(lead.id)
    setQuoteError(null)
    if (lead.quote) {
      setQuoteAmount(String(lead.quote.quote_amount))
      setQuoteDuration(lead.quote.estimated_duration || '')
      setQuoteValidUntil(lead.quote.valid_until || '')
      setQuoteNotes(lead.quote.notes || '')
    } else {
      setQuoteAmount('')
      setQuoteDuration('')
      setQuoteValidUntil('')
      setQuoteNotes('')
    }
  }

  async function handleSubmitQuote(lead: VendorLeadRecord) {
    setQuoteError(null)
    const amount = Number(quoteAmount.trim())
    if (isNaN(amount) || amount <= 0) {
      setQuoteError('Please enter a valid quotation amount (greater than ₹0).')
      return
    }

    try {
      setSubmittingQuote(true)
      const newQuote = await submitRequirementQuote({
        requirement_id: lead.requirement_id,
        business_id: lead.business_id,
        quote_amount: amount,
        estimated_duration: quoteDuration.trim() || null,
        valid_until: quoteValidUntil || null,
        notes: quoteNotes.trim() || null,
      })
      setLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? { ...l, quote: newQuote } : l)),
      )
      setQuotingLeadId(null)
    } catch (err) {
      setQuoteError(err instanceof Error ? err.message : 'Unable to submit quotation.')
    } finally {
      setSubmittingQuote(false)
    }
  }

  async function handleSignOut() {
    try {
      await signOut()
      window.location.href = '/'
    } catch (signOutError) {
      const message =
        signOutError instanceof Error ? signOutError.message : 'Unable to sign out.'
      setError(message)
    }
  }

  const pendingLeads = leads.filter((l) => l.status === 'pending' || l.status === 'notified')
  const acceptedLeads = leads.filter((l) => l.status === 'accepted')
  const dismissedLeads = leads.filter((l) => l.status === 'dismissed')

  const filteredLeads = leads.filter((l) => {
    if (leadFilter === 'all') return true
    if (leadFilter === 'pending') return l.status === 'pending' || l.status === 'notified' || l.status === 'viewed'
    if (leadFilter === 'accepted') return l.status === 'accepted'
    if (leadFilter === 'dismissed') return l.status === 'dismissed'
    return true
  })

  return (
    <section className="page-section owner-dashboard owner-dash-layout" aria-label="Vendor Leads and Listings Dashboard">
      {/* Premium Dashboard Header */}
      <header className="dashboard-header owner-header-banner">
        <div className="owner-header-content">
          <div className="owner-eyebrow-row">
            <span className="owner-badge-pill">
              <span className="owner-badge-dot" aria-hidden="true"></span>
              Owner Workspace • Hosur Verified Merchant &amp; Host
            </span>
          </div>
          <h1 className="owner-dash-title">Vendor Leads &amp; Listings</h1>
          <p className="owner-dash-subtitle">
            Manage your commercial profiles, review inbound local customer requirements, submit formal quotations, and oversight real estate offerings in Hosur.
          </p>
        </div>

        <div className="owner-actions owner-header-action-group">
          <Link
            to="/owner/create"
            className="secondary-button inline-button"
            aria-label="Create a new business listing"
          >
            Create business
          </Link>
          <Link
            to="/owner/properties/create"
            className="primary-button inline-button"
            aria-label="List a new property"
          >
            List a property
          </Link>
          <button
            type="button"
            className="nav-link"
            onClick={() => void handleSignOut()}
            aria-label="Sign out of owner dashboard"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Loading Skeletons */}
      {loading && (
        <div className="req-skeleton-list" aria-busy="true" aria-live="polite">
          <div className="owner-metrics-grid">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="req-skeleton-card" style={{ height: '110px' }}>
                <div className="req-skeleton-line" style={{ width: '40%', height: '14px' }}></div>
                <div className="req-skeleton-line" style={{ width: '30%', height: '32px' }}></div>
              </div>
            ))}
          </div>
          <div className="req-skeleton-card" style={{ marginTop: '16px' }}>
            <div className="req-skeleton-line" style={{ width: '30%', height: '24px' }}></div>
            <div className="req-skeleton-line" style={{ width: '80%', height: '16px' }}></div>
            <div className="req-skeleton-line" style={{ width: '60%', height: '16px' }}></div>
          </div>
        </div>
      )}

      {/* Error Presentation */}
      {!loading && error && (
        <div className="state-panel error-state" role="alert">
          <h3>Unable to load your dashboard</h3>
          <p>{error}</p>
          <button
            type="button"
            className="secondary-button"
            onClick={() => void refreshData()}
            style={{ marginTop: '12px' }}
            aria-label="Retry loading owner dashboard data"
          >
            Try Again
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* OVERVIEW / SUMMARY METRICS CARDS */}
          <section className="owner-metrics-grid" aria-label="Dashboard Overview Metrics">
            <div className="owner-metric-card">
              <div className="owner-metric-top">
                <span className="owner-metric-label">Inbound Leads</span>
                <span className="owner-metric-icon" aria-hidden="true">📬</span>
              </div>
              <span className="owner-metric-value">{leads.length}</span>
              <span className="owner-metric-subtext">
                {pendingLeads.length > 0 ? `${pendingLeads.length} new pending review` : 'All leads reviewed'}
              </span>
            </div>

            <div className="owner-metric-card">
              <div className="owner-metric-top">
                <span className="owner-metric-label">Active Businesses</span>
                <span className="owner-metric-icon" aria-hidden="true">🏢</span>
              </div>
              <span className="owner-metric-value">{businesses.length}</span>
              <span className="owner-metric-subtext">
                {businesses.some((b) => !b.verified && Boolean(b.rejection_reason))
                  ? `${businesses.filter((b) => !b.verified && Boolean(b.rejection_reason)).length} action required (rejected)`
                  : businesses.some((b) => b.active && !b.verified)
                  ? `${businesses.filter((b) => b.active && !b.verified).length} awaiting review`
                  : 'Local store & industrial profiles'}
              </span>
            </div>

            <div className="owner-metric-card">
              <div className="owner-metric-top">
                <span className="owner-metric-label">Listed Properties</span>
                <span className="owner-metric-icon" aria-hidden="true">🏠</span>
              </div>
              <span className="owner-metric-value">{properties.length}</span>
              <span className="owner-metric-subtext">
                Real estate &amp; commercial listings
              </span>
            </div>

            <div className="owner-metric-card">
              <div className="owner-metric-top">
                <span className="owner-metric-label">Accepted Leads</span>
                <span className="owner-metric-icon" aria-hidden="true">🤝</span>
              </div>
              <span className="owner-metric-value">{acceptedLeads.length}</span>
              <span className="owner-metric-subtext">
                Direct customer connections
              </span>
            </div>
          </section>

          {/* TOP NAVIGATION TABS */}
          <nav
            className="owner-tab-nav category-grid"
            role="tablist"
            aria-label="Dashboard sections"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'leads'}
              className={`owner-tab-btn category-pill ${activeTab === 'leads' ? 'active' : ''}`}
              onClick={() => setActiveTab('leads')}
            >
              <span>Customer Leads</span>
              <span className="owner-tab-badge">
                {pendingLeads.length > 0 ? `${pendingLeads.length} new / ` : ''}
                {leads.length}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'businesses'}
              className={`owner-tab-btn category-pill ${activeTab === 'businesses' ? 'active' : ''}`}
              onClick={() => setActiveTab('businesses')}
            >
              <span>My Businesses</span>
              <span className="owner-tab-badge">{businesses.length}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'properties'}
              className={`owner-tab-btn category-pill ${activeTab === 'properties' ? 'active' : ''}`}
              onClick={() => setActiveTab('properties')}
            >
              <span>My Properties</span>
              <span className="owner-tab-badge">{properties.length}</span>
            </button>
          </nav>

          {/* TAB 1: CUSTOMER LEADS & OPPORTUNITIES */}
          {activeTab === 'leads' && (
            <div style={{ marginBottom: '48px' }}>
              <div className="section-header owner-section-bar">
                <div className="owner-section-title-wrap">
                  <p className="eyebrow">Inbound Marketplace Leads</p>
                  <h2>Customer Requirements ({leads.length})</h2>
                  <p>
                    Direct requirements posted by Hosur customers matching your business categories.
                  </p>
                </div>

                {/* Sub-filter pills for leads */}
                <div className="owner-filter-group" role="group" aria-label="Filter customer leads">
                  <button
                    type="button"
                    className={leadFilter === 'all' ? 'category-pill active' : 'category-pill'}
                    style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                    onClick={() => setLeadFilter('all')}
                  >
                    All ({leads.length})
                  </button>
                  <button
                    type="button"
                    className={leadFilter === 'pending' ? 'category-pill active' : 'category-pill'}
                    style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                    onClick={() => setLeadFilter('pending')}
                  >
                    New ({pendingLeads.length})
                  </button>
                  <button
                    type="button"
                    className={leadFilter === 'accepted' ? 'category-pill active' : 'category-pill'}
                    style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                    onClick={() => setLeadFilter('accepted')}
                  >
                    Accepted ({acceptedLeads.length})
                  </button>
                  <button
                    type="button"
                    className={leadFilter === 'dismissed' ? 'category-pill active' : 'category-pill'}
                    style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                    onClick={() => setLeadFilter('dismissed')}
                  >
                    Dismissed ({dismissedLeads.length})
                  </button>
                </div>
              </div>

              {filteredLeads.length === 0 ? (
                <div className="state-panel empty-state" role="region" aria-label="No customer leads">
                  <div
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      background: 'rgba(23, 89, 77, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 14px',
                      fontSize: '1.6rem',
                    }}
                    aria-hidden="true"
                  >
                    📫
                  </div>
                  <h3>No customer leads in this view</h3>
                  <p>
                    {leadFilter === 'all'
                      ? 'When customers in Hosur post requirements matching your business categories, they will automatically appear here.'
                      : `No leads with status "${leadFilter}". Change your filter to view other leads.`}
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <div className="owner-list" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {filteredLeads.map((lead) => {
                      const req = lead.requirement
                      const isAccepted = lead.status === 'accepted'
                      const isDismissed = lead.status === 'dismissed'

                      const budgetDisplay =
                        req?.budget_min !== null && req?.budget_min !== undefined && req?.budget_max !== null && req?.budget_max !== undefined
                          ? `₹${Number(req.budget_min).toLocaleString('en-IN')} – ₹${Number(req.budget_max).toLocaleString('en-IN')}`
                          : req?.budget_max !== null && req?.budget_max !== undefined
                          ? `Up to ₹${Number(req.budget_max).toLocaleString('en-IN')}`
                          : req?.budget_min !== null && req?.budget_min !== undefined
                          ? `From ₹${Number(req.budget_min).toLocaleString('en-IN')}`
                          : 'Budget negotiable'

                      const statusBadgeClass =
                        lead.status === 'accepted'
                          ? 'status-badge status-accepted'
                          : lead.status === 'dismissed'
                          ? 'status-badge status-cancelled'
                          : 'status-badge status-open'

                      const statusText =
                        lead.status === 'accepted'
                          ? '✓ Accepted & Contact Enabled'
                          : lead.status === 'dismissed'
                          ? 'Dismissed'
                          : 'New Inbound Lead'

                      const customerPhone = req?.customer?.phone
                      const cleanPhone = customerPhone ? customerPhone.replace(/\D/g, '') : null
                      const whatsappUrl = cleanPhone
                        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                            `Hello, I am reaching out regarding your requirement "${req?.title}" posted on SuperHosur.`,
                          )}`
                        : null

                      return (
                        <article
                          key={lead.id}
                          className={`owner-business-card owner-lead-card ${
                            isAccepted
                              ? 'status-accepted-lead'
                              : isDismissed
                              ? 'status-dismissed-lead'
                              : 'status-pending-lead'
                          }`}
                          style={{
                            flexDirection: 'column',
                            alignItems: 'stretch',
                          }}
                          aria-labelledby={`lead-title-${lead.id}`}
                        >
                          {/* Top Metadata Row */}
                          <div className="owner-lead-top">
                            <div className="owner-lead-tags">
                              <span
                                className="business-tag"
                                style={{ backgroundColor: '#f0fdf4', color: '#166534', fontWeight: 600 }}
                              >
                                Matched Business: {lead.business?.name || 'My Business'}
                              </span>
                              {req?.category_name && (
                                <span className="category-pill">{req.category_name}</span>
                              )}
                              {req?.subcategory_name && (
                                <span
                                  className="category-pill"
                                  style={{ backgroundColor: '#eff6ff', color: '#1e40af', borderColor: '#bfdbfe' }}
                                >
                                  {req.subcategory_name}
                                </span>
                              )}
                              <span className="owner-match-score-pill">
                                {Math.round(lead.match_score * 100)}% Match
                              </span>
                            </div>

                            <span className={statusBadgeClass}>{statusText}</span>
                          </div>

                          {/* Title & Description */}
                          <div>
                            <h3 id={`lead-title-${lead.id}`} style={{ margin: '0 0 6px', fontSize: '1.25rem', color: 'var(--color-primary-dark)' }}>
                              {req?.title || 'Customer Requirement'}
                            </h3>
                            <p style={{ margin: 0, color: 'var(--color-text-body)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                              {req?.description || 'No detailed scope of work provided.'}
                            </p>
                          </div>

                          {/* Specs Grid */}
                          <div className="req-meta-grid">
                            <div className="req-meta-item">
                              <span className="req-meta-label">Estimated Budget</span>
                              <span className="req-meta-val price">{budgetDisplay}</span>
                            </div>
                            <div className="req-meta-item">
                              <span className="req-meta-label">Timeline / Required By</span>
                              <span className="req-meta-val">
                                {req?.required_date
                                  ? new Date(req.required_date).toLocaleDateString('en-IN', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                    })
                                  : req?.duration || 'Immediate'}
                              </span>
                            </div>
                            <div className="req-meta-item">
                              <span className="req-meta-label">Location</span>
                              <span className="req-meta-val">{req?.address || req?.city_name || 'Hosur'}</span>
                            </div>
                            <div className="req-meta-item">
                              <span className="req-meta-label">Date Received</span>
                              <span className="req-meta-val">
                                {new Date(lead.created_at).toLocaleDateString('en-IN', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                          </div>

                          {/* Customer Contact Section */}
                          {isAccepted ? (
                            <div className="owner-contact-box" role="region" aria-label="Customer Contact Information">
                              <div>
                                <p style={{ margin: 0, fontWeight: 700, color: '#166534', fontSize: '0.95rem' }}>
                                  ✓ Customer Contact Details Unlocked:
                                </p>
                                <p style={{ margin: '3px 0 0', color: '#15803d', fontSize: '0.9rem' }}>
                                  {req?.customer?.full_name || 'Verified Customer'}
                                  {customerPhone ? ` • ${customerPhone}` : ' (Phone available on request)'}
                                </p>
                              </div>

                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {customerPhone && (
                                  <a
                                    href={`tel:${customerPhone}`}
                                    className="primary-button inline-button"
                                    style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                                    aria-label={`Call customer ${req?.customer?.full_name ?? ''}`}
                                  >
                                    📞 Call Customer
                                  </a>
                                )}
                                {whatsappUrl && (
                                  <a
                                    href={whatsappUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="secondary-button inline-button"
                                    style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                                    aria-label={`WhatsApp customer ${req?.customer?.full_name ?? ''}`}
                                  >
                                    💬 WhatsApp Customer
                                  </a>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="owner-contact-prompt">
                              💡 Accept this lead to unlock customer contact details and initiate conversation.
                            </div>
                          )}

                          {/* Quotation Section for Accepted Leads */}
                          {isAccepted && (
                            <div style={{ marginTop: '4px' }}>
                              {lead.quote ? (
                                <div className="owner-quote-box">
                                  <div
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      flexWrap: 'wrap',
                                      gap: '8px',
                                    }}
                                  >
                                    <div>
                                      <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.05rem', fontFamily: 'var(--font-mono, monospace)' }}>
                                        Quotation: ₹{Number(lead.quote.quote_amount).toLocaleString('en-IN')}
                                      </span>
                                      {lead.quote.estimated_duration && (
                                        <span style={{ marginLeft: '10px', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                                          • Timeline: {lead.quote.estimated_duration}
                                        </span>
                                      )}
                                    </div>

                                    <span
                                      className={
                                        lead.quote.status === 'accepted'
                                          ? 'status-badge status-accepted'
                                          : lead.quote.status === 'rejected'
                                          ? 'status-badge status-cancelled'
                                          : 'status-badge status-quoted'
                                      }
                                    >
                                      {lead.quote.status === 'accepted'
                                        ? '✓ Quote Accepted by Customer'
                                        : lead.quote.status === 'rejected'
                                        ? 'Quote Declined'
                                        : 'Quote Submitted • Pending Customer Decision'}
                                    </span>
                                  </div>

                                  {lead.quote.notes && (
                                    <p style={{ margin: '8px 0 4px', fontSize: '0.88rem', color: '#334155' }}>
                                      <strong>Proposal notes:</strong> {lead.quote.notes}
                                    </p>
                                  )}

                                  {lead.quote.status === 'submitted' && (
                                    <button
                                      type="button"
                                      className="text-action"
                                      style={{ marginTop: '8px', fontSize: '0.85rem' }}
                                      onClick={() => handleOpenQuoteModal(lead)}
                                      aria-label="Edit submitted quotation"
                                    >
                                      ✏️ Edit Quotation
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div className="owner-quote-empty-box">
                                  <div>
                                    <p style={{ margin: 0, fontWeight: 700, color: '#334155', fontSize: '0.9rem' }}>
                                      No Formal Quotation Submitted
                                    </p>
                                    <p style={{ margin: '2px 0 0', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                                      Submit your price and timeline to compete for this requirement.
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    className="primary-button inline-button"
                                    style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                                    onClick={() => handleOpenQuoteModal(lead)}
                                    aria-label="Submit formal quotation for this lead"
                                  >
                                    Submit Quotation
                                  </button>
                                </div>
                              )}

                              {/* Inline Quotation Modal / Form */}
                              {quotingLeadId === lead.id && (
                                <div className="owner-inline-modal" role="dialog" aria-labelledby={`quote-modal-${lead.id}`}>
                                  <h4 id={`quote-modal-${lead.id}`} style={{ margin: '0 0 14px', color: '#0369a1', fontSize: '1.1rem' }}>
                                    {lead.quote ? 'Update Formal Quotation' : 'Submit Formal Quotation'}
                                  </h4>

                                  {quoteError && (
                                    <div className="form-error" role="alert" style={{ marginBottom: '14px' }}>
                                      {quoteError}
                                    </div>
                                  )}

                                  <div className="form-grid" style={{ marginBottom: '14px' }}>
                                    <label>
                                      Quote Amount (₹) *
                                      <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={quoteAmount}
                                        onChange={(e) => setQuoteAmount(e.target.value)}
                                        placeholder="e.g. 12500"
                                        required
                                      />
                                    </label>

                                    <label>
                                      Estimated Timeline / Duration
                                      <input
                                        type="text"
                                        value={quoteDuration}
                                        onChange={(e) => setQuoteDuration(e.target.value)}
                                        placeholder="e.g. 3 business days, 2 weeks"
                                      />
                                    </label>

                                    <label>
                                      Quote Valid Until
                                      <input
                                        type="date"
                                        value={quoteValidUntil}
                                        onChange={(e) => setQuoteValidUntil(e.target.value)}
                                      />
                                    </label>

                                    <label className="full-width">
                                      Proposal Notes, Inclusions &amp; Terms
                                      <textarea
                                        rows={3}
                                        value={quoteNotes}
                                        onChange={(e) => setQuoteNotes(e.target.value)}
                                        placeholder="Describe what is included in your quote, materials, payment terms, or warranty."
                                      />
                                    </label>
                                  </div>

                                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                    <button
                                      type="button"
                                      className="secondary-button inline-button"
                                      onClick={() => setQuotingLeadId(null)}
                                      disabled={submittingQuote}
                                      aria-label="Cancel quotation form"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      className="primary-button inline-button"
                                      onClick={() => handleSubmitQuote(lead)}
                                      disabled={submittingQuote}
                                      aria-label="Send quotation to customer"
                                    >
                                      {submittingQuote ? 'Submitting…' : 'Send Quotation to Customer'}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Lead Actions */}
                          <div
                            style={{
                              display: 'flex',
                              gap: '10px',
                              justifyContent: 'flex-end',
                              borderTop: '1px solid var(--color-border-subtle)',
                              paddingTop: '14px',
                              flexWrap: 'wrap',
                            }}
                          >
                            {!isAccepted && (
                              <button
                                type="button"
                                className="primary-button inline-button"
                                onClick={() => handleUpdateLeadStatus(lead.id, 'accepted')}
                                disabled={leadActionLoadingId === lead.id}
                                aria-label="Accept lead and unlock contact"
                              >
                                {leadActionLoadingId === lead.id ? 'Accepting…' : 'Accept Lead & Contact'}
                              </button>
                            )}
                            {!isDismissed && (
                              <button
                                type="button"
                                className="secondary-button inline-button"
                                onClick={() => handleUpdateLeadStatus(lead.id, 'dismissed')}
                                disabled={leadActionLoadingId === lead.id}
                                aria-label="Dismiss this lead"
                              >
                                {leadActionLoadingId === lead.id ? 'Updating…' : 'Dismiss'}
                              </button>
                            )}
                            {isDismissed && (
                              <button
                                type="button"
                                className="secondary-button inline-button"
                                onClick={() => handleUpdateLeadStatus(lead.id, 'pending')}
                                disabled={leadActionLoadingId === lead.id}
                                aria-label="Reopen dismissed lead"
                              >
                                {leadActionLoadingId === lead.id ? 'Reopening…' : 'Reopen Lead'}
                              </button>
                            )}
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BUSINESSES */}
          {activeTab === 'businesses' && (
            <div style={{ marginBottom: '48px' }}>
              <div className="section-header owner-section-bar">
                <div className="owner-section-title-wrap">
                  <p className="eyebrow">Commerce Listings</p>
                  <h2>My businesses ({businesses.length})</h2>
                  <p>Manage your verified Hosur business presence, catalogs, and media gallery.</p>
                </div>
                <Link
                  to="/owner/create"
                  className="primary-button inline-button"
                  aria-label="Add a new business profile"
                >
                  + Add business
                </Link>
              </div>

              {businesses.length === 0 ? (
                <div className="state-panel empty-state" role="region" aria-label="No business listings">
                  <div
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      background: 'rgba(23, 89, 77, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 14px',
                      fontSize: '1.6rem',
                    }}
                    aria-hidden="true"
                  >
                    🏢
                  </div>
                  <h3>No businesses yet</h3>
                  <p>Your business listings will appear here. Create your first listing to start selling locally in Hosur.</p>
                  <Link
                    to="/owner/create"
                    className="primary-button inline-button"
                    style={{ marginTop: '14px' }}
                    aria-label="Create your first business listing"
                  >
                    Add your business
                  </Link>
                </div>
              ) : (
                <div className="table-responsive">
                  <div className="owner-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {businesses.map((business) => {
                      const status = getOwnerBusinessStatus(business)
                      const isPublic = status === 'public'
                      const isPending = status === 'pending'
                      const isRejected = status === 'rejected'
                      const isUnpublished = status === 'unpublished'

                      return (
                        <article
                          key={business.id}
                          className={`owner-business-card owner-dash-item-card owner-business-card--${status}`}
                          aria-labelledby={`biz-name-${business.id}`}
                        >
                          <div className="owner-dash-item-main">
                            <div className="owner-card-top-row">
                              <p className="owner-card-label">Business Listing</p>
                              <span className={`owner-status-badge owner-status-badge--${status}`}>
                                <span className={`owner-status-dot owner-status-dot--${status}`} aria-hidden="true" />
                                {isPublic && '✓ Verified & Public'}
                                {isPending && '⏳ Awaiting Verification'}
                                {isRejected && '✕ Action Required: Rejected'}
                                {isUnpublished && '🔒 Unpublished'}
                              </span>
                            </div>

                            <h3 id={`biz-name-${business.id}`} className="owner-item-title">
                              {business.name}
                            </h3>

                            <div className="owner-meta-row">
                              {business.address && (
                                <span className="location-pill">📍 {business.address}</span>
                              )}
                              {business.availability_status && (
                                <span className="business-tag" style={{ textTransform: 'capitalize' }}>
                                  ● {business.availability_status}
                                </span>
                              )}
                              {business.phone && (
                                <span className="business-tag">📞 {business.phone}</span>
                              )}
                              <span className="business-tag">
                                📅 Submitted{' '}
                                {new Date(business.created_at).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                          </div>

                          {/* REJECTED: Display Saved Rejection Reason & Professional Guidance */}
                          {isRejected && (
                            <div className="owner-status-banner owner-status-banner--rejected" role="alert">
                              <div className="owner-status-banner-header">
                                <span className="owner-status-banner-icon" aria-hidden="true">⚠️</span>
                                <div className="owner-status-banner-header-text">
                                  <h4 className="owner-status-banner-title">Listing Revision Required</h4>
                                  <p className="owner-status-banner-subtitle">
                                    An administrator reviewed your business and requested the following changes before approval:
                                  </p>
                                </div>
                              </div>
                              <div className="owner-rejection-reason-box">
                                <p className="owner-rejection-reason-quote">"{business.rejection_reason}"</p>
                              </div>
                              <div className="owner-status-banner-actions">
                                <p className="owner-status-banner-instruction">
                                  💡 Update your listing details or upload proper photos to address this feedback. Once saved, your listing will be re-submitted for admin review.
                                </p>
                                <Link
                                  to={`/owner/businesses/${business.id}/edit`}
                                  className="owner-resolve-btn"
                                  aria-label={`Edit ${business.name} to address feedback`}
                                >
                                  ✏️ Edit Listing to Fix
                                </Link>
                              </div>
                            </div>
                          )}

                          {/* PENDING: Helpful Guidance while awaiting verification */}
                          {isPending && (
                            <div className="owner-status-banner owner-status-banner--pending" role="note">
                              <div className="owner-status-banner-header">
                                <span className="owner-status-banner-icon" aria-hidden="true">⏳</span>
                                <div className="owner-status-banner-header-text">
                                  <h4 className="owner-status-banner-title">Awaiting Admin Verification</h4>
                                  <p className="owner-status-banner-subtitle">
                                    Your listing was submitted and is currently in the verification queue.
                                  </p>
                                </div>
                              </div>
                              <p className="owner-status-banner-instruction">
                                🛡️ To maintain high quality across SuperHosur, our moderation team verifies new business profiles. You can add photos or manage products while waiting. Once approved, your listing will automatically go live.
                              </p>
                            </div>
                          )}

                          {/* UNPUBLISHED: Guidance for inactive listings */}
                          {isUnpublished && (
                            <div className="owner-status-banner owner-status-banner--unpublished" role="note">
                              <div className="owner-status-banner-header">
                                <span className="owner-status-banner-icon" aria-hidden="true">🔒</span>
                                <div className="owner-status-banner-header-text">
                                  <h4 className="owner-status-banner-title">Listing Hidden (Unpublished)</h4>
                                  <p className="owner-status-banner-subtitle">
                                    This listing is currently hidden from public search, category directories, and map views.
                                  </p>
                                </div>
                              </div>
                              <p className="owner-status-banner-instruction">
                                Click <strong>Edit</strong> to review your business information and reactivate public visibility.
                              </p>
                            </div>
                          )}

                          {/* VERIFIED & PUBLIC: Live confirmation */}
                          {isPublic && (
                            <div className="owner-status-banner owner-status-banner--public" role="note">
                              <div className="owner-status-banner-header">
                                <span className="owner-status-banner-icon" aria-hidden="true">🌟</span>
                                <div className="owner-status-banner-header-text">
                                  <h4 className="owner-status-banner-title">Live &amp; Public on SuperHosur</h4>
                                  <p className="owner-status-banner-subtitle">
                                    Your business is verified and active. Local customers in Hosur can discover your listing, view catalog offerings, and contact you directly.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Preserved Business Action Buttons (View fixed with slug) */}
                          <div className="owner-business-actions">
                            <Link
                              to={`/owner/businesses/${business.id}/edit`}
                              className="owner-action-btn owner-action-btn--primary"
                              aria-label={`Edit ${business.name}`}
                            >
                              ✏️ Edit
                            </Link>
                            <Link
                              to={`/owner/businesses/${business.id}/edit#photos`}
                              className="owner-action-btn"
                              aria-label={`Manage photos for ${business.name}`}
                            >
                              📷 Photos
                            </Link>
                            <Link
                              to={`/businesses/${business.slug}`}
                              className="owner-action-btn"
                              aria-label={`View public profile of ${business.name}`}
                            >
                              👁️ View
                            </Link>
                            <Link
                              to={`/owner/businesses/${business.id}/offerings`}
                              className="owner-action-btn"
                              aria-label={`Manage services and products for ${business.name}`}
                            >
                              📦 Services &amp; products
                            </Link>
                            <button
                              type="button"
                              className="owner-action-btn owner-action-btn--danger"
                              onClick={() => handleDeleteBusiness(business.id)}
                              disabled={actionLoadingId === business.id}
                              aria-label={`Delete ${business.name}`}
                            >
                              {actionLoadingId === business.id ? 'Deleting…' : 'Delete'}
                            </button>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PROPERTIES */}
          {activeTab === 'properties' && (
            <div style={{ marginBottom: '48px' }}>
              <div className="section-header owner-section-bar">
                <div className="owner-section-title-wrap">
                  <p className="eyebrow">Real Estate Listings</p>
                  <h2>My properties ({properties.length})</h2>
                  <p>Manage commercial units, industrial plots, apartments, and warehouses in Hosur.</p>
                </div>
                <Link
                  to="/owner/properties/create"
                  className="primary-button inline-button"
                  aria-label="List a new property"
                >
                  + List property
                </Link>
              </div>

              {properties.length === 0 ? (
                <div className="state-panel empty-state" role="region" aria-label="No property listings">
                  <div
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      background: 'rgba(23, 89, 77, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 14px',
                      fontSize: '1.6rem',
                    }}
                    aria-hidden="true"
                  >
                    🏠
                  </div>
                  <h3>No properties listed yet</h3>
                  <p>
                    Your property listings will appear here. Post apartments, houses, plots, or commercial spaces for sale, rent, or lease in Hosur.
                  </p>
                  <Link
                    to="/owner/properties/create"
                    className="primary-button inline-button"
                    style={{ marginTop: '14px' }}
                    aria-label="List your first property in Hosur"
                  >
                    List a property
                  </Link>
                </div>
              ) : (
                <div className="table-responsive">
                  <div className="owner-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {properties.map((property) => {
                      const statusLabel =
                        property.active && property.verified
                          ? '✓ Verified & Public'
                          : property.active
                          ? '⏳ Awaiting verification'
                          : '🔒 Unpublished'

                      const priceDisplay =
                        property.listing_type === 'rent'
                          ? `₹${Number(property.rent).toLocaleString('en-IN')}/mo`
                          : property.listing_type === 'lease'
                          ? `₹${Number(property.rent ?? property.price).toLocaleString('en-IN')} lease`
                          : `₹${Number(property.price).toLocaleString('en-IN')}`

                      return (
                        <article
                          key={property.id}
                          className="owner-business-card owner-dash-item-card"
                          aria-labelledby={`prop-title-${property.id}`}
                        >
                          <div className="owner-dash-item-main">
                            <p className="owner-card-label">
                              {property.property_type.toUpperCase()} •{' '}
                              {property.listing_type.toUpperCase()}
                            </p>
                            <h3 id={`prop-title-${property.id}`} className="owner-item-title">
                              {property.title}
                            </h3>

                            <div className="owner-meta-row">
                              {property.bedrooms !== null && (
                                <span>🛏️ {property.bedrooms} BHK</span>
                              )}
                              {property.area_sqft !== null && (
                                <span>📐 {property.area_sqft} sq.ft</span>
                              )}
                              <span style={{ color: 'var(--color-primary)', fontWeight: 700, fontFamily: 'var(--font-mono, monospace)' }}>
                                {priceDisplay}
                              </span>
                              <span>📍 {property.cities?.name || 'Hosur'}</span>
                              <span
                                className={
                                  property.active && property.verified
                                    ? 'status-badge status-accepted'
                                    : property.active
                                    ? 'status-badge status-quoted'
                                    : 'status-badge status-cancelled'
                                }
                              >
                                {statusLabel}
                              </span>
                            </div>
                          </div>

                          <div className="owner-business-actions">
                            <Link
                              to={`/owner/properties/${property.id}/edit`}
                              className="nav-link"
                              aria-label={`Edit ${property.title}`}
                            >
                              ✏️ Edit
                            </Link>
                            <Link
                              to={`/owner/properties/${property.id}/edit#property-photos`}
                              className="nav-link"
                              aria-label={`Manage photos for ${property.title}`}
                            >
                              📷 Photos
                            </Link>
                            <Link
                              to={`/properties/${property.id}`}
                              className="nav-link"
                              aria-label={`View public listing of ${property.title}`}
                            >
                              👁️ View
                            </Link>
                            <button
                              type="button"
                              className="nav-link danger-button"
                              onClick={() => handleDeleteProperty(property.id)}
                              disabled={propertyActionLoadingId === property.id}
                              aria-label={`Delete listing ${property.title}`}
                            >
                              {propertyActionLoadingId === property.id ? 'Deleting…' : 'Delete'}
                            </button>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}
