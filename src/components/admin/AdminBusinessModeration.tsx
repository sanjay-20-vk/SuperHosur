import { Link } from 'react-router-dom'
import type { BusinessRecord } from '../../services/businesses'
import type { AdminBusinessPhoto } from '../../services/photos'
import type { AdminBusinessVideo } from '../../services/videos'

function getVisibilityLabel(business: BusinessRecord): string {
  if (!business.active) return 'Unpublished'
  if (!business.verified) return 'Awaiting verification'
  return 'Public'
}

export interface AdminBusinessModerationProps {
  businesses: BusinessRecord[]
  reviewPhotos: AdminBusinessPhoto[]
  reviewVideos: AdminBusinessVideo[]
  loading: boolean
  error: string | null
  actionLoadingId: string | null
  onUpdateVisibility: (
    business: BusinessRecord,
    input: { active: boolean; verified: boolean },
    confirmation: string,
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

export function AdminBusinessModeration({
  businesses,
  reviewPhotos,
  reviewVideos,
  loading,
  error,
  actionLoadingId,
  onUpdateVisibility,
  onUpdatePhotoStatus,
  onUpdateVideoStatus,
}: AdminBusinessModerationProps) {
  if (loading) {
    return (
      <div className="state-panel">
        <p>Loading business submissions…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="state-panel error-state">
        <h3>Unable to load business submissions</h3>
        <p>{error}</p>
      </div>
    )
  }

  if (businesses.length === 0) {
    return (
      <div className="state-panel empty-state">
        <h3>No business submissions</h3>
        <p>New business listings will appear here for review.</p>
      </div>
    )
  }

  return (
    <>
      <div className="table-responsive">
        <div className="admin-business-list">
          {businesses.map((business) => {
            const visibilityLabel = getVisibilityLabel(business)
            const isLoading = actionLoadingId === business.id

            return (
              <article key={business.id} className="owner-business-card admin-business-card">
                <div>
                  <p className="owner-card-label">Business</p>
                  <h3>{business.name}</h3>
                  <span
                    className={
                      visibilityLabel === 'Public' ? 'status-badge verified' : 'status-badge'
                    }
                  >
                    {visibilityLabel}
                  </span>
                </div>
                <div className="owner-business-actions">
                  <Link to={`/businesses/${business.id}`} className="nav-link">
                    View
                  </Link>
                  {!business.verified && (
                    <button
                      type="button"
                      className="primary-button inline-button"
                      disabled={isLoading}
                      onClick={() =>
                        onUpdateVisibility(
                          business,
                          { active: true, verified: true },
                          'Approve and publish this business?',
                        )
                      }
                    >
                      {isLoading ? 'Updating…' : 'Approve & publish'}
                    </button>
                  )}
                  {business.verified && business.active && (
                    <button
                      type="button"
                      className="nav-link"
                      disabled={isLoading}
                      onClick={() =>
                        onUpdateVisibility(
                          business,
                          { active: false, verified: true },
                          'Unpublish this business?',
                        )
                      }
                    >
                      Unpublish
                    </button>
                  )}
                  {business.verified && !business.active && (
                    <button
                      type="button"
                      className="nav-link"
                      disabled={isLoading}
                      onClick={() =>
                        onUpdateVisibility(
                          business,
                          { active: true, verified: true },
                          'Publish this business?',
                        )
                      }
                    >
                      Publish
                    </button>
                  )}
                  {business.verified && (
                    <button
                      type="button"
                      className="nav-link danger-button"
                      disabled={isLoading}
                      onClick={() =>
                        onUpdateVisibility(
                          business,
                          { active: false, verified: false },
                          'Revoke verification and unpublish this business?',
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

      {reviewPhotos.length > 0 && (
        <section className="photo-manager admin-photo-review" aria-labelledby="photo-review-title">
          <div className="section-header">
            <div>
              <p className="eyebrow">Moderation</p>
              <h2 id="photo-review-title">Photo review</h2>
            </div>
          </div>
          <div className="photo-manager-grid">
            {reviewPhotos.map((photo) => {
              const isLoading = actionLoadingId === photo.id

              return (
                <article key={photo.id} className="photo-manager-card">
                  <div className="photo-frame">
                    {photo.url ? (
                      <img
                        src={photo.url}
                        alt={photo.alt_text || photo.business_name || 'Business photo'}
                      />
                    ) : (
                      <div className="photo-fallback">Preview unavailable</div>
                    )}
                  </div>
                  <div className="photo-manager-meta">
                    <strong>{photo.business_name || 'Business photo'}</strong>
                    <span className="status-badge">
                      {photo.moderation_status === 'rejected' ? 'Rejected' : 'Pending review'}
                    </span>
                    {photo.moderation_status !== 'approved' && (
                      <button
                        type="button"
                        className="primary-button inline-button"
                        disabled={isLoading}
                        onClick={() =>
                          onUpdatePhotoStatus(photo, 'approved', 'Approve this photo for public display?')
                        }
                      >
                        {isLoading ? 'Updating…' : 'Approve photo'}
                      </button>
                    )}
                    {photo.moderation_status !== 'rejected' && (
                      <button
                        type="button"
                        className="nav-link danger-button"
                        disabled={isLoading}
                        onClick={() => onUpdatePhotoStatus(photo, 'rejected', 'Reject this photo?')}
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

      {reviewVideos.length > 0 && (
        <section className="photo-manager admin-video-review" aria-labelledby="video-review-title">
          <div className="section-header">
            <div>
              <p className="eyebrow">Moderation</p>
              <h2 id="video-review-title">Video review</h2>
            </div>
          </div>
          <div className="photo-manager-grid">
            {reviewVideos.map((video) => {
              const isLoading = actionLoadingId === video.id

              return (
                <article key={video.id} className="photo-manager-card">
                  <div
                    className="photo-frame"
                    style={{
                      background: '#000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {video.url ? (
                      <video
                        src={video.url}
                        controls
                        playsInline
                        preload="metadata"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <div className="photo-fallback">Preview unavailable</div>
                    )}
                  </div>
                  <div className="photo-manager-meta">
                    <strong>{video.business_name || 'Business video'}</strong>
                    <span className="status-badge">
                      {video.moderation_status === 'rejected' ? 'Rejected' : 'Pending review'}
                    </span>
                    {video.is_featured && <span className="status-badge">Featured</span>}
                    {video.moderation_status !== 'approved' && (
                      <button
                        type="button"
                        className="primary-button inline-button"
                        disabled={isLoading}
                        onClick={() =>
                          onUpdateVideoStatus(video, 'approved', 'Approve this video for public display?')
                        }
                      >
                        {isLoading ? 'Updating…' : 'Approve video'}
                      </button>
                    )}
                    {video.moderation_status !== 'rejected' && (
                      <button
                        type="button"
                        className="nav-link danger-button"
                        disabled={isLoading}
                        onClick={() => onUpdateVideoStatus(video, 'rejected', 'Reject this video?')}
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
    </>
  )
}
