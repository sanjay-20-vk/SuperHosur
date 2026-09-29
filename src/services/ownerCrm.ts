import { getSupabaseClient } from '../lib/supabase'

export type LeadSourceType =
  | 'direct_message'
  | 'quote'
  | 'phone_click'
  | 'whatsapp_click'
  | 'requirement_match'

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'follow_up'
  | 'converted'
  | 'closed'
  | 'lost'

export type LeadPriority = 'low' | 'medium' | 'high'

export type OwnerLeadRecord = {
  id: string
  owner_id: string
  entity_type: 'business' | 'property'
  entity_id: string
  source_type: LeadSourceType
  source_id: string | null
  contact_user_id: string | null
  contact_name_snapshot: string | null
  contact_phone_snapshot: string | null
  contact_email_snapshot: string | null
  title: string
  description: string | null
  status: LeadStatus
  priority: LeadPriority
  notes: string | null
  last_contacted_at: string | null
  next_follow_up_at: string | null
  converted_at: string | null
  closed_at: string | null
  created_at: string
  updated_at: string
  // Hydrated entity & contact details
  entity_name?: string
}

export type CRMAnalyticsSummary = {
  total_leads: number
  new_leads: number
  contacted_leads: number
  follow_up_leads: number
  converted_leads: number
  closed_leads: number
  conversion_rate: number
}

export async function getOwnerLeads(): Promise<OwnerLeadRecord[]> {
  const supabase = getSupabaseClient()
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData.session?.user.id) {
    return []
  }

  const userId = sessionData.session.user.id

  const { data, error } = await supabase
    .from('owner_leads')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  // Hydrate entity titles
  const leads = (data ?? []) as OwnerLeadRecord[]
  if (leads.length === 0) return []

  const businessIds = leads.filter((l) => l.entity_type === 'business').map((l) => l.entity_id)
  const propertyIds = leads.filter((l) => l.entity_type === 'property').map((l) => l.entity_id)

  const bizMap = new Map<string, string>()
  const propMap = new Map<string, string>()

  if (businessIds.length > 0) {
    const { data: bData } = await supabase.from('businesses').select('id, name').in('id', businessIds)
    for (const b of bData ?? []) bizMap.set(b.id, b.name)
  }

  if (propertyIds.length > 0) {
    const { data: pData } = await supabase.from('properties').select('id, title').in('id', propertyIds)
    for (const p of pData ?? []) propMap.set(p.id, p.title)
  }

  return leads.map((l) => ({
    ...l,
    entity_name: l.entity_type === 'business' ? bizMap.get(l.entity_id) || 'Business' : propMap.get(l.entity_id) || 'Property',
  }))
}

export async function updateOwnerLead(params: {
  leadId: string
  status?: LeadStatus
  priority?: LeadPriority
  notes?: string
  nextFollowUpAt?: string | null
}): Promise<void> {
  const supabase = getSupabaseClient()

  const { error } = await supabase.rpc('update_owner_lead', {
    p_lead_id: params.leadId,
    p_status: params.status ?? null,
    p_priority: params.priority ?? null,
    p_notes: params.notes ?? null,
    p_next_follow_up_at: params.nextFollowUpAt ?? null,
  })

  if (error) {
    throw error
  }
}

export function computeCRMAnalytics(leads: OwnerLeadRecord[]): CRMAnalyticsSummary {
  const total = leads.length
  const newCount = leads.filter((l) => l.status === 'new').length
  const contacted = leads.filter((l) => l.status === 'contacted' || l.status === 'qualified').length
  const followUp = leads.filter((l) => l.status === 'follow_up').length
  const converted = leads.filter((l) => l.status === 'converted').length
  const closed = leads.filter((l) => l.status === 'closed' || l.status === 'lost').length

  const conversionRate = total > 0 ? Number(((converted / total) * 100).toFixed(1)) : 0

  return {
    total_leads: total,
    new_leads: newCount,
    contacted_leads: contacted,
    follow_up_leads: followUp,
    converted_leads: converted,
    closed_leads: closed,
    conversion_rate: conversionRate,
  }
}
