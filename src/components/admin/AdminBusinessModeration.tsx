import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { BusinessRecord } from '../../services/businesses'
import type { AdminBusinessPhoto } from '../../services/photos'
import type { AdminBusinessVideo } from '../../services/videos'

// ─── Status helpers ────────────────────────────────────────────────────────────

type StatusKey = 'public' | 'pending' | 'unpublished' | 'rejected'

function getStatusKey(business: BusinessRecord): StatusKey {
  if (business.active && business.verified) return 'public'
  if (!business.verified && Boolean(business.rejection_reason)) return 'rejected'
  if (business.active && !business.verified) return 'pending'
  return 'unpublished'
}

const STATUS_LABELS: Record<StatusKey, string> = {
  public: 'Public',
  pending: 'Pending review',
  unpublished: 'Unpublished',
  rejected: 'Rejected',
}

const STATUS_CSS: Record<StatusKey, string> = {
  public: 'abm-status-badge abm-status-badge--public',
  pending: 'abm-status-badge abm-status-badge--pending',
  unpublished: 'abm-status-badge abm-status-badge--unpublished',
  rejected: 'abm-status-badge abm-status-badge--rejected',
}

const STATUS_DOT: Record<StatusKey, string> = {
  public: 'abm-status-dot abm-status-dot--public',
  pending: 'abm-status-dot abm-status-dot--pending',
  unpublished: 'abm-status-dot abm-status-dot--unpublished',
  rejected: 'abm-status-dot abm-status-dot--rejected',
}

const PRESET_REASONS = [
  'Incomplete address or unverified location in Hosur',
  'Invalid or unreachable contact phone number',
  'Inaccurate category or misleading business description',
  'Duplicate business listing submission',
]

// ─── Types ─────────────────────────────────────────────────────────────────────

type FilterKey = 'all' | StatusKey

export interface AdminBusinessModerationProps {
  businesses: BusinessRecord[]
  reviewPhotos: AdminBusinessPhoto[]
  reviewVideos: AdminBusinessVideo[]
  loading: boolean
  error: string | null
  actionLoadingId: string | null
  onUpdateVisibility: (
    business: BusinessRecord,
    input: { active: boolean; verified: boolean; rejection_reason?: string | null },
    confirmation?: string,
  ) => Promise<void>
  onRejectBusiness?: (
    business: BusinessRecord,
    rejectionReason: string,
  ) => Promise<void>
  onUpdatePhotoStatus: (
    photo: AdminBusinessPhoto,
    moderationStatus: 'approved' | 'rejected',
    confirmation: string,
  ) => Promise<void>
  onUpdateVideoStatus: (
    video: AdminBusinessVideo,
    moderationStatus: 'approved' | 'rejected',
    confirmation: string,
  ) => Promise<void>
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function AdminBusinessModeration({
  businesses,
  reviewPhotos,
  reviewVideos,
  loading,
  error,
  actionLoadingId,
  onUpdateVisibility,
  onRejectBusiness,
  onUpdatePhotoStatus,
  onUpdateVideoStatus,
}: AdminBusinessModerationProps) {
  const [filter, setFilter] = useState<FilterKey>('all')
  const [search, setSearch] = useState('')
  const [rejectingBusiness, setRejectingBusiness] = useState<BusinessRecord | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejectionError, setRejectionError] = useState<string | null>(null)
  const [isSubmittingRejection, setIsSubmittingRejection] = useState(false)

  // ── Derived counts ──────────────────────────────────────────────────────────
  const pendingCount = businesses.filter((b) => getStatusKey(b) === 'pending').length
  const publicCount = businesses.filter((b) => getStatusKey(b) === 'public').length
  const unpublishedCount = businesses.filter((b) => getStatusKey(b) === 'unpublished').length
  const rejectedCount = businesses.filter((b) => getStatusKey(b) === 'rejected').length

  function handleOpenRejectModal(business: BusinessRecord) {
    setRejectingBusiness(business)
    setRejectionReason(business.rejection_reason || '')
    setRejectionError(null)
  }

  function handleCloseRejectModal() {
    if (isSubmittingRejection) return
    setRejectingBusiness(null)
    setRejectionReason('')
    setRejectionError(null)
  }

  async function handleConfirmReject() {
    if (!rejectingBusiness) return
    const trimmed = rejectionReason.trim()
    if (!trimmed) {
      setRejectionError('Please provide a specific rejection reason.')
      return
    }

    try {
      setIsSubmittingRejection(true)
      setRejectionError(null)

      if (onRejectBusiness) {
        await onRejectBusiness(rejectingBusiness, trimmed)
      } else {
        await onUpdateVisibility(
          rejectingBusiness,
          { active: false, verified: false, rejection_reason: trimmed },
        )
      }

      setRejectingBusiness(null)
      setRejectionReason('')
    } catch (err) {
      setRejectionError(err instanceof Error ? err.message : 'Failed to reject business.')
    } finally {
      setIsSubmittingRejection(false)
    }
  }

  // ── Filtered + searched list ────────────────────────────────────────────────
  const filteredBusinesses = businesses.filter((b) => {
    const matchesFilter = filter === 'all' || getStatusKey(b) === filter
    const q = search.trim().toLowerCase()
    const matchesSearch =
      !q ||
      b.name.toLowerCase().includes(q) ||
      (b.address ?? '').toLowerCase().includes(q) ||
      (b.email ?? '').toLowerCase().includes(q)
    return matchesFilter && matchesSearch
  })

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="abm-section" aria-busy="true" aria-live="polite">
        <div className="abm-section-header">
          <div className="abm-section-title-wrap">
            <p className="abm-eyebrow">Admin · Moderation</p>
            <h2 className="abm-section-title" id="abm-businesses-heading">
              Business Listings
            </h2>
          </div>
        </div>
        <div className="abm-skeleton-list">
          {[1, 2, 3].map((i) => (
            <div key={i} className="abm-skeleton-card">
              <div className="abm-skeleton-line abm-skeleton-line--title" />
              <div className="abm-skeleton-line abm-skeleton-line--body" />
              <div className="abm-skeleton-line abm-skeleton-line--short" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="abm-section">
        <div className="abm-error-banner" role="alert" aria-live="assertive">
          <span className="abm-error-icon" aria-hidden="true">⚠️</span>
          <div>
            <p className="abm-error-title">Unable to load business submissions</p>
            <p className="abm-error-body">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Empty (no businesses at all) ────────────────────────────────────────────
  if (businesses.length === 0) {
    return (
      <div className="abm-section">
        <div className="abm-section-header">
          <div className="abm-section-title-wrap">
            <p className="abm-eyebrow">Admin · Moderation</p>
            <h2 className="abm-section-title" id="abm-businesses-heading">
              Business Listings
            </h2>
            <p className="abm-section-subtitle">No business submissions yet.</p>
          </div>
        </div>
        <div className="abm-empty-card" role="status">
          <div className="abm-empty-icon" aria-hidden="true">🏢</div>
          <p className="abm-empty-title">No businesses submitted</p>
          <p className="abm-empty-desc">
            New business listings created by owners will appear here for review and approval.
          </p>
        </div>
      </div>
    )
  }

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Business Listings Section ── */}
      <section className="abm-section" aria-labelledby="abm-businesses-heading">
        {/* Section header */}
        <div className="abm-section-header">
          <div className="abm-section-title-wrap">
            <p className="abm-eyebrow">Admin · Moderation</p>
            <h2 className="abm-section-title" id="abm-businesses-heading">
              Business Listings
              <span className="abm-total-badge" aria-label={`${businesses.length} total`}>
                {businesses.length}
              </span>
            </h2>
            <p className="abm-section-subtitle">
              Review, approve, and manage business listings submitted by owners.
            </p>
          </div>

          {/* Summary metric pills */}
          <div className="abm-metrics-row" aria-label="Business counts by status">
            <div className="abm-metric-pill abm-metric-pill--pending">
              <span className="abm-metric-dot" aria-hidden="true" />
              <span className="abm-metric-label">Pending</span>
              <span className="abm-metric-count">{pendingCount}</span>
            </div>
            <div className="abm-metric-pill abm-metric-pill--public">
              <span className="abm-metric-dot" aria-hidden="true" />
              <span className="abm-metric-label">Public</span>
              <span className="abm-metric-count">{publicCount}</span>
            </div>
            <div className="abm-metric-pill abm-metric-pill--unpublished">
              <span className="abm-metric-dot" aria-hidden="true" />
              <span className="abm-metric-label">Unpublished</span>
              <span className="abm-metric-count">{unpublishedCount}</span>
            </div>
            {rejectedCount > 0 && (
              <div className="abm-metric-pill abm-metric-pill--rejected">
                <span className="abm-metric-dot" aria-hidden="true" />
                <span className="abm-metric-label">Rejected</span>
                <span className="abm-metric-count">{rejectedCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Filter + Search toolbar */}
        <div className="abm-toolbar" role="group" aria-label="Filter and search businesses">
          {/* Filter pills */}
          <div className="abm-filter-group" role="group" aria-label="Filter by status">
            {(
              [
                { key: 'all', label: 'All', count: businesses.length },
                { key: 'pending', label: 'Pending', count: pendingCount },
                { key: 'public', label: 'Approved', count: publicCount },
                { key: 'unpublished', label: 'Unpublished', count: unpublishedCount },
                { key: 'rejected', label: 'Rejected', count: rejectedCount },
              ] as { key: FilterKey; label: string; count: number }[]
            ).map(({ key, label, count }) => (
              <button
                key={key}
                type="button"
                className={`abm-filter-btn${filter === key ? ' abm-filter-btn--active' : ''}`}
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
              >
                {label}
                <span className="abm-filter-count">{count}</span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="abm-search-wrap">
            <span className="abm-search-icon" aria-hidden="true">🔍</span>
            <input
              id="abm-search"
              type="search"
              className="abm-search-input"
              placeholder="Search by name, address, email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search businesses"
            />
            {search && (
              <button
                type="button"
                className="abm-search-clear"
                aria-label="Clear search"
                onClick={() => setSearch('')}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Empty filtered state */}
        {filteredBusinesses.length === 0 ? (
          <div className="abm-empty-card" role="status">
            <div className="abm-empty-icon" aria-hidden="true">🔍</div>
            <p className="abm-empty-title">No businesses match this filter</p>
            <p className="abm-empty-desc">
              {search
                ? `No results for "${search}" in the current filter. Try a different search or clear the filter.`
                : `There are no businesses with the selected status.`}
            </p>
          </div>
        ) : (
          <div className="abm-card-list" role="list" aria-label="Business listing cards">
            {filteredBusinesses.map((business) => {
              const statusKey = getStatusKey(business)
              const isLoading = actionLoadingId === business.id
              const isPending = statusKey === 'pending'
              const isPublic = statusKey === 'public'
              const isUnpublished = statusKey === 'unpublished'
              const isRejected = statusKey === 'rejected'

              // Photos belonging to this business that need review
              const bizPhotos = reviewPhotos.filter((p) => p.business_id === business.id)
              const bizVideos = reviewVideos.filter((v) => v.business_id === business.id)
              const pendingMediaCount = bizPhotos.length + bizVideos.length

              return (
                <article
                  key={business.id}
                  className={`abm-biz-card abm-biz-card--${statusKey}`}
                  role="listitem"
                  aria-labelledby={`abm-biz-name-${business.id}`}
                >
                  {/* Card header row */}
                  <div className="abm-biz-card-header">
                    <div className="abm-biz-card-meta">
                      <span className="abm-biz-kind-badge">Business Listing</span>
                      {pendingMediaCount > 0 && (
                        <span className="abm-media-alert-pill" aria-label={`${pendingMediaCount} media items pending review`}>
                          📷 {pendingMediaCount} media pending
                        </span>
                      )}
                    </div>
                    <span className={STATUS_CSS[statusKey]}>
                      <span className={STATUS_DOT[statusKey]} aria-hidden="true" />
                      {STATUS_LABELS[statusKey]}
                    </span>
                  </div>

                  {/* Business name */}
                  <h3
                    id={`abm-biz-name-${business.id}`}
                    className="abm-biz-name"
                  >
                    {business.name}
                  </h3>

                  {/* Business details */}
                  <div className="abm-biz-details">
                    {business.address && (
                      <span className="abm-biz-detail-item">
                        <span aria-hidden="true">📍</span>
                        {business.address}
                        {business.pincode ? ` – ${business.pincode}` : ''}
                      </span>
                    )}
                    {business.phone && (
                      <span className="abm-biz-detail-item">
                        <span aria-hidden="true">📞</span>
                        {business.phone}
                      </span>
                    )}
                    {business.email && (
                      <span className="abm-biz-detail-item">
                        <span aria-hidden="true">✉️</span>
                        {business.email}
                      </span>
                    )}
                    <span className="abm-biz-detail-item abm-biz-date">
                      <span aria-hidden="true">📅</span>
                      Submitted{' '}
                      {new Date(business.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* Rejection feedback callout if present */}
                  {business.rejection_reason && (
                    <div className="abm-rejection-callout" role="note">
                      <div className="abm-rejection-callout-header">
                        <span className="abm-rejection-icon" aria-hidden="true">⚠️</span>
                        <span className="abm-rejection-label">Rejection Reason</span>
                      </div>
                      <p className="abm-rejection-text">{business.rejection_reason}</p>
                    </div>
                  )}

                  {/* Stats row */}
                  <div className="abm-biz-stats">
                    <div className="abm-biz-stat">
                      <span className="abm-biz-stat-label">Rating</span>
                      <span className="abm-biz-stat-val">
                        {business.rating > 0 ? `⭐ ${Number(business.rating).toFixed(1)}` : '—'}
                      </span>
                    </div>
                    <div className="abm-biz-stat">
                      <span className="abm-biz-stat-label">Reviews</span>
                      <span className="abm-biz-stat-val">{business.review_count}</span>
                    </div>
                    <div className="abm-biz-stat">
                      <span className="abm-biz-stat-label">Availability</span>
                      <span className="abm-biz-stat-val" style={{ textTransform: 'capitalize' }}>
                        {business.availability_status}
                      </span>
                    </div>
                  </div>

                  {/* Action footer */}
                  <div className="abm-biz-actions">
                    {/* View link — uses slug for correct routing */}
                    <Link
                      to={`/businesses/${business.slug}`}
                      className="abm-action-btn abm-action-btn--view"
                      aria-label={`View public profile of ${business.name}`}
                    >
                      View listing
                    </Link>

                    {/* PENDING: Approve & Reject */}
                    {isPending && (
                      <>
                        <button
                          type="button"
                          className="abm-action-btn abm-action-btn--approve"
                          disabled={isLoading}
                          aria-label={`Approve and publish ${business.name}`}
                          aria-busy={isLoading}
                          onClick={() =>
                            onUpdateVisibility(
                              business,
                              { active: true, verified: true, rejection_reason: null },
                              'Approve and publish this business?',
                            )
                          }
                        >
                          {isLoading ? (
                            <>
                              <span className="abm-btn-spinner" aria-hidden="true" />
                              Approving…
                            </>
                          ) : (
                            '✓ Approve & publish'
                          )}
                        </button>
                        <button
                          type="button"
                          className="abm-action-btn abm-action-btn--reject"
                          disabled={isLoading}
                          aria-label={`Reject ${business.name}`}
                          onClick={() => handleOpenRejectModal(business)}
                        >
                          ✕ Reject
                        </button>
                      </>
                    )}

                    {/* REJECTED: Can approve or edit rejection reason */}
                    {isRejected && (
                      <>
                        <button
                          type="button"
                          className="abm-action-btn abm-action-btn--approve"
                          disabled={isLoading}
                          aria-label={`Approve and publish ${business.name}`}
                          aria-busy={isLoading}
                          onClick={() =>
                            onUpdateVisibility(
                              business,
                              { active: true, verified: true, rejection_reason: null },
                              'Approve and publish this previously rejected business?',
                            )
                          }
                        >
                          {isLoading ? (
                            <>
                              <span className="abm-btn-spinner" aria-hidden="true" />
                              Approving…
                            </>
                          ) : (
                            '✓ Approve & publish'
                          )}
                        </button>
                        <button
                          type="button"
                          className="abm-action-btn abm-action-btn--reject"
                          disabled={isLoading}
                          aria-label={`Edit rejection reason for ${business.name}`}
                          onClick={() => handleOpenRejectModal(business)}
                        >
                          Edit rejection reason
                        </button>
                      </>
                    )}

                    {/* APPROVED + ACTIVE: Unpublish */}
                    {isPublic && (
                      <button
                        type="button"
                        className="abm-action-btn abm-action-btn--secondary"
                        disabled={isLoading}
                        aria-label={`Unpublish ${business.name}`}
                        aria-busy={isLoading}
                        onClick={() =>
                          onUpdateVisibility(
                            business,
                            { active: false, verified: true },
                            'Unpublish this business?',
                          )
                        }
                      >
                        {isLoading ? 'Updating…' : 'Unpublish'}
                      </button>
                    )}

                    {/* UNPUBLISHED (verified): Re-publish */}
                    {isUnpublished && business.verified && (
                      <button
                        type="button"
                        className="abm-action-btn abm-action-btn--approve"
                        disabled={isLoading}
                        aria-label={`Re-publish ${business.name}`}
                        aria-busy={isLoading}
                        onClick={() =>
                          onUpdateVisibility(
                            business,
                            { active: true, verified: true, rejection_reason: null },
                            'Publish this business?',
                          )
                        }
                      >
                        {isLoading ? 'Updating…' : 'Re-publish'}
                      </button>
                    )}

                    {/* VERIFIED: Revoke approval */}
                    {business.verified && (
                      <button
                        type="button"
                        className="abm-action-btn abm-action-btn--revoke"
                        disabled={isLoading}
                        aria-label={`Revoke verification for ${business.name}`}
                        aria-busy={isLoading}
                        onClick={() =>
                          onUpdateVisibility(
                            business,
                            { active: false, verified: false },
                            'Revoke verification and unpublish this business?',
                          )
                        }
                      >
                        {isLoading ? 'Updating…' : 'Revoke approval'}
                      </button>
                    )}
                  </div>

                  {/* Inline pending media for this business */}
                  {(bizPhotos.length > 0 || bizVideos.length > 0) && (
                    <div className="abm-inline-media">
                      <p className="abm-inline-media-title">
                        Pending media for this listing
                      </p>
                      <div className="abm-inline-media-grid">
                        {bizPhotos.map((photo) => {
                          const photoLoading = actionLoadingId === photo.id
                          return (
                            <div key={photo.id} className="abm-media-thumb">
                              {photo.url ? (
                                <img
                                  src={photo.url}
                                  alt={photo.alt_text || photo.business_name || 'Business photo'}
                                  className="abm-media-thumb-img"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="abm-media-thumb-placeholder">
                                  <span aria-hidden="true">📷</span>
                                </div>
                              )}
                              <div className="abm-media-thumb-footer">
                                <span className="abm-media-thumb-type">Photo</span>
                                <div className="abm-media-thumb-actions">
                                  {photo.moderation_status !== 'approved' && (
                                    <button
                                      type="button"
                                      className="abm-media-action-btn abm-media-action-btn--approve"
                                      disabled={photoLoading}
                                      aria-busy={photoLoading}
                                      aria-label="Approve photo"
                                      onClick={() =>
                                        onUpdatePhotoStatus(
                                          photo,
                                          'approved',
                                          'Approve this photo for public display?',
                                        )
                                      }
                                    >
                                      {photoLoading ? '…' : '✓'}
                                    </button>
                                  )}
                                  {photo.moderation_status !== 'rejected' && (
                                    <button
                                      type="button"
                                      className="abm-media-action-btn abm-media-action-btn--reject"
                                      disabled={photoLoading}
                                      aria-busy={photoLoading}
                                      aria-label="Reject photo"
                                      onClick={() =>
                                        onUpdatePhotoStatus(photo, 'rejected', 'Reject this photo?')
                                      }
                                    >
                                      {photoLoading ? '…' : '✕'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}

                        {bizVideos.map((video) => {
                          const videoLoading = actionLoadingId === video.id
                          return (
                            <div key={video.id} className="abm-media-thumb">
                              {video.url ? (
                                <video
                                  src={video.url}
                                  className="abm-media-thumb-img"
                                  preload="metadata"
                                  playsInline
                                />
                              ) : (
                                <div className="abm-media-thumb-placeholder">
                                  <span aria-hidden="true">🎬</span>
                                </div>
                              )}
                              <div className="abm-media-thumb-footer">
                                <span className="abm-media-thumb-type">
                                  Video{video.is_featured ? ' · Featured' : ''}
                                </span>
                                <div className="abm-media-thumb-actions">
                                  {video.moderation_status !== 'approved' && (
                                    <button
                                      type="button"
                                      className="abm-media-action-btn abm-media-action-btn--approve"
                                      disabled={videoLoading}
                                      aria-busy={videoLoading}
                                      aria-label="Approve video"
                                      onClick={() =>
                                        onUpdateVideoStatus(
                                          video,
                                          'approved',
                                          'Approve this video for public display?',
                                        )
                                      }
                                    >
                                      {videoLoading ? '…' : '✓'}
                                    </button>
                                  )}
                                  {video.moderation_status !== 'rejected' && (
                                    <button
                                      type="button"
                                      className="abm-media-action-btn abm-media-action-btn--reject"
                                      disabled={videoLoading}
                                      aria-busy={videoLoading}
                                      aria-label="Reject video"
                                      onClick={() =>
                                        onUpdateVideoStatus(video, 'rejected', 'Reject this video?')
                                      }
                                    >
                                      {videoLoading ? '…' : '✕'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Standalone photo review (non-business-linked or orphan) ── */}
      {reviewPhotos.filter((p) => !filteredBusinesses.some((b) => b.id === p.business_id)).length > 0 && (
        <section className="abm-section abm-media-section" aria-labelledby="abm-photo-review-heading">
          <div className="abm-section-header">
            <div className="abm-section-title-wrap">
              <p className="abm-eyebrow">Media Moderation</p>
              <h2 className="abm-section-title" id="abm-photo-review-heading">
                Photo Review
                <span className="abm-total-badge">
                  {reviewPhotos.filter((p) => !filteredBusinesses.some((b) => b.id === p.business_id)).length}
                </span>
              </h2>
              <p className="abm-section-subtitle">
                Photos from businesses not visible in the current filter.
              </p>
            </div>
          </div>
          <div className="abm-media-grid" role="list">
            {reviewPhotos
              .filter((p) => !filteredBusinesses.some((b) => b.id === p.business_id))
              .map((photo) => {
                const isLoading = actionLoadingId === photo.id
                return (
                  <article key={photo.id} className="abm-standalone-media-card" role="listitem">
                    <div className="abm-standalone-frame">
                      {photo.url ? (
                        <img
                          src={photo.url}
                          alt={photo.alt_text || photo.business_name || 'Business photo'}
                          className="abm-standalone-img"
                          loading="lazy"
                        />
                      ) : (
                        <div className="abm-standalone-placeholder">
                          <span aria-hidden="true">📷</span>
                          <span>Preview unavailable</span>
                        </div>
                      )}
                    </div>
                    <div className="abm-standalone-meta">
                      <p className="abm-standalone-name">{photo.business_name || 'Business photo'}</p>
                      <span className={`abm-status-badge ${photo.moderation_status === 'rejected' ? 'abm-status-badge--unpublished' : 'abm-status-badge--pending'}`}>
                        <span className={`abm-status-dot ${photo.moderation_status === 'rejected' ? 'abm-status-dot--unpublished' : 'abm-status-dot--pending'}`} aria-hidden="true" />
                        {photo.moderation_status === 'rejected' ? 'Rejected' : 'Pending review'}
                      </span>
                      <div className="abm-standalone-actions">
                        {photo.moderation_status !== 'approved' && (
                          <button
                            type="button"
                            className="abm-action-btn abm-action-btn--approve"
                            disabled={isLoading}
                            aria-busy={isLoading}
                            aria-label="Approve photo"
                            onClick={() =>
                              onUpdatePhotoStatus(photo, 'approved', 'Approve this photo for public display?')
                            }
                          >
                            {isLoading ? 'Updating…' : '✓ Approve'}
                          </button>
                        )}
                        {photo.moderation_status !== 'rejected' && (
                          <button
                            type="button"
                            className="abm-action-btn abm-action-btn--revoke"
                            disabled={isLoading}
                            aria-busy={isLoading}
                            aria-label="Reject photo"
                            onClick={() => onUpdatePhotoStatus(photo, 'rejected', 'Reject this photo?')}
                          >
                            {isLoading ? 'Updating…' : '✕ Reject'}
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}
          </div>
        </section>
      )}

      {/* ── Standalone video review ── */}
      {reviewVideos.filter((v) => !filteredBusinesses.some((b) => b.id === v.business_id)).length > 0 && (
        <section className="abm-section abm-media-section" aria-labelledby="abm-video-review-heading">
          <div className="abm-section-header">
            <div className="abm-section-title-wrap">
              <p className="abm-eyebrow">Media Moderation</p>
              <h2 className="abm-section-title" id="abm-video-review-heading">
                Video Review
                <span className="abm-total-badge">
                  {reviewVideos.filter((v) => !filteredBusinesses.some((b) => b.id === v.business_id)).length}
                </span>
              </h2>
              <p className="abm-section-subtitle">
                Videos from businesses not visible in the current filter.
              </p>
            </div>
          </div>
          <div className="abm-media-grid" role="list">
            {reviewVideos
              .filter((v) => !filteredBusinesses.some((b) => b.id === v.business_id))
              .map((video) => {
                const isLoading = actionLoadingId === video.id
                return (
                  <article key={video.id} className="abm-standalone-media-card" role="listitem">
                    <div className="abm-standalone-frame abm-standalone-frame--video">
                      {video.url ? (
                        <video
                          src={video.url}
                          controls
                          playsInline
                          preload="metadata"
                          className="abm-standalone-video"
                        />
                      ) : (
                        <div className="abm-standalone-placeholder">
                          <span aria-hidden="true">🎬</span>
                          <span>Preview unavailable</span>
                        </div>
                      )}
                    </div>
                    <div className="abm-standalone-meta">
                      <p className="abm-standalone-name">
                        {video.business_name || 'Business video'}
                        {video.is_featured && (
                          <span className="abm-featured-tag">Featured</span>
                        )}
                      </p>
                      <span className={`abm-status-badge ${video.moderation_status === 'rejected' ? 'abm-status-badge--unpublished' : 'abm-status-badge--pending'}`}>
                        <span className={`abm-status-dot ${video.moderation_status === 'rejected' ? 'abm-status-dot--unpublished' : 'abm-status-dot--pending'}`} aria-hidden="true" />
                        {video.moderation_status === 'rejected' ? 'Rejected' : 'Pending review'}
                      </span>
                      <div className="abm-standalone-actions">
                        {video.moderation_status !== 'approved' && (
                          <button
                            type="button"
                            className="abm-action-btn abm-action-btn--approve"
                            disabled={isLoading}
                            aria-busy={isLoading}
                            aria-label="Approve video"
                            onClick={() =>
                              onUpdateVideoStatus(video, 'approved', 'Approve this video for public display?')
                            }
                          >
                            {isLoading ? 'Updating…' : '✓ Approve'}
                          </button>
                        )}
                        {video.moderation_status !== 'rejected' && (
                          <button
                            type="button"
                            className="abm-action-btn abm-action-btn--revoke"
                            disabled={isLoading}
                            aria-busy={isLoading}
                            aria-label="Reject video"
                            onClick={() => onUpdateVideoStatus(video, 'rejected', 'Reject this video?')}
                          >
                            {isLoading ? 'Updating…' : '✕ Reject'}
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}
          </div>
        </section>
      )}

      {/* ── Rejection Modal Dialog ── */}
      {rejectingBusiness && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="abm-reject-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmittingRejection) {
              handleCloseRejectModal()
            }
          }}
        >
          <div className="modal-content abm-reject-modal">
            <div className="modal-header">
              <div>
                <p className="abm-eyebrow" style={{ color: '#dc2626' }}>Moderation Action</p>
                <h3 id="abm-reject-modal-title">Reject Business Listing</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                aria-label="Close dialog"
                disabled={isSubmittingRejection}
                onClick={handleCloseRejectModal}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p className="abm-modal-target-info">
                You are rejecting <strong>{rejectingBusiness.name}</strong>.
                Please provide a specific reason explaining why this listing cannot be published. The business owner will receive this feedback to make corrections.
              </p>

              {/* Preset suggestion chips */}
              <div className="abm-preset-reasons-wrap">
                <p className="abm-preset-reasons-label">Quick Suggestions:</p>
                <div className="abm-preset-tags">
                  {PRESET_REASONS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className="abm-preset-tag"
                      disabled={isSubmittingRejection}
                      onClick={() => {
                        setRejectionReason(preset)
                        setRejectionError(null)
                      }}
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="abm-form-field">
                <label htmlFor="abm-rejection-reason" className="abm-form-label">
                  Rejection Reason <span className="abm-form-required" aria-hidden="true">*</span>
                </label>
                <textarea
                  id="abm-rejection-reason"
                  rows={4}
                  className={`abm-textarea ${rejectionError ? 'abm-textarea--error' : ''}`}
                  placeholder="Explain why this listing was rejected (e.g., incomplete address, unreachable phone number, unverifiable local business)..."
                  value={rejectionReason}
                  disabled={isSubmittingRejection}
                  onChange={(e) => {
                    setRejectionReason(e.target.value)
                    if (rejectionError && e.target.value.trim().length > 0) {
                      setRejectionError(null)
                    }
                  }}
                  required
                  autoFocus
                />
                {rejectionError && (
                  <p className="abm-field-error" role="alert">
                    {rejectionError}
                  </p>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="abm-action-btn abm-action-btn--secondary"
                disabled={isSubmittingRejection}
                onClick={handleCloseRejectModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="abm-action-btn abm-action-btn--reject-confirm"
                disabled={isSubmittingRejection}
                aria-busy={isSubmittingRejection}
                onClick={handleConfirmReject}
              >
                {isSubmittingRejection ? (
                  <>
                    <span className="abm-btn-spinner" aria-hidden="true" />
                    Saving Rejection…
                  </>
                ) : (
                  '✕ Confirm Rejection'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
