import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Header } from '../components/Header'
import { LoadingState } from '../components/LoadingState'
import { getCatalogProductById, type CatalogProductDetail } from '../services/supply'

export function ProductDetailPage() {
  const { productId } = useParams()
  const [product, setProduct] = useState<CatalogProductDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadProduct() {
      if (!productId) {
        setError('Product not found.')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const data = await getCatalogProductById(productId)
        setProduct(data)
      } catch (err) {
        if (
          typeof err === 'object' &&
          err !== null &&
          'code' in err &&
          ((err as { code: string }).code === 'PGRST116' || (err as { code: string }).code === '22P02')
        ) {
          setError('This product does not exist or is no longer available.')
        } else {
          setError(err instanceof Error ? err.message : 'Unable to load product.')
        }
      } finally {
        setLoading(false)
      }
    }

    loadProduct()
  }, [productId])

  if (loading) {
    return (
      <>
        <Header />
        <main className="page-main">
          <LoadingState message="Loading product specifications…" />
        </main>
      </>
    )
  }

  if (error || !product) {
    return (
      <>
        <Header />
        <main className="page-main">
          <div className="state-panel error-state" role="alert">
            <h2>Product Not Found</h2>
            <p>{error || 'This product does not exist or is no longer active.'}</p>
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

  const business = product.businesses
  const category = product.categories
  const phone = business?.phone || business?.whatsapp
  const cleanPhone = phone ? phone.replace(/\D/g, '') : null
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
        `Hi, I am interested in purchasing "${product.name}" listed on SuperHosur.`,
      )}`
    : null

  const availabilityLabel =
    product.availability === 'available'
      ? 'In Stock'
      : product.availability === 'limited'
      ? 'Limited Stock'
      : 'Out of Stock'

  const availabilityColor =
    product.availability === 'available'
      ? '#059669'
      : product.availability === 'limited'
      ? '#d97706'
      : '#dc2626'

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
                  {product.name}
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
                style={{ backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: 600 }}
              >
                Product
              </span>
              {category && <span className="business-tag">{category.name}</span>}
              {product.subcategories && (
                <span className="business-tag" style={{ backgroundColor: '#f0fdf4', color: '#166534', fontWeight: 600 }}>
                  {product.subcategories.name}
                </span>
              )}
              <span
                className="status-badge"
                style={{
                  color: availabilityColor,
                  borderColor: availabilityColor,
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  padding: '2px 8px',
                }}
              >
                {availabilityLabel}
              </span>
            </div>

            <h1 style={{ margin: '4px 0 8px', fontSize: '2.2rem', color: '#173f3a' }}>
              {product.name}
            </h1>
            <p style={{ margin: 0, color: 'rgba(23,63,58,0.75)', fontSize: '1rem' }}>
              Supplied by{' '}
              <strong style={{ color: '#173f3a' }}>
                {business?.name || 'Local Verified Business'}
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
              <h2>Product Description</h2>
              <p style={{ whiteSpace: 'pre-line', fontSize: '1.05rem', lineHeight: '1.6' }}>
                {product.description?.trim() ||
                  'No detailed specifications or description provided for this product. Contact the seller directly for availability and inquiries.'}
              </p>
            </div>

            {/* Specifications Grid */}
            <div className="detail-block" style={{ marginTop: '28px' }}>
              <p className="eyebrow">Specifications</p>
              <h2>Product Details</h2>
              <div className="detail-grid" style={{ marginTop: '16px' }}>
                <div>
                  <strong>Offering Type</strong>
                  <span>Physical Product</span>
                </div>
                <div>
                  <strong>Price</strong>
                  <span>₹{product.price.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <strong>Unit of Measure</strong>
                  <span>{product.unit ? product.unit : 'Per piece / item'}</span>
                </div>
                <div>
                  <strong>Stock Availability</strong>
                  <span style={{ color: availabilityColor, fontWeight: 600 }}>{availabilityLabel}</span>
                </div>
                {category && (
                  <div>
                    <strong>Category</strong>
                    <span>{category.name}</span>
                  </div>
                )}
                {product.subcategories && (
                  <div>
                    <strong>Subcategory</strong>
                    <span>{product.subcategories.name}</span>
                  </div>
                )}
                <div>
                  <strong>Listing Status</strong>
                  <span>{product.active ? 'Active Listing' : 'Inactive'}</span>
                </div>
              </div>
            </div>

            {/* Business Provider Overview */}
            {business && (
              <div className="detail-block" style={{ marginTop: '28px' }}>
                <p className="eyebrow">Provider Info</p>
                <h2>About the Seller</h2>
                <p style={{ margin: '4px 0 12px', fontSize: '1rem', color: 'rgba(23,63,58,0.8)' }}>
                  This product is stocked and distributed by{' '}
                  <strong>{business.name}</strong>, a registered local entity in Hosur.
                </p>
                {business.address && (
                  <p style={{ margin: '4px 0', fontSize: '0.95rem' }}>
                    <strong>Address:</strong> {business.address}
                    {business.pincode ? `, Hosur - ${business.pincode}` : ', Hosur'}
                  </p>
                )}
                <div style={{ marginTop: '16px' }}>
                  <Link
                    to={`/businesses/${product.business_id}`}
                    className="secondary-button inline-button"
                  >
                    View Seller Profile & Other Offerings →
                  </Link>
                </div>
              </div>
            )}
          </article>

          {/* Sidebar / Quick Inquiry Card */}
          <aside className="business-detail-card business-detail-sidebar">
            <div className="detail-block">
              <p className="eyebrow">Pricing</p>
              <h3 style={{ fontSize: '1.9rem', color: '#17614d', margin: '4px 0' }}>
                ₹{product.price.toLocaleString('en-IN')}
                {product.unit && (
                  <span
                    style={{
                      fontSize: '1rem',
                      fontWeight: 'normal',
                      color: 'rgba(23,63,58,0.7)',
                    }}
                  >
                    {' '}
                    / {product.unit}
                  </span>
                )}
              </h3>
              <p style={{ margin: '4px 0 0', color: 'rgba(23,63,58,0.7)', fontSize: '0.9rem' }}>
                Taxes and delivery charges may vary based on quantity and location.
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
              <p className="eyebrow">Sold By</p>
              <h3 style={{ margin: '4px 0 4px', fontSize: '1.25rem' }}>
                {business?.name || 'Local Hosur Business'}
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
                  ✓ Verified Hosur Supplier
                </span>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
                {phone && (
                  <a
                    href={`tel:${phone}`}
                    className="primary-button"
                    style={{ textAlign: 'center', width: '100%' }}
                  >
                    Call Supplier ({phone})
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
                    Chat on WhatsApp
                  </a>
                )}
                <Link
                  to={`/businesses/${product.business_id}`}
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
                Custom Requirements?
              </p>
              <p style={{ fontSize: '0.875rem', margin: '4px 0 12px', color: 'rgba(23,63,58,0.8)' }}>
                Need bulk orders, custom specifications, or quotes from multiple Hosur suppliers?
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
