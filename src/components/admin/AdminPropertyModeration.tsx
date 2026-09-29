import { useState } from 'react'
import { Link } from 'react-router-dom'
import type {
  AdminPropertyPhoto,
  PropertyModerationUpdate,
  PropertySummary,
} from '../../services/properties'
import type {
  BulkModerationAction,
  BulkModerationResponse,
} from '../../services/businesses'

export interface AdminPropertyModerationProps {
  properties: PropertySummary[]
  reviewPhotos: AdminPropertyPhoto[]
  loading: boolean
  error: string | null
  actionId: string | null
  filter: 'all' | 'pending' | 'verified' | 'rejected' | 'inactive'
  onFilterChange: (filter: 'all' | 'pending' | 'verified' | 'rejected' | 'inactive') => void
  onUpdateStatus: (
    prop: PropertySummary,
    input: PropertyModerationUpdate,
    confirmMessage?: string,
  ) => Promise<void>
  onRejectProperty?: (
    prop: PropertySummary,
    rejectionReason: string,
  ) => Promise<void>
  onUpdatePhotoStatus: (
    photo: AdminPropertyPhoto,
    status: 'approved' | 'rejected',
    confirmMessage: string,
  ) => Promise<void>
  onBulkModerate?: (
    propertyIds: string[],
    action: BulkModerationAction,
    reason?: string,
  ) => Promise<BulkModerationResponse>
}

const PRESET_PROPERTY_REASONS = [
  'Missing or unverified address in Hosur',
  'Unclear ownership or lack of property documentation',
  'Inaccurate or unrealistic pricing / rental terms',
  'Duplicate property listing already on SuperHosur',
  'Poor quality, watermarked, or misleading photos',
  'Unreachable contact details / invalid owner phone',
]

function getPropertyStatusKey(prop: PropertySummary): 'public' | 'pending' | 'rejected' | 'unpublished' {
  if (prop.active && prop.verified) return 'public'
  if (!prop.verified && Boolean(prop.rejection_reason)) return 'rejected'
  if (prop.active && !prop.verified) return 'pending'
  return 'unpublished'
}

export function AdminPropertyModeration({
  properties,
  reviewPhotos,
  loading,
  error,
  actionId,
  filter,
  onFilterChange,
  onUpdateStatus,
  onRejectProperty,
  onUpdatePhotoStatus,
  onBulkModerate,
}: AdminPropertyModerationProps) {
  const [rejectingProperty, setRejectingProperty] = useState<PropertySummary | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejectionError, setRejectionError] = useState<string | null>(null)
  const [isSubmittingRejection, setIsSubmittingRejection] = useState(false)

  // ── Bulk moderation state ───────────────────────────────────────────────────
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<Set<string>>(new Set())
  const [isBulkRejectionOpen, setIsBulkRejectionOpen] = useState(false)
  const [bulkRejectionReason, setBulkRejectionReason] = useState('')
  const [bulkRejectionError, setBulkRejectionError] = useState<string | null>(null)
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [bulkResultResponse, setBulkResultResponse] = useState<BulkModerationResponse | null>(null)

  function handleOpenRejectModal(prop: PropertySummary) {
    setRejectingProperty(prop)
    setRejectionReason(prop.rejection_reason || '')
    setRejectionError(null)
  }

  function handleCloseRejectModal() {
    if (isSubmittingRejection) return
    setRejectingProperty(null)
    setRejectionReason('')
    setRejectionError(null)
  }

  async function handleConfirmReject() {
    if (!rejectingProperty) return
    const trimmed = rejectionReason.trim()
    if (!trimmed) {
      setRejectionError('Please provide a specific rejection reason.')
      return
    }

    try {
      setIsSubmittingRejection(true)
      setRejectionError(null)

      if (onRejectProperty) {
        await onRejectProperty(rejectingProperty, trimmed)
      } else {
        await onUpdateStatus(
          rejectingProperty,
          { active: false, verified: false, rejection_reason: trimmed },
        )
      }

      setRejectingProperty(null)
      setRejectionReason('')
    } catch (err) {
      setRejectionError(err instanceof Error ? err.message : 'Failed to reject property listing.')
    } finally {
      setIsSubmittingRejection(false)
    }
  }

  const pendingCount = properties.filter((p) => getPropertyStatusKey(p) === 'pending').length
  const publicCount = properties.filter((p) => getPropertyStatusKey(p) === 'public').length
  const rejectedCount = properties.filter((p) => getPropertyStatusKey(p) === 'rejected').length
  const unpublishedCount = properties.filter((p) => getPropertyStatusKey(p) === 'unpublished').length

  const filteredProperties = properties.filter((p) => {
    const status = getPropertyStatusKey(p)
    if (filter === 'pending') return status === 'pending'
    if (filter === 'verified') return status === 'public'
    if (filter === 'rejected') return status === 'rejected'
    if (filter === 'inactive') return status === 'unpublished'
    return true
  })

  function toggleSelectProperty(id: string) {
    setSelectedPropertyIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const allVisibleSelected =
    filteredProperties.length > 0 &&
    filteredProperties.every((p) => selectedPropertyIds.has(p.id))

  function handleToggleSelectAllVisible() {
    if (allVisibleSelected) {
      setSelectedPropertyIds(new Set())
    } else {
      setSelectedPropertyIds(new Set(filteredProperties.map((p) => p.id)))
    }
  }

  async function handleBulkAction(action: BulkModerationAction, reason?: string) {
    if (!onBulkModerate || selectedPropertyIds.size === 0) return

    if (action === 'reject') {
      const trimmed = (reason ?? bulkRejectionReason).trim()
      if (!trimmed || trimmed.length < 5) {
        setBulkRejectionError('Please provide a rejection reason of at least 5 characters.')
        return
      }
    } else {
      const confirmLabels: Record<string, string> = {
        approve: `Approve and verify ${selectedPropertyIds.size} property listing(s)?`,
        suspend: `Suspend and unpublish ${selectedPropertyIds.size} property listing(s)?`,
        restore: `Restore and publish ${selectedPropertyIds.size} property listing(s)?`,
      }
      if (!window.confirm(confirmLabels[action] || `Execute bulk ${action}?`)) {
        return
      }
    }

    try {
      setBulkActionLoading(true)
      setBulkRejectionError(null)
      const ids = Array.from(selectedPropertyIds)
      const res = await onBulkModerate(ids, action, reason ?? bulkRejectionReason)
      setBulkResultResponse(res)
      setSelectedPropertyIds(new Set())
      setIsBulkRejectionOpen(false)
      setBulkRejectionReason('')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Bulk property moderation failed.')
    } finally {
      setBulkActionLoading(false)
    }
  }

  return (
    <div className="taxonomy-management">
      <div className="section-header" style={{ marginBottom: '20px' }}>
        <div>
          <p className="eyebrow">Property Verification & Photos</p>
          <h2>Real Estate Moderation</h2>
          <p className="supply-intro">
            Review submitted properties. Approved and active properties become publicly visible in the marketplace.
          </p>
        </div>
      </div>

      {loading && (
        <div className="state-panel">
          <p>Loading properties…</p>
        </div>
      )}

      {!loading && error && (
        <div className="state-panel error-state">
          <h3>Property review error</h3>
          <p>{error}</p>
        </div>
      )}

      {/* Photo Moderation Queue for Properties */}
      {!loading && reviewPhotos.length > 0 && (
        <section className="photo-manager" style={{ marginBottom: '32px' }}>
          <div className="section-header">
            <div>
              <p className="eyebrow">Moderation Queue</p>
              <h2>Property Photos for Review ({reviewPhotos.length})</h2>
            </div>
          </div>

          <div className="photo-manager-grid">
            {reviewPhotos.map((photo) => {
              const isActionLoading = actionId === photo.id

              return (
                <article key={photo.id} className="photo-manager-card">
                  <div className="photo-frame">
                    {photo.url ? (
                      <img src={photo.url} alt={photo.property_title || 'Property photo'} />
                    ) : (
                      <div className="photo-fallback">Preview unavailable</div>
                    )}
                  </div>
                  <div className="photo-manager-meta">
                    <strong>{photo.property_title || 'Property photo'}</strong>
                    <span className="status-badge">
                      {photo.moderation_status === 'rejected' ? 'Rejected' : 'Pending review'}
                    </span>
                    {photo.is_primary && <span className="status-badge">Primary</span>}
                    {photo.moderation_status !== 'approved' && (
                      <button
                        type="button"
                        className="primary-button inline-button"
                        disabled={isActionLoading}
                        onClick={() =>
                          onUpdatePhotoStatus(
                            photo,
                            'approved',
                            'Approve this property photo for public display?',
                          )
                        }
                      >
                        {isActionLoading ? 'Updating…' : 'Approve photo'}
                      </button>
                    )}
                    {photo.moderation_status !== 'rejected' && (
                      <button
                        type="button"
                        className="nav-link danger-button"
                        disabled={isActionLoading}
                        onClick={() =>
                          onUpdatePhotoStatus(photo, 'rejected', 'Reject this property photo?')
                        }
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}

      {/* Filter Pills */}
      <div className="category-grid" role="group" aria-label="Property filter" style={{ marginBottom: '20px' }}>
        <button
          type="button"
          className={filter === 'pending' ? 'category-pill active' : 'category-pill'}
          onClick={() => onFilterChange('pending')}
        >
          Pending Verification ({pendingCount})
        </button>
        <button
          type="button"
          className={filter === 'all' ? 'category-pill active' : 'category-pill'}
          onClick={() => onFilterChange('all')}
        >
          All Properties ({properties.length})
        </button>
        <button
          type="button"
          className={filter === 'verified' ? 'category-pill active' : 'category-pill'}
          onClick={() => onFilterChange('verified')}
        >
          Verified ({publicCount})
        </button>
        <button
          type="button"
          className={filter === 'rejected' ? 'category-pill active' : 'category-pill'}
          onClick={() => onFilterChange('rejected')}
        >
          Rejected ({rejectedCount})
        </button>
        <button
          type="button"
          className={filter === 'inactive' ? 'category-pill active' : 'category-pill'}
          onClick={() => onFilterChange('inactive')}
        >
          Inactive / Unpublished ({unpublishedCount})
        </button>
      </div>

      {/* Bulk Moderation Result Banner */}
      {bulkResultResponse && (
        <div
          className={`abm-bulk-result-banner ${bulkResultResponse.failed_count > 0 ? 'abm-bulk-result-banner--warning' : 'abm-bulk-result-banner--success'}`}
          role="alert"
        >
          <div className="abm-bulk-result-header">
            <strong>
              {bulkResultResponse.failed_count > 0
                ? `Bulk moderation completed with ${bulkResultResponse.failed_count} failure(s): ${bulkResultResponse.succeeded_count} succeeded, ${bulkResultResponse.failed_count} failed.`
                : `Bulk moderation completed successfully! ${bulkResultResponse.succeeded_count} property listing(s) updated.`}
            </strong>
            <button
              type="button"
              className="abm-bulk-result-close"
              onClick={() => setBulkResultResponse(null)}
              aria-label="Dismiss bulk result"
            >
              ✕
            </button>
          </div>
          {bulkResultResponse.failed_count > 0 && (
            <ul className="abm-bulk-failure-list">
              {bulkResultResponse.results
                .filter((r) => !r.success)
                .map((item) => (
                  <li key={item.id}>
                    <strong>{item.title}</strong>: {item.error}
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}

      {/* Bulk Moderation Action Bar */}
      {onBulkModerate && filteredProperties.length > 0 && (
        <div className="abm-bulk-bar" role="toolbar" aria-label="Bulk property moderation actions">
          <div className="abm-bulk-select-group">
            <label className="abm-bulk-checkbox-label">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={handleToggleSelectAllVisible}
                aria-label="Select all visible properties"
              />
              <span>Select All Visible ({filteredProperties.length})</span>
            </label>
            {selectedPropertyIds.size > 0 && (
              <span className="abm-bulk-counter-pill">
                {selectedPropertyIds.size} selected
              </span>
            )}
          </div>

          {selectedPropertyIds.size > 0 && (
            <div className="abm-bulk-actions">
              <button
                type="button"
                className="abm-bulk-btn abm-bulk-btn--approve"
                disabled={bulkActionLoading}
                onClick={() => void handleBulkAction('approve')}
              >
                ✓ Bulk Approve ({selectedPropertyIds.size})
              </button>
              <button
                type="button"
                className="abm-bulk-btn abm-bulk-btn--reject"
                disabled={bulkActionLoading}
                onClick={() => {
                  setBulkRejectionError(null)
                  setIsBulkRejectionOpen(true)
                }}
              >
                ✕ Bulk Reject ({selectedPropertyIds.size})
              </button>
              <button
                type="button"
                className="abm-bulk-btn abm-bulk-btn--suspend"
                disabled={bulkActionLoading}
                onClick={() => void handleBulkAction('suspend')}
              >
                ⏸ Bulk Suspend
              </button>
              <button
                type="button"
                className="abm-bulk-btn abm-bulk-btn--restore"
                disabled={bulkActionLoading}
                onClick={() => void handleBulkAction('restore')}
              >
                ↺ Bulk Restore
              </button>
              <button
                type="button"
                className="abm-bulk-btn abm-bulk-btn--clear"
                disabled={bulkActionLoading}
                onClick={() => setSelectedPropertyIds(new Set())}
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}

      {/* Properties List */}
      {!loading && (
        <div className="table-responsive">
          <div className="admin-business-list">
            {filteredProperties.length === 0 ? (
              <div className="state-panel empty-state">
                <p>No properties match the selected filter.</p>
              </div>
            ) : (
              filteredProperties.map((prop) => {
                const isActionLoading = actionId === prop.id
                const status = getPropertyStatusKey(prop)

                const priceLabel =
                  prop.listing_type === 'rent'
                    ? `₹${Number(prop.rent).toLocaleString('en-IN')}/mo`
                    : prop.listing_type === 'lease'
                    ? `₹${Number(prop.rent ?? prop.price).toLocaleString('en-IN')} lease`
                    : `₹${Number(prop.price).toLocaleString('en-IN')}`

                return (
                  <article
                    key={prop.id}
                    className={`owner-business-card admin-business-card ${
                      status === 'rejected' ? 'abm-biz-card--rejected' : ''
                    }`}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        {onBulkModerate && (
                          <label className="abm-checkbox-label" style={{ marginRight: '6px' }}>
                            <input
                              type="checkbox"
                              checked={selectedPropertyIds.has(prop.id)}
                              onChange={() => toggleSelectProperty(prop.id)}
                              aria-label={`Select ${prop.title}`}
                            />
                          </label>
                        )}
                        <p className="owner-card-label" style={{ margin: 0 }}>
                          {prop.property_type.toUpperCase()} • {prop.listing_type.toUpperCase()}
                        </p>
                      </div>
                      <h3>{prop.title}</h3>
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', margin: '6px 0', fontSize: '0.9rem' }}>
                        {prop.bedrooms !== null && <span><strong>{prop.bedrooms}</strong> BHK</span>}
                        {prop.area_sqft !== null && <span><strong>{prop.area_sqft}</strong> sq.ft</span>}
                        <span style={{ color: '#17614d', fontWeight: 600 }}>{priceLabel}</span>
                        <span>{prop.cities?.name || 'Hosur'}</span>
                        {prop.profiles?.full_name && (
                          <span style={{ color: 'rgba(23,63,58,0.7)' }}>Owner: {prop.profiles.full_name}</span>
                        )}
                      </div>

                      {/* Status Badges */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                        {status === 'public' && (
                          <span className="status-badge verified">✓ Public</span>
                        )}
                        {status === 'pending' && (
                          <span className="status-badge status-quoted">⏳ Awaiting verification</span>
                        )}
                        {status === 'rejected' && (
                          <span className="status-badge status-cancelled">⚠️ Rejected</span>
                        )}
                        {status === 'unpublished' && (
                          <span className="status-badge">🔒 Unpublished</span>
                        )}
                      </div>

                      {/* Rejection Reason Display for Admin */}
                      {prop.rejection_reason && (
                        <div className="abm-rejection-callout" role="note" style={{ marginTop: '10px' }}>
                          <span className="abm-rejection-label">
                            {status === 'rejected' ? 'Current Rejection Reason:' : 'Previous Rejection Note:'}
                          </span>
                          <p className="abm-rejection-text">{prop.rejection_reason}</p>
                        </div>
                      )}
                    </div>

                    <div className="owner-business-actions">
                      <Link to={`/properties/${prop.id}`} className="nav-link" aria-label={`View ${prop.title}`}>
                        View
                      </Link>

                      {/* 1. Rejected State: Allow Approve & Publish or Edit Rejection */}
                      {status === 'rejected' && (
                        <>
                          <button
                            type="button"
                            className="primary-button inline-button"
                            disabled={isActionLoading}
                            onClick={() =>
                              onUpdateStatus(
                                prop,
                                { verified: true, active: true, rejection_reason: null },
                                'Approve and publish this previously rejected property listing?',
                              )
                            }
                          >
                            {isActionLoading ? 'Updating…' : 'Approve & publish'}
                          </button>
                          <button
                            type="button"
                            className="nav-link danger-button"
                            disabled={isActionLoading}
                            onClick={() => handleOpenRejectModal(prop)}
                          >
                            Update reason
                          </button>
                        </>
                      )}

                      {/* 2. Pending State: Approve or Reject */}
                      {status === 'pending' && (
                        <>
                          <button
                            type="button"
                            className="primary-button inline-button"
                            disabled={isActionLoading}
                            onClick={() =>
                              onUpdateStatus(
                                prop,
                                { verified: true, active: true, rejection_reason: null },
                                'Approve and publish this property listing?',
                              )
                            }
                          >
                            {isActionLoading ? 'Updating…' : 'Approve & publish'}
                          </button>
                          <button
                            type="button"
                            className="nav-link danger-button"
                            disabled={isActionLoading}
                            onClick={() => handleOpenRejectModal(prop)}
                          >
                            ✕ Reject
                          </button>
                        </>
                      )}

                      {/* 3. Verified & Public State: Unpublish, Reject, or Revoke */}
                      {status === 'public' && (
                        <>
                          <button
                            type="button"
                            className="nav-link"
                            disabled={isActionLoading}
                            onClick={() =>
                              onUpdateStatus(
                                prop,
                                { active: false, verified: true },
                                'Unpublish this property listing?',
                              )
                            }
                          >
                            Unpublish
                          </button>
                          <button
                            type="button"
                            className="nav-link danger-button"
                            disabled={isActionLoading}
                            onClick={() => handleOpenRejectModal(prop)}
                          >
                            ✕ Reject
                          </button>
                          <button
                            type="button"
                            className="nav-link danger-button"
                            disabled={isActionLoading}
                            onClick={() =>
                              onUpdateStatus(
                                prop,
                                { verified: false, active: false, rejection_reason: null },
                                'Revoke verification for this property?',
                              )
                            }
                          >
                            Revoke approval
                          </button>
                        </>
                      )}

                      {/* 4. Unpublished State: Publish, Reject, or Revoke */}
                      {status === 'unpublished' && (
                        <>
                          <button
                            type="button"
                            className="primary-button inline-button"
                            disabled={isActionLoading}
                            onClick={() =>
                              onUpdateStatus(
                                prop,
                                { active: true, verified: true, rejection_reason: null },
                                'Publish this property listing?',
                              )
                            }
                          >
                            Publish
                          </button>
                          <button
                            type="button"
                            className="nav-link danger-button"
                            disabled={isActionLoading}
                            onClick={() => handleOpenRejectModal(prop)}
                          >
                            ✕ Reject
                          </button>
                          <button
                            type="button"
                            className="nav-link danger-button"
                            disabled={isActionLoading}
                            onClick={() =>
                              onUpdateStatus(
                                prop,
                                { verified: false, active: false, rejection_reason: null },
                                'Revoke verification for this property?',
                              )
                            }
                          >
                            Revoke approval
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Property Rejection Modal */}
      {rejectingProperty && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="property-reject-modal-title"
          onClick={handleCloseRejectModal}
        >
          <div
            className="modal-dialog abm-reject-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '540px' }}
          >
            <div className="modal-header">
              <div>
                <p className="abm-eyebrow" style={{ color: '#b91c1c' }}>Action Required</p>
                <h3 id="property-reject-modal-title" style={{ margin: 0 }}>
                  Reject Property Listing
                </h3>
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

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569' }}>
                Please provide a specific reason explaining why <strong>&ldquo;{rejectingProperty.title}&rdquo;</strong> is being rejected. This explanation will be delivered to the property owner so they can correct their listing.
              </p>

              {/* Preset suggestion chips */}
              <div className="abm-preset-group">
                <span className="abm-preset-label">Quick Suggestion Tags:</span>
                <div className="abm-preset-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {PRESET_PROPERTY_REASONS.map((preset) => (
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
                <label htmlFor="property-rejection-reason" className="abm-form-label">
                  Rejection Reason <span className="abm-form-required" aria-hidden="true">*</span>
                </label>
                <textarea
                  id="property-rejection-reason"
                  rows={4}
                  className={`abm-textarea ${rejectionError ? 'abm-textarea--error' : ''}`}
                  placeholder="Explain why this property listing was rejected (e.g. invalid location, unverifiable contact details, misleading images)..."
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
                  <p className="abm-field-error" role="alert" style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: '4px' }}>
                    {rejectionError}
                  </p>
                )}
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
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
                className="primary-button inline-button danger-button"
                disabled={isSubmittingRejection}
                aria-busy={isSubmittingRejection}
                onClick={handleConfirmReject}
              >
                {isSubmittingRejection ? 'Saving Rejection…' : '✕ Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Property Rejection Modal */}
      {isBulkRejectionOpen && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-prop-reject-title"
          onClick={() => {
            if (!bulkActionLoading) {
              setIsBulkRejectionOpen(false)
              setBulkRejectionError(null)
            }
          }}
        >
          <div
            className="modal-dialog abm-reject-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '540px' }}
          >
            <div className="modal-header">
              <div>
                <p className="abm-eyebrow" style={{ color: '#b91c1c' }}>Bulk Administrative Action</p>
                <h3 id="bulk-prop-reject-title" style={{ margin: 0 }}>
                  Reject {selectedPropertyIds.size} Selected Property Listing(s)
                </h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                aria-label="Close dialog"
                disabled={bulkActionLoading}
                onClick={() => {
                  setIsBulkRejectionOpen(false)
                  setBulkRejectionError(null)
                }}
              >
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569' }}>
                Please provide a rejection reason. This message will be recorded in the audit log and delivered to the property owners of all {selectedPropertyIds.size} selected listings.
              </p>

              <div className="abm-preset-group">
                <span className="abm-preset-label">Quick Suggestion Tags:</span>
                <div className="abm-preset-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {PRESET_PROPERTY_REASONS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className="abm-preset-tag"
                      disabled={bulkActionLoading}
                      onClick={() => {
                        setBulkRejectionReason(preset)
                        setBulkRejectionError(null)
                      }}
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="abm-form-field">
                <label htmlFor="bulk-prop-rejection-reason" className="abm-form-label">
                  Rejection Reason <span className="abm-form-required" aria-hidden="true">*</span>
                </label>
                <textarea
                  id="bulk-prop-rejection-reason"
                  rows={4}
                  className={`abm-textarea ${bulkRejectionError ? 'abm-textarea--error' : ''}`}
                  placeholder="Explain why these property listings were rejected (minimum 5 characters)..."
                  value={bulkRejectionReason}
                  disabled={bulkActionLoading}
                  onChange={(e) => {
                    setBulkRejectionReason(e.target.value)
                    if (bulkRejectionError && e.target.value.trim().length >= 5) {
                      setBulkRejectionError(null)
                    }
                  }}
                  required
                  autoFocus
                />
                {bulkRejectionError && (
                  <p className="abm-field-error" role="alert" style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: '4px' }}>
                    {bulkRejectionError}
                  </p>
                )}
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="abm-action-btn abm-action-btn--secondary"
                disabled={bulkActionLoading}
                onClick={() => {
                  setIsBulkRejectionOpen(false)
                  setBulkRejectionError(null)
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-button inline-button danger-button"
                disabled={bulkActionLoading}
                aria-busy={bulkActionLoading}
                onClick={() => void handleBulkAction('reject', bulkRejectionReason)}
              >
                {bulkActionLoading ? 'Executing Bulk Rejection…' : `✕ Confirm Bulk Reject (${selectedPropertyIds.size})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
