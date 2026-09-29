import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  computeCRMAnalytics,
  updateOwnerLead,
  type LeadPriority,
  type LeadSourceType,
  type LeadStatus,
  type OwnerLeadRecord,
} from '../../services/ownerCrm'

export type LeadInboxProps = {
  leads: OwnerLeadRecord[]
  loading: boolean
  error: string | null
  onRefresh: () => void
}

const STATUS_LABELS: Record<LeadStatus, { label: string; color: string; bg: string }> = {
  new: { label: 'New Lead', color: '#1d4ed8', bg: '#dbeafe' },
  contacted: { label: 'Contacted', color: '#0369a1', bg: '#e0f2fe' },
  qualified: { label: 'Qualified', color: '#6d28d9', bg: '#ede9fe' },
  follow_up: { label: 'Follow Up', color: '#b45309', bg: '#fef3c7' },
  converted: { label: 'Converted', color: '#15803d', bg: '#dcfce7' },
  closed: { label: 'Closed', color: '#475569', bg: '#f1f5f9' },
  lost: { label: 'Lost', color: '#991b1b', bg: '#fee2e2' },
}

const SOURCE_LABELS: Record<LeadSourceType, { label: string; icon: string }> = {
  direct_message: { label: 'Direct Chat', icon: '💬' },
  quote: { label: 'Quotation', icon: '📝' },
  phone_click: { label: 'Phone Call', icon: '📞' },
  whatsapp_click: { label: 'WhatsApp', icon: '📱' },
  requirement_match: { label: 'Matched RFQ', icon: '🎯' },
}

export function LeadInbox({ leads, loading, error, onRefresh }: LeadInboxProps) {
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all')
  const [sourceFilter, setSourceFilter] = useState<LeadSourceType | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Selected lead for detail/follow-up drawer
  const [activeLead, setActiveLead] = useState<OwnerLeadRecord | null>(null)
  const [editingNotes, setEditingNotes] = useState('')
  const [editingStatus, setEditingStatus] = useState<LeadStatus>('new')
  const [editingPriority, setEditingPriority] = useState<LeadPriority>('medium')
  const [followUpDate, setFollowUpDate] = useState('')
  const [savingLead, setSavingLead] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const analytics = computeCRMAnalytics(leads)

  const filteredLeads = leads.filter((l) => {
    if (statusFilter !== 'all' && l.status !== statusFilter) return false
    if (sourceFilter !== 'all' && l.source_type !== sourceFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchTitle = l.title.toLowerCase().includes(q)
      const matchContact = l.contact_name_snapshot?.toLowerCase().includes(q) ?? false
      const matchPhone = l.contact_phone_snapshot?.includes(q) ?? false
      const matchDesc = l.description?.toLowerCase().includes(q) ?? false
      return matchTitle || matchContact || matchPhone || matchDesc
    }
    return true
  })

  function handleSelectLead(lead: OwnerLeadRecord) {
    setActiveLead(lead)
    setEditingNotes(lead.notes || '')
    setEditingStatus(lead.status)
    setEditingPriority(lead.priority)
    setFollowUpDate(lead.next_follow_up_at ? lead.next_follow_up_at.substring(0, 16) : '')
    setSaveSuccess(false)
  }

  async function handleSaveLeadChanges() {
    if (!activeLead) return
    try {
      setSavingLead(true)
      await updateOwnerLead({
        leadId: activeLead.id,
        status: editingStatus,
        priority: editingPriority,
        notes: editingNotes.trim() || undefined,
        nextFollowUpAt: followUpDate ? new Date(followUpDate).toISOString() : null,
      })
      setSaveSuccess(true)
      onRefresh()
      setTimeout(() => setSaveSuccess(false), 2500)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update lead.')
    } finally {
      setSavingLead(false)
    }
  }

  return (
    <div className="owner-crm-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. CRM Pipeline Analytics Cards */}
      <section className="admin-reports-stats" aria-label="CRM Lead Metrics">
        <div className="admin-report-stat-card">
          <span className="stat-value">{analytics.total_leads}</span>
          <span className="stat-label">Total Leads</span>
        </div>
        <div className="admin-report-stat-card">
          <span className="stat-value" style={{ color: '#1d4ed8' }}>{analytics.new_leads}</span>
          <span className="stat-label">New Inquiries</span>
        </div>
        <div className="admin-report-stat-card">
          <span className="stat-value" style={{ color: '#b45309' }}>{analytics.follow_up_leads}</span>
          <span className="stat-label">Needs Follow-Up</span>
        </div>
        <div className="admin-report-stat-card">
          <span className="stat-value" style={{ color: '#15803d' }}>{analytics.converted_leads}</span>
          <span className="stat-label">Converted ({analytics.conversion_rate}%)</span>
        </div>
      </section>

      {/* 2. Filter & Search Toolbar */}
      <div className="admin-reports-filters" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          {/* Status Tabs */}
          {(['all', 'new', 'contacted', 'follow_up', 'converted', 'closed'] as const).map((st) => (
            <button
              key={st}
              type="button"
              className={`abm-filter-btn ${statusFilter === st ? 'abm-filter-btn--active' : ''}`}
              onClick={() => setStatusFilter(st)}
              style={{ fontSize: '0.82rem', padding: '6px 12px' }}
            >
              {st === 'all' ? 'All Status' : STATUS_LABELS[st].label}
              <span className="abm-filter-count">
                {st === 'all' ? leads.length : leads.filter((l) => l.status === st).length}
              </span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            className="report-select"
            style={{ width: 'auto', fontSize: '0.85rem', padding: '6px 10px' }}
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as LeadSourceType | 'all')}
            aria-label="Filter by lead source"
          >
            <option value="all">All Sources</option>
            <option value="direct_message">💬 Direct Chat</option>
            <option value="quote">📝 Quotation</option>
            <option value="phone_click">📞 Phone Call</option>
            <option value="whatsapp_click">📱 WhatsApp</option>
            <option value="requirement_match">🎯 Matched RFQ</option>
          </select>

          <input
            type="search"
            className="abm-search-input"
            style={{ minWidth: '200px' }}
            placeholder="Search leads…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="state-panel error-state" role="alert">
          <p>{error}</p>
        </div>
      )}

      {loading && leads.length === 0 && (
        <div className="state-panel" style={{ padding: '40px' }}>
          <span className="spinner" aria-hidden="true" />
          <p>Loading CRM lead inbox…</p>
        </div>
      )}

      {!loading && filteredLeads.length === 0 && (
        <div className="state-panel" style={{ textAlign: 'center', padding: '48px 16px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📬</div>
          <h3 style={{ margin: '0 0 6px', color: '#0f172a' }}>No leads found</h3>
          <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0 }}>
            {searchQuery || statusFilter !== 'all' || sourceFilter !== 'all'
              ? 'Try adjusting your filters or search criteria.'
              : 'When customers message, call, or match with your listings, they will automatically appear here.'}
          </p>
        </div>
      )}

      {/* 3. Lead Cards Stream */}
      {!loading && filteredLeads.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredLeads.map((lead) => {
            const stBadge = STATUS_LABELS[lead.status]
            const srcMeta = SOURCE_LABELS[lead.source_type]
            return (
              <div
                key={lead.id}
                onClick={() => handleSelectLead(lead)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleSelectLead(lead)
                  }
                }}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  transition: 'all 0.15s ease',
                }}
                className="inbox-item-card"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem',
                      flexShrink: 0,
                    }}
                  >
                    {srcMeta.icon}
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '0.98rem', color: '#0f172a' }}>{lead.title}</strong>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '999px',
                          background: stBadge.bg,
                          color: stBadge.color,
                        }}
                      >
                        {stBadge.label}
                      </span>
                      {lead.priority === 'high' && (
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#dc2626' }}>🔥 High Priority</span>
                      )}
                    </div>

                    <p style={{ margin: '0 0 4px', fontSize: '0.82rem', color: '#64748b' }}>
                      Target: <strong>{lead.entity_name}</strong> • Source: {srcMeta.label}
                      {lead.contact_name_snapshot ? ` • Contact: ${lead.contact_name_snapshot}` : ''}
                    </p>

                    {lead.description && (
                      <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {lead.description}
                      </p>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    {new Date(lead.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                  {lead.next_follow_up_at && (
                    <span style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 600 }}>
                      ⏰ Follow-up: {new Date(lead.next_follow_up_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 4. Lead Detail & Follow-up Drawer */}
      {activeLead && (
        <div className="qd-drawer-overlay" role="dialog" aria-modal="true" aria-labelledby="crm-detail-title">
          <div className="qd-drawer-backdrop" onClick={() => setActiveLead(null)} aria-hidden="true" />

          <div className="qd-drawer-panel" style={{ maxWidth: '520px' }}>
            <div className="qd-drawer-header">
              <div className="qd-header-info">
                <span className="qd-header-eyebrow">
                  {SOURCE_LABELS[activeLead.source_type].icon} {SOURCE_LABELS[activeLead.source_type].label}
                </span>
                <h2 id="crm-detail-title" className="qd-header-title">{activeLead.title}</h2>
                <p className="qd-header-parties">
                  <span>Target: <strong>{activeLead.entity_name}</strong></span>
                </p>
              </div>
              <button type="button" className="qd-close-btn" onClick={() => setActiveLead(null)} aria-label="Close drawer">
                ✕
              </button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {saveSuccess && (
                <div style={{ padding: '10px 14px', background: '#ecfdf5', color: '#065f46', borderRadius: '8px', fontSize: '0.85rem' }}>
                  ✓ Lead details and follow-up saved successfully.
                </div>
              )}

              {/* Contact Snapshot */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: '0.85rem', color: '#334155' }}>Customer Contact</h4>
                <p style={{ margin: '0 0 4px', fontSize: '0.9rem', fontWeight: 600 }}>
                  👤 {activeLead.contact_name_snapshot || 'Anonymous / Unnamed Customer'}
                </p>
                {activeLead.contact_phone_snapshot && (
                  <p style={{ margin: '0 0 4px', fontSize: '0.85rem', color: '#475569' }}>
                    📞 Phone: <a href={`tel:${activeLead.contact_phone_snapshot}`}>{activeLead.contact_phone_snapshot}</a>
                  </p>
                )}
                {activeLead.contact_email_snapshot && (
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>
                    ✉️ Email: <a href={`mailto:${activeLead.contact_email_snapshot}`}>{activeLead.contact_email_snapshot}</a>
                  </p>
                )}
              </div>

              {/* Status & Priority Controls */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="report-form-group">
                  <label htmlFor="crm-status">Pipeline Status</label>
                  <select
                    id="crm-status"
                    className="report-select"
                    value={editingStatus}
                    onChange={(e) => setEditingStatus(e.target.value as LeadStatus)}
                  >
                    <option value="new">New Lead</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="follow_up">Needs Follow Up</option>
                    <option value="converted">Converted</option>
                    <option value="closed">Closed</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>

                <div className="report-form-group">
                  <label htmlFor="crm-priority">Priority</label>
                  <select
                    id="crm-priority"
                    className="report-select"
                    value={editingPriority}
                    onChange={(e) => setEditingPriority(e.target.value as LeadPriority)}
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
              </div>

              {/* Next Follow-up Date */}
              <div className="report-form-group">
                <label htmlFor="crm-followup">Schedule Next Follow-Up</label>
                <input
                  id="crm-followup"
                  type="datetime-local"
                  className="report-select"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                />
              </div>

              {/* Notes */}
              <div className="report-form-group">
                <label htmlFor="crm-notes">Private Notes &amp; Follow-up Log</label>
                <textarea
                  id="crm-notes"
                  className="report-textarea"
                  rows={4}
                  placeholder="Record customer preferences, budget discussions, or next action items…"
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  maxLength={4000}
                />
              </div>

              {/* Deep Links into Existing Workflows */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {activeLead.source_type === 'direct_message' && activeLead.source_id && (
                  <Link
                    to={`/messages?conversation=${activeLead.source_id}`}
                    className="primary-button inline-button"
                    style={{ fontSize: '0.85rem' }}
                  >
                    💬 Open Conversation
                  </Link>
                )}
                {activeLead.source_type === 'quote' && (
                  <Link
                    to="/owner?tab=leads"
                    className="secondary-button"
                    style={{ fontSize: '0.85rem' }}
                  >
                    📝 View Quotation Details
                  </Link>
                )}
              </div>
            </div>

            <div className="report-modal-footer">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setActiveLead(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="primary-button"
                disabled={savingLead}
                onClick={() => void handleSaveLeadChanges()}
              >
                {savingLead ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
