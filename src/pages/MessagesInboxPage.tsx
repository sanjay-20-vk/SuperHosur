import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Header } from '../components/Header'
import { LoadingState } from '../components/LoadingState'
import { DirectMessageDrawer } from '../components/DirectMessageDrawer'
import {
  getMyDirectConversations,
  type DirectConversationRecord,
} from '../services/directMessages'
import { SEO } from '../components/SEO'

export function MessagesInboxPage() {
  const [searchParams] = useSearchParams()
  const initialConvId = searchParams.get('conversation')

  const [conversations, setConversations] = useState<DirectConversationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Active chat drawer state
  const [selectedConversation, setSelectedConversation] = useState<DirectConversationRecord | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    async function loadInbox() {
      try {
        setLoading(true)
        setError(null)
        const list = await getMyDirectConversations()
        setConversations(list)

        // If URL requested a specific conversation, open it
        if (initialConvId) {
          const match = list.find((c) => c.id === initialConvId)
          if (match) {
            setSelectedConversation(match)
            setDrawerOpen(true)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load conversations.')
      } finally {
        setLoading(false)
      }
    }

    loadInbox()
  }, [initialConvId])

  function handleOpenConversation(conv: DirectConversationRecord) {
    setSelectedConversation(conv)
    setDrawerOpen(true)
  }

  function handleCloseDrawer() {
    setDrawerOpen(false)
    // Refresh inbox unread counts
    void getMyDirectConversations().then((list) => setConversations(list))
  }

  return (
    <>
      <SEO
        title="Messages | SuperHosur"
        description="Direct in-app messages and conversations with business and property owners on SuperHosur."
        noindex
      />
      <Header />

      <main className="messages-inbox-container" style={{ maxWidth: '960px', margin: '32px auto', padding: '0 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 6px', color: 'var(--color-text-main)' }}>
              Direct Messages
            </h1>
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              Communicate directly with listing owners and customer inquiries
            </p>
          </div>

          <button
            type="button"
            className="secondary-button"
            style={{ fontSize: '0.85rem', padding: '8px 16px' }}
            onClick={() => {
              setLoading(true)
              void getMyDirectConversations()
                .then((list) => setConversations(list))
                .finally(() => setLoading(false))
            }}
          >
            ↻ Refresh
          </button>
        </div>

        {loading && (
          <div className="state-panel" style={{ padding: '40px' }}>
            <LoadingState message="Loading conversations…" />
          </div>
        )}

        {error && !loading && (
          <div className="state-panel error-state" role="alert" style={{ padding: '24px' }}>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && conversations.length === 0 && (
          <div className="state-panel" style={{ textAlign: 'center', padding: '60px 20px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>💬</div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 8px', color: '#0f172a' }}>
              No messages yet
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto 20px', lineHeight: 1.5 }}>
              When you message a business or property owner, or when customers message your listings, your conversation threads will appear here.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <Link to="/catalog" className="primary-button hero-button">
                Browse businesses
              </Link>
              <Link to="/properties" className="secondary-button">
                Explore properties
              </Link>
            </div>
          </div>
        )}

        {!loading && !error && conversations.length > 0 && (
          <div className="messages-inbox-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {conversations.map((conv) => {
              const hasUnread = (conv.unread_count ?? 0) > 0
              return (
                <div
                  key={conv.id}
                  onClick={() => handleOpenConversation(conv)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleOpenConversation(conv)
                    }
                  }}
                  style={{
                    background: hasUnread ? '#f0fdf4' : '#ffffff',
                    border: hasUnread ? '1.5px solid #059669' : '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '16px 20px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                  className="inbox-item-card"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        background: conv.entity_type === 'business' ? '#ecfdf5' : '#eff6ff',
                        color: conv.entity_type === 'business' ? '#047857' : '#1d4ed8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {conv.entity_type === 'business' ? '🏪' : '🏡'}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                        <h2 style={{ fontSize: '1rem', fontWeight: hasUnread ? 800 : 700, margin: 0, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {conv.entity_title}
                        </h2>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '999px',
                            background: '#f1f5f9',
                            color: '#475569',
                            flexShrink: 0,
                          }}
                        >
                          {conv.entity_subtitle}
                        </span>
                      </div>

                      <p style={{ margin: '0 0 4px', fontSize: '0.82rem', color: '#64748b' }}>
                        With: <strong>{conv.other_party_name}</strong>
                      </p>

                      <p
                        style={{
                          margin: 0,
                          fontSize: '0.85rem',
                          color: hasUnread ? '#0f172a' : '#475569',
                          fontWeight: hasUnread ? 600 : 400,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {conv.latest_message_text}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      {new Date(conv.last_message_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>

                    {hasUnread && (
                      <span
                        style={{
                          background: '#059669',
                          color: '#ffffff',
                          borderRadius: '999px',
                          padding: '2px 8px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        {conv.unread_count} new
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {selectedConversation && (
        <DirectMessageDrawer
          isOpen={drawerOpen}
          onClose={handleCloseDrawer}
          conversationId={selectedConversation.id}
          listingTitle={selectedConversation.entity_title || 'Listing'}
          listingSubtitle={selectedConversation.entity_subtitle}
          otherPartyName={selectedConversation.other_party_name || 'Listing Contact'}
        />
      )}
    </>
  )
}
