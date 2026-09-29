/**
 * SuperHosur PWA Registration & Lifecycle Management
 * Handles Service Worker registration, updates, and install prompts.
 */

let onUpdateCallback: (() => void) | null = null
let registrationInstance: ServiceWorkerRegistration | null = null

export function registerServiceWorker(onUpdate?: () => void) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  if (onUpdate) {
    onUpdateCallback = onUpdate
  }

  // Register on window load to avoid blocking critical initial page load
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        registrationInstance = reg

        // Check if an updated worker is already waiting
        if (reg.waiting) {
          notifyUpdate()
        }

        // Listen for new updates found
        reg.addEventListener('updatefound', () => {
          const installingWorker = reg.installing
          if (!installingWorker) return

          installingWorker.addEventListener('statechange', () => {
            if (
              installingWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              notifyUpdate()
            }
          })
        })
      })
      .catch((err) => {
        console.warn('[PWA] Service worker registration failed:', err)
      })

    // Listen for controller changes (reload when new worker has taken control)
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true
        window.location.reload()
      }
    })
  })
}

function notifyUpdate() {
  if (onUpdateCallback) {
    onUpdateCallback()
  }
}

export function applyServiceWorkerUpdate() {
  if (registrationInstance && registrationInstance.waiting) {
    registrationInstance.waiting.postMessage({ type: 'SKIP_WAITING' })
  }
}
