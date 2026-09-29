import { getSupabaseClient } from '../lib/supabase'

export type ReportEntityType =
  | 'business'
  | 'property'
  | 'review'
  | 'requirement'
  | 'product'
  | 'service'
  | 'user'
  | 'message'

export type ReportReason =
  | 'spam'
  | 'inappropriate_content'
  | 'misleading_information'
  | 'harassment'
  | 'fraud_or_scam'
  | 'counterfeit_or_illegal'
  | 'other'

export type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed'

export type ReportRecord = {
  id: string
  reporter_id: string
  entity_type: ReportEntityType
  entity_id: string
  reason: ReportReason
  description: string | null
  status: ReportStatus
  resolution: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
  reporter_profile?: {
    full_name: string | null
    role: string | null
  } | null
}

export type CreateReportInput = {
  entityType: ReportEntityType
  entityId: string
  reason: ReportReason
  description?: string | null
}

export type ModerateReportInput = {
  reportId: string
  status: 'reviewing' | 'resolved' | 'dismissed'
  resolution?: string | null
}

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  spam: 'Spam, advertisement, or repetitive listing',
  inappropriate_content: 'Inappropriate or offensive content',
  misleading_information: 'Misleading pricing, fake address, or inaccurate details',
  harassment: 'Harassment, abusive behavior, or hate speech',
  fraud_or_scam: 'Suspected scam, fraud, or identity impersonation',
  counterfeit_or_illegal: 'Illegal goods, counterfeit items, or unauthorized service',
  other: 'Other issue or policy violation',
}

export function getReportErrorMessage(error: unknown, fallback = 'Unable to submit report.'): string {
  if (error instanceof Error && error.message) {
    if (error.message.includes('Rate limit exceeded')) {
      return 'You have submitted too many reports recently. Please wait before submitting another report.'
    }
    if (error.message.includes('reports_unique_pending_user_entity_idx')) {
      return 'You already have an open report pending review for this item.'
    }
    return error.message
  }
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return fallback
}

/**
 * Submits an abuse report for content moderation.
 * Requires user authentication; protected by rate limit and duplicate report unique index.
 */
export async function submitReport(input: CreateReportInput): Promise<ReportRecord> {
  const supabase = getSupabaseClient()
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData.session?.user.id) {
    throw new Error('Please sign in to submit a report.')
  }

  const reporterId = sessionData.session.user.id
  const cleanDescription = input.description ? input.description.trim() : null

  if (cleanDescription && cleanDescription.length > 2000) {
    throw new Error('Report description cannot exceed 2,000 characters.')
  }

  const { data, error } = await supabase
    .from('reports')
    .insert({
      reporter_id: reporterId,
      entity_type: input.entityType,
      entity_id: input.entityId,
      reason: input.reason,
      description: cleanDescription,
    })
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data as ReportRecord
}

/**
 * Fetches reports for administrative moderation.
 * Protected by Supabase RLS (admins only).
 */
export async function getAdminReports(filters: {
  status?: ReportStatus | 'all'
  entityType?: ReportEntityType | 'all'
  limit?: number
} = {}): Promise<ReportRecord[]> {
  const supabase = getSupabaseClient()

  let query = supabase
    .from('reports')
    .select(`
      id,
      reporter_id,
      entity_type,
      entity_id,
      reason,
      description,
      status,
      resolution,
      reviewed_by,
      reviewed_at,
      created_at,
      updated_at,
      reporter_profile:profiles!reports_reporter_id_fkey(full_name, role)
    `)
    .order('created_at', { ascending: false })
    .limit(filters.limit ?? 100)

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  if (filters.entityType && filters.entityType !== 'all') {
    query = query.eq('entity_type', filters.entityType)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return (data ?? []).map((row) => {
    const raw = row as unknown as {
      id: string
      reporter_id: string
      entity_type: ReportEntityType
      entity_id: string
      reason: ReportReason
      description: string | null
      status: ReportStatus
      resolution: string | null
      reviewed_by: string | null
      reviewed_at: string | null
      created_at: string
      updated_at: string
      reporter_profile: { full_name: string | null; role: string | null } | { full_name: string | null; role: string | null }[] | null
    }

    const reporter = Array.isArray(raw.reporter_profile) ? raw.reporter_profile[0] : raw.reporter_profile

    return {
      id: raw.id,
      reporter_id: raw.reporter_id,
      entity_type: raw.entity_type,
      entity_id: raw.entity_id,
      reason: raw.reason,
      description: raw.description,
      status: raw.status,
      resolution: raw.resolution,
      reviewed_by: raw.reviewed_by,
      reviewed_at: raw.reviewed_at,
      created_at: raw.created_at,
      updated_at: raw.updated_at,
      reporter_profile: reporter ?? null,
    }
  })
}

/**
 * Moderate report via secure database RPC that updates report state and writes to admin_audit_logs.
 */
export async function moderateAdminReport(input: ModerateReportInput): Promise<void> {
  const supabase = getSupabaseClient()

  const { error } = await supabase.rpc('admin_moderate_report', {
    p_report_id: input.reportId,
    p_status: input.status,
    p_resolution: input.resolution?.trim() || null,
  })

  if (error) {
    throw error
  }
}
