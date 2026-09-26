import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { NotificationBell } from './NotificationBell'

export function Header() {
  const { session, isAdmin } = useAuth()
  const hasSession = Boolean(session)

  return (
    <header className="app-header">
      <div className="brand-block" aria-label="SuperHosur brand and location">
        <Link className="brand" to="/" aria-label="SuperHosur home">
          SuperHosur
        </Link>
        <span className="location-pill">Hosur, Tamil Nadu</span>
      </div>

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
    </header>
  )
}
