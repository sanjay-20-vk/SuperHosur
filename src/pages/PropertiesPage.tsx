import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Header } from '../components/Header'
import { LoadingState } from '../components/LoadingState'
import { EmptyState } from '../components/EmptyState'
import { PropertyCard } from '../components/PropertyCard'
import { HosurMap } from '../components/HosurMap'
import { getCities, type CityOption } from '../services/cities'
import {
  getPublicProperties,
  type ListingType,
  type PropertySortOption,
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
  const [searchParams, setSearchParams] = useSearchParams()

  const initialSearch = searchParams.get('q') ?? ''
  const initialListing = (searchParams.get('listing') as ListingType | 'all') || 'all'
  const initialType = (searchParams.get('type') as PropertyType | 'all') || 'all'
  const initialCity = searchParams.get('city') ?? 'all'
  const initialBedsRaw = searchParams.get('beds')
  const initialBeds: number | 'all' =
    initialBedsRaw && initialBedsRaw !== 'all' && !isNaN(Number(initialBedsRaw))
      ? Number(initialBedsRaw)
      : 'all'
  const initialSort = (searchParams.get('sort') as PropertySortOption) || 'newest'
  const initialView = (searchParams.get('view') as 'grid' | 'map') || 'grid'

  const [properties, setProperties] = useState<PropertySummary[]>([])
  const [cities, setCities] = useState<CityOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchValue, setSearchValue] = useState(initialSearch)
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch)
  const [selectedListingType, setSelectedListingType] = useState<ListingType | 'all'>(initialListing)
  const [selectedPropertyType, setSelectedPropertyType] = useState<PropertyType | 'all'>(initialType)
  const [selectedCityId, setSelectedCityId] = useState<string>(initialCity)
  const [selectedBedrooms, setSelectedBedrooms] = useState<number | 'all'>(initialBeds)
  const [selectedSort, setSelectedSort] = useState<PropertySortOption>(initialSort)
  const [viewMode, setViewMode] = useState<'grid' | 'map'>(initialView)

  // Debounce search input
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchValue.trim())
    }, 300)
    return () => window.clearTimeout(timer)
  }, [searchValue])

  // Sync URL search params
  useEffect(() => {
    const params = new URLSearchParams()
    if (debouncedSearch) params.set('q', debouncedSearch)
    if (selectedListingType !== 'all') params.set('listing', selectedListingType)
    if (selectedPropertyType !== 'all') params.set('type', selectedPropertyType)
    if (selectedCityId !== 'all') params.set('city', selectedCityId)
    if (selectedBedrooms !== 'all') params.set('beds', String(selectedBedrooms))
    if (selectedSort !== 'newest') params.set('sort', selectedSort)
    if (viewMode !== 'grid') params.set('view', viewMode)
    setSearchParams(params, { replace: true })
  }, [debouncedSearch, selectedListingType, selectedPropertyType, selectedCityId, selectedBedrooms, selectedSort, viewMode, setSearchParams])

  // Load cities
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

  // Load properties based on filters
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
          sortBy: selectedSort,
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
  }, [debouncedSearch, selectedListingType, selectedPropertyType, selectedCityId, selectedBedrooms, selectedSort])

  const hasActiveFilters = Boolean(
    debouncedSearch ||
      selectedListingType !== 'all' ||
      selectedPropertyType !== 'all' ||
      selectedCityId !== 'all' ||
      selectedBedrooms !== 'all' ||
      selectedSort !== 'newest',
  )

  const activeCityName = cities.find((c) => c.id === selectedCityId)?.name
  const activeListingLabel = LISTING_TYPE_OPTIONS.find((l) => l.value === selectedListingType)?.label
  const activePropertyTypeLabel = PROPERTY_TYPE_OPTIONS.find((p) => p.value === selectedPropertyType)?.label

  function resetAllFilters() {
    setSearchValue('')
    setDebouncedSearch('')
    setSelectedListingType('all')
    setSelectedPropertyType('all')
    setSelectedCityId('all')
    setSelectedBedrooms('all')
    setSelectedSort('newest')
  }

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

        <div className="catalog-search-panel" role="search" aria-label="Search properties" style={{ marginTop: '24px' }}>
          <div className="search-input-wrap">
            <svg
              className="search-icon-svg"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              maxLength={100}
              enterKeyHint="search"
              placeholder="Search by location, landmark, project or title..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="hero-search__input"
              aria-label="Search properties"
            />
            {searchValue && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchValue('')}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {debouncedSearch && (
            <div className="catalog-search-status" aria-live="polite">
              <span>
                Searching for: <strong>“{debouncedSearch}”</strong>
              </span>
              <button
                type="button"
                className="search-clear-chip"
                onClick={() => setSearchValue('')}
                aria-label="Clear search query"
              >
                Clear query ✕
              </button>
            </div>
          )}
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
                aria-pressed={selectedListingType === item.value}
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
                aria-pressed={selectedPropertyType === item.value}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Additional Filter Row: Bedrooms, City & Sorting */}
          <div className="catalog-toolbar">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className="catalog-filter-label">Bedrooms:</span>
                {BEDROOM_OPTIONS.map((bed) => (
                  <button
                    type="button"
                    key={String(bed.value)}
                    className={selectedBedrooms === bed.value ? 'category-pill active' : 'category-pill'}
                    style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                    onClick={() => setSelectedBedrooms(bed.value as number | 'all')}
                    aria-pressed={selectedBedrooms === bed.value}
                  >
                    {bed.label}
                  </button>
                ))}
              </div>

              {cities.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label htmlFor="property-city-filter" className="catalog-filter-label">
                    Location:
                  </label>
                  <select
                    id="property-city-filter"
                    value={selectedCityId}
                    onChange={(e) => setSelectedCityId(e.target.value)}
                    className="catalog-sort-select"
                    aria-label="Filter properties by location"
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

            <div className="catalog-sort-group">
              <label htmlFor="property-sort-filter" className="catalog-filter-label">
                Sort by:
              </label>
              <select
                id="property-sort-filter"
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value as PropertySortOption)}
                className="catalog-sort-select"
                aria-label="Sort properties"
              >
                <option value="newest">Newest First</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="area_desc">Largest Area</option>
              </select>

              {hasActiveFilters && (
                <button
                  type="button"
                  className="catalog-reset-btn"
                  onClick={resetAllFilters}
                  aria-label="Reset all property filters"
                >
                  Reset all filters ✕
                </button>
              )}
            </div>
          </div>

          {/* Active Filter Chips Bar */}
          {hasActiveFilters && (
            <div className="catalog-active-bar" aria-label="Active property filters">
              <div className="catalog-active-tags">
                <span className="catalog-filter-label" style={{ marginRight: '4px' }}>
                  Active:
                </span>
                {debouncedSearch && (
                  <span className="catalog-active-tag">
                    <span>Search: “{debouncedSearch}”</span>
                    <button
                      type="button"
                      className="catalog-tag-remove-btn"
                      onClick={() => setSearchValue('')}
                      aria-label="Remove search filter"
                    >
                      ✕
                    </button>
                  </span>
                )}
                {selectedListingType !== 'all' && (
                  <span className="catalog-active-tag">
                    <span>Listing: {activeListingLabel}</span>
                    <button
                      type="button"
                      className="catalog-tag-remove-btn"
                      onClick={() => setSelectedListingType('all')}
                      aria-label="Remove listing type filter"
                    >
                      ✕
                    </button>
                  </span>
                )}
                {selectedPropertyType !== 'all' && (
                  <span className="catalog-active-tag">
                    <span>Type: {activePropertyTypeLabel}</span>
                    <button
                      type="button"
                      className="catalog-tag-remove-btn"
                      onClick={() => setSelectedPropertyType('all')}
                      aria-label="Remove property type filter"
                    >
                      ✕
                    </button>
                  </span>
                )}
                {selectedCityId !== 'all' && activeCityName && (
                  <span className="catalog-active-tag">
                    <span>Location: {activeCityName}</span>
                    <button
                      type="button"
                      className="catalog-tag-remove-btn"
                      onClick={() => setSelectedCityId('all')}
                      aria-label="Remove location filter"
                    >
                      ✕
                    </button>
                  </span>
                )}
                {selectedBedrooms !== 'all' && (
                  <span className="catalog-active-tag">
                    <span>Bedrooms: {selectedBedrooms} BHK</span>
                    <button
                      type="button"
                      className="catalog-tag-remove-btn"
                      onClick={() => setSelectedBedrooms('all')}
                      aria-label="Remove bedrooms filter"
                    >
                      ✕
                    </button>
                  </span>
                )}
                {selectedSort !== 'newest' && (
                  <span className="catalog-active-tag">
                    <span>
                      Sort:{' '}
                      {selectedSort === 'price_asc'
                        ? 'Price Low-High'
                        : selectedSort === 'price_desc'
                        ? 'Price High-Low'
                        : 'Largest Area'}
                    </span>
                    <button
                      type="button"
                      className="catalog-tag-remove-btn"
                      onClick={() => setSelectedSort('newest')}
                      aria-label="Reset sort order"
                    >
                      ✕
                    </button>
                  </span>
                )}
              </div>
              <button
                type="button"
                className="catalog-reset-btn"
                onClick={resetAllFilters}
                aria-label="Clear all active filters"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <LoadingState message="Loading properties in Hosur..." />
        ) : error ? (
          <div className="state-panel error-state" aria-live="polite">
            <h3>Unable to load properties</h3>
            <p>{error}</p>
          </div>
        ) : properties.length === 0 ? (
          <EmptyState
            title="No properties found"
            message="We couldn't find any verified properties matching your filters. Try clearing some filters or check back soon."
            actionLabel="Reset all filters"
            onAction={resetAllFilters}
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
