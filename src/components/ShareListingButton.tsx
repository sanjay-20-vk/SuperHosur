import { memo, useState } from 'react'

export interface ShareListingButtonProps {
  title: string
  text?: string | null
  url: string
  variant?: 'detail-action' | 'button' | 'icon-only'
  showWhatsAppDirect?: boolean
  className?: string
}

export const ShareListingButton = memo(function ShareListingButton({
  title,
  text,
  url,
  variant = 'detail-action',
  showWhatsAppDirect = true,
  className = '',
}: ShareListingButtonProps) {
  const [copied, setCopied] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const shareText = `${title}\n\n${text && text.trim() ? text.trim() + '\n\n' : ''}Check it out on SuperHosur:\n${url}`
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`

  async function handleShareClick() {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title,
          text: text ? `${title} — ${text}` : title,
          url,
        })
        return
      } catch (err) {
        // User aborted share or share failed; if not abort, toggle fallback menu
        if ((err as Error).name === 'AbortError') {
          return
        }
      }
    }

    // Toggle menu if native share is unavailable or failed
    setShowMenu((prev) => !prev)
  }

  async function handleCopyLink() {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      }
    } catch {
      // Non-fatal
    }
  }

  return (
    <div className={`share-listing-container ${className}`} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        className={`share-listing-btn ${variant === 'detail-action' ? 'share-listing-btn--detail' : 'secondary-button'}`}
        onClick={() => void handleShareClick()}
        aria-label={`Share ${title}`}
        title={`Share ${title}`}
        aria-haspopup={!navigator?.share ? 'true' : undefined}
        aria-expanded={showMenu}
      >
        <svg
          className="share-btn-icon"
          viewBox="0 0 24 24"
          width="17"
          height="17"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="18" cy="5" r="3"></circle>
          <circle cx="6" cy="12" r="3"></circle>
          <circle cx="18" cy="19" r="3"></circle>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
        </svg>
        <span>Share</span>
      </button>

      {/* Fallback Dropdown Menu when Web Share API is not available */}
      {showMenu && (
        <>
          <div
            className="share-menu-backdrop"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 998,
            }}
            onClick={() => setShowMenu(false)}
            aria-hidden="true"
          />
          <div
            className="share-dropdown-menu"
            role="menu"
            aria-label="Share options"
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '6px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              padding: '6px',
              minWidth: '200px',
              zIndex: 999,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {showWhatsAppDirect && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="share-menu-item"
                role="menuitem"
                onClick={() => setShowMenu(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: '#166534',
                  textDecoration: 'none',
                  background: '#f0fdf4',
                  transition: 'background 0.15s ease',
                }}
              >
                <span aria-hidden="true">💬</span>
                <span>Share on WhatsApp</span>
              </a>
            )}

            <button
              type="button"
              className="share-menu-item"
              role="menuitem"
              onClick={() => {
                void handleCopyLink()
                setTimeout(() => setShowMenu(false), 900)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 12px',
                borderRadius: '8px',
                fontSize: '0.88rem',
                fontWeight: 600,
                color: '#1e293b',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'background 0.15s ease',
              }}
            >
              <span aria-hidden="true">{copied ? '✓' : '🔗'}</span>
              <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
            </button>
          </div>
        </>
      )}

      {/* Floating feedback toast when link copied directly */}
      {copied && !showMenu && (
        <span
          className="share-copied-toast"
          role="status"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#0f172a',
            color: '#ffffff',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            zIndex: 10,
          }}
        >
          ✓ Link copied!
        </span>
      )}
    </div>
  )
})
