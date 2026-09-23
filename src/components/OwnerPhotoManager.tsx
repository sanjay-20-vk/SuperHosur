import { useRef, useState } from 'react'
import {
  ALLOWED_BUSINESS_PHOTO_TYPES,
  MAX_BUSINESS_PHOTO_BYTES,
  MAX_BUSINESS_PHOTOS,
  deleteBusinessPhoto,
  getPhotoErrorMessage,
  uploadBusinessPhoto,
  validateBusinessPhotoFile,
  type BusinessPhotoWithUrl,
} from '../services/photos'

type OwnerPhotoManagerProps = {
  photos: BusinessPhotoWithUrl[]
  uploading: boolean
  error: string | null
  onError: (message: string | null) => void
  onPhotosChange: (photos: BusinessPhotoWithUrl[]) => void
  onUploadingChange: (uploading: boolean) => void
  businessId: string
}

function moderationLabel(status: BusinessPhotoWithUrl['moderation_status']): string {
  if (status === 'approved') return 'Approved'
  if (status === 'rejected') return 'Rejected'
  return 'Pending review'
}

function moderationClass(status: BusinessPhotoWithUrl['moderation_status']): string {
  if (status === 'approved') return 'media-badge media-badge--approved'
  if (status === 'rejected') return 'media-badge media-badge--rejected'
  return 'media-badge media-badge--pending'
}

export function OwnerPhotoManager({
  photos,
  uploading,
  error,
  onError,
  onPhotosChange,
  onUploadingChange,
  businessId,
}: OwnerPhotoManagerProps) {
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const atLimit = photos.length >= MAX_BUSINESS_PHOTOS
  const maxMB = Math.round(MAX_BUSINESS_PHOTO_BYTES / (1024 * 1024))

  async function processFile(file: File) {
    const validationError = validateBusinessPhotoFile(file)
    if (validationError) {
      onError(validationError)
      return
    }
    try {
      onUploadingChange(true)
      onError(null)
      const photo = await uploadBusinessPhoto(businessId, file)
      onPhotosChange([...photos, photo])
    } catch (uploadError) {
      onError(getPhotoErrorMessage(uploadError, 'Unable to upload this photo.'))
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

  async function handleRemove(photo: BusinessPhotoWithUrl) {
    if (!window.confirm('Remove this photo from your listing?')) return
    try {
      setRemovingId(photo.id)
      onError(null)
      await deleteBusinessPhoto(photo)
      onPhotosChange(photos.filter((item) => item.id !== photo.id))
    } catch (deleteError) {
      onError(getPhotoErrorMessage(deleteError, 'Unable to remove this photo.'))
    } finally {
      setRemovingId(null)
    }
  }

  const isWorking = uploading || removingId !== null

  return (
    <section className="media-manager-section" id="photos" aria-labelledby="photo-manager-title">
      {/* ── Section header ── */}
      <div className="media-manager-header">
        <div className="media-manager-header-copy">
          <p className="eyebrow">Listing Media</p>
          <h2 id="photo-manager-title" className="media-manager-heading">Business Photos</h2>
          <p className="media-manager-desc">
            Show customers what makes your business worth choosing.
            Uploaded photos are reviewed before they appear publicly.
          </p>
        </div>
        <div
          className="media-manager-count-badge"
          aria-label={`${photos.length} of ${MAX_BUSINESS_PHOTOS} photos used`}
        >
          <span className="media-count-num">{photos.length}</span>
          <span className="media-count-sep">/</span>
          <span className="media-count-max">{MAX_BUSINESS_PHOTOS}</span>
          <span className="media-count-label">Photos</span>
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
        htmlFor="photo-file-input"
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
          id="photo-file-input"
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_BUSINESS_PHOTO_TYPES.join(',')}
          onChange={handleFileChange}
          disabled={uploading || atLimit}
          aria-label="Upload a business photo"
          className="media-upload-input"
        />
        <div className="media-upload-icon" aria-hidden="true">
          {uploading ? (
            <span className="media-upload-spinner" />
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          )}
        </div>
        <div className="media-upload-text">
          {atLimit ? (
            <span className="media-upload-primary">Photo limit reached ({MAX_BUSINESS_PHOTOS}/{MAX_BUSINESS_PHOTOS})</span>
          ) : uploading ? (
            <span className="media-upload-primary" role="status" aria-live="polite">Uploading photo…</span>
          ) : (
            <>
              <span className="media-upload-primary">
                Click to upload{dragOver ? ' — drop it here' : ''} <span className="media-upload-or">or drag &amp; drop</span>
              </span>
              <span className="media-upload-hint">
                JPEG, PNG, or WebP · max {maxMB} MB · {photos.length}/{MAX_BUSINESS_PHOTOS} used
              </span>
            </>
          )}
        </div>
      </label>

      {/* ── Empty state ── */}
      {photos.length === 0 && !uploading && (
        <div className="media-empty-panel" role="status">
          <div className="media-empty-icon" aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
          <h3 className="media-empty-heading">No business photos yet</h3>
          <p className="media-empty-desc">
            Add photos to help customers get a better feel for your business —
            your storefront, workspace, team, and products.
          </p>
          <button
            type="button"
            className="secondary-button media-empty-cta"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            Add First Photo
          </button>
        </div>
      )}

      {/* ── Photo grid ── */}
      {(photos.length > 0 || uploading) && (
        <div className="media-photo-grid" role="list" aria-label="Business photos">
          {photos.map((photo) => (
            <article
              key={photo.id}
              className="media-photo-card"
              role="listitem"
              aria-label={photo.alt_text ? `Photo: ${photo.alt_text}` : 'Business photo'}
            >
              {/* Photo preview */}
              <div className="media-photo-frame">
                {photo.url ? (
                  <img
                    src={photo.url}
                    alt={photo.alt_text || 'Business photo'}
                    loading="lazy"
                    className="media-photo-img"
                  />
                ) : (
                  <div className="media-photo-fallback" aria-label="Preview unavailable">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                      <rect x="3" y="3" width="18" height="18" rx="3" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <span>Preview unavailable</span>
                  </div>
                )}
                {/* Primary badge overlay */}
                {photo.is_primary && (
                  <div className="media-photo-primary-badge" aria-label="Primary photo">
                    ★ Primary
                  </div>
                )}
              </div>

              {/* Card footer */}
              <div className="media-photo-footer">
                <span className={moderationClass(photo.moderation_status)}>
                  {moderationLabel(photo.moderation_status)}
                </span>
                <button
                  type="button"
                  className="media-delete-btn"
                  onClick={() => handleRemove(photo)}
                  disabled={removingId === photo.id || isWorking}
                  aria-label={removingId === photo.id ? 'Removing photo…' : `Remove photo${photo.alt_text ? `: ${photo.alt_text}` : ''}`}
                  aria-busy={removingId === photo.id}
                >
                  {removingId === photo.id ? (
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
            </article>
          ))}

          {/* Skeleton card during upload */}
          {uploading && (
            <div
              className="media-photo-card media-photo-card--uploading"
              role="listitem"
              aria-label="Uploading new photo"
              aria-busy="true"
            >
              <div
                className="media-photo-frame"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: 'var(--color-primary-50)',
                }}
              >
                <span className="media-upload-spinner" aria-hidden="true" />
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary)', fontWeight: 'var(--font-weight-medium)' }}>
                  Uploading…
                </span>
              </div>
              <div className="media-photo-footer">
                <span className="media-badge media-badge--pending">Uploading</span>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
