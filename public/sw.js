/**
 * SuperHosur Service Worker
 * Phase 17 Step 6: PWA, Web App Manifest & Mobile App Shell
 *
 * Cache Strategy:
 * 1. Application Shell & Static Assets: Stale-While-Revalidate / Cache-First
 * 2. Navigation: Network-First with Offline Fallback (/offline.html)
 * 3. Supabase API, Auth, Realtime, Functions, Storage: NETWORK ONLY (Bypassed)
 * 4. NEVER cache Authorization headers, private quotes, requirements, or profile data
 */

const CACHE_NAME = 'superhosur-shell-v1'
const OFFLINE_URL = '/offline.html'

// Core static assets for the app shell
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/og-image.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-192x192.png',
  '/icons/icon-maskable-512x512.png'
]

// Install Event: Precache offline page and essential public branding
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        await cache.addAll(PRECACHE_ASSETS)
      } catch (err) {
        console.warn('[SW] Precache asset fetch issue (non-fatal):', err)
      }
    }).then(() => self.skipWaiting())
  )
})

// Activate Event: Clean up old caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

// Listen for message events (e.g., skipWaiting trigger from UI)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Fetch Event Handler
self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)

  // 1. Only handle GET requests. POST, PUT, DELETE, PATCH always go to network
  if (req.method !== 'GET') {
    return
  }

  // 2. CRITICAL SECURITY: Never intercept or cache Supabase requests
  // Supabase domain, REST API, Auth, Realtime WebSocket, Storage
  if (
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/rest/v1') ||
    url.pathname.startsWith('/auth/v1') ||
    url.pathname.startsWith('/realtime/v1') ||
    url.pathname.startsWith('/storage/v1')
  ) {
    return // Let browser handle network directly
  }

  // 3. Skip chrome-extension, internal schemes, analytics endpoints, or authorization headers
  if (
    url.protocol.startsWith('chrome-extension') ||
    req.headers.has('Authorization') ||
    req.headers.has('apikey')
  ) {
    return
  }

  // 4. HTML Navigation Requests: Network-First with Offline Fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((response) => {
          // If valid response, clone and update shell cache if desired
          if (response.status === 200) {
            const resClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone))
          }
          return response
        })
        .catch(async () => {
          // Check if the route was cached in service worker
          const cachedResponse = await caches.match(req)
          if (cachedResponse) {
            return cachedResponse
          }
          // Fall back to offline page
          const offlineFallback = await caches.match(OFFLINE_URL)
          if (offlineFallback) {
            return offlineFallback
          }
          return new Response('Network error occurred and offline page unavailable.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
          })
        })
    )
    return
  }

  // 5. Static Assets (JS, CSS, fonts, public images, icons): Stale-While-Revalidate / Cache-First
  const isStaticAsset =
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/assets/') ||
      url.pathname.startsWith('/icons/') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.woff2') ||
      url.pathname.endsWith('.woff'))

  if (isStaticAsset) {
    event.respondWith(
      caches.match(req).then((cachedResponse) => {
        const fetchPromise = fetch(req)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const resClone = networkResponse.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone))
            }
            return networkResponse
          })
          .catch(() => {
            // Ignore network fetch errors if we have cached response
            return null
          })

        // Return cached if present, else wait for network
        return cachedResponse || fetchPromise.then((res) => res || new Response('', { status: 404 }))
      })
    )
    return
  }

  // 6. External fonts (Google Fonts): Cache with Stale-While-Revalidate
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.match(req).then((cachedResponse) => {
        const fetchPromise = fetch(req)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const resClone = networkResponse.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone))
            }
            return networkResponse
          })
          .catch(() => null)

        return cachedResponse || fetchPromise.then((res) => res || new Response('', { status: 404 }))
      })
    )
    return
  }

  // Default: Let request proceed to network
})
