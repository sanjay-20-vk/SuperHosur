import { BusinessCard } from './BusinessCard'
import type { BusinessSummary } from '../services/businesses'

type BusinessGridProps = {
  businesses: BusinessSummary[]
}

export function BusinessGrid({ businesses }: BusinessGridProps) {
  return (
    <div className="business-grid" aria-label="Businesses in the marketplace">
      {businesses.map((business) => (
        <BusinessCard key={business.id} business={business} />
      ))}
    </div>
  )
}
