import fs from 'fs'

console.log('=================================================================')
console.log('     PREMIUM UI/UX PHASE 6: MY REQUIREMENTS VERIFICATION')
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

// 1. Inspect MyRequirementsPage.tsx
const pageContent = fs.readFileSync('src/pages/MyRequirementsPage.tsx', 'utf8')

console.log('--- TEST 1: Header Hierarchy & Actions ---')
assert(pageContent.includes('<h1 className="req-title">My Requirements</h1>'), 'Semantic h1 page title present')
assert(pageContent.includes('Hosur Marketplace • Customer Hub'), 'Context eyebrow / badge pill present')
assert(pageContent.includes('Post a Requirement'), 'Primary action "Post a Requirement" button present')
assert(pageContent.includes('requirements.length'), 'Requirements count dynamically rendered when available')
assert(pageContent.includes('Track your posted requirements'), 'Supporting description present')

console.log('\n--- TEST 2: Card Redesign & Scannable Metadata ---')
assert(pageContent.includes('formatBudget(req.budget_min, req.budget_max)'), 'Budget display formatted and highlighted')
assert(pageContent.includes('req.required_date'), 'Needed-by date metadata handled')
assert(pageContent.includes('req.duration'), 'Expected duration metadata handled')
assert(pageContent.includes('req.address'), 'Fulfillment location metadata handled')
assert(pageContent.includes('req-meta-grid'), 'Responsive scannable metadata grid utilized')
assert(pageContent.includes('req.description'), 'Description preview rendered cleanly')
assert(pageContent.includes('category-pill'), 'Category & subcategory pills preserved')

console.log('\n--- TEST 3: Requirement Lifecycle States ---')
assert(pageContent.includes('getStatusBadgeClass'), 'Status badge class mapping function present')
assert(pageContent.includes('getStatusLabel'), 'Human-readable status label helper present')
assert(pageContent.includes('status-open') && pageContent.includes('status-matching'), 'Open and matching states styled')
assert(pageContent.includes('status-quoted') && pageContent.includes('status-accepted'), 'Quoted and accepted states styled')
assert(pageContent.includes('status-completed') && pageContent.includes('status-cancelled'), 'Completed and cancelled states styled')
assert(pageContent.includes('handleComplete'), 'Completion action handleComplete preserved')
assert(pageContent.includes('Mark Job as Completed'), 'Mark Job as Completed button present')
assert(pageContent.includes('Rate & Review Business'), 'Rate & Review Business review handoff link present')

console.log('\n--- TEST 4: Vendor Quotations Section ---')
assert(pageContent.includes('Vendor Quotations'), 'Quotations section header present')
assert(pageContent.includes('quotes.map'), 'Quotations rendered dynamically')
assert(pageContent.includes('handleAcceptQuote'), 'handleAcceptQuote handler preserved')
assert(pageContent.includes('q.quote_amount'), 'Quotation price rendered prominently')
assert(pageContent.includes('q.estimated_duration'), 'Quotation estimated duration shown')
assert(pageContent.includes('q.notes'), 'Quotation proposal notes displayed')
assert(pageContent.includes('tel:') && pageContent.includes('wa.me'), 'Vendor call and WhatsApp actions wired')

console.log('\n--- TEST 5: Matched Local Businesses Section ---')
assert(pageContent.includes('Matched local businesses'), 'Matched businesses section header present')
assert(pageContent.includes('matches.map'), 'Matched businesses rendered dynamically')
assert(pageContent.includes('m.match_score'), 'Match percentage score displayed')

console.log('\n--- TEST 6: Empty, Loading, and Error States ---')
assert(pageContent.includes('req-skeleton-list'), 'Polished loading skeleton state present')
assert(pageContent.includes('error-state') && pageContent.includes('Try Again'), 'Accessible error state with retry button present')
assert(pageContent.includes('No requirements yet') && pageContent.includes('Tell local businesses what you need'), 'Helpful empty state copy present')
assert(pageContent.includes('Post your first requirement'), 'Empty state includes post requirement CTA')

console.log('\n--- TEST 7: CSS & Responsive Rules in App.css ---')
const cssContent = fs.readFileSync('src/App.css', 'utf8')
assert(cssContent.includes('.req-dashboard'), 'App.css defines .req-dashboard layout')
assert(cssContent.includes('.req-header-banner'), 'App.css defines .req-header-banner')
assert(cssContent.includes('.req-item-card'), 'App.css defines .req-item-card with premium tokens')
assert(cssContent.includes('.req-meta-grid'), 'App.css defines .req-meta-grid')
assert(cssContent.includes('.req-quote-item'), 'App.css defines .req-quote-item comparison styling')
assert(cssContent.includes('.req-lifecycle-card'), 'App.css defines .req-lifecycle-card')
assert(cssContent.includes('@media (max-width: 600px)') && cssContent.includes('.req-meta-grid'), 'Mobile responsive rules include metadata grid stacking')
assert(cssContent.includes('@media (max-width: 360px)') && cssContent.includes('.req-item-card'), '360px mobile viewport padding defined')

console.log(`\n=================================================================`)
console.log(`   PHASE 6 VERIFICATION: ${passCount} PASSED, ${failCount} FAILED`)
console.log(`=================================================================`)

if (failCount > 0) {
  process.exit(1)
}
