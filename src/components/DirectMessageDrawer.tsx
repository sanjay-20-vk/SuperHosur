import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import {
  getDirectMessageErrorMessage,
  getDirectMessages,
  markDirectMessagesAsRead,
  sendDirectMessage,
  subscribeToDirectConversation,
  type DirectMessageRecord,
} from '../services/directMessages'
import { ReportModal } from './ReportModal'

export type DirectMessageDrawerProps = {
  isOpen: boolean
  onClose: () => void
  conversationId: string
  listingTitle: string
  listingSubtitle?: string
  otherPartyName: string
}

function formatMessageTime(dateString: string): string {
  const d = new Date(dateString)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()

  if (isToday) {
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return `${d.toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
  })}, ${d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

export function DirectMessageDrawer({
  isOpen,
  onClose,
  conversationId,
  listingTitle,
  listingSubtitle,
  otherPartyName,
}: DirectMessageDrawerProps) {
  const { session } = useAuth()
  const currentUserId = session?.user.id

  const [messages, setMessages] = useState<DirectMessageRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  // Report modal state
  const [reportTarget, setReportTarget] = useState<{ id: string; title: string } | null>(null)

  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  // Handle Escape key to close
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen, onClose])

  // Scroll to bottom when messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  // Fetch initial messages and subscribe to Realtime
  useEffect(() => {
    if (!isOpen || !conversationId) return

    let isMounted = true

    async function load() {
      try {
        setLoading(true)
        setError(null)
        setSendError(null)
        const rows = await getDirectMessages(conversationId)
        if (isMounted) {
          setMessages(rows)
          void markDirectMessagesAsRead(conversationId)
        }
      } catch (err) {
        if (isMounted) {
          setError(getDirectMessageErrorMessage(err, 'Unable to load conversation messages.'))
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void load()

    const unsubscribe = subscribeToDirectConversation(conversationId, (newMsg) => {
      if (!isMounted) return
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) {
          return prev
        }
        return [...prev, newMsg]
      })

      if (newMsg.sender_id !== currentUserId) {
        void markDirectMessagesAsRead(conversationId)
      }
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [isOpen, conversationId, currentUserId])

  async function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault()
    const clean = text.trim()
    if (!clean || sending) return

    try {
      setSending(true)
      setSendError(null)
      const sent = await sendDirectMessage(conversationId, clean)
      setMessages((prev) => {
        if (prev.some((m) => m.id === sent.id)) {
          return prev
        }
        return [...prev, sent]
      })
      setText('')
      inputRef.current?.focus()
    } catch (err) {
      setSendError(getDirectMessageErrorMessage(err, 'Failed to send message. Please retry.'))
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div
        className="qd-drawer-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="direct-chat-title"
      >
        <div className="qd-drawer-backdrop" onClick={onClose} aria-hidden="true" />

        <div className="qd-drawer-panel">
          {/* Header */}
          <div className="qd-drawer-header">
            <div className="qd-header-info">
              <span className="qd-header-eyebrow">
                💬 {listingSubtitle || 'Direct Inquiry'}
              </span>
              <h2 id="direct-chat-title" className="qd-header-title">
                {listingTitle}
              </h2>
              <p className="qd-header-parties">
                <span>With: <strong>{otherPartyName}</strong></span>
              </p>
            </div>

            <button
              type="button"
              className="qd-close-btn"
              onClick={onClose}
              aria-label="Close conversation drawer"
            >
              ✕
            </button>
          </div>

          {/* Conversation Messages View */}
          <div className="qd-messages-container" tabIndex={0} aria-label="Conversation history">
            {loading && (
              <div className="qd-state-panel">
                <span className="spinner" aria-hidden="true" />
                <p>Loading messages…</p>
              </div>
            )}

            {error && !loading && (
              <div className="qd-state-panel error">
                <p>{error}</p>
                <button
                  type="button"
                  className="qd-retry-btn"
                  onClick={() => {
                    setLoading(true)
                    setError(null)
                    void getDirectMessages(conversationId)
                      .then((rows) => setMessages(rows))
                      .catch((err) =>
                        setError(getDirectMessageErrorMessage(err, 'Unable to load messages.')),
                      )
                      .finally(() => setLoading(false))
                  }}
                >
                  Retry loading
                </button>
              </div>
            )}

            {!loading && !error && messages.length === 0 && (
              <div className="qd-empty-state">
                <div className="qd-empty-icon" aria-hidden="true">
                  💬
                </div>
                <h3>Start the conversation</h3>
                <p>
                  Ask about availability, pricing, timings, or details directly with {otherPartyName}.
                </p>
              </div>
            )}

            {!loading && !error && messages.length > 0 && (
              <div className="qd-messages-list">
                {messages.map((msg) => {
                  const isMine = msg.sender_id === currentUserId
                  return (
                    <div
                      key={msg.id}
                      className={`qd-message-row ${isMine ? 'mine' : 'theirs'}`}
                    >
                      <div className="qd-bubble">
                        <div className="qd-bubble-header">
                          <span className="qd-bubble-author">
                            {isMine ? 'You' : msg.sender_name || otherPartyName}
                          </span>
                          <span className="qd-bubble-time">
                            {formatMessageTime(msg.created_at)}
                          </span>
                        </div>
                        <p className="qd-bubble-text">{msg.message_text}</p>
                        {!isMine && (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                            <button
                              type="button"
                              className="review-report-btn"
                              style={{ fontSize: '0.7rem', padding: '2px 4px' }}
                              onClick={() => {
                                setReportTarget({
                                  id: msg.id,
                                  title: `Message from ${msg.sender_name || otherPartyName}`,
                                })
                              }}
                              title="Report inappropriate message"
                            >
                              🚩 Report
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Footer Input Area */}
          <div className="qd-drawer-footer">
            {sendError && (
              <div className="qd-send-error" role="alert">
                <span>⚠️ {sendError}</span>
              </div>
            )}

            <form className="qd-input-form" onSubmit={handleSend}>
              <textarea
                ref={inputRef}
                className="qd-textarea"
                rows={2}
                placeholder="Type your message… (Press Enter to send)"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending}
                maxLength={2000}
                aria-label="Message text"
              />

              <div className="qd-actions-row">
                <span className="qd-char-counter">
                  {text.length}/2000
                </span>
                <button
                  type="submit"
                  className="primary-button qd-send-btn"
                  disabled={!text.trim() || sending}
                >
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {reportTarget && (
        <ReportModal
          isOpen={Boolean(reportTarget)}
          onClose={() => setReportTarget(null)}
          entityType="message"
          entityId={reportTarget.id}
          entityTitle={reportTarget.title}
        />
      )}
    </>
  )
}
