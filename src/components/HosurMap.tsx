import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export type MapMarkerItem = {
  id: string
  title: string
  type: 'business' | 'property'
  latitude: number
  longitude: number
  subtitle?: string | null
  address?: string | null
  price?: string | null
  rating?: number | null
  reviewCount?: number | null
  link?: string | null
}

export type HosurMapProps = {
  markers?: MapMarkerItem[]
  center?: [number, number]
  zoom?: number
  height?: string
  interactive?: boolean
  showControls?: boolean
  title?: string
  emptyMessage?: string
  onMarkerClick?: (marker: MapMarkerItem) => void
  onNavigate?: (path: string) => void
}

function isInternalLink(href: string): boolean {
  if (!href) return false
  if (href.startsWith('//')) return false
  if (href.startsWith('/') && !href.startsWith('//')) return true
  try {
    const url = new URL(href, window.location.origin)
    return url.origin === window.location.origin
  } catch {
    return false
  }
}

const HOSUR_CENTER: [number, number] = [12.7409, 77.8253]

function createBusinessSvgIcon(): string {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>`
}

function createPropertySvgIcon(): string {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M9 3v18"/>
    <path d="M15 3v18"/>
    <path d="M3 9h18"/>
    <path d="M3 15h18"/>
  </svg>`
}

function createCustomMarkerIcon(type: 'business' | 'property'): L.DivIcon {
  const isBusiness = type === 'business'
  const bgColor = isBusiness ? '#1b7a63' : '#ba5d3a'
  const svgIcon = isBusiness ? createBusinessSvgIcon() : createPropertySvgIcon()

  return L.divIcon({
    className: 'custom-map-div-icon',
    html: `
      <div class="map-pin-container ${type}">
        <div class="map-pin-badge" style="background-color: ${bgColor};">
          ${svgIcon}
        </div>
        <div class="map-pin-arrow" style="border-top-color: ${bgColor};"></div>
      </div>
    `,
    iconSize: [36, 42],
    iconAnchor: [18, 42],
    popupAnchor: [0, -42],
  })
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function buildPopupHtml(item: MapMarkerItem): string {
  const isBusiness = item.type === 'business'
  const typeBadgeClass = isBusiness ? 'badge-business' : 'badge-property'
  const typeLabel = isBusiness ? 'Local Business' : 'Real Estate'

  const titleEscaped = escapeHtml(item.title)
  const subtitleHtml = item.subtitle ? `<div class="popup-subtitle">${escapeHtml(item.subtitle)}</div>` : ''
  const addressHtml = item.address ? `<div class="popup-address">${escapeHtml(item.address)}</div>` : ''
  
  let metaHtml = ''
  if (isBusiness && typeof item.rating === 'number' && item.rating > 0) {
    metaHtml = `
      <div class="popup-meta">
        <span class="popup-rating">★ ${item.rating.toFixed(1)}</span>
        ${item.reviewCount ? `<span class="popup-reviews">(${item.reviewCount} reviews)</span>` : ''}
      </div>`
  } else if (!isBusiness && item.price) {
    metaHtml = `
      <div class="popup-meta">
        <span class="popup-price">${escapeHtml(item.price)}</span>
      </div>`
  }

  const linkHtml = item.link
    ? `<a href="${encodeURI(item.link)}" class="popup-action-btn">View Details →</a>`
    : ''

  return `
    <div class="map-popup-card">
      <div class="popup-badge ${typeBadgeClass}">${typeLabel}</div>
      <h4 class="popup-title">${titleEscaped}</h4>
      ${subtitleHtml}
      ${addressHtml}
      ${metaHtml}
      ${linkHtml}
    </div>
  `
}

export function HosurMap({
  markers = [],
  center = HOSUR_CENTER,
  zoom = 13,
  height = '460px',
  interactive = true,
  showControls = true,
  title,
  emptyMessage = 'No location coordinates available for the current items.',
  onMarkerClick,
  onNavigate,
}: HosurMapProps) {
  const routerNavigate = useNavigate()
  const handleNavigate = onNavigate ?? routerNavigate
  const navigateRef = useRef(handleNavigate)

  useEffect(() => {
    navigateRef.current = handleNavigate
  }, [handleNavigate])

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markerGroupRef = useRef<L.LayerGroup | null>(null)

  const [activeTypeFilter, setActiveTypeFilter] = useState<'all' | 'business' | 'property'>('all')

  // Filter valid markers with non-null coordinates
  const validMarkers = markers.filter(
    (m) =>
      typeof m.latitude === 'number' &&
      typeof m.longitude === 'number' &&
      !isNaN(m.latitude) &&
      !isNaN(m.longitude) &&
      m.latitude >= -90 &&
      m.latitude <= 90 &&
      m.longitude >= -180 &&
      m.longitude <= 180,
  )

  const businessCount = validMarkers.filter((m) => m.type === 'business').length
  const propertyCount = validMarkers.filter((m) => m.type === 'property').length

  const filteredMarkers = validMarkers.filter((m) => {
    if (activeTypeFilter === 'all') return true
    return m.type === activeTypeFilter
  })

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return

    // Avoid duplicate initialization
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }

    const container = mapContainerRef.current

    const map = L.map(container, {
      center,
      zoom,
      zoomControl: interactive,
      dragging: interactive,
      touchZoom: interactive,
      scrollWheelZoom: false, // Prevent unwanted scrolling
      doubleClickZoom: interactive,
    })

    // Standard OpenStreetMap Tile Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | SuperHosur',
    }).addTo(map)

    // Handle React Router SPA navigation for popup links
    const handleLinkNavigation = (anchor: HTMLAnchorElement, e: MouseEvent) => {
      const href = anchor.getAttribute('href')
      if (href && isInternalLink(href)) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || anchor.target === '_blank') {
          return
        }
        e.preventDefault()
        navigateRef.current(href)
      }
    }

    // Attach click listeners to popup DOM elements as popups open
    map.on('popupopen', (e) => {
      const popupEl = e.popup.getElement()
      if (!popupEl) return

      const links = popupEl.querySelectorAll<HTMLAnchorElement>('a')
      links.forEach((anchor) => {
        anchor.onclick = (event) => {
          handleLinkNavigation(anchor, event)
        }
      })
    })

    // Delegated container click handler in capturing phase as guaranteed fallback
    const handleContainerClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      const anchor = target?.closest('a')
      if (anchor) {
        handleLinkNavigation(anchor, e)
      }
    }
    container.addEventListener('click', handleContainerClick, true)

    const markerGroup = L.layerGroup().addTo(map)
    markerGroupRef.current = markerGroup
    mapInstanceRef.current = map

    return () => {
      container.removeEventListener('click', handleContainerClick, true)
      map.remove()
      mapInstanceRef.current = null
      markerGroupRef.current = null
    }
  }, [center, zoom, interactive])

  // Update Markers and Bounds
  useEffect(() => {
    const map = mapInstanceRef.current
    const markerGroup = markerGroupRef.current
    if (!map || !markerGroup) return

    markerGroup.clearLayers()

    if (filteredMarkers.length === 0) {
      map.setView(center, zoom)
      return
    }

    const bounds = L.latLngBounds([])

    filteredMarkers.forEach((item) => {
      const latLng: [number, number] = [item.latitude, item.longitude]
      const icon = createCustomMarkerIcon(item.type)

      const marker = L.marker(latLng, { icon })
      marker.bindPopup(buildPopupHtml(item), {
        maxWidth: 280,
        className: 'custom-leaflet-popup',
      })

      if (onMarkerClick) {
        marker.on('click', () => onMarkerClick(item))
      }

      markerGroup.addLayer(marker)
      bounds.extend(latLng)
    })

    const firstMarker = filteredMarkers[0]
    if (filteredMarkers.length === 1 && firstMarker) {
      map.setView([firstMarker.latitude, firstMarker.longitude], 15)
    } else if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [45, 45],
        maxZoom: 16,
      })
    }
  }, [filteredMarkers, center, zoom, onMarkerClick])

  return (
    <div className="hosur-map-wrapper">
      {(title || (showControls && (businessCount > 0 && propertyCount > 0))) && (
        <div className="hosur-map-header">
          {title && <h3 className="hosur-map-title">{title}</h3>}

          {showControls && businessCount > 0 && propertyCount > 0 && (
            <div className="hosur-map-filters" role="group" aria-label="Map marker filters">
              <button
                type="button"
                className={activeTypeFilter === 'all' ? 'map-filter-btn active' : 'map-filter-btn'}
                onClick={() => setActiveTypeFilter('all')}
              >
                All ({validMarkers.length})
              </button>
              <button
                type="button"
                className={activeTypeFilter === 'business' ? 'map-filter-btn active' : 'map-filter-btn'}
                onClick={() => setActiveTypeFilter('business')}
              >
                Businesses ({businessCount})
              </button>
              <button
                type="button"
                className={activeTypeFilter === 'property' ? 'map-filter-btn active' : 'map-filter-btn'}
                onClick={() => setActiveTypeFilter('property')}
              >
                Properties ({propertyCount})
              </button>
            </div>
          )}
        </div>
      )}

      <div
        ref={mapContainerRef}
        className="hosur-map-canvas"
        style={{ height, width: '100%' }}
        aria-label="Interactive map of Hosur"
      />

      {validMarkers.length === 0 && (
        <div className="hosur-map-empty-overlay">
          <p>{emptyMessage}</p>
        </div>
      )}
    </div>
  )
}
