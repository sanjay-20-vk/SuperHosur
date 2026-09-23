import fs from 'node:fs'
import { createClient } from 'file:///c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/node_modules/@supabase/supabase-js/dist/index.mjs'

const SUPABASE_URL = 'https://cdsghhesglltjvqbewol.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_ubnd6hu6T0jz33SdUYFoRw_mXHwsHi0'

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function runPhase10Verification() {
  console.log('=================================================================')
  console.log('  SUPERHOSUR PHASE 10: SEARCH & MARKETPLACE DISCOVERY SUITE')
  console.log('=================================================================\n')

  let passCount = 0
  let failCount = 0

  function pass(msg) {
    console.log(`[PASS] ${msg}`)
    passCount++
  }

  function fail(msg, detail) {
    console.error(`[FAIL] ${msg}`, detail || '')
    failCount++
  }

  const heroSearchPath = 'c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/components/HeroSearch.tsx'
  const catalogPagePath = 'c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/pages/CatalogPage.tsx'
  const homePagePath = 'c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/pages/HomePage.tsx'
  const offeringCardPath = 'c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/components/OfferingCard.tsx'
  const businessCardPath = 'c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/components/BusinessCard.tsx'
  const cssPath = 'c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/App.css'

  // TEST 1: Homepage Search Experience & Input UX
  console.log('--- TEST 1: Homepage Search Component & UX ---')
  try {
    const heroContent = fs.readFileSync(heroSearchPath, 'utf-8')
    const heroChecks = [
      { name: 'Label "Find what you need in Hosur"', test: heroContent.includes('Find what you need in Hosur') },
      { name: 'Live search badge', test: heroContent.includes('search-badge') && heroContent.includes('Live search') },
      { name: 'SVG Search icon rendered', test: heroContent.includes('search-icon-svg') },
      { name: 'Max length 100 character restriction', test: heroContent.includes('maxLength={100}') },
      { name: 'enterKeyHint="search" set', test: heroContent.includes('enterKeyHint="search"') },
      { name: 'autoCapitalize="none" & autoCorrect="off"', test: heroContent.includes('autoCapitalize="none"') && heroContent.includes('autoCorrect="off"') },
      { name: 'Enter key search trigger onKeyDown', test: heroContent.includes("event.key === 'Enter'") && heroContent.includes('onSubmit?.()') },
      { name: 'Clear search button when query present', test: heroContent.includes('search-clear-btn') && heroContent.includes("onChange('')") },
      { name: 'Popular search suggestion chips', test: heroContent.includes('search-suggestions') && heroContent.includes('search-suggestion-chip') },
      { name: 'Accessible role="search"', test: heroContent.includes('role="search"') },
    ]

    for (const c of heroChecks) {
      if (c.test) pass(`HeroSearch verified: ${c.name}`)
      else fail(`HeroSearch missing: ${c.name}`)
    }
  } catch (err) {
    fail('Exception checking HeroSearch', err)
  }

  // TEST 2: HomePage Integration & Navigation
  console.log('\n--- TEST 2: HomePage Search Integration & Routing ---')
  try {
    const homeContent = fs.readFileSync(homePagePath, 'utf-8')
    const homeChecks = [
      { name: 'HeroSearch mounted with value, onChange, and onSubmit', test: homeContent.includes('<HeroSearch') && homeContent.includes('onSubmit=') },
      { name: 'Navigates to /catalog?q= on submit', test: homeContent.includes('/catalog?q=') },
      { name: 'Debounced search state (300ms)', test: homeContent.includes('setTimeout') && homeContent.includes('300') },
      { name: 'Grid and Map view toggle', test: homeContent.includes('view-mode-switch') && homeContent.includes('viewMode') },
      { name: 'Results count summary', test: homeContent.includes('results-summary') && homeContent.includes('result') },
    ]

    for (const c of homeChecks) {
      if (c.test) pass(`HomePage verified: ${c.name}`)
      else fail(`HomePage missing: ${c.name}`)
    }
  } catch (err) {
    fail('Exception checking HomePage', err)
  }

  // TEST 3: Catalog Page Hero & Search Query State
  console.log('\n--- TEST 3: Catalog Page Hero & Query Display ---')
  try {
    const catalogContent = fs.readFileSync(catalogPagePath, 'utf-8')
    const catalogHeroChecks = [
      { name: 'Eyebrow "SuperHosur Marketplace"', test: catalogContent.includes('SuperHosur Marketplace') },
      { name: 'Main heading "Discover businesses, products & services"', test: catalogContent.includes('Discover businesses, products &amp; services') || catalogContent.includes('Discover businesses, products & services') },
      { name: 'Supporting marketplace description', test: catalogContent.includes('verified local suppliers') },
      { name: 'Dynamic query banner "Searching for: “...”"', test: catalogContent.includes('Searching for:') && catalogContent.includes('debouncedSearch') },
      { name: 'Clear query action chip', test: catalogContent.includes('search-clear-chip') && catalogContent.includes('Clear query ✕') },
      { name: 'Sanitize search query helper (caps at 100 & trims)', test: catalogContent.includes('sanitizeSearchQuery') && catalogContent.includes('.slice(0, 100)') },
    ]

    for (const c of catalogHeroChecks) {
      if (c.test) pass(`Catalog Hero verified: ${c.name}`)
      else fail(`Catalog Hero missing: ${c.name}`)
    }
  } catch (err) {
    fail('Exception checking Catalog Hero', err)
  }

  // TEST 4: Search Result Summary & Filter Bar
  console.log('\n--- TEST 4: Result Count Summary & Filter Experience ---')
  try {
    const catalogContent = fs.readFileSync(catalogPagePath, 'utf-8')
    const filterChecks = [
      { name: 'Real results count badge (offerings.length)', test: catalogContent.includes('catalog-results-pill') && catalogContent.includes('result found') && catalogContent.includes('results found') },
      { name: 'Type segmented tabs (All, Products, Services)', test: catalogContent.includes('catalog-type-tabs') && catalogContent.includes('role="tablist"') },
      { name: 'Category discovery strip', test: catalogContent.includes('catalog-category-strip') && catalogContent.includes('All Categories') },
      { name: 'Subcategory strip with active category scoping', test: catalogContent.includes('catalog-subcategory-strip') && catalogContent.includes('displayedSubcategories') },
      { name: 'Availability filter pills (In Stock, Limited Stock)', test: catalogContent.includes('catalog-availability-group') && catalogContent.includes('In Stock') },
      { name: 'Sorting dropdown with accessible label', test: catalogContent.includes('catalog-sort-select') && catalogContent.includes('aria-label="Sort catalog offerings"') },
      { name: 'Sorting options: newest, price_asc, price_desc, name', test: catalogContent.includes('newest') && catalogContent.includes('price_asc') && catalogContent.includes('price_desc') && catalogContent.includes('name') },
    ]

    for (const c of filterChecks) {
      if (c.test) pass(`Filter verified: ${c.name}`)
      else fail(`Filter missing: ${c.name}`)
    }
  } catch (err) {
    fail('Exception checking Filter Experience', err)
  }

  // TEST 5: Active Filter Chips with Individual Removers
  console.log('\n--- TEST 5: Active Filter Chips with Individual Removers ---')
  try {
    const catalogContent = fs.readFileSync(catalogPagePath, 'utf-8')
    const activeChipChecks = [
      { name: 'Active filters container', test: catalogContent.includes('catalog-active-bar') && catalogContent.includes('catalog-active-tags') },
      { name: 'Individual tag remove button class', test: catalogContent.includes('catalog-tag-remove-btn') },
      { name: 'Search filter remover', test: catalogContent.includes('Remove search filter') },
      { name: 'Type filter remover', test: catalogContent.includes('Remove type filter') },
      { name: 'Category filter remover', test: catalogContent.includes('Remove category filter') },
      { name: 'Subcategory filter remover', test: catalogContent.includes('Remove subcategory filter') },
      { name: 'Availability filter remover', test: catalogContent.includes('Remove availability filter') },
      { name: 'Global reset all filters action', test: catalogContent.includes('Clear all filters ✕') || catalogContent.includes('Reset all filters ✕') },
    ]

    for (const c of activeChipChecks) {
      if (c.test) pass(`Active Filter Chip verified: ${c.name}`)
      else fail(`Active Filter Chip missing: ${c.name}`)
    }
  } catch (err) {
    fail('Exception checking Active Filter Chips', err)
  }

  // TEST 6: Result Cards Quality (OfferingCard & BusinessCard)
  console.log('\n--- TEST 6: Result Cards Architecture ---')
  try {
    const offeringContent = fs.readFileSync(offeringCardPath, 'utf-8')
    const businessContent = fs.readFileSync(businessCardPath, 'utf-8')

    const cardChecks = [
      { name: 'OfferingCard product/service badge pill', test: offeringContent.includes('offering-type-pill') && offeringContent.includes('isProduct') },
      { name: 'OfferingCard taxonomy tag', test: offeringContent.includes('offering-taxonomy-tag') },
      { name: 'OfferingCard stock availability status', test: offeringContent.includes('offering-status-badge') },
      { name: 'OfferingCard price box with formatPrice', test: offeringContent.includes('offering-card__price-box') && offeringContent.includes('formatPrice') },
      { name: 'OfferingCard provider with verified badge and location', test: offeringContent.includes('provider-name') && offeringContent.includes('provider-verified-badge') && offeringContent.includes('provider-location') },
      { name: 'OfferingCard CTA action link', test: offeringContent.includes('offering-card__action') && offeringContent.includes('View details') },
      { name: 'BusinessCard media cover and fallback placeholder', test: businessContent.includes('business-card__media') && businessContent.includes('business-card__placeholder') },
      { name: 'BusinessCard title, text and location meta', test: businessContent.includes('business-card__location') && businessContent.includes('View listing') },
    ]

    for (const c of cardChecks) {
      if (c.test) pass(`Card Architecture verified: ${c.name}`)
      else fail(`Card Architecture missing: ${c.name}`)
    }
  } catch (err) {
    fail('Exception checking Result Cards', err)
  }

  // TEST 7: Empty and Loading States
  console.log('\n--- TEST 7: Empty and Loading States ---')
  try {
    const catalogContent = fs.readFileSync(catalogPagePath, 'utf-8')
    const stateChecks = [
      { name: 'Empty state container .catalog-empty-panel', test: catalogContent.includes('catalog-empty-panel') },
      { name: 'Empty state heading "No matches found"', test: catalogContent.includes('No matches found') },
      { name: 'Contextual empty state message', test: catalogContent.includes('catalog-empty-text') },
      { name: 'Clear filters action button in empty state', test: catalogContent.includes('Clear filters') },
      { name: 'Skeleton loading grid with aria-busy="true"', test: catalogContent.includes('catalog-skeleton-grid') && catalogContent.includes('aria-busy="true"') },
      { name: '6 skeleton card placeholders', test: catalogContent.includes('Array.from({ length: 6 })') },
      { name: 'Accessible error alert state with role="alert"', test: catalogContent.includes('role="alert"') && catalogContent.includes('Unable to load catalog') },
    ]

    for (const c of stateChecks) {
      if (c.test) pass(`State verified: ${c.name}`)
      else fail(`State missing: ${c.name}`)
    }
  } catch (err) {
    fail('Exception checking Empty & Loading States', err)
  }

  // TEST 8: CSS Design Tokens & Responsiveness
  console.log('\n--- TEST 8: CSS Design Tokens & Mobile Rules ---')
  try {
    const cssContent = fs.readFileSync(cssPath, 'utf-8')
    const cssChecks = [
      { name: '.search-input-wrap & focus ring', test: cssContent.includes('.search-input-wrap:focus-within') },
      { name: '.search-icon-svg styling', test: cssContent.includes('.search-icon-svg') },
      { name: '.catalog-search-panel', test: cssContent.includes('.catalog-search-panel') },
      { name: '.catalog-filter-card', test: cssContent.includes('.catalog-filter-card') },
      { name: '.catalog-type-tab.active', test: cssContent.includes('.catalog-type-tab.active') },
      { name: '.catalog-category-strip horizontal scroll', test: cssContent.includes('.catalog-category-strip') && cssContent.includes('overflow-x: auto') },
      { name: '.catalog-subcategory-panel accent border', test: cssContent.includes('.catalog-subcategory-panel') },
      { name: '.catalog-sort-select focus-visible', test: cssContent.includes('.catalog-sort-select:focus-visible') },
      { name: '.catalog-tag-remove-btn hover style', test: cssContent.includes('.catalog-tag-remove-btn:hover') },
      { name: '.catalog-empty-panel & icon circle', test: cssContent.includes('.catalog-empty-panel') && cssContent.includes('.catalog-empty-icon-circle') },
      { name: '.offering-card hover elevation', test: cssContent.includes('.offering-card:hover') },
      { name: '360px safe mobile padding rule includes catalog elements', test: cssContent.includes('.catalog-empty-panel') && cssContent.includes('.catalog-filter-card') && cssContent.includes('@media (max-width: 360px)') },
      { name: 'prefers-reduced-motion disables skeleton shimmer and hover transitions', test: cssContent.includes('prefers-reduced-motion') && cssContent.includes('.skeleton-shimmer') },
    ]

    for (const c of cssChecks) {
      if (c.test) pass(`CSS verified: ${c.name}`)
      else fail(`CSS missing: ${c.name}`)
    }
  } catch (err) {
    fail('Exception checking CSS rules', err)
  }

  // TEST 9: Non-Regression on Catalog Supply Data Layer
  console.log('\n--- TEST 9: Supabase Catalog Supply Data Layer (RLS & Queries) ---')
  try {
    const [pRes, sRes] = await Promise.all([
      anonClient.from('business_products').select('id, name, price').eq('active', true).limit(2),
      anonClient.from('business_services').select('id, name, price_from').eq('active', true).limit(2),
    ])

    if (pRes.error) fail('Product query error', pRes.error)
    else pass(`Active products accessible under RLS: returned ${pRes.data.length} records.`)

    if (sRes.error) fail('Service query error', sRes.error)
    else pass(`Active services accessible under RLS: returned ${sRes.data.length} records.`)
  } catch (err) {
    fail('Exception in catalog data test', err)
  }

  console.log('\n=================================================================')
  console.log(`PHASE 10 VERIFICATION SUMMARY: ${passCount} PASSED, ${failCount} FAILED`)
  console.log('=================================================================')

  if (failCount > 0) {
    process.exit(1)
  }
}

runPhase10Verification()
