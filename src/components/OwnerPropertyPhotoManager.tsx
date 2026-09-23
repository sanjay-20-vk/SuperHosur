import { useState } from 'react'
import {
  ALLOWED_PROPERTY_PHOTO_TYPES,
  MAX_PROPERTY_PHOTO_BYTES,
  MAX_PROPERTY_PHOTOS,
  deletePropertyPhoto,
  getPropertyErrorMessage,
  setPropertyPrimaryPhoto,
  uploadPropertyPhoto,
  validatePropertyPhotoFile,
  type PropertyPhotoWithUrl,
} from '../services/properties'

type OwnerPropertyPhotoManagerProps = {
  propertyId: string
  photos: PropertyPhotoWithUrl[]
  uploading: boolean
  error: string | null
  onError: (message: string | null) => void
  onPhotosChange: (photos: PropertyPhotoWithUrl[]) => void
  onUploadingChange: (uploading: boolean) => void
}

function moderationLabel(status: PropertyPhotoWithUrl['moderation_status']): string {
  if (status === 'approved') return 'Approved'
  if (status === 'rejected') return 'Rejected'
  return 'Pending review'
}

export function OwnerPropertyPhotoManager({
  propertyId,
  photos,
  uploading,
  error,
  onError,
  onPhotosChange,
  onUploadingChange,
}: OwnerPropertyPhotoManagerProps) {
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [settingPrimaryId, setSettingPrimaryId] = useState<string | null>(null)

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    const validationError = validatePropertyPhotoFile(file)
    if (validationError) {
      onError(validationError)
      return
    }

    try {
      onUploadingChange(true)
      onError(null)
      const newPhoto = await uploadPropertyPhoto(propertyId, file)
      onPhotosChange([...photos, newPhoto])
    } catch (uploadError) {
      onError(getPropertyErrorMessage(uploadError, 'Unable to upload this photo.'))
    } finally {
      onUploadingChange(false)
    }
  }

  async function handleRemove(photo: PropertyPhotoWithUrl) {
    if (!window.confirm('Remove this photo from your property listing?')) {
      return
    }

    try {
      setRemovingId(photo.id)
      onError(null)
      await deletePropertyPhoto(photo)
      onPhotosChange(photos.filter((item) => item.id !== photo.id))
    } catch (deleteError) {
      onError(getPropertyErrorMessage(deleteError, 'Unable to remove this photo.'))
    } finally {
      setRemovingId(null)
    }
  }

  async function handleSetPrimary(photo: PropertyPhotoWithUrl) {
    try {
      setSettingPrimaryId(photo.id)
      onError(null)
      await setPropertyPrimaryPhoto(propertyId, photo.id)
      onPhotosChange(
        photos.map((item) => ({
          ...item,
          is_primary: item.id === photo.id,
        })),
      )
    } catch (primaryError) {
      onError(getPropertyErrorMessage(primaryError, 'Unable to set primary photo.'))
    } finally {
      setSettingPrimaryId(null)
    }
  }

  return (
    <section className="photo-manager" id="property-photos" aria-labelledby="property-photo-manager-title">
      <div className="section-header">
        <div>
          <p className="eyebrow">Property Gallery</p>
          <h2 id="property-photo-manager-title">Property photos</h2>
          <p className="supply-intro">
            Uploaded photos stay in review until approved by an administrator.
            Only approved photos appear on public property listings.
          </p>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="photo-upload-row">
        <input
          type="file"
          accept={ALLOWED_PROPERTY_PHOTO_TYPES.join(',')}
          onChange={handleFileChange}
          disabled={uploading || photos.length >= MAX_PROPERTY_PHOTOS}
          aria-label="Upload a property photo"
        />
        <p className="photo-upload-hint">
          JPEG, PNG, or WebP. Max {Math.round(MAX_PROPERTY_PHOTO_BYTES / (1024 * 1024))} MB.
          {uploading ? ' Uploading…' : ` ${photos.length}/${MAX_PROPERTY_PHOTOS} used.`}
        </p>
      </div>

      {photos.length === 0 && (
        <div className="state-panel empty-state">
          <h3>No photos yet</h3>
          <p>Add photos to showcase your property to prospective buyers or tenants.</p>
        </div>
      )}

      {photos.length > 0 && (
        <div className="photo-manager-grid">
          {photos.map((photo) => (
            <article key={photo.id} className="photo-manager-card">
              <div className="photo-frame">
                {photo.url ? (
                  <img src={photo.url} alt="Property listing photo" />
                ) : (
                  <div className="photo-fallback">Preview unavailable</div>
                )}
              </div>
              <div className="photo-manager-meta">
                <span className={photo.moderation_status === 'approved' ? 'status-badge verified' : 'status-badge'}>
                  {moderationLabel(photo.moderation_status)}
                </span>
                {photo.is_primary ? (
                  <span className="status-badge" style={{ background: '#17614d', color: '#fff' }}>
                    Primary
                  </span>
                ) : (
                  <button
                    type="button"
                    className="nav-link"
                    style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                    onClick={() => handleSetPrimary(photo)}
                    disabled={settingPrimaryId === photo.id || uploading}
                  >
                    {settingPrimaryId === photo.id ? 'Setting…' : 'Make Cover'}
                  </button>
                )}
                <button
                  type="button"
                  className="nav-link danger-button"
                  style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                  onClick={() => handleRemove(photo)}
                  disabled={removingId === photo.id || uploading}
                >
                  {removingId === photo.id ? 'Removing…' : 'Remove'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
