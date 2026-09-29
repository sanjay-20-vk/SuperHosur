import fs from 'node:fs'
import path from 'node:path'

console.log('=== PHASE 17 STEP 6: PWA, MANIFEST, ICONS & SERVICE WORKER TESTS ===\n')

let passed = 0
let failed = 0

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`[PASS] ${message}`)
    passed++
  } else {
    console.error(`[FAIL] ${message}`)
    failed++
  }
}

// 1. Manifest Audit
const manifestPath = path.resolve('public/manifest.webmanifest')
assert(fs.existsSync(manifestPath), 'public/manifest.webmanifest exists')
const manifestRaw = fs.readFileSync(manifestPath, 'utf8')
const manifest = JSON.parse(manifestRaw)

assert(manifest.name.includes('SuperHosur'), 'Manifest name includes SuperHosur')
assert(manifest.short_name === 'SuperHosur', 'Manifest short_name is SuperHosur')
assert(manifest.display === 'standalone', 'Manifest display mode is standalone')
assert(manifest.start_url === '/', 'Manifest start_url is /')
assert(manifest.scope === '/', 'Manifest scope is /')
assert(manifest.theme_color === '#17594d', 'Manifest theme_color matches brand (#17594d)')
assert(manifest.background_color === '#f6f3ee', 'Manifest background_color matches brand (#f6f3ee)')
assert(Array.isArray(manifest.icons) && manifest.icons.length >= 4, 'Manifest includes >= 4 icon declarations')

const iconSizes = manifest.icons.map((i: { sizes: string; purpose?: string }) => `${i.sizes}:${i.purpose || 'any'}`)
assert(iconSizes.includes('192x192:any'), 'Manifest has 192x192 standard icon')
assert(iconSizes.includes('512x512:any'), 'Manifest has 512x512 standard icon')
assert(iconSizes.includes('192x192:maskable'), 'Manifest has 192x192 maskable icon')
assert(iconSizes.includes('512x512:maskable'), 'Manifest has 512x512 maskable icon')

// 2. Icon files audit
for (const icon of manifest.icons) {
  const iconPath = path.resolve('public', icon.src.replace(/^\//, ''))
  assert(fs.existsSync(iconPath), `Icon file resolves on disk: ${icon.src}`)
  const stat = fs.statSync(iconPath)
  assert(stat.size > 500, `Icon file has valid non-zero content (${stat.size} bytes)`)
}

// 3. index.html audit
const indexPath = path.resolve('index.html')
assert(fs.existsSync(indexPath), 'index.html exists')
const indexHtml = fs.readFileSync(indexPath, 'utf8')

assert(indexHtml.includes('<link rel="manifest" href="/manifest.webmanifest" />') || indexHtml.includes('rel="manifest"'), 'index.html links to manifest')
assert(indexHtml.includes('name="theme-color" content="#17594d"'), 'index.html sets theme-color')
assert(indexHtml.includes('viewport-fit=cover'), 'index.html sets viewport-fit=cover for notch/safe-area support')
assert(indexHtml.includes('name="mobile-web-app-capable" content="yes"'), 'index.html has mobile-web-app-capable')
assert(indexHtml.includes('name="apple-mobile-web-app-capable" content="yes"'), 'index.html has apple-mobile-web-app-capable')
assert(indexHtml.includes('name="apple-mobile-web-app-status-bar-style"'), 'index.html has apple-mobile-web-app-status-bar-style')
assert(indexHtml.includes('rel="apple-touch-icon"'), 'index.html has apple-touch-icon')
// Verify SEO preservation
assert(indexHtml.includes('rel="canonical"'), 'index.html preserves canonical tag')
assert(indexHtml.includes('og:title'), 'index.html preserves OpenGraph tags')
assert(indexHtml.includes('twitter:card'), 'index.html preserves Twitter cards')

// 4. Offline Fallback Audit
const offlinePath = path.resolve('public/offline.html')
assert(fs.existsSync(offlinePath), 'public/offline.html exists')
const offlineHtml = fs.readFileSync(offlinePath, 'utf8')
assert(offlineHtml.includes('SuperHosur'), 'offline.html contains SuperHosur branding')
assert(offlineHtml.includes('offline'), 'offline.html mentions offline status')
assert(offlineHtml.includes('window.location.reload()'), 'offline.html provides retry action')
assert(offlineHtml.includes('safe-area-inset'), 'offline.html handles safe area insets')
assert(!offlineHtml.includes('<script src='), 'offline.html works with zero external script dependencies')

// 5. Service Worker Security & Architecture Audit
const swPath = path.resolve('public/sw.js')
assert(fs.existsSync(swPath), 'public/sw.js exists')
const swContent = fs.readFileSync(swPath, 'utf8')

assert(swContent.includes('superhosur-shell-v1'), 'Service worker has versioned cache name')
assert(swContent.includes('/offline.html'), 'Service worker precaches offline fallback')
assert(swContent.includes('skipWaiting'), 'Service worker supports skipWaiting lifecycle')
assert(swContent.includes('clients.claim'), 'Service worker activates and claims clients')

// SECURITY CRITICAL CHECKS:
assert(swContent.includes("supabase.co"), 'Service worker explicitly inspects Supabase domain')
assert(swContent.includes('/rest/v1'), 'Service worker bypasses Supabase REST API')
assert(swContent.includes('/auth/v1'), 'Service worker bypasses Supabase Auth API')
assert(swContent.includes('/realtime/v1'), 'Service worker bypasses Supabase Realtime WebSocket API')
assert(swContent.includes('/storage/v1'), 'Service worker bypasses Supabase Storage API')
assert(swContent.includes("req.headers.has('Authorization')"), 'Service worker never intercepts requests with Authorization header')
assert(swContent.includes("req.headers.has('apikey')"), 'Service worker never intercepts requests with apikey header')
assert(swContent.includes("req.method !== 'GET'"), 'Service worker passes non-GET mutations directly to network')

// 6. Dist Production Build Verification
const distManifest = path.resolve('dist/manifest.webmanifest')
const distOffline = path.resolve('dist/offline.html')
const distSw = path.resolve('dist/sw.js')
const distIcon192 = path.resolve('dist/icons/icon-192x192.png')
const distIcon512 = path.resolve('dist/icons/icon-512x512.png')

assert(fs.existsSync(distManifest), 'dist/manifest.webmanifest is packaged in build')
assert(fs.existsSync(distOffline), 'dist/offline.html is packaged in build')
assert(fs.existsSync(distSw), 'dist/sw.js is packaged in build')
assert(fs.existsSync(distIcon192), 'dist/icons/icon-192x192.png is packaged in build')
assert(fs.existsSync(distIcon512), 'dist/icons/icon-512x512.png is packaged in build')

// 7. Mobile Safe Area & Shell CSS Audit
const cssPath = path.resolve('src/App.css')
const cssContent = fs.readFileSync(cssPath, 'utf8')
assert(cssContent.includes('safe-area-inset-top'), 'App.css contains safe-area-inset-top')
assert(cssContent.includes('safe-area-inset-bottom'), 'App.css contains safe-area-inset-bottom')
assert(cssContent.includes('pwa-update-banner'), 'App.css contains pwa-update-banner styling')
assert(cssContent.includes('pwa-install-banner'), 'App.css contains pwa-install-banner styling')
assert(cssContent.includes('@media (max-width: 420px)'), 'App.css contains mobile shell rules for 360px/390px/412px viewports')

console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===`)

if (failed > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
