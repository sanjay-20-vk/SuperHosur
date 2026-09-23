import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  getAuthErrorMessage,
  handlePasswordRecoveryRedirect,
  signOut,
  updateUserPassword,
} from '../services/auth'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [checkingSession, setCheckingSession] = useState(true)
  const [sessionValid, setSessionValid] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmPassword?: string }>({})
  const [success, setSuccess] = useState(false)
  const [countdown, setCountdown] = useState(4)

  const clearFieldError = (field: 'password' | 'confirmPassword') => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  useEffect(() => {
    let mounted = true

    async function verifyRecoverySession() {
      try {
        const result = await handlePasswordRecoveryRedirect()
        if (!mounted) return

        if (result.isRecovery) {
          setSessionValid(true)
          setSessionError(null)
        } else {
          setSessionValid(false)
          setSessionError(
            result.error || 'Your password reset link is invalid, expired, or has already been used.',
          )
        }
      } catch (err) {
        if (!mounted) return
        setSessionValid(false)
        setSessionError(getAuthErrorMessage(err))
      } finally {
        if (mounted) {
          setCheckingSession(false)
        }
      }
    }

    verifyRecoverySession()

    return () => {
      mounted = false
    }
  }, [])

  // Handle countdown on success
  useEffect(() => {
    if (!success) return

    if (countdown <= 0) {
      navigate('/auth/signin', { replace: true })
      return
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [success, countdown, navigate])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    setFormError(null)
    setFieldErrors({})

    const errors: { password?: string; confirmPassword?: string } = {}

    if (!password) {
      errors.password = 'New password is required.'
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters long.'
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password.'
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match. Please ensure both fields are identical.'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setSubmitting(true)

    try {
      await updateUserPassword(password)
      setSuccess(true)
      // Sign out recovery session cleanly so user can sign in with new credentials
      try {
        await signOut()
      } catch {
        // Non-blocking
      }
    } catch (err) {
      setFormError(getAuthErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (checkingSession) {
    return (
      <section className="page-section auth-page">
        <div className="auth-card">
          <p className="eyebrow">Account Recovery</p>
          <h2>Verifying recovery session…</h2>
          <div className="state-panel" style={{ background: 'transparent', padding: '16px 0' }}>
            <p>Please wait while we validate your security credentials.</p>
          </div>
        </div>
      </section>
    )
  }

  if (!sessionValid) {
    return (
      <section className="page-section auth-page">
        <div className="auth-card">
          <p className="eyebrow">Account Recovery</p>
          <h1>Reset Link Expired</h1>

          <div className="form-error" style={{ margin: '16px 0 20px' }}>
            <p style={{ margin: 0 }}>
              {sessionError || 'Your password reset link is invalid or has expired.'}
            </p>
          </div>

          <p style={{ color: '#4a6b63', lineHeight: 1.5, marginBottom: '24px' }}>
            Password reset links expire for your security. Please request a fresh reset link to choose a new password.
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link to="/auth/forgot-password" className="primary-button inline-button">
              Request new reset link
            </Link>
            <Link to="/auth/signin" className="secondary-button inline-button">
              Return to sign in
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="page-section auth-page">
      <div className="auth-card">
        <p className="eyebrow">Account Security</p>
        <h1>Set new password</h1>

        {success ? (
          <div className="reset-confirmation-block">
            <div className="form-success">
              <p>
                <strong>Password updated successfully!</strong>
              </p>
              <p>
                Your account password has been updated. You can now sign in with your new credentials.
              </p>
            </div>

            <p style={{ marginTop: '18px', color: '#4a6b63' }}>
              Redirecting to sign in in <strong>{countdown}</strong> second{countdown !== 1 ? 's' : ''}…
            </p>

            <div style={{ marginTop: '20px' }}>
              <Link to="/auth/signin" className="primary-button inline-button">
                Sign in now
              </Link>
            </div>
          </div>
        ) : (
          <>
            <p style={{ color: '#4a6b63', marginTop: '6px', marginBottom: '20px', lineHeight: 1.5 }}>
              Enter your new password below. Ensure it is at least 6 characters long.
            </p>

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <label>
                New Password
                <input
                  type="password"
                  value={password}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? 'reset-password-error' : undefined}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    clearFieldError('password')
                  }}
                  placeholder="Enter at least 6 characters"
                  required
                  minLength={6}
                  autoFocus
                />
                {fieldErrors.password && (
                  <span id="reset-password-error" className="field-error" role="alert">
                    {fieldErrors.password}
                  </span>
                )}
              </label>

              <label>
                Confirm New Password
                <input
                  type="password"
                  value={confirmPassword}
                  aria-invalid={Boolean(fieldErrors.confirmPassword)}
                  aria-describedby={fieldErrors.confirmPassword ? 'reset-confirm-password-error' : undefined}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value)
                    clearFieldError('confirmPassword')
                  }}
                  placeholder="Re-enter your new password"
                  required
                  minLength={6}
                />
                {fieldErrors.confirmPassword && (
                  <span id="reset-confirm-password-error" className="field-error" role="alert">
                    {fieldErrors.confirmPassword}
                  </span>
                )}
              </label>

              {formError && <p className="form-error">{formError}</p>}

              <button type="submit" className="primary-button" disabled={submitting}>
                {submitting ? 'Updating password…' : 'Update password'}
              </button>

              <div className="auth-back-link">
                <Link to="/auth/signin" className="text-action">
                  Cancel and return to sign in
                </Link>
              </div>
            </form>
          </>
        )}
      </div>
    </section>
  )
}
