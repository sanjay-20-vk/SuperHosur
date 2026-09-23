import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  getCurrentSession,
  getCurrentUserProfile,
  getAuthErrorMessage,
  requestPasswordReset,
  signInWithEmail,
  signUpWithEmail,
} from '../services/auth'
import { getMyBusinesses } from '../services/businesses'

type AuthMode = 'sign-in' | 'sign-up' | 'forgot-password'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const NAME_REGEX = /^[a-zA-Z\s.'-]+$/

type AuthFieldErrors = {
  fullName?: string
  email?: string
  password?: string
}

export function AuthPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const mode: AuthMode =
    location.pathname === '/auth/signup'
      ? 'sign-up'
      : location.pathname === '/auth/forgot-password'
      ? 'forgot-password'
      : 'sign-in'
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({})
  const [prevPath, setPrevPath] = useState(location.pathname)
  if (prevPath !== location.pathname) {
    setPrevPath(location.pathname)
    setError(null)
    setFieldErrors({})
  }
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetEmail, setResetEmail] = useState('')

  const clearFieldError = (field: keyof AuthFieldErrors) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  async function redirectAfterAuth() {
    const session = await getCurrentSession()

    if (!session) {
      throw new Error('Your account was created, but the session is not available yet.')
    }

    const profile = await getCurrentUserProfile()

    if (!profile) {
      throw new Error('Your profile could not be loaded. Please try again.')
    }

    const destination = (location.state as { from?: string } | null)?.from
    if (destination && typeof destination === 'string' && destination.startsWith('/')) {
      navigate(destination, { replace: true })
      return
    }

    const businesses = await getMyBusinesses()
    navigate(businesses.length > 0 ? '/owner' : '/owner/onboarding', {
      replace: true,
    })
  }

  useEffect(() => {
    async function checkSession() {
      try {
        const session = await getCurrentSession()

        if (session) {
          const destination = (location.state as { from?: string } | null)?.from
          if (destination && typeof destination === 'string' && destination.startsWith('/')) {
            navigate(destination, { replace: true })
            return
          }

          const businesses = await getMyBusinesses()
          navigate(businesses.length > 0 ? '/owner' : '/owner/onboarding', {
            replace: true,
          })
        }
      } catch (sessionError) {
        const message =
          sessionError instanceof Error ? sessionError.message : 'Unable to load session.'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    checkSession()
  }, [navigate, location.state])

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    setFieldErrors({})
    setError(null)

    const cleanEmail = email.trim()
    const errors: AuthFieldErrors = {}

    if (mode === 'forgot-password') {
      if (!cleanEmail) {
        errors.email = email.length > 0 ? 'Email cannot be only whitespace.' : 'Email is required.'
      } else if (!EMAIL_REGEX.test(cleanEmail)) {
        errors.email = 'Enter a valid email address (e.g. you@example.com).'
      }

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors)
        return
      }

      setSubmitting(true)
      try {
        await requestPasswordReset(cleanEmail)
        setResetSent(true)
        setResetEmail(cleanEmail)
      } catch (submitError) {
        setError(getAuthErrorMessage(submitError))
      } finally {
        setSubmitting(false)
      }
      return
    }

    if (mode === 'sign-up') {
      const cleanFullName = fullName.trim()
      if (!cleanFullName) {
        errors.fullName = fullName.length > 0 ? 'Full name cannot be only whitespace.' : 'Full name is required.'
      } else if (cleanFullName.length < 2 || cleanFullName.length > 70) {
        errors.fullName = 'Full name must be between 2 and 70 characters.'
      } else if (!NAME_REGEX.test(cleanFullName)) {
        errors.fullName = 'Full name can only contain letters and spaces.'
      }

      if (!cleanEmail) {
        errors.email = email.length > 0 ? 'Email cannot be only whitespace.' : 'Email is required.'
      } else if (!EMAIL_REGEX.test(cleanEmail)) {
        errors.email = 'Enter a valid email address (e.g. you@example.com).'
      }

      if (!password) {
        errors.password = 'Password is required.'
      } else if (password.length < 6) {
        errors.password = 'Password must be at least 6 characters long.'
      }

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors)
        return
      }

      setSubmitting(true)
      try {
        const result = await signUpWithEmail({
          email: cleanEmail,
          password,
          fullName: cleanFullName,
        })

        if (result.requiresEmailConfirmation) {
          setError(
            'Account created. Check your email to confirm your account, then sign in.',
          )
          return
        }

        await redirectAfterAuth()
      } catch (submitError) {
        setError(getAuthErrorMessage(submitError))
      } finally {
        setSubmitting(false)
      }
      return
    }

    // mode === 'sign-in'
    if (!cleanEmail) {
      errors.email = email.length > 0 ? 'Email cannot be only whitespace.' : 'Email is required.'
    } else if (!EMAIL_REGEX.test(cleanEmail)) {
      errors.email = 'Enter a valid email address (e.g. you@example.com).'
    }

    if (!password) {
      errors.password = 'Password is required.'
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters long.'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setSubmitting(true)
    try {
      await signInWithEmail({
        email: cleanEmail,
        password,
      })

      await redirectAfterAuth()
    } catch (submitError) {
      setError(getAuthErrorMessage(submitError))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="page-section state-panel"><p>Checking your session…</p></div>
  }

  // Dedicated Forgot Password View
  if (mode === 'forgot-password') {
    return (
      <section className="page-section auth-page">
        <div className="auth-card">
          <p className="eyebrow">Account Recovery</p>
          <h1>Reset your password</h1>

          {resetSent ? (
            <div className="reset-confirmation-block">
              <div className="form-success">
                <p>
                  <strong>Password reset link sent!</strong>
                </p>
                <p>
                  We have sent instructions to <strong>{resetEmail}</strong>. Please check your inbox and click the link to set a new password.
                </p>
              </div>
              <p className="form-hint" style={{ marginTop: '16px', fontSize: '0.9rem', color: '#4a6b63' }}>
                Didn&apos;t receive the email? Check your spam folder or wait a moment before trying again.
              </p>
              <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setResetSent(false)
                    setError(null)
                  }}
                >
                  Resend reset email
                </button>
                <Link to="/auth/signin" className="primary-button inline-button">
                  Back to sign in
                </Link>
              </div>
            </div>
          ) : (
            <>
              <p style={{ color: '#4a6b63', marginTop: '6px', marginBottom: '20px', lineHeight: 1.5 }}>
                Enter your registered email address below. We will send you a secure link to reset your password.
              </p>

              <form className="auth-form" onSubmit={onSubmit} noValidate>
                <label>
                  Email
                  <input
                    type="email"
                    value={email}
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={fieldErrors.email ? 'auth-reset-email-error' : undefined}
                    onChange={(event) => {
                      setEmail(event.target.value)
                      clearFieldError('email')
                    }}
                    placeholder="you@example.com"
                    required
                    autoFocus
                  />
                  {fieldErrors.email && (
                    <span id="auth-reset-email-error" className="field-error" role="alert">
                      {fieldErrors.email}
                    </span>
                  )}
                </label>

                {error && <p className="form-error">{error}</p>}

                <button type="submit" className="primary-button" disabled={submitting}>
                  {submitting ? 'Sending reset link…' : 'Send reset link'}
                </button>

                <div className="auth-back-link">
                  <Link to="/auth/signin" className="text-action">
                    ← Back to sign in
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
      </section>
    )
  }

  return (
    <section className="page-section auth-page">
      <div className="auth-card">
        <p className="eyebrow">Business owner access</p>
        <h1>{mode === 'sign-in' ? 'Welcome back' : 'Create your owner account'}</h1>

        <div className="auth-switch" aria-label="Authentication mode selector">
          <button
            type="button"
            className={mode === 'sign-in' ? 'mode-toggle active' : 'mode-toggle'}
            onClick={() => navigate('/auth/signin', { replace: true })}
          >
            Sign in
          </button>
          <button
            type="button"
            className={mode === 'sign-up' ? 'mode-toggle active' : 'mode-toggle'}
            onClick={() => navigate('/auth/signup', { replace: true })}
          >
            Sign up
          </button>
        </div>

        <form className="auth-form" onSubmit={onSubmit} noValidate>
          {mode === 'sign-up' && (
            <label>
              Full name
              <input
                type="text"
                maxLength={70}
                value={fullName}
                aria-invalid={Boolean(fieldErrors.fullName)}
                aria-describedby={fieldErrors.fullName ? 'auth-fullname-error' : undefined}
                onChange={(event) => {
                  setFullName(event.target.value)
                  clearFieldError('fullName')
                }}
                placeholder="Your full name"
                required
              />
              {fieldErrors.fullName && (
                <span id="auth-fullname-error" className="field-error" role="alert">
                  {fieldErrors.fullName}
                </span>
              )}
            </label>
          )}

          <label>
            Email
            <input
              type="email"
              value={email}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'auth-email-error' : undefined}
              onChange={(event) => {
                setEmail(event.target.value)
                clearFieldError('email')
              }}
              placeholder="you@example.com"
              required
            />
            {fieldErrors.email && (
              <span id="auth-email-error" className="field-error" role="alert">
                {fieldErrors.email}
              </span>
            )}
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'auth-password-error' : undefined}
              onChange={(event) => {
                setPassword(event.target.value)
                clearFieldError('password')
              }}
              placeholder="Enter your password"
              required
            />
            {fieldErrors.password && (
              <span id="auth-password-error" className="field-error" role="alert">
                {fieldErrors.password}
              </span>
            )}
          </label>

          {mode === 'sign-in' && (
            <div className="auth-helper-row">
              <Link to="/auth/forgot-password" className="text-action text-sm">
                Forgot password?
              </Link>
            </div>
          )}

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </div>
    </section>
  )
}

