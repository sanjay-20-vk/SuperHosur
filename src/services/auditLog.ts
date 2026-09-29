import { getSupabaseClient } from '../lib/supabase'

export type AuditEntityType = 'business' | 'property' | 'review' | 'photo' | 'video' | 'requirement' | 'user'

export type AdminAuditLogRecord = {
  id: string
  admin_id: string
  action_type: string
  entity_type: AuditEntityType
  entity_id: string
  entity_name: string | null
  old_status: string | null
  new_status: string | null
  reason: string | null
  metadata: Record<string, unknown>
  created_at: string
  profiles?: {
    full_name: string | null
    role: string | null
  } | null
}

export type AuditLogFilters = {
  actionType?: string | 'all'
  entityType?: AuditEntityType | 'all'
  entityId?: string
  adminId?: string
  dateFrom?: string
  dateTo?: string
  limit?: number
  offset?: number
}

export type RecordAuditInput = {
  actionType: string
  entityType: AuditEntityType
  entityId: string
  entityName?: string | null
  oldStatus?: string | null
  newStatus?: string | null
  reason?: string | null
  metadata?: Record<string, unknown>
}

export function getAuditErrorMessage(error: unknown, fallback = 'Unable to load audit logs.'): string {
  if (error instanceof Error && error.message) {
    return error.message
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return fallback
}

/**
 * Fetches admin audit logs with filtering and joined admin profile details.
 * Protected by Supabase RLS (admins only).
 */
export async function getAdminAuditLogs(filters: AuditLogFilters = {}): Promise<AdminAuditLogRecord[]> {
  const supabase = getSupabaseClient()

  let query = supabase
    .from('admin_audit_logs')
    .select(`
      id,
      admin_id,
      action_type,
      entity_type,
      entity_id,
      entity_name,
      old_status,
      new_status,
      reason,
      metadata,
      created_at,
      profiles:admin_id (
        full_name,
        role
      )
    `)
    .order('created_at', { ascending: false })

  if (filters.actionType && filters.actionType !== 'all') {
    query = query.eq('action_type', filters.actionType)
  }

  if (filters.entityType && filters.entityType !== 'all') {
    query = query.eq('entity_type', filters.entityType)
  }

  if (filters.entityId && filters.entityId.trim().length > 0) {
    query = query.eq('entity_id', filters.entityId.trim())
  }

  if (filters.adminId && filters.adminId.trim().length > 0) {
    query = query.eq('admin_id', filters.adminId.trim())
  }

  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom)
  }

  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo)
  }

  const limit = filters.limit ?? 50
  query = query.limit(limit)

  if (filters.offset) {
    query = query.range(filters.offset, filters.offset + limit - 1)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  type RawAuditRow = AdminAuditLogRecord & {
    profiles?: { full_name: string | null; role: string | null } | { full_name: string | null; role: string | null }[] | null
  }

  return ((data ?? []) as RawAuditRow[]).map((row) => ({
    id: row.id,
    admin_id: row.admin_id,
    action_type: row.action_type,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    entity_name: row.entity_name ?? null,
    old_status: row.old_status ?? null,
    new_status: row.new_status ?? null,
    reason: row.reason ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    created_at: row.created_at,
    profiles: Array.isArray(row.profiles) ? row.profiles[0] : row.profiles,
  }))
}

/**
 * Manually logs an administrative action using the security-definer RPC.
 * Used for photo, video, review, requirement, and user moderation.
 */
export async function recordAdminAudit(input: RecordAuditInput): Promise<string> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase.rpc('record_admin_audit', {
    p_action_type: input.actionType,
    p_entity_type: input.entityType,
    p_entity_id: input.entityId,
    p_entity_name: input.entityName ?? null,
    p_old_status: input.oldStatus ?? null,
    p_new_status: input.newStatus ?? null,
    p_reason: input.reason ?? null,
    p_metadata: input.metadata ?? {},
  })

  if (error) {
    throw error
  }

  return String(data)
}
