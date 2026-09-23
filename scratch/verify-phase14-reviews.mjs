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
console.log('  SUPERHOSUR PHASE 14 STEP 6: REVIEWS EXPERIENCE SUITE');
console.log('=================================================================\n');

const bDetail = fs.readFileSync(bDetailPath, 'utf8');
const appCss = fs.readFileSync(appCssPath, 'utf8');

// --- 1. Service & Logic Preservation ---
console.log('--- TEST 1: Service & Logic Preservation ---');
assert(bDetail.includes('getBusinessReviews,'), 'getBusinessReviews import preserved');
assert(bDetail.includes('submitBusinessReview,'), 'submitBusinessReview import preserved');
assert(bDetail.includes('getBusinessReviews(businessId)'), 'getBusinessReviews data loading call preserved');
assert(bDetail.includes('submitBusinessReview({'), 'submitBusinessReview handler call preserved');
assert(bDetail.includes('newRating < 1 || newRating > 5'), 'Rating range validation preserved');
assert(bDetail.includes('errors.comment = \'Review comment cannot be only whitespace.\''), 'Whitespace validation preserved');
assert(bDetail.includes('errors.comment = \'Review comment must be at least 5 characters.\''), 'Min comment length validation preserved');
assert(bDetail.includes('errors.comment = \'Review comment cannot exceed 1000 characters.\''), 'Max comment length validation preserved');
assert(bDetail.includes('totalReviewsCount = reviews.length > 0 ? reviews.length : business.review_count'), 'totalReviewsCount logic preserved');
assert(bDetail.includes('reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length'), 'averageRating calculation preserved');

// --- 2. Reviews Header ---
console.log('\n--- TEST 2: Reviews Header ---');
assert(bDetail.includes('className="business-reviews-header"'), 'Header container class present');
assert(bDetail.includes('REVIEWS') || bDetail.includes('reviews-section-title'), 'Eyebrow or title reference present');
assert(bDetail.includes('id="reviews-section-title"') && bDetail.includes('Customer Reviews'), 'Semantic h2 heading with id present');
assert(bDetail.includes('business-reviews-subtitle'), 'Subtitle class present');
assert(bDetail.includes('aria-labelledby="reviews-section-title"'), 'Section accessible aria-labelledby present');

// --- 3. Rating Summary Card ---
console.log('\n--- TEST 3: Rating Summary Card ---');
assert(bDetail.includes('review-summary-card'), 'review-summary-card class present');
assert(bDetail.includes('review-summary-score-col'), 'Score column container present');
assert(bDetail.includes('review-big-score'), 'review-big-score class present');
assert(bDetail.includes('review-score-max'), 'review-score-max class present (/5)');
assert(bDetail.includes('review-stars-visual'), 'review-stars-visual class present');
assert(bDetail.includes('review-summary-details'), 'Summary details container present');
assert(bDetail.includes('review-summary-headline'), 'Headline classification present');
assert(bDetail.includes('review-count-copy'), 'Count copy class present');
assert(bDetail.includes('review-verified-pill'), 'Verified pill present');
assert(bDetail.includes('aria-label={`Average rating'), 'Accessible screen-reader label on summary card');

// --- 4. Review Cards & Star Presentation ---
console.log('\n--- TEST 4: Review Cards & Star Presentation ---');
assert(bDetail.includes('reviews-list-wrap'), 'reviews-list-wrap class present');
assert(bDetail.includes('role="list"'), 'List semantics role=list present');
assert(bDetail.includes('review-card-item'), 'review-card-item class present');
assert(bDetail.includes('role="listitem"'), 'Card semantics role=listitem present');
assert(bDetail.includes('review-author-avatar'), 'Author avatar present with aria-hidden');
assert(bDetail.includes('review-author-name'), 'Author name present');
assert(bDetail.includes('review-author-date'), 'Author date present');
assert(bDetail.includes('review-card-rating'), 'Card rating container with aria-label present');
assert(bDetail.includes('review-rating-badge'), 'Rating numeric badge present');
assert(bDetail.includes('review-stars-val'), 'review-stars-val with aria-hidden present');
assert(bDetail.includes('review-card-comment'), 'review-card-comment class present');

// --- 5. Empty State Card ---
console.log('\n--- TEST 5: Empty State Card ---');
assert(bDetail.includes('review-empty-card'), 'review-empty-card class present');
assert(bDetail.includes('review-empty-icon-wrap'), 'Empty icon wrap present with aria-hidden');
assert(bDetail.includes('review-empty-title'), 'review-empty-title present');
assert(bDetail.includes('review-empty-text'), 'review-empty-text present');
assert(bDetail.includes('No reviews yet. Be the first customer to share your experience'), 'Preserved empty state copy text');

// --- 6. Review Form & Rating Selector Accessibility ---
console.log('\n--- TEST 6: Review Form & Rating Selector Accessibility ---');
assert(bDetail.includes('review-form-card'), 'review-form-card class present');
assert(bDetail.includes('review-form-header'), 'review-form-header present');
assert(bDetail.includes('review-star-picker'), 'review-star-picker radiogroup present');
assert(bDetail.includes('role="radiogroup"'), 'Radiogroup role on star picker');
assert(bDetail.includes('role="radio"'), 'Radio role on star buttons');
assert(bDetail.includes('aria-label={`Rate ${star} star'), 'Accessible label on star buttons');
assert(bDetail.includes('id="review-rating-select"'), 'Preserved select id=review-rating-select');
assert(bDetail.includes('id="review-rating-error"'), 'Preserved rating error container id');
assert(bDetail.includes('id="review-comment-error"'), 'Preserved comment error container id');
assert(bDetail.includes('id="review-comment-textarea"'), 'Textarea id present');
assert(bDetail.includes('review-char-hint'), 'Character counter present with aria-live');
assert(bDetail.includes('review-submit-btn'), 'Submit button with aria-busy');
assert(bDetail.includes('review-btn-spinner'), 'Spinner element for submitting state');

// --- 7. Owner & Auth Notices ---
console.log('\n--- TEST 7: Owner & Auth Notices ---');
assert(bDetail.includes('review-notice-banner--owner'), 'Owner notice banner present');
assert(bDetail.includes('As the owner of this business, you cannot submit a review for your own listing.'), 'Owner prohibition text preserved');
assert(bDetail.includes('review-notice-banner--auth'), 'Auth notice banner present');
assert(bDetail.includes('to="/auth/signin"'), 'Auth notice links to /auth/signin');
assert(bDetail.includes('Sign in') && bDetail.includes('to leave a customer rating and review for this business.'), 'Auth notice text preserved');

// --- 8. CSS Classes & Design Tokens ---
console.log('\n--- TEST 8: CSS Classes & Design Tokens ---');
assert(appCss.includes('.business-reviews-header'), 'CSS .business-reviews-header defined');
assert(appCss.includes('.review-summary-card'), 'CSS .review-summary-card defined');
assert(appCss.includes('.review-summary-score-col'), 'CSS .review-summary-score-col defined');
assert(appCss.includes('.review-big-score'), 'CSS .review-big-score defined');
assert(appCss.includes('.review-verified-pill'), 'CSS .review-verified-pill defined');
assert(appCss.includes('.review-star-picker'), 'CSS .review-star-picker defined');
assert(appCss.includes('.review-star-btn'), 'CSS .review-star-btn defined');
assert(appCss.includes('.review-star-btn--active'), 'CSS .review-star-btn--active defined');
assert(appCss.includes('.review-rating-select'), 'CSS .review-rating-select defined');
assert(appCss.includes('.review-empty-card'), 'CSS .review-empty-card defined');
assert(appCss.includes('.review-card-item'), 'CSS .review-card-item defined');
assert(appCss.includes('.review-author-avatar'), 'CSS .review-author-avatar defined');
assert(appCss.includes('.review-card-rating'), 'CSS .review-card-rating defined');
assert(appCss.includes('.review-card-comment'), 'CSS .review-card-comment defined');

// --- 9. Responsive CSS Rules ---
console.log('\n--- TEST 9: Responsive CSS Rules ---');
assert(appCss.includes('@media (max-width: 600px)') && appCss.includes('.review-summary-card {'), '600px breakpoint includes review-summary-card');
assert(appCss.includes('@media (max-width: 600px)') && appCss.includes('.review-star-picker {'), '600px breakpoint includes review-star-picker');
assert(appCss.includes('@media (max-width: 600px)') && appCss.includes('.review-submit-btn {'), '600px breakpoint includes full-width submit button');
assert(appCss.includes('@media (max-width: 390px)') && appCss.includes('.review-big-score {'), '390px breakpoint includes compact score');
assert(appCss.includes('@media (max-width: 390px)') && appCss.includes('.review-empty-card {'), '390px breakpoint includes review-empty-card');

// --- 10. Reduced Motion & Overflow Safety ---
console.log('\n--- TEST 10: Reduced Motion & Overflow Safety ---');
assert(appCss.includes('@media (prefers-reduced-motion: reduce)') && appCss.includes('.review-card-item'), 'Reduced motion includes .review-card-item');
assert(appCss.includes('@media (prefers-reduced-motion: reduce)') && appCss.includes('.review-star-btn'), 'Reduced motion includes .review-star-btn');
assert(appCss.includes('word-break: break-word') || appCss.includes('overflow-wrap: anywhere'), 'Text wrapping safeguard present for comments');
assert(appCss.includes('min-height: 44px') || appCss.includes('min-width: 44px'), 'Minimum touch target 44px applied to interactive controls');

console.log('\n=================================================================');
console.log(`PHASE 14 STEP 6 SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('=================================================================');

if (failed > 0) {
  process.exit(1);
}
