import { Link } from 'react-router-dom'
import type { CatalogOffering } from '../services/supply'

type OfferingCardProps = {
  offering: CatalogOffering
}

function formatPrice(offering: CatalogOffering): string {
  if (offering.type === 'product') {
    const priceVal = offering.price !== undefined ? offering.price : 0
    const formatted = `₹${priceVal.toLocaleString('en-IN')}`
    return offering.unit ? `${formatted} / ${offering.unit}` : formatted
  }

  // Service
  const from = offering.price_from
  const to = offering.price_to
  const unit = offering.price_unit ? ` ${offering.price_unit}` : ''

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

export function OfferingCard({ offering }: OfferingCardProps) {
  const isProduct = offering.type === 'product'
  const detailLink = isProduct ? `/products/${offering.id}` : `/services/${offering.id}`
  const priceDisplay = formatPrice(offering)

  return (
    <Link to={detailLink} className="business-card-link catalog-offering-link">
      <article className="business-card offering-card" aria-label={offering.name}>
        <div className="offering-card__header">
          <div className="offering-card__badges">
            <span className={`offering-type-pill ${isProduct ? 'is-product' : 'is-service'}`}>
              <span className="offering-type-dot" aria-hidden="true" />
              {isProduct ? 'Product' : 'Service'}
            </span>
            {offering.subcategory ? (
              <span className="business-tag offering-taxonomy-tag">
                {offering.subcategory.name}
              </span>
            ) : offering.category ? (
              <span className="business-tag offering-taxonomy-tag">
                {offering.category.name}
              </span>
            ) : null}
          </div>

          {isProduct && offering.availability && (
            <span className={`offering-status-badge is-${offering.availability}`}>
              {offering.availability === 'available'
                ? 'In Stock'
                : offering.availability === 'limited'
                ? 'Limited Stock'
                : 'Out of Stock'}
            </span>
          )}
        </div>

        <h3 className="offering-card__title">{offering.name}</h3>

        <p className="offering-card__desc">
          {offering.description?.trim() || 'Quality offering available from verified local businesses in Hosur.'}
        </p>

        <div className="offering-card__price-box">
          <span className="offering-card__price-label">Price</span>
          <span className="offering-card__price-val">{priceDisplay}</span>
        </div>

        <div className="offering-card__footer">
          <div className="offering-card__provider">
            <span className="provider-name">{offering.business?.name || 'Hosur Local Business'}</span>
            <div className="provider-meta">
              {offering.business?.verified && (
                <span className="provider-verified-badge">
                  <span className="verified-check" aria-hidden="true">✓</span> Verified
                </span>
              )}
              {offering.business?.address && (
                <span className="provider-location">
                  📍 {offering.business.address.split(',')[0]}
                </span>
              )}
            </div>
          </div>
          <span className="offering-card__action" aria-hidden="true">
            View details <span className="action-arrow">→</span>
          </span>
        </div>
      </article>
    </Link>
  )
}

