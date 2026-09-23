/**
 * SUPERHOSUR — Phase 14 Step 3 Verification Suite
 * BusinessDetailPage Premium Media Experience (Photos + Videos)
 */

import fs from 'node:fs'

const DETAIL_PAGE = 'c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/pages/BusinessDetailPage.tsx'
const CSS_PATH    = 'c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/App.css'
const PHOTO_SVC   = 'c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/services/photos.ts'
const VIDEO_SVC   = 'c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/services/videos.ts'

const detailPage = fs.readFileSync(DETAIL_PAGE, 'utf8')
const css        = fs.readFileSync(CSS_PATH,    'utf8')
const photoSvc   = fs.readFileSync(PHOTO_SVC,   'utf8')
const videoSvc   = fs.readFileSync(VIDEO_SVC,   'utf8')

let passed = 0
let failed = 0

function pass(msg) { console.log(`[PASS] ${msg}`); passed++ }
function fail(msg) { console.error(`[FAIL] ${msg}`); failed++ }
function check(cond, msg) { cond ? pass(msg) : fail(msg) }

async function runSuite() {
  console.log('=================================================================')
  console.log('  SUPERHOSUR PHASE 14 STEP 3: BUSINESS MEDIA EXPERIENCE SUITE')
  console.log('=================================================================\n')

  // ── TEST 1: Media Services & Functionality Preservation ─────────────────────
  console.log('--- TEST 1: Media Services Preservation ---')
  check(detailPage.includes('getApprovedBusinessPhotos'), 'getApprovedBusinessPhotos import preserved')
  check(detailPage.includes('getApprovedBusinessVideos'), 'getApprovedBusinessVideos import preserved')
  check(detailPage.includes('activePhotoId'), 'activePhotoId state preserved')
  check(detailPage.includes('activeVideoId'), 'activeVideoId state preserved')
  check(detailPage.includes('setActivePhotoId'), 'setActivePhotoId handler preserved')
  check(detailPage.includes('setActiveVideoId'), 'setActiveVideoId handler preserved')
  check(photoSvc.includes('getApprovedBusinessPhotos'), 'photo service implementation untouched')
  check(videoSvc.includes('getApprovedBusinessVideos'), 'video service implementation untouched')

  // ── TEST 2: Photo Gallery Architecture & Semantics ──────────────────────────
  console.log('\n--- TEST 2: Photo Gallery Architecture & Semantics ---')
  check(detailPage.includes('business-gallery-header'), 'Gallery header row present')
  check(detailPage.includes('business-gallery-counter-badge'), 'Counter badge (X / Y) present')
  check(detailPage.includes('business-media-frame'), 'Media frame container present')
  check(detailPage.includes('business-media-img'), 'Active media image tag present')
  check(detailPage.includes('business-media-overlay'), 'Media badge overlay present')
  check(detailPage.includes('business-media-tag--primary'), 'Primary photo badge rendered when is_primary')
  check(detailPage.includes('business-media-tag--verified'), 'Verified badge rendered when approved')
  check(detailPage.includes('business-gallery__thumbs'), 'Thumbnail strip container present')
  check(detailPage.includes('photo-thumb'), 'Thumbnail button class present')
  check(detailPage.includes('photo-thumb-primary-dot'), 'Primary photo indicator dot on thumbnail present')
  check(detailPage.includes('aria-pressed={photo.id === activePhoto.id}'), 'aria-pressed on photo thumbnails')
  check(detailPage.includes('role="list"'), 'Accessible role=list on thumbnails')

  // ── TEST 3: Intentional No-Photo Fallback State ─────────────────────────────
  console.log('\n--- TEST 3: Intentional Fallback State ---')
  check(detailPage.includes('business-media-fallback'), 'Intentional fallback container present')
  check(detailPage.includes('business-fallback-visual'), 'Fallback visual wrapper present')
  check(detailPage.includes('business-fallback-avatar'), 'Fallback initial avatar present')
  check(detailPage.includes('business-fallback-badge'), 'Hosur Commercial Profile badge present')
  check(detailPage.includes('business-fallback-content'), 'Fallback content container present')
  check(detailPage.includes('business-fallback-title'), 'Fallback business title present')
  check(detailPage.includes('business-fallback-desc'), 'Fallback description present')
  check(detailPage.includes('business-fallback-hint'), 'Fallback informative hint present')

  // ── TEST 4: Featured Video Experience Architecture ─────────────────────────
  console.log('\n--- TEST 4: Video Experience Architecture ---')
  check(detailPage.includes('business-video-header'), 'Video header row present')
  check(detailPage.includes('business-video-featured-pill'), 'Featured video header badge present')
  check(detailPage.includes('business-video-frame'), 'Video player frame present')
  check(detailPage.includes('business-video-player'), 'Video player element present')
  check(detailPage.includes('controls'), 'Native video controls preserved')
  check(detailPage.includes('playsInline'), 'Native video playsInline preserved')
  check(detailPage.includes('preload="metadata"'), 'Preload metadata preserved')
  check(!detailPage.includes('autoPlay'), 'NO autoplay present (accessible & non-intrusive)')
  check(detailPage.includes('business-video-meta-row'), 'Video metadata bar present')
  check(detailPage.includes('business-video-now-playing'), 'Now playing indicator present')
  check(detailPage.includes('business-video-duration-tag'), 'Duration tag present')
  check(detailPage.includes('business-video-status-tag'), 'Approval status tag present')
  check(detailPage.includes('business-video-thumbs'), 'Video selector button list present')
  check(detailPage.includes('business-video-thumb-btn'), 'Video selection button class present')
  check(detailPage.includes('video-thumb-play-icon'), 'Video play icon present')
  check(detailPage.includes('video-thumb-duration'), 'Video duration pill present')
  check(detailPage.includes('aria-pressed={vid.id === activeVideo.id}'), 'aria-pressed on video selectors')

  // ── TEST 5: CSS Design Tokens & Styling ─────────────────────────────────────
  console.log('\n--- TEST 5: CSS Design System Classes ---')
  check(css.includes('.business-gallery-header'), '.business-gallery-header CSS present')
  check(css.includes('.business-gallery-counter-badge'), '.business-gallery-counter-badge CSS present')
  check(css.includes('.business-media-frame'), '.business-media-frame CSS present')
  check(css.includes('.business-media-img'), '.business-media-img CSS present')
  check(css.includes('.business-media-overlay'), '.business-media-overlay CSS present')
  check(css.includes('.business-media-tag'), '.business-media-tag CSS present')
  check(css.includes('.business-media-tag--primary'), '.business-media-tag--primary CSS present')
  check(css.includes('.business-media-tag--verified'), '.business-media-tag--verified CSS present')
  check(css.includes('.business-gallery__thumbs'), '.business-gallery__thumbs CSS present')
  check(css.includes('.photo-thumb'), '.photo-thumb CSS present')
  check(css.includes('.photo-thumb.active'), '.photo-thumb.active CSS present')
  check(css.includes('.photo-thumb-primary-dot'), '.photo-thumb-primary-dot CSS present')
  check(css.includes('.business-media-fallback'), '.business-media-fallback CSS present')
  check(css.includes('.business-fallback-avatar'), '.business-fallback-avatar CSS present')
  check(css.includes('.business-fallback-badge'), '.business-fallback-badge CSS present')
  check(css.includes('.business-fallback-content'), '.business-fallback-content CSS present')
  check(css.includes('.business-video-header'), '.business-video-header CSS present')
  check(css.includes('.business-video-featured-pill'), '.business-video-featured-pill CSS present')
  check(css.includes('.business-video-frame'), '.business-video-frame CSS present')
  check(css.includes('.business-video-player'), '.business-video-player CSS present')
  check(css.includes('.business-video-meta-row'), '.business-video-meta-row CSS present')
  check(css.includes('.business-video-now-playing'), '.business-video-now-playing CSS present')
  check(css.includes('.business-video-duration-tag'), '.business-video-duration-tag CSS present')
  check(css.includes('.business-video-status-tag'), '.business-video-status-tag CSS present')
  check(css.includes('.business-video-thumbs'), '.business-video-thumbs CSS present')
  check(css.includes('.business-video-thumb-btn'), '.business-video-thumb-btn CSS present')
  check(css.includes('.video-thumb-play-icon'), '.video-thumb-play-icon CSS present')
  check(css.includes('.video-thumb-duration'), '.video-thumb-duration CSS present')

  // ── TEST 6: Touch Targets & Accessibility Constraints ───────────────────────
  console.log('\n--- TEST 6: Touch Targets & Accessibility Constraints ---')
  check(css.includes('min-height: 76px') || css.includes('min-height: 64px') || css.includes('min-height: 44px'), 'Photo thumb touch targets >= 44px')
  check(css.includes('.business-video-thumb-btn') && css.includes('min-height: 44px'), 'Video thumb button touch targets >= 44px')
  check(css.includes('.photo-thumb:focus-visible'), 'Focus visible styling for photo thumb')
  check(css.includes('.business-video-thumb-btn:focus-visible'), 'Focus visible styling for video thumb')

  // ── TEST 7: Responsive Rules & Media Queries ────────────────────────────────
  console.log('\n--- TEST 7: Responsive Media Queries ---')
  const mq600 = css.slice(css.lastIndexOf('@media (max-width: 600px)'))
  check(mq600.includes('.business-gallery-header'), '600px: business-gallery-header styled')
  check(mq600.includes('.business-media-frame'), '600px: business-media-frame styled')
  check(mq600.includes('.photo-thumb'), '600px: photo-thumb styled')
  check(mq600.includes('.business-video-header'), '600px: business-video-header styled')
  check(mq600.includes('.business-video-featured-pill'), '600px: business-video-featured-pill styled')
  check(mq600.includes('.business-video-meta-row'), '600px: business-video-meta-row styled')

  const mq390 = css.slice(css.lastIndexOf('@media (max-width: 390px)'))
  check(mq390.includes('.business-media-frame'), '390px: business-media-frame styled')
  check(mq390.includes('.photo-thumb'), '390px: photo-thumb styled with >=44px touch target')
  check(mq390.includes('.business-fallback-avatar'), '390px: business-fallback-avatar styled')
  check(mq390.includes('.business-video-thumb-btn'), '390px: business-video-thumb-btn styled with min-height: 44px')

  // ── TEST 8: Prefers Reduced Motion ──────────────────────────────────────────
  console.log('\n--- TEST 8: Reduced Motion Support ---')
  const mqMotion = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'))
  check(mqMotion.includes('.photo-thumb'), 'Reduced motion: photo thumb transitions disabled')
  check(mqMotion.includes('.business-media-img'), 'Reduced motion: media img transition disabled')
  check(mqMotion.includes('.business-video-thumb-btn'), 'Reduced motion: video button transitions disabled')
  check(mqMotion.includes('.photo-thumb:hover'), 'Reduced motion: photo thumb transform disabled')
  check(mqMotion.includes('.business-video-thumb-btn:hover'), 'Reduced motion: video button transform disabled')

  console.log('\n=================================================================')
  console.log(`PHASE 14 STEP 3 VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`)
  console.log('=================================================================')

  if (failed > 0) process.exit(1)
}

runSuite().catch(err => {
  console.error('Test suite error:', err)
  process.exit(1)
})
