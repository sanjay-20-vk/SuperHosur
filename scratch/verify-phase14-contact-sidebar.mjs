import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const bDetailPath = path.join(ROOT, 'src', 'pages', 'BusinessDetailPage.tsx');
const appCssPath = path.join(ROOT, 'src', 'App.css');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

console.log('=================================================================');
console.log('  SUPERHOSUR PHASE 14 STEP 7: CONTACT & SIDEBAR SUITE');
console.log('=================================================================\n');

const bDetail = fs.readFileSync(bDetailPath, 'utf8');
const appCss = fs.readFileSync(appCssPath, 'utf8');

// --- 1. Structure & Semantics ---
console.log('--- TEST 1: Sidebar Structure & Semantics ---');
assert(bDetail.includes('className="business-contact-sidebar"'), 'business-contact-sidebar class present');
assert(bDetail.includes('aria-labelledby="contact-sidebar-title"'), 'Sidebar aria-labelledby present');
assert(bDetail.includes('id="contact-sidebar-title"'), 'contact-sidebar-title ID present on heading');
assert(bDetail.includes('contact-eyebrow') && bDetail.includes('CONTACT'), 'Eyebrow present');
assert(bDetail.includes('contact-title') && bDetail.includes('Contact Business'), 'Heading present');
assert(bDetail.includes('contact-subtitle'), 'Subtitle present');
assert(bDetail.includes('business-contact-card'), 'business-contact-card container present');

// --- 2. Primary & Quick Contact Actions ---
console.log('\n--- TEST 2: Primary & Quick Contact Actions ---');
assert(bDetail.includes('contact-buttons-list'), 'contact-buttons-list class present');
assert(bDetail.includes('className="contact-button-primary"') && bDetail.includes('href={`tel:${phone}`}'), 'Phone tel: link preserved on primary button');
assert(bDetail.includes('className="contact-button-whatsapp"') && bDetail.includes('href={`https://wa.me/${whatsappNumber}`}'), 'WhatsApp link preserved');
assert(bDetail.includes('className="contact-button-secondary"') && bDetail.includes('href={`mailto:${email}`}'), 'Email mailto: link preserved');
assert(bDetail.includes('target="_blank"') && bDetail.includes('rel="noreferrer"'), 'WhatsApp external security attributes preserved');
assert(bDetail.includes('Call {phone}'), 'Call action text preserved');
assert(bDetail.includes('Email {email}'), 'Email action text preserved');
assert(bDetail.includes('contact-empty') && bDetail.includes('No direct contact details have been provided yet.'), 'Empty contact fallback message preserved');
assert(bDetail.includes('aria-label={`Call ${business.name} at ${phone}`}') || bDetail.includes('aria-label={`Call'), 'Accessible label on phone action');
assert(bDetail.includes('aria-label={`Message ${business.name} on WhatsApp`}') || bDetail.includes('aria-label={`Message'), 'Accessible label on WhatsApp action');

// --- 3. Contact Information Rows ---
console.log('\n--- TEST 3: Contact Information Rows ---');
assert(bDetail.includes('contact-info-rows-list'), 'contact-info-rows-list class present');
assert(bDetail.includes('contact-info-row'), 'contact-info-row class present');
assert(bDetail.includes('contact-row-icon'), 'contact-row-icon present with aria-hidden');
assert(bDetail.includes('contact-row-label') && bDetail.includes('Phone'), 'Phone label present');
assert(bDetail.includes('contact-row-label') && bDetail.includes('WhatsApp'), 'WhatsApp label present');
assert(bDetail.includes('contact-row-label') && bDetail.includes('Email'), 'Email label present');
assert(bDetail.includes('contact-row-label') && bDetail.includes('Location'), 'Location label present');
assert(bDetail.includes('contact-row-link'), 'contact-row-link class present');
assert(bDetail.includes('contact-row-text'), 'contact-row-text class present');

// --- 4. Listing Status & Metadata ---
console.log('\n--- TEST 4: Listing Status & Metadata ---');
assert(bDetail.includes('contact-meta-wrap'), 'contact-meta-wrap class present');
assert(bDetail.includes('contact-status-title') && bDetail.includes('Listing status'), 'Listing status title preserved');
assert(bDetail.includes('contact-status-pill'), 'contact-status-pill class present');
assert(bDetail.includes('contact-status-val'), 'contact-status-val class present');
assert(bDetail.includes('🟢 Currently active') && bDetail.includes('🔴 Currently inactive'), 'Active/inactive indicators preserved');
assert(bDetail.includes('contact-updated-val') && bDetail.includes('Updated'), 'Updated timestamp preserved');

// --- 5. Owner Gating & Security ---
console.log('\n--- TEST 5: Owner Gating & Security ---');
assert(bDetail.includes('{isOwner && ('), 'Owner card strictly gated on isOwner');
assert(bDetail.includes('contact-owner-card'), 'contact-owner-card class present');
assert(bDetail.includes('contact-owner-action-btn'), 'contact-owner-action-btn class present');
assert(bDetail.includes('to={`/owner/businesses/${business.id}/edit`}'), 'Owner edit link route preserved');

// --- 6. CSS Design Classes ---
console.log('\n--- TEST 6: CSS Design Classes ---');
assert(appCss.includes('.business-contact-sidebar'), 'CSS .business-contact-sidebar defined');
assert(appCss.includes('.contact-owner-card'), 'CSS .contact-owner-card defined');
assert(appCss.includes('.contact-owner-action-btn'), 'CSS .contact-owner-action-btn defined');
assert(appCss.includes('.business-contact-card'), 'CSS .business-contact-card defined');
assert(appCss.includes('.contact-card-header'), 'CSS .contact-card-header defined');
assert(appCss.includes('.contact-subtitle'), 'CSS .contact-subtitle defined');
assert(appCss.includes('.contact-button-primary'), 'CSS .contact-button-primary defined');
assert(appCss.includes('.contact-button-whatsapp'), 'CSS .contact-button-whatsapp defined');
assert(appCss.includes('.contact-button-secondary'), 'CSS .contact-button-secondary defined');
assert(appCss.includes('.contact-info-rows-list'), 'CSS .contact-info-rows-list defined');
assert(appCss.includes('.contact-info-row'), 'CSS .contact-info-row defined');
assert(appCss.includes('.contact-row-icon'), 'CSS .contact-row-icon defined');
assert(appCss.includes('.contact-row-label'), 'CSS .contact-row-label defined');
assert(appCss.includes('.contact-row-val'), 'CSS .contact-row-val defined');
assert(appCss.includes('.contact-status-pill'), 'CSS .contact-status-pill defined');

// --- 7. Responsive CSS Rules ---
console.log('\n--- TEST 7: Responsive CSS Rules ---');
assert(appCss.includes('@media (max-width: 860px)') && appCss.includes('.business-contact-sidebar'), '860px breakpoint makes sidebar static');
assert(appCss.includes('@media (max-width: 600px)') && appCss.includes('.business-contact-card {'), '600px breakpoint includes business-contact-card');
assert(appCss.includes('@media (max-width: 600px)') && appCss.includes('.contact-owner-card {'), '600px breakpoint includes contact-owner-card');
assert(appCss.includes('@media (max-width: 390px)') && appCss.includes('.business-contact-card {'), '390px breakpoint includes business-contact-card');
assert(appCss.includes('@media (max-width: 390px)') && appCss.includes('.contact-info-row {'), '390px breakpoint includes contact-info-row');

// --- 8. Touch Targets & Reduced Motion ---
console.log('\n--- TEST 8: Touch Targets & Reduced Motion ---');
assert(appCss.includes('.contact-button-primary') && (appCss.includes('min-height: 48px') || appCss.includes('min-height: 44px')), 'Contact primary button min-height >= 44px');
assert(appCss.includes('.contact-button-whatsapp') && (appCss.includes('min-height: 48px') || appCss.includes('min-height: 44px')), 'WhatsApp button min-height >= 44px');
assert(appCss.includes('.contact-button-secondary') && appCss.includes('min-height: 44px'), 'Secondary button min-height >= 44px');
assert(appCss.includes('.contact-owner-action-btn') && appCss.includes('min-height: 44px'), 'Owner action button min-height >= 44px');
assert(appCss.includes('@media (prefers-reduced-motion: reduce)') && appCss.includes('.contact-button-primary'), 'Reduced motion includes .contact-button-primary');
assert(appCss.includes('@media (prefers-reduced-motion: reduce)') && appCss.includes('.contact-button-whatsapp'), 'Reduced motion includes .contact-button-whatsapp');
assert(appCss.includes('@media (prefers-reduced-motion: reduce)') && appCss.includes('.contact-owner-action-btn'), 'Reduced motion includes .contact-owner-action-btn');

console.log('\n=================================================================');
console.log(`PHASE 14 STEP 7 SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('=================================================================');

if (failed > 0) {
  process.exit(1);
}
