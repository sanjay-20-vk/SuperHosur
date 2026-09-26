import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { NotificationBell } from './NotificationBell'

export function Header() {
  const { session, isAdmin } = useAuth()
  const hasSession = Boolean(session)
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [prevPathname, setPrevPathname] = useState(location.pathname)

  // Close mobile navigation drawer whenever route path changes
  if (location.pathname !== prevPathname) {
    setPrevPathname(location.pathname)
    setMobileMenuOpen(false)
  }

  // Close mobile navigation drawer on Escape key press
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false)
      }
    }

    if (mobileMenuOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [mobileMenuOpen])

  return (
    <>
      <header className="app-header">
        <div className="brand-block" aria-label="SuperHosur brand and location">
          <Link className="brand" to="/" aria-label="SuperHosur home">
            SuperHosur
          </Link>
          <span className="location-pill">Hosur, Tamil Nadu</span>
        </div>

        {/* Desktop Navigation */}
        <nav className="top-nav" aria-label="Main navigation">
          <Link to="/" className="nav-link">
            Browse
          </Link>
          <Link to="/catalog" className="nav-link">
            Catalog
          </Link>
          <Link to="/properties" className="nav-link">
            Properties
          </Link>
          <Link to="/requirements/new" className="nav-link">
            Post requirement
          </Link>
          {hasSession && (
            <>
              <Link to="/saved" className="nav-link">
                Saved
              </Link>
              <Link to="/my-requirements" className="nav-link">
                My requirements
              </Link>
              <Link to="/profile" className="nav-link">
                Profile
              </Link>
              {isAdmin && (
                <Link to="/admin" className="nav-link admin-nav-link" aria-label="Admin Portal">
                  Admin Portal
                </Link>
              )}
            </>
          )}
        </nav>

        {/* Desktop Actions */}
        <div className="header-actions" aria-label="Marketplace actions">
          {hasSession && <NotificationBell />}
          {hasSession ? (
            <Link to="/owner" className="search-entry">
              My dashboard
            </Link>
          ) : (
            <Link to="/auth/signin" className="search-entry">
              Sign in
            </Link>
          )}
          <Link to="/owner/onboarding" className="primary-button inline-button header-button">
            List your business
          </Link>
          <span className="member-chip">Trusted local listings</span>
        </div>

        {/* Mobile Header Controls (Visible on viewports <= 860px) */}
        <div className="mobile-header-controls" aria-label="Mobile navigation controls">
          {hasSession && <NotificationBell />}
          <button
            type="button"
            className={`mobile-menu-toggle ${mobileMenuOpen ? 'is-active' : ''}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-panel"
          >
            <span className="mobile-toggle-bar" aria-hidden="true" />
            <span className="mobile-toggle-bar" aria-hidden="true" />
            <span className="mobile-toggle-bar" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer & Backdrop */}
      {mobileMenuOpen && (
        <div id="mobile-nav-panel" className="mobile-nav-drawer" role="dialog" aria-label="Mobile Navigation Menu">
          <div
            className="mobile-nav-backdrop"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          <nav className="mobile-nav-content" aria-label="Mobile links">
            <div className="mobile-nav-section">
              <span className="mobile-nav-section-title">Marketplace</span>
              <Link to="/" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
                <span className="mobile-nav-icon" aria-hidden="true">🏪</span>
                <span>Browse Marketplace</span>
              </Link>
              <Link to="/catalog" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
                <span className="mobile-nav-icon" aria-hidden="true">📦</span>
                <span>Products &amp; Services</span>
              </Link>
              <Link to="/properties" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
                <span className="mobile-nav-icon" aria-hidden="true">🏡</span>
                <span>Real Estate &amp; Properties</span>
              </Link>
              <Link to="/requirements/new" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
                <span className="mobile-nav-icon" aria-hidden="true">📝</span>
                <span>Post Requirement</span>
              </Link>
            </div>

            {hasSession && (
              <div className="mobile-nav-section">
                <span className="mobile-nav-section-title">My Account</span>
                <Link to="/saved" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
                  <span className="mobile-nav-icon" aria-hidden="true">❤️</span>
                  <span>Saved Listings &amp; Favorites</span>
                </Link>
                <Link to="/my-requirements" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
                  <span className="mobile-nav-icon" aria-hidden="true">📋</span>
                  <span>My Requirements &amp; Quotes</span>
                </Link>
                <Link to="/profile" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
                  <span className="mobile-nav-icon" aria-hidden="true">👤</span>
                  <span>Profile &amp; Settings</span>
                </Link>
                <Link to="/owner" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
                  <span className="mobile-nav-icon" aria-hidden="true">📊</span>
                  <span>Owner Dashboard</span>
                </Link>
                {isAdmin && (
                  <Link to="/admin" className="mobile-nav-link mobile-admin-link" onClick={() => setMobileMenuOpen(false)}>
                    <span className="mobile-nav-icon" aria-hidden="true">🛡️</span>
                    <span>Administrator Portal</span>
                  </Link>
                )}
              </div>
            )}

            <div className="mobile-nav-footer">
              <Link
                to="/owner/onboarding"
                className="primary-button mobile-nav-cta"
                onClick={() => setMobileMenuOpen(false)}
              >
                List your business
              </Link>

              {hasSession ? (
                <Link
                  to="/profile"
                  className="secondary-button mobile-nav-auth-btn"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Manage Account
                </Link>
              ) : (
                <Link
                  to="/auth/signin"
                  className="secondary-button mobile-nav-auth-btn"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign in to SuperHosur
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </>
  )
}
