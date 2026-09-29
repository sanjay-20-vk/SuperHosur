/**
 * SuperHosur — Search Engine Optimization (SEO) & Structured Data Utilities
 * Phase 17 Step 3: SEO, Social Sharing & Structured Data
 */

export type JsonLdRecord = Record<string, unknown>

export function getSiteOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as unknown as { env?: Record<string, string> }).env : undefined
  const proc = typeof globalThis !== 'undefined' ? (globalThis as unknown as { process?: { env?: Record<string, string> } }).process : undefined
  const envUrl = metaEnv?.['VITE_SITE_URL'] || proc?.env?.['VITE_SITE_URL']
  return envUrl || 'https://superhosur.in'
}

export function getCanonicalUrl(pathname = '/'): string {
  const origin = getSiteOrigin()
  const partBeforeHash = (pathname.split('#')[0] ?? '/').split('?')[0] ?? '/'
  const cleanPath = partBeforeHash.startsWith('/') ? partBeforeHash : `/${partBeforeHash}`
  return `${origin}${cleanPath}`
}

export function truncateDescription(
  text: string | null | undefined,
  maxLen = 160,
  fallback = 'Discover verified businesses, industrial suppliers, and properties in Hosur, Tamil Nadu on SuperHosur.',
): string {
  if (!text || !text.trim()) return fallback
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= maxLen) return clean
  return `${clean.substring(0, maxLen - 1).trim()}…`
}

export function getFallbackOgImage(): string {
  return `${getSiteOrigin()}/og-image.svg`
}

/* ==========================================================================
   Schema.org Structured Data Builders (JSON-LD)
   ========================================================================== */

export interface LocalBusinessSchemaInput {
  name: string
  description?: string | null
  url: string
  image?: string | null
  telephone?: string | null
  address?: string | null
  pincode?: string | null
  cityName?: string | null
  categoryName?: string | null
  latitude?: number | null
  longitude?: number | null
  ratingValue?: number | string | null
  reviewCount?: number | null
}

function resolveBusinessSubtype(categoryName?: string | null): string {
  if (!categoryName) return 'LocalBusiness'
  const cat = categoryName.toLowerCase()
  if (cat.includes('auto') || cat.includes('garage') || cat.includes('vehicle')) {
    return 'AutomotiveBusiness'
  }
  if (cat.includes('food') || cat.includes('restaurant') || cat.includes('cafe')) {
    return 'FoodEstablishment'
  }
  if (cat.includes('hotel') || cat.includes('stay') || cat.includes('lodge')) {
    return 'LodgingBusiness'
  }
  if (cat.includes('store') || cat.includes('shop') || cat.includes('retail')) {
    return 'Store'
  }
  if (cat.includes('real estate') || cat.includes('property')) {
    return 'RealEstateAgent'
  }
  if (cat.includes('medical') || cat.includes('clinic') || cat.includes('hospital') || cat.includes('health')) {
    return 'MedicalBusiness'
  }
  if (cat.includes('service') || cat.includes('consult')) {
    return 'ProfessionalService'
  }
  return 'LocalBusiness'
}

export function buildLocalBusinessSchema(input: LocalBusinessSchemaInput): JsonLdRecord {
  const schema: JsonLdRecord = {
    '@context': 'https://schema.org',
    '@type': resolveBusinessSubtype(input.categoryName),
    name: input.name,
    url: input.url,
  }

  if (input.description && input.description.trim()) {
    schema['description'] = input.description.trim()
  }

  if (input.image) {
    schema['image'] = input.image
  } else {
    schema['image'] = getFallbackOgImage()
  }

  if (input.telephone) {
    schema['telephone'] = input.telephone
  }

  schema['address'] = {
    '@type': 'PostalAddress',
    addressLocality: input.cityName || 'Hosur',
    addressRegion: 'Tamil Nadu',
    addressCountry: 'IN',
    ...(input.pincode ? { postalCode: input.pincode } : {}),
    ...(input.address ? { streetAddress: input.address } : {}),
  }

  if (
    input.latitude !== null &&
    input.latitude !== undefined &&
    input.longitude !== null &&
    input.longitude !== undefined &&
    !isNaN(input.latitude) &&
    !isNaN(input.longitude)
  ) {
    schema['geo'] = {
      '@type': 'GeoCoordinates',
      latitude: input.latitude,
      longitude: input.longitude,
    }
  }

  const reviewCountNum = Number(input.reviewCount)
  const ratingValNum = Number(input.ratingValue)
  if (!isNaN(reviewCountNum) && reviewCountNum > 0 && !isNaN(ratingValNum) && ratingValNum > 0) {
    schema['aggregateRating'] = {
      '@type': 'AggregateRating',
      ratingValue: ratingValNum.toFixed(1),
      reviewCount: reviewCountNum,
      bestRating: '5',
      worstRating: '1',
    }
  }

  return schema
}

export interface RealEstateSchemaInput {
  title: string
  description?: string | null
  url: string
  image?: string | null
  propertyType?: string | null
  listingType?: 'sale' | 'rent' | 'lease' | string | null
  price?: number | null
  rent?: number | null
  address?: string | null
  locationName?: string | null
  latitude?: number | null
  longitude?: number | null
}

export function buildRealEstateSchema(input: RealEstateSchemaInput): JsonLdRecord {
  const schema: JsonLdRecord = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: input.title,
    url: input.url,
  }

  if (input.description && input.description.trim()) {
    schema['description'] = input.description.trim()
  }

  if (input.image) {
    schema['image'] = input.image
  } else {
    schema['image'] = getFallbackOgImage()
  }

  const propertyObj: JsonLdRecord = {
    '@type': 'Accommodation',
    name: input.title,
    address: {
      '@type': 'PostalAddress',
      addressLocality: input.locationName || 'Hosur',
      addressRegion: 'Tamil Nadu',
      addressCountry: 'IN',
      ...(input.address ? { streetAddress: input.address } : {}),
    },
  }

  if (
    input.latitude !== null &&
    input.latitude !== undefined &&
    input.longitude !== null &&
    input.longitude !== undefined &&
    !isNaN(input.latitude) &&
    !isNaN(input.longitude)
  ) {
    propertyObj['geo'] = {
      '@type': 'GeoCoordinates',
      latitude: input.latitude,
      longitude: input.longitude,
    }
  }

  schema['about'] = propertyObj

  if (input.listingType === 'sale' && input.price !== null && input.price !== undefined && input.price > 0) {
    schema['offers'] = {
      '@type': 'Offer',
      price: input.price,
      priceCurrency: 'INR',
      availability: 'https://schema.org/InStock',
    }
  } else if (
    (input.listingType === 'rent' || input.listingType === 'lease') &&
    input.rent !== null &&
    input.rent !== undefined &&
    input.rent > 0
  ) {
    schema['offers'] = {
      '@type': 'Offer',
      price: input.rent,
      priceCurrency: 'INR',
      businessFunction: 'https://schema.org/LeaseOut',
      availability: 'https://schema.org/InStock',
    }
  }

  return schema
}

export interface ProductSchemaInput {
  name: string
  description?: string | null
  url: string
  image?: string | null
  price?: number | null
  categoryName?: string | null
  sellerName?: string | null
  sellerUrl?: string | null
  availability?: 'available' | 'limited' | 'unavailable' | string | null
}

export function buildProductSchema(input: ProductSchemaInput): JsonLdRecord {
  const schema: JsonLdRecord = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.name,
    url: input.url,
  }

  if (input.description && input.description.trim()) {
    schema['description'] = input.description.trim()
  }

  if (input.image) {
    schema['image'] = input.image
  } else {
    schema['image'] = getFallbackOgImage()
  }

  if (input.categoryName) {
    schema['category'] = input.categoryName
  }

  if (input.price !== null && input.price !== undefined && input.price > 0) {
    const offer: JsonLdRecord = {
      '@type': 'Offer',
      price: input.price,
      priceCurrency: 'INR',
      availability:
        input.availability === 'available'
          ? 'https://schema.org/InStock'
          : input.availability === 'limited'
          ? 'https://schema.org/LimitedAvailability'
          : 'https://schema.org/InStock',
      url: input.url,
    }

    if (input.sellerName) {
      offer['seller'] = {
        '@type': 'Organization',
        name: input.sellerName,
        ...(input.sellerUrl ? { url: input.sellerUrl } : {}),
      }
    }

    schema['offers'] = offer
  }

  return schema
}

export interface ServiceSchemaInput {
  name: string
  description?: string | null
  url: string
  categoryName?: string | null
  providerName?: string | null
  providerUrl?: string | null
  priceFrom?: number | null
  priceTo?: number | null
}

export function buildServiceSchema(input: ServiceSchemaInput): JsonLdRecord {
  const schema: JsonLdRecord = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: input.name,
    url: input.url,
  }

  if (input.description && input.description.trim()) {
    schema['description'] = input.description.trim()
  }

  if (input.categoryName) {
    schema['serviceType'] = input.categoryName
  }

  if (input.providerName) {
    schema['provider'] = {
      '@type': 'LocalBusiness',
      name: input.providerName,
      ...(input.providerUrl ? { url: input.providerUrl } : {}),
    }
  }

  if (input.priceFrom !== null && input.priceFrom !== undefined && input.priceFrom > 0) {
    schema['offers'] = {
      '@type': 'Offer',
      price: input.priceFrom,
      priceCurrency: 'INR',
      url: input.url,
    }
  }

  return schema
}

export function buildWebSiteSchema(): JsonLdRecord {
  const origin = getSiteOrigin()
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'SuperHosur',
    url: origin,
    description: 'Hosur Local Commerce & Industrial Marketplace',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${origin}/catalog?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }
}
