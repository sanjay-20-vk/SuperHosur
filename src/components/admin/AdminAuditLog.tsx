import { useState, useEffect } from 'react'
import {
  getAdminAuditLogs,
  getAuditErrorMessage,
  type AdminAuditLogRecord,
  type AuditEntityType,
  type AuditLogFilters,
} from '../../services/auditLog'

export interface AdminAuditLogProps {
  onRefreshTrigger?: () => void
}

const ACTION_LABELS: Record<string, { label: string; badgeClass: string }> = {
  business_approved: { label: 'Business Approved', badgeClass: 'audit-badge audit-badge--success' },
  business_rejected: { label: 'Business Rejected', badgeClass: 'audit-badge audit-badge--danger' },
  business_suspended: { label: 'Business Suspended', badgeClass: 'audit-badge audit-badge--warning' },
  business_restored: { label: 'Business Restored', badgeClass: 'audit-badge audit-badge--success' },
  bulk_business_approved: { label: 'Bulk Business Approved', badgeClass: 'audit-badge audit-badge--success' },
  bulk_business_rejected: { label: 'Bulk Business Rejected', badgeClass: 'audit-badge audit-badge--danger' },
  bulk_business_suspended: { label: 'Bulk Business Suspended', badgeClass: 'audit-badge audit-badge--warning' },
  bulk_business_restored: { label: 'Bulk Business Restored', badgeClass: 'audit-badge audit-badge--success' },
  property_approved: { label: 'Property Approved', badgeClass: 'audit-badge audit-badge--success' },
  property_rejected: { label: 'Property Rejected', badgeClass: 'audit-badge audit-badge--danger' },
  property_suspended: { label: 'Property Suspended', badgeClass: 'audit-badge audit-badge--warning' },
  property_restored: { label: 'Property Restored', badgeClass: 'audit-badge audit-badge--success' },
  bulk_property_approved: { label: 'Bulk Property Approved', badgeClass: 'audit-badge audit-badge--success' },
  bulk_property_rejected: { label: 'Bulk Property Rejected', badgeClass: 'audit-badge audit-badge--danger' },
  bulk_property_suspended: { label: 'Bulk Property Suspended', badgeClass: 'audit-badge audit-badge--warning' },
  bulk_property_restored: { label: 'Bulk Property Restored', badgeClass: 'audit-badge audit-badge--success' },
  photo_approved: { label: 'Photo Approved', badgeClass: 'audit-badge audit-badge--info' },
  photo_rejected: { label: 'Photo Rejected', badgeClass: 'audit-badge audit-badge--danger' },
  video_approved: { label: 'Video Approved', badgeClass: 'audit-badge audit-badge--info' },
  video_rejected: { label: 'Video Rejected', badgeClass: 'audit-badge audit-badge--danger' },
  review_approved: { label: 'Review Approved', badgeClass: 'audit-badge audit-badge--info' },
  review_rejected: { label: 'Review Rejected', badgeClass: 'audit-badge audit-badge--danger' },
  requirement_status_updated: { label: 'Requirement Updated', badgeClass: 'audit-badge audit-badge--info' },
  user_role_updated: { label: 'User Role Changed', badgeClass: 'audit-badge audit-badge--info' },
  user_status_updated: { label: 'User Status Changed', badgeClass: 'audit-badge audit-badge--warning' },
}

export function AdminAuditLog() {
  const [logs, setLogs] = useState<AdminAuditLogRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [entityTypeFilter, setEntityTypeFilter] = useState<AuditEntityType | 'all'>('all')
  const [actionCategoryFilter, setActionCategoryFilter] = useState<'all' | 'approved' | 'rejected' | 'suspended' | 'restored'>('all')
  const [entityIdSearch, setEntityIdSearch] = useState('')
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function init() {
      try {
        const filters: AuditLogFilters = {
          limit: 100,
        }

        if (entityTypeFilter !== 'all') {
          filters.entityType = entityTypeFilter
        }

        if (entityIdSearch.trim()) {
          filters.entityId = entityIdSearch.trim()
        }

        const data = await getAdminAuditLogs(filters)
        if (active) {
          setLogs(data)
          setLoading(false)
        }
      } catch (err) {
        if (active) {
          setError(getAuditErrorMessage(err, 'Failed to fetch audit log entries.'))
          setLoading(false)
        }
      }
    }

    void init()

    return () => {
      active = false
    }
  }, [entityTypeFilter, entityIdSearch])

  async function handleRefresh() {
    try {
      setLoading(true)
      setError(null)
      const filters: AuditLogFilters = {
        limit: 100,
      }
      if (entityTypeFilter !== 'all') {
        filters.entityType = entityTypeFilter
      }
      if (entityIdSearch.trim()) {
        filters.entityId = entityIdSearch.trim()
      }
      const data = await getAdminAuditLogs(filters)
      setLogs(data)
    } catch (err) {
      setError(getAuditErrorMessage(err, 'Failed to fetch audit log entries.'))
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter((log) => {
    if (actionCategoryFilter !== 'all') {
      if (actionCategoryFilter === 'approved' && !log.action_type.includes('approved')) return false
      if (actionCategoryFilter === 'rejected' && !log.action_type.includes('rejected')) return false
      if (actionCategoryFilter === 'suspended' && !log.action_type.includes('suspended')) return false
      if (actionCategoryFilter === 'restored' && !log.action_type.includes('restored')) return false
    }
    return true
  })

  function formatTimestamp(isoString: string): string {
    try {
      const d = new Date(isoString)
      return d.toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    } catch {
      return isoString
    }
  }

  function getActionMeta(actionType: string) {
    return ACTION_LABELS[actionType] || {
      label: actionType.replace(/_/g, ' '),
      badgeClass: 'audit-badge audit-badge--default',
    }
  }

  return (
    <div className="admin-taxonomy-container">
      <div className="section-header" style={{ marginBottom: '16px' }}>
        <div>
          <p className="eyebrow">Governance & Security</p>
          <h2>Administrative Audit Trail</h2>
          <p className="supply-intro">
            Immutable log of moderation decisions, state transitions, rejection reasons, and bulk actions.
          </p>
        </div>
        <button
          type="button"
          className="secondary-button inline-button"
          onClick={() => void handleRefresh()}
          disabled={loading}
          aria-label="Refresh audit logs"
        >
          {loading ? 'Refreshing…' : '↻ Refresh Logs'}
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="abm-toolbar" role="group" aria-label="Filter audit logs">
        <div className="abm-filter-group" role="group" aria-label="Filter by entity type">
          {(
            [
              { key: 'all', label: 'All Entities' },
              { key: 'business', label: 'Businesses' },
              { key: 'property', label: 'Properties' },
              { key: 'review', label: 'Reviews' },
              { key: 'photo', label: 'Photos' },
              { key: 'video', label: 'Videos' },
              { key: 'requirement', label: 'Requirements' },
              { key: 'user', label: 'Users' },
            ] as { key: AuditEntityType | 'all'; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`abm-filter-btn${entityTypeFilter === key ? ' abm-filter-btn--active' : ''}`}
              aria-pressed={entityTypeFilter === key}
              onClick={() => setEntityTypeFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="abm-filter-group" role="group" aria-label="Filter by action category">
          {(
            [
              { key: 'all', label: 'All Actions' },
              { key: 'approved', label: 'Approvals' },
              { key: 'rejected', label: 'Rejections' },
              { key: 'suspended', label: 'Suspensions' },
              { key: 'restored', label: 'Restorations' },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`abm-filter-btn${actionCategoryFilter === key ? ' abm-filter-btn--active' : ''}`}
              aria-pressed={actionCategoryFilter === key}
              onClick={() => setActionCategoryFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="abm-search-wrap">
          <span className="abm-search-icon" aria-hidden="true">🔍</span>
          <input
            id="audit-entity-id-search"
            type="search"
            className="abm-search-input"
            placeholder="Search by Entity UUID…"
            value={entityIdSearch}
            onChange={(e) => setEntityIdSearch(e.target.value)}
            aria-label="Filter by Entity UUID"
          />
          {entityIdSearch && (
            <button
              type="button"
              className="abm-search-clear"
              aria-label="Clear UUID search"
              onClick={() => setEntityIdSearch('')}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="state-panel">
          <p>Loading audit log records…</p>
        </div>
      )}

      {!loading && error && (
        <div className="state-panel error-state">
          <h3>Audit Log Error</h3>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && filteredLogs.length === 0 && (
        <div className="abm-empty-card" role="status">
          <div className="abm-empty-icon" aria-hidden="true">📜</div>
          <p className="abm-empty-title">No audit log records found</p>
          <p className="abm-empty-desc">
            {entityIdSearch || entityTypeFilter !== 'all' || actionCategoryFilter !== 'all'
              ? 'No audit entries match the selected filters. Try clearing your filters.'
              : 'Administrative actions such as approvals, rejections, and suspensions will appear here automatically.'}
          </p>
        </div>
      )}

      {!loading && !error && filteredLogs.length > 0 && (
        <div className="table-responsive">
          <table className="admin-table audit-log-table" aria-label="Administrative audit log table">
            <thead>
              <tr>
                <th scope="col" style={{ width: '160px' }}>Date & Time</th>
                <th scope="col" style={{ width: '150px' }}>Administrator</th>
                <th scope="col" style={{ width: '180px' }}>Action</th>
                <th scope="col">Entity</th>
                <th scope="col" style={{ width: '160px' }}>Status Transition</th>
                <th scope="col">Reason / Notes</th>
                <th scope="col" style={{ width: '80px', textAlign: 'center' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const actionMeta = getActionMeta(log.action_type)
                const isExpanded = expandedLogId === log.id
                const isBulk = Boolean(log.metadata?.['is_bulk'])

                return (
                  <tr key={log.id} className={isExpanded ? 'audit-row--expanded' : ''}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                      {formatTimestamp(log.created_at)}
                    </td>
                    <td>
                      <div className="audit-admin-cell">
                        <strong>{log.profiles?.full_name || 'Admin'}</strong>
                        <span className="audit-subtext">{log.admin_id.substring(0, 8)}…</span>
                      </div>
                    </td>
                    <td>
                      <span className={actionMeta.badgeClass}>
                        {actionMeta.label}
                      </span>
                      {isBulk && (
                        <span className="audit-bulk-tag" title="Executed via bulk moderation">
                          BULK
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="audit-entity-cell">
                        <span className="audit-entity-type-badge">{log.entity_type}</span>
                        <strong className="audit-entity-title">
                          {log.entity_name || log.entity_id}
                        </strong>
                        <span className="audit-subtext" title={log.entity_id}>
                          ID: {log.entity_id.substring(0, 8)}…
                        </span>
                      </div>
                    </td>
                    <td>
                      {log.old_status || log.new_status ? (
                        <div className="audit-transition-cell">
                          <span className="audit-status-tag audit-status-tag--old">
                            {log.old_status || '—'}
                          </span>
                          <span className="audit-transition-arrow" aria-hidden="true">→</span>
                          <span className="audit-status-tag audit-status-tag--new">
                            {log.new_status || '—'}
                          </span>
                        </div>
                      ) : (
                        <span className="audit-subtext">—</span>
                      )}
                    </td>
                    <td>
                      {log.reason ? (
                        <blockquote className="audit-reason-quote">
                          "{log.reason}"
                        </blockquote>
                      ) : (
                        <span className="audit-subtext">—</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="audit-details-btn"
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        aria-expanded={isExpanded}
                        aria-label={`Toggle details for audit entry ${log.id}`}
                      >
                        {isExpanded ? '▲' : '▼'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
