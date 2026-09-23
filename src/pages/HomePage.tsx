import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BusinessGrid } from '../components/BusinessGrid'
import { CategorySection } from '../components/CategorySection'
import { EmptyState } from '../components/EmptyState'
import { Header } from '../components/Header'
import { HeroSearch } from '../components/HeroSearch'
import { LoadingState } from '../components/LoadingState'
import { HosurMap } from '../components/HosurMap'
import { getBusinesses, type BusinessSummary } from '../services/businesses'
import { getCategories, type CategorySummary } from '../services/categories'

export function HomePage() {
  const navigate = useNavigate()
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([])
  const [categories, setCategories] = useState<CategorySummary[]>([])
  const [searchValue, setSearchValue] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchValue.trim())
    }, 300)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [searchValue])

  useEffect(() => {
    let active = true

    async function loadCategories() {
      try {
        const categoryData = await getCategories()

        if (!active) {
          return
        }

        setCategories(categoryData)
      } catch (loadError) {
        if (!active) {
          return
        }

        const message =
          loadError instanceof Error ? loadError.message : 'Unknown error'
        setError(message)
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadCategories()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true

    async function loadBusinesses() {
      try {
        const businessData = await getBusinesses({
          search: debouncedSearch,
          categoryId: selectedCategoryId,
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
  }, [debouncedSearch, selectedCategoryId])

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
          onSubmit={() => {
            const q = searchValue.trim()
            navigate(q ? `/catalog?q=${encodeURIComponent(q)}` : '/catalog')
          }}
        />
      </section>

      <section className="page-section marketplace-section">
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

          {loading && <LoadingState />}

          {!loading && error && (
            <div className="state-panel error-state" aria-live="polite">
              <h3>Marketplace unavailable</h3>
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && businesses.length === 0 && (
            <EmptyState
              title="No matching businesses"
              message="Try a different search term or check back as more local businesses join the marketplace."
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
                  link: `/businesses/${b.id}`,
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