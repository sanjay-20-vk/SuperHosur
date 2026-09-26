import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  clearAllNotifications,
  deleteNotification,
  getMyNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  subscribeToUserNotifications,
  type ModerationNotificationData,
  type NotificationRecord,
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
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function getNotificationTypeIcon(
  type: NotificationRecord['type'],
  data?: ModerationNotificationData,
) {
  if (type === 'system' && data?.action) {
    if (data.action === 'approved') return '🎉'
    if (data.action === 'republished') return '🚀'
    if (data.action === 'rejected') return '⚠️'
  }
  switch (type) {
    case 'new_quote':
      return '💰'
    case 'quote_accepted':
      return '🎉'
    case 'quote_rejected':
      return '📋'
    case 'quote_withdrawn':
      return '↩️'
    case 'requirement_status':
      return '⚡'
    case 'new_lead':
      return '🎯'
    default:
      return '🔔'
  }
}

export function NotificationBell() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const userId = user?.id

  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  async function loadNotifications() {
    try {
      setLoading(true)
      const [list, count] = await Promise.all([
        getMyNotifications(40),
        getUnreadNotificationCount(),
      ])
      setNotifications(list)
      setUnreadCount(count)
    } catch {
      // Non-fatal
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!userId) return

    let active = true

    async function fetchInitialCount() {
      try {
        const count = await getUnreadNotificationCount()
        if (active) {
          setUnreadCount(count)
        }
      } catch {
        // Non-fatal
      }
    }

    void fetchInitialCount()

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

  function handleToggleDropdown() {
    const nextOpen = !isOpen
    setIsOpen(nextOpen)
    if (nextOpen) {
      void loadNotifications()
    }
  }

  // Outside click and Escape key listeners
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  async function handleNotificationClick(notification: NotificationRecord) {
    if (!notification.is_read) {
      try {
        await markNotificationAsRead(notification.id)
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)),
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      } catch {
        // Continue navigation
      }
    }

    setIsOpen(false)
    if (notification.link) {
      navigate(notification.link)
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch {
      // Non-fatal
    }
  }

  async function handleDelete(event: React.MouseEvent, notificationId: string) {
    event.stopPropagation()
    try {
      await deleteNotification(notificationId)
      const target = notifications.find((n) => n.id === notificationId)
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
      if (target && !target.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch {
      // Non-fatal
    }
  }

  async function handleClearAll() {
    if (!window.confirm('Clear all notifications?')) return
    try {
      await clearAllNotifications()
      setNotifications([])
      setUnreadCount(0)
    } catch {
      // Non-fatal
    }
  }

  const displayedNotifications =
    filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications

  return (
    <div className="notification-wrapper" ref={dropdownRef}>
      <button
        type="button"
        className="notification-trigger"
        onClick={handleToggleDropdown}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
      >
        <svg
          className="bell-icon"
          viewBox="0 0 24 24"
          width="20"
          height="20"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-popover" role="dialog" aria-label="Notifications panel">
          {/* Header */}
          <div className="notification-header">
            <div className="notification-title-row">
              <h3>Notifications</h3>
              {unreadCount > 0 && (
                <span className="notification-unread-count">
                  {unreadCount} unread
                </span>
              )}
            </div>

            {notifications.some((n) => !n.is_read) && (
              <button
                type="button"
                className="notification-text-btn"
                onClick={handleMarkAllRead}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="notification-filters">
            <button
              type="button"
              className={`notification-filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              className={`notification-filter-btn ${filter === 'unread' ? 'active' : ''}`}
              onClick={() => setFilter('unread')}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* List Content */}
          <div className="notification-list">
            {loading ? (
              <div className="notification-empty">Loading notifications…</div>
            ) : displayedNotifications.length === 0 ? (
              <div className="notification-empty">
                <p style={{ margin: 0, fontWeight: 600 }}>No notifications</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  {filter === 'unread'
                    ? "You've read all your notifications!"
                    : 'When you receive quotes or updates, they will appear here.'}
                </p>
              </div>
            ) : (
              displayedNotifications.map((item) => (
                <div
                  key={item.id}
                  className={`notification-item ${item.is_read ? 'read' : 'unread'}`}
                  onClick={() => handleNotificationClick(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleNotificationClick(item)
                    }
                  }}
                >
                  <div className="notification-icon-wrapper">
                    <span className="notification-type-emoji">
                      {getNotificationTypeIcon(item.type, item.data)}
                    </span>
                  </div>

                  <div className="notification-body">
                    <div className="notification-top-line">
                      <strong className="notification-item-title">{item.title}</strong>
                      <span className="notification-time">
                        {formatRelativeTime(item.created_at)}
                      </span>
                    </div>

                    <p className="notification-message">{item.message}</p>
                  </div>

                  <div className="notification-actions-col">
                    {!item.is_read && <span className="unread-dot" title="Unread" />}
                    <button
                      type="button"
                      className="notification-dismiss-btn"
                      onClick={(e) => handleDelete(e, item.id)}
                      title="Dismiss notification"
                      aria-label="Dismiss notification"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="notification-footer">
            <Link
              to="/notifications"
              className="notification-view-all-link"
              onClick={() => setIsOpen(false)}
            >
              Open Communication Center &rarr;
            </Link>
            {notifications.length > 0 && (
              <button
                type="button"
                className="notification-clear-btn"
                onClick={handleClearAll}
              >
                Clear all notifications
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
