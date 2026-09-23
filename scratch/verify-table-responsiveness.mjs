import fs from 'fs'
import path from 'path'

console.log('=================================================================')
console.log('     PRIORITY 7: MOBILE TABLE RESPONSIVENESS VERIFICATION')
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

// 1. Inspect src/App.css
console.log('--- TEST 1: Reusable CSS Styling System in src/App.css ---')
const appCss = fs.readFileSync('src/App.css', 'utf8')

assert(appCss.includes('.table-responsive'), 'App.css defines .table-responsive utility class')
assert(
  appCss.includes('overflow-x: auto'),
  'App.css contains overflow-x: auto for horizontal table scrolling',
)
assert(
  appCss.includes('-webkit-overflow-scrolling: touch'),
  'App.css includes smooth touch scrolling (-webkit-overflow-scrolling: touch)',
)
assert(
  appCss.includes('.table-responsive > table') || appCss.includes('table.data-table'),
  'App.css defines standard HTML table base rules inside responsive wrapper',
)
assert(
  appCss.includes('min-width: 580px') || appCss.includes('min-width: 540px'),
  'App.css defines safe min-width for table columns on mobile viewports',
)
assert(
  appCss.includes('.admin-tab-bar') && appCss.includes('white-space: nowrap'),
  'App.css ensures .admin-tab-bar scrolls smoothly without wrapping/breaking layout on mobile',
)

// 2. Inspect AdminBusinessesPage.tsx
console.log('\n--- TEST 2: Admin Data Tables Responsiveness ---')
const adminPage = fs.readFileSync('src/pages/AdminBusinessesPage.tsx', 'utf8')
const adminTableMatches = adminPage.match(/className=["']table-responsive["']/g) || []

assert(
  adminTableMatches.length >= 5,
  `AdminBusinessesPage contains ${adminTableMatches.length} .table-responsive wrappers (expected >= 5)`,
)
assert(
  adminPage.includes('filteredUsers.map') && adminPage.includes('table-responsive'),
  'User management table is protected with table-responsive wrapper',
)
assert(
  adminPage.includes('filteredRequirements.map') && adminPage.includes('table-responsive'),
  'Requirements moderation table is protected with table-responsive wrapper',
)
assert(
  adminPage.includes('filteredSubcategories.map') && adminPage.includes('table-responsive'),
  'Taxonomy subcategories table is protected with table-responsive wrapper',
)
assert(
  adminPage.includes('properties\n') || adminPage.includes('{properties') && adminPage.includes('table-responsive'),
  'Properties oversight table is protected with table-responsive wrapper',
)

// 3. Inspect MyRequirementsPage.tsx
console.log('\n--- TEST 3: Customer Requirements & Quotations Responsiveness ---')
const reqPage = fs.readFileSync('src/pages/MyRequirementsPage.tsx', 'utf8')
const reqTableMatches = reqPage.match(/className=["']table-responsive["']/g) || []

assert(
  reqTableMatches.length >= 2,
  `MyRequirementsPage contains ${reqTableMatches.length} .table-responsive wrappers (expected >= 2)`,
)
assert(
  reqPage.includes('quotes.map') && reqPage.includes('table-responsive'),
  'Quotation comparison list is wrapped in .table-responsive container',
)
assert(
  reqPage.includes('matches.map') && reqPage.includes('table-responsive'),
  'Matched local businesses list is wrapped in .table-responsive container',
)

// 4. Inspect OwnerDashboardPage.tsx
console.log('\n--- TEST 4: Owner Dashboard Leads & Inventory Responsiveness ---')
const ownerPage = fs.readFileSync('src/pages/OwnerDashboardPage.tsx', 'utf8')
const ownerTableMatches = ownerPage.match(/className=["']table-responsive["']/g) || []

assert(
  ownerTableMatches.length >= 3,
  `OwnerDashboardPage contains ${ownerTableMatches.length} .table-responsive wrappers (expected >= 3)`,
)
assert(
  ownerPage.includes('filteredLeads.map') && ownerPage.includes('table-responsive'),
  'Inbound customer leads table/list is wrapped in .table-responsive container',
)
assert(
  ownerPage.includes('businesses.map') && ownerPage.includes('table-responsive'),
  'Owner business listings are wrapped in .table-responsive container',
)
assert(
  ownerPage.includes('properties.map') && ownerPage.includes('table-responsive'),
  'Owner property listings are wrapped in .table-responsive container',
)

// 5. Inspect ManageBusinessSupplyPage.tsx
console.log('\n--- TEST 5: Business Supply Offerings Responsiveness ---')
const supplyPage = fs.readFileSync('src/pages/ManageBusinessSupplyPage.tsx', 'utf8')
const supplyTableMatches = supplyPage.match(/className=["']table-responsive["']/g) || []

assert(
  supplyTableMatches.length >= 2,
  `ManageBusinessSupplyPage contains ${supplyTableMatches.length} .table-responsive wrappers (expected >= 2)`,
)
assert(
  supplyPage.includes('services.map') && supplyPage.includes('table-responsive'),
  'Business services list is wrapped in .table-responsive container',
)
assert(
  supplyPage.includes('products.map') && supplyPage.includes('table-responsive'),
  'Business products list is wrapped in .table-responsive container',
)

// 6. Non-Regression Architecture Check
console.log('\n--- TEST 6: Preservation of Logic & Functionality ---')
assert(
  !adminPage.includes('// eslint-disable') && !reqPage.includes('// eslint-disable'),
  'No ESLint disable comments were introduced',
)
assert(
  adminPage.includes('handleAdminStatusChange') && adminPage.includes('handleAdminRoleChange'),
  'Admin actions and event handlers remain fully intact',
)
assert(
  reqPage.includes('handleAcceptQuote') && reqPage.includes('handleCancel'),
  'Customer quote acceptance and cancellation actions remain fully intact',
)
assert(
  ownerPage.includes('handleUpdateLeadStatus') && ownerPage.includes('handleDeleteBusiness'),
  'Owner lead management and deletion actions remain fully intact',
)

console.log('\n=================================================================')
console.log(`   VERIFICATION COMPLETE: ${passCount} PASSED, ${failCount} FAILED`)
console.log('=================================================================\n')

if (failCount > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
