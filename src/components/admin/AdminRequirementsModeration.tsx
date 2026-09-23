import type { AdminRequirementRecord, RequirementStatus } from '../../services/requirements'

export interface AdminRequirementsModerationProps {
  requirements: AdminRequirementRecord[]
  loading: boolean
  error: string | null
  actionLoadingId: string | null
  statusFilter: 'all' | RequirementStatus
  onStatusFilterChange: (filter: 'all' | RequirementStatus) => void
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  expandedMatchesReqId: string | null
  onToggleMatchesExpand: (reqId: string) => void
  onRefresh: () => Promise<void>
  onStatusChange: (requirementId: string, newStatus: RequirementStatus) => Promise<void>
}

export function AdminRequirementsModeration({
  requirements,
  loading,
  error,
  actionLoadingId,
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchQueryChange,
  expandedMatchesReqId,
  onToggleMatchesExpand,
  onRefresh,
  onStatusChange,
}: AdminRequirementsModerationProps) {
  const filteredRequirements = requirements.filter((req) => {
    if (statusFilter !== 'all' && req.status !== statusFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      const titleMatch = req.title.toLowerCase().includes(q)
      const descMatch = req.description?.toLowerCase().includes(q) ?? false
      const custMatch = req.customer?.full_name?.toLowerCase().includes(q) ?? false
      const phoneMatch = req.customer?.phone?.includes(q) ?? false
      const addrMatch = req.address?.toLowerCase().includes(q) ?? false
      const cityMatch = req.city_name?.toLowerCase().includes(q) ?? false
      return titleMatch || descMatch || custMatch || phoneMatch || addrMatch || cityMatch
    }
    return true
  })

  return (
    <div className="admin-taxonomy-container">
      <div className="section-header" style={{ marginBottom: '16px' }}>
        <div>
          <p className="eyebrow">Customer Demand</p>
          <h2>Customer Requirements Oversight</h2>
          <p className="supply-intro">
            Monitor and moderate customer requirements submitted across Hosur, track vendor matching, and oversee lifecycle progress.
          </p>
        </div>
        <button
          type="button"
          className="secondary-button inline-button"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? 'Refreshing…' : '↻ Refresh Requirements'}
        </button>
      </div>

      {/* Quick Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid rgba(23,63,58,0.1)' }}>
          <span style={{ fontSize: '0.85rem', color: 'rgba(23,63,58,0.7)', fontWeight: 600 }}>Total Requirements</span>
          <h3 style={{ margin: '4px 0 0', fontSize: '1.8rem', color: '#173f3a' }}>{requirements.length}</h3>
        </div>
        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid rgba(23,63,58,0.1)' }}>
          <span style={{ fontSize: '0.85rem', color: '#0369a1', fontWeight: 600 }}>Open & Matching</span>
          <h3 style={{ margin: '4px 0 0', fontSize: '1.8rem', color: '#0369a1' }}>
            {requirements.filter((r) => r.status === 'open' || r.status === 'matching').length}
          </h3>
        </div>
        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid rgba(23,63,58,0.1)' }}>
          <span style={{ fontSize: '0.85rem', color: '#059669', fontWeight: 600 }}>Completed</span>
          <h3 style={{ margin: '4px 0 0', fontSize: '1.8rem', color: '#059669' }}>
            {requirements.filter((r) => r.status === 'completed').length}
          </h3>
        </div>
        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid rgba(23,63,58,0.1)' }}>
          <span style={{ fontSize: '0.85rem', color: '#dc2626', fontWeight: 600 }}>Cancelled / Expired</span>
          <h3 style={{ margin: '4px 0 0', fontSize: '1.8rem', color: '#dc2626' }}>
            {requirements.filter((r) => r.status === 'cancelled' || r.status === 'expired').length}
          </h3>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        <input
          type="search"
          placeholder="Search by requirement title, customer name/phone, city, or address..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="hero-search__input"
          style={{ width: '100%', maxWidth: '100%' }}
          aria-label="Search customer requirements"
        />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(23,63,58,0.7)' }}>Status:</span>
          {(['all', 'open', 'matching', 'quoted', 'accepted', 'completed', 'cancelled', 'expired'] as const).map((st) => (
            <button
              type="button"
              key={st}
              className={statusFilter === st ? 'category-pill active' : 'category-pill'}
              style={{ fontSize: '0.8rem', padding: '4px 10px' }}
              onClick={() => onStatusFilterChange(st)}
            >
              {st.charAt(0).toUpperCase() + st.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Requirements Content */}
      {loading ? (
        <div className="state-panel"><p>Loading customer requirements…</p></div>
      ) : error ? (
        <div className="state-panel error-state"><h3>Unable to load requirements</h3><p>{error}</p></div>
      ) : filteredRequirements.length === 0 ? (
        <div className="state-panel empty-state">
          <h3>No requirements match your filters</h3>
          <p>Try changing the status filter or clearing your search term.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <div className="admin-business-list">
            {filteredRequirements.map((req) => {
              const isActionLoading = actionLoadingId === req.id
              const isMatchesExpanded = expandedMatchesReqId === req.id

              return (
                <article
                  key={req.id}
                  className="owner-business-card admin-business-card"
                  style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span className="owner-card-label">Requirement</span>
                        <span className="business-tag">{req.category_name || 'General Category'}</span>
                        {req.subcategory_name && (
                          <span
                            className="business-tag"
                            style={{ backgroundColor: '#eff6ff', color: '#1e40af', borderColor: '#bfdbfe' }}
                          >
                            {req.subcategory_name}
                          </span>
                        )}
                        <span className="business-tag">{req.city_name || 'Hosur'}</span>
                        {req.quotes && req.quotes.length > 0 && (
                          <span
                            className="business-tag"
                            style={{ backgroundColor: '#fef3c7', color: '#92400e', borderColor: '#fde68a', fontWeight: 600 }}
                          >
                            {req.quotes.length} {req.quotes.length === 1 ? 'Quote' : 'Quotes'}
                          </span>
                        )}
                        <span
                          className="status-badge"
                          style={{
                            backgroundColor:
                              req.status === 'completed'
                                ? '#dcfce7'
                                : req.status === 'open' || req.status === 'matching'
                                ? '#e0f2fe'
                                : req.status === 'accepted' || req.status === 'quoted'
                                ? '#ede9fe'
                                : '#fee2e2',
                            color:
                              req.status === 'completed'
                                ? '#166534'
                                : req.status === 'open' || req.status === 'matching'
                                ? '#0369a1'
                                : req.status === 'accepted' || req.status === 'quoted'
                                ? '#6d28d9'
                                : '#991b1b',
                            fontWeight: 700,
                          }}
                        >
                          {req.status.toUpperCase()}
                        </span>
                      </div>
                      <h3 style={{ marginTop: '6px', marginBottom: '4px' }}>{req.title}</h3>
                      <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(23,63,58,0.75)' }}>
                        Posted by: <strong>{req.customer?.full_name || 'Registered Customer'}</strong>
                        {req.customer?.phone && (
                          <span>
                            {' '}• <a href={`tel:${req.customer.phone}`} style={{ color: '#17614d', fontWeight: 600 }}>{req.customer.phone}</a>
                          </span>
                        )}
                        <span>
                          {' '}• {new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </p>
                    </div>

                    {/* Moderation Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(23,63,58,0.7)' }}>
                        Status:
                        <select
                          value={req.status}
                          disabled={isActionLoading}
                          onChange={(e) => onStatusChange(req.id, e.target.value as RequirementStatus)}
                          style={{ marginLeft: '6px', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(23,63,58,0.2)' }}
                        >
                          <option value="open">Open</option>
                          <option value="matching">Matching</option>
                          <option value="quoted">Quoted</option>
                          <option value="accepted">Accepted</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="expired">Expired</option>
                        </select>
                      </label>
                    </div>
                  </div>

                  {req.description && (
                    <p style={{ margin: '4px 0', fontSize: '0.95rem', color: '#173f3a', whiteSpace: 'pre-line' }}>
                      {req.description}
                    </p>
                  )}

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.85rem', color: 'rgba(23,63,58,0.85)', background: 'rgba(24,59,52,0.03)', padding: '8px 12px', borderRadius: '6px' }}>
                    {(req.budget_min !== null || req.budget_max !== null) && (
                      <span>
                        <strong>Budget:</strong> ₹{req.budget_min?.toLocaleString('en-IN') ?? 0}
                        {req.budget_max ? ` – ₹${req.budget_max.toLocaleString('en-IN')}` : '+'}
                      </span>
                    )}
                    {req.required_date && (
                      <span><strong>Needed By:</strong> {new Date(req.required_date).toLocaleDateString('en-IN')}</span>
                    )}
                    {req.duration && <span><strong>Duration:</strong> {req.duration}</span>}
                    {req.address && <span><strong>Address:</strong> {req.address}</span>}
                    {req.quantity && <span><strong>Quantity:</strong> {req.quantity}</span>}
                  </div>

                  {/* Matched Vendors Accordion */}
                  <div style={{ borderTop: '1px solid rgba(24,59,52,0.08)', paddingTop: '8px' }}>
                    <button
                      type="button"
                      className="nav-link"
                      style={{ fontSize: '0.85rem', fontWeight: 600, padding: '4px 0' }}
                      onClick={() => onToggleMatchesExpand(req.id)}
                    >
                      {isMatchesExpanded ? '▼ Hide' : '▶ Show'} Matched Vendors ({req.matches?.length || 0})
                    </button>

                    {isMatchesExpanded && (
                      <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {(!req.matches || req.matches.length === 0) ? (
                          <p style={{ fontSize: '0.85rem', color: 'rgba(23,63,58,0.6)', margin: 0 }}>
                            No vendor businesses matched yet.
                          </p>
                        ) : (
                          req.matches.map((m) => (
                            <div
                              key={m.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                background: '#fff',
                                border: '1px solid rgba(23,63,58,0.1)',
                                fontSize: '0.85rem',
                                flexWrap: 'wrap',
                                gap: '8px',
                              }}
                            >
                              <div>
                                <strong>{m.business?.name || 'Local Business'}</strong>
                                <span style={{ marginLeft: '8px', color: '#0369a1', fontWeight: 600 }}>
                                  {m.match_score}% match
                                </span>
                                {m.business?.phone && (
                                  <span style={{ marginLeft: '8px', color: 'rgba(23,63,58,0.7)' }}>
                                    ({m.business.phone})
                                  </span>
                                )}
                              </div>
                              <span className="status-badge" style={{ fontSize: '0.75rem', padding: '2px 6px' }}>
                                Lead Status: {m.status}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
