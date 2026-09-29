import { useState } from 'react'
import {
  submitReport,
  getReportErrorMessage,
  REPORT_REASON_LABELS,
  type ReportEntityType,
  type ReportReason,
} from '../services/reports'
import { useAuth } from '../hooks/useAuth'

export interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  entityType: ReportEntityType
  entityId: string
  entityTitle?: string
}

export function ReportModal({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityTitle,
}: ReportModalProps) {
  const { session } = useAuth()
  const [reason, setReason] = useState<ReportReason>('spam')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!session) {
      setError('Please sign in to submit a report.')
      return
    }

    try {
      setLoading(true)
      setError(null)
      await submitReport({
        entityType,
        entityId,
        reason,
        description: description.trim() || null,
      })
      setSuccess(true)
    } catch (err) {
      setError(getReportErrorMessage(err, 'Failed to submit report. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  function handleResetAndClose() {
    setSuccess(false)
    setError(null)
    setDescription('')
    setReason('spam')
    onClose()
  }

  return (
    <div className="report-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="report-modal-title">
      <div className="report-modal-backdrop" onClick={handleResetAndClose} aria-hidden="true" />
      <div className="report-modal-card">
        <div className="report-modal-header">
          <div>
            <span className="report-modal-eyebrow">Content Moderation</span>
            <h2 id="report-modal-title" className="report-modal-title">
              Report {entityType.charAt(0).toUpperCase() + entityType.slice(1)}
            </h2>
            {entityTitle && <p className="report-modal-subtitle">{entityTitle}</p>}
          </div>
          <button
            type="button"
            className="report-modal-close"
            onClick={handleResetAndClose}
            aria-label="Close report dialog"
          >
            ✕
          </button>
        </div>

        {success ? (
          <div className="report-modal-success" role="status">
            <span className="report-success-icon" aria-hidden="true">✓</span>
            <h3>Report Submitted</h3>
            <p>
              Thank you for keeping SuperHosur safe and trustworthy. Our moderation team will review this report against our community guidelines.
            </p>
            <button
              type="button"
              className="primary-button report-modal-btn"
              onClick={handleResetAndClose}
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="report-modal-form">
            {!session && (
              <div className="report-alert-banner report-alert-banner--warning">
                You must be signed in to submit a report.
              </div>
            )}

            {error && (
              <div className="report-alert-banner report-alert-banner--error" role="alert">
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="report-reason-select" className="report-form-label">
                Reason for reporting <span className="required-star">*</span>
              </label>
              <select
                id="report-reason-select"
                className="report-select"
                value={reason}
                onChange={(e) => setReason(e.target.value as ReportReason)}
                disabled={loading || !session}
                required
              >
                {Object.entries(REPORT_REASON_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="report-desc-input" className="report-form-label">
                Additional Details (Optional)
              </label>
              <textarea
                id="report-desc-input"
                className="report-textarea"
                rows={4}
                maxLength={2000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please describe why this content violates community standards..."
                disabled={loading || !session}
              />
              <span className="report-char-count">{description.length}/2000</span>
            </div>

            <div className="report-modal-actions">
              <button
                type="button"
                className="secondary-button report-cancel-btn"
                onClick={handleResetAndClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="primary-button report-submit-btn"
                disabled={loading || !session}
              >
                {loading ? 'Submitting…' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
