import { useEffect, useState, type MouseEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  isBusinessSaved,
  isPropertySaved,
  saveBusiness,
  saveProperty,
  unsaveBusiness,
  unsaveProperty,
  type SavedListingType,
} from '../services/savedListings'

export type SaveListingButtonProps = {
  targetType: SavedListingType
  targetId: string
  title?: string
  initialSaved?: boolean
  variant?: 'card-badge' | 'detail-action'
  onToggle?: (isSaved: boolean) => void
  className?: string
}

export function SaveListingButton({
  targetType,
  targetId,
  title,
  initialSaved,
  variant = 'card-badge',
  onToggle,
  className = '',
}: SaveListingButtonProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { session } = useAuth()
  const isAuthenticated = Boolean(session?.user?.id)

  const [isSaved, setIsSaved] = useState<boolean>(initialSaved ?? false)
  const [prevInitial, setPrevInitial] = useState(initialSaved)
  const [loading, setLoading] = useState<boolean>(false)

  if (initialSaved !== undefined && initialSaved !== prevInitial) {
    setPrevInitial(initialSaved)
    setIsSaved(initialSaved)
  }

  // If initialSaved wasn't provided, fetch initial status for authenticated user
  useEffect(() => {
    if (typeof initialSaved === 'boolean' || !isAuthenticated || !targetId) {
      return
    }

    let active = true

    async function checkStatus() {
      try {
        const saved =
          targetType === 'business'
            ? await isBusinessSaved(targetId)
            : await isPropertySaved(targetId)

        if (active) {
          setIsSaved(saved)
        }
      } catch {
        // Non-fatal
      }
    }

    void checkStatus()

    return () => {
      active = false
    }
  }, [isAuthenticated, targetId, targetType, initialSaved])

  // Listen to cross-component sync event
  useEffect(() => {
    function handleSync(event: Event) {
      const customEvent = event as CustomEvent<{
        targetType: SavedListingType
        targetId: string
        isSaved: boolean
      }>
      if (
        customEvent.detail &&
        customEvent.detail.targetType === targetType &&
        customEvent.detail.targetId === targetId
      ) {
        setIsSaved(customEvent.detail.isSaved)
      }
    }

    window.addEventListener('saved-listings-changed', handleSync)
    return () => {
      window.removeEventListener('saved-listings-changed', handleSync)
    }
  }, [targetId, targetType])

  async function handleToggle(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    e.stopPropagation()

    if (!isAuthenticated) {
      navigate('/auth/signin', { state: { from: location.pathname } })
      return
    }

    if (loading) {
      return
    }

    const nextSaved = !isSaved
    setIsSaved(nextSaved)
    setLoading(true)

    // Notify listeners optimistically
    window.dispatchEvent(
      new CustomEvent('saved-listings-changed', {
        detail: { targetType, targetId, isSaved: nextSaved },
      }),
    )

    try {
      if (targetType === 'business') {
        if (nextSaved) {
          await saveBusiness(targetId)
        } else {
          await unsaveBusiness(targetId)
        }
      } else {
        if (nextSaved) {
          await saveProperty(targetId)
        } else {
          await unsaveProperty(targetId)
        }
      }

      onToggle?.(nextSaved)
    } catch (err) {
      // Rollback on error
      console.error('Failed to update favorite status:', err)
      setIsSaved(!nextSaved)
      window.dispatchEvent(
        new CustomEvent('saved-listings-changed', {
          detail: { targetType, targetId, isSaved: !nextSaved },
        }),
      )
    } finally {
      setLoading(false)
    }
  }

  const label = isSaved
    ? `Remove ${title || targetType} from saved listings`
    : `Save ${title || targetType} to favorites`

  if (variant === 'detail-action') {
    return (
      <button
        type="button"
        className={`save-listing-btn save-listing-btn--detail ${isSaved ? 'is-saved' : ''} ${className}`}
        onClick={handleToggle}
        disabled={loading}
        aria-label={label}
        aria-pressed={isSaved}
        title={label}
      >
        <svg
          className="save-heart-icon"
          viewBox="0 0 24 24"
          width="18"
          height="18"
          stroke="currentColor"
          strokeWidth="2"
          fill={isSaved ? '#e11d48' : 'none'}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        <span>{isSaved ? 'Saved to Favorites' : 'Save to Favorites'}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      className={`save-listing-btn save-listing-btn--badge ${isSaved ? 'is-saved' : ''} ${className}`}
      onClick={handleToggle}
      disabled={loading}
      aria-label={label}
      aria-pressed={isSaved}
      title={label}
    >
      <svg
        className="save-heart-icon"
        viewBox="0 0 24 24"
        width="18"
        height="18"
        stroke="currentColor"
        strokeWidth="2"
        fill={isSaved ? '#e11d48' : 'none'}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  )
}
