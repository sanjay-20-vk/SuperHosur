import { Link } from 'react-router-dom'
import type { PropertySummary } from '../services/properties'

type PropertyCardProps = {
  property: PropertySummary
}

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

export function PropertyCard({ property }: PropertyCardProps) {
  const listingBadge = formatListingType(property.listing_type)
  const typeBadge = formatPropertyType(property.property_type)

  const priceDisplay =
    property.listing_type === 'rent'
      ? `${formatCurrency(property.rent)} / month`
      : property.listing_type === 'lease'
      ? `${formatCurrency(property.rent ?? property.price)} lease`
      : formatCurrency(property.price)

  return (
    <Link to={`/properties/${property.id}`} className="business-card-link">
      <article className="business-card" aria-label={property.title}>
        <div className="business-card__media" aria-hidden={!property.cover_photo_url}>
          {property.cover_photo_url ? (
            <img src={property.cover_photo_url} alt={property.title} />
          ) : (
            <div className="business-card__placeholder">Property listing</div>
          )}
        </div>

        <div className="business-card__top">
          <span className="business-tag">{listingBadge}</span>
          <span className="business-status">{typeBadge}</span>
        </div>

        <h3>{property.title}</h3>

        <div className="property-specs" style={{ display: 'flex', gap: '12px', margin: '8px 0', fontSize: '0.9rem', color: 'rgba(23, 63, 58, 0.8)' }}>
          {property.bedrooms !== null && (
            <span><strong>{property.bedrooms}</strong> BHK</span>
          )}
          {property.bathrooms !== null && (
            <span><strong>{property.bathrooms}</strong> Baths</span>
          )}
          {property.area_sqft !== null && (
            <span><strong>{property.area_sqft}</strong> sq.ft</span>
          )}
        </div>

        <p className="business-card__text" style={{ margin: '6px 0 14px', fontWeight: 600, color: '#17614d', fontSize: '1.1rem' }}>
          {priceDisplay}
        </p>

        <div className="business-card__meta">
          <span>{property.cities?.name || 'Hosur'}</span>
          <span>{property.verified ? 'Verified' : 'Pending'}</span>
        </div>
      </article>
    </Link>
  )
}
