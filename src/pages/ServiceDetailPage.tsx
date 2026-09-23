import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Header } from '../components/Header'
import { LoadingState } from '../components/LoadingState'
import { getCatalogServiceById, type CatalogServiceDetail } from '../services/supply'

function formatServicePrice(service: CatalogServiceDetail): string {
  const from = service.price_from
  const to = service.price_to
  const unit = service.price_unit ? ` ${service.price_unit}` : ''

  if (from !== null && from !== undefined && to !== null && to !== undefined) {
    if (from === to) {
      return `₹${from.toLocaleString('en-IN')}${unit}`
    }
    return `₹${from.toLocaleString('en-IN')} – ₹${to.toLocaleString('en-IN')}${unit}`
  }

  if (from !== null && from !== undefined) {
    return `From ₹${from.toLocaleString('en-IN')}${unit}`
  }

  if (to !== null && to !== undefined) {
    return `Up to ₹${to.toLocaleString('en-IN')}${unit}`
  }

  return 'Price on request'
}

export function ServiceDetailPage() {
  const { serviceId } = useParams()
  const [service, setService] = useState<CatalogServiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadService() {
      if (!serviceId) {
        setError('Service not found.')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const data = await getCatalogServiceById(serviceId)
        setService(data)
      } catch (err) {
        if (
          typeof err === 'object' &&
          err !== null &&
          'code' in err &&
          ((err as { code: string }).code === 'PGRST116' || (err as { code: string }).code === '22P02')
        ) {
          setError('This service does not exist or is no longer available.')
        } else {
          setError(err instanceof Error ? err.message : 'Unable to load service.')
        }
      } finally {
        setLoading(false)
      }
    }

    loadService()
  }, [serviceId])

  if (loading) {
    return (
      <>
        <Header />
        <main className="page-main">
          <LoadingState message="Loading service specifications…" />
        </main>
      </>
    )
  }

  if (error || !service) {
    return (
      <>
        <Header />
        <main className="page-main">
          <div className="state-panel error-state" role="alert">
            <h2>Service Not Found</h2>
            <p>{error || 'This service does not exist or is no longer active.'}</p>
            <div style={{ marginTop: '16px' }}>
              <Link to="/catalog" className="primary-button hero-button">
                Return to Catalog
              </Link>
            </div>
          </div>
        </main>
      </>
    )
  }

  const business = service.businesses
  const category = service.categories
  const priceDisplay = formatServicePrice(service)
  const phone = business?.phone || business?.whatsapp
  const cleanPhone = phone ? phone.replace(/\D/g, '') : null
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
        `Hi, I am inquiring about your service "${service.name}" on SuperHosur.`,
      )}`
    : null

  return (
    <>
      <Header />

      <main className="page-main">
        {/* Navigation Breadcrumb & Back Link */}
        <div className="detail-hero" style={{ paddingBottom: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <nav aria-label="Breadcrumb">
              <ol
                style={{
                  display: 'flex',
                  gap: '8px',
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  fontSize: '0.875rem',
                  color: 'rgba(23,63,58,0.7)',
                }}
              >
                <li>
                  <Link to="/" className="nav-link" style={{ padding: 0 }}>
                    Home
                  </Link>
                </li>
                <li>/</li>
                <li>
                  <Link to="/catalog" className="nav-link" style={{ padding: 0 }}>
                    Catalog
                  </Link>
                </li>
                <li>/</li>
                <li aria-current="page" style={{ color: '#173f3a', fontWeight: 600 }}>
                  {service.name}
                </li>
              </ol>
            </nav>

            <Link to="/catalog" className="nav-link">
              ← Back to Catalog
            </Link>
          </div>

          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span
                className="business-tag"
                style={{ backgroundColor: '#ede9fe', color: '#6d28d9', fontWeight: 600 }}
              >
                Service
              </span>
              {category && <span className="business-tag">{category.name}</span>}
              {service.subcategories && (
                <span className="business-tag" style={{ backgroundColor: '#f0fdf4', color: '#166534', fontWeight: 600 }}>
                  {service.subcategories.name}
                </span>
              )}
              <span
                className="status-badge"
                style={{
                  color: '#059669',
                  borderColor: '#059669',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  padding: '2px 8px',
                }}
              >
                Available for Booking
              </span>
            </div>

            <h1 style={{ margin: '4px 0 8px', fontSize: '2.2rem', color: '#173f3a' }}>
              {service.name}
            </h1>
            <p style={{ margin: 0, color: 'rgba(23,63,58,0.75)', fontSize: '1rem' }}>
              Provided by{' '}
              <strong style={{ color: '#173f3a' }}>
                {business?.name || 'Local Verified Professional'}
              </strong>{' '}
              in Hosur
            </p>
          </div>
        </div>

        {/* Detail Layout */}
        <div className="business-detail-layout" style={{ marginTop: '24px' }}>
          <article className="business-detail-card business-detail-main">
            {/* Overview / Description */}
            <div className="detail-block business-description">
              <p className="eyebrow">Overview</p>
              <h2>Service Description</h2>
              <p style={{ whiteSpace: 'pre-line', fontSize: '1.05rem', lineHeight: '1.6' }}>
                {service.description?.trim() ||
                  'No detailed scope of work or description provided for this service. Contact the provider directly for customized estimates and scheduling.'}
              </p>
            </div>

            {/* Specifications Grid */}
            <div className="detail-block" style={{ marginTop: '28px' }}>
              <p className="eyebrow">Specifications</p>
              <h2>Service Details</h2>
              <div className="detail-grid" style={{ marginTop: '16px' }}>
                <div>
                  <strong>Offering Type</strong>
                  <span>Professional Service</span>
                </div>
                <div>
                  <strong>Estimated Pricing</strong>
                  <span>{priceDisplay}</span>
                </div>
                {service.price_unit && (
                  <div>
                    <strong>Pricing Unit</strong>
                    <span>{service.price_unit}</span>
                  </div>
                )}
                {category && (
                  <div>
                    <strong>Category</strong>
                    <span>{category.name}</span>
                  </div>
                )}
                {service.subcategories && (
                  <div>
                    <strong>Subcategory</strong>
                    <span>{service.subcategories.name}</span>
                  </div>
                )}
                <div>
                  <strong>Service Status</strong>
                  <span>{service.active ? 'Available' : 'Inactive'}</span>
                </div>
                <div>
                  <strong>Location</strong>
                  <span>Hosur, Tamil Nadu</span>
                </div>
              </div>
            </div>

            {/* Business Provider Overview */}
            {business && (
              <div className="detail-block" style={{ marginTop: '28px' }}>
                <p className="eyebrow">Service Provider</p>
                <h2>About the Business</h2>
                <p style={{ margin: '4px 0 12px', fontSize: '1rem', color: 'rgba(23,63,58,0.8)' }}>
                  This professional service is delivered by <strong>{business.name}</strong>, a trusted provider in Hosur.
                </p>
                {business.address && (
                  <p style={{ margin: '4px 0', fontSize: '0.95rem' }}>
                    <strong>Operating Location:</strong> {business.address}
                    {business.pincode ? `, Hosur - ${business.pincode}` : ', Hosur'}
                  </p>
                )}
                <div style={{ marginTop: '16px' }}>
                  <Link
                    to={`/businesses/${service.business_id}`}
                    className="secondary-button inline-button"
                  >
                    View Provider Profile & All Services →
                  </Link>
                </div>
              </div>
            )}
          </article>

          {/* Sidebar / Quick Inquiry Card */}
          <aside className="business-detail-card business-detail-sidebar">
            <div className="detail-block">
              <p className="eyebrow">Estimated Pricing</p>
              <h3 style={{ fontSize: '1.9rem', color: '#17614d', margin: '4px 0' }}>
                {priceDisplay}
              </h3>
              <p style={{ margin: '4px 0 0', color: 'rgba(23,63,58,0.7)', fontSize: '0.9rem' }}>
                Final quotes may vary based on exact service requirements and scope.
              </p>
            </div>

            <div
              className="detail-block"
              style={{
                marginTop: '24px',
                borderTop: '1px solid rgba(24,59,52,0.08)',
                paddingTop: '20px',
              }}
            >
              <p className="eyebrow">Provided By</p>
              <h3 style={{ margin: '4px 0 4px', fontSize: '1.25rem' }}>
                {business?.name || 'Local Service Provider'}
              </h3>
              {business?.verified && (
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: '0.75rem',
                    color: '#059669',
                    fontWeight: 600,
                    marginBottom: '12px',
                  }}
                >
                  ✓ Verified Hosur Professional
                </span>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
                {phone && (
                  <a
                    href={`tel:${phone}`}
                    className="primary-button"
                    style={{ textAlign: 'center', width: '100%' }}
                  >
                    Call Provider ({phone})
                  </a>
                )}
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="secondary-button"
                    style={{ textAlign: 'center', width: '100%' }}
                  >
                    Enquire on WhatsApp
                  </a>
                )}
                <Link
                  to={`/businesses/${service.business_id}`}
                  className="nav-link"
                  style={{ textAlign: 'center', marginTop: '4px' }}
                >
                  View Business Profile
                </Link>
              </div>
            </div>

            <div
              className="detail-block"
              style={{
                marginTop: '24px',
                borderTop: '1px solid rgba(24,59,52,0.08)',
                paddingTop: '20px',
                backgroundColor: 'rgba(23,63,58,0.02)',
                borderRadius: '8px',
                padding: '16px',
              }}
            >
              <p className="eyebrow" style={{ color: '#17614d' }}>
                Need Multiple Quotes?
              </p>
              <p style={{ fontSize: '0.875rem', margin: '4px 0 12px', color: 'rgba(23,63,58,0.8)' }}>
                Post your service requirements and get competitive responses from verified Hosur businesses.
              </p>
              <Link
                to="/requirements/new"
                className="secondary-button hero-button"
                style={{ display: 'block', textAlign: 'center', fontSize: '0.875rem' }}
              >
                Post a Requirement
              </Link>
            </div>
          </aside>
        </div>
      </main>
    </>
  )
}
