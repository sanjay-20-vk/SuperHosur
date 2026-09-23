import { Link } from 'react-router-dom'
import type { AdminPropertyPhoto, PropertySummary } from '../../services/properties'

export interface AdminPropertyModerationProps {
  properties: PropertySummary[]
  reviewPhotos: AdminPropertyPhoto[]
  loading: boolean
  error: string | null
  actionId: string | null
  filter: 'all' | 'pending' | 'verified' | 'inactive'
  onFilterChange: (filter: 'all' | 'pending' | 'verified' | 'inactive') => void
  onUpdateStatus: (
    prop: PropertySummary,
    input: { active?: boolean; verified?: boolean },
    confirmMessage: string,
  ) => Promise<void>
  onUpdatePhotoStatus: (
    photo: AdminPropertyPhoto,
    status: 'approved' | 'rejected',
    confirmMessage: string,
  ) => Promise<void>
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
  onUpdatePhotoStatus,
}: AdminPropertyModerationProps) {
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
          Pending Verification ({properties.filter((p) => !p.verified).length})
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
          Verified ({properties.filter((p) => p.verified && p.active).length})
        </button>
        <button
          type="button"
          className={filter === 'inactive' ? 'category-pill active' : 'category-pill'}
          onClick={() => onFilterChange('inactive')}
        >
          Inactive / Unpublished ({properties.filter((p) => !p.active).length})
        </button>
      </div>

      {/* Properties List */}
      {!loading && (
        <div className="table-responsive">
          <div className="admin-business-list">
            {properties
              .filter((p) => {
                if (filter === 'pending') return !p.verified
                if (filter === 'verified') return p.verified && p.active
                if (filter === 'inactive') return !p.active
                return true
              })
              .map((prop) => {
                const isActionLoading = actionId === prop.id
                const statusBadge =
                  !prop.active
                    ? 'Unpublished'
                    : !prop.verified
                    ? 'Awaiting verification'
                    : 'Public'

                const priceLabel =
                  prop.listing_type === 'rent'
                    ? `₹${Number(prop.rent).toLocaleString('en-IN')}/mo`
                    : prop.listing_type === 'lease'
                    ? `₹${Number(prop.rent ?? prop.price).toLocaleString('en-IN')} lease`
                    : `₹${Number(prop.price).toLocaleString('en-IN')}`

                return (
                  <article key={prop.id} className="owner-business-card admin-business-card">
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
                      <span className={statusBadge === 'Public' ? 'status-badge verified' : 'status-badge'}>
                        {statusBadge}
                      </span>
                    </div>

                    <div className="owner-business-actions">
                      <Link to={`/properties/${prop.id}`} className="nav-link">
                        View
                      </Link>
                      {!prop.verified && (
                        <button
                          type="button"
                          className="primary-button inline-button"
                          disabled={isActionLoading}
                          onClick={() =>
                            onUpdateStatus(
                              prop,
                              { verified: true, active: true },
                              'Approve and publish this property listing?',
                            )
                          }
                        >
                          {isActionLoading ? 'Updating…' : 'Approve & publish'}
                        </button>
                      )}
                      {prop.verified && prop.active && (
                        <button
                          type="button"
                          className="nav-link"
                          disabled={isActionLoading}
                          onClick={() =>
                            onUpdateStatus(
                              prop,
                              { active: false },
                              'Unpublish this property listing?',
                            )
                          }
                        >
                          Unpublish
                        </button>
                      )}
                      {prop.verified && !prop.active && (
                        <button
                          type="button"
                          className="primary-button inline-button"
                          disabled={isActionLoading}
                          onClick={() =>
                            onUpdateStatus(
                              prop,
                              { active: true },
                              'Publish this property listing?',
                            )
                          }
                        >
                          Publish
                        </button>
                      )}
                      {prop.verified && (
                        <button
                          type="button"
                          className="nav-link danger-button"
                          disabled={isActionLoading}
                          onClick={() =>
                            onUpdateStatus(
                              prop,
                              { verified: false, active: false },
                              'Revoke verification for this property?',
                            )
                          }
                        >
                          Revoke approval
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
  )
}
