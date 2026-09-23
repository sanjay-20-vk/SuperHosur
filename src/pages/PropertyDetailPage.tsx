import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Header } from '../components/Header'
import { LoadingState } from '../components/LoadingState'
import { HosurMap } from '../components/HosurMap'
import { getCurrentSession } from '../services/auth'
import {
  getApprovedPropertyPhotos,
  getPropertyById,
  getPropertyOwnerContact,
  type PropertyPhotoWithUrl,
  type PropertyRecord,
} from '../services/properties'

function formatCurrency(amount: number | null): string {
  if (amount === null || isNaN(amount)) return 'Price on request'
  return `₹${amount.toLocaleString('en-IN')}`
}

function formatListingType(type: string): string {
  if (type === 'sale') return 'For Sale'
  if (type === 'rent') return 'For Rent'
  if (type === 'lease') return 'For Lease'
  return type
}

function formatPropertyType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1)
}

export function PropertyDetailPage() {
  const { propertyId } = useParams()
  const [property, setProperty] = useState<PropertyRecord | null>(null)
  const [photos, setPhotos] = useState<PropertyPhotoWithUrl[]>([])
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ownerContact, setOwnerContact] = useState<{
    full_name: string | null
    phone: string | null
  } | null>(null)

  useEffect(() => {
    async function loadProperty() {
      if (!propertyId) {
        setError('Property not found.')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const [session, propData, photoRows] = await Promise.all([
          getCurrentSession(),
          getPropertyById(propertyId),
          getApprovedPropertyPhotos(propertyId),
        ])

        setProperty(propData)
        setPhotos(photoRows)
        setActivePhotoId(photoRows.find((p) => p.is_primary)?.id ?? photoRows[0]?.id ?? null)
        setIsOwner(Boolean(session?.user?.id && session.user.id === propData.owner_id))

        // Fetch owner contact via SECURITY DEFINER RPC so that the profiles
        // table needs no new RLS policy. Fails silently (null) on any error.
        const contact = await getPropertyOwnerContact(propertyId)
        setOwnerContact(contact)
      } catch (err) {
        if (
          typeof err === 'object' &&
          err !== null &&
          'code' in err &&
          ((err as { code: string }).code === 'PGRST116' || (err as { code: string }).code === '22P02')
        ) {
          setError('This property does not exist or is not currently available.')
        } else {
          setError(err instanceof Error ? err.message : 'Unable to load property.')
        }
      } finally {
        setLoading(false)
      }
    }

    loadProperty()
  }, [propertyId])

  if (loading) {
    return (
      <>
        <Header />
        <div className="page-section state-panel" style={{ marginTop: '32px' }}>
          <LoadingState message="Loading property details..." />
        </div>
      </>
    )
  }

  if (error || !property) {
    return (
      <>
        <Header />
        <section className="page-section">
          <div className="state-panel error-state" role="alert" style={{ marginTop: '32px' }}>
            <h3>Property unavailable</h3>
            <p>{error || 'This property could not be found.'}</p>
            <div style={{ marginTop: '16px' }}>
              <Link to="/properties" className="primary-button hero-button">
                Back to properties
              </Link>
            </div>
          </div>
        </section>
      </>
    )
  }

  const locationLabel = [property.address?.trim(), property.cities?.name].filter(Boolean).join(', ')
  const mapQuery =
    property.latitude !== null && property.longitude !== null
      ? `${property.latitude},${property.longitude}`
      : locationLabel
  const mapUrl = mapQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`
    : null

  const visiblePhotos = photos.filter((p) => p.url)
  const activePhoto = visiblePhotos.find((p) => p.id === activePhotoId) ?? visiblePhotos[0] ?? null

  const listingLabel = formatListingType(property.listing_type)
  const propertyTypeLabel = formatPropertyType(property.property_type)

  const ownerPhone = ownerContact?.phone?.trim()
  const ownerName = ownerContact?.full_name?.trim() || 'Property Owner'

  const whatsappNumber = ownerPhone?.replace(/\D/g, '')

  return (
    <>
      <Header />

      <main className="business-detail-container">
        {/* Breadcrumb & Navigation Bar */}
        <div className="business-breadcrumb-bar">
          <Link to="/properties" className="business-back-link">
            <span>←</span> Back to properties
          </Link>

          {isOwner && (
            <Link
              to={`/owner/properties/${property.id}/edit`}
              className="secondary-button"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              ✏️ Edit property
            </Link>
          )}
        </div>

        {/* 1. Property Detail Hero (Identity, Type & Quick Status) */}
        <section className="business-hero" aria-labelledby="property-title">
          <div className="business-hero-top">
            <div className="hero-pill-badge" style={{ margin: 0 }}>
              <span className="pulse-dot" aria-hidden="true" />
              <span>{listingLabel} • {propertyTypeLabel}</span>
            </div>
            {property.cities?.name && (
              <span className="location-pill" style={{ textTransform: 'none' }}>
                📍 {property.cities.name}
              </span>
            )}
          </div>

          <h1 id="property-title" className="business-hero-title">{property.title}</h1>

          <p className="business-hero-location">
            <span>📍</span> {locationLabel || 'Hosur, Tamil Nadu'}
          </p>

          <div className="business-hero-badges" aria-label="Property attributes and status">
            <span className={property.verified ? 'status-badge verified' : 'status-badge'}>
              {property.verified ? '✓ Verified property' : 'Verification pending'}
            </span>
            <span className="status-badge">{propertyTypeLabel}</span>
            <span className="status-badge">{listingLabel}</span>
            {property.bedrooms !== null && (
              <span className="status-badge" style={{ background: 'rgba(23, 89, 77, 0.08)', color: 'var(--color-primary-dark)' }}>
                🛏️ {property.bedrooms} BHK
              </span>
            )}
            {property.bathrooms !== null && (
              <span className="status-badge" style={{ background: 'rgba(23, 89, 77, 0.08)', color: 'var(--color-primary-dark)' }}>
                🚿 {property.bathrooms} Baths
              </span>
            )}
            {property.area_sqft !== null && (
              <span className="status-badge" style={{ background: 'rgba(23, 89, 77, 0.08)', color: 'var(--color-primary-dark)' }}>
                📐 {property.area_sqft} sq.ft
              </span>
            )}
            {!property.active && <span className="status-badge inactive">Inactive</span>}
          </div>

          {/* Quick Mobile Contact Action Row (Handheld devices) */}
          {ownerPhone && (
            <div className="business-mobile-actions">
              <a
                className="contact-button-primary"
                href={`tel:${ownerPhone}`}
                style={{ minHeight: '44px', padding: '10px 14px', fontSize: '0.875rem' }}
              >
                📞 Call Owner
              </a>
              {whatsappNumber && (
                <a
                  className="contact-button-whatsapp"
                  href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hi, I am interested in your property "${property.title}" on SuperHosur.`)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ minHeight: '44px', padding: '10px 14px', fontSize: '0.875rem' }}
                >
                  💬 WhatsApp
                </a>
              )}
            </div>
          )}
        </section>

        {/* Main Content Layout: Main Column + Sticky Inquiry Sidebar */}
        <div className="business-detail-layout">
          {/* Main Column */}
          <div className="business-detail-main">
            {/* 2. Property Price & Key Details Highlight Box */}
            <section className="business-section-card" aria-label="Key specifications">
              <div className="property-pricing-box">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span className="business-spec-label">
                    {property.listing_type === 'rent'
                      ? 'Monthly Rental'
                      : property.listing_type === 'lease'
                      ? 'Lease Amount'
                      : 'Estimated Sale Price'}
                  </span>
                  <div className="property-price-val">
                    {property.listing_type === 'rent'
                      ? formatCurrency(property.rent)
                      : property.listing_type === 'lease'
                      ? formatCurrency(property.rent ?? property.price)
                      : formatCurrency(property.price)}
                    {property.listing_type === 'rent' && (
                      <span className="property-price-period"> / month</span>
                    )}
                    {property.listing_type === 'lease' && (
                      <span className="property-price-period"> lease</span>
                    )}
                  </div>
                  {property.deposit !== null && (
                    <p style={{ margin: '6px 0 0', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                      Security Deposit: <strong style={{ color: 'var(--color-text-main)' }}>{formatCurrency(property.deposit)}</strong>
                    </p>
                  )}
                </div>

                {property.area_sqft !== null && (
                  <div style={{ textAlign: 'right', minWidth: '100px' }}>
                    <span className="business-spec-label">Built-up Area</span>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text-main)', marginTop: '2px' }}>
                      {property.area_sqft} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>sq.ft</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Specification Grid */}
              <div className="business-spec-grid" style={{ marginTop: '20px' }}>
                <div className="business-spec-item">
                  <span className="business-spec-label">Property Type</span>
                  <span className="business-spec-value">{propertyTypeLabel}</span>
                </div>
                <div className="business-spec-item">
                  <span className="business-spec-label">Listing Type</span>
                  <span className="business-spec-value">{listingLabel}</span>
                </div>
                {property.bedrooms !== null && (
                  <div className="business-spec-item">
                    <span className="business-spec-label">Bedrooms</span>
                    <span className="business-spec-value">{property.bedrooms} BHK</span>
                  </div>
                )}
                {property.bathrooms !== null && (
                  <div className="business-spec-item">
                    <span className="business-spec-label">Bathrooms</span>
                    <span className="business-spec-value">{property.bathrooms} Baths</span>
                  </div>
                )}
                {property.area_sqft !== null && (
                  <div className="business-spec-item">
                    <span className="business-spec-label">Area (sq.ft)</span>
                    <span className="business-spec-value">{property.area_sqft} sq.ft</span>
                  </div>
                )}
                <div className="business-spec-item">
                  <span className="business-spec-label">City</span>
                  <span className="business-spec-value">{property.cities?.name || 'Hosur'}</span>
                </div>
              </div>
            </section>

            {/* 3. Property Photos / Media Gallery */}
            <section className="business-section-card" aria-label="Property photos">
              <p className="eyebrow">Property Gallery</p>
              <h2 className="business-section-title">Photos</h2>

              {activePhoto ? (
                <div>
                  <div className="business-media-frame">
                    <img src={activePhoto.url ?? ''} alt={property.title} loading="eager" />
                  </div>
                  {visiblePhotos.length > 1 && (
                    <div className="business-gallery__thumbs" role="list" aria-label="Property photo thumbnails">
                      {visiblePhotos.map((photo) => (
                        <button
                          type="button"
                          key={photo.id}
                          className={photo.id === activePhoto.id ? 'photo-thumb active' : 'photo-thumb'}
                          onClick={() => setActivePhotoId(photo.id)}
                          aria-label="Show property photo"
                          aria-pressed={photo.id === activePhoto.id}
                        >
                          <img src={photo.url ?? ''} alt="" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="business-media-fallback" style={{ aspectRatio: '16 / 7' }}>
                  <div className="business-fallback-avatar" aria-hidden="true">
                    🏠
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem', color: '#fff' }}>{property.title}</h3>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.85)' }}>
                      Verified {propertyTypeLabel} listing in {property.cities?.name || 'Hosur'}
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* 4. Property Description */}
            <section className="business-section-card" aria-label="Property description">
              <p className="eyebrow">Overview</p>
              <h2 className="business-section-title">About this property</h2>
              <p style={{ margin: 0, whiteSpace: 'pre-line', lineHeight: 1.7, color: 'var(--color-text-body)', fontSize: '0.975rem' }}>
                {property.description?.trim() || 'The owner has not added a detailed description.'}
              </p>
            </section>

            {/* 5. Address & Geolocation Map (Address & Accessibility required by tests) */}
            {(property.address || (property.latitude !== null && property.longitude !== null)) && (
              <section className="business-section-card" aria-label="Location and accessibility">
                <p className="eyebrow">Location</p>
                <h2 className="business-section-title">Address & Accessibility</h2>
                {property.address && (
                  <p style={{ margin: '0 0 16px', color: 'var(--color-text-main)', fontSize: '0.95rem' }}>
                    📍 {property.address}
                  </p>
                )}

                {property.latitude !== null && property.longitude !== null && (
                  <div style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                    <HosurMap
                      markers={[
                        {
                          id: property.id,
                          title: property.title,
                          type: 'property',
                          latitude: property.latitude,
                          longitude: property.longitude,
                          subtitle: `${propertyTypeLabel} • ${listingLabel}`,
                          address: property.address,
                        },
                      ]}
                      height="340px"
                      center={[property.latitude, property.longitude]}
                      zoom={15}
                      showControls={false}
                    />
                  </div>
                )}

                {mapUrl && (
                  <div style={{ marginTop: '16px' }}>
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="secondary-button"
                      style={{ display: 'inline-flex', padding: '9px 18px', fontSize: '0.875rem' }}
                    >
                      Open in Google Maps ↗
                    </a>
                  </div>
                )}
              </section>
            )}
          </div>

          {/* Right Column: Sticky Sidebar with Pricing & Owner Contact */}
          <aside className="business-contact-sidebar">
            {/* Pricing Summary Card */}
            <div className="business-contact-card">
              <p className="eyebrow" style={{ marginBottom: '6px' }}>Pricing Breakdown</p>
              {property.listing_type === 'rent' ? (
                <div>
                  <div className="property-price-val" style={{ fontSize: '1.9rem', marginBottom: '4px' }}>
                    {formatCurrency(property.rent)}
                    <span className="property-price-period"> / mo</span>
                  </div>
                  {property.deposit !== null && (
                    <p style={{ margin: '6px 0 0', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                      Security Deposit: <strong style={{ color: 'var(--color-text-main)' }}>{formatCurrency(property.deposit)}</strong>
                    </p>
                  )}
                </div>
              ) : property.listing_type === 'lease' ? (
                <div>
                  <div className="property-price-val" style={{ fontSize: '1.9rem', marginBottom: '4px' }}>
                    {formatCurrency(property.rent ?? property.price)}
                    <span className="property-price-period"> lease</span>
                  </div>
                  {property.deposit !== null && (
                    <p style={{ margin: '6px 0 0', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                      Deposit: <strong style={{ color: 'var(--color-text-main)' }}>{formatCurrency(property.deposit)}</strong>
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <div className="property-price-val" style={{ fontSize: '1.9rem', marginBottom: '4px' }}>
                    {formatCurrency(property.price)}
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    Estimated sale price
                  </p>
                </div>
              )}
            </div>

            {/* Owner Contact Card */}
            <div className="business-contact-card">
              <p className="eyebrow" style={{ marginBottom: '6px' }}>Listed By</p>
              <h3 style={{ margin: '0 0 4px', fontSize: '1.25rem', fontWeight: 800 }}>{ownerName}</h3>
              <p style={{ margin: '0 0 16px', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                Direct owner / verified listing partner
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {ownerPhone && (
                  <a className="contact-button-primary" href={`tel:${ownerPhone}`}>
                    <span>📞</span> Call Owner ({ownerPhone})
                  </a>
                )}
                {ownerPhone && whatsappNumber && (
                  <a
                    className="contact-button-whatsapp"
                    href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hi, I am interested in your property "${property.title}" on SuperHosur.`)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span>💬</span> WhatsApp Owner
                  </a>
                )}
                {!ownerPhone && (
                  <Link to="/requirements/new" className="contact-button-primary">
                    <span>📝</span> Post a matching requirement
                  </Link>
                )}
              </div>

              <div className="contact-meta" style={{ marginTop: '22px' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, margin: '0 0 6px', color: 'var(--color-text-main)' }}>
                  Listing details
                </h4>
                <p style={{ margin: '0 0 4px', fontSize: '0.82rem' }}>
                  {property.active ? '🟢 Currently active listing' : '🔴 Inactive listing'}
                </p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Updated {new Date(property.updated_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </>
  )
}
