import { useRef, useState } from 'react'
import {
  ALLOWED_BUSINESS_VIDEO_TYPES,
  MAX_BUSINESS_VIDEO_BYTES,
  MAX_BUSINESS_VIDEOS,
  deleteBusinessVideo,
  getVideoErrorMessage,
  setFeaturedBusinessVideo,
  uploadBusinessVideo,
  validateBusinessVideoFile,
  type BusinessVideoWithUrl,
} from '../services/videos'

type OwnerVideoManagerProps = {
  videos: BusinessVideoWithUrl[]
  uploading: boolean
  error: string | null
  onError: (message: string | null) => void
  onVideosChange: (videos: BusinessVideoWithUrl[]) => void
  onUploadingChange: (uploading: boolean) => void
  businessId: string
}

function moderationLabel(status: BusinessVideoWithUrl['moderation_status']): string {
  if (status === 'approved') return 'Approved'
  if (status === 'rejected') return 'Rejected'
  return 'Pending review'
}

function moderationClass(status: BusinessVideoWithUrl['moderation_status']): string {
  if (status === 'approved') return 'media-badge media-badge--approved'
  if (status === 'rejected') return 'media-badge media-badge--rejected'
  return 'media-badge media-badge--pending'
}

function formatDuration(seconds: number | null): string | null {
  if (!seconds || seconds <= 0) return null
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function OwnerVideoManager({
  videos,
  uploading,
  error,
  onError,
  onVideosChange,
  onUploadingChange,
  businessId,
}: OwnerVideoManagerProps) {
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [featuringId, setFeaturingId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const atLimit = videos.length >= MAX_BUSINESS_VIDEOS
  const maxMB = Math.round(MAX_BUSINESS_VIDEO_BYTES / (1024 * 1024))
  const isWorking = uploading || removingId !== null || featuringId !== null

  async function processFile(file: File) {
    const validationError = validateBusinessVideoFile(file)
    if (validationError) {
      onError(validationError)
      return
    }
    try {
      onUploadingChange(true)
      onError(null)
      const isFirst = videos.length === 0
      const video = await uploadBusinessVideo(businessId, file, { isFeatured: isFirst })
      onVideosChange([video, ...videos])
    } catch (uploadError) {
      onError(getVideoErrorMessage(uploadError, 'Unable to upload this video.'))
    } finally {
      onUploadingChange(false)
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) await processFile(file)
  }

  async function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setDragOver(false)
    if (uploading || atLimit) return
    const file = event.dataTransfer.files?.[0]
    if (file) await processFile(file)
  }

  async function handleRemove(video: BusinessVideoWithUrl) {
    if (!window.confirm('Remove this video from your listing?')) return
    try {
      setRemovingId(video.id)
      onError(null)
      await deleteBusinessVideo(video)
      onVideosChange(videos.filter((item) => item.id !== video.id))
    } catch (deleteError) {
      onError(getVideoErrorMessage(deleteError, 'Unable to remove this video.'))
    } finally {
      setRemovingId(null)
    }
  }

  async function handleSetFeatured(video: BusinessVideoWithUrl) {
    try {
      setFeaturingId(video.id)
      onError(null)
      await setFeaturedBusinessVideo(businessId, video.id)
      onVideosChange(
        videos.map((item) => ({
          ...item,
          is_featured: item.id === video.id,
        })),
      )
    } catch (err) {
      onError(getVideoErrorMessage(err, 'Unable to set featured video.'))
    } finally {
      setFeaturingId(null)
    }
  }

  return (
    <section className="media-manager-section" id="videos" aria-labelledby="video-manager-title">
      {/* ── Section header ── */}
      <div className="media-manager-header">
        <div className="media-manager-header-copy">
          <p className="eyebrow">Listing Media</p>
          <h2 id="video-manager-title" className="media-manager-heading">Business Videos</h2>
          <p className="media-manager-desc">
            Give customers a real look at your work, team, and premises.
            Videos are reviewed before they appear publicly.
          </p>
        </div>
        <div
          className="media-manager-count-badge"
          aria-label={`${videos.length} of ${MAX_BUSINESS_VIDEOS} videos used`}
        >
          <span className="media-count-num">{videos.length}</span>
          <span className="media-count-sep">/</span>
          <span className="media-count-max">{MAX_BUSINESS_VIDEOS}</span>
          <span className="media-count-label">Videos</span>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="media-error-banner" role="alert" aria-live="assertive">
          <span className="media-error-icon" aria-hidden="true">⚠</span>
          <p>{error}</p>
          <button
            type="button"
            className="media-error-dismiss-btn"
            onClick={() => onError(null)}
            aria-label="Dismiss error"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              padding: '2px 6px',
              marginLeft: 'auto',
              fontSize: '1rem',
              lineHeight: 1,
              borderRadius: '4px',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Upload zone ── */}
      <label
        className={`media-upload-zone${atLimit ? ' media-upload-zone--disabled' : ''}${dragOver ? ' media-upload-zone--drag-over' : ''}${uploading ? ' media-upload-zone--uploading' : ''}`}
        htmlFor="video-file-input"
        tabIndex={atLimit || uploading ? -1 : 0}
        role={atLimit || uploading ? undefined : 'button'}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !atLimit && !uploading) {
            e.preventDefault()
            fileInputRef.current?.click()
          }
        }}
        onDragOver={(e) => {
          e.preventDefault()
          if (!atLimit && !uploading) setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        aria-disabled={atLimit || uploading}
      >
        <input
          id="video-file-input"
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_BUSINESS_VIDEO_TYPES.join(',')}
          onChange={handleFileChange}
          disabled={uploading || atLimit}
          aria-label="Upload a business video"
          className="media-upload-input"
        />
        <div className="media-upload-icon" aria-hidden="true">
          {uploading ? (
            <span className="media-upload-spinner" />
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" />
            </svg>
          )}
        </div>
        <div className="media-upload-text">
          {atLimit ? (
            <span className="media-upload-primary">Video limit reached ({MAX_BUSINESS_VIDEOS}/{MAX_BUSINESS_VIDEOS})</span>
          ) : uploading ? (
            <span className="media-upload-primary" role="status" aria-live="polite">Uploading video…</span>
          ) : (
            <>
              <span className="media-upload-primary">
                Click to upload{dragOver ? ' — drop it here' : ''} <span className="media-upload-or">or drag &amp; drop</span>
              </span>
              <span className="media-upload-hint">
                MP4, WebM, OGG, or MOV · max {maxMB} MB · {videos.length}/{MAX_BUSINESS_VIDEOS} used
              </span>
            </>
          )}
        </div>
      </label>

      {/* ── Empty state ── */}
      {videos.length === 0 && !uploading && (
        <div className="media-empty-panel" role="status">
          <div className="media-empty-icon" aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" />
            </svg>
          </div>
          <h3 className="media-empty-heading">No business videos yet</h3>
          <p className="media-empty-desc">
            Add a video clip to showcase your products, services, or premises to customers.
            The first video you upload becomes your featured video.
          </p>
          <button
            type="button"
            className="secondary-button media-empty-cta"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            Add First Video
          </button>
        </div>
      )}

      {/* ── Video list ── */}
      {(videos.length > 0 || uploading) && (
        <div className="media-video-list" role="list" aria-label="Business videos">
          {/* Skeleton card during upload */}
          {uploading && (
            <article
              className="media-video-card media-video-card--uploading"
              role="listitem"
              aria-label="Uploading new video"
              aria-busy="true"
            >
              <div
                className="media-video-frame"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: 'var(--color-primary-50)',
                  minHeight: '160px',
                }}
              >
                <span className="media-upload-spinner" aria-hidden="true" />
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary)', fontWeight: 'var(--font-weight-medium)' }}>
                  Uploading video…
                </span>
              </div>
              <div className="media-video-footer">
                <div className="media-video-badges">
                  <span className="media-badge media-badge--pending">Uploading</span>
                </div>
              </div>
            </article>
          )}

          {videos.map((video) => {
            const duration = formatDuration(video.duration_seconds)
            return (
              <article
                key={video.id}
                className={`media-video-card${video.is_featured ? ' media-video-card--featured' : ''}`}
                role="listitem"
                aria-label={video.is_featured ? 'Featured video' : 'Business video'}
              >
                {/* Video preview */}
                <div className="media-video-frame">
                  {video.url ? (
                    <video
                      src={video.url}
                      controls
                      preload="metadata"
                      playsInline
                      className="media-video-player"
                      aria-label={video.is_featured ? 'Featured business video' : 'Business video'}
                    />
                  ) : (
                    <div className="media-video-fallback" aria-label="Video preview unavailable">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polygon points="23 7 16 12 23 17 23 7" />
                        <rect x="1" y="5" width="15" height="14" rx="2" />
                      </svg>
                      <span>Preview unavailable</span>
                    </div>
                  )}

                  {/* Featured ribbon */}
                  {video.is_featured && (
                    <div className="media-video-featured-ribbon" aria-hidden="true">
                      ★ Featured
                    </div>
                  )}

                  {/* Duration pill */}
                  {duration && (
                    <div className="media-video-duration" aria-label={`Duration: ${duration}`}>
                      {duration}
                    </div>
                  )}
                </div>

                {/* Card footer */}
                <div className="media-video-footer">
                  <div className="media-video-badges">
                    <span className={moderationClass(video.moderation_status)}>
                      {moderationLabel(video.moderation_status)}
                    </span>
                    {video.is_featured && (
                      <span className="media-badge media-badge--featured">Featured</span>
                    )}
                  </div>

                  <div className="media-video-actions">
                    {!video.is_featured && (
                      <button
                        type="button"
                        className="media-feature-btn"
                        onClick={() => handleSetFeatured(video)}
                        disabled={featuringId === video.id || isWorking}
                        aria-label={featuringId === video.id ? 'Setting as featured…' : 'Set as featured video'}
                        aria-busy={featuringId === video.id}
                      >
                        {featuringId === video.id ? (
                          <><span className="media-btn-spinner" aria-hidden="true" /> Setting…</>
                        ) : (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                            Make Featured
                          </>
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      className="media-delete-btn"
                      onClick={() => handleRemove(video)}
                      disabled={removingId === video.id || isWorking}
                      aria-label={removingId === video.id ? 'Removing video…' : 'Remove this video'}
                      aria-busy={removingId === video.id}
                    >
                      {removingId === video.id ? (
                        <><span className="media-btn-spinner" aria-hidden="true" /> Removing…</>
                      ) : (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4h6v2" />
                          </svg>
                          Remove
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
