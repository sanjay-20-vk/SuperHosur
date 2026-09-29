import { useEffect, useState } from 'react'
import { applyServiceWorkerUpdate, registerServiceWorker } from '../services/pwa'
import { usePwa } from '../hooks/usePwa'

export function PwaUpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    registerServiceWorker(() => {
      setUpdateAvailable(true)
    })
  }, [])

  if (!updateAvailable) {
    return null
  }

  const handleUpdate = () => {
    setApplying(true)
    applyServiceWorkerUpdate()
  }

  return (
    <aside
      className="pwa-update-banner"
      role="alert"
      aria-live="polite"
      aria-label="New update available"
    >
      <div className="pwa-update-content">
        <span className="pwa-update-icon" aria-hidden="true">🔄</span>
        <div className="pwa-update-text">
          <strong>Update available</strong>
          <span>A newer version of SuperHosur is available.</span>
        </div>
      </div>
      <div className="pwa-update-actions">
        <button
          type="button"
          className="pwa-update-btn primary"
          onClick={handleUpdate}
          disabled={applying}
        >
          {applying ? 'Updating…' : 'Refresh Now'}
        </button>
        <button
          type="button"
          className="pwa-update-btn text"
          onClick={() => setUpdateAvailable(false)}
          aria-label="Dismiss update notification"
        >
          Later
        </button>
      </div>
    </aside>
  )
}

export function PwaInstallPrompt() {
  const { isInstallable, promptInstall, dismissPrompt } = usePwa()
  const [installing, setInstalling] = useState(false)

  if (!isInstallable) {
    return null
  }

  const handleInstallClick = async () => {
    setInstalling(true)
    try {
      await promptInstall()
    } finally {
      setInstalling(false)
    }
  }

  return (
    <div
      className="pwa-install-banner"
      role="region"
      aria-label="Install SuperHosur Application"
    >
      <div className="pwa-install-content">
        <div className="pwa-install-icon" aria-hidden="true">
          <img src="/icons/icon-192x192.png" alt="" width="36" height="36" />
        </div>
        <div className="pwa-install-text">
          <strong>Install SuperHosur App</strong>
          <span>Fast, standalone mobile access to Hosur businesses &amp; properties.</span>
        </div>
      </div>
      <div className="pwa-install-actions">
        <button
          type="button"
          className="pwa-install-btn primary"
          onClick={handleInstallClick}
          disabled={installing}
        >
          {installing ? 'Installing…' : 'Install'}
        </button>
        <button
          type="button"
          className="pwa-install-btn dismiss"
          onClick={dismissPrompt}
          aria-label="Dismiss app install banner"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
