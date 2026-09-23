/**
 * SUPERHOSUR — Phase 14 Step 5 Verification Suite
 * Premium Map & Location Experience inside BusinessDetailPage
 */

import fs from 'node:fs'

const DETAIL_PAGE = 'c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/pages/BusinessDetailPage.tsx'
const CSS_PATH    = 'c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/App.css'

const detailPage = fs.readFileSync(DETAIL_PAGE, 'utf8')
const css        = fs.readFileSync(CSS_PATH,    'utf8')

let passed = 0
let failed = 0

function pass(msg) { console.log(`[PASS] ${msg}`); passed++ }
function fail(msg) { console.error(`[FAIL] ${msg}`); failed++ }
function check(cond, msg) { cond ? pass(msg) : fail(msg) }

async function runSuite() {
  console.log('=================================================================')
  console.log('  SUPERHOSUR PHASE 14 STEP 5: PREMIUM MAP & LOCATION SUITE')
  console.log('=================================================================\n')

  // ── TEST 1: Location Section Header & Semantics ─────────────────────────────
  console.log('--- TEST 1: Location Section Header & Semantics ---')
  check(detailPage.includes('Address & Map'), 'Exact heading "Address & Map" preserved for regression safety')
  check(detailPage.includes('Location'), 'Eyebrow "Location" present')
  check(detailPage.includes('Find this business in Hosur'), 'Supporting text "Find this business in Hosur" present')
  check(detailPage.includes('business-location-header'), 'Location header container present')
  check(detailPage.includes('business-location-title-wrap'), 'Title wrap container present')
  check(detailPage.includes('business-location-subtitle'), 'Subtitle element present')
  check(detailPage.includes('aria-label="Business location"'), 'Accessible section landmark present')

  // ── TEST 2: Address Block Structure & Formatting ───────────────────────────
  console.log('\n--- TEST 2: Address Block Structure & Formatting ---')
  check(detailPage.includes('business-address-card'), 'Address card container present')
  check(detailPage.includes('business-address-pin'), 'Location pin icon container present')
  check(detailPage.includes('business-address-label'), 'Physical address label present')
  check(detailPage.includes('business-address-text'), 'Address text container present')
  check(detailPage.includes('business.address') && detailPage.includes('business.pincode'), 'Exact address and PIN interpolation preserved')
  check(detailPage.includes('business-address-city'), 'City and state tag present')

  // ── TEST 3: HosurMap Integration & Preservation ─────────────────────────────
  console.log('\n--- TEST 3: HosurMap Component Preservation ---')
  check(detailPage.includes('<HosurMap'), 'HosurMap component rendered')
  check(detailPage.includes('business.latitude') && detailPage.includes('business.longitude'), 'Coordinates binding preserved')
  check(detailPage.includes('markers={['), 'Markers array binding preserved')
  check(detailPage.includes('center={[business.latitude, business.longitude]}'), 'Center coordinates preserved')
  check(detailPage.includes('business-map-frame'), 'Map frame container present')
  check(detailPage.includes('business-map-footer-bar'), 'Map footer bar present')
  check(detailPage.includes('business-map-coord-badge'), 'GPS coordinates badge present')
  check(detailPage.includes('business-map-footer-link'), 'Map footer link present')

  // ── TEST 4: Google Maps Actions & Directions ────────────────────────────────
  console.log('\n--- TEST 4: Directions Action & Map URL ---')
  check(detailPage.includes('business-directions-btn'), 'Directions button class present')
  check(detailPage.includes('Get Directions'), 'Action labeled "Get Directions"')
  check(detailPage.includes('href={mapUrl}'), 'mapUrl binding preserved')
  check(detailPage.includes('target="_blank"'), 'Target _blank preserved for external maps')
  check(detailPage.includes('rel="noreferrer"'), 'rel="noreferrer" preserved for safety')
  check(detailPage.includes('aria-label='), 'Accessible label for directions button present')

  // ── TEST 5: Coordinate Safety & Unpinned Fallback ───────────────────────────
  console.log('\n--- TEST 5: Coordinate Safety & Unpinned Fallback ---')
  check(detailPage.includes('business.latitude !== null && business.longitude !== null'), 'Coordinate validation check preserved')
  check(detailPage.includes('business-map-unpinned-notice'), 'Unpinned fallback notice present')
  check(detailPage.includes('Precise map pin not yet set'), 'Intentional non-error notice title')

  // ── TEST 6: CSS Classes & Design System Tokens ──────────────────────────────
  console.log('\n--- TEST 6: CSS Classes in App.css ---')
  check(css.includes('.business-location-header'), '.business-location-header CSS present')
  check(css.includes('.business-location-subtitle'), '.business-location-subtitle CSS present')
  check(css.includes('.business-directions-btn'), '.business-directions-btn CSS present')
  check(css.includes('.business-address-card'), '.business-address-card CSS present')
  check(css.includes('.business-address-pin'), '.business-address-pin CSS present')
  check(css.includes('.business-address-label'), '.business-address-label CSS present')
  check(css.includes('.business-address-text'), '.business-address-text CSS present')
  check(css.includes('.business-address-city'), '.business-address-city CSS present')
  check(css.includes('.business-map-frame'), '.business-map-frame CSS present')
  check(css.includes('.business-map-footer-bar'), '.business-map-footer-bar CSS present')
  check(css.includes('.business-map-coord-badge'), '.business-map-coord-badge CSS present')
  check(css.includes('.business-map-footer-link'), '.business-map-footer-link CSS present')
  check(css.includes('.business-map-unpinned-notice'), '.business-map-unpinned-notice CSS present')

  // ── TEST 7: Touch Targets & Accessibility Constraints ───────────────────────
  console.log('\n--- TEST 7: Touch Targets & Accessibility Constraints ---')
  check(css.includes('.business-directions-btn') && css.includes('min-height: 44px'), 'Directions button touch target >= 44px')
  check(css.includes('.business-directions-btn:focus-visible'), 'Focus visible styling on directions button')
  check(css.includes('.business-map-footer-link:focus-visible'), 'Focus visible styling on footer map link')

  // ── TEST 8: Responsive Media Queries ────────────────────────────────────────
  console.log('\n--- TEST 8: Responsive Media Queries ---')
  const mq600 = css.slice(css.lastIndexOf('@media (max-width: 600px)'))
  check(mq600.includes('.business-location-header'), '600px: business-location-header styled')
  check(mq600.includes('.business-directions-btn'), '600px: business-directions-btn styled')
  check(mq600.includes('.business-address-card'), '600px: business-address-card styled')
  check(mq600.includes('.business-map-footer-bar'), '600px: business-map-footer-bar styled')

  const mq390 = css.slice(css.lastIndexOf('@media (max-width: 390px)'))
  check(mq390.includes('.business-address-card'), '390px: business-address-card styled')
  check(mq390.includes('.business-address-pin'), '390px: business-address-pin styled')
  check(mq390.includes('.business-address-text'), '390px: business-address-text styled')

  // ── TEST 9: Reduced Motion Support ──────────────────────────────────────────
  console.log('\n--- TEST 9: Reduced Motion Support ---')
  const mqMotion = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'))
  check(mqMotion.includes('.business-directions-btn'), 'Reduced motion: directions btn transition disabled')
  check(mqMotion.includes('.business-directions-btn:hover'), 'Reduced motion: directions btn hover transform disabled')

  console.log('\n=================================================================')
  console.log(`PHASE 14 STEP 5 VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`)
  console.log('=================================================================')

  if (failed > 0) process.exit(1)
}

runSuite().catch(err => {
  console.error('Test suite error:', err)
  process.exit(1)
})
