import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Header } from '../components/Header'
import { LoadingState } from '../components/LoadingState'
import { EmptyState } from '../components/EmptyState'
import {
  getSavedErrorMessage,
  getSavedListings,
  removeSavedListing,
  type SavedListingItem,
} from '../services/savedListings'

type FilterTab = 'all' | 'business' | 'property'

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

export function SavedListingsPage() {
  const [items, setItems] = useState<SavedListingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [removingId, setRemovingId] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function init() {
      try {
        const data = await getSavedListings()
        if (active) {
          setItems(data)
        }
      } catch (err) {
        if (active) {
          setError(getSavedErrorMessage(err, 'Unable to load your saved listings.'))
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void init()

    function handleChanged() {
      void init()
    }

    window.addEventListener('saved-listings-changed', handleChanged)
    return () => {
      active = false
      window.removeEventListener('saved-listings-changed', handleChanged)
    }
  }, [])

  async function handleRemove(savedId: string, itemType: 'business' | 'property', targetId: string) {
    if (removingId) return

    setRemovingId(savedId)
    // Optimistic removal
    const previousItems = items
    setItems((prev) => prev.filter((item) => item.savedId !== savedId))

    // Broadcast change
    window.dispatchEvent(
      new CustomEvent('saved-listings-changed', {
        detail: { targetType: itemType, targetId, isSaved: false },
      }),
    )

    try {
      await removeSavedListing(savedId)
    } catch (err) {
      // Rollback
      console.error('Failed to remove saved listing:', err)
      setItems(previousItems)
      setError(getSavedErrorMessage(err, 'Unable to remove listing.'))
    } finally {
      setRemovingId(null)
    }
  }

  const businessItems = items.filter((item) => item.type === 'business')
  const propertyItems = items.filter((item) => item.type === 'property')

  const displayedItems =
    activeTab === 'business'
      ? businessItems
      : activeTab === 'property'
      ? propertyItems
      : items

  return (
    <>
      <Header />

      <main className="owner-dash-shell saved-listings-main">
        <header className="owner-dash-header" style={{ marginBottom: '28px' }}>
          <div>
            <div className="owner-status-badge-row">
              <span className="owner-badge-chip verified">
                <span className="owner-badge-dot" aria-hidden="true" />
                Personal Favorites • Saved Items
              </span>
            </div>
            <h1 className="owner-dash-title">My Saved Listings</h1>
            <p className="owner-dash-subtitle">
              Quickly review, compare, and manage your bookmarked businesses and verified properties in Hosur.
            </p>
          </div>

          <div className="owner-actions">
            <Link to="/properties" className="secondary-button" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
              Explore properties
            </Link>
            <Link to="/" className="primary-button" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
              Browse businesses
            </Link>
          </div>
        </header>

        {error && (
          <div className="form-error" role="alert" style={{ marginBottom: '24px' }}>
            {error}
          </div>
        )}

        {/* Filter Tabs */}
        {!loading && items.length > 0 && (
          <div className="category-grid" role="group" aria-label="Filter saved listings by type" style={{ marginBottom: '24px' }}>
            <button
              type="button"
              className={activeTab === 'all' ? 'category-pill active' : 'category-pill'}
              onClick={() => setActiveTab('all')}
            >
              All Listings ({items.length})
            </button>
            <button
              type="button"
              className={activeTab === 'business' ? 'category-pill active' : 'category-pill'}
              onClick={() => setActiveTab('business')}
            >
              🏪 Businesses ({businessItems.length})
            </button>
            <button
              type="button"
              className={activeTab === 'property' ? 'category-pill active' : 'category-pill'}
              onClick={() => setActiveTab('property')}
            >
              🏡 Properties ({propertyItems.length})
            </button>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <LoadingState message="Loading your saved listings…" />
        ) : items.length === 0 ? (
          <EmptyState
            title="No saved listings yet"
            message="You haven't bookmarked any businesses or properties yet. Click the heart icon on any listing to save it here for fast access."
          />
        ) : displayedItems.length === 0 ? (
          <EmptyState
            title={`No saved ${activeTab === 'business' ? 'businesses' : 'properties'}`}
            message={`You don't have any ${activeTab === 'business' ? 'businesses' : 'properties'} saved in your favorites.`}
          />
        ) : (
          <div className="business-grid">
            {displayedItems.map((item) => {
              if (item.type === 'business') {
                const b = item.business
                const link = `/businesses/${b.slug || b.id}`

                return (
                  <article key={item.savedId} className="business-card" aria-label={b.name}>
                    <div className="business-card__media">
                      {b.cover_photo_url ? (
                        <img
                          src={b.cover_photo_url}
                          alt={b.cover_photo_alt || b.name}
                          loading="lazy"
                        />
                      ) : (
                        <div className="business-card__placeholder" aria-hidden="true">
                          <span className="placeholder-icon" aria-hidden="true">🏪</span>
                          <span>Local listing</span>
                        </div>
                      )}
                    </div>

                    <div className="business-card__top">
                      <span className="saved-type-badge business">🏪 Business</span>
                      <span className="business-status">{b.verified ? '✓ Verified' : 'Listing'}</span>
                    </div>

                    <h3 style={{ margin: '8px 0' }}>
                      <Link to={link} style={{ color: 'inherit', textDecoration: 'none' }}>
                        {b.name}
                      </Link>
                    </h3>

                    <p className="business-card__text">
                      {b.description?.trim() || 'Trusted marketplace listing in Hosur.'}
                    </p>

                    <div className="business-card__meta">
                      <span className="business-card__location">
                        <span className="meta-icon" aria-hidden="true">📍</span>
                        <span>{b.address || 'Hosur'}</span>
                      </span>
                      <Link to={link} className="business-card__action">
                        <span>View listing</span>
                        <span className="meta-arrow" aria-hidden="true"> →</span>
                      </Link>
                    </div>

                    <div className="saved-card-footer">
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        Saved {new Date(item.savedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <button
                        type="button"
                        className="saved-remove-btn"
                        onClick={() => handleRemove(item.savedId, 'business', b.id)}
                        disabled={removingId === item.savedId}
                        aria-label={`Remove ${b.name} from saved listings`}
                        title="Remove from saved"
                      >
                        🗑️ {removingId === item.savedId ? 'Removing…' : 'Remove'}
                      </button>
                    </div>
                  </article>
                )
              }

              // Property Item
              const p = item.property
              const link = `/properties/${p.id}`
              const listingBadge = formatListingType(p.listing_type)
              const typeBadge = formatPropertyType(p.property_type)

              const priceDisplay =
                p.listing_type === 'rent'
                  ? `${formatCurrency(p.rent)} / month`
                  : p.listing_type === 'lease'
                  ? `${formatCurrency(p.rent ?? p.price)} lease`
                  : formatCurrency(p.price)

              return (
                <article key={item.savedId} className="business-card" aria-label={p.title}>
                  <div className="business-card__media">
                    {p.cover_photo_url ? (
                      <img src={p.cover_photo_url} alt={p.title} loading="lazy" />
                    ) : (
                      <div className="business-card__placeholder" aria-hidden="true">Property listing</div>
                    )}
                  </div>

                  <div className="business-card__top">
                    <span className="saved-type-badge property">🏡 {typeBadge}</span>
                    <span className="business-status">{listingBadge}</span>
                  </div>

                  <h3 style={{ margin: '8px 0' }}>
                    <Link to={link} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {p.title}
                    </Link>
                  </h3>

                  <div className="property-specs" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 12px', margin: '8px 0', fontSize: '0.9rem', color: 'rgba(23, 63, 58, 0.8)' }}>
                    {p.bedrooms !== null && (
                      <span><strong>{p.bedrooms}</strong> BHK</span>
                    )}
                    {p.bathrooms !== null && (
                      <span><strong>{p.bathrooms}</strong> Baths</span>
                    )}
                    {p.area_sqft !== null && (
                      <span><strong>{p.area_sqft}</strong> sq.ft</span>
                    )}
                  </div>

                  <p className="business-card__text" style={{ margin: '6px 0 14px', fontWeight: 600, color: '#17614d', fontSize: '1.1rem' }}>
                    {priceDisplay}
                  </p>

                  <div className="business-card__meta">
                    <span className="business-card__location">
                      <span className="meta-icon" aria-hidden="true">📍</span>
                      <span>{p.cities?.name || 'Hosur'}</span>
                    </span>
                    <Link to={link} className="business-card__action">
                      <span>View property</span>
                      <span className="meta-arrow" aria-hidden="true"> →</span>
                    </Link>
                  </div>

                  <div className="saved-card-footer">
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      Saved {new Date(item.savedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <button
                      type="button"
                      className="saved-remove-btn"
                      onClick={() => handleRemove(item.savedId, 'property', p.id)}
                      disabled={removingId === item.savedId}
                      aria-label={`Remove ${p.title} from saved listings`}
                      title="Remove from saved"
                    >
                      🗑️ {removingId === item.savedId ? 'Removing…' : 'Remove'}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>
    </>
  )
}
