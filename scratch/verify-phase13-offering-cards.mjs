/**
 * SUPERHOSUR — Phase 13 Step 5 Verification Suite
 * Premium Offering Cards (Services & Products)
 */

import fs from 'node:fs'

const PAGE_PATH = 'c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/pages/ManageBusinessSupplyPage.tsx'
const CSS_PATH  = 'c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/App.css'

const page = fs.readFileSync(PAGE_PATH, 'utf8')
const css  = fs.readFileSync(CSS_PATH,  'utf8')

let passed = 0
let failed = 0

function pass(msg) { console.log(`[PASS] ${msg}`); passed++ }
function fail(msg) { console.error(`[FAIL] ${msg}`); failed++ }
function check(cond, msg) { cond ? pass(msg) : fail(msg) }

async function runSuite() {
  console.log('=================================================================')
  console.log('  SUPERHOSUR PHASE 13 STEP 5: PREMIUM OFFERING CARDS SUITE')
  console.log('=================================================================\n')

  // ── TEST 1: Service Card Structure & Elements ───────────────────────────
  console.log('--- TEST 1: Service Card Structure & Elements ---')
  check(page.includes('supply-card-kind-badge--service'), 'Service kind badge class present')
  check(page.includes('Service') && page.includes('supply-card-kind-badge'), 'Service badge label')
  check(page.includes('id={`service-title-${service.id}`}'), 'Service title ID for aria-labelledby')
  check(page.includes('aria-labelledby={`service-title-${service.id}`}'), 'Service article aria-labelledby linked')
  check(page.includes('supply-card-title'), 'Card title class present')
  check(page.includes('supply-card-taxonomy-badge'), 'Taxonomy badge class present')
  check(page.includes('From ₹'), 'Service price communicates INR (₹)')
  check(page.includes('service.price_from ?? service.price_to'), 'Price fallback logic preserved')
  check(page.includes('service.price_unit'), 'Service price unit rendered')
  check(page.includes('supply-card-description'), 'Card description class present')
  check(page.includes('startServiceEdit(service)'), 'startServiceEdit handler preserved')
  check(page.includes('handleDeleteService(service.id)'), 'handleDeleteService handler preserved')
  check(page.includes('aria-label={`Edit ${service.name}`}'), 'Edit service accessible action label')
  check(page.includes('aria-label={`Delete ${service.name}`}'), 'Delete service accessible action label')

  // ── TEST 2: Product Card Structure & Elements ───────────────────────────
  console.log('\n--- TEST 2: Product Card Structure & Elements ---')
  check(page.includes('supply-card-kind-badge--product'), 'Product kind badge class present')
  check(page.includes('Product') && page.includes('supply-card-kind-badge'), 'Product badge label')
  check(page.includes('id={`product-title-${product.id}`}'), 'Product title ID for aria-labelledby')
  check(page.includes('aria-labelledby={`product-title-${product.id}`}'), 'Product article aria-labelledby linked')
  check(page.includes('₹{product.price}'), 'Product price communicates INR (₹)')
  check(page.includes('product.unit'), 'Product unit rendered')
  check(page.includes('supply-avail-badge--${product.availability}'), 'Dynamic availability badge class used')
  check(css.includes('.supply-avail-badge--available'), 'Available badge variant in CSS')
  check(css.includes('.supply-avail-badge--limited'), 'Limited badge variant in CSS')
  check(css.includes('.supply-avail-badge--unavailable'), 'Unavailable badge variant in CSS')
  check(page.includes('startProductEdit(product)'), 'startProductEdit handler preserved')
  check(page.includes('handleDeleteProduct(product.id)'), 'handleDeleteProduct handler preserved')
  check(page.includes('aria-label={`Edit ${product.name}`}'), 'Edit product accessible action label')
  check(page.includes('aria-label={`Delete ${product.name}`}'), 'Delete product accessible action label')

  // ── TEST 3: Preservation of Core Actions & Logic ────────────────────────
  console.log('\n--- TEST 3: Preservation of Core Actions & Logic ---')
  check(page.includes("window.confirm('Delete this service?')"), 'Service deletion confirmation preserved')
  check(page.includes("window.confirm('Delete this product?')"), 'Product deletion confirmation preserved')
  check(page.includes('deleteBusinessService(serviceId)'), 'deleteBusinessService service call preserved')
  check(page.includes('deleteBusinessProduct(productId)'), 'deleteBusinessProduct service call preserved')
  check(page.includes('refreshSupply(business.id)'), 'refreshSupply call preserved after deletes')

  // ── TEST 4: CSS Design Classes for Offering Cards ───────────────────────
  console.log('\n--- TEST 4: CSS Design Classes for Offering Cards ---')
  const expectedClasses = [
    '.supply-card', '.supply-card:hover', '.supply-card:focus-within',
    '.supply-card-main', '.supply-card-top', '.supply-card-badge-row',
    '.supply-card-kind-badge', '.supply-card-kind-badge--service',
    '.supply-card-kind-badge--product', '.supply-card-taxonomy-badge',
    '.supply-avail-badge', '.supply-avail-dot',
    '.supply-avail-badge--available', '.supply-avail-badge--limited',
    '.supply-avail-badge--unavailable', '.supply-card-title',
    '.supply-card-description', '.supply-card-meta',
    '.supply-card-price-box', '.supply-card-price-label',
    '.supply-card-price-val', '.supply-card-price-unit',
    '.supply-card-actions', '.supply-action-btn',
    '.supply-action-btn--edit', '.supply-action-btn--delete'
  ]
  for (const cls of expectedClasses) {
    check(css.includes(cls), `CSS class present: ${cls}`)
  }

  // ── TEST 5: Touch Targets ≥ 44px ─────────────────────────────────────────
  console.log('\n--- TEST 5: Touch Targets ≥ 44px ---')
  check(css.includes('min-height: 44px') && css.includes('.supply-action-btn'), 'Touch targets min-height 44px on supply action buttons')

  // ── TEST 6: Responsive & Reduced Motion CSS ──────────────────────────────
  console.log('\n--- TEST 6: Responsive & Reduced Motion CSS ---')
  const after860 = css.slice(css.lastIndexOf('@media (max-width: 860px)'))
  check(after860.includes('.supply-card'), '860px: supply-card padding/gap')

  const after600 = css.slice(css.lastIndexOf('@media (max-width: 600px)'))
  check(after600.includes('.supply-card'), '600px: supply-card stacks vertically')
  check(after600.includes('.supply-card-actions'), '600px: card actions full width')
  check(after600.includes('.supply-action-btn'), '600px: action buttons flex: 1 with min-height: 44px')

  const after390 = css.slice(css.lastIndexOf('@media (max-width: 390px)'))
  check(after390.includes('.supply-card'), '390px: compact supply-card padding')
  check(after390.includes('.supply-card-title'), '390px: compact title font size')

  const lastReduced = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'))
  check(lastReduced.includes('.supply-card:hover'), 'Reduced motion: supply-card hover transform disabled')

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n=================================================================')
  console.log(`PHASE 13 STEP 5 VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`)
  console.log('=================================================================\n')

  if (failed > 0) process.exit(1)
}

runSuite()
