import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { LoadingState } from '../components/LoadingState'
import { SEO } from '../components/SEO'
import { useAuth } from '../hooks/useAuth'
import {
  PROFILE_NAME_REGEX,
  PROFILE_PHONE_REGEX,
  updateCurrentUserProfile,
  validateProfileInput,
  type UserProfile,
} from '../services/auth'
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferencesRecord,
} from '../services/notificationPreferences'

function getRoleLabel(role: UserProfile['role']): string {
  if (role === 'admin') return 'Administrator'
  if (role === 'vendor') return 'Business Owner'
  return 'Customer'
}

function getInitials(name: string | null, email: string | null): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/)
    const first = parts[0]
    const second = parts[1]
    if (first && second && first[0] && second[0]) {
      return (first[0] + second[0]).toUpperCase()
    }
    if (first) {
      return first.slice(0, 2).toUpperCase()
    }
  }
  if (email && email.trim()) {
    return email.slice(0, 2).toUpperCase()
  }
  return 'SH'
}

type ProfileFieldErrors = {
  fullName?: string
  phone?: string
}

export function ProfilePage() {
  const navigate = useNavigate()
  const { session, profile: authProfile, loading, refreshProfile, signOut: authSignOut, isAdmin } = useAuth()
  const userEmail = session?.user.email ?? null

  const [profile, setProfile] = useState<UserProfile | null>(authProfile)
  const [fullName, setFullName] = useState(authProfile?.full_name ?? '')
  const [phone, setPhone] = useState(authProfile?.phone ?? '')
  const [syncedProfileId, setSyncedProfileId] = useState<string | null>(authProfile?.id ?? null)

  if (authProfile && authProfile.id !== syncedProfileId) {
    setSyncedProfileId(authProfile.id)
    setProfile(authProfile)
    setFullName(authProfile.full_name ?? '')
    setPhone(authProfile.phone ?? '')
  }

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({})
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Notification Preferences State
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferencesRecord | null>(null)
  const [updatingPref, setUpdatingPref] = useState(false)
  const [prefMessage, setPrefMessage] = useState<string | null>(null)

  useEffect(() => {
    async function loadPrefs() {
      try {
        const p = await getNotificationPreferences()
        setNotifPrefs(p)
      } catch {
        // Silent fail
      }
    }
    if (session?.user.id) {
      void loadPrefs()
    }
  }, [session?.user.id])

  async function handleTogglePref(key: keyof NotificationPreferencesRecord) {
    if (!notifPrefs || updatingPref) return
    try {
      setUpdatingPref(true)
      setPrefMessage(null)
      const currentVal = Boolean(notifPrefs[key])
      const updated = await updateNotificationPreferences({
        [key]: !currentVal,
      })
      setNotifPrefs(updated)
      setPrefMessage('Notification preferences updated.')
      setTimeout(() => setPrefMessage(null), 3000)
    } catch {
      setPrefMessage('Failed to update preference.')
    } finally {
      setUpdatingPref(false)
    }
  }

  const clearFieldError = (field: keyof ProfileFieldErrors) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  useEffect(() => {
    if (!loading && !session) {
      navigate('/auth/signin', { replace: true, state: { from: '/profile' } })
    }
  }, [loading, session, navigate])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (saving) return

    setError(null)
    setSuccessMessage(null)
    setFieldErrors({})

    const errors: ProfileFieldErrors = {}
    const trimmedName = fullName.trim()

    if (!trimmedName) {
      errors.fullName = fullName.length > 0 ? 'Full name cannot be only whitespace.' : 'Full name is required.'
    } else if (trimmedName.length < 2 || trimmedName.length > 70) {
      errors.fullName = 'Full name must be between 2 and 70 characters.'
    } else if (!PROFILE_NAME_REGEX.test(trimmedName)) {
      errors.fullName = 'Full name can only contain letters and spaces.'
    }

    if (phone.length > 0 && !phone.trim()) {
      errors.phone = 'Phone number cannot be only whitespace.'
    } else if (phone.trim()) {
      const cleanedPhone = phone.trim().replace(/[\s\-()]+/g, '')
      if (!PROFILE_PHONE_REGEX.test(cleanedPhone)) {
        errors.phone = 'Enter a valid 10-digit Indian phone number (e.g. 9876543210 or +919876543210).'
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setError('Please correct the highlighted errors before saving.')
      return
    }

    const cleanPhone = phone.trim() ? phone.trim().replace(/[\s\-()]+/g, '') : null

    const validationErr = validateProfileInput({
      full_name: trimmedName,
      phone: cleanPhone,
    })

    if (validationErr) {
      setError(validationErr)
      return
    }

    try {
      setSaving(true)
      const updated = await updateCurrentUserProfile({
        full_name: trimmedName,
        phone: cleanPhone,
      })

      setProfile(updated)
      setFullName(updated.full_name ?? '')
      setPhone(updated.phone ?? '')
      setSuccessMessage('Profile updated successfully!')
      await refreshProfile()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update profile.')
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    if (profile) {
      setFullName(profile.full_name ?? '')
      setPhone(profile.phone ?? '')
      setError(null)
      setFieldErrors({})
      setSuccessMessage(null)
    }
  }

  async function handleSignOut() {
    try {
      await authSignOut()
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign out.')
    }
  }

  if (loading) {
    return (
      <>
        <Header />
        <LoadingState message="Loading your profile…" />
      </>
    )
  }

  const roleBadge = profile ? getRoleLabel(profile.role) : 'Customer'
  const initials = getInitials(profile?.full_name ?? null, userEmail)

  return (
    <>
      <SEO title="User Profile | SuperHosur" noindex />
      <Header />

      <section
        className="page-section owner-dashboard profile-container"
        aria-label="User Profile and Account Settings"
      >
        {/* Profile Header Banner */}
        <header className="dashboard-header profile-header-banner">
          <div>
            <div className="owner-eyebrow-row">
              <span className="owner-badge-pill">
                <span className="owner-badge-dot" aria-hidden="true"></span>
                Account Settings • Personal Profile &amp; Credentials
              </span>
            </div>
            <h1 className="owner-dash-title">My Profile</h1>
            <p className="owner-dash-subtitle">
              Manage your personal identity, contact numbers, and SuperHosur credentials safely and efficiently.
            </p>
          </div>

          <div className="owner-actions">
            {isAdmin && (
              <Link
                to="/admin"
                className="primary-button inline-button profile-admin-button"
                aria-label="Open Admin Portal"
              >
                Admin Portal &rarr;
              </Link>
            )}
            <button
              type="button"
              className="nav-link danger-button"
              onClick={() => void handleSignOut()}
              aria-label="Sign out of your SuperHosur account"
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Global Notifications */}
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}

        {successMessage && (
          <div
            className="form-success"
            role="status"
            style={{
              background: '#f0fdf4',
              color: '#166534',
              border: '1px solid #86efac',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
            }}
          >
            ✓ {successMessage}
          </div>
        )}

        {/* Administrator Portal Access Card (Admin Only) */}
        {isAdmin && (
          <article className="business-card profile-card-section profile-admin-card" aria-label="Administrator Portal Access">
            <div className="section-header" style={{ marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <p className="eyebrow" style={{ color: '#4338ca' }}>Administration</p>
                <h3 style={{ margin: 0, color: '#173f3a' }}>Administrator Portal</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: '#64748b' }}>
                  You have administrative privileges to moderate businesses, customer requirements, real estate properties, user accounts, and system taxonomy.
                </p>
              </div>
              <Link
                to="/admin"
                className="primary-button inline-button profile-admin-button"
                aria-label="Navigate to Admin Portal"
              >
                Open Admin Portal &rarr;
              </Link>
            </div>
          </article>
        )}

        {/* 1. Profile Identity Card */}
        <article className="business-card profile-identity-card" aria-label="Profile Identity Overview">
          <div className="profile-avatar-circle" aria-hidden="true">
            {initials}
          </div>

          <div className="profile-identity-info">
            <h2 className="profile-identity-name">
              {profile?.full_name || 'SuperHosur User'}
            </h2>

            <div className="profile-identity-badges">
              <span className="status-badge status-accepted">{roleBadge}</span>
              <span className={profile?.active ? 'status-badge status-open' : 'status-badge status-cancelled'}>
                {profile?.active ? 'Active Account' : 'Inactive'}
              </span>
            </div>

            <p className="profile-identity-email">
              {userEmail || 'No email associated'}
            </p>
          </div>
        </article>

        {/* 2. Personal Details Form */}
        <article className="business-card profile-card-section" aria-labelledby="personal-info-heading">
          <div className="profile-section-heading">
            <h2 id="personal-info-heading">Personal Information</h2>
          </div>

          <form className="owner-form" onSubmit={handleSubmit} noValidate>
            <div className="form-grid">
              <label className="full-width">
                Full Name *
                <input
                  type="text"
                  maxLength={70}
                  value={fullName}
                  aria-invalid={Boolean(fieldErrors.fullName)}
                  aria-describedby={fieldErrors.fullName ? 'profile-fullname-error' : undefined}
                  onChange={(e) => {
                    setFullName(e.target.value)
                    clearFieldError('fullName')
                  }}
                  placeholder="e.g. John Doe"
                  required
                  aria-required="true"
                />
                <span className="char-hint">{fullName.length}/70</span>
                {fieldErrors.fullName && (
                  <span id="profile-fullname-error" className="field-error" role="alert">
                    {fieldErrors.fullName}
                  </span>
                )}
              </label>

              <label className="full-width">
                Phone Number
                <input
                  type="tel"
                  maxLength={15}
                  value={phone}
                  aria-invalid={Boolean(fieldErrors.phone)}
                  aria-describedby={fieldErrors.phone ? 'profile-phone-error' : undefined}
                  onChange={(e) => {
                    setPhone(e.target.value)
                    clearFieldError('phone')
                  }}
                  placeholder="e.g. 9876543210 or +91 9876543210"
                />
                {fieldErrors.phone && (
                  <span id="profile-phone-error" className="field-error" role="alert">
                    {fieldErrors.phone}
                  </span>
                )}
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 'normal', marginTop: '4px', display: 'block' }}>
                  Used for verified local direct calls, quotation updates, and buyer outreach.
                </span>
              </label>
            </div>

            <div className="form-actions" style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                className="primary-button"
                disabled={saving}
                aria-label="Save profile changes"
              >
                {saving ? 'Saving changes…' : 'Save Profile Changes'}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={handleReset}
                disabled={saving}
                aria-label="Reset profile form changes"
              >
                Cancel
              </button>
            </div>
          </form>
        </article>

        {/* 3. Account & Security Credentials */}
        <article className="business-card profile-card-section" aria-labelledby="account-creds-heading">
          <div className="profile-section-heading">
            <h2 id="account-creds-heading">Account Credentials</h2>
            <span className="profile-readonly-badge">🔒 Read-Only Credentials</span>
          </div>

          <div className="form-grid">
            <label>
              Email Address
              <input
                type="email"
                value={userEmail ?? ''}
                disabled
                readOnly
                style={{ background: 'rgba(24, 59, 52, 0.04)', color: 'var(--color-text-muted)' }}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-subtle)', fontWeight: 'normal', marginTop: '4px', display: 'block' }}>
                Account authentication email.
              </span>
            </label>

            <label>
              Account Role
              <input
                type="text"
                value={roleBadge}
                disabled
                readOnly
                style={{ background: 'rgba(24, 59, 52, 0.04)', color: 'var(--color-text-muted)' }}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-subtle)', fontWeight: 'normal', marginTop: '4px', display: 'block' }}>
                Permissions profile assigned in SuperHosur.
              </span>
            </label>

            <label className="full-width">
              SuperHosur User ID
              <input
                type="text"
                value={profile?.id ?? ''}
                disabled
                readOnly
                style={{
                  background: 'rgba(24, 59, 52, 0.04)',
                  color: 'var(--color-text-muted)',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: '0.85rem',
                }}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-subtle)', fontWeight: 'normal', marginTop: '4px', display: 'block' }}>
                Unique platform identifier for customer &amp; vendor records.
              </span>
            </label>
          </div>
        </article>

        {/* 4. Notification Preferences Card */}
        <article className="business-card profile-card-section" aria-labelledby="notif-prefs-heading">
          <div className="profile-section-heading">
            <h2 id="notif-prefs-heading">Notification &amp; Channel Preferences</h2>
            <p>Choose which channels and transactional events you wish to receive alerts for.</p>
          </div>

          {prefMessage && (
            <div style={{ padding: '8px 12px', background: '#ecfdf5', color: '#065f46', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '16px' }}>
              ✓ {prefMessage}
            </div>
          )}

          {notifPrefs ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                {/* Email Channel */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', background: notifPrefs.email_enabled ? '#f0fdf4' : '#ffffff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '1rem', color: '#0f172a' }}>📧 Email Notifications</strong>
                      <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                        Deliver to: {userEmail || 'Your account email'}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifPrefs.email_enabled}
                      disabled={updatingPref}
                      onChange={() => void handleTogglePref('email_enabled')}
                      style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                      aria-label="Toggle email notifications"
                    />
                  </div>
                </div>

                {/* WhatsApp Channel */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', background: notifPrefs.whatsapp_enabled ? '#f0fdf4' : '#ffffff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '1rem', color: '#0f172a' }}>💬 WhatsApp Alerts</strong>
                      <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                        Deliver to: {profile?.phone || 'Add phone number above'}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifPrefs.whatsapp_enabled}
                      disabled={updatingPref || !profile?.phone}
                      onChange={() => void handleTogglePref('whatsapp_enabled')}
                      style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                      aria-label="Toggle WhatsApp notifications"
                    />
                  </div>
                </div>
              </div>

              {/* Event Subscriptions */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '0.9rem', margin: '0 0 12px', color: '#334155' }}>Subscribed Events</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={notifPrefs.quote_notifications}
                      disabled={updatingPref}
                      onChange={() => void handleTogglePref('quote_notifications')}
                    />
                    Quotation updates &amp; bids
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={notifPrefs.message_notifications}
                      disabled={updatingPref}
                      onChange={() => void handleTogglePref('message_notifications')}
                    />
                    Direct chat messages
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={notifPrefs.requirement_notifications}
                      disabled={updatingPref}
                      onChange={() => void handleTogglePref('requirement_notifications')}
                    />
                    Requirement status updates
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={notifPrefs.moderation_notifications}
                      disabled={updatingPref}
                      onChange={() => void handleTogglePref('moderation_notifications')}
                    />
                    Listing moderation results
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <p style={{ color: '#64748b', fontSize: '0.88rem' }}>Loading preferences…</p>
          )}
        </article>

        {/* 4. Quick Account Navigation */}
        <article className="business-card profile-card-section" aria-labelledby="quick-nav-heading">
          <div className="profile-section-heading">
            <h2 id="quick-nav-heading">Quick Navigation</h2>
          </div>

          <div className="profile-quick-links-grid">
            <Link
              to="/saved"
              className="profile-quick-link-btn"
              aria-label="Go to My Saved Listings"
            >
              ❤️ Saved Listings
            </Link>
            <Link
              to="/my-requirements"
              className="profile-quick-link-btn"
              aria-label="Go to My Requirements"
            >
              📋 My Requirements
            </Link>
            <Link
              to="/owner"
              className="profile-quick-link-btn"
              aria-label="Go to My Dashboard"
            >
              📊 My Dashboard
            </Link>
            <Link
              to="/owner/properties/create"
              className="profile-quick-link-btn"
              aria-label="List a property"
            >
              🏠 List a Property
            </Link>
            <Link
              to="/properties"
              className="profile-quick-link-btn"
              aria-label="Browse properties in Hosur"
            >
              🔍 Browse Properties
            </Link>
          </div>
        </article>
      </section>
    </>
  )
}
