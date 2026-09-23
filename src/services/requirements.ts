import { getSupabaseClient } from '../lib/supabase'

export type RequirementStatus =
  | 'open'
  | 'matching'
  | 'quoted'
  | 'accepted'
  | 'completed'
  | 'cancelled'
  | 'expired'

export type RequirementMatchStatus =
  | 'pending'
  | 'notified'
  | 'viewed'
  | 'dismissed'
  | 'accepted'

export type MatchedBusinessSummary = {
  id: string
  name: string
  phone: string | null
  whatsapp: string | null
  verified: boolean
}

export type RequirementMatchItem = {
  id: string
  match_score: number
  status: RequirementMatchStatus
  created_at: string
  business: MatchedBusinessSummary | null
}

export type QuoteStatus = 'submitted' | 'accepted' | 'rejected' | 'withdrawn'

export type RequirementQuoteRecord = {
  id: string
  requirement_id: string
  business_id: string
  vendor_id: string
  quote_amount: number
  estimated_duration: string | null
  valid_until: string | null
  notes: string | null
  status: QuoteStatus
  created_at: string
  updated_at: string
  business?: MatchedBusinessSummary | null
}

export type RequirementQuoteInput = {
  requirement_id: string
  business_id: string
  quote_amount: number
  estimated_duration?: string | null
  valid_until?: string | null
  notes?: string | null
}

export type RequirementRecord = {
  id: string
  customer_id: string
  city_id: string
  category_id: string | null
  subcategory_id?: string | null
  title: string
  description: string | null
  quantity: number | null
  budget_min: number | null
  budget_max: number | null
  required_date: string | null
  duration: string | null
  address: string | null
  status: RequirementStatus
  created_at: string
  updated_at: string
  city_name?: string | null
  category_name?: string | null
  subcategory_name?: string | null
  matches?: RequirementMatchItem[]
  quotes?: RequirementQuoteRecord[]
}

export type RequirementCreateInput = {
  city_id: string
  category_id?: string | null
  subcategory_id?: string | null
  title: string
  description?: string | null
  budget_min?: number | null
  budget_max?: number | null
  required_date?: string | null
  duration?: string | null
  address?: string | null
  ai_extracted_data?: Record<string, unknown> | null
}

export function getRequirementErrorMessage(error: unknown, fallback = 'Unable to process requirement.'): string {
  if (error instanceof Error && error.message) {
    return error.message
  }
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return fallback
}

export async function createRequirement(input: RequirementCreateInput): Promise<RequirementRecord> {
  const supabase = getSupabaseClient()
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError) {
    throw sessionError
  }

  const userId = sessionData.session?.user.id

  if (!userId) {
    throw new Error('Please sign in to post a requirement.')
  }

  const title = input.title.trim()
  if (!title) {
    throw new Error('Please enter a descriptive requirement title.')
  }

  if (!input.city_id) {
    throw new Error('Please select a city.')
  }

  if (
    input.budget_min !== null &&
    input.budget_min !== undefined &&
    input.budget_max !== null &&
    input.budget_max !== undefined &&
    input.budget_min > input.budget_max
  ) {
    throw new Error('Minimum budget cannot exceed maximum budget.')
  }

  const payload = {
    customer_id: userId,
    city_id: input.city_id,
    category_id: input.category_id || null,
    subcategory_id: input.subcategory_id || null,
    title,
    description: input.description?.trim() || null,
    budget_min: input.budget_min ?? null,
    budget_max: input.budget_max ?? null,
    required_date: input.required_date || null,
    duration: input.duration?.trim() || null,
    address: input.address?.trim() || null,
    ai_extracted_data: input.ai_extracted_data || {},
    status: 'open' as const,
  }

  const { data, error } = await supabase
    .from('requirements')
    .insert(payload)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  // Application-level matching safeguard
  matchRequirementForBusinesses(data.id).catch(() => 0)

  return data as RequirementRecord
}

export async function getMyRequirements(): Promise<RequirementRecord[]> {
  const supabase = getSupabaseClient()
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError) {
    throw sessionError
  }

  const userId = sessionData.session?.user.id

  if (!userId) {
    return []
  }

  const { data, error } = await supabase
    .from('requirements')
    .select(`
      *,
      cities(name),
      categories(name),
      subcategories(name),
      requirement_matches(
        id,
        match_score,
        status,
        created_at,
        businesses(id, name, phone, whatsapp, verified)
      ),
      requirement_quotes(
        id,
        requirement_id,
        business_id,
        vendor_id,
        quote_amount,
        estimated_duration,
        valid_until,
        notes,
        status,
        created_at,
        updated_at,
        businesses(id, name, phone, whatsapp, verified)
      )
    `)
    .eq('customer_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  type RawMatchRow = {
    id: string
    match_score: number
    status: RequirementMatchStatus
    created_at: string
    businesses?: MatchedBusinessSummary | MatchedBusinessSummary[] | null
  }

  type RawQuoteRow = {
    id: string
    requirement_id: string
    business_id: string
    vendor_id: string
    quote_amount: number
    estimated_duration: string | null
    valid_until: string | null
    notes: string | null
    status: QuoteStatus
    created_at: string
    updated_at: string
    businesses?: MatchedBusinessSummary | MatchedBusinessSummary[] | null
  }

  type RawRequirementRow = RequirementRecord & {
    cities?: { name: string } | { name: string }[] | null
    categories?: { name: string } | { name: string }[] | null
    subcategories?: { name: string } | { name: string }[] | null
    requirement_matches?: RawMatchRow[] | null
    requirement_quotes?: RawQuoteRow[] | null
  }

  const rows = (data ?? []) as RawRequirementRow[]

  return rows.map((row) => {
    const cityData = Array.isArray(row.cities) ? row.cities[0] : row.cities
    const catData = Array.isArray(row.categories) ? row.categories[0] : row.categories
    const subcatData = Array.isArray(row.subcategories) ? row.subcategories[0] : row.subcategories

    const rawMatches = row.requirement_matches ?? []
    const matches: RequirementMatchItem[] = rawMatches.map((m) => {
      const bizData = Array.isArray(m.businesses) ? m.businesses[0] : m.businesses
      return {
        id: m.id,
        match_score: m.match_score,
        status: m.status,
        created_at: m.created_at,
        business: bizData ?? null,
      }
    })

    const rawQuotes = row.requirement_quotes ?? []
    const quotes: RequirementQuoteRecord[] = rawQuotes.map((q) => {
      const bizData = Array.isArray(q.businesses) ? q.businesses[0] : q.businesses
      return {
        id: q.id,
        requirement_id: q.requirement_id,
        business_id: q.business_id,
        vendor_id: q.vendor_id,
        quote_amount: Number(q.quote_amount),
        estimated_duration: q.estimated_duration,
        valid_until: q.valid_until,
        notes: q.notes,
        status: q.status,
        created_at: q.created_at,
        updated_at: q.updated_at,
        business: bizData ?? null,
      }
    })

    return {
      id: row.id,
      customer_id: row.customer_id,
      city_id: row.city_id,
      category_id: row.category_id,
      subcategory_id: row.subcategory_id ?? null,
      title: row.title,
      description: row.description,
      quantity: row.quantity,
      budget_min: row.budget_min,
      budget_max: row.budget_max,
      required_date: row.required_date,
      duration: row.duration,
      address: row.address,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      city_name: cityData?.name ?? null,
      category_name: catData?.name ?? null,
      subcategory_name: subcatData?.name ?? null,
      matches,
      quotes,
    }
  })
}

export async function cancelRequirement(requirementId: string): Promise<void> {
  const supabase = getSupabaseClient()

  const { error } = await supabase
    .from('requirements')
    .update({ status: 'cancelled' })
    .eq('id', requirementId)

  if (error) {
    throw error
  }
}

export async function submitRequirementQuote(input: RequirementQuoteInput): Promise<RequirementQuoteRecord> {
  const supabase = getSupabaseClient()
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData.session?.user.id) {
    throw new Error('Please sign in to submit a quote.')
  }

  const vendorId = sessionData.session.user.id

  if (!input.quote_amount || input.quote_amount <= 0) {
    throw new Error('Please enter a valid quotation amount greater than 0.')
  }

  const payload = {
    requirement_id: input.requirement_id,
    business_id: input.business_id,
    vendor_id: vendorId,
    quote_amount: input.quote_amount,
    estimated_duration: input.estimated_duration?.trim() || null,
    valid_until: input.valid_until || null,
    notes: input.notes?.trim() || null,
    status: 'submitted' as const,
  }

  const { data, error } = await supabase
    .from('requirement_quotes')
    .upsert(payload, { onConflict: 'requirement_id,business_id' })
    .select(`
      *,
      businesses (id, name, phone, whatsapp, verified)
    `)
    .single()

  if (error) {
    throw error
  }

  const bizData = Array.isArray(data.businesses) ? data.businesses[0] : data.businesses
  return {
    id: data.id,
    requirement_id: data.requirement_id,
    business_id: data.business_id,
    vendor_id: data.vendor_id,
    quote_amount: Number(data.quote_amount),
    estimated_duration: data.estimated_duration,
    valid_until: data.valid_until,
    notes: data.notes,
    status: data.status as QuoteStatus,
    created_at: data.created_at,
    updated_at: data.updated_at,
    business: bizData ?? null,
  }
}

export async function getQuotesForRequirement(requirementId: string): Promise<RequirementQuoteRecord[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('requirement_quotes')
    .select(`
      *,
      businesses (id, name, phone, whatsapp, verified)
    `)
    .eq('requirement_id', requirementId)
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []).map((q) => {
    const bizData = Array.isArray(q.businesses) ? q.businesses[0] : q.businesses
    return {
      id: q.id,
      requirement_id: q.requirement_id,
      business_id: q.business_id,
      vendor_id: q.vendor_id,
      quote_amount: Number(q.quote_amount),
      estimated_duration: q.estimated_duration,
      valid_until: q.valid_until,
      notes: q.notes,
      status: q.status as QuoteStatus,
      created_at: q.created_at,
      updated_at: q.updated_at,
      business: bizData ?? null,
    }
  })
}

export async function acceptRequirementQuote(requirementId: string, quoteId: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.rpc('accept_requirement_quote', {
    target_requirement_id: requirementId,
    target_quote_id: quoteId,
  })

  if (error) {
    throw error
  }
}

export async function completeRequirement(requirementId: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('requirements')
    .update({ status: 'completed' })
    .eq('id', requirementId)

  if (error) {
    throw error
  }
}

export type VendorLeadCustomerSummary = {
  id: string
  full_name: string | null
  phone: string | null
}

export type VendorLeadBusinessSummary = {
  id: string
  name: string
  slug: string
  category_id: string
}

export type VendorLeadRequirementSummary = {
  id: string
  title: string
  description: string | null
  budget_min: number | null
  budget_max: number | null
  required_date: string | null
  duration: string | null
  address: string | null
  status: RequirementStatus
  created_at: string
  category_name?: string | null
  subcategory_name?: string | null
  city_name?: string | null
  customer?: VendorLeadCustomerSummary | null
}

export type VendorLeadRecord = {
  id: string
  requirement_id: string
  business_id: string
  match_score: number
  match_reason: Record<string, unknown>
  status: RequirementMatchStatus
  created_at: string
  updated_at: string
  business: VendorLeadBusinessSummary | null
  requirement: VendorLeadRequirementSummary | null
  quote?: RequirementQuoteRecord | null
}

export async function matchRequirementForBusinesses(requirementId: string): Promise<number> {
  const supabase = getSupabaseClient()
  const { data: req, error: reqError } = await supabase
    .from('requirements')
    .select('id, city_id, category_id, subcategory_id, status')
    .eq('id', requirementId)
    .single()

  if (reqError || !req || !req.category_id) return 0

  const { data: bizList, error: bizError } = await supabase
    .from('businesses')
    .select('id')
    .eq('city_id', req.city_id)
    .eq('category_id', req.category_id)
    .eq('active', true)
    .eq('verified', true)

  if (bizError || !bizList || bizList.length === 0) return 0

  const matches = bizList.map((b) => ({
    requirement_id: req.id,
    business_id: b.id,
    match_score: req.subcategory_id ? 0.98 : 0.90,
    match_reason: {
      type: req.subcategory_id ? 'subcategory_supply_match' : 'category_city_match',
      category_matched: true,
      city_matched: true,
    },
    status: 'pending' as const,
  }))

  const { data: inserted, error: insertError } = await supabase
    .from('requirement_matches')
    .upsert(matches, { onConflict: 'requirement_id,business_id' })
    .select('id')

  if (insertError) {
    return 0
  }

  return inserted?.length ?? 0
}

export async function getVendorLeads(): Promise<VendorLeadRecord[]> {
  const supabase = getSupabaseClient()
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData.session?.user.id) {
    return []
  }

  const { data, error } = await supabase
    .from('requirement_matches')
    .select(`
      id,
      requirement_id,
      business_id,
      match_score,
      match_reason,
      status,
      created_at,
      updated_at,
      businesses (
        id,
        name,
        slug,
        category_id
      ),
      requirements (
        id,
        title,
        description,
        budget_min,
        budget_max,
        required_date,
        duration,
        address,
        status,
        created_at,
        customer_id,
        cities (
          name
        ),
        categories (
          name
        ),
        subcategories (
          name
        )
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  type RawRequirementFromMatch = {
    id: string
    title: string
    description: string | null
    budget_min: number | null
    budget_max: number | null
    required_date: string | null
    duration: string | null
    address: string | null
    status: RequirementStatus
    created_at: string
    customer_id: string
    cities?: { name: string } | { name: string }[] | null
    categories?: { name: string } | { name: string }[] | null
    subcategories?: { name: string } | { name: string }[] | null
  }

  type RawMatchItem = {
    id: string
    requirement_id: string
    business_id: string
    match_score: number
    match_reason: Record<string, unknown>
    status: RequirementMatchStatus
    created_at: string
    updated_at: string
    businesses?: VendorLeadBusinessSummary | VendorLeadBusinessSummary[] | null
    requirements?: RawRequirementFromMatch | RawRequirementFromMatch[] | null
  }

  const rows = (data ?? []) as RawMatchItem[]

  const customerIds = Array.from(
    new Set(
      rows
        .map((r) => {
          const req = Array.isArray(r.requirements) ? r.requirements[0] : r.requirements
          return req?.customer_id
        })
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
    ),
  )

  let customerMap = new Map<string, VendorLeadCustomerSummary>()
  if (customerIds.length > 0) {
    try {
      const { data: customerProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .in('id', customerIds)

      if (customerProfiles) {
        customerMap = new Map(customerProfiles.map((p) => [p.id, p]))
      }
    } catch {
      // Non-fatal fallback
    }
  }

  const quoteMap = new Map<string, RequirementQuoteRecord>()
  if (rows.length > 0) {
    try {
      const reqIds = rows.map((r) => r.requirement_id)
      const bizIds = rows.map((r) => r.business_id)
      const { data: quotesData } = await supabase
        .from('requirement_quotes')
        .select('*')
        .in('requirement_id', reqIds)
        .in('business_id', bizIds)

      if (quotesData) {
        for (const q of quotesData) {
          quoteMap.set(`${q.requirement_id}_${q.business_id}`, {
            id: q.id,
            requirement_id: q.requirement_id,
            business_id: q.business_id,
            vendor_id: q.vendor_id,
            quote_amount: Number(q.quote_amount),
            estimated_duration: q.estimated_duration,
            valid_until: q.valid_until,
            notes: q.notes,
            status: q.status as QuoteStatus,
            created_at: q.created_at,
            updated_at: q.updated_at,
          })
        }
      }
    } catch {
      // Non-fatal fallback
    }
  }

  return rows.map((row) => {
    const biz = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses
    const req = Array.isArray(row.requirements) ? row.requirements[0] : row.requirements

    const cityData = req && (Array.isArray(req.cities) ? req.cities[0] : req.cities)
    const catData = req && (Array.isArray(req.categories) ? req.categories[0] : req.categories)
    const subcatData = req && (Array.isArray(req.subcategories) ? req.subcategories[0] : req.subcategories)
    const customer = req ? customerMap.get(req.customer_id) ?? null : null
    const existingQuote = quoteMap.get(`${row.requirement_id}_${row.business_id}`) ?? null

    const requirementSummary: VendorLeadRequirementSummary | null = req
      ? {
          id: req.id,
          title: req.title,
          description: req.description,
          budget_min: req.budget_min,
          budget_max: req.budget_max,
          required_date: req.required_date,
          duration: req.duration,
          address: req.address,
          status: req.status,
          created_at: req.created_at,
          city_name: cityData?.name ?? null,
          category_name: catData?.name ?? null,
          subcategory_name: subcatData?.name ?? null,
          customer,
        }
      : null

    return {
      id: row.id,
      requirement_id: row.requirement_id,
      business_id: row.business_id,
      match_score: row.match_score,
      match_reason: row.match_reason ?? {},
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      business: biz ?? null,
      requirement: requirementSummary,
      quote: existingQuote,
    }
  })
}

export async function updateVendorLeadStatus(
  matchId: string,
  status: RequirementMatchStatus,
): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('requirement_matches')
    .update({ status })
    .eq('id', matchId)

  if (error) {
    throw error
  }
}

export type AdminRequirementCustomer = {
  id: string
  full_name: string | null
  phone: string | null
}

export type AdminRequirementRecord = RequirementRecord & {
  customer?: AdminRequirementCustomer | null
}

export async function getAdminRequirements(): Promise<AdminRequirementRecord[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('requirements')
    .select(`
      *,
      cities (name),
      categories (name),
      subcategories (name),
      profiles:customer_id (id, full_name, phone),
      requirement_matches (
        id,
        match_score,
        status,
        created_at,
        businesses (id, name, phone, whatsapp, verified)
      ),
      requirement_quotes (
        id,
        requirement_id,
        business_id,
        vendor_id,
        quote_amount,
        estimated_duration,
        valid_until,
        notes,
        status,
        created_at,
        updated_at,
        businesses (id, name, phone, whatsapp, verified)
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  type RawMatchRow = {
    id: string
    match_score: number
    status: RequirementMatchStatus
    created_at: string
    businesses?: MatchedBusinessSummary | MatchedBusinessSummary[] | null
  }

  type RawQuoteRow = {
    id: string
    requirement_id: string
    business_id: string
    vendor_id: string
    quote_amount: number
    estimated_duration: string | null
    valid_until: string | null
    notes: string | null
    status: QuoteStatus
    created_at: string
    updated_at: string
    businesses?: MatchedBusinessSummary | MatchedBusinessSummary[] | null
  }

  type RawReqRow = RequirementRecord & {
    cities?: { name: string } | { name: string }[] | null
    categories?: { name: string } | { name: string }[] | null
    subcategories?: { name: string } | { name: string }[] | null
    profiles?: AdminRequirementCustomer | AdminRequirementCustomer[] | null
    requirement_matches?: RawMatchRow[] | null
    requirement_quotes?: RawQuoteRow[] | null
  }

  const rows = (data ?? []) as RawReqRow[]

  return rows.map((row) => {
    const cityData = Array.isArray(row.cities) ? row.cities[0] : row.cities
    const catData = Array.isArray(row.categories) ? row.categories[0] : row.categories
    const subcatData = Array.isArray(row.subcategories) ? row.subcategories[0] : row.subcategories
    const custData = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles

    const rawMatches = row.requirement_matches ?? []
    const matches: RequirementMatchItem[] = rawMatches.map((m) => {
      const bizData = Array.isArray(m.businesses) ? m.businesses[0] : m.businesses
      return {
        id: m.id,
        match_score: m.match_score,
        status: m.status,
        created_at: m.created_at,
        business: bizData ?? null,
      }
    })

    const rawQuotes = row.requirement_quotes ?? []
    const quotes: RequirementQuoteRecord[] = rawQuotes.map((q) => {
      const bizData = Array.isArray(q.businesses) ? q.businesses[0] : q.businesses
      return {
        id: q.id,
        requirement_id: q.requirement_id,
        business_id: q.business_id,
        vendor_id: q.vendor_id,
        quote_amount: Number(q.quote_amount),
        estimated_duration: q.estimated_duration,
        valid_until: q.valid_until,
        notes: q.notes,
        status: q.status,
        created_at: q.created_at,
        updated_at: q.updated_at,
        business: bizData ?? null,
      }
    })

    return {
      id: row.id,
      customer_id: row.customer_id,
      city_id: row.city_id,
      category_id: row.category_id,
      subcategory_id: row.subcategory_id ?? null,
      title: row.title,
      description: row.description,
      quantity: row.quantity,
      budget_min: row.budget_min,
      budget_max: row.budget_max,
      required_date: row.required_date,
      duration: row.duration,
      address: row.address,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      city_name: cityData?.name ?? null,
      category_name: catData?.name ?? null,
      subcategory_name: subcatData?.name ?? null,
      customer: custData ?? null,
      matches,
      quotes,
    }
  })
}

export async function updateAdminRequirementStatus(
  requirementId: string,
  status: RequirementStatus,
): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('requirements')
    .update({ status })
    .eq('id', requirementId)

  if (error) {
    throw error
  }
}
