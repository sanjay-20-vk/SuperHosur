import type { AdminUserRecord, UserRole } from '../../services/users'

export interface AdminUserManagementProps {
  users: AdminUserRecord[]
  loading: boolean
  error: string | null
  actionLoadingId: string | null
  roleFilter: 'all' | UserRole
  onRoleFilterChange: (filter: 'all' | UserRole) => void
  statusFilter: 'all' | 'active' | 'suspended'
  onStatusFilterChange: (filter: 'all' | 'active' | 'suspended') => void
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  onRefresh: () => Promise<void>
  onRoleChange: (userId: string, newRole: UserRole) => Promise<void>
  onActiveToggle: (user: AdminUserRecord) => Promise<void>
}

export function AdminUserManagement({
  users,
  loading,
  error,
  actionLoadingId,
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchQueryChange,
  onRefresh,
  onRoleChange,
  onActiveToggle,
}: AdminUserManagementProps) {
  const filteredUsers = users.filter((user) => {
    if (roleFilter !== 'all' && user.role !== roleFilter) return false
    if (statusFilter === 'active' && !user.active) return false
    if (statusFilter === 'suspended' && user.active) return false
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      const nameMatch = user.full_name?.toLowerCase().includes(q) ?? false
      const emailMatch = user.email?.toLowerCase().includes(q) ?? false
      const phoneMatch = user.phone?.includes(q) ?? false
      return nameMatch || emailMatch || phoneMatch
    }
    return true
  })

  return (
    <div className="admin-taxonomy-container">
      <div className="section-header" style={{ marginBottom: '16px' }}>
        <div>
          <p className="eyebrow">Platform Identity</p>
          <h2>Users & Profiles Oversight</h2>
          <p className="supply-intro">
            Audit platform users, manage user roles (customer, vendor, admin), and control account activation / suspension.
          </p>
        </div>
        <button
          type="button"
          className="secondary-button inline-button"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? 'Refreshing…' : '↻ Refresh Users'}
        </button>
      </div>

      {/* Quick Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid rgba(23,63,58,0.1)' }}>
          <span style={{ fontSize: '0.85rem', color: 'rgba(23,63,58,0.7)', fontWeight: 600 }}>Total Accounts</span>
          <h3 style={{ margin: '4px 0 0', fontSize: '1.8rem', color: '#173f3a' }}>{users.length}</h3>
        </div>
        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid rgba(23,63,58,0.1)' }}>
          <span style={{ fontSize: '0.85rem', color: '#17614d', fontWeight: 600 }}>Customers</span>
          <h3 style={{ margin: '4px 0 0', fontSize: '1.8rem', color: '#17614d' }}>
            {users.filter((u) => u.role === 'customer').length}
          </h3>
        </div>
        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid rgba(23,63,58,0.1)' }}>
          <span style={{ fontSize: '0.85rem', color: '#0369a1', fontWeight: 600 }}>Vendors / Owners</span>
          <h3 style={{ margin: '4px 0 0', fontSize: '1.8rem', color: '#0369a1' }}>
            {users.filter((u) => u.role === 'vendor').length}
          </h3>
        </div>
        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid rgba(23,63,58,0.1)' }}>
          <span style={{ fontSize: '0.85rem', color: '#6d28d9', fontWeight: 600 }}>Administrators</span>
          <h3 style={{ margin: '4px 0 0', fontSize: '1.8rem', color: '#6d28d9' }}>
            {users.filter((u) => u.role === 'admin').length}
          </h3>
        </div>
        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid rgba(23,63,58,0.1)' }}>
          <span style={{ fontSize: '0.85rem', color: '#dc2626', fontWeight: 600 }}>Suspended</span>
          <h3 style={{ margin: '4px 0 0', fontSize: '1.8rem', color: '#dc2626' }}>
            {users.filter((u) => !u.active).length}
          </h3>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        <input
          type="search"
          placeholder="Search users by name, email, or phone..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="hero-search__input"
          style={{ width: '100%', maxWidth: '100%' }}
          aria-label="Search users"
        />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(23,63,58,0.7)' }}>Role:</span>
            {(['all', 'customer', 'vendor', 'admin'] as const).map((r) => (
              <button
                type="button"
                key={r}
                className={roleFilter === r ? 'category-pill active' : 'category-pill'}
                style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                onClick={() => onRoleFilterChange(r)}
              >
                {r === 'all' ? 'All Roles' : r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(23,63,58,0.7)' }}>Status:</span>
            {(['all', 'active', 'suspended'] as const).map((s) => (
              <button
                type="button"
                key={s}
                className={statusFilter === s ? 'category-pill active' : 'category-pill'}
                style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                onClick={() => onStatusFilterChange(s)}
              >
                {s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Users List */}
      {loading ? (
        <div className="state-panel"><p>Loading users…</p></div>
      ) : error ? (
        <div className="state-panel error-state"><h3>Unable to load users</h3><p>{error}</p></div>
      ) : filteredUsers.length === 0 ? (
        <div className="state-panel empty-state">
          <h3>No users match your filters</h3>
          <p>Try adjusting your search term or role filter.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <div className="admin-business-list">
            {filteredUsers.map((user) => {
              const isActionLoading = actionLoadingId === user.id

              return (
                <article
                  key={user.id}
                  className="owner-business-card admin-business-card"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0 }}>{user.full_name || 'Unnamed User'}</h3>
                      <span
                        className="status-badge"
                        style={{
                          backgroundColor:
                            user.role === 'admin'
                              ? '#ede9fe'
                              : user.role === 'vendor'
                              ? '#e0f2fe'
                              : '#f1f5f9',
                          color:
                            user.role === 'admin'
                              ? '#6d28d9'
                              : user.role === 'vendor'
                              ? '#0369a1'
                              : '#475569',
                          fontWeight: 700,
                        }}
                      >
                        {user.role.toUpperCase()}
                      </span>
                      <span
                        className="status-badge"
                        style={{
                          backgroundColor: user.active ? '#dcfce7' : '#fee2e2',
                          color: user.active ? '#166534' : '#991b1b',
                          fontWeight: 600,
                        }}
                      >
                        {user.active ? 'ACTIVE' : 'SUSPENDED'}
                      </span>
                    </div>
                    <div
                      style={{
                        marginTop: '4px',
                        fontSize: '0.875rem',
                        color: 'rgba(23,63,58,0.75)',
                        display: 'flex',
                        gap: '12px',
                        flexWrap: 'wrap',
                      }}
                    >
                      {user.email && <span><strong>Email:</strong> {user.email}</span>}
                      {user.phone && (
                        <span>
                          <strong>Phone:</strong>{' '}
                          <a href={`tel:${user.phone}`} style={{ color: '#17614d' }}>
                            {user.phone}
                          </a>
                        </span>
                      )}
                      <span>
                        <strong>Joined:</strong>{' '}
                        {new Date(user.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(23,63,58,0.7)' }}>
                      Role:
                      <select
                        value={user.role}
                        disabled={isActionLoading}
                        onChange={(e) => onRoleChange(user.id, e.target.value as UserRole)}
                        style={{
                          marginLeft: '6px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid rgba(23,63,58,0.2)',
                        }}
                      >
                        <option value="customer">Customer</option>
                        <option value="vendor">Vendor</option>
                        <option value="admin">Admin</option>
                      </select>
                    </label>

                    <button
                      type="button"
                      className={user.active ? 'nav-link danger-button' : 'primary-button inline-button'}
                      disabled={isActionLoading}
                      onClick={() => onActiveToggle(user)}
                      style={{ fontSize: '0.85rem' }}
                    >
                      {isActionLoading ? 'Updating…' : user.active ? 'Suspend Account' : 'Reactivate Account'}
                    </button>
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
