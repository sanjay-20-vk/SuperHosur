import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Header } from '../components/Header'
import { LoadingState } from '../components/LoadingState'
import { HosurMap } from '../components/HosurMap'
import { getCurrentSession } from '../services/auth'
import { getBusinessById, type BusinessRecord } from '../services/businesses'
import { getCategories, type CategorySummary } from '../services/categories'
import { getCities, type CityOption } from '../services/cities'
import { getBusinessProducts, getBusinessServices, type BusinessProduct, type BusinessService } from '../services/supply'
import { getApprovedBusinessPhotos, type BusinessPhotoWithUrl } from '../services/photos'
import { getApprovedBusinessVideos, type BusinessVideoWithUrl } from '../services/videos'
import {
  getBusinessReviews,
  submitBusinessReview,
  type BusinessReview,
} from '../services/reviews'
function formatVideoDuration(seconds: number | null): string | null {
  if (!seconds || seconds <= 0) return null
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function BusinessDetailPage() {
  const { businessId } = useParams()
  const [business, setBusiness] = useState<BusinessRecord | null>(null)
  const [category, setCategory] = useState<CategorySummary | null>(null)
  const [city, setCity] = useState<CityOption | null>(null)
  const [services, setServices] = useState<BusinessService[]>([])
  const [products, setProducts] = useState<BusinessProduct[]>([])
  const [photos, setPhotos] = useState<BusinessPhotoWithUrl[]>([])
  const [videos, setVideos] = useState<BusinessVideoWithUrl[]>([])
  const [reviews, setReviews] = useState<BusinessReview[]>([])
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null)
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [newRating, setNewRating] = useState(5)
  const [newComment, setNewComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [reviewFieldErrors, setReviewFieldErrors] = useState<{ rating?: string; comment?: string }>({})
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null)

  useEffect(() => {
    async function loadBusiness() {
      if (!businessId || !businessId.trim()) {
        setError('Business not found.')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // 1. Resolve the primary business record and static taxonomy/session first
        const [session, data, categories, cities] = await Promise.all([
          getCurrentSession(),
          getBusinessById(businessId),
          getCategories(),
          getCities(),
        ])

        // 2. Query child data strictly using the resolved business.id UUID (never by slug)
        const [
          serviceRows,
          productRows,
          photoRows,
          reviewRows,
          videoRows,
        ] = await Promise.all([
          getBusinessServices(data.id),
          getBusinessProducts(data.id),
          getApprovedBusinessPhotos(data.id),
          getBusinessReviews(data.id),
          getApprovedBusinessVideos(data.id),
        ])

        setBusiness(data)
        setCategory(categories.find((item) => item.id === data.category_id) ?? null)
        setCity(cities.find((item) => item.id === data.city_id) ?? null)
        setServices(serviceRows)
        setProducts(productRows)
        setPhotos(photoRows)
        setReviews(reviewRows)
        setVideos(videoRows)
        setActivePhotoId(photoRows[0]?.id ?? null)
        setActiveVideoId(videoRows.find((v) => v.is_featured)?.id ?? videoRows[0]?.id ?? null)

        if (session?.user?.id) {
          setHasSession(true)
          setIsOwner(data.owner_id === session.user.id)
        }
      } catch (loadError) {
        if (
          (loadError instanceof Error &&
            (loadError.message.includes('JSON object requested, multiple (or no) rows returned') ||
              loadError.message.includes('invalid input syntax for type uuid'))) ||
          (typeof loadError === 'object' &&
            loadError !== null &&
            'code' in loadError &&
            ((loadError as { code: string }).code === 'PGRST116' ||
              (loadError as { code: string }).code === '22P02'))
        ) {
          setError('This business does not exist or is not currently available.')
        } else {
          const message =
            loadError instanceof Error ? loadError.message : 'Unable to load the business.'
          setError(message)
        }
      } finally {
        setLoading(false)
      }
    }

    loadBusiness()
  }, [businessId])

  async function handleReviewSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!business || submittingReview) return

    setReviewError(null)
    setReviewSuccess(null)
    setReviewFieldErrors({})

    const errors: { rating?: string; comment?: string } = {}
    if (newRating < 1 || newRating > 5) {
      errors.rating = 'Rating must be between 1 and 5.'
    }

    if (newComment.length > 0 && !newComment.trim()) {
      errors.comment = 'Review comment cannot be only whitespace.'
    } else if (newComment.trim()) {
      if (newComment.trim().length < 5) {
        errors.comment = 'Review comment must be at least 5 characters.'
      } else if (newComment.trim().length > 1000) {
        errors.comment = 'Review comment cannot exceed 1000 characters.'
      }
    }

    if (Object.keys(errors).length > 0) {
      setReviewFieldErrors(errors)
      return
    }

    setSubmittingReview(true)

    try {
      const created = await submitBusinessReview({
        business_id: business.id,
        rating: newRating,
        comment: newComment.trim(),
      })

      setReviews((prev) => [created, ...prev.filter((r) => r.id !== created.id)])
      setNewComment('')
      setNewRating(5)
      setReviewFieldErrors({})
      setReviewSuccess('Thank you! Your rating and review have been submitted.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to submit review.'
      setReviewError(msg)
    } finally {
      setSubmittingReview(false)
    }
  }

  if (loading) {
    return (
      <>
        <Header />
        <main className="business-detail-container">
          <div className="state-panel loading-state business-detail-state-panel">
            <LoadingState message="Loading business details…" />
          </div>
        </main>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Header />
        <main className="business-detail-container">
          <section className="state-panel error-state business-detail-state-panel" role="alert">
            <h3>Business unavailable</h3>
            <p>{error}</p>
            <div className="business-state-action">
              <Link to="/" className="primary-button hero-button">
                Return to marketplace
              </Link>
            </div>
          </section>
        </main>
      </>
    )
  }

  if (!business) {
    return null
  }

  const phone = business.phone?.trim()
  const whatsapp = business.whatsapp?.trim()
  const email = business.email?.trim()
  const address = business.address?.trim()
  const locationLabel = [address, business.pincode?.trim(), city?.name]
    .filter(Boolean)
    .join(', ')
  const mapQuery = business.latitude !== null && business.longitude !== null
    ? `${business.latitude},${business.longitude}`
    : locationLabel
  const mapUrl = mapQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`
    : null
  const whatsappNumber = whatsapp?.replace(/\D/g, '')
  const availabilityLabel = business.availability_status.charAt(0).toUpperCase() +
    business.availability_status.slice(1)
  const visiblePhotos = photos.filter((photo) => photo.url)
  const activePhoto = visiblePhotos.find((photo) => photo.id === activePhotoId) ?? visiblePhotos.find((p) => p.is_primary) ?? visiblePhotos[0] ?? null
  const visibleVideos = videos.filter((video) => video.url)
  const activeVideo = visibleVideos.find((video) => video.id === activeVideoId) ?? visibleVideos.find((v) => v.is_featured) ?? visibleVideos[0] ?? null
  const currentPhotoIndex = activePhoto ? visiblePhotos.findIndex((p) => p.id === activePhoto.id) : -1
  const currentVideoIndex = activeVideo ? visibleVideos.findIndex((v) => v.id === activeVideo.id) : -1

  const totalReviewsCount = reviews.length > 0 ? reviews.length : business.review_count
  const averageRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : business.rating > 0 ? business.rating.toFixed(1) : null

  return (
    <>
      <Header />

      <main className="business-detail-container">
        {/* Breadcrumb & Navigation Bar */}
        <nav aria-label="Breadcrumb" className="business-breadcrumb-bar">
          <div className="business-breadcrumb-trail">
            <Link to="/" className="business-breadcrumb-link">
              Marketplace
            </Link>
            <span className="business-breadcrumb-sep" aria-hidden="true">/</span>
            {category && (
              <>
                <Link to={`/catalog?category=${encodeURIComponent(category.slug || category.id)}`} className="business-breadcrumb-link">
                  {category.name}
                </Link>
                <span className="business-breadcrumb-sep" aria-hidden="true">/</span>
              </>
            )}
            <span className="business-breadcrumb-current" aria-current="page">
              {business.name}
            </span>
          </div>

          <div className="business-breadcrumb-actions">
            <Link to="/" className="business-back-link">
              <span>←</span> Back to marketplace
            </Link>

            {isOwner && (
              <Link to={`/owner/businesses/${business.id}/edit`} className="business-owner-edit-btn">
                ✏️ Edit business
              </Link>
            )}
          </div>
        </nav>

        {/* 1. Business Detail Hero (Identity & Status) */}
        <section className="business-hero" aria-labelledby="business-name">
          <div className="business-hero-top">
            <div className="hero-pill-badge">
              <span className="pulse-dot" aria-hidden="true" />
              <span>{category?.name ?? 'Local Business'}</span>
            </div>
            {city?.name && (
              <span className="location-pill">
                📍 {city.name}
              </span>
            )}
          </div>

          <h1 id="business-name" className="business-hero-title">{business.name}</h1>

          <p className="business-hero-location">
            <span>📍</span> {locationLabel || 'Hosur, Tamil Nadu'}
          </p>

          <div className="business-hero-badges" aria-label="Business status">
            <span className={business.verified ? 'status-badge verified' : 'status-badge'}>
              {business.verified ? '✓ Verified listing' : 'Verification pending'}
            </span>
            <span className="status-badge">
              Status: {availabilityLabel}
            </span>
            {(totalReviewsCount > 0 || (averageRating && Number(averageRating) > 0)) && (
              <span className="business-rating-badge">
                ★ {averageRating ?? '5.0'} ({totalReviewsCount} {totalReviewsCount === 1 ? 'review' : 'reviews'})
              </span>
            )}
            {!business.active && <span className="status-badge inactive">Inactive</span>}
          </div>

          {/* Quick Mobile Contact Row (visible on small viewports) */}
          {(phone || whatsappNumber || email) && (
            <div className="business-mobile-actions">
              {phone && (
                <a className="contact-button-primary" href={`tel:${phone}`}>
                  📞 Call
                </a>
              )}
              {whatsappNumber && (
                <a
                  className="contact-button-whatsapp"
                  href={`https://wa.me/${whatsappNumber}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  💬 WhatsApp
                </a>
              )}
              {email && (
                <a className="contact-button-secondary" href={`mailto:${email}`}>
                  ✉️ Email
                </a>
              )}
            </div>
          )}
        </section>

        {/* Main Layout: Left Content & Right Sticky Contact Sidebar */}
        <div className="business-detail-layout">
          {/* Main Column */}
          <div className="business-detail-main">
            {/* 2. Media Section (Photos Gallery or Fallback) */}
            {activePhoto ? (
              <section className="business-section-card business-section-media" aria-label="Business photos">
                <div className="business-gallery-header">
                  <div className="business-gallery-title-wrap">
                    <p className="eyebrow">Visual gallery</p>
                    <h2 className="business-section-title">Business Photos ({visiblePhotos.length})</h2>
                  </div>
                  <div className="business-gallery-counter-badge" aria-label={`Photo ${currentPhotoIndex + 1} of ${visiblePhotos.length}`}>
                    <span>{currentPhotoIndex + 1} / {visiblePhotos.length}</span>
                  </div>
                </div>

                <div className="business-media-frame">
                  <img
                    src={activePhoto.url ?? ''}
                    alt={activePhoto.alt_text || `${business.name} photo ${currentPhotoIndex + 1}`}
                    loading="eager"
                    className="business-media-img"
                  />
                  <div className="business-media-overlay">
                    {activePhoto.is_primary && (
                      <span className="business-media-tag business-media-tag--primary">★ Primary Photo</span>
                    )}
                    {activePhoto.moderation_status === 'approved' && (
                      <span className="business-media-tag business-media-tag--verified">✓ Verified</span>
                    )}
                  </div>
                </div>

                {visiblePhotos.length > 1 && (
                  <div className="business-gallery__thumbs" role="list" aria-label="Business photo thumbnails">
                    {visiblePhotos.map((photo, index) => (
                      <button
                        type="button"
                        key={photo.id}
                        className={photo.id === activePhoto.id ? 'photo-thumb active' : 'photo-thumb'}
                        onClick={() => setActivePhotoId(photo.id)}
                        aria-label={photo.alt_text || `View photo ${index + 1} of ${visiblePhotos.length}`}
                        aria-pressed={photo.id === activePhoto.id}
                      >
                        <img src={photo.url ?? ''} alt="" />
                        {photo.is_primary && (
                          <span className="photo-thumb-primary-dot" title="Primary photo" aria-hidden="true" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            ) : (
              <section className="business-section-card business-media-fallback" aria-label="Business listing summary">
                <div className="business-fallback-visual">
                  <div className="business-fallback-avatar" aria-hidden="true">
                    {business.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="business-fallback-badge">
                    <span>🏪 Hosur Commercial Profile</span>
                  </div>
                </div>
                <div className="business-fallback-content">
                  <h3 className="business-fallback-title">{business.name}</h3>
                  <p className="business-fallback-desc">
                    Verified commercial profile in {city?.name ?? 'Hosur'} • {category?.name ?? 'Local Business'}
                  </p>
                  <p className="business-fallback-hint">
                    Photos have not been uploaded by the business owner yet. Contact them directly below for inquiries or catalog details.
                  </p>
                </div>
              </section>
            )}

            {/* Featured Videos (if available) */}
            {visibleVideos.length > 0 && activeVideo && (
              <section className="business-section-card business-section-videos" id="business-videos" aria-label="Business videos">
                <div className="business-video-header">
                  <div className="business-video-title-wrap">
                    <p className="eyebrow">Video showcase</p>
                    <h2 className="business-section-title">Business Videos ({visibleVideos.length})</h2>
                  </div>
                  {activeVideo.is_featured && (
                    <span className="business-video-featured-pill">
                      ★ Featured Video
                    </span>
                  )}
                </div>

                <div className="business-video-frame">
                  <video
                    key={activeVideo.id}
                    src={activeVideo.url ?? ''}
                    controls
                    playsInline
                    preload="metadata"
                    className="business-video-player"
                  />
                </div>

                <div className="business-video-meta-row">
                  <div className="business-video-active-info">
                    <span className="business-video-now-playing">Now Playing: Video {currentVideoIndex + 1}</span>
                    {formatVideoDuration(activeVideo.duration_seconds) && (
                      <span className="business-video-duration-tag">⏱ {formatVideoDuration(activeVideo.duration_seconds)}</span>
                    )}
                    {activeVideo.moderation_status === 'approved' && (
                      <span className="business-video-status-tag">✓ Approved</span>
                    )}
                  </div>
                </div>

                {visibleVideos.length > 1 && (
                  <div
                    className="business-video-thumbs"
                    role="list"
                    aria-label="Video selection"
                  >
                    {visibleVideos.map((vid, index) => {
                      const duration = formatVideoDuration(vid.duration_seconds)
                      return (
                        <button
                          key={vid.id}
                          type="button"
                          className={vid.id === activeVideo.id ? 'business-video-thumb-btn active' : 'business-video-thumb-btn'}
                          onClick={() => setActiveVideoId(vid.id)}
                          aria-label={`Select Video ${index + 1}${vid.is_featured ? ' (Featured)' : ''}`}
                          aria-pressed={vid.id === activeVideo.id}
                        >
                          <span className="video-thumb-play-icon" aria-hidden="true">▶</span>
                          <span className="video-thumb-label">Video {index + 1}</span>
                          {duration && <span className="video-thumb-duration">{duration}</span>}
                          {vid.is_featured && (
                            <span className="status-badge business-video-thumb-badge">
                              Featured
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </section>
            )}

            {/* 3. Business Information & Overview */}
            <section className="business-section-card business-section-about" aria-label="Business overview">
              <p className="eyebrow">About this business</p>
              <h2 className="business-section-title">
                {business.description?.trim() ? 'What they offer' : 'Business information'}
              </h2>
              <p className="business-desc-text">
                {business.description?.trim() || 'This business has not added a detailed description yet.'}
              </p>

              <div className="business-spec-grid">
                <div className="business-spec-item">
                  <span className="business-spec-label">Category</span>
                  <span className="business-spec-value">{category?.name ?? 'Local Business'}</span>
                </div>
                <div className="business-spec-item">
                  <span className="business-spec-label">Location</span>
                  <span className="business-spec-value">{city?.name ?? 'Hosur'}</span>
                </div>
                {business.service_radius_km !== null && (
                  <div className="business-spec-item">
                    <span className="business-spec-label">Service radius</span>
                    <span className="business-spec-value">{business.service_radius_km} km</span>
                  </div>
                )}
                <div className="business-spec-item">
                  <span className="business-spec-label">Availability</span>
                  <span className="business-spec-value">{availabilityLabel}</span>
                </div>
                {(totalReviewsCount > 0 || (averageRating && Number(averageRating) > 0)) && (
                  <div className="business-spec-item">
                    <span className="business-spec-label">Customer Rating</span>
                    <span className="business-spec-value">★ {averageRating ?? '5.0'} ({totalReviewsCount} reviews)</span>
                  </div>
                )}
              </div>
            </section>

            {/* 4. Products & Services */}
            {/* 4. Products & Services */}
            {/* Services */}
            <section className="business-section-card business-section-services" aria-label="Services offered">
              <div className="business-section-header">
                <div className="business-section-header-copy">
                  <p className="eyebrow">Service offerings</p>
                  <h2 className="business-section-title">Services ({services.length})</h2>
                </div>
              </div>

              {services.length === 0 ? (
                <div className="public-supply-empty-card" role="status" aria-label="No services listed">
                  <div className="public-supply-empty-icon" aria-hidden="true">🛠️</div>
                  <div className="public-supply-empty-content">
                    <h3 className="public-supply-empty-title">No services listed yet</h3>
                    <p className="public-supply-empty-desc">
                      This business has not added specific service offerings to their catalog yet. Contact them directly below for inquiries or custom requirements.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="public-supply-list" role="list" aria-label="Services catalog">
                  {services.map((service) => (
                    <article
                      key={service.id}
                      className="supply-card public-supply-card"
                      aria-labelledby={`service-title-${service.id}`}
                      role="listitem"
                      tabIndex={0}
                    >
                      <div className="supply-card-main">
                        <div className="supply-card-top">
                          <div className="supply-card-badge-row">
                            <span className="supply-card-kind-badge supply-card-kind-badge--service" aria-hidden="true">
                              Service
                            </span>
                            {service.subcategories && (
                              <span className="business-tag supply-card-taxonomy-badge">
                                {service.subcategories.name}
                              </span>
                            )}
                          </div>
                          <h3 id={`service-title-${service.id}`} className="supply-card-title">
                            {service.name}
                          </h3>
                        </div>

                        <p className="supply-card-description">
                          {service.description ? (
                            service.description
                          ) : (
                            <span className="supply-card-desc-empty">Service details available on request.</span>
                          )}
                        </p>

                        <div className="supply-card-meta">
                          {(service.price_from !== null || service.price_to !== null) ? (
                            <div className="supply-card-price-box">
                              <span className="supply-card-price-label">Price</span>
                              <strong className="supply-card-price-val">
                                From ₹{service.price_from ?? service.price_to}
                                {service.price_to !== null && service.price_to !== service.price_from ? ` – ₹${service.price_to}` : ''}
                                {service.price_unit ? <span className="supply-card-price-unit"> {service.price_unit}</span> : ''}
                              </strong>
                            </div>
                          ) : (
                            <div className="supply-card-price-box supply-card-price-box--flexible">
                              <span className="supply-card-price-label">Price</span>
                              <span className="supply-card-price-tbd">Price on request</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {/* Products */}
            <section className="business-section-card business-section-products" aria-label="Products offered">
              <div className="business-section-header">
                <div className="business-section-header-copy">
                  <p className="eyebrow">Product inventory</p>
                  <h2 className="business-section-title">Products ({products.length})</h2>
                </div>
              </div>

              {products.length === 0 ? (
                <div className="public-supply-empty-card" role="status" aria-label="No products listed">
                  <div className="public-supply-empty-icon" aria-hidden="true">📦</div>
                  <div className="public-supply-empty-content">
                    <h3 className="public-supply-empty-title">No products listed yet</h3>
                    <p className="public-supply-empty-desc">
                      This business has not listed physical products or catalog merchandise yet. Contact them directly below for availability and pricing.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="public-supply-list" role="list" aria-label="Products catalog">
                  {products.map((product) => (
                    <article
                      key={product.id}
                      className="supply-card public-supply-card"
                      aria-labelledby={`product-title-${product.id}`}
                      role="listitem"
                      tabIndex={0}
                    >
                      <div className="supply-card-main">
                        <div className="supply-card-top">
                          <div className="supply-card-badge-row">
                            <span className="supply-card-kind-badge supply-card-kind-badge--product" aria-hidden="true">
                              Product
                            </span>
                            {product.subcategories && (
                              <span className="business-tag supply-card-taxonomy-badge">
                                {product.subcategories.name}
                              </span>
                            )}
                            <span
                              className={`supply-avail-badge supply-avail-badge--${product.availability}`}
                              role="status"
                              aria-label={`Availability: ${product.availability}`}
                            >
                              <span className="supply-avail-dot" aria-hidden="true" />
                              {product.availability === 'available'
                                ? 'Available'
                                : product.availability === 'limited'
                                ? 'Limited'
                                : 'Unavailable'}
                            </span>
                          </div>
                          <h3 id={`product-title-${product.id}`} className="supply-card-title">
                            {product.name}
                          </h3>
                        </div>

                        <p className="supply-card-description">
                          {product.description ? (
                            product.description
                          ) : (
                            <span className="supply-card-desc-empty">Product details available on request.</span>
                          )}
                        </p>

                        <div className="supply-card-meta">
                          <div className="supply-card-price-box">
                            <span className="supply-card-price-label">Price</span>
                            <strong className="supply-card-price-val">
                              ₹{product.price}
                              {product.unit ? <span className="supply-card-price-unit"> / {product.unit}</span> : ''}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {/* 5. Location & Map (Address & Map required by tests) */}
            {/* 5. Location & Map (Address & Map required by tests) */}
            {(business.address || (business.latitude !== null && business.longitude !== null)) && (
              <section className="business-section-card business-section-map" aria-label="Business location">
                <div className="business-location-header">
                  <div className="business-location-title-wrap">
                    <p className="eyebrow">Location</p>
                    <h2 className="business-section-title">Address & Map</h2>
                    <p className="business-location-subtitle">Find this business in Hosur</p>
                  </div>
                  {mapUrl && (
                    <div className="business-map-header-action">
                      <a
                        className="business-directions-btn"
                        href={mapUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Get directions to ${business.name} in Google Maps`}
                      >
                        <span className="business-directions-icon" aria-hidden="true">📍</span>
                        <span>Get Directions ↗</span>
                      </a>
                    </div>
                  )}
                </div>

                {business.address && (
                  <div className="business-address-card">
                    <div className="business-address-pin" aria-hidden="true">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                    </div>
                    <div className="business-address-content">
                      <span className="business-address-label">Physical Address</span>
                      <p className="business-address-text">
                        {business.address}{business.pincode ? ` - ${business.pincode}` : ''}
                      </p>
                      <span className="business-address-city">{city?.name ?? 'Hosur'}, Tamil Nadu</span>
                    </div>
                  </div>
                )}

                {business.latitude !== null && business.longitude !== null ? (
                  <div className="business-map-frame">
                    <HosurMap
                      markers={[
                        {
                          id: business.id,
                          title: business.name,
                          type: 'business',
                          latitude: business.latitude,
                          longitude: business.longitude,
                          subtitle: category?.name || null,
                          address: business.address,
                        },
                      ]}
                      height="360px"
                      center={[business.latitude, business.longitude]}
                      zoom={15}
                      showControls={false}
                    />
                    <div className="business-map-footer-bar">
                      <span className="business-map-coord-badge">
                        <span className="coord-dot" aria-hidden="true" />
                        GPS: {business.latitude.toFixed(4)}, {business.longitude.toFixed(4)}
                      </span>
                      {mapUrl && (
                        <a
                          className="business-map-footer-link"
                          href={mapUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open ${business.name} on Google Maps`}
                        >
                          Open in Google Maps ↗
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="business-map-unpinned-notice">
                    <span className="notice-icon" aria-hidden="true">🗺️</span>
                    <div className="notice-text">
                      <strong>Precise map pin not yet set</strong>
                      <p>Use the physical address above or click Get Directions to view the general area on Google Maps.</p>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* 6. Customer Reviews */}
            <section
              className="business-section-card business-section-reviews"
              aria-labelledby="reviews-section-title"
            >
              <div className="business-reviews-header">
                <div className="business-reviews-title-wrap">
                  <p className="eyebrow">REVIEWS</p>
                  <h2 id="reviews-section-title" className="business-section-title">
                    Customer Reviews {averageRating ? `(${averageRating} ★)` : ''}
                  </h2>
                  <p className="business-reviews-subtitle">
                    Authentic customer feedback and ratings shared by the Hosur community.
                  </p>
                </div>
              </div>

              {/* Rating summary card */}
              {(totalReviewsCount > 0 || averageRating) && (
                <div
                  className="review-summary-card"
                  aria-label={`Average rating ${averageRating ?? '5.0'} out of 5 stars based on ${totalReviewsCount} ${totalReviewsCount === 1 ? 'review' : 'reviews'}`}
                >
                  <div className="review-summary-score-col">
                    <div className="review-big-score">
                      <span>{averageRating ?? '5.0'}</span>
                      <span className="review-score-max" aria-hidden="true">/5</span>
                    </div>
                    <div className="review-stars-visual" aria-hidden="true">
                      {'★'.repeat(Math.round(Number(averageRating) || 5))}{'☆'.repeat(5 - Math.round(Number(averageRating) || 5))}
                    </div>
                  </div>
                  <div className="review-summary-details">
                    <strong className="review-summary-headline">
                      {Number(averageRating) >= 4.5
                        ? 'Excellent customer rating'
                        : Number(averageRating) >= 3.5
                        ? 'Highly rated business'
                        : Number(averageRating) > 0
                        ? 'Customer rated'
                        : 'Community feedback'}
                    </strong>
                    <p className="review-count-copy">
                      Based on {totalReviewsCount} customer {totalReviewsCount === 1 ? 'review' : 'reviews'}
                    </p>
                    <span className="review-verified-pill" aria-label="Authentic Hosur Community Reviews">
                      <span className="review-verified-check" aria-hidden="true">✓</span> Verified Hosur Community Feedback
                    </span>
                  </div>
                </div>
              )}

              {/* Write Review Form / Notices */}
              {isOwner ? (
                <div className="review-notice-banner review-notice-banner--owner" role="note">
                  <span className="review-notice-icon" aria-hidden="true">🛡️</span>
                  <div className="review-notice-content">
                    <strong className="review-notice-title">Owner Listing</strong>
                    <p className="review-notice-text">
                      As the owner of this business, you cannot submit a review for your own listing.
                    </p>
                  </div>
                </div>
              ) : hasSession ? (
                <form onSubmit={handleReviewSubmit} noValidate className="review-form-card">
                  <div className="review-form-header">
                    <span className="review-form-icon" aria-hidden="true">✍️</span>
                    <div>
                      <h3 className="review-form-title">Write a review</h3>
                      <p className="review-form-subtitle">Share your experience to help neighbors discover great local services.</p>
                    </div>
                  </div>

                  {reviewError && (
                    <div className="review-alert-banner review-alert-banner--error" role="alert">
                      <span className="review-alert-icon" aria-hidden="true">⚠️</span>
                      <div className="review-alert-text">
                        <strong>Submission error</strong>
                        <p>{reviewError}</p>
                      </div>
                    </div>
                  )}

                  {reviewSuccess && (
                    <div className="review-alert-banner review-alert-banner--success" role="status">
                      <span className="review-alert-icon" aria-hidden="true">✓</span>
                      <div className="review-alert-text">
                        <strong>Thank you!</strong>
                        <p className="review-success-msg">{reviewSuccess}</p>
                      </div>
                    </div>
                  )}

                  <div className="review-form-field-group">
                    <label htmlFor="review-rating-select" className="review-form-label">
                      Your Rating <span className="review-required" aria-hidden="true">*</span>
                    </label>
                    <div className="review-rating-picker-row">
                      <div className="review-star-picker" role="radiogroup" aria-label="Select rating">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            role="radio"
                            aria-checked={newRating === star}
                            aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                            className={`review-star-btn ${newRating >= star ? 'review-star-btn--active' : ''}`}
                            onClick={() => {
                              setNewRating(star)
                              if (reviewFieldErrors.rating) {
                                setReviewFieldErrors((prev) => ({ ...prev, rating: undefined }))
                              }
                            }}
                          >
                            ★
                          </button>
                        ))}
                      </div>

                      <select
                        id="review-rating-select"
                        value={newRating}
                        aria-label="Rating dropdown"
                        aria-invalid={Boolean(reviewFieldErrors.rating)}
                        aria-describedby={reviewFieldErrors.rating ? 'review-rating-error' : undefined}
                        onChange={(e) => {
                          setNewRating(Number(e.target.value))
                          if (reviewFieldErrors.rating) {
                            setReviewFieldErrors((prev) => ({ ...prev, rating: undefined }))
                          }
                        }}
                        className="catalog-sort-select review-rating-select"
                      >
                        <option value={5}>5 ★★★★★ (Excellent)</option>
                        <option value={4}>4 ★★★★☆ (Good)</option>
                        <option value={3}>3 ★★★☆☆ (Average)</option>
                        <option value={2}>2 ★★☆☆☆ (Below Average)</option>
                        <option value={1}>1 ★☆☆☆☆ (Poor)</option>
                      </select>
                    </div>

                    {reviewFieldErrors.rating && (
                      <span id="review-rating-error" className="field-error review-field-error" role="alert">
                        {reviewFieldErrors.rating}
                      </span>
                    )}
                  </div>

                  <div className="review-form-field-group">
                    <div className="review-form-textarea-wrap">
                      <div className="review-label-split">
                        <label htmlFor="review-comment-textarea" className="review-form-label">
                          Your Review <span className="review-optional">(optional)</span>
                        </label>
                        <div className="review-form-char-row">
                          <span className="char-hint review-char-hint" aria-live="polite">
                            {newComment.length}/1000
                          </span>
                        </div>
                      </div>
                      <textarea
                        id="review-comment-textarea"
                        rows={3}
                        maxLength={1000}
                        value={newComment}
                        aria-invalid={Boolean(reviewFieldErrors.comment)}
                        aria-describedby={reviewFieldErrors.comment ? 'review-comment-error' : undefined}
                        onChange={(e) => {
                          setNewComment(e.target.value)
                          if (reviewFieldErrors.comment) {
                            setReviewFieldErrors((prev) => ({ ...prev, comment: undefined }))
                          }
                        }}
                        placeholder="Share your experience with this business (optional, min 5 characters)..."
                        className={`review-form-textarea ${reviewFieldErrors.comment ? 'review-form-textarea--error' : ''}`}
                      />
                      {reviewFieldErrors.comment && (
                        <span id="review-comment-error" className="field-error review-field-error" role="alert">
                          {reviewFieldErrors.comment}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="review-form-actions">
                    <button
                      type="submit"
                      className="primary-button hero-button review-submit-btn"
                      disabled={submittingReview}
                      aria-busy={submittingReview}
                    >
                      {submittingReview ? (
                        <>
                          <span className="review-btn-spinner" aria-hidden="true" />
                          <span>Submitting review…</span>
                        </>
                      ) : (
                        <span>Submit review</span>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="review-notice-banner review-notice-banner--auth">
                  <span className="review-notice-icon" aria-hidden="true">💬</span>
                  <div className="review-notice-content">
                    <strong className="review-notice-title">Customer Feedback</strong>
                    <p className="review-notice-text">
                      <Link to="/auth/signin" className="text-action review-auth-link">Sign in</Link> to leave a customer rating and review for this business.
                    </p>
                  </div>
                </div>
              )}

              {/* Review Cards List */}
              {reviews.length === 0 ? (
                <div className="review-empty-card">
                  <div className="review-empty-icon-wrap" aria-hidden="true">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </div>
                  <h3 className="review-empty-title">No reviews yet</h3>
                  <p className="review-empty-text">No reviews yet. Be the first customer to share your experience!</p>
                </div>
              ) : (
                <div className="reviews-list-wrap" role="list" aria-label="Customer reviews list">
                  {reviews.map((rev) => (
                    <article key={rev.id} className="review-card-item" role="listitem">
                      <div className="review-author-row">
                        <div className="review-author-info">
                          <div className="review-author-avatar" aria-hidden="true">
                            {rev.author_name ? rev.author_name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div className="review-author-meta">
                            <strong className="review-author-name">{rev.author_name}</strong>
                            <span className="review-author-date">
                              {new Date(rev.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="review-card-rating" aria-label={`Rated ${rev.rating} out of 5 stars`}>
                          <span className="review-rating-badge">{rev.rating}.0</span>
                          <span className="review-stars-val" aria-hidden="true">
                            {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                          </span>
                        </div>
                      </div>
                      {rev.comment && (
                        <p className="review-card-comment">
                          {rev.comment}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right Column: Sticky Contact Sidebar */}
          <aside className="business-contact-sidebar" aria-labelledby="contact-sidebar-title">
            {/* Owner Quick Action Card (Gated strictly to owner) */}
            {isOwner && (
              <div className="contact-owner-card">
                <div className="contact-owner-header">
                  <span className="contact-owner-icon" aria-hidden="true">🛡️</span>
                  <div className="contact-owner-info">
                    <strong className="contact-owner-title">Your Listing</strong>
                    <p className="contact-owner-subtitle">You have business owner management access.</p>
                  </div>
                </div>
                <Link
                  to={`/owner/businesses/${business.id}/edit`}
                  className="contact-owner-action-btn"
                >
                  <span aria-hidden="true">✏️</span>
                  <span>Edit Business Details</span>
                </Link>
              </div>
            )}

            <div className="business-contact-card">
              <div className="contact-card-header">
                <p className="eyebrow contact-eyebrow">CONTACT</p>
                <h2 id="contact-sidebar-title" className="contact-title">Contact Business</h2>
                <p className="contact-subtitle">
                  Connect directly with {business.name} for inquiries, orders, or support.
                </p>
              </div>

              {/* Primary & Quick Contact Actions */}
              <div className="contact-buttons-list">
                {phone && (
                  <a
                    className="contact-button-primary"
                    href={`tel:${phone}`}
                    aria-label={`Call ${business.name} at ${phone}`}
                  >
                    <span className="contact-btn-icon" aria-hidden="true">📞</span>
                    <span>Call {phone}</span>
                  </a>
                )}
                {whatsappNumber && (
                  <a
                    className="contact-button-whatsapp"
                    href={`https://wa.me/${whatsappNumber}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Message ${business.name} on WhatsApp`}
                  >
                    <span className="contact-btn-icon" aria-hidden="true">💬</span>
                    <span>Chat on WhatsApp</span>
                  </a>
                )}
                {email && (
                  <a
                    className="contact-button-secondary"
                    href={`mailto:${email}`}
                    aria-label={`Send email to ${email}`}
                  >
                    <span className="contact-btn-icon" aria-hidden="true">✉️</span>
                    <span>Email {email}</span>
                  </a>
                )}
                {!phone && !whatsappNumber && !email && (
                  <p className="contact-empty">No direct contact details have been provided yet.</p>
                )}
              </div>

              {/* Detailed Contact Information Rows */}
              {(phone || whatsappNumber || email || address) && (
                <div className="contact-info-rows-list">
                  {phone && (
                    <div className="contact-info-row">
                      <span className="contact-row-icon" aria-hidden="true">📞</span>
                      <div className="contact-row-content">
                        <span className="contact-row-label">Phone</span>
                        <a href={`tel:${phone}`} className="contact-row-val contact-row-link">
                          {phone}
                        </a>
                      </div>
                    </div>
                  )}

                  {whatsappNumber && (
                    <div className="contact-info-row">
                      <span className="contact-row-icon" aria-hidden="true">💬</span>
                      <div className="contact-row-content">
                        <span className="contact-row-label">WhatsApp</span>
                        <a
                          href={`https://wa.me/${whatsappNumber}`}
                          target="_blank"
                          rel="noreferrer"
                          className="contact-row-val contact-row-link"
                        >
                          +{whatsappNumber}
                        </a>
                      </div>
                    </div>
                  )}

                  {email && (
                    <div className="contact-info-row">
                      <span className="contact-row-icon" aria-hidden="true">✉️</span>
                      <div className="contact-row-content">
                        <span className="contact-row-label">Email</span>
                        <a href={`mailto:${email}`} className="contact-row-val contact-row-link">
                          {email}
                        </a>
                      </div>
                    </div>
                  )}

                  {address && (
                    <div className="contact-info-row">
                      <span className="contact-row-icon" aria-hidden="true">📍</span>
                      <div className="contact-row-content">
                        <span className="contact-row-label">Location</span>
                        <p className="contact-row-val contact-row-text">
                          {business.address}{business.pincode ? ` - ${business.pincode}` : ''}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Status and Trust Meta Wrap */}
              <div className="contact-meta-wrap">
                <div className="contact-meta-header">
                  <h3 className="contact-status-title">Listing status</h3>
                  <span className={`contact-status-pill ${business.active ? 'is-active' : 'is-inactive'}`}>
                    <span className="contact-status-dot" aria-hidden="true" />
                    {business.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="contact-status-val">
                  {business.active ? '🟢 Currently active' : '🔴 Currently inactive'}
                </p>
                <p className="contact-updated-val">
                  Updated {new Date(business.updated_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </>
  )
}
