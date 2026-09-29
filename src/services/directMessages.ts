import { getSupabaseClient } from '../lib/supabase'

export type DirectConversationRecord = {
  id: string
  customer_id: string
  owner_id: string
  entity_type: 'business' | 'property'
  entity_id: string
  last_message_at: string
  created_at: string
  updated_at: string
  // Hydrated attributes
  entity_title?: string
  entity_subtitle?: string
  other_party_name?: string
  other_party_avatar?: string
  unread_count?: number
  latest_message_text?: string
}

export type DirectMessageRecord = {
  id: string
  conversation_id: string
  sender_id: string
  message_text: string
  read_at: string | null
  created_at: string
  sender_name?: string | null
}

export function getDirectMessageErrorMessage(
  error: unknown,
  fallback = 'Unable to send or load messages.',
): string {
  if (error instanceof Error && error.message) {
    return error.message
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }
  return fallback
}

/**
 * Get or create a direct conversation for the current authenticated user with the owner of the listing.
 */
export async function getOrCreateDirectConversation(
  entityType: 'business' | 'property',
  entityId: string,
): Promise<{ conversation_id: string; customer_id: string; owner_id: string; entity_type: string; entity_id: string }> {
  const supabase = getSupabaseClient()
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData.session?.user.id) {
    throw new Error('Please sign in to contact the listing owner.')
  }

  const { data, error } = await supabase.rpc('get_or_create_direct_conversation', {
    p_entity_type: entityType,
    p_entity_id: entityId,
  })

  if (error) {
    throw error
  }

  return data as { conversation_id: string; customer_id: string; owner_id: string; entity_type: string; entity_id: string }
}

/**
 * Fetch messages for a specific direct conversation.
 */
export async function getDirectMessages(
  conversationId: string,
): Promise<DirectMessageRecord[]> {
  const supabase = getSupabaseClient()
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData.session?.user.id) {
    throw new Error('Please sign in to view conversation messages.')
  }

  const { data, error } = await supabase
    .from('direct_messages')
    .select(`
      id,
      conversation_id,
      sender_id,
      message_text,
      read_at,
      created_at,
      profiles:sender_id (
        id,
        full_name
      )
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    return {
      id: String(row.id),
      conversation_id: String(row.conversation_id),
      sender_id: String(row.sender_id),
      message_text: String(row.message_text),
      read_at: row.read_at ? String(row.read_at) : null,
      created_at: String(row.created_at),
      sender_name: profile?.full_name ?? null,
    }
  })
}

/**
 * Send a message within a direct conversation.
 */
export async function sendDirectMessage(
  conversationId: string,
  message: string,
): Promise<DirectMessageRecord> {
  const supabase = getSupabaseClient()
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData.session?.user.id) {
    throw new Error('Please sign in to send a message.')
  }

  const cleanMessage = message.trim()
  if (!cleanMessage) {
    throw new Error('Please enter a message before sending.')
  }

  if (cleanMessage.length > 2000) {
    throw new Error('Message length exceeds the maximum limit of 2,000 characters.')
  }

  const { data, error } = await supabase.rpc('send_direct_message', {
    p_conversation_id: conversationId,
    p_message_text: cleanMessage,
  })

  if (error) {
    throw error
  }

  return {
    id: String(data.message_id),
    conversation_id: String(data.conversation_id),
    sender_id: String(data.sender_id),
    message_text: cleanMessage,
    read_at: null,
    created_at: String(data.created_at),
  }
}

/**
 * Mark unread messages in a conversation as read.
 */
export async function markDirectMessagesAsRead(
  conversationId: string,
): Promise<number> {
  const supabase = getSupabaseClient()
  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData.session?.user.id) return 0

  const { data, error } = await supabase.rpc('mark_direct_messages_read', {
    p_conversation_id: conversationId,
  })

  if (error) {
    console.warn('Failed to mark direct messages as read:', error)
    return 0
  }

  return typeof data === 'number' ? data : 0
}

/**
 * Get all conversations for the current authenticated user (as customer or owner)
 * with listing details and latest message.
 */
export async function getMyDirectConversations(): Promise<DirectConversationRecord[]> {
  const supabase = getSupabaseClient()
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData.session?.user.id) {
    return []
  }

  const currentUserId = sessionData.session.user.id

  const { data: convs, error: convsErr } = await supabase
    .from('direct_conversations')
    .select(`
      id,
      customer_id,
      owner_id,
      entity_type,
      entity_id,
      last_message_at,
      created_at,
      updated_at
    `)
    .order('last_message_at', { ascending: false })

  if (convsErr) {
    throw convsErr
  }

  if (!convs || convs.length === 0) {
    return []
  }

  // Hydrate listing details and profiles
  const businessIds = convs.filter((c) => c.entity_type === 'business').map((c) => c.entity_id)
  const propertyIds = convs.filter((c) => c.entity_type === 'property').map((c) => c.entity_id)
  const partnerUserIds = Array.from(
    new Set(
      convs.map((c) => (c.customer_id === currentUserId ? c.owner_id : c.customer_id)),
    ),
  )

  // Fetch businesses
  const businessesMap = new Map<string, { id: string; name: string; slug: string }>()
  if (businessIds.length > 0) {
    const { data: bizData } = await supabase
      .from('businesses')
      .select('id, name, slug')
      .in('id', businessIds)

    for (const b of bizData ?? []) {
      businessesMap.set(b.id, b)
    }
  }

  // Fetch properties
  const propertiesMap = new Map<string, { id: string; title: string }>()
  if (propertyIds.length > 0) {
    const { data: propData } = await supabase
      .from('properties')
      .select('id, title')
      .in('id', propertyIds)

    for (const p of propData ?? []) {
      propertiesMap.set(p.id, p)
    }
  }

  // Fetch profiles
  const profilesMap = new Map<string, { id: string; full_name: string | null }>()
  if (partnerUserIds.length > 0) {
    const { data: profData } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', partnerUserIds)

    for (const p of profData ?? []) {
      profilesMap.set(p.id, p)
    }
  }

  // Fetch latest messages and unread counts for each conversation
  const convIds = convs.map((c) => c.id)
  const { data: recentMsgs } = await supabase
    .from('direct_messages')
    .select('id, conversation_id, sender_id, message_text, read_at, created_at')
    .in('conversation_id', convIds)
    .order('created_at', { ascending: false })

  const latestMessageMap = new Map<string, string>()
  const unreadCountMap = new Map<string, number>()

  for (const m of recentMsgs ?? []) {
    if (!latestMessageMap.has(m.conversation_id)) {
      latestMessageMap.set(m.conversation_id, m.message_text)
    }
    if (m.sender_id !== currentUserId && !m.read_at) {
      unreadCountMap.set(m.conversation_id, (unreadCountMap.get(m.conversation_id) ?? 0) + 1)
    }
  }

  return convs.map((c) => {
    const isCustomer = c.customer_id === currentUserId
    const partnerId = isCustomer ? c.owner_id : c.customer_id
    const partnerProfile = profilesMap.get(partnerId)
    const partnerName = partnerProfile?.full_name?.trim() || (isCustomer ? 'Listing Owner' : 'Customer')

    let entityTitle = 'Listing'
    let entitySubtitle = c.entity_type === 'business' ? 'Business' : 'Property'

    if (c.entity_type === 'business') {
      const biz = businessesMap.get(c.entity_id)
      if (biz) {
        entityTitle = biz.name
        entitySubtitle = 'Business Listing'
      }
    } else if (c.entity_type === 'property') {
      const prop = propertiesMap.get(c.entity_id)
      if (prop) {
        entityTitle = prop.title
        entitySubtitle = 'Property Listing'
      }
    }

    return {
      id: c.id,
      customer_id: c.customer_id,
      owner_id: c.owner_id,
      entity_type: c.entity_type as 'business' | 'property',
      entity_id: c.entity_id,
      last_message_at: c.last_message_at,
      created_at: c.created_at,
      updated_at: c.updated_at,
      entity_title: entityTitle,
      entity_subtitle: entitySubtitle,
      other_party_name: partnerName,
      unread_count: unreadCountMap.get(c.id) ?? 0,
      latest_message_text: latestMessageMap.get(c.id) ?? 'No messages yet',
    }
  })
}

/**
 * Realtime subscription manager for direct conversation messages.
 */
type ConversationSubscription = {
  channel: ReturnType<ReturnType<typeof getSupabaseClient>['channel']>
  listeners: Set<(message: DirectMessageRecord) => void>
}

const activeConvSubscriptions = new Map<string, ConversationSubscription>()

export function subscribeToDirectConversation(
  conversationId: string,
  onInsert: (message: DirectMessageRecord) => void,
): () => void {
  const existing = activeConvSubscriptions.get(conversationId)

  if (existing) {
    existing.listeners.add(onInsert)
    return () => {
      existing.listeners.delete(onInsert)
      if (existing.listeners.size === 0) {
        const supabase = getSupabaseClient()
        void supabase.removeChannel(existing.channel)
        activeConvSubscriptions.delete(conversationId)
      }
    }
  }

  const supabase = getSupabaseClient()
  const listeners = new Set<(message: DirectMessageRecord) => void>([onInsert])

  const channel = supabase
    .channel(`direct_conv_${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      async (payload) => {
        const row = payload.new as {
          id: string
          conversation_id: string
          sender_id: string
          message_text: string
          read_at: string | null
          created_at: string
        }

        let senderName: string | null
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', row.sender_id)
            .maybeSingle()

          senderName = profile?.full_name ?? null
        } catch {
          senderName = null
        }

        const newRecord: DirectMessageRecord = {
          id: String(row.id),
          conversation_id: String(row.conversation_id),
          sender_id: String(row.sender_id),
          message_text: String(row.message_text),
          read_at: row.read_at ? String(row.read_at) : null,
          created_at: String(row.created_at),
          sender_name: senderName,
        }

        for (const listener of listeners) {
          listener(newRecord)
        }
      },
    )
    .subscribe()

  activeConvSubscriptions.set(conversationId, { channel, listeners })

  return () => {
    listeners.delete(onInsert)
    if (listeners.size === 0) {
      void supabase.removeChannel(channel)
      activeConvSubscriptions.delete(conversationId)
    }
  }
}
