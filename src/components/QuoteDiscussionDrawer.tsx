import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import {
  getMessageErrorMessage,
  getRequirementMessages,
  sendRequirementMessage,
  subscribeToRequirementMessages,
  type RequirementMessageRecord,
} from '../services/requirementMessages'
import type { QuoteStatus, RequirementStatus } from '../services/requirements'

export type QuoteDiscussionDrawerProps = {
  isOpen: boolean
  onClose: () => void
  requirementId: string
  quoteId: string
  requirementTitle: string
  quoteAmount: number
  quoteStatus: QuoteStatus
  requirementStatus: RequirementStatus
  otherPartyName: string
  otherPartyRole: 'vendor' | 'customer'
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

export function QuoteDiscussionDrawer({
  isOpen,
  onClose,
  requirementId,
  quoteId,
  requirementTitle,
  quoteAmount,
  quoteStatus,
  requirementStatus,
  otherPartyName,
  otherPartyRole,
}: QuoteDiscussionDrawerProps) {
  const { session } = useAuth()
  const currentUserId = session?.user.id

  const [messages, setMessages] = useState<RequirementMessageRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  const isReadOnly =
    quoteStatus === 'rejected' ||
    quoteStatus === 'withdrawn' ||
    requirementStatus === 'closed' ||
    requirementStatus === 'completed' ||
    requirementStatus === 'cancelled' ||
    requirementStatus === 'expired'

  function getReadOnlyNotice(): string {
    if (quoteStatus === 'withdrawn') {
      return 'This quotation was withdrawn. Message history is preserved in read-only mode.'
    }
    if (quoteStatus === 'rejected') {
      return 'This quotation was declined. Message history is preserved in read-only mode.'
    }
    return `This requirement is ${requirementStatus}. Message history is preserved in read-only mode.`
  }

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
    if (!isOpen || !requirementId || !quoteId) return

    let isMounted = true

    async function load() {
      try {
        setLoading(true)
        setError(null)
        setSendError(null)
        const rows = await getRequirementMessages(requirementId, quoteId)
        if (isMounted) {
          setMessages(rows)
        }
      } catch (err) {
        if (isMounted) {
          setError(getMessageErrorMessage(err, 'Unable to load discussion messages.'))
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void load()

    const unsubscribe = subscribeToRequirementMessages(requirementId, quoteId, (newMsg) => {
      if (!isMounted) return
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) {
          return prev
        }
        return [...prev, newMsg]
      })
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [isOpen, requirementId, quoteId])

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen && !loading && !isReadOnly) {
      inputRef.current?.focus()
    }
  }, [isOpen, loading, isReadOnly])

  async function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!text.trim() || sending || isReadOnly) return

    try {
      setSending(true)
      setSendError(null)
      const sent = await sendRequirementMessage(requirementId, quoteId, text)
      setMessages((prev) => {
        if (prev.some((m) => m.id === sent.id)) return prev
        return [...prev, sent]
      })
      setText('')
      setTimeout(() => inputRef.current?.focus(), 50)
    } catch (err) {
      setSendError(getMessageErrorMessage(err, 'Failed to send message.'))
    } finally {
      setSending(false)
    }
  }

  function handleKeyDownTextarea(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="discussion-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="discussion-drawer-title"
    >
      <div
        className="discussion-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        {/* Header */}
        <header className="discussion-modal-header">
          <div className="discussion-header-info">
            <span className="discussion-tag">
              💬 Quote Clarification &amp; Discussion
            </span>
            <h2 id="discussion-drawer-title" className="discussion-title">
              {otherPartyName}
            </h2>
            <p className="discussion-subtitle">
              Req: <strong>{requirementTitle}</strong> • Quote: ₹{quoteAmount.toLocaleString('en-IN')}
            </p>
          </div>

          <button
            type="button"
            className="discussion-close-btn"
            onClick={onClose}
            aria-label="Close discussion thread"
          >
            ✕
          </button>
        </header>

        {/* Read-Only Alert Banner */}
        {isReadOnly && (
          <div className="discussion-banner discussion-banner--readonly" role="status">
            <span>🔒</span>
            <p>{getReadOnlyNotice()}</p>
          </div>
        )}

        {/* Error Alert Banner */}
        {error && (
          <div className="discussion-banner discussion-banner--error" role="alert">
            <span>⚠️</span>
            <p>{error}</p>
          </div>
        )}

        {/* Chat Messages Body */}
        <main className="discussion-messages-body" aria-live="polite">
          {loading ? (
            <div className="discussion-loading-state">
              <span className="discussion-spinner" aria-hidden="true" />
              <p>Loading messages…</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="discussion-empty-state">
              <div className="discussion-empty-icon" aria-hidden="true">
                💬
              </div>
              <h3>No messages yet</h3>
              <p>
                {isReadOnly
                  ? 'No clarification messages were exchanged for this quote.'
                  : `Send a message to ${otherPartyName} to ask questions, clarify specifications, or negotiate pricing.`}
              </p>
            </div>
          ) : (
            <div className="discussion-bubbles-list">
              {messages.map((msg) => {
                const isMine = msg.sender_id === currentUserId
                return (
                  <article
                    key={msg.id}
                    className={`discussion-bubble-row ${isMine ? 'is-mine' : 'is-theirs'}`}
                    aria-label={`${isMine ? 'You' : msg.sender_name || otherPartyName}: ${msg.message_text}`}
                  >
                    <div className="discussion-bubble-card">
                      <header className="discussion-bubble-header">
                        <span className="discussion-bubble-author">
                          {isMine ? 'You' : msg.sender_name || otherPartyName}
                        </span>
                        {!isMine && (
                          <span className="discussion-role-badge">
                            {otherPartyRole === 'vendor' ? 'Verified Vendor' : 'Customer'}
                          </span>
                        )}
                      </header>
                      <p className="discussion-bubble-text">{msg.message_text}</p>
                      <footer className="discussion-bubble-footer">
                        <time dateTime={msg.created_at}>
                          {formatMessageTime(msg.created_at)}
                        </time>
                      </footer>
                    </div>
                  </article>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        {/* Input Footer */}
        {!isReadOnly && (
          <footer className="discussion-modal-footer">
            {sendError && (
              <div className="discussion-send-error" role="alert">
                ⚠️ {sendError}
              </div>
            )}
            <form onSubmit={handleSend} className="discussion-input-form">
              <div className="discussion-textarea-wrapper">
                <textarea
                  ref={inputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDownTextarea}
                  placeholder={`Write a message to ${otherPartyName}… (Press Enter to send)`}
                  rows={2}
                  maxLength={2000}
                  className="discussion-textarea"
                  aria-label={`Message to ${otherPartyName}`}
                  disabled={sending}
                />
                <span className="discussion-char-count" aria-hidden="true">
                  {text.length}/2000
                </span>
              </div>
              <button
                type="submit"
                className="primary-button discussion-send-btn"
                disabled={!text.trim() || sending}
                aria-label="Send message"
              >
                {sending ? 'Sending…' : 'Send ➤'}
              </button>
            </form>
          </footer>
        )}
      </div>
    </div>
  )
}
