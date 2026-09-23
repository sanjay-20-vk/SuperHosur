import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  acceptRequirementQuote,
  cancelRequirement,
  completeRequirement,
  getMyRequirements,
  getRequirementErrorMessage,
  type RequirementRecord,
} from '../services/requirements'

function formatBudget(min: number | null, max: number | null): string {
  if (min !== null && max !== null) {
    return `₹${min.toLocaleString('en-IN')} – ₹${max.toLocaleString('en-IN')}`
  }
  if (min !== null) {
    return `From ₹${min.toLocaleString('en-IN')}`
  }
  if (max !== null) {
    return `Up to ₹${max.toLocaleString('en-IN')}`
  }
  return 'Flexible budget'
}

function getStatusBadgeClass(status: RequirementRecord['status']): string {
  switch (status) {
    case 'open':
      return 'status-badge status-open'
    case 'matching':
      return 'status-badge status-matching'
    case 'quoted':
      return 'status-badge status-quoted'
    case 'accepted':
      return 'status-badge status-accepted'
    case 'completed':
      return 'status-badge status-completed'
    case 'cancelled':
    case 'expired':
      return 'status-badge status-cancelled'
    default:
      return 'status-badge'
  }
}

function getStatusLabel(status: RequirementRecord['status']): string {
  switch (status) {
    case 'open':
      return 'Open for Quotes'
    case 'matching':
      return 'Matching Local Vendors'
    case 'quoted':
      return 'Quotes Received'
    case 'accepted':
      return 'Quotation Accepted'
    case 'completed':
      return 'Fulfilled & Completed'
    case 'cancelled':
      return 'Cancelled'
    case 'expired':
      return 'Expired'
    default:
      return (status as string).toUpperCase()
  }
}

export function MyRequirementsPage() {
  const [requirements, setRequirements] = useState<RequirementRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [acceptingQuoteId, setAcceptingQuoteId] = useState<string | null>(null)
  const [completingReqId, setCompletingReqId] = useState<string | null>(null)

  async function loadData() {
    try {
      setError(null)
      const rows = await getMyRequirements()
      setRequirements(rows)
    } catch (err) {
      setError(getRequirementErrorMessage(err, 'Unable to load your requirements.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    async function init() {
      try {
        const rows = await getMyRequirements()
        if (active) {
          setRequirements(rows)
        }
      } catch (err) {
        if (active) {
          setError(getRequirementErrorMessage(err, 'Unable to load your requirements.'))
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

  async function handleCancel(requirementId: string) {
    if (!window.confirm('Are you sure you want to cancel this requirement?')) {
      return
    }

    try {
      setCancellingId(requirementId)
      await cancelRequirement(requirementId)
      await loadData()
    } catch (err) {
      setError(getRequirementErrorMessage(err, 'Unable to cancel requirement.'))
    } finally {
      setCancellingId(null)
    }
  }

  async function handleAcceptQuote(requirementId: string, quoteId: string) {
    if (
      !window.confirm(
        'Are you sure you want to accept this quotation? Other competing proposals will be declined and your requirement will move to Accepted status.',
      )
    ) {
      return
    }

    try {
      setAcceptingQuoteId(quoteId)
      setError(null)
      await acceptRequirementQuote(requirementId, quoteId)
      await loadData()
    } catch (err) {
      setError(getRequirementErrorMessage(err, 'Unable to accept quotation.'))
    } finally {
      setAcceptingQuoteId(null)
    }
  }

  async function handleComplete(requirementId: string) {
    if (
      !window.confirm(
        'Confirm that this requirement has been completed and satisfactorily fulfilled?',
      )
    ) {
      return
    }

    try {
      setCompletingReqId(requirementId)
      setError(null)
      await completeRequirement(requirementId)
      await loadData()
    } catch (err) {
      setError(getRequirementErrorMessage(err, 'Unable to complete requirement.'))
    } finally {
      setCompletingReqId(null)
    }
  }

  return (
    <section className="page-section owner-dashboard req-dashboard" aria-label="Customer Requirements Management">
      {/* Premium Page Header */}
      <header className="req-header-banner">
        <div className="req-header-content">
          <div className="req-eyebrow-row">
            <span className="req-badge-pill">
              <span className="req-badge-dot" aria-hidden="true"></span>
              Hosur Marketplace • Customer Hub
            </span>
            {!loading && requirements.length > 0 && (
              <span className="req-count-badge">
                {requirements.length} {requirements.length === 1 ? 'Requirement' : 'Requirements'}
              </span>
            )}
          </div>
          <h1 className="req-title">My Requirements</h1>
          <p className="req-subtitle">
            Track your posted requirements, compare competitive quotations from verified Hosur businesses, and coordinate order fulfillment seamlessly.
          </p>
        </div>

        <div className="req-header-actions owner-actions">
          <Link
            to="/requirements/new"
            className="primary-button inline-button"
            aria-label="Post a new requirement in Hosur"
          >
            Post a Requirement
          </Link>
          <Link
            to="/"
            className="nav-link"
            aria-label="Browse Hosur marketplace catalog"
          >
            Marketplace
          </Link>
        </div>
      </header>

      {/* Loading Skeleton Presentation */}
      {loading && (
        <div className="req-skeleton-list" aria-busy="true" aria-live="polite">
          <div className="req-skeleton-card">
            <div className="req-skeleton-line" style={{ width: '35%', height: '24px' }}></div>
            <div className="req-skeleton-line" style={{ width: '65%', height: '20px' }}></div>
            <div className="req-skeleton-line" style={{ width: '90%', height: '14px' }}></div>
            <div className="req-skeleton-line" style={{ width: '50%', height: '14px' }}></div>
          </div>
          <div className="req-skeleton-card">
            <div className="req-skeleton-line" style={{ width: '40%', height: '24px' }}></div>
            <div className="req-skeleton-line" style={{ width: '70%', height: '20px' }}></div>
            <div className="req-skeleton-line" style={{ width: '85%', height: '14px' }}></div>
          </div>
        </div>
      )}

      {/* Error State Presentation */}
      {!loading && error && (
        <div className="state-panel error-state" role="alert">
          <h3>Unable to load requirements</h3>
          <p>{error}</p>
          <button
            type="button"
            className="secondary-button"
            onClick={() => void loadData()}
            style={{ marginTop: '12px' }}
            aria-label="Retry loading requirements"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty State Presentation */}
      {!loading && !error && requirements.length === 0 && (
        <div className="state-panel empty-state" role="region" aria-label="No requirements found">
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--color-primary-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '1.8rem',
            }}
            aria-hidden="true"
          >
            📋
          </div>
          <h3>No requirements yet</h3>
          <p>Tell local businesses what you need and receive relevant responses.</p>
          <div style={{ marginTop: '16px' }}>
            <Link
              to="/requirements/new"
              className="primary-button inline-button"
              aria-label="Post your first requirement in Hosur"
            >
              Post your first requirement
            </Link>
          </div>
        </div>
      )}

      {/* Requirements List Wrapped in Responsive Table Container */}
      {!loading && !error && requirements.length > 0 && (
        <div className="table-responsive">
          <div className="owner-list" style={{ gap: '24px' }}>
            {requirements.map((req) => {
              const canCancel = req.status === 'open' || req.status === 'matching' || req.status === 'quoted'
              const matches = req.matches ?? []
              const quotes = req.quotes ?? []
              const acceptedQuote = quotes.find((q) => q.status === 'accepted')

              return (
                <article
                  key={req.id}
                  className="owner-business-card req-item-card"
                  style={{ flexDirection: 'column', alignItems: 'stretch' }}
                  aria-labelledby={`req-title-${req.id}`}
                >
                  {/* Top Badges & Timing Row */}
                  <div className="req-item-header">
                    <div className="req-item-badges">
                      <span className={getStatusBadgeClass(req.status)}>
                        {getStatusLabel(req.status)}
                      </span>
                      {req.category_name && (
                        <span className="category-pill">{req.category_name}</span>
                      )}
                      {req.subcategory_name && (
                        <span
                          className="category-pill"
                          style={{ backgroundColor: '#eff6ff', color: '#1e40af', borderColor: '#bfdbfe' }}
                        >
                          {req.subcategory_name}
                        </span>
                      )}
                      {req.city_name && (
                        <span className="location-pill">{req.city_name}</span>
                      )}
                    </div>
                    <time className="req-item-posted-time" dateTime={req.created_at}>
                      Posted {new Date(req.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </time>
                  </div>

                  {/* Title and Scannable Metadata */}
                  <div className="req-item-title-section">
                    <h2 id={`req-title-${req.id}`} className="req-item-title">
                      {req.title}
                    </h2>

                    <div className="req-meta-grid">
                      <div className="req-meta-item">
                        <span className="req-meta-label">Indicative Budget</span>
                        <span className="req-meta-val price">
                          {formatBudget(req.budget_min, req.budget_max)}
                        </span>
                      </div>

                      {req.required_date && (
                        <div className="req-meta-item">
                          <span className="req-meta-label">Needed By</span>
                          <span className="req-meta-val">
                            {new Date(req.required_date).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      )}

                      {req.duration && (
                        <div className="req-meta-item">
                          <span className="req-meta-label">Expected Duration</span>
                          <span className="req-meta-val">{req.duration}</span>
                        </div>
                      )}

                      {req.address && (
                        <div className="req-meta-item">
                          <span className="req-meta-label">Fulfillment Location</span>
                          <span className="req-meta-val">{req.address}</span>
                        </div>
                      )}
                    </div>

                    {req.description && (
                      <p className="req-desc-text">
                        {req.description}
                      </p>
                    )}
                  </div>

                  {/* Lifecycle Status Banners */}
                  {req.status === 'accepted' && (
                    <div className="req-lifecycle-card accepted-flow" role="status">
                      <div>
                        <p className="req-lifecycle-title">
                          ✓ Quotation Accepted — Work in progress
                        </p>
                        <p className="req-lifecycle-desc">
                          {acceptedQuote?.business?.name
                            ? `Fulfilled by ${acceptedQuote.business.name}`
                            : 'Connected with the selected vendor.'}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="primary-button inline-button"
                        onClick={() => handleComplete(req.id)}
                        disabled={completingReqId === req.id}
                        aria-label={`Mark requirement ${req.title} as completed`}
                      >
                        {completingReqId === req.id ? 'Completing…' : 'Mark Job as Completed'}
                      </button>
                    </div>
                  )}

                  {req.status === 'completed' && (
                    <div className="req-lifecycle-card completed-flow" role="status">
                      <div>
                        <p className="req-lifecycle-title">
                          🎉 Requirement Completed &amp; Satisfactorily Delivered
                        </p>
                        <p className="req-lifecycle-desc">
                          Help the Hosur community by reviewing this business experience.
                        </p>
                      </div>
                      {acceptedQuote?.business_id && (
                        <Link
                          to={`/businesses/${acceptedQuote.business_id}`}
                          className="primary-button inline-button"
                          aria-label={`Rate and review ${acceptedQuote.business?.name ?? 'business'}`}
                        >
                          Rate & Review Business
                        </Link>
                      )}
                    </div>
                  )}

                  {/* Section 1: Received Vendor Quotations (Wrapped in .table-responsive) */}
                  <div className="req-sub-section">
                    <div className="req-sub-heading">
                      <p className="req-sub-title" style={{ color: '#0369a1' }}>
                        Vendor Quotations ({quotes.length})
                      </p>
                    </div>

                    {quotes.length === 0 ? (
                      <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                        {req.status === 'cancelled'
                          ? 'Requirement cancelled.'
                          : 'No formal quotes submitted yet. Matched vendors in Hosur will review your request and send pricing.'}
                      </p>
                    ) : (
                      <div className="table-responsive">
                        <div className="req-quotes-list">
                          {quotes.map((q) => {
                            const isThisAccepted = q.status === 'accepted'
                            const isRejected = q.status === 'rejected'
                            const canAcceptThis =
                              q.status === 'submitted' &&
                              req.status !== 'accepted' &&
                              req.status !== 'completed' &&
                              req.status !== 'cancelled'

                            return (
                              <div
                                key={q.id}
                                className={`req-quote-item ${isThisAccepted ? 'is-accepted' : ''} ${isRejected ? 'is-rejected' : ''}`}
                              >
                                <div className="req-quote-top">
                                  <div className="req-quote-vendor">
                                    <span className="req-quote-business-name">
                                      {q.business?.name ?? 'Verified Business'}
                                    </span>
                                    <span className="req-quote-price">
                                      ₹{Number(q.quote_amount).toLocaleString('en-IN')}
                                    </span>
                                    {q.estimated_duration && (
                                      <span className="req-quote-timeline">
                                        ⏱ Timeline: {q.estimated_duration}
                                      </span>
                                    )}
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span
                                      className={
                                        isThisAccepted
                                          ? 'status-badge status-accepted'
                                          : isRejected
                                          ? 'status-badge status-cancelled'
                                          : 'status-badge status-quoted'
                                      }
                                    >
                                      {isThisAccepted
                                        ? '✓ Accepted Quote'
                                        : isRejected
                                        ? 'Declined'
                                        : 'Submitted Quote'}
                                    </span>

                                    {canAcceptThis && (
                                      <button
                                        type="button"
                                        className="primary-button inline-button"
                                        style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                                        onClick={() => handleAcceptQuote(req.id, q.id)}
                                        disabled={acceptingQuoteId === q.id}
                                        aria-label={`Accept quote of ₹${Number(q.quote_amount).toLocaleString('en-IN')} from ${q.business?.name ?? 'business'}`}
                                      >
                                        {acceptingQuoteId === q.id ? 'Accepting…' : 'Accept Quote'}
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {q.notes && (
                                  <p className="req-quote-notes">
                                    <strong>Proposal details:</strong> {q.notes}
                                  </p>
                                )}

                                <div className="req-quote-bottom">
                                  <div className="req-quote-contacts">
                                    {q.business?.phone && (
                                      <a
                                        href={`tel:${q.business.phone}`}
                                        className="text-action"
                                        aria-label={`Call ${q.business.name ?? 'vendor'}`}
                                      >
                                        📞 Call
                                      </a>
                                    )}
                                    {q.business?.whatsapp && (
                                      <a
                                        href={`https://wa.me/${q.business.whatsapp.replace(/\D/g, '')}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-action"
                                        aria-label={`Chat with ${q.business.name ?? 'vendor'} on WhatsApp`}
                                      >
                                        💬 WhatsApp
                                      </a>
                                    )}
                                    {q.business_id && (
                                      <Link
                                        to={`/businesses/${q.business_id}`}
                                        className="text-action"
                                        aria-label={`View full profile of ${q.business?.name ?? 'vendor'}`}
                                      >
                                        🏢 View profile
                                      </Link>
                                    )}
                                  </div>

                                  <span style={{ fontSize: '0.78rem', color: 'var(--color-text-subtle)' }}>
                                    Submitted {new Date(q.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section 2: Matched Businesses (Wrapped in .table-responsive) */}
                  <div className="req-sub-section">
                    <div className="req-sub-heading">
                      <p className="req-sub-title" style={{ color: 'var(--color-text-muted)' }}>
                        Matched local businesses ({matches.length})
                      </p>
                    </div>

                    {matches.length === 0 ? (
                      <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                        {req.status === 'cancelled'
                          ? 'Requirement cancelled.'
                          : 'Our system is matching verified local businesses in Hosur to your request.'}
                      </p>
                    ) : (
                      <div className="table-responsive">
                        <div className="req-matches-list">
                          {matches.map((m) => (
                            <div key={m.id} className="req-match-item">
                              <div className="req-match-info">
                                <span className="req-match-name">
                                  {m.business?.name ?? 'Matched Business'}
                                </span>
                                <span className="req-match-score">
                                  {Math.round(m.match_score * 100)}% Match
                                </span>
                                {m.business?.verified && (
                                  <span
                                    className="status-badge status-open"
                                    style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                                  >
                                    Verified
                                  </span>
                                )}
                              </div>

                              <div style={{ display: 'flex', gap: '14px', fontSize: '0.85rem' }}>
                                {m.business?.phone && (
                                  <a
                                    href={`tel:${m.business.phone}`}
                                    className="text-action"
                                    aria-label={`Call ${m.business?.name ?? 'matched business'}`}
                                  >
                                    Call
                                  </a>
                                )}
                                {m.business?.whatsapp && (
                                  <a
                                    href={`https://wa.me/${m.business.whatsapp.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-action"
                                    aria-label={`WhatsApp ${m.business?.name ?? 'matched business'}`}
                                  >
                                    WhatsApp
                                  </a>
                                )}
                                {m.business?.id && (
                                  <Link
                                    to={`/businesses/${m.business.id}`}
                                    className="text-action"
                                    aria-label={`View profile of ${m.business?.name ?? 'matched business'}`}
                                  >
                                    View profile
                                  </Link>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Footer Actions */}
                  <footer className="req-card-footer owner-business-actions">
                    <span className="req-footer-date">
                      Posted {new Date(req.created_at).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>

                    {canCancel && (
                      <button
                        type="button"
                        className="nav-link danger-button"
                        onClick={() => handleCancel(req.id)}
                        disabled={cancellingId === req.id}
                        aria-label={`Cancel requirement ${req.title}`}
                      >
                        {cancellingId === req.id ? 'Cancelling…' : 'Cancel requirement'}
                      </button>
                    )}
                  </footer>
                </article>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
