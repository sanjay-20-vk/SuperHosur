import { useState } from 'react'
import {
  moderateAdminReport,
  getReportErrorMessage,
  REPORT_REASON_LABELS,
  type ReportRecord,
  type ReportStatus,
  type ReportEntityType,
} from '../../services/reports'

export interface AdminReportModerationProps {
  reports: ReportRecord[]
  loading: boolean
  error: string | null
  onRefresh: () => Promise<void>
}

const STATUS_BADGES: Record<ReportStatus, { label: string; className: string }> = {
  pending: { label: 'Pending Review', className: 'report-badge report-badge--pending' },
  reviewing: { label: 'Under Investigation', className: 'report-badge report-badge--reviewing' },
  resolved: { label: 'Resolved (Action Taken)', className: 'report-badge report-badge--resolved' },
  dismissed: { label: 'Dismissed', className: 'report-badge report-badge--dismissed' },
}

export function AdminReportModeration({
  reports,
  loading,
  error,
  onRefresh,
}: AdminReportModerationProps) {
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('pending')
  const [entityTypeFilter, setEntityTypeFilter] = useState<ReportEntityType | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [resolutionMap, setResolutionMap] = useState<Record<string, string>>({})

  const filteredReports = reports.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    if (entityTypeFilter !== 'all' && r.entity_type !== entityTypeFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchId = r.entity_id.toLowerCase().includes(q)
      const matchDesc = r.description?.toLowerCase().includes(q) ?? false
      const matchReporter = r.reporter_profile?.full_name?.toLowerCase().includes(q) ?? false
      return matchId || matchDesc || matchReporter
    }
    return true
  })

  async function handleModerate(
    report: ReportRecord,
    newStatus: 'reviewing' | 'resolved' | 'dismissed',
  ) {
    try {
      setActionLoadingId(report.id)
      setActionError(null)
      const resolution = resolutionMap[report.id] || null
      await moderateAdminReport({
        reportId: report.id,
        status: newStatus,
        resolution,
      })
      await onRefresh()
    } catch (err) {
      setActionError(getReportErrorMessage(err, 'Failed to update report status.'))
    } finally {
      setActionLoadingId(null)
    }
  }

  return (
    <section className="admin-reports-section" aria-labelledby="reports-oversight-title">
      <div className="section-header" style={{ marginBottom: '20px' }}>
        <div>
          <p className="eyebrow">Trust & Safety</p>
          <h2 id="reports-oversight-title">Abuse & Flagged Content Oversight</h2>
          <p className="supply-intro">
            Review user-submitted abuse reports across businesses, properties, customer reviews, requirements, and messages.
          </p>
        </div>
        <button
          type="button"
          className="secondary-button inline-button"
          onClick={() => void onRefresh()}
          disabled={loading}
        >
          {loading ? 'Refreshing…' : '↻ Refresh Reports'}
        </button>
      </div>

      {error && (
        <div className="state-panel error-state" role="alert" style={{ marginBottom: '16px' }}>
          <p>{error}</p>
        </div>
      )}

      {actionError && (
        <div className="state-panel error-state" role="alert" style={{ marginBottom: '16px' }}>
          <p>{actionError}</p>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="abm-filter-bar" style={{ marginBottom: '20px' }}>
        <div className="abm-filter-group" role="radiogroup" aria-label="Filter by report status">
          {(['all', 'pending', 'reviewing', 'resolved', 'dismissed'] as const).map((st) => (
            <button
              key={st}
              type="button"
              className={`abm-filter-btn ${statusFilter === st ? 'abm-filter-btn--active' : ''}`}
              onClick={() => setStatusFilter(st)}
            >
              {st.charAt(0).toUpperCase() + st.slice(1)}
              <span className="abm-filter-count">
                {st === 'all'
                  ? reports.length
                  : reports.filter((r) => r.status === st).length}
              </span>
            </button>
          ))}
        </div>

        <div className="abm-search-wrap" style={{ maxWidth: '320px', display: 'flex', gap: '8px' }}>
          <select
            className="report-select"
            style={{ width: 'auto', padding: '6px 10px', fontSize: '0.85rem' }}
            value={entityTypeFilter}
            onChange={(e) => setEntityTypeFilter(e.target.value as ReportEntityType | 'all')}
            aria-label="Filter by entity type"
          >
            <option value="all">All Entities</option>
            <option value="business">Business</option>
            <option value="property">Property</option>
            <option value="review">Review</option>
            <option value="requirement">Requirement</option>
            <option value="message">Message</option>
          </select>

          <div style={{ position: 'relative', flex: 1 }}>
            <span className="abm-search-icon" aria-hidden="true" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}>🔍</span>
            <input
              type="search"
              className="abm-search-input"
              style={{ width: '100%', paddingLeft: '32px' }}
              placeholder="Search reports…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading && reports.length === 0 ? (
        <div className="state-panel">
          <span className="spinner" aria-hidden="true" />
          <p>Loading abuse reports…</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="state-panel">
          <h3>No reports found</h3>
          <p>There are no reports matching the selected filters.</p>
        </div>
      ) : (
        <div className="admin-reports-list" role="list">
          {filteredReports.map((report) => {
            const isProcessing = actionLoadingId === report.id
            const badge = STATUS_BADGES[report.status]

            return (
              <article key={report.id} className="admin-report-card" role="listitem">
                <div className="admin-report-card-top">
                  <div className="admin-report-meta">
                    <span className={`report-badge ${badge.className}`}>{badge.label}</span>
                    <span className="admin-report-entity-tag">
                      {report.entity_type.toUpperCase()}
                    </span>
                    <span className="admin-report-date">
                      {new Date(report.created_at).toLocaleString()}
                    </span>
                  </div>
                  <span className="admin-report-id">ID: {report.id.slice(0, 8)}</span>
                </div>

                <div className="admin-report-body">
                  <div className="admin-report-info-row">
                    <strong>Reported Entity ID:</strong>
                    <code>{report.entity_id}</code>
                  </div>
                  <div className="admin-report-info-row">
                    <strong>Reason:</strong>
                    <span>{REPORT_REASON_LABELS[report.reason] || report.reason}</span>
                  </div>
                  {report.reporter_profile && (
                    <div className="admin-report-info-row">
                      <strong>Reporter:</strong>
                      <span>{report.reporter_profile.full_name || 'Community Member'}</span>
                    </div>
                  )}
                  {report.description && (
                    <div className="admin-report-desc-box">
                      <strong>Reporter Note:</strong>
                      <p>{report.description}</p>
                    </div>
                  )}
                  {report.resolution && (
                    <div className="admin-report-resolution-box">
                      <strong>Admin Resolution Note:</strong>
                      <p>{report.resolution}</p>
                    </div>
                  )}
                </div>

                {/* Moderation Actions Bar */}
                <div className="admin-report-actions-bar">
                  <div className="admin-report-resolution-input-wrap">
                    <input
                      type="text"
                      className="admin-report-res-input"
                      placeholder="Resolution note (e.g. Content removed, user warned)..."
                      value={resolutionMap[report.id] ?? ''}
                      onChange={(e) =>
                        setResolutionMap((prev) => ({
                          ...prev,
                          [report.id]: e.target.value,
                        }))
                      }
                      disabled={isProcessing}
                    />
                  </div>

                  <div className="admin-report-btn-group">
                    {report.status !== 'reviewing' && (
                      <button
                        type="button"
                        className="admin-report-btn action-investigate"
                        onClick={() => handleModerate(report, 'reviewing')}
                        disabled={isProcessing}
                      >
                        Investigate
                      </button>
                    )}
                    {report.status !== 'resolved' && (
                      <button
                        type="button"
                        className="admin-report-btn action-resolve"
                        onClick={() => handleModerate(report, 'resolved')}
                        disabled={isProcessing}
                      >
                        Resolve &amp; Close
                      </button>
                    )}
                    {report.status !== 'dismissed' && (
                      <button
                        type="button"
                        className="admin-report-btn action-dismiss"
                        onClick={() => handleModerate(report, 'dismissed')}
                        disabled={isProcessing}
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
