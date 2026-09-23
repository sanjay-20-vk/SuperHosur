import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Header } from '../components/Header'
import { OfferingCard } from '../components/OfferingCard'
import { getCategories, getSubcategories, type CategorySummary, type SubcategorySummary } from '../services/categories'
import {
  getCatalogOfferings,
  type CatalogFilterOptions,
  type CatalogOffering,
  type OfferingType,
} from '../services/supply'

function sanitizeSearchQuery(query: string): string {
  if (typeof query !== 'string') return ''
  const trimmed = query.trim()
  if (!trimmed) return ''
  return trimmed.slice(0, 100)
}

const TYPE_OPTIONS: { label: string; value: 'all' | OfferingType }[] = [
  { label: 'All Offerings', value: 'all' },
  { label: 'Products', value: 'product' },
  { label: 'Services', value: 'service' },
]

const AVAILABILITY_OPTIONS: { label: string; value: 'all' | 'available' | 'limited' }[] = [
  { label: 'All Availability', value: 'all' },
  { label: 'In Stock', value: 'available' },
  { label: 'Limited Stock', value: 'limited' },
]

export function CatalogPage() {
  const [searchParams] = useSearchParams()
  const initialSearch = sanitizeSearchQuery(searchParams.get('q') ?? '')

  const [offerings, setOfferings] = useState<CatalogOffering[]>([])
  const [categories, setCategories] = useState<CategorySummary[]>([])
  const [subcategories, setSubcategories] = useState<SubcategorySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchValue, setSearchValue] = useState(initialSearch)
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch)
  const [selectedType, setSelectedType] = useState<'all' | OfferingType>('all')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null)
  const [selectedAvailability, setSelectedAvailability] = useState<'all' | 'available' | 'limited'>('all')
  const [selectedSort, setSelectedSort] = useState<CatalogFilterOptions['sortBy']>('newest')

  const displayedSubcategories = selectedCategoryId ? subcategories : []

  // Debounce search input
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(sanitizeSearchQuery(searchValue))
    }, 300)
    return () => window.clearTimeout(timer)
  }, [searchValue])

  // Load categories
  useEffect(() => {
    async function loadCategories() {
      try {
        const catRows = await getCategories()
        setCategories(catRows)
      } catch (err) {
        console.error('Failed to load categories:', err)
      }
    }
    loadCategories()
  }, [])

  // Load subcategories when category changes
  useEffect(() => {
    if (!selectedCategoryId) {
      return
    }

    let active = true
    async function loadSubcategories(catId: string) {
      try {
        const rows = await getSubcategories(catId)
        if (active) {
          setSubcategories(rows)
        }
      } catch (err) {
        console.error('Failed to load subcategories for category:', err)
      }
    }

    loadSubcategories(selectedCategoryId)
    return () => {
      active = false
    }
  }, [selectedCategoryId])

  // Load catalog offerings
  useEffect(() => {
    let active = true

    async function loadOfferings() {
      try {
        setLoading(true)
        setError(null)
        const data = await getCatalogOfferings({
          search: debouncedSearch,
          type: selectedType,
          categoryId: selectedCategoryId,
          subcategoryId: selectedSubcategoryId,
          availability: selectedAvailability,
          sortBy: selectedSort,
        })
        if (!active) return
        setOfferings(data)
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Unable to load catalog offerings.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadOfferings()

    return () => {
      active = false
    }
  }, [debouncedSearch, selectedType, selectedCategoryId, selectedSubcategoryId, selectedAvailability, selectedSort])

  const hasActiveFilters = Boolean(
    debouncedSearch ||
      selectedCategoryId ||
      selectedSubcategoryId ||
      selectedType !== 'all' ||
      selectedAvailability !== 'all' ||
      selectedSort !== 'newest',
  )

  const activeCategoryName = categories.find((c) => c.id === selectedCategoryId)?.name
  const activeSubcategoryName = subcategories.find((s) => s.id === selectedSubcategoryId)?.name

  function resetAllFilters() {
    setSearchValue('')
    setSelectedType('all')
    setSelectedCategoryId(null)
    setSelectedSubcategoryId(null)
    setSubcategories([])
    setSelectedAvailability('all')
    setSelectedSort('newest')
  }

  return (
    <>
      <Header />

      {/* 3. Catalog Page Hero */}
      <section className="page-section hero-section" aria-labelledby="catalog-title">
        <div className="hero-copy">
          <div className="hero-pill-badge">
            <span className="pulse-dot" aria-hidden="true" />
            <span>SuperHosur Marketplace</span>
          </div>

          <h1 id="catalog-title">Discover businesses, products &amp; services</h1>
          <p className="page-intro">
            Explore verified local suppliers, industrial equipment, professional services,
            and specialized manufacturing across Hosur.
          </p>

          <div className="hero-actions">
            <Link to="/requirements/new" className="primary-button hero-button">
              Post requirement
            </Link>
            <Link to="/owner/onboarding" className="secondary-button hero-button">
              List your business
            </Link>
          </div>
        </div>

        {/* 2. Search Input UX in Catalog Header */}
        <div className="catalog-search-panel" role="search" aria-label="Catalog search">
          <div className="search-panel-header">
            <label htmlFor="catalog-search" className="search-label">
              Find products, services &amp; equipment
            </label>
            <span className="search-badge">Live Catalog</span>
          </div>

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
              id="catalog-search"
              type="search"
              maxLength={100}
              enterKeyHint="search"
              autoCapitalize="none"
              autoCorrect="off"
              placeholder="Search products, services, or provider businesses in Hosur..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="hero-search__input"
              aria-label="Search catalog offerings"
            />
            {searchValue && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchValue('')}
                aria-label="Clear search query"
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

      {/* 5. Filter Experience & Browsing Section */}
      <section className="page-section" style={{ paddingTop: 0 }} aria-label="Marketplace offerings catalog">
        <div className="catalog-filter-card" role="region" aria-label="Marketplace filters">
          {/* Top Row: Offering Type Tabs */}
          <div className="catalog-type-tabs" role="tablist" aria-label="Filter by offering type">
            {TYPE_OPTIONS.map((item) => {
              const isSelected = selectedType === item.value
              return (
                <button
                  type="button"
                  key={item.value}
                  role="tab"
                  className={`catalog-type-tab ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedType(item.value)}
                  aria-selected={isSelected}
                  aria-pressed={isSelected}
                >
                  <span className="tab-icon" aria-hidden="true">
                    {item.value === 'all' ? '📦' : item.value === 'product' ? '🏷️' : '⚙️'}
                  </span>
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>

          {/* 11. Category Discovery Strip */}
          {categories.length > 0 && (
            <div className="catalog-strip-group">
              <div className="catalog-strip-header">
                <span className="catalog-strip-title">Categories</span>
                {selectedCategoryId && (
                  <button
                    type="button"
                    className="catalog-reset-btn"
                    onClick={() => {
                      setSelectedCategoryId(null)
                      setSelectedSubcategoryId(null)
                      setSubcategories([])
                    }}
                    aria-label="View all categories"
                  >
                    View all categories
                  </button>
                )}
              </div>
              <div className="catalog-category-strip" role="group" aria-label="Filter by category">
                <button
                  type="button"
                  className={selectedCategoryId === null ? 'category-pill active' : 'category-pill'}
                  onClick={() => {
                    setSelectedCategoryId(null)
                    setSelectedSubcategoryId(null)
                    setSubcategories([])
                  }}
                  aria-pressed={selectedCategoryId === null}
                >
                  All Categories
                </button>
                {categories.map((cat) => {
                  const isSelected = selectedCategoryId === cat.id
                  return (
                    <button
                      type="button"
                      key={cat.id}
                      className={isSelected ? 'category-pill active' : 'category-pill'}
                      onClick={() => {
                        setSelectedCategoryId(cat.id)
                        setSelectedSubcategoryId(null)
                      }}
                      aria-pressed={isSelected}
                    >
                      {cat.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* 11. Subcategories Horizontal Scroll (when category is selected) */}
          {selectedCategoryId !== null && displayedSubcategories.length > 0 && (
            <div
              className="catalog-subcategory-panel"
              role="group"
              aria-label="Filter by subcategory"
            >
              <div className="catalog-strip-header">
                <span className="catalog-strip-title">
                  {activeCategoryName} Subcategories ({displayedSubcategories.length})
                </span>
                {selectedSubcategoryId && (
                  <button
                    type="button"
                    className="catalog-reset-btn"
                    onClick={() => setSelectedSubcategoryId(null)}
                    aria-label="Show all subcategories"
                  >
                    Show all subcategories
                  </button>
                )}
              </div>
              <div className="catalog-subcategory-strip">
                <button
                  type="button"
                  className={`catalog-subcategory-pill ${selectedSubcategoryId === null ? 'active' : ''}`}
                  onClick={() => setSelectedSubcategoryId(null)}
                  aria-pressed={selectedSubcategoryId === null}
                >
                  All {activeCategoryName}
                </button>
                {displayedSubcategories.map((sub) => {
                  const isSubSelected = selectedSubcategoryId === sub.id
                  return (
                    <button
                      type="button"
                      key={sub.id}
                      className={`catalog-subcategory-pill ${isSubSelected ? 'active' : ''}`}
                      onClick={() => setSelectedSubcategoryId(sub.id)}
                      aria-pressed={isSubSelected}
                    >
                      {sub.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* 7. Secondary Toolbar: Availability & Sort */}
          <div className="catalog-toolbar">
            {selectedType !== 'service' && (
              <div className="catalog-availability-group" role="group" aria-label="Stock availability filter">
                <span className="catalog-filter-label">Availability:</span>
                {AVAILABILITY_OPTIONS.map((avail) => {
                  const isSelected = selectedAvailability === avail.value
                  return (
                    <button
                      type="button"
                      key={avail.value}
                      className={isSelected ? 'category-pill active' : 'category-pill'}
                      style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                      onClick={() => setSelectedAvailability(avail.value)}
                      aria-pressed={isSelected}
                    >
                      {avail.label}
                    </button>
                  )
                })}
              </div>
            )}

            <div className="catalog-sort-group">
              <label htmlFor="sort-filter" className="catalog-filter-label">
                Sort by:
              </label>
              <select
                id="sort-filter"
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value as CatalogFilterOptions['sortBy'])}
                className="catalog-sort-select"
                aria-label="Sort catalog offerings"
              >
                <option value="newest">Newest First</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="name">Name: A to Z</option>
              </select>
            </div>
          </div>

          {/* 6. Active Filter Chips with Individual Remove Actions */}
          {hasActiveFilters && (
            <div className="catalog-active-bar" aria-label="Active filters">
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
                {selectedType !== 'all' && (
                  <span className="catalog-active-tag">
                    <span>Type: {selectedType === 'product' ? 'Products' : 'Services'}</span>
                    <button
                      type="button"
                      className="catalog-tag-remove-btn"
                      onClick={() => setSelectedType('all')}
                      aria-label="Remove type filter"
                    >
                      ✕
                    </button>
                  </span>
                )}
                {activeCategoryName && (
                  <span className="catalog-active-tag">
                    <span>Category: {activeCategoryName}</span>
                    <button
                      type="button"
                      className="catalog-tag-remove-btn"
                      onClick={() => {
                        setSelectedCategoryId(null)
                        setSelectedSubcategoryId(null)
                        setSubcategories([])
                      }}
                      aria-label="Remove category filter"
                    >
                      ✕
                    </button>
                  </span>
                )}
                {activeSubcategoryName && (
                  <span className="catalog-active-tag">
                    <span>Subcategory: {activeSubcategoryName}</span>
                    <button
                      type="button"
                      className="catalog-tag-remove-btn"
                      onClick={() => setSelectedSubcategoryId(null)}
                      aria-label="Remove subcategory filter"
                    >
                      ✕
                    </button>
                  </span>
                )}
                {selectedAvailability !== 'all' && (
                  <span className="catalog-active-tag">
                    <span>
                      Availability: {selectedAvailability === 'available' ? 'In Stock' : 'Limited Stock'}
                    </span>
                    <button
                      type="button"
                      className="catalog-tag-remove-btn"
                      onClick={() => setSelectedAvailability('all')}
                      aria-label="Remove availability filter"
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
                        ? 'Price: Low to High'
                        : selectedSort === 'price_desc'
                        ? 'Price: High to Low'
                        : 'Name: A to Z'}
                    </span>
                    <button
                      type="button"
                      className="catalog-tag-remove-btn"
                      onClick={() => setSelectedSort('newest')}
                      aria-label="Reset sort to newest"
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
                aria-label="Reset all filters and search"
              >
                Clear all filters ✕
              </button>
            </div>
          )}
        </div>

        {/* 4. Search Result Summary */}
        <div className="catalog-results-header">
          <div className="catalog-results-count">
            <span>Marketplace Offerings</span>
            {!loading && (
              <span className="catalog-results-pill" role="status" aria-live="polite">
                {offerings.length} {offerings.length === 1 ? 'result found' : 'results found'}
              </span>
            )}
          </div>
        </div>

        {/* 10. Loading State Skeletons */}
        {loading ? (
          <div className="catalog-skeleton-grid" aria-label="Loading catalog offerings" aria-busy="true">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="catalog-skeleton-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                  <div className="skeleton-shimmer" style={{ width: '80px', height: '22px' }} />
                  <div className="skeleton-shimmer" style={{ width: '60px', height: '22px' }} />
                </div>
                <div className="skeleton-shimmer" style={{ width: '85%', height: '24px', marginTop: '6px' }} />
                <div className="skeleton-shimmer" style={{ width: '100%', height: '16px' }} />
                <div className="skeleton-shimmer" style={{ width: '70%', height: '16px' }} />
                <div className="skeleton-shimmer" style={{ width: '100%', height: '42px', marginTop: '8px' }} />
                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="skeleton-shimmer" style={{ width: '110px', height: '18px' }} />
                  <div className="skeleton-shimmer" style={{ width: '80px', height: '18px' }} />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="state-panel error-state" role="alert">
            <h3>Unable to load catalog</h3>
            <p>{error}</p>
          </div>
        ) : offerings.length === 0 ? (
          /* 9. Premium Empty Search State */
          <div className="catalog-empty-panel">
            <div className="catalog-empty-icon-circle" aria-hidden="true">
              🔍
            </div>
            <h2 className="catalog-empty-heading">No matches found</h2>
            <p className="catalog-empty-text">
              {hasActiveFilters
                ? 'No products or services match your current search or filters. Try adjusting your query or resetting your active filters.'
                : 'No products or services are currently listed in the catalog. Check back soon or list your business.'}
            </p>
            <div className="catalog-empty-actions">
              {hasActiveFilters ? (
                <button
                  type="button"
                  className="primary-button inline-button"
                  onClick={resetAllFilters}
                >
                  Clear filters
                </button>
              ) : (
                <Link to="/" className="primary-button inline-button">
                  Browse Marketplace
                </Link>
              )}
              <Link to="/requirements/new" className="secondary-button inline-button">
                Post a requirement
              </Link>
            </div>
          </div>
        ) : (
          /* 8. Result Cards Grid */
          <div className="business-grid" aria-label="Catalog offerings">
            {offerings.map((offering) => (
              <OfferingCard key={`${offering.type}-${offering.id}`} offering={offering} />
            ))}
          </div>
        )}
      </section>
    </>
  )
}
