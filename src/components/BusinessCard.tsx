import { Link } from 'react-router-dom'
import type { BusinessSummary } from '../services/businesses'

type BusinessCardProps = {
  business: BusinessSummary
}

export function BusinessCard({ business }: BusinessCardProps) {
  return (
    <Link to={`/businesses/${business.id}`} className="business-card-link">
      <article className="business-card" aria-label={business.name}>
        <div className="business-card__media" aria-hidden={!business.cover_photo_url}>
          {business.cover_photo_url ? (
            <img
              src={business.cover_photo_url}
              alt={business.cover_photo_alt || business.name}
              loading="lazy"
            />
          ) : (
            <div className="business-card__placeholder">
              <span className="placeholder-icon" aria-hidden="true">🏪</span>
              <span>Local listing</span>
            </div>
          )}
        </div>

        <div className="business-card__top">
          <span className="business-tag">Local business</span>
          <span className="business-status">Open to enquiries</span>
        </div>

        <h3>{business.name}</h3>
        <p className="business-card__text">
          {business.description?.trim() || 'Trusted marketplace listing in Hosur.'}
        </p>

        <div className="business-card__meta">
          <span className="business-card__location">
            <span className="meta-icon" aria-hidden="true">📍</span>
            <span>Hosur</span>
          </span>
          <span className="business-card__action">
            <span>View listing</span>
            <span className="meta-arrow" aria-hidden="true"> →</span>
          </span>
        </div>
      </article>
    </Link>
  )
}
