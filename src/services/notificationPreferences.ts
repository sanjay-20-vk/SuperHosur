import { getSupabaseClient } from '../lib/supabase'

export type NotificationPreferencesRecord = {
  user_id: string
  email_enabled: boolean
  whatsapp_enabled: boolean
  quote_notifications: boolean
  message_notifications: boolean
  requirement_notifications: boolean
  moderation_notifications: boolean
  created_at: string
  updated_at: string
}

export type NotificationDeliveryRecord = {
  id: string
  notification_id: string
  user_id: string
  channel: 'email' | 'whatsapp'
  event_type: string
  recipient_target: string
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'retrying' | 'cancelled'
  provider: string | null
  provider_message_id: string | null
  attempts: number
  max_attempts: number
  next_attempt_at: string
  sent_at: string | null
  last_error: string | null
  created_at: string
  updated_at: string
}

export async function getNotificationPreferences(): Promise<NotificationPreferencesRecord | null> {
  const supabase = getSupabaseClient()
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData.session?.user.id) {
    return null
  }

  const userId = sessionData.session.user.id

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data as NotificationPreferencesRecord | null
}

export async function updateNotificationPreferences(
  updates: Partial<Omit<NotificationPreferencesRecord, 'user_id' | 'created_at' | 'updated_at'>>,
): Promise<NotificationPreferencesRecord> {
  const supabase = getSupabaseClient()
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData.session?.user.id) {
    throw new Error('Please sign in to update notification preferences.')
  }

  const userId = sessionData.session.user.id

  const { data, error } = await supabase
    .from('notification_preferences')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data as NotificationPreferencesRecord
}

export async function getMyDeliveries(limit = 20): Promise<NotificationDeliveryRecord[]> {
  const supabase = getSupabaseClient()
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData.session?.user.id) {
    return []
  }

  const userId = sessionData.session.user.id

  const { data, error } = await supabase
    .from('notification_deliveries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw error
  }

  return (data ?? []) as NotificationDeliveryRecord[]
}
