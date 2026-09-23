/**
 * SUPERHOSUR — Phase 13 Step 3 Verification Suite
 * Premium Services Form Redesign
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
  console.log('  SUPERHOSUR PHASE 13 STEP 3: PREMIUM SERVICES FORM SUITE')
  console.log('=================================================================\n')

  // ── TEST 1: ServiceFormPanel Card Structure ─────────────────────────────
  console.log('--- TEST 1: ServiceFormPanel Card Structure ---')
  check(page.includes('supply-form-card'), 'Card class supply-form-card present')
  check(page.includes('biz-form-section-card'), 'Phase 11 card class biz-form-section-card present')
  check(page.includes('supply-form-header'), 'Header container supply-form-header present')
  check(page.includes('supply-form-title-row'), 'Title row supply-form-title-row present')
  check(page.includes('supply-form-badge'), 'Badge icon supply-form-badge present')
  check(page.includes("editing ? 'Edit Service' : 'Add Service'"), 'Dynamic heading Add/Edit Service')
  check(page.includes('id="service-form-title"'), 'Heading has id service-form-title for aria-labelledby')
  check(page.includes('aria-labelledby="service-form-title"'), 'Form card labeled by service-form-title')

  // ── TEST 2: Editing State Visual Indicators ─────────────────────────────
  console.log('\n--- TEST 2: Editing State Visual Indicators ---')
  check(page.includes('supply-editing-pill'), 'Editing mode pill badge present')
  check(page.includes('supply-editing-dot'), 'Editing mode dot present')
  check(page.includes('supply-editing-banner'), 'Editing notification banner present')
  check(page.includes('supply-editing-pulse'), 'Pulsing dot indicator in banner')
  check(page.includes('supply-editing-cancel-btn'), 'Direct cancel/discard button in banner')
  check(page.includes('Currently editing:'), 'Banner copy displays currently editing name')

  // ── TEST 3: All Service Fields & Constraints ────────────────────────────
  console.log('\n--- TEST 3: All Service Fields & Constraints ---')
  check(page.includes('id="service-name"'), 'Service name input ID present')
  check(page.includes('id="service-subcategory"'), 'Subcategory select ID present')
  check(page.includes('id="service-price-from"'), 'Price from input ID present')
  check(page.includes('id="service-price-to"'), 'Price to input ID present')
  check(page.includes('id="service-price-unit"'), 'Price unit input ID present')
  check(page.includes('id="service-description"'), 'Description textarea ID present')
  check(page.includes('htmlFor="service-name"'), 'Label htmlFor matches service-name')
  check(page.includes('htmlFor="service-subcategory"'), 'Label htmlFor matches service-subcategory')
  check(page.includes('htmlFor="service-price-from"'), 'Label htmlFor matches service-price-from')
  check(page.includes('htmlFor="service-price-to"'), 'Label htmlFor matches service-price-to')
  check(page.includes('htmlFor="service-price-unit"'), 'Label htmlFor matches service-price-unit')
  check(page.includes('htmlFor="service-description"'), 'Label htmlFor matches service-description')

  // ── TEST 4: Character Counters & Helpers ─────────────────────────────────
  console.log('\n--- TEST 4: Character Counters & Helpers ---')
  check(page.includes('{form.name.length}/100'), 'Name character counter (max 100)')
  check(page.includes('{form.priceUnit.length}/30'), 'Price unit character counter (max 30)')
  check(page.includes('{form.description.length}/500'), 'Description character counter (max 500)')
  check(page.includes('service-name-hint'), 'Service name helper hint')
  check(page.includes('service-subcategory-hint'), 'Subcategory helper hint')
  check(page.includes('service-pricefrom-hint'), 'Price from helper hint')
  check(page.includes('service-priceto-hint'), 'Price to helper hint')
  check(page.includes('service-priceunit-hint'), 'Price unit helper hint')
  check(page.includes('service-desc-hint'), 'Description helper hint')

  // ── TEST 5: Currency Communicator (₹) ───────────────────────────────────
  console.log('\n--- TEST 5: Currency Communicator (₹) ---')
  check(page.includes('supply-currency-input-wrap'), 'Currency wrapper class present')
  check(page.includes('supply-currency-symbol'), 'Currency symbol class present')
  check(page.includes('₹'), 'Rupee symbol ₹ rendered')
  check(page.includes('supply-currency-input'), 'Currency input class present')
  check(page.includes('Price from (₹)'), 'Price from label communicates INR')
  check(page.includes('Price to (₹)'), 'Price to label communicates INR')

  // ── TEST 6: Validation Logic Preservation ───────────────────────────────
  console.log('\n--- TEST 6: Validation Logic Preservation ---')
  check(page.includes("errors.name = 'Service name is required.'"), 'Name required validation preserved')
  check(page.includes("errors.name = 'Service name must be at most 100 characters.'"), 'Name max 100 validation preserved')
  check(page.includes("errors.description = 'Description cannot be whitespace only.'"), 'Description whitespace-only check preserved')
  check(page.includes("errors.description = 'Description must be at most 500 characters.'"), 'Description max 500 validation preserved')
  check(page.includes("errors.priceUnit = 'Price unit must be at most 30 characters.'"), 'Price unit max 30 validation preserved')
  check(page.includes("errors.priceFrom = 'Starting price must be 0 or more.'"), 'Price from >= 0 validation preserved')
  check(page.includes("errors.priceTo = 'Ending price must be 0 or more.'"), 'Price to >= 0 validation preserved')
  check(page.includes("errors.priceTo = 'Ending price cannot be less than starting price.'"), 'Price to >= Price from validation preserved')
  check(page.includes('createBusinessService'), 'createBusinessService service call preserved')
  check(page.includes('updateBusinessService'), 'updateBusinessService service call preserved')
  check(page.includes('editingServiceId'), 'editingServiceId state preserved')
  check(page.includes('serviceErrors'), 'serviceErrors state preserved')
  check(page.includes("saving === 'service'"), 'saving state preserved')
  check(page.includes('serviceFormRef.current?.scrollIntoView'), 'Smooth scroll into view preserved')

  // ── TEST 7: Accessibility Attributes ────────────────────────────────────
  console.log('\n--- TEST 7: Accessibility Attributes ---')
  check(page.includes('aria-required="true"'), 'aria-required on service name')
  check(page.includes('aria-invalid={Boolean(errors.name)}'), 'aria-invalid on service name')
  check(page.includes('aria-invalid={Boolean(errors.priceFrom)}'), 'aria-invalid on priceFrom')
  check(page.includes('aria-invalid={Boolean(errors.priceTo)}'), 'aria-invalid on priceTo')
  check(page.includes('aria-invalid={Boolean(errors.priceUnit)}'), 'aria-invalid on priceUnit')
  check(page.includes('aria-invalid={Boolean(errors.description)}'), 'aria-invalid on description')
  check(page.includes('role="alert"'), 'role=alert on field error spans')
  check(page.includes('aria-live="polite"'), 'aria-live=polite on live elements')
  check(page.includes('noValidate'), 'noValidate preserved on form')

  // ── TEST 8: CSS Classes and Touch Targets ────────────────────────────────
  console.log('\n--- TEST 8: CSS Classes & Touch Targets ---')
  const expectedClasses = [
    '.supply-form-card', '.supply-form-header', '.supply-form-title-row',
    '.supply-form-badge', '.supply-form-title', '.supply-editing-pill',
    '.supply-editing-dot', '.supply-form-desc', '.supply-editing-banner',
    '.supply-editing-banner-content', '.supply-editing-pulse', '@keyframes pulse-dot',
    '.supply-editing-cancel-btn', '.supply-currency-input-wrap', '.supply-currency-symbol',
    '.supply-currency-input', '.supply-form-actions', '.supply-btn-submit',
    '.supply-btn-cancel'
  ]
  for (const cls of expectedClasses) {
    check(css.includes(cls), `CSS class present: ${cls}`)
  }
  check(css.includes('min-height: 48px'), 'Touch targets >= 48px defined')

  // ── TEST 9: Responsive & Reduced Motion CSS ──────────────────────────────
  console.log('\n--- TEST 9: Responsive & Reduced Motion CSS ---')
  const after860 = css.slice(css.lastIndexOf('@media (max-width: 860px)'))
  check(after860.includes('.supply-form-card'), '860px: supply-form-card padding')

  const after600 = css.slice(css.lastIndexOf('@media (max-width: 600px)'))
  check(after600.includes('.supply-form-actions'), '600px: form actions stacked')
  check(after600.includes('.supply-btn-submit'), '600px: submit button full width')
  check(after600.includes('.supply-btn-cancel'), '600px: cancel button full width')
  check(after600.includes('.supply-editing-banner'), '600px: editing banner stacked')

  const after390 = css.slice(css.lastIndexOf('@media (max-width: 390px)'))
  check(after390.includes('.supply-form-card'), '390px: compact supply-form-card')
  check(after390.includes('.supply-form-title'), '390px: compact title font size')

  const lastReduced = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'))
  check(lastReduced.includes('.supply-editing-pulse'), 'Reduced motion: editing pulse animation disabled')

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n=================================================================')
  console.log(`PHASE 13 STEP 3 VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`)
  console.log('=================================================================\n')

  if (failed > 0) process.exit(1)
}

runSuite()
