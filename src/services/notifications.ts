import { getSupabaseClient } from '../lib/supabase'

export type NotificationType =
  | 'new_quote'
  | 'quote_accepted'
  | 'quote_rejected'
  | 'requirement_status'
  | 'new_lead'
  | 'system'

export type NotificationRecord = {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  link: string | null
  data: Record<string, unknown>
  is_read: boolean
  created_at: string
  updated_at: string
}

export type BusinessModerationAction = 'approved' | 'republished' | 'rejected'

export interface BusinessModerationNotificationData {
  business_id?: string
  business_name?: string
  business_slug?: string
  action?: BusinessModerationAction
  rejection_reason?: string
}


export async function getMyNotifications(limit = 30): Promise<NotificationRecord[]> {
  const supabase = getSupabaseClient()
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData.session?.user.id) {
    return []
  }

  const userId = sessionData.session.user.id

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw error
  }

  return (data ?? []).map((n) => ({
    id: n.id,
    user_id: n.user_id,
    type: n.type as NotificationType,
    title: n.title,
    message: n.message,
    link: n.link,
    data: (n.data as Record<string, unknown>) ?? {},
    is_read: Boolean(n.is_read),
    created_at: n.created_at,
    updated_at: n.updated_at,
  }))
}

export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = getSupabaseClient()
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData.session?.user.id) {
    return 0
  }

  const userId = sessionData.session.user.id

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)

  if (error) {
    return 0
  }

  return count ?? 0
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)

  if (error) {
    throw error
  }
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const supabase = getSupabaseClient()
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData.session?.user.id) {
    return
  }

  const userId = sessionData.session.user.id

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)

  if (error) {
    throw error
  }
}

export async function deleteNotification(notificationId: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)

  if (error) {
    throw error
  }
}

export async function clearAllNotifications(): Promise<void> {
  const supabase = getSupabaseClient()
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData.session?.user.id) {
    return
  }

  const userId = sessionData.session.user.id

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', userId)

  if (error) {
    throw error
  }
}

export function subscribeToUserNotifications(
  userId: string,
  onInsert: (notification: NotificationRecord) => void,
): () => void {
  const supabase = getSupabaseClient()
  const channel = supabase
    .channel(`notifications-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const n = payload.new as NotificationRecord | null
        if (!n || !n.id) return
        const formatted: NotificationRecord = {
          id: String(n.id),
          user_id: String(n.user_id),
          type: n.type,
          title: String(n.title ?? ''),
          message: String(n.message ?? ''),
          link: n.link ? String(n.link) : null,
          data: (n.data as Record<string, unknown>) ?? {},
          is_read: Boolean(n.is_read),
          created_at: String(n.created_at ?? new Date().toISOString()),
          updated_at: String(n.updated_at ?? new Date().toISOString()),
        }
        onInsert(formatted)
      },
    )
    .subscribe((_status, err) => {
      if (err) {
        console.error('Realtime subscription error on notifications:', err)
      }
    })

  return () => {
    void supabase.removeChannel(channel)
  }
}
