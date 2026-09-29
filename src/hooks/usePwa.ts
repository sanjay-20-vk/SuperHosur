import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const INSTALL_DISMISSED_KEY = 'superhosur_pwa_install_dismissed'

export function usePwa() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === 'undefined') return false
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    )
  })
  const [isIOS] = useState(() => {
    if (typeof window === 'undefined') return false
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent)
    const isSafari = isAppleDevice && /safari/.test(userAgent) && !/crios|fxios|opios/.test(userAgent)
    return isAppleDevice && isSafari
  })

  useEffect(() => {
    if (isInstalled) {
      return
    }

    // Check if user dismissed previously
    const dismissed = localStorage.getItem(INSTALL_DISMISSED_KEY)
    if (dismissed) {
      return
    }

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsInstallable(true)
    }

    function handleAppInstalled() {
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
      localStorage.removeItem(INSTALL_DISMISSED_KEY)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [isInstalled])

  const promptInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false
    }

    try {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') {
        setIsInstalled(true)
        setIsInstallable(false)
        setDeferredPrompt(null)
        return true
      } else {
        dismissPrompt()
        return false
      }
    } catch (err) {
      console.warn('[PWA] Error prompting installation:', err)
      return false
    }
  }

  const dismissPrompt = () => {
    setIsInstallable(false)
    setDeferredPrompt(null)
    localStorage.setItem(INSTALL_DISMISSED_KEY, Date.now().toString())
  }

  return {
    isInstallable,
    isInstalled,
    isIOS,
    promptInstall,
    dismissPrompt,
  }
}
