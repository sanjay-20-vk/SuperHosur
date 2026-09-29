import { getSupabaseClient } from '../lib/supabase'

export type AnalyticsEventType =
  | 'listing_view'
  | 'call_click'
  | 'whatsapp_click'
  | 'saved_listing'
  | 'quote_submitted'
  | 'quote_accepted'
  | 'quote_rejected'
  | 'quote_withdrawn'

export type OwnerAnalyticsSummary = {
  total_views: number
  total_call_clicks: number
  total_whatsapp_clicks: number
  total_saved_listings: number
  total_quotes_submitted: number
  total_quotes_accepted: number
  conversion_rate: number
}

export type OwnerListingMetric = {
  id: string
  title: string
  entity_type: 'business' | 'property'
  active: boolean
  verified: boolean
  views: number
  calls: number
  whatsapps: number
  saves: number
  quotes_submitted: number
  quotes_accepted: number
  conversion_rate: number
}

export type OwnerAnalyticsData = {
  period_days: number | null
  summary: OwnerAnalyticsSummary
  listings: OwnerListingMetric[]
}

export type TrackTarget = {
  businessId?: string | null
  propertyId?: string | null
}

const SESSION_STORAGE_KEY = 'superhosur_analytics_session_id'
const VIEW_STORAGE_PREFIX = 'superhosur_viewed_'

function getOrCreateSessionId(): string {
  try {
    let sid = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (!sid) {
      sid = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, sid)
    }
    return sid
  } catch {
    return 'fallback-session'
  }
}

function hasViewedInSession(targetKey: string): boolean {
  try {
    return window.sessionStorage.getItem(`${VIEW_STORAGE_PREFIX}${targetKey}`) === '1'
  } catch {
    return false
  }
}

function markViewedInSession(targetKey: string): void {
  try {
    window.sessionStorage.setItem(`${VIEW_STORAGE_PREFIX}${targetKey}`, '1')
  } catch {
    // Non-fatal
  }
}

/**
 * Record a telemetry event using the secure server-side RPC.
 * Fire-and-forget: never throws unhandled errors to avoid disrupting user experience.
 */
async function recordEvent(
  eventType: AnalyticsEventType,
  target: TrackTarget,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const { businessId, propertyId } = target
  if (!businessId && !propertyId) return
  if (businessId && propertyId) return

  try {
    const supabase = getSupabaseClient()
    const sessionId = getOrCreateSessionId()

    await supabase.rpc('record_listing_analytics_event', {
      p_business_id: businessId ?? null,
      p_property_id: propertyId ?? null,
      p_event_type: eventType,
      p_session_id: sessionId,
      p_metadata: metadata,
    })
  } catch {
    // Analytics failures must never interrupt marketplace functionality
  }
}

/**
 * Track listing views with browser-session deduplication.
 * Only records one view per listing per browser session.
 */
export function trackListingView(target: TrackTarget): void {
  const key = target.businessId ? `biz_${target.businessId}` : target.propertyId ? `prop_${target.propertyId}` : null
  if (!key) return

  if (hasViewedInSession(key)) {
    return
  }

  markViewedInSession(key)
  void recordEvent('listing_view', target)
}

/**
 * Track user phone call clicks (tel: links).
 */
export function trackCallClick(target: TrackTarget, source = 'detail_page'): void {
  void recordEvent('call_click', target, { source })
}

/**
 * Track user WhatsApp click-to-chat interactions.
 */
export function trackWhatsAppClick(target: TrackTarget, source = 'detail_page'): void {
  void recordEvent('whatsapp_click', target, { source })
}

/**
 * Track bookmark / saved listing events.
 */
export function trackSavedListing(target: TrackTarget): void {
  void recordEvent('saved_listing', target)
}

/**
 * Track quotation lifecycle telemetry.
 */
export function trackQuoteEvent(
  businessId: string,
  eventType: 'quote_submitted' | 'quote_accepted' | 'quote_rejected' | 'quote_withdrawn',
  metadata: Record<string, unknown> = {},
): void {
  void recordEvent(eventType, { businessId }, metadata)
}

/**
 * Retrieve aggregated analytics for the authenticated business/property owner.
 * Calls public.get_owner_analytics RPC.
 */
export async function getOwnerAnalytics(days?: number | null): Promise<OwnerAnalyticsData> {
  const supabase = getSupabaseClient()
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData.session?.user.id) {
    throw new Error('Please sign in to view your listing analytics.')
  }

  const { data, error } = await supabase.rpc('get_owner_analytics', {
    p_days: days && days > 0 ? days : null,
  })

  if (error) {
    throw error
  }

  const raw = data as {
    period_days: number | null
    summary: OwnerAnalyticsSummary
    listings: OwnerListingMetric[]
  }

  return {
    period_days: raw?.period_days ?? null,
    summary: {
      total_views: Number(raw?.summary?.total_views ?? 0),
      total_call_clicks: Number(raw?.summary?.total_call_clicks ?? 0),
      total_whatsapp_clicks: Number(raw?.summary?.total_whatsapp_clicks ?? 0),
      total_saved_listings: Number(raw?.summary?.total_saved_listings ?? 0),
      total_quotes_submitted: Number(raw?.summary?.total_quotes_submitted ?? 0),
      total_quotes_accepted: Number(raw?.summary?.total_quotes_accepted ?? 0),
      conversion_rate: Number(raw?.summary?.conversion_rate ?? 0),
    },
    listings: (raw?.listings ?? []).map((l) => ({
      id: String(l.id),
      title: String(l.title),
      entity_type: l.entity_type as 'business' | 'property',
      active: Boolean(l.active),
      verified: Boolean(l.verified),
      views: Number(l.views ?? 0),
      calls: Number(l.calls ?? 0),
      whatsapps: Number(l.whatsapps ?? 0),
      saves: Number(l.saves ?? 0),
      quotes_submitted: Number(l.quotes_submitted ?? 0),
      quotes_accepted: Number(l.quotes_accepted ?? 0),
      conversion_rate: Number(l.conversion_rate ?? 0),
    })),
  }
}
