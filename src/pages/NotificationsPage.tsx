import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { useAuth } from '../hooks/useAuth'
import {
  clearAllNotifications,
  deleteNotification,
  getMyNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  subscribeToUserNotifications,
  type NotificationRecord,
  type NotificationType,
} from '../services/notifications'

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'Just now'
  const minutes = Math.floor(diffInSeconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getNotificationTypeMeta(type: NotificationType): { icon: string; label: string; badgeClass: string } {
  switch (type) {
    case 'new_quote':
      return { icon: '💰', label: 'Quotation', badgeClass: 'notif-badge-quote' }
    case 'quote_accepted':
      return { icon: '🎉', label: 'Quote Accepted', badgeClass: 'notif-badge-accepted' }
    case 'quote_rejected':
      return { icon: '📋', label: 'Quote Declined', badgeClass: 'notif-badge-rejected' }
    case 'requirement_status':
      return { icon: '⚡', label: 'Requirement Update', badgeClass: 'notif-badge-status' }
    case 'new_lead':
      return { icon: '🎯', label: 'New Lead', badgeClass: 'notif-badge-lead' }
    case 'system':
    default:
      return { icon: '🔔', label: 'System Notice', badgeClass: 'notif-badge-system' }
  }
}

type FilterView = 'all' | 'unread' | 'read'

export function NotificationsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const userId = user?.id

  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [filter, setFilter] = useState<FilterView>('all')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)

  async function handleReload() {
    try {
      setLoading(true)
      setError(null)
      const [list, count] = await Promise.all([
        getMyNotifications(50),
        getUnreadNotificationCount(),
      ])
      setNotifications(list)
      setUnreadCount(count)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to load notifications. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // Load notifications initially
  useEffect(() => {
    let active = true

    async function init() {
      try {
        const [list, count] = await Promise.all([
          getMyNotifications(50),
          getUnreadNotificationCount(),
        ])
        if (active) {
          setNotifications(list)
          setUnreadCount(count)
          setError(null)
        }
      } catch (err) {
        if (active) {
          const msg = err instanceof Error ? err.message : 'Unable to load notifications. Please try again.'
          setError(msg)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void init()

    return () => {
      active = false
    }
  }, [userId])

  // Realtime subscription setup
  useEffect(() => {
    if (!userId) return

    let active = true

    const unsubscribe = subscribeToUserNotifications(userId, (newNotification) => {
      if (!active) return

      if (!newNotification.is_read) {
        setUnreadCount((prev) => prev + 1)
      }

      setNotifications((prev) => {
        if (prev.some((n) => n.id === newNotification.id)) {
          return prev
        }
        return [newNotification, ...prev]
      })
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [userId])

  async function handleNotificationClick(item: NotificationRecord) {
    if (!item.is_read) {
      try {
        await markNotificationAsRead(item.id)
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)),
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      } catch {
        // Continue even if read update fails
      }
    }

    if (item.link) {
      navigate(item.link)
    }
  }

  async function handleMarkSingleRead(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    try {
      setActionInProgress(id)
      await markNotificationAsRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update notification.')
    } finally {
      setActionInProgress(null)
    }
  }

  async function handleMarkAllRead() {
    try {
      setActionInProgress('all-read')
      await markAllNotificationsAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark all as read.')
    } finally {
      setActionInProgress(null)
    }
  }

  async function handleDeleteSingle(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    try {
      setActionInProgress(id)
      await deleteNotification(id)
      const target = notifications.find((n) => n.id === id)
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      if (target && !target.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete notification.')
    } finally {
      setActionInProgress(null)
    }
  }

  async function handleClearAll() {
    if (!window.confirm('Are you sure you want to clear all notifications from your communication center?')) {
      return
    }

    try {
      setActionInProgress('clear-all')
      await clearAllNotifications()
      setNotifications([])
      setUnreadCount(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear all notifications.')
    } finally {
      setActionInProgress(null)
    }
  }

  // Filter items in memory
  const displayedNotifications = notifications.filter((item) => {
    if (filter === 'unread') return !item.is_read
    if (filter === 'read') return item.is_read
    return true
  })

  const readCount = Math.max(0, notifications.length - unreadCount)
  const firstItem = notifications[0]
  const latestActivity = firstItem ? formatRelativeTime(firstItem.created_at) : 'None'

  return (
    <>
      <Header />
      <main className="page-section notif-page-container" aria-label="Notification Communication Center">
        {/* 1. Premium Page Header */}
        <header className="notif-page-header">
          <div className="notif-header-content">
            <div className="notif-eyebrow-row">
              <span className="notif-eyebrow-badge">
                <span className="notif-eyebrow-dot" aria-hidden="true" />
                Communication Center
              </span>
              <span
                className={`notif-header-unread-badge ${unreadCount > 0 ? 'has-unread' : 'zero-unread'}`}
                role="status"
                aria-live="polite"
              >
                {unreadCount > 0
                  ? `${unreadCount} unread ${unreadCount === 1 ? 'notification' : 'notifications'}`
                  : 'All caught up'}
              </span>
            </div>

            <h1 className="notif-page-title">Notifications</h1>
            <p className="notif-page-subtitle">
              Stay updated on your requirements, quotations, messages and marketplace activity.
            </p>
          </div>

          <div className="notif-header-actions">
            {unreadCount > 0 && (
              <button
                type="button"
                className="secondary-button notif-action-btn"
                onClick={handleMarkAllRead}
                disabled={actionInProgress === 'all-read'}
                aria-label="Mark all notifications as read"
              >
                {actionInProgress === 'all-read' ? 'Updating…' : '✓ Mark all as read'}
              </button>
            )}
            {notifications.length > 0 && (
              <button
                type="button"
                className="secondary-button notif-action-btn notif-clear-btn"
                onClick={handleClearAll}
                disabled={actionInProgress === 'clear-all'}
                aria-label="Clear all notifications"
              >
                {actionInProgress === 'clear-all' ? 'Clearing…' : 'Clear all'}
              </button>
            )}
          </div>
        </header>

        {/* 2. Notification Summary Area */}
        <section className="notif-summary-grid" aria-label="Notification Summary">
          <div className="notif-summary-card">
            <span className="notif-summary-label">Total Notifications</span>
            <span className="notif-summary-value">{notifications.length}</span>
            <span className="notif-summary-caption">Marketplace alerts recorded</span>
          </div>

          <div className="notif-summary-card">
            <span className="notif-summary-label">Unread Notifications</span>
            <span className={`notif-summary-value ${unreadCount > 0 ? 'unread-accent' : ''}`}>
              {unreadCount}
            </span>
            <span className="notif-summary-caption">Require your attention</span>
          </div>

          <div className="notif-summary-card">
            <span className="notif-summary-label">Latest Activity</span>
            <span className="notif-summary-value notif-activity-value">{latestActivity}</span>
            <span className="notif-summary-caption">Realtime marketplace stream</span>
          </div>
        </section>

        {/* 3. Filter / View Controls */}
        <nav className="notif-filters-toolbar" aria-label="Notification filters">
          <div className="notif-filter-pills" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'all'}
              aria-pressed={filter === 'all'}
              className={`notif-filter-pill ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All <span className="notif-pill-count">{notifications.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'unread'}
              aria-pressed={filter === 'unread'}
              className={`notif-filter-pill ${filter === 'unread' ? 'active' : ''}`}
              onClick={() => setFilter('unread')}
            >
              Unread <span className="notif-pill-count">{unreadCount}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'read'}
              aria-pressed={filter === 'read'}
              className={`notif-filter-pill ${filter === 'read' ? 'active' : ''}`}
              onClick={() => setFilter('read')}
            >
              Read <span className="notif-pill-count">{readCount}</span>
            </button>
          </div>
        </nav>

        {/* 10. Error State */}
        {error && (
          <div className="notif-error-banner" role="alert">
            <div className="notif-error-icon">⚠️</div>
            <div className="notif-error-text">
              <h3>Notifications couldn't be loaded</h3>
              <p>{error}</p>
            </div>
            <button
              type="button"
              className="primary-button inline-button notif-error-retry-btn"
              onClick={handleReload}
            >
              Try Again
            </button>
          </div>
        )}

        {/* 9. Loading State Skeletons */}
        {loading && (
          <div className="notif-skeleton-list" aria-busy="true" aria-live="polite">
            {[1, 2, 3].map((n) => (
              <div key={n} className="notif-skeleton-card">
                <div className="notif-skeleton-avatar" />
                <div className="notif-skeleton-content">
                  <div className="notif-skeleton-row">
                    <div className="notif-skeleton-pill" />
                    <div className="notif-skeleton-time" />
                  </div>
                  <div className="notif-skeleton-title" />
                  <div className="notif-skeleton-message" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 8. Empty States & 4. Notification List */}
        {!loading && (
          <>
            {displayedNotifications.length === 0 ? (
              <div className="notif-empty-panel">
                <div className="notif-empty-icon-circle" aria-hidden="true">
                  ✓
                </div>
                {filter === 'all' && (
                  <>
                    <h2 className="notif-empty-heading">You're all caught up</h2>
                    <p className="notif-empty-text">
                      New activity and updates will appear here.
                    </p>
                    <div className="notif-empty-actions">
                      <Link to="/" className="primary-button inline-button">
                        Browse Marketplace
                      </Link>
                      <Link to="/my-requirements" className="secondary-button inline-button">
                        View My Requirements
                      </Link>
                    </div>
                  </>
                )}
                {filter === 'unread' && (
                  <>
                    <h2 className="notif-empty-heading">No unread notifications</h2>
                    <p className="notif-empty-text">
                      You have reviewed all incoming notifications and updates.
                    </p>
                    <button
                      type="button"
                      className="secondary-button inline-button notif-reset-filter-btn"
                      onClick={() => setFilter('all')}
                    >
                      View all notifications ({notifications.length})
                    </button>
                  </>
                )}
                {filter === 'read' && (
                  <>
                    <h2 className="notif-empty-heading">No read notifications</h2>
                    <p className="notif-empty-text">
                      You haven't archived or read any notifications yet.
                    </p>
                    <button
                      type="button"
                      className="secondary-button inline-button notif-reset-filter-btn"
                      onClick={() => setFilter('all')}
                    >
                      View all notifications ({notifications.length})
                    </button>
                  </>
                )}
              </div>
            ) : (
              <ul className="notif-feed-list" aria-label="Notification list">
                {displayedNotifications.map((item) => {
                  const meta = getNotificationTypeMeta(item.type)
                  const isUnread = !item.is_read

                  return (
                    <li
                      key={item.id}
                      className={`notif-card-item ${isUnread ? 'is-unread' : 'is-read'}`}
                      tabIndex={0}
                      role="article"
                      aria-label={`${isUnread ? 'Unread notification: ' : 'Notification: '}${item.title}`}
                      onClick={() => handleNotificationClick(item)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          void handleNotificationClick(item)
                        }
                      }}
                    >
                      {/* Left: Icon / Indicator */}
                      <div className="notif-card-left">
                        <div className="notif-type-icon-circle" aria-hidden="true">
                          {meta.icon}
                        </div>
                        {isUnread && (
                          <span
                            className="notif-unread-indicator-dot"
                            title="Unread notification"
                            aria-label="Unread indicator"
                          />
                        )}
                      </div>

                      {/* Middle: Content */}
                      <div className="notif-card-main">
                        <div className="notif-card-meta-line">
                          <span className={`notif-type-tag ${meta.badgeClass}`}>
                            {meta.label}
                          </span>
                          <time
                            className="notif-timestamp"
                            dateTime={item.created_at}
                            title={new Date(item.created_at).toLocaleString('en-IN')}
                          >
                            {formatRelativeTime(item.created_at)}
                          </time>
                        </div>

                        <h2 className="notif-card-title">{item.title}</h2>
                        <p className="notif-card-message">{item.message}</p>

                        {item.link && (
                          <div className="notif-card-link-preview">
                            <span className="notif-link-text">
                              Open related item &rarr;
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="notif-card-actions">
                        {isUnread && (
                          <button
                            type="button"
                            className="notif-card-action-btn notif-mark-read-btn"
                            onClick={(e) => handleMarkSingleRead(e, item.id)}
                            disabled={actionInProgress === item.id}
                            title="Mark as read"
                            aria-label={`Mark "${item.title}" as read`}
                          >
                            ✓
                          </button>
                        )}
                        <button
                          type="button"
                          className="notif-card-action-btn notif-delete-btn"
                          onClick={(e) => handleDeleteSingle(e, item.id)}
                          disabled={actionInProgress === item.id}
                          title="Delete notification"
                          aria-label={`Delete notification "${item.title}"`}
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        )}
      </main>
    </>
  )
}
