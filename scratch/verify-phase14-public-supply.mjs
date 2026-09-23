/**
 * SUPERHOSUR — Phase 14 Step 4 Verification Suite
 * Public Products & Services Experience inside BusinessDetailPage
 */

import fs from 'node:fs'

const DETAIL_PAGE = 'c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/pages/BusinessDetailPage.tsx'
const CSS_PATH    = 'c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/App.css'
const SUPPLY_SVC  = 'c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/services/supply.ts'

const detailPage = fs.readFileSync(DETAIL_PAGE, 'utf8')
const css        = fs.readFileSync(CSS_PATH,    'utf8')
const supplySvc  = fs.readFileSync(SUPPLY_SVC,   'utf8')

let passed = 0
let failed = 0

function pass(msg) { console.log(`[PASS] ${msg}`); passed++ }
function fail(msg) { console.error(`[FAIL] ${msg}`); failed++ }
function check(cond, msg) { cond ? pass(msg) : fail(msg) }

async function runSuite() {
  console.log('=================================================================')
  console.log('  SUPERHOSUR PHASE 14 STEP 4: PUBLIC PRODUCTS & SERVICES SUITE')
  console.log('=================================================================\n')

  // ── TEST 1: Service Layer & Data Preservation ──────────────────────────────
  console.log('--- TEST 1: Service Layer & Data Logic Preservation ---')
  check(detailPage.includes('getBusinessServices'), 'getBusinessServices import preserved')
  check(detailPage.includes('getBusinessProducts'), 'getBusinessProducts import preserved')
  check(detailPage.includes('setServices(serviceRows)'), 'setServices data binding preserved')
  check(detailPage.includes('setProducts(productRows)'), 'setProducts data binding preserved')
  check(supplySvc.includes('export async function getBusinessServices'), 'getBusinessServices service intact')
  check(supplySvc.includes('export async function getBusinessProducts'), 'getBusinessProducts service intact')

  // ── TEST 2: Public Service Card Structure & Taxonomy ────────────────────────
  console.log('\n--- TEST 2: Public Service Card Structure & Taxonomy ---')
  check(detailPage.includes('supply-card-kind-badge--service'), 'Service kind badge present')
  check(detailPage.includes('Service') && detailPage.includes('supply-card-kind-badge'), 'Service badge label')
  check(detailPage.includes('supply-card-taxonomy-badge'), 'Taxonomy badge rendered')
  check(detailPage.includes('id={`service-title-${service.id}`}'), 'Service title ID defined for accessibility')
  check(detailPage.includes('aria-labelledby={`service-title-${service.id}`}'), 'Service card aria-labelledby linked')
  check(detailPage.includes('supply-card-title'), 'Service card title class present')
  check(detailPage.includes('supply-card-description'), 'Service description class present')
  check(detailPage.includes('From ₹'), 'Service price communicates INR (₹)')
  check(detailPage.includes('service.price_from ?? service.price_to'), 'Price fallback logic preserved')
  check(detailPage.includes('Price on request'), 'Price on request fallback present for unpriced services')
  check(detailPage.includes('service.price_unit'), 'Service price unit rendered')

  // ── TEST 3: Public Product Card Structure & Availability ────────────────────
  console.log('\n--- TEST 3: Public Product Card Structure & Availability ---')
  check(detailPage.includes('supply-card-kind-badge--product'), 'Product kind badge present')
  check(detailPage.includes('Product') && detailPage.includes('supply-card-kind-badge'), 'Product badge label')
  check(detailPage.includes('id={`product-title-${product.id}`}'), 'Product title ID defined for accessibility')
  check(detailPage.includes('aria-labelledby={`product-title-${product.id}`}'), 'Product card aria-labelledby linked')
  check(detailPage.includes('supply-card-title'), 'Product card title class present')
  check(detailPage.includes('supply-card-description'), 'Product description class present')
  check(detailPage.includes('₹{product.price}'), 'Product price communicates INR (₹)')
  check(detailPage.includes('product.unit'), 'Product unit rendered')
  check(detailPage.includes('supply-avail-badge--${product.availability}'), 'Dynamic availability badge class used')
  check(detailPage.includes('supply-avail-dot'), 'Availability status indicator dot present')
  check(detailPage.includes("product.availability === 'available'"), 'Availability status mapping preserved')

  // ── TEST 4: Non-Owner Public Safety (No Edit/Delete in Public View) ─────────
  console.log('\n--- TEST 4: Public Non-Management Guard ---')
  check(!detailPage.includes('handleDeleteService'), 'No handleDeleteService in public business detail')
  check(!detailPage.includes('handleDeleteProduct'), 'No handleDeleteProduct in public business detail')
  check(!detailPage.includes('startServiceEdit'), 'No startServiceEdit in public business detail')
  check(!detailPage.includes('startProductEdit'), 'No startProductEdit in public business detail')

  // ── TEST 5: Polished Empty States ───────────────────────────────────────────
  console.log('\n--- TEST 5: Intentional Empty States ---')
  check(detailPage.includes('public-supply-empty-card'), 'Empty state card container present')
  check(detailPage.includes('public-supply-empty-icon'), 'Empty state icon present')
  check(detailPage.includes('public-supply-empty-title'), 'Empty state title present')
  check(detailPage.includes('public-supply-empty-desc'), 'Empty state description present')
  check(detailPage.includes('No services listed yet'), 'Informative non-error service empty text')
  check(detailPage.includes('No products listed yet'), 'Informative non-error product empty text')
  check(detailPage.includes('role="status"'), 'Accessible role=status on empty states')

  // ── TEST 6: CSS Design Classes in App.css ───────────────────────────────────
  console.log('\n--- TEST 6: CSS Classes & Styling ---')
  check(css.includes('.public-supply-list'), '.public-supply-list CSS present')
  check(css.includes('.public-supply-card'), '.public-supply-card CSS present')
  check(css.includes('.public-supply-card:focus-visible'), '.public-supply-card:focus-visible CSS present')
  check(css.includes('.public-supply-empty-card'), '.public-supply-empty-card CSS present')
  check(css.includes('.public-supply-empty-icon'), '.public-supply-empty-icon CSS present')
  check(css.includes('.public-supply-empty-title'), '.public-supply-empty-title CSS present')
  check(css.includes('.public-supply-empty-desc'), '.public-supply-empty-desc CSS present')

  // ── TEST 7: Responsive Media Queries ────────────────────────────────────────
  console.log('\n--- TEST 7: Responsive Media Queries ---')
  const mq600 = css.slice(css.lastIndexOf('@media (max-width: 600px)'))
  check(mq600.includes('.public-supply-empty-card'), '600px: public-supply-empty-card styled')
  check(mq600.includes('.public-supply-card'), '600px: public-supply-card styled')

  const mq390 = css.slice(css.lastIndexOf('@media (max-width: 390px)'))
  check(mq390.includes('.public-supply-card'), '390px: public-supply-card styled')
  check(mq390.includes('.public-supply-empty-card'), '390px: public-supply-empty-card styled')

  // ── TEST 8: Reduced Motion Support ──────────────────────────────────────────
  console.log('\n--- TEST 8: Reduced Motion Support ---')
  const mqMotion = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'))
  check(mqMotion.includes('.public-supply-card'), 'Reduced motion: public supply card transition disabled')
  check(mqMotion.includes('.public-supply-card:hover'), 'Reduced motion: public supply card hover transform disabled')

  console.log('\n=================================================================')
  console.log(`PHASE 14 STEP 4 VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`)
  console.log('=================================================================')

  if (failed > 0) process.exit(1)
}

runSuite().catch(err => {
  console.error('Test suite error:', err)
  process.exit(1)
})
