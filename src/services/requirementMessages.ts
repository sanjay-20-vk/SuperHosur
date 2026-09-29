import { getSupabaseClient } from '../lib/supabase'

export type RequirementMessageRecord = {
  id: string
  requirement_id: string
  quote_id: string
  sender_id: string
  message_text: string
  created_at: string
  sender_name?: string | null
  sender_role?: string | null
}

export function getMessageErrorMessage(
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

export async function getRequirementMessages(
  requirementId: string,
  quoteId: string,
): Promise<RequirementMessageRecord[]> {
  const supabase = getSupabaseClient()
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData.session?.user.id) {
    throw new Error('Please sign in to view discussion messages.')
  }

  const { data, error } = await supabase
    .from('requirement_messages')
    .select(`
      id,
      requirement_id,
      quote_id,
      sender_id,
      message_text,
      created_at,
      profiles:sender_id (
        id,
        full_name,
        role
      )
    `)
    .eq('requirement_id', requirementId)
    .eq('quote_id', quoteId)
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    return {
      id: String(row.id),
      requirement_id: String(row.requirement_id),
      quote_id: String(row.quote_id),
      sender_id: String(row.sender_id),
      message_text: String(row.message_text),
      created_at: String(row.created_at),
      sender_name: profile?.full_name ?? null,
      sender_role: profile?.role ?? null,
    }
  })
}

export async function sendRequirementMessage(
  requirementId: string,
  quoteId: string,
  message: string,
): Promise<RequirementMessageRecord> {
  const supabase = getSupabaseClient()
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData.session?.user.id) {
    throw new Error('Please sign in to send a message.')
  }

  const userId = sessionData.session.user.id
  const cleanMessage = message.trim()

  if (!cleanMessage) {
    throw new Error('Please enter a message before sending.')
  }

  if (cleanMessage.length > 2000) {
    throw new Error('Message length exceeds the maximum limit of 2,000 characters.')
  }

  const { data, error } = await supabase
    .from('requirement_messages')
    .insert({
      requirement_id: requirementId,
      quote_id: quoteId,
      sender_id: userId,
      message_text: cleanMessage,
    })
    .select(`
      id,
      requirement_id,
      quote_id,
      sender_id,
      message_text,
      created_at,
      profiles:sender_id (
        id,
        full_name,
        role
      )
    `)
    .single()

  if (error) {
    throw error
  }

  const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles
  return {
    id: String(data.id),
    requirement_id: String(data.requirement_id),
    quote_id: String(data.quote_id),
    sender_id: String(data.sender_id),
    message_text: String(data.message_text),
    created_at: String(data.created_at),
    sender_name: profile?.full_name ?? null,
    sender_role: profile?.role ?? null,
  }
}

type ThreadSubscription = {
  channel: ReturnType<ReturnType<typeof getSupabaseClient>['channel']>
  listeners: Set<(message: RequirementMessageRecord) => void>
}

const activeThreadSubscriptions = new Map<string, ThreadSubscription>()

export function subscribeToRequirementMessages(
  requirementId: string,
  quoteId: string,
  onInsert: (message: RequirementMessageRecord) => void,
): () => void {
  const channelKey = `${requirementId}_${quoteId}`
  const existing = activeThreadSubscriptions.get(channelKey)

  if (existing) {
    existing.listeners.add(onInsert)
    return () => {
      existing.listeners.delete(onInsert)
      if (existing.listeners.size === 0) {
        const supabase = getSupabaseClient()
        void supabase.removeChannel(existing.channel)
        activeThreadSubscriptions.delete(channelKey)
      }
    }
  }

  const supabase = getSupabaseClient()
  const listeners = new Set<(message: RequirementMessageRecord) => void>([onInsert])

  const channel = supabase
    .channel(`thread-${quoteId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'requirement_messages',
        filter: `quote_id=eq.${quoteId}`,
      },
      async (payload) => {
        const raw = payload.new as {
          id: string
          requirement_id: string
          quote_id: string
          sender_id: string
          message_text: string
          created_at: string
        } | null

        if (!raw || !raw.id) return

        let senderName: string | null = null
        let senderRole: string | null = null

        // Fetch sender profile details to enrich real-time event
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, role')
            .eq('id', raw.sender_id)
            .maybeSingle()

          if (profile) {
            senderName = profile.full_name
            senderRole = profile.role
          }
        } catch {
          // Ignore profile lookup error in realtime handler
        }

        const formatted: RequirementMessageRecord = {
          id: String(raw.id),
          requirement_id: String(raw.requirement_id),
          quote_id: String(raw.quote_id),
          sender_id: String(raw.sender_id),
          message_text: String(raw.message_text),
          created_at: String(raw.created_at ?? new Date().toISOString()),
          sender_name: senderName,
          sender_role: senderRole,
        }

        for (const listener of listeners) {
          try {
            listener(formatted)
          } catch (err) {
            console.error('Error dispatching message to thread listener:', err)
          }
        }
      },
    )
    .subscribe((_status, err) => {
      if (err) {
        console.error(`Realtime subscription error on thread ${quoteId}:`, err)
      }
    })

  activeThreadSubscriptions.set(channelKey, { channel, listeners })

  return () => {
    listeners.delete(onInsert)
    if (listeners.size === 0) {
      void supabase.removeChannel(channel)
      activeThreadSubscriptions.delete(channelKey)
    }
  }
}
