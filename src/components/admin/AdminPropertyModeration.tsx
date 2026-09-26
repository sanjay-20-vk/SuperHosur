import { useState } from 'react'
import { Link } from 'react-router-dom'
import type {
  AdminPropertyPhoto,
  PropertyModerationUpdate,
  PropertySummary,
} from '../../services/properties'

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
}: AdminPropertyModerationProps) {
  const [rejectingProperty, setRejectingProperty] = useState<PropertySummary | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejectionError, setRejectionError] = useState<string | null>(null)
  const [isSubmittingRejection, setIsSubmittingRejection] = useState(false)

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
                      <p className="owner-card-label">
                        {prop.property_type.toUpperCase()} • {prop.listing_type.toUpperCase()}
                      </p>
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
    </div>
  )
}
