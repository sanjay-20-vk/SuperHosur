import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BusinessGrid } from '../components/BusinessGrid'
import { CategorySection } from '../components/CategorySection'
import { EmptyState } from '../components/EmptyState'
import { Header } from '../components/Header'
import { HeroSearch } from '../components/HeroSearch'
import { LoadingState } from '../components/LoadingState'
import { HosurMap } from '../components/HosurMap'
import { getBusinesses, type BusinessSortOption, type BusinessSummary } from '../services/businesses'
import { getCategories, type CategorySummary } from '../services/categories'
import { getCities, type CityOption } from '../services/cities'

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const initialSearch = searchParams.get('q') ?? ''
  const initialCategory = searchParams.get('category') ?? null
  const initialCity = searchParams.get('city') ?? 'all'
  const initialSort = (searchParams.get('sort') as BusinessSortOption) || 'name_asc'
  const initialView = (searchParams.get('view') as 'grid' | 'map') || 'grid'

  const [businesses, setBusinesses] = useState<BusinessSummary[]>([])
  const [categories, setCategories] = useState<CategorySummary[]>([])
  const [cities, setCities] = useState<CityOption[]>([])
  const [searchValue, setSearchValue] = useState(initialSearch)
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(initialCategory)
  const [selectedCityId, setSelectedCityId] = useState<string>(initialCity)
  const [selectedSort, setSelectedSort] = useState<BusinessSortOption>(initialSort)
  const [viewMode, setViewMode] = useState<'grid' | 'map'>(initialView)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Debounce search query
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchValue.trim())
    }, 300)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [searchValue])

  // Sync URL search params
  useEffect(() => {
    const params = new URLSearchParams()
    if (debouncedSearch) params.set('q', debouncedSearch)
    if (selectedCategoryId) params.set('category', selectedCategoryId)
    if (selectedCityId && selectedCityId !== 'all') params.set('city', selectedCityId)
    if (selectedSort && selectedSort !== 'name_asc') params.set('sort', selectedSort)
    if (viewMode && viewMode !== 'grid') params.set('view', viewMode)
    setSearchParams(params, { replace: true })
  }, [debouncedSearch, selectedCategoryId, selectedCityId, selectedSort, viewMode, setSearchParams])

  // Load categories and cities
  useEffect(() => {
    let active = true

    async function loadTaxonomies() {
      try {
        const [categoryData, cityData] = await Promise.all([
          getCategories(),
          getCities(),
        ])

        if (!active) return

        setCategories(categoryData)
        setCities(cityData)
      } catch (loadError) {
        if (!active) return
        const message = loadError instanceof Error ? loadError.message : 'Unknown error'
        setError(message)
      }
    }

    loadTaxonomies()

    return () => {
      active = false
    }
  }, [])

  // Load businesses based on filters
  useEffect(() => {
    let active = true

    async function loadBusinesses() {
      try {
        setLoading(true)
        const businessData = await getBusinesses({
          search: debouncedSearch,
          categoryId: selectedCategoryId,
          cityId: selectedCityId !== 'all' ? selectedCityId : undefined,
          sortBy: selectedSort,
        })

        if (!active) return

        setBusinesses(businessData)
        setError(null)
      } catch (loadError) {
        if (!active) return
        const message = loadError instanceof Error ? loadError.message : 'Unknown error'
        setError(message)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadBusinesses()

    return () => {
      active = false
    }
  }, [debouncedSearch, selectedCategoryId, selectedCityId, selectedSort])

  const hasActiveFilters = Boolean(
    debouncedSearch ||
      selectedCategoryId ||
      selectedCityId !== 'all' ||
      selectedSort !== 'name_asc',
  )

  const activeCategoryName = categories.find((c) => c.id === selectedCategoryId)?.name
  const activeCityName = cities.find((c) => c.id === selectedCityId)?.name

  function resetAllFilters() {
    setSearchValue('')
    setDebouncedSearch('')
    setSelectedCategoryId(null)
    setSelectedCityId('all')
    setSelectedSort('name_asc')
  }

  function handleHeroSubmit() {
    const section = document.getElementById('marketplace-section')
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <>
      <Header />

      <section className="page-section hero-section" aria-labelledby="home-title">
        <div className="hero-copy">
          <div className="hero-pill-badge">
            <span className="hero-badge-dot" aria-hidden="true" />
            <span>Hosur Local Commerce &amp; Industry</span>
          </div>
          <h1 id="home-title">Discover businesses, products and services in Hosur.</h1>
          <p className="page-intro">
            SuperHosur connects local buyers with reliable businesses across the city,
            from everyday essentials to specialist services and industrial expertise.
          </p>

          <div className="hero-actions">
            <Link to="/requirements/new" className="primary-button hero-button">
              <span>Post a requirement</span>
              <span className="button-arrow" aria-hidden="true"> →</span>
            </Link>
            <Link to="/owner/onboarding" className="secondary-button hero-button">
              List your business
            </Link>
          </div>

          <div className="hero-trust-row" aria-label="Key marketplace features">
            <div className="hero-trust-item">
              <span className="trust-check" aria-hidden="true">✓</span>
              <span>Verified local vendors</span>
            </div>
            <div className="hero-trust-item">
              <span className="trust-check" aria-hidden="true">✓</span>
              <span>Direct vendor quotes</span>
            </div>
            <div className="hero-trust-item">
              <span className="trust-check" aria-hidden="true">✓</span>
              <span>GPS mapped discovery</span>
            </div>
          </div>
        </div>

        <HeroSearch
          value={searchValue}
          onChange={setSearchValue}
          onSubmit={handleHeroSubmit}
        />
      </section>

      <section id="marketplace-section" className="page-section marketplace-section">
        <CategorySection
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
        />

        <div className="marketplace-panel">
          <div className="section-header marketplace-header">
            <div>
              <p className="eyebrow">Local discovery</p>
              <h2>Trending in Hosur</h2>
              <p className="section-subheading">Verified local businesses, industrial suppliers, and service providers</p>
            </div>
            <div className="marketplace-header-controls">
              <div className="view-mode-switch" role="group" aria-label="Marketplace view mode">
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
              <span className="results-summary">
                {businesses.length} result{businesses.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          {/* Business Filters Toolbar */}
          <div className="catalog-toolbar" style={{ marginBottom: '16px' }} role="region" aria-label="Business filters">
            {cities.length > 0 && (
              <div className="catalog-availability-group">
                <label htmlFor="business-city-filter" className="catalog-filter-label">
                  Location:
                </label>
                <select
                  id="business-city-filter"
                  value={selectedCityId}
                  onChange={(e) => setSelectedCityId(e.target.value)}
                  className="catalog-sort-select"
                  aria-label="Filter businesses by location"
                >
                  <option value="all">All Locations</option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="catalog-sort-group">
              <label htmlFor="business-sort-filter" className="catalog-filter-label">
                Sort by:
              </label>
              <select
                id="business-sort-filter"
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value as BusinessSortOption)}
                className="catalog-sort-select"
                aria-label="Sort businesses"
              >
                <option value="name_asc">Name: A to Z</option>
                <option value="name_desc">Name: Z to A</option>
                <option value="newest">Newest First</option>
              </select>

              {hasActiveFilters && (
                <button
                  type="button"
                  className="catalog-reset-btn"
                  onClick={resetAllFilters}
                  aria-label="Reset all business filters"
                >
                  Reset all filters ✕
                </button>
              )}
            </div>
          </div>

          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <div className="catalog-active-bar" style={{ marginBottom: '20px' }} aria-label="Active business filters">
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
                {selectedCategoryId && activeCategoryName && (
                  <span className="catalog-active-tag">
                    <span>Category: {activeCategoryName}</span>
                    <button
                      type="button"
                      className="catalog-tag-remove-btn"
                      onClick={() => setSelectedCategoryId(null)}
                      aria-label="Remove category filter"
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
                {selectedSort !== 'name_asc' && (
                  <span className="catalog-active-tag">
                    <span>
                      Sort: {selectedSort === 'name_desc' ? 'Name Z-A' : 'Newest'}
                    </span>
                    <button
                      type="button"
                      className="catalog-tag-remove-btn"
                      onClick={() => setSelectedSort('name_asc')}
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

          {loading && <LoadingState message="Loading verified businesses..." />}

          {!loading && error && (
            <div className="state-panel error-state" aria-live="polite">
              <h3>Marketplace unavailable</h3>
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && businesses.length === 0 && (
            <EmptyState
              title="No matching businesses"
              message="No verified businesses match your selected filters. Try clearing some filters or check back as more businesses join."
              actionLabel="Reset all filters"
              onAction={resetAllFilters}
            />
          )}

          {!loading && !error && businesses.length > 0 && viewMode === 'map' && (
            <HosurMap
              markers={businesses
                .filter(
                  (b): b is typeof b & { latitude: number; longitude: number } =>
                    typeof b.latitude === 'number' && typeof b.longitude === 'number',
                )
                .map((b) => ({
                  id: b.id,
                  title: b.name,
                  type: 'business',
                  latitude: b.latitude,
                  longitude: b.longitude,
                  subtitle: categories.find((c) => c.id === b.category_id)?.name || null,
                  address: b.address,
                  link: `/businesses/${b.slug || b.id}`,
                }))}
              height="520px"
              title="Interactive Business Map — Hosur"
              emptyMessage="No businesses in this search currently have GPS coordinates mapped. Explore Hosur regional map above."
            />
          )}

          {!loading && !error && businesses.length > 0 && viewMode === 'grid' && (
            <BusinessGrid businesses={businesses} />
          )}
        </div>
      </section>
    </>
  )
}