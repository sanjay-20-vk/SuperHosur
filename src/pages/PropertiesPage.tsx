import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Header } from '../components/Header'
import { LoadingState } from '../components/LoadingState'
import { EmptyState } from '../components/EmptyState'
import { PropertyCard } from '../components/PropertyCard'
import { HosurMap } from '../components/HosurMap'
import { getCities, type CityOption } from '../services/cities'
import {
  getPublicProperties,
  type ListingType,
  type PropertySummary,
  type PropertyType,
} from '../services/properties'

const LISTING_TYPE_OPTIONS: { label: string; value: ListingType | 'all' }[] = [
  { label: 'All Listings', value: 'all' },
  { label: 'For Sale', value: 'sale' },
  { label: 'For Rent', value: 'rent' },
  { label: 'For Lease', value: 'lease' },
]

const PROPERTY_TYPE_OPTIONS: { label: string; value: PropertyType | 'all' }[] = [
  { label: 'All Types', value: 'all' },
  { label: 'Apartment', value: 'apartment' },
  { label: 'House', value: 'house' },
  { label: 'Villa', value: 'villa' },
  { label: 'Plot', value: 'plot' },
  { label: 'Commercial', value: 'commercial' },
  { label: 'Office', value: 'office' },
  { label: 'Shop', value: 'shop' },
  { label: 'Warehouse', value: 'warehouse' },
  { label: 'Land', value: 'land' },
]

const BEDROOM_OPTIONS = [
  { label: 'Any Beds', value: 'all' },
  { label: '1 BHK', value: 1 },
  { label: '2 BHK', value: 2 },
  { label: '3 BHK', value: 3 },
  { label: '4+ BHK', value: 4 },
]

export function PropertiesPage() {
  const [properties, setProperties] = useState<PropertySummary[]>([])
  const [cities, setCities] = useState<CityOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchValue, setSearchValue] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedListingType, setSelectedListingType] = useState<ListingType | 'all'>('all')
  const [selectedPropertyType, setSelectedPropertyType] = useState<PropertyType | 'all'>('all')
  const [selectedCityId, setSelectedCityId] = useState<string>('all')
  const [selectedBedrooms, setSelectedBedrooms] = useState<number | 'all'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid')

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchValue)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [searchValue])

  useEffect(() => {
    async function loadCities() {
      try {
        const cityRows = await getCities()
        setCities(cityRows)
      } catch (err) {
        console.error('Failed to load cities:', err)
      }
    }
    loadCities()
  }, [])

  useEffect(() => {
    let active = true

    async function loadProperties() {
      try {
        setLoading(true)
        setError(null)
        const data = await getPublicProperties({
          search: debouncedSearch,
          listingType: selectedListingType,
          propertyType: selectedPropertyType,
          cityId: selectedCityId !== 'all' ? selectedCityId : undefined,
          bedrooms: selectedBedrooms,
        })
        if (!active) return
        setProperties(data)
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Unable to load properties.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadProperties()

    return () => {
      active = false
    }
  }, [debouncedSearch, selectedListingType, selectedPropertyType, selectedCityId, selectedBedrooms])

  return (
    <>
      <Header />

      <section className="page-section hero-section" aria-labelledby="properties-title">
        <div className="hero-copy">
          <p className="eyebrow">Real Estate & Properties in Hosur</p>
          <h1 id="properties-title">Buy, Rent, or Lease Verified Properties</h1>
          <p className="page-intro">
            Explore verified residential apartments, independent houses, commercial spaces, and plots
            directly from owners and trusted agents across Hosur.
          </p>

          <div className="hero-actions">
            <Link to="/owner/properties/create" className="primary-button hero-button">
              List your property
            </Link>
            <Link to="/requirements/new" className="secondary-button hero-button">
              Post requirement
            </Link>
          </div>
        </div>

        <div className="hero-search" style={{ marginTop: '24px' }}>
          <input
            type="search"
            placeholder="Search by location, landmark, project or title..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="hero-search__input"
            aria-label="Search properties"
          />
        </div>
      </section>

      <section className="page-section" style={{ paddingTop: 0 }}>
        {/* Filter Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
          {/* Listing Type Pills */}
          <div className="category-grid" role="group" aria-label="Listing type">
            {LISTING_TYPE_OPTIONS.map((item) => (
              <button
                type="button"
                key={item.value}
                className={selectedListingType === item.value ? 'category-pill active' : 'category-pill'}
                onClick={() => setSelectedListingType(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Property Type Pills */}
          <div className="category-grid" role="group" aria-label="Property type">
            {PROPERTY_TYPE_OPTIONS.map((item) => (
              <button
                type="button"
                key={item.value}
                className={selectedPropertyType === item.value ? 'category-pill active' : 'category-pill'}
                onClick={() => setSelectedPropertyType(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Additional Filter Row: Bedrooms & City */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'rgba(23, 63, 58, 0.8)' }}>Bedrooms:</span>
              {BEDROOM_OPTIONS.map((bed) => (
                <button
                  type="button"
                  key={String(bed.value)}
                  className={selectedBedrooms === bed.value ? 'category-pill active' : 'category-pill'}
                  style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                  onClick={() => setSelectedBedrooms(bed.value as number | 'all')}
                >
                  {bed.label}
                </button>
              ))}
            </div>

            {cities.length > 0 && (
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label htmlFor="city-filter" style={{ fontSize: '0.9rem', fontWeight: 600, color: 'rgba(23, 63, 58, 0.8)' }}>
                  Location:
                </label>
                <select
                  id="city-filter"
                  value={selectedCityId}
                  onChange={(e) => setSelectedCityId(e.target.value)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '999px',
                    border: '1px solid rgba(24, 59, 52, 0.15)',
                    background: '#fff',
                    fontWeight: 600,
                    color: '#173f3a',
                  }}
                >
                  <option value="all">All Cities</option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <LoadingState message="Loading properties in Hosur..." />
        ) : error ? (
          <div className="state-panel error-state">
            <h3>Unable to load properties</h3>
            <p>{error}</p>
          </div>
        ) : properties.length === 0 ? (
          <EmptyState
            title="No properties found"
            message="We couldn't find any verified properties matching your filters. Try clearing some filters or check back soon."
          />
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 16px', flexWrap: 'wrap', gap: '12px' }}>
              <p style={{ margin: 0, fontSize: '0.95rem', color: 'rgba(23, 63, 58, 0.75)' }}>
                Showing <strong>{properties.length}</strong> verified properties
              </p>
              <div className="view-mode-switch" role="group" aria-label="Properties view mode">
                <button
                  type="button"
                  className={viewMode === 'grid' ? 'view-mode-btn active' : 'view-mode-btn'}
                  onClick={() => setViewMode('grid')}
                >
                  ▦ Grid View
                </button>
                <button
                  type="button"
                  className={viewMode === 'map' ? 'view-mode-btn active' : 'view-mode-btn'}
                  onClick={() => setViewMode('map')}
                >
                  🗺 Map View
                </button>
              </div>
            </div>

            {viewMode === 'map' ? (
              <HosurMap
                markers={properties
                  .filter(
                    (p): p is typeof p & { latitude: number; longitude: number } =>
                      typeof p.latitude === 'number' && typeof p.longitude === 'number',
                  )
                  .map((p) => ({
                    id: p.id,
                    title: p.title,
                    type: 'property',
                    latitude: p.latitude,
                    longitude: p.longitude,
                    subtitle: `${p.property_type.toUpperCase()} • ${p.listing_type.toUpperCase()}`,
                    address: [p.address, p.cities?.name].filter(Boolean).join(', ') || null,
                    price: p.price
                      ? `₹${p.price.toLocaleString('en-IN')}`
                      : p.rent
                      ? `₹${p.rent.toLocaleString('en-IN')}/mo`
                      : null,
                    link: `/properties/${p.id}`,
                  }))}
                height="520px"
                title="Verified Real Estate & Properties Map"
                emptyMessage="No properties currently have GPS coordinates mapped in this view. Explore Hosur regional map above."
              />
            ) : (
              <div className="business-grid">
                {properties.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </>
  )
}
