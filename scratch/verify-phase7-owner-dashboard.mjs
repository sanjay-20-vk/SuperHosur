import fs from 'fs'

console.log('=================================================================')
console.log('     PREMIUM UI/UX PHASE 7: OWNER DASHBOARD VERIFICATION')
console.log('=================================================================\n')

let passCount = 0
let failCount = 0

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`)
    passCount++
  } else {
    console.error(`[FAIL] ${message}`)
    failCount++
  }
}

// 1. Inspect OwnerDashboardPage.tsx
const ownerDashSource = fs.readFileSync('src/pages/OwnerDashboardPage.tsx', 'utf8')

console.log('--- TEST 1: Header Hierarchy & Quick Actions ---')
assert(ownerDashSource.includes('owner-dash-title') && ownerDashSource.includes('Vendor Leads &amp; Listings'), 'Semantic h1 page title present')
assert(ownerDashSource.includes('Owner Workspace • Hosur Verified Merchant &amp; Host'), 'Contextual eyebrow badge present')
assert(ownerDashSource.includes('/owner/create') && ownerDashSource.includes('Create business'), 'Primary action "Create business" present')
assert(ownerDashSource.includes('/owner/properties/create') && ownerDashSource.includes('List a property'), 'Primary action "List a property" present')
assert(ownerDashSource.includes('handleSignOut') && ownerDashSource.includes('Sign out'), 'Sign out action present')

console.log('\n--- TEST 2: Summary / Overview Metrics Cards ---')
assert(ownerDashSource.includes('owner-metrics-grid'), 'Summary metrics grid container present')
assert(ownerDashSource.includes('Inbound Leads') && ownerDashSource.includes('{leads.length}'), 'Inbound leads metric card present')
assert(ownerDashSource.includes('Active Businesses') && ownerDashSource.includes('{businesses.length}'), 'Active businesses metric card present')
assert(ownerDashSource.includes('Listed Properties') && ownerDashSource.includes('{properties.length}'), 'Listed properties metric card present')
assert(ownerDashSource.includes('Accepted Leads') && ownerDashSource.includes('{acceptedLeads.length}'), 'Accepted leads metric card present')

console.log('\n--- TEST 3: Navigation Tabs & Accessibility ---')
assert(ownerDashSource.includes('role="tablist"'), 'Navigation tabs defined with role="tablist"')
assert(ownerDashSource.includes('role="tab"') && ownerDashSource.includes('aria-selected'), 'Tab buttons have role="tab" and aria-selected')
assert(ownerDashSource.includes('setActiveTab(\'leads\')'), 'Customer leads tab interactive')
assert(ownerDashSource.includes('setActiveTab(\'businesses\')'), 'Businesses tab interactive')
assert(ownerDashSource.includes('setActiveTab(\'properties\')'), 'Properties tab interactive')

console.log('\n--- TEST 4: Customer Leads & Quotations Functionality ---')
assert(ownerDashSource.includes('filteredLeads.map'), 'Customer leads mapped using filteredLeads')
assert(ownerDashSource.includes('owner-lead-card'), 'Premium owner lead card styling used')
assert(ownerDashSource.includes('Math.round(lead.match_score * 100)'), 'Match score percentage displayed')
assert(ownerDashSource.includes('handleUpdateLeadStatus'), 'handleUpdateLeadStatus preserved')
assert(ownerDashSource.includes('submitRequirementQuote'), 'submitRequirementQuote preserved')
assert(ownerDashSource.includes('handleOpenQuoteModal'), 'handleOpenQuoteModal preserved')
assert(ownerDashSource.includes('handleSubmitQuote'), 'handleSubmitQuote preserved')
assert(ownerDashSource.includes('Call Customer') && ownerDashSource.includes('WhatsApp Customer'), 'Customer contact actions wired')

console.log('\n--- TEST 5: Business Management Section ---')
assert(ownerDashSource.includes('businesses.map'), 'Owner businesses mapped')
assert(ownerDashSource.includes('handleDeleteBusiness'), 'handleDeleteBusiness preserved')
assert(ownerDashSource.includes('/owner/businesses/${business.id}/edit'), 'Edit business link wired')
assert(ownerDashSource.includes('/owner/businesses/${business.id}/edit#photos'), 'Business photos link wired')
assert(ownerDashSource.includes('/businesses/${business.id}'), 'Public business view link wired')
assert(ownerDashSource.includes('/owner/businesses/${business.id}/offerings'), 'Services & products link wired')

console.log('\n--- TEST 6: Property Management Section ---')
assert(ownerDashSource.includes('properties.map'), 'Owner properties mapped')
assert(ownerDashSource.includes('handleDeleteProperty'), 'handleDeleteProperty preserved')
assert(ownerDashSource.includes('/owner/properties/${property.id}/edit'), 'Edit property link wired')
assert(ownerDashSource.includes('/owner/properties/${property.id}/edit#property-photos'), 'Property photos link wired')
assert(ownerDashSource.includes('/properties/${property.id}'), 'Public property view link wired')

console.log('\n--- TEST 7: Loading, Error & Empty States ---')
assert(ownerDashSource.includes('req-skeleton-list'), 'Polished loading skeleton state present')
assert(ownerDashSource.includes('error-state') && ownerDashSource.includes('Try Again'), 'Accessible error state with retry present')
assert(ownerDashSource.includes('No customer leads in this view'), 'Empty state for leads present')
assert(ownerDashSource.includes('Your business listings will appear here'), 'Empty state for businesses present')
assert(ownerDashSource.includes('Your property listings will appear here'), 'Empty state for properties present')

console.log('\n--- TEST 8: CSS Responsiveness & Table Containers in App.css ---')
const appCss = fs.readFileSync('src/App.css', 'utf8')
assert(appCss.includes('.owner-dash-layout'), 'App.css defines .owner-dash-layout')
assert(appCss.includes('.owner-header-banner'), 'App.css defines .owner-header-banner')
assert(appCss.includes('.owner-metrics-grid'), 'App.css defines .owner-metrics-grid')
assert(appCss.includes('.owner-tab-nav'), 'App.css defines .owner-tab-nav')
assert(appCss.includes('.owner-lead-card'), 'App.css defines .owner-lead-card')
assert(appCss.includes('.owner-dash-item-card'), 'App.css defines .owner-dash-item-card')
assert(appCss.includes('@media (max-width: 600px)') && appCss.includes('.owner-header-banner'), 'Mobile 600px responsive rules present')
assert(appCss.includes('@media (max-width: 360px)') && appCss.includes('.owner-lead-card'), 'Mobile 360px responsive rules present')

console.log(`\n=================================================================`)
console.log(`   PHASE 7 VERIFICATION: ${passCount} PASSED, ${failCount} FAILED`)
console.log(`=================================================================`)

if (failCount > 0) {
  process.exit(1)
}
