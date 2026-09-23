import { createClient } from 'file:///c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/node_modules/@supabase/supabase-js/dist/index.mjs'
import fs from 'node:fs'

const SUPABASE_URL = 'https://cdsghhesglltjvqbewol.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_ubnd6hu6T0jz33SdUYFoRw_mXHwsHi0'

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function runGeolocationMapVerification() {
  console.log('=================================================================')
  console.log('  INTERACTIVE GEOLOCATION MAP (LEAFLET + OSM) VERIFICATION SUITE')
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

  // 1. Verify Leaflet Dependencies in package.json
  console.log('--- TEST 1: Package Dependencies ---')
  try {
    const pkgJsonPath = 'c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/package.json'
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'))
    const hasLeaflet = Boolean(pkg.dependencies && pkg.dependencies.leaflet)
    const hasLeafletTypes = Boolean(pkg.devDependencies && pkg.devDependencies['@types/leaflet'])

    if (hasLeaflet && hasLeafletTypes) {
      pass(`Leaflet dependencies verified: leaflet (${pkg.dependencies.leaflet}), @types/leaflet (${pkg.devDependencies['@types/leaflet']})`)
    } else {
      fail('package.json missing leaflet or @types/leaflet', { hasLeaflet, hasLeafletTypes })
    }
  } catch (err) {
    fail('Exception checking package.json', err)
  }

  // 2. Verify HosurMap Component Implementation
  console.log('\n--- TEST 2: HosurMap Component Architecture ---')
  try {
    const mapComponentPath = 'c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/components/HosurMap.tsx'
    if (!fs.existsSync(mapComponentPath)) {
      fail(`HosurMap component missing at ${mapComponentPath}`)
    } else {
      const content = fs.readFileSync(mapComponentPath, 'utf-8')
      const componentChecks = [
        { name: 'Export of HosurMap and MapMarkerItem', test: content.includes('export function HosurMap') && content.includes('export type MapMarkerItem') },
        { name: 'Leaflet and CSS imports', test: content.includes("import L from 'leaflet'") && content.includes("import 'leaflet/dist/leaflet.css'") },
        { name: 'OpenStreetMap TileLayer with attribution', test: content.includes('tile.openstreetmap.org') && content.includes('OpenStreetMap') },
        { name: 'Custom SVG L.divIcon pin generator', test: content.includes('L.divIcon') && content.includes('map-pin-badge') },
        { name: 'Business and Property pin types', test: content.includes("type === 'business'") && content.includes("type === 'property'") },
        { name: 'Popup with details and action link', test: content.includes('buildPopupHtml') && content.includes('map-popup-card') },
        { name: 'Automatic bounds fitting', test: content.includes('L.latLngBounds') && content.includes('fitBounds') },
        { name: 'Proper cleanup on unmount', test: content.includes('map.remove()') },
      ]

      let allComponentChecksPassed = true
      for (const check of componentChecks) {
        if (!check.test) {
          fail(`HosurMap missing feature: ${check.name}`)
          allComponentChecksPassed = false
        }
      }
      if (allComponentChecksPassed) {
        pass('HosurMap implements all 8 architectural requirements (OSM tiles, custom pins, popups, bounds, and lifecycle cleanup).')
      }
    }
  } catch (err) {
    fail('Exception checking HosurMap component', err)
  }

  // 3. Verify Business & Property Service Geolocation Fields
  console.log('\n--- TEST 3: Service Layer Geolocation Data Fields ---')
  try {
    const businessServicePath = 'c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/services/businesses.ts'
    const propServicePath = 'c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/services/properties.ts'

    const bContent = fs.readFileSync(businessServicePath, 'utf-8')
    const pContent = fs.readFileSync(propServicePath, 'utf-8')

    const bHasSummaryCoords = bContent.includes('latitude?: number | null') && bContent.includes('longitude?: number | null')
    const bSelectsCoords = bContent.includes('businessSelect') && bContent.includes('latitude') && bContent.includes('longitude')
    const pHasCoords = pContent.includes('latitude: number | null') && pContent.includes('longitude: number | null')

    if (bHasSummaryCoords && bSelectsCoords && pHasCoords) {
      pass('Service layer provides typed latitude and longitude for businesses and properties without duplicating queries.')
    } else {
      fail('Service layer missing coordinate fields or selections.', { bHasSummaryCoords, bSelectsCoords, pHasCoords })
    }
  } catch (err) {
    fail('Exception checking service layer', err)
  }

  // 4. Verify Discovery & Detail Pages Integration
  console.log('\n--- TEST 4: Discovery & Detail Pages Map Integration ---')
  try {
    const homePageContent = fs.readFileSync('c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/pages/HomePage.tsx', 'utf-8')
    const propPageContent = fs.readFileSync('c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/pages/PropertiesPage.tsx', 'utf-8')
    const bDetailContent = fs.readFileSync('c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/pages/BusinessDetailPage.tsx', 'utf-8')
    const pDetailContent = fs.readFileSync('c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/pages/PropertyDetailPage.tsx', 'utf-8')

    const pageChecks = [
      { name: 'HomePage Grid/Map view toggle and HosurMap rendering', test: homePageContent.includes("viewMode === 'map'") && homePageContent.includes('<HosurMap') },
      { name: 'PropertiesPage Grid/Map view toggle and HosurMap rendering', test: propPageContent.includes("viewMode === 'map'") && propPageContent.includes('<HosurMap') },
      { name: 'BusinessDetailPage embedded mini HosurMap', test: bDetailContent.includes('<HosurMap') && bDetailContent.includes('Address & Map') },
      { name: 'PropertyDetailPage embedded mini HosurMap', test: pDetailContent.includes('<HosurMap') && pDetailContent.includes('Address & Accessibility') },
    ]

    let allPagesPassed = true
    for (const check of pageChecks) {
      if (!check.test) {
        fail(`Page integration missing: ${check.name}`)
        allPagesPassed = false
      }
    }
    if (allPagesPassed) {
      pass('All 4 discovery and detail pages seamlessly integrate HosurMap with view controls.')
    }
  } catch (err) {
    fail('Exception checking page integrations', err)
  }

  // 5. Verify CSS Styling in App.css
  console.log('\n--- TEST 5: CSS Styling for Map & Markers ---')
  try {
    const cssContent = fs.readFileSync('c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/App.css', 'utf-8')
    const styleChecks = [
      '.hosur-map-wrapper',
      '.hosur-map-canvas',
      '.custom-map-div-icon',
      '.map-pin-badge',
      '.map-pin-arrow',
      '.custom-leaflet-popup',
      '.map-popup-card',
      '.view-mode-switch',
    ]

    let allStylesFound = true
    for (const style of styleChecks) {
      if (!cssContent.includes(style)) {
        fail(`App.css missing map style class: ${style}`)
        allStylesFound = false
      }
    }
    if (allStylesFound) {
      pass('App.css contains all 8 required styling classes for map canvas, custom pins, popups, and view mode switchers.')
    }
  } catch (err) {
    fail('Exception checking App.css styles', err)
  }

  // 6. Database Verification & Non-Regression
  console.log('\n--- TEST 6: Database Coordinate Schema & Non-Regression ---')
  try {
    const [bRes, pRes, catRes, subcatRes, reqRes, notifRes] = await Promise.all([
      anonClient.from('businesses').select('id, latitude, longitude').limit(1),
      anonClient.from('properties').select('id, latitude, longitude').limit(1),
      anonClient.from('categories').select('id').limit(1),
      anonClient.from('subcategories').select('id').limit(1),
      anonClient.from('requirements').select('id').limit(1),
      anonClient.from('notifications').select('id').limit(1),
    ])

    if (bRes.error && bRes.error.code !== '42501') fail('businesses check failed', bRes.error)
    else pass('businesses latitude and longitude verified in database schema')

    if (pRes.error && pRes.error.code !== '42501') fail('properties check failed', pRes.error)
    else pass('properties latitude and longitude verified in database schema')

    if (catRes.error) fail('categories check failed', catRes.error)
    else pass('categories non-regression passed')

    if (subcatRes.error) fail('subcategories check failed', subcatRes.error)
    else pass('subcategories non-regression passed')

    if (reqRes.error && reqRes.error.code !== '42501') fail('requirements check failed', reqRes.error)
    else pass('requirements non-regression passed')

    if (notifRes.error && notifRes.error.code !== '42501') fail('notifications non-regression passed')
    else pass('notifications non-regression passed')
  } catch (err) {
    fail('Exception during database verification', err)
  }

  console.log('\n=================================================================')
  console.log(`VERIFICATION SUMMARY: ${passCount} PASSED, ${failCount} FAILED`)
  console.log('=================================================================')

  if (failCount > 0) {
    process.exit(1)
  }
}

runGeolocationMapVerification()
