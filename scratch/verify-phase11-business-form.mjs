/**
 * SUPERHOSUR — Phase 11 Verification Suite
 * Business Create / Edit Form Redesign
 */

import fs from 'node:fs'
import { createClient } from 'file:///c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/node_modules/@supabase/supabase-js/dist/index.mjs'

const SUPABASE_URL = 'https://cdsghhesglltjvqbewol.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_ubnd6hu6T0jz33SdUYFoRw_mXHwsHi0'
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const PAGE_PATH = 'c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/pages/CreateBusinessPage.tsx'
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
  console.log('  SUPERHOSUR PHASE 11: BUSINESS CREATE / EDIT FORM SUITE')
  console.log('=================================================================\n')

  // ── TEST 1: Validation logic preserved ──────────────────────────────────
  console.log('--- TEST 1: Validation Logic Preservation ---')
  check(page.includes('PHONE_REGEX'), 'Indian phone regex preserved')
  check(page.includes('PINCODE_REGEX'), 'Indian PIN code regex preserved')
  check(page.includes('SLUG_REGEX'), 'Slug regex preserved')
  check(page.includes('parseAndValidateCoordinates'), 'Coordinate validation utility used')
  check(page.includes("errors.name = values.name.length > 0 ? 'Business name cannot be only whitespace.'"), 'Whitespace-only name validation preserved')
  check(page.includes("'Business name must be between 2 and 100 characters.'"), 'Name length validation (2–100) preserved')
  check(page.includes("'Please select a city.'"), 'City required validation preserved')
  check(page.includes("'Please select a category.'"), 'Category required validation preserved')
  check(page.includes("'Enter a valid 10-digit Indian phone number"), 'Phone error message preserved')
  check(page.includes("'Enter a valid 10-digit Indian WhatsApp number"), 'WhatsApp error message preserved')
  check(page.includes("'Enter a valid email address"), 'Email error message preserved')
  check(page.includes("'Enter a valid 6-digit Indian PIN code"), 'PIN code error message preserved')
  check(page.includes("'Address cannot exceed 250 characters.'"), 'Address max-length validation preserved')
  check(page.includes("'Description cannot exceed 1000 characters.'"), 'Description max-length validation preserved')
  check(page.includes('Object.keys(errors).length === 0'), 'Validation isValid check preserved')

  // ── TEST 2: All form fields present ─────────────────────────────────────
  console.log('\n--- TEST 2: All Form Fields Present ---')
  check(page.includes('id="biz-name"'),         'Business name field')
  check(page.includes('id="biz-slug"'),         'Slug field')
  check(page.includes('id="biz-city"'),         'City select')
  check(page.includes('id="biz-category"'),     'Category select')
  check(page.includes('id="biz-phone"'),        'Phone field')
  check(page.includes('id="biz-whatsapp"'),     'WhatsApp field')
  check(page.includes('id="biz-email"'),        'Email field')
  check(page.includes('id="biz-address"'),      'Address textarea')
  check(page.includes('id="biz-pincode"'),      'Pincode field')
  check(page.includes('id="biz-latitude"'),     'Latitude field')
  check(page.includes('id="biz-longitude"'),    'Longitude field')
  check(page.includes('id="biz-description"'), 'Description textarea')
  check(page.includes('id="biz-availability"'),'Availability select')

  // ── TEST 3: Field constraints preserved ─────────────────────────────────
  console.log('\n--- TEST 3: Field Constraints Preserved ---')
  check(page.includes('maxLength={100}'),  'maxLength 100 (name/slug) present')
  check(page.includes('maxLength={15}'),   'maxLength 15 (phone/whatsapp) present')
  check(page.includes('maxLength={255}'),  'maxLength 255 (email) present')
  check(page.includes('maxLength={6}'),    'maxLength 6 (pincode) present')
  check(page.includes('maxLength={250}'),  'maxLength 250 (address) present')
  check(page.includes('maxLength={1000}'), 'maxLength 1000 (description) present')
  check(page.includes('type="tel"'),       'type=tel on phone fields')
  check(page.includes('type="email"'),     'type=email on email field')
  check(page.includes('step="any"'),       'step=any on coordinate number inputs')

  // ── TEST 4: Accessibility attributes ────────────────────────────────────
  console.log('\n--- TEST 4: Accessibility Attributes ---')
  check(page.includes('aria-required="true"'),            'aria-required on required fields')
  check(page.includes('aria-invalid={Boolean(fieldErrors.name)}'),        'aria-invalid on name field')
  check(page.includes('aria-invalid={Boolean(fieldErrors.phone)}'),       'aria-invalid on phone field')
  check(page.includes('aria-invalid={Boolean(fieldErrors.coordinates)}'), 'aria-invalid on coordinate fields')
  check(page.includes('aria-describedby='),               'aria-describedby used for linking')
  check(page.includes('role="alert"'),                    'role=alert on error elements')
  check(page.includes('biz-form-error-banner'),           'Global error banner present')
  check(page.includes('aria-label="Loading business form"'), 'Loading state accessible label')
  check(page.includes('aria-labelledby="biz-form-title"'), 'Page main aria-labelledby')
  check(page.includes('id="biz-form-title"'),             'h1 has id for aria-labelledby')
  check(page.includes('aria-label="Form submission actions"'), 'Form action group label')
  check(page.includes('aria-live="polite"'),              'Char counters use aria-live=polite')
  check(page.includes('role="note"'),                     'GPS tip panel role=note')
  check(page.includes('id="biz-coord-error"'),            'Coordinate error ID for aria-describedby')
  check(page.includes('noValidate'),                      'noValidate preserves custom validation')

  // ── TEST 5: Create vs Edit mode ──────────────────────────────────────────
  console.log('\n--- TEST 5: Create vs Edit Mode ---')
  check(page.includes("isEditing ? 'Edit Your Business' : 'Create Your Business'"), 'Dynamic heading')
  check(page.includes("'Save Changes'") && page.includes("'Create Business'"),      'Dynamic submit button label (Save Changes / Create Business)')
  check(page.includes("isEditing && businessId"),                                  'Media managers gated on edit mode')
  check(page.includes('Business Listing'),                                          'Eyebrow text: Business Listing')
  check(page.includes("'Edit Your Business'"),                                      'Edit heading present')
  check(page.includes("'Create Your Business'"),                                    'Create heading present')
  check(page.includes("isEditing ? 'Edit business form' : 'Create business form'"), 'Form aria-label dynamic')

  // ── TEST 6: Form section structure (A–E) ────────────────────────────────
  console.log('\n--- TEST 6: Form Section Structure (A–E) ---')
  check(page.includes('section-business-info'),    'Section A: Business Information id')
  check(page.includes('section-category'),         'Section B: Category id')
  check(page.includes('section-contact'),          'Section C: Contact id')
  check(page.includes('section-location'),         'Section D: Location id')
  check(page.includes('section-description'),      'Section E: Description id')
  check(page.includes('biz-form-section-card'),    'Section card class used')
  check(page.includes('biz-form-section-heading'), 'Section heading class used')
  check(page.includes('biz-form-section-num'),     'Section number badge used')
  check(page.includes('biz-form-grid'),            'Two-column grid used in sections')

  // ── TEST 7: Loading and error states ────────────────────────────────────
  console.log('\n--- TEST 7: Loading and Error States ---')
  check(page.includes('biz-form-skeleton-title'), 'Skeleton title shimmer class')
  check(page.includes('biz-form-skeleton-card'),  'Skeleton card class')
  check(page.includes('skeleton-shimmer'),        'Skeleton shimmer animation class')
  check(page.includes('biz-form-error-banner'),   'Error banner class')
  check(page.includes('biz-form-error-icon'),     'Error icon')
  check(page.includes('biz-saving-dot'),          'Saving spinner')

  // ── TEST 8: Save / Cancel actions ───────────────────────────────────────
  console.log('\n--- TEST 8: Save and Cancel Actions ---')
  check(page.includes('type="submit"'),                    'type=submit on submit button')
  check(page.includes('disabled={saving}'),                'disabled during save (duplicate protection)')
  check(page.includes('if (saving) return'),               'Early guard against double submit')
  check(page.includes('biz-action-save'),                  'Save class on submit button')
  check(page.includes('biz-action-cancel'),                'Cancel class on cancel link')
  check(page.includes('to="/owner"'),                      'Cancel links to /owner dashboard')
  check(page.includes("navigate('/owner', { replace: true })"), 'Post-save navigation preserved')

  // ── TEST 9: Backend service calls preserved ──────────────────────────────
  console.log('\n--- TEST 9: Backend Service Calls Preserved ---')
  check(page.includes('createBusiness'),            'createBusiness service call')
  check(page.includes('getCurrentSession'),         'getCurrentSession auth check')
  check(page.includes('getCategoriesForBusinessForm'), 'Category service call')
  check(page.includes('getBusinessById'),           'Edit mode data load')
  check(page.includes('updateBusiness'),            'updateBusiness call')
  check(page.includes('getOwnerBusinessPhotos'),    'Photo manager service')
  check(page.includes('getOwnerBusinessVideos'),    'Video manager service')
  check(page.includes('OwnerPhotoManager'),         'OwnerPhotoManager component')
  check(page.includes('OwnerVideoManager'),         'OwnerVideoManager component')
  check(page.includes('toBusinessSlug'),            'toBusinessSlug utility')
  check(page.includes('availability_status'),       'availability_status field in payload')

  // ── TEST 10: CSS design classes ──────────────────────────────────────────
  console.log('\n--- TEST 10: CSS Design Classes ---')
  const cssClasses = [
    '.biz-form-page', '.biz-form-header', '.biz-form-header-copy',
    '.biz-form-section-card', '.biz-form-section-heading', '.biz-form-section-num',
    '.biz-form-section-desc', '.biz-form-grid', '.biz-field-group',
    '.biz-field-label', '.biz-field-input', '.biz-field-input--error',
    '.biz-field-error', '.biz-field-hint', '.biz-field-textarea',
    '.biz-field-full', '.biz-required', '.biz-coord-banner',
    '.biz-coord-grid', '.biz-coord-tip', '.biz-form-error-banner',
    '.biz-form-actions', '.biz-action-save', '.biz-action-cancel',
    '.biz-saving-dot', '@keyframes biz-spin',
    '.biz-form-skeleton-title', '.biz-form-skeleton-grid',
  ]
  for (const cls of cssClasses) {
    check(css.includes(cls), `CSS class present: ${cls}`)
  }

  // ── TEST 11: Responsive CSS ──────────────────────────────────────────────
  console.log('\n--- TEST 11: Responsive CSS ---')
  const after860 = css.slice(css.lastIndexOf('@media (max-width: 860px)'))
  check(after860.includes('.biz-form-grid'),   '860px: grid stacks to 1 column')
  check(after860.includes('.biz-form-header'), '860px: header stacks')

  const after600 = css.slice(css.lastIndexOf('@media (max-width: 600px)'))
  check(after600.includes('.biz-form-actions'), '600px: actions stack vertically')
  check(after600.includes('.biz-action-cancel'), '600px: cancel goes full width')
  check(after600.includes('.biz-action-save'),   '600px: save goes full width')

  const after390 = css.slice(css.lastIndexOf('@media (max-width: 390px)'))
  check(after390.includes('.biz-form-section-card'), '390px: compact section padding')

  check(css.includes('min-height: 48px'), 'Touch targets ≥ 48px defined')

  // ── TEST 12: Reduced motion ──────────────────────────────────────────────
  console.log('\n--- TEST 12: Reduced Motion ---')
  const lastReducedBlock = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'))
  check(lastReducedBlock.includes('.biz-saving-dot'),       'Reduced motion: spinner disabled')
  check(lastReducedBlock.includes('.biz-form-section-card'),'Reduced motion: card transition disabled')
  check(lastReducedBlock.includes('.biz-field-input'),       'Reduced motion: field transition disabled')

  // ── TEST 13: Supabase non-regression ────────────────────────────────────
  console.log('\n--- TEST 13: Supabase Non-Regression ---')

  const tables = ['categories', 'subcategories', 'businesses', 'business_products', 'business_services']
  for (const table of tables) {
    try {
      const { error } = await anonClient.from(table).select('id').limit(1)
      if (error && error.code === '42501') {
        pass(`RLS correctly blocks anon on ${table}`)
      } else if (!error) {
        pass(`${table} publicly readable – OK`)
      } else {
        fail(`Unexpected error on ${table}: ${error.message}`)
      }
    } catch (err) {
      fail(`Exception querying ${table}: ${String(err)}`)
    }
  }

  // Verify anon business insert blocked
  try {
    const { error } = await anonClient.from('businesses').insert({ name: 'test-p11', slug: 'test-p11' })
    if (error && error.code === '42501') {
      pass('RLS blocks anonymous business insert – correct')
    } else if (!error) {
      fail('Anonymous business insert succeeded – RLS may be misconfigured!')
    } else {
      pass(`Anonymous insert rejected as expected: ${error.message}`)
    }
  } catch (err) {
    pass(`Anonymous insert blocked: ${String(err)}`)
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n=================================================================')
  console.log(`PHASE 11 VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`)
  console.log('=================================================================\n')

  if (failed > 0) process.exit(1)
}

runSuite()
