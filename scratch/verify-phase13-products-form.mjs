/**
 * SUPERHOSUR — Phase 13 Step 4 Verification Suite
 * Premium Products Form Redesign
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
  console.log('  SUPERHOSUR PHASE 13 STEP 4: PREMIUM PRODUCTS FORM SUITE')
  console.log('=================================================================\n')

  // ── TEST 1: ProductFormPanel Card Structure ─────────────────────────────
  console.log('--- TEST 1: ProductFormPanel Card Structure ---')
  check(page.includes('supply-form-card'), 'Card class supply-form-card present')
  check(page.includes('biz-form-section-card'), 'Phase 11 card class biz-form-section-card present')
  check(page.includes('supply-form-header'), 'Header container supply-form-header present')
  check(page.includes('supply-form-title-row'), 'Title row supply-form-title-row present')
  check(page.includes('supply-form-badge'), 'Badge icon supply-form-badge present')
  check(page.includes("editing ? 'Edit Product' : 'Add Product'"), 'Dynamic heading Add/Edit Product')
  check(page.includes('id="product-form-title"'), 'Heading has id product-form-title for aria-labelledby')
  check(page.includes('aria-labelledby="product-form-title"'), 'Form card labeled by product-form-title')

  // ── TEST 2: Editing State Visual Indicators ─────────────────────────────
  console.log('\n--- TEST 2: Editing State Visual Indicators ---')
  check(page.includes('supply-editing-pill'), 'Editing mode pill badge present')
  check(page.includes('supply-editing-dot'), 'Editing mode dot present')
  check(page.includes('supply-editing-banner'), 'Editing notification banner present')
  check(page.includes('supply-editing-pulse'), 'Pulsing dot indicator in banner')
  check(page.includes('supply-editing-cancel-btn'), 'Direct cancel/discard button in banner')
  check(page.includes('Currently editing:'), 'Banner copy displays currently editing name')

  // ── TEST 3: All Product Fields & Constraints ────────────────────────────
  console.log('\n--- TEST 3: All Product Fields & Constraints ---')
  check(page.includes('id="product-name"'), 'Product name input ID present')
  check(page.includes('id="product-subcategory"'), 'Subcategory select ID present')
  check(page.includes('id="product-price"'), 'Price input ID present')
  check(page.includes('id="product-unit"'), 'Unit input ID present')
  check(page.includes('id="product-availability"'), 'Availability select ID present')
  check(page.includes('id="product-description"'), 'Description textarea ID present')
  check(page.includes('htmlFor="product-name"'), 'Label htmlFor matches product-name')
  check(page.includes('htmlFor="product-subcategory"'), 'Label htmlFor matches product-subcategory')
  check(page.includes('htmlFor="product-price"'), 'Label htmlFor matches product-price')
  check(page.includes('htmlFor="product-unit"'), 'Label htmlFor matches product-unit')
  check(page.includes('htmlFor="product-availability"'), 'Label htmlFor matches product-availability')
  check(page.includes('htmlFor="product-description"'), 'Label htmlFor matches product-description')

  // ── TEST 4: Character Counters & Helpers ─────────────────────────────────
  console.log('\n--- TEST 4: Character Counters & Helpers ---')
  check(page.includes('{form.name.length}/100'), 'Name character counter (max 100)')
  check(page.includes('{form.unit.length}/30'), 'Unit character counter (max 30)')
  check(page.includes('{form.description.length}/500'), 'Description character counter (max 500)')
  check(page.includes('product-name-hint'), 'Product name helper hint')
  check(page.includes('product-subcategory-hint'), 'Subcategory helper hint')
  check(page.includes('product-price-hint'), 'Price helper hint')
  check(page.includes('product-unit-hint'), 'Unit helper hint')
  check(page.includes('product-availability-hint'), 'Availability helper hint')
  check(page.includes('product-desc-hint'), 'Description helper hint')

  // ── TEST 5: Currency Communicator (₹) ───────────────────────────────────
  console.log('\n--- TEST 5: Currency Communicator (₹) ---')
  check(page.includes('supply-currency-input-wrap'), 'Currency wrapper class present')
  check(page.includes('supply-currency-symbol'), 'Currency symbol class present')
  check(page.includes('₹'), 'Rupee symbol ₹ rendered')
  check(page.includes('supply-currency-input'), 'Currency input class present')
  check(page.includes('Price (₹)'), 'Price label communicates INR')

  // ── TEST 6: Availability Status Options ─────────────────────────────────
  console.log('\n--- TEST 6: Availability Status Options ---')
  check(page.includes('value="available"'), 'Availability option: available')
  check(page.includes('value="limited"'), 'Availability option: limited')
  check(page.includes('value="unavailable"'), 'Availability option: unavailable')
  check(page.includes('>Available<'), 'Availability text: Available')
  check(page.includes('>Limited<'), 'Availability text: Limited')
  check(page.includes('>Unavailable<'), 'Availability text: Unavailable')

  // ── TEST 7: Validation Logic Preservation ───────────────────────────────
  console.log('\n--- TEST 7: Validation Logic Preservation ---')
  check(page.includes("errors.name = 'Product name is required.'"), 'Name required validation preserved')
  check(page.includes("errors.name = 'Product name must be at most 100 characters.'"), 'Name max 100 validation preserved')
  check(page.includes("errors.price = 'Product price is required.'"), 'Price required validation preserved')
  check(page.includes("errors.price = 'Product price must be greater than 0.'"), 'Price > 0 validation preserved')
  check(page.includes("errors.description = 'Description cannot be whitespace only.'"), 'Description whitespace-only check preserved')
  check(page.includes("errors.description = 'Description must be at most 500 characters.'"), 'Description max 500 validation preserved')
  check(page.includes("errors.unit = 'Unit must be at most 30 characters.'"), 'Unit max 30 validation preserved')
  check(page.includes('createBusinessProduct'), 'createBusinessProduct service call preserved')
  check(page.includes('updateBusinessProduct'), 'updateBusinessProduct service call preserved')
  check(page.includes('editingProductId'), 'editingProductId state preserved')
  check(page.includes('productErrors'), 'productErrors state preserved')
  check(page.includes("saving === 'product'"), 'saving state preserved')
  check(page.includes('productFormRef.current?.scrollIntoView'), 'Smooth scroll into view preserved')

  // ── TEST 8: Accessibility Attributes ────────────────────────────────────
  console.log('\n--- TEST 8: Accessibility Attributes ---')
  check(page.includes('aria-required="true"'), 'aria-required on product name and price')
  check(page.includes('aria-invalid={Boolean(errors.name)}'), 'aria-invalid on product name')
  check(page.includes('aria-invalid={Boolean(errors.price)}'), 'aria-invalid on price')
  check(page.includes('aria-invalid={Boolean(errors.unit)}'), 'aria-invalid on unit')
  check(page.includes('aria-invalid={Boolean(errors.description)}'), 'aria-invalid on description')
  check(page.includes('role="alert"'), 'role=alert on field error spans')
  check(page.includes('aria-live="polite"'), 'aria-live=polite on live elements')
  check(page.includes('noValidate'), 'noValidate preserved on form')

  // ── TEST 9: CSS Classes and Touch Targets ────────────────────────────────
  console.log('\n--- TEST 9: CSS Classes & Touch Targets ---')
  const expectedClasses = [
    '.supply-form-card', '.supply-form-header', '.supply-form-title-row',
    '.supply-form-badge', '.supply-form-title', '.supply-editing-pill',
    '.supply-editing-dot', '.supply-form-desc', '.supply-editing-banner',
    '.supply-editing-banner-content', '.supply-editing-pulse', '@keyframes pulse-dot',
    '.supply-editing-cancel-btn', '.supply-currency-input-wrap', '.supply-currency-symbol',
    '.supply-currency-input', '.supply-availability-select', '.supply-form-actions',
    '.supply-btn-submit', '.supply-btn-cancel'
  ]
  for (const cls of expectedClasses) {
    check(css.includes(cls), `CSS class present: ${cls}`)
  }
  check(css.includes('min-height: 48px'), 'Touch targets >= 48px defined')

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n=================================================================')
  console.log(`PHASE 13 STEP 4 VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`)
  console.log('=================================================================\n')

  if (failed > 0) process.exit(1)
}

runSuite()
