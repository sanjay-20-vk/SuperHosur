import fs from 'node:fs'
import path from 'node:path'
import {
  buildLocalBusinessSchema,
  buildProductSchema,
  buildRealEstateSchema,
  buildServiceSchema,
  buildWebSiteSchema,
  getCanonicalUrl,
  truncateDescription,
} from '../src/utils/seo.js'

console.log('=== PHASE 17 STEP 3: SEO, SOCIAL SHARING & STRUCTURED DATA TESTS ===\n')

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`)
    passed++
  } else {
    console.error(`[FAIL] ${message}`)
    failed++
  }
}

// 1. Canonical URL Generation
const canonicalHome = getCanonicalUrl('/')
assert(
  canonicalHome === 'https://superhosur.in/',
  `canonical root URL matches expected default ('${canonicalHome}')`,
)

const canonicalBiz = getCanonicalUrl('/businesses/1c6ec6e0-af74-47cb-a157-9d4b1d531352?utm_source=test#reviews')
assert(
  canonicalBiz === 'https://superhosur.in/businesses/1c6ec6e0-af74-47cb-a157-9d4b1d531352',
  `canonical strips tracking query params and hashes ('${canonicalBiz}')`,
)

// 2. Truncate Description Helper
const shortDesc = truncateDescription('Short description.', 160)
assert(
  shortDesc === 'Short description.',
  'short description remains unchanged',
)

const longText = 'This is a long description '.repeat(20)
const truncated = truncateDescription(longText, 50)
assert(
  truncated.length <= 50 && truncated.endsWith('…'),
  `long text truncated cleanly with ellipsis ('${truncated}')`,
)

// 3. Schema Builder: LocalBusiness
const bizSchema = buildLocalBusinessSchema({
  name: 'Hosur Auto Workshop',
  description: 'Specialist CNC and automobile servicing in Hosur.',
  url: 'https://superhosur.in/businesses/test-123',
  image: 'https://superhosur.in/photos/biz.jpg',
  telephone: '+919876543210',
  address: 'Sipcot Phase 1',
  pincode: '635126',
  cityName: 'Hosur',
  categoryName: 'Automobile Service',
  latitude: 12.7409,
  longitude: 77.8253,
  ratingValue: 4.8,
  reviewCount: 12,
})

assert(
  bizSchema['@context'] === 'https://schema.org' &&
  bizSchema['@type'] === 'AutomotiveBusiness' &&
  bizSchema['name'] === 'Hosur Auto Workshop',
  'LocalBusiness subtype resolved correctly and has valid schema context',
)
assert(
  bizSchema['aggregateRating'] &&
  bizSchema['aggregateRating']['ratingValue'] === '4.8' &&
  bizSchema['aggregateRating']['reviewCount'] === 12,
  'aggregateRating included when real review count > 0',
)

// 4. Schema Builder: LocalBusiness WITHOUT fabricated ratings or coordinates
const unratedBizSchema = buildLocalBusinessSchema({
  name: 'New Unrated Shop',
  url: 'https://superhosur.in/businesses/new-shop',
  cityName: 'Hosur',
  categoryName: 'Retail Store',
  latitude: null,
  longitude: null,
  ratingValue: null,
  reviewCount: 0,
})

assert(
  unratedBizSchema['aggregateRating'] === undefined,
  'aggregateRating is NOT fabricated when no real reviews exist',
)
assert(
  unratedBizSchema['geo'] === undefined,
  'geo coordinates are NOT fabricated when null',
)

// 5. Schema Builder: RealEstateListing
const propSchema = buildRealEstateSchema({
  title: '2 BHK Apartment in Bagalur Road',
  description: 'Spacious apartment near Hosur IT park.',
  url: 'https://superhosur.in/properties/prop-456',
  propertyType: 'apartment',
  listingType: 'sale',
  price: 4500000,
  address: 'Bagalur Road',
  locationName: 'Hosur',
})

assert(
  propSchema['@type'] === 'RealEstateListing' &&
  propSchema['name'] === '2 BHK Apartment in Bagalur Road' &&
  propSchema['offers']['price'] === 4500000 &&
  propSchema['offers']['priceCurrency'] === 'INR',
  'RealEstateListing schema contains valid property details and INR pricing',
)

// 6. Schema Builder: Product
const prodSchema = buildProductSchema({
  name: 'CNC Milling Cutter 12mm',
  description: 'High-speed steel cutter for precision tooling.',
  url: 'https://superhosur.in/products/prod-789',
  price: 1850,
  categoryName: 'Industrial Tools',
  sellerName: 'Precision Tools Hosur',
  availability: 'available',
})

assert(
  prodSchema['@type'] === 'Product' &&
  prodSchema['name'] === 'CNC Milling Cutter 12mm' &&
  prodSchema['offers']['price'] === 1850 &&
  prodSchema['offers']['seller']['name'] === 'Precision Tools Hosur',
  'Product schema includes valid price, category, and verified seller info',
)

// 7. Schema Builder: Service
const srvSchema = buildServiceSchema({
  name: 'Industrial Metal Fabrication',
  description: 'Heavy duty sheet metal cutting, bending, and welding.',
  url: 'https://superhosur.in/services/srv-101',
  categoryName: 'Fabrication',
  providerName: 'Hosur Steel Works',
  priceFrom: 5000,
})

assert(
  srvSchema['@type'] === 'Service' &&
  srvSchema['provider']['name'] === 'Hosur Steel Works' &&
  srvSchema['offers']['price'] === 5000,
  'Service schema contains valid provider and pricing information',
)

// 8. Schema Builder: WebSite
const webSchema = buildWebSiteSchema()
assert(
  webSchema['@type'] === 'WebSite' &&
  webSchema['potentialAction'] &&
  webSchema['potentialAction']['@type'] === 'SearchAction',
  'WebSite schema includes SearchAction for marketplace discovery',
)

// 9. Robots.txt Audit
const robotsPath = path.resolve('public/robots.txt')
assert(fs.existsSync(robotsPath), 'public/robots.txt exists')
const robotsContent = fs.readFileSync(robotsPath, 'utf8')
assert(
  robotsContent.includes('Disallow: /admin') &&
  robotsContent.includes('Disallow: /owner') &&
  robotsContent.includes('Disallow: /profile') &&
  robotsContent.includes('Sitemap: https://superhosur.in/sitemap.xml'),
  'robots.txt disallows private portals and specifies sitemap URL',
)

// 10. Sitemap.xml Audit
const sitemapPath = path.resolve('public/sitemap.xml')
assert(fs.existsSync(sitemapPath), 'public/sitemap.xml exists')
const sitemapContent = fs.readFileSync(sitemapPath, 'utf8')
assert(
  sitemapContent.includes('<urlset') &&
  sitemapContent.includes('<loc>https://superhosur.in/</loc>') &&
  sitemapContent.includes('<loc>https://superhosur.in/catalog</loc>') &&
  sitemapContent.includes('<loc>https://superhosur.in/properties</loc>'),
  'sitemap.xml contains public indexable routes',
)

// 11. OpenGraph Fallback Image
const ogImagePath = path.resolve('public/og-image.svg')
assert(fs.existsSync(ogImagePath), 'public/og-image.svg fallback image exists')

console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===`)

if (failed > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
