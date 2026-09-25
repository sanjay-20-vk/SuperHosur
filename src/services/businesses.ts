import { getSupabaseClient } from '../lib/supabase'
import { attachApprovedCoverPhotos } from './photos'

export type BusinessSummary = {
  id: string
  name: string
  category_id: string
  description: string | null
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  cover_photo_url: string | null
  cover_photo_alt: string | null
}

export type BusinessSearchOptions = {
  search?: string
  categoryId?: string | null
}

export type BusinessRecord = {
  id: string
  owner_id: string
  city_id: string
  category_id: string
  name: string
  slug: string
  description: string | null
  phone: string | null
  whatsapp: string | null
  email: string | null
  address: string | null
  pincode: string | null
  latitude: number | null
  longitude: number | null
  service_radius_km: number | null
  availability_status: 'available' | 'busy' | 'offline'
  verified: boolean
  rating: number
  review_count: number
  active: boolean
  rejection_reason?: string | null
  created_at: string
  updated_at: string
}

export type BusinessCreateInput = {
  city_id: string
  category_id: string
  name: string
  slug: string
  description: string | null
  phone: string | null
  whatsapp: string | null
  email: string | null
  address: string | null
  pincode: string | null
  latitude?: number | null
  longitude?: number | null
  availability_status: 'available' | 'busy' | 'offline'
}

export type BusinessUpdateInput = Partial<BusinessCreateInput>

export type BusinessVisibilityUpdate = {
  active?: boolean
  verified?: boolean
  rejection_reason?: string | null
}

export function toBusinessSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

type DatabaseErrorLike = {
  code?: unknown
  details?: unknown
  hint?: unknown
  message?: unknown
}

type JwtPayload = {
  sub?: unknown
  role?: unknown
  aud?: unknown
  exp?: unknown
}

function decodeJwtPayload(accessToken: string | undefined): JwtPayload | null {
  if (!accessToken) {
    return null
  }

  try {
    const encodedPayload = accessToken.split('.')[1]

    if (!encodedPayload) {
      return null
    }

    const base64Payload = encodedPayload.replace(/-/g, '+').replace(/_/g, '/')
    const paddedPayload = base64Payload.padEnd(Math.ceil(base64Payload.length / 4) * 4, '=')

    return JSON.parse(atob(paddedPayload)) as JwtPayload
  } catch {
    return null
  }
}

function withDatabaseContext(error: DatabaseErrorLike, context: string): Error {
  const message = typeof error.message === 'string' ? error.message : 'Unknown database error.'
  const contextualError = new Error(`${context}: ${message}`)

  Object.assign(contextualError, {
    code: error.code,
    details: error.details,
    hint: error.hint,
  })

  return contextualError
}

export function getBusinessErrorMessage(error: unknown): string {
  if (typeof error !== 'object' || error === null) {
    return error instanceof Error && error.message
      ? error.message
      : 'Unable to save this business.'
  }

  const databaseError = error as DatabaseErrorLike
  const code = typeof databaseError.code === 'string' ? databaseError.code : ''
  const message =
    typeof databaseError.message === 'string'
      ? databaseError.message
      : 'Unable to save this business.'
  const details =
    typeof databaseError.details === 'string' ? databaseError.details : ''

  if (code === '23505') {
    return `Business slug already exists in this city (${code}): ${message}`
  }

  if (code === '23503') {
    return `A required business reference is invalid (${code}): ${message}`
  }

  if (code === '23514') {
    return `Business details failed database validation (${code}): ${message}`
  }

  if (code === '42501' || message.toLowerCase().includes('row-level security')) {
    const errorCode = code ? ` (${code})` : ''
    return `Supabase authorization error${errorCode}: ${message}`
  }

  if (message) {
    return details ? `${message} (${details})` : `${message}${code ? ` [${code}]` : ''}`
  }

  return error instanceof Error ? error.message : 'Unable to save this business.'
}

function toIlikePattern(value: string): string {
  return `%${value.replace(/[%_\\]/g, '\\$&')}%`
}

function quotePostgrestValue(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

export async function getBusinesses(
  options: BusinessSearchOptions = {},
): Promise<BusinessSummary[]> {
  const supabase = getSupabaseClient()
  const normalizedSearch = options.search?.trim() ?? ''
  const categoryId = options.categoryId ?? null
  const businessSelect = 'id, name, category_id, description, address, latitude, longitude'

  let query = supabase
    .from('businesses')
    .select(businessSelect)
    .eq('active', true)
    .eq('verified', true)

  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }

  if (!normalizedSearch) {
    const { data, error } = await query.order('name').limit(50)

    if (error) {
      throw error
    }

    return attachApprovedCoverPhotos((data ?? []) as Omit<BusinessSummary, 'cover_photo_url' | 'cover_photo_alt'>[])
  }

  const searchPattern = toIlikePattern(normalizedSearch)
  const [{ data: serviceRows, error: serviceError }, { data: productRows, error: productError }] =
    await Promise.all([
      supabase
        .from('business_services')
        .select('business_id')
        .eq('active', true)
        .ilike('name', searchPattern)
        .limit(100),
      supabase
        .from('business_products')
        .select('business_id')
        .eq('active', true)
        .ilike('name', searchPattern)
        .limit(100),
    ])

  if (serviceError) {
    throw serviceError
  }

  if (productError) {
    throw productError
  }

  const relatedBusinessIds = Array.from(
    new Set(
      [...(serviceRows ?? []), ...(productRows ?? [])]
        .map((row) => row.business_id)
        .filter((businessId): businessId is string => typeof businessId === 'string' && businessId.length > 0),
    ),
  )

  const quotedSearchPattern = quotePostgrestValue(searchPattern)

  if (relatedBusinessIds.length > 0) {
    query = query.or(
      `name.ilike.${quotedSearchPattern},description.ilike.${quotedSearchPattern},id.in.(${relatedBusinessIds.join(',')})`,
    )
  } else {
    query = query.or(
      `name.ilike.${quotedSearchPattern},description.ilike.${quotedSearchPattern}`,
    )
  }


  const { data, error } = await query.order('name').limit(50)

  if (error) {
    throw error
  }

  return attachApprovedCoverPhotos((data ?? []) as Omit<BusinessSummary, 'cover_photo_url' | 'cover_photo_alt'>[])
}

export async function getMyBusinesses(): Promise<BusinessRecord[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []) as BusinessRecord[]
}

export async function getAdminBusinesses(): Promise<BusinessRecord[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .order('verified', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []) as BusinessRecord[]
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: string): boolean {
  return UUID_REGEX.test(value.trim())
}

export async function getBusinessById(idOrSlug: string): Promise<BusinessRecord> {
  const trimmed = idOrSlug ? idOrSlug.trim() : ''
  if (!trimmed) {
    throw new Error('Business identifier is required.')
  }

  const supabase = getSupabaseClient()
  const isId = isUuid(trimmed)

  const query = supabase.from('businesses').select('*')
  const { data, error } = await (isId ? query.eq('id', trimmed) : query.eq('slug', trimmed)).single()

  if (error) {
    throw error
  }

  return data as BusinessRecord
}

export async function getBusinessBySlug(slug: string): Promise<BusinessRecord> {
  return getBusinessById(slug)
}

export async function getCategoriesForBusinessForm(): Promise<{ id: string; name: string }[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('categories')
    .select('id, name')
    .eq('active', true)
    .order('name')

  if (error) {
    throw error
  }

  return (data ?? []) as { id: string; name: string }[]
}

export async function createBusiness(input: BusinessCreateInput): Promise<void> {
  const supabase = getSupabaseClient()

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError) {
    throw sessionError
  }

  const sessionUserId = sessionData.session?.user.id

  if (!sessionUserId) {
    throw new Error('You must be signed in to create a business.')
  }

  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  const user = userData.user
  const userId = user?.id

  if (!userId) {
    throw new Error('Supabase did not return the authenticated user.')
  }

  if (userId !== sessionUserId) {
    throw new Error('The authenticated session changed. Please retry the business submission.')
  }

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    role: 'customer',
    full_name:
      typeof userData.user?.user_metadata?.['full_name'] === 'string'
        ? userData.user.user_metadata['full_name']
        : null,
    active: true,
  })

  if (profileError) {
    throw withDatabaseContext(profileError, 'Profile synchronization failed')
  }

  const { data: profile, error: profileCheckError } = await supabase
    .from('profiles')
    .select('id, active')
    .eq('id', userId)
    .single()

  if (profileCheckError) {
    throw withDatabaseContext(profileCheckError, 'Profile verification failed')
  }

  if (profile.id !== userId || !profile.active) {
    throw new Error('Your owner profile is not active. Please sign in again and retry.')
  }

  const slug = toBusinessSlug(input.slug || input.name)

  if (!slug) {
    throw new Error('Enter a business name that can be used to create a valid slug.')
  }

  const [{ data: city, error: cityError }, { data: category, error: categoryError }] =
    await Promise.all([
      supabase.from('cities').select('id').eq('id', input.city_id).eq('active', true).maybeSingle(),
      supabase
        .from('categories')
        .select('id')
        .eq('id', input.category_id)
        .eq('active', true)
        .maybeSingle(),
    ])

  if (cityError) {
    throw withDatabaseContext(cityError, 'City verification failed')
  }

  if (categoryError) {
    throw withDatabaseContext(categoryError, 'Category verification failed')
  }

  if (!city || !category) {
    throw new Error('Select an active city and category before creating the business.')
  }

  const { data: currentSessionData, error: currentSessionError } =
    await supabase.auth.getSession()

  if (currentSessionError) {
    throw currentSessionError
  }

  const { data: currentUserData, error: currentUserError } = await supabase.auth.getUser()

  if (currentUserError) {
    throw currentUserError
  }

  const session = currentSessionData.session
  const currentUser = currentUserData.user
  const jwtPayload = decodeJwtPayload(session?.access_token)
  const authUserId = currentUser?.id
  const jwtSubject = typeof jwtPayload?.sub === 'string' ? jwtPayload.sub : undefined
  const allIdsMatch =
    Boolean(userId) &&
    userId === sessionUserId &&
    userId === authUserId &&
    userId === jwtSubject

  const payload = {
    ...input,
    slug,
    owner_id: userId,
  }

  if (import.meta.env.DEV) {
    console.log('[BUSINESS AUTH DEBUG]', {
      sessionUserId,
      authUserId,
      token: session?.access_token ? 'HAS_TOKEN' : 'NO_TOKEN',
      jwtSub: jwtSubject,
      jwtRole: jwtPayload?.role,
      jwtAud: jwtPayload?.aud,
      jwtExpiry: jwtPayload?.exp,
    })
    console.log('[BUSINESS INSERT DEBUG]', {
      ownerId: payload.owner_id,
      sessionUserId,
      authUserId,
      jwtSub: jwtSubject,
      allIdsMatch,
    })
  }

  const { error } = await supabase.from('businesses').insert(payload)

  if (error) {
    if (import.meta.env.DEV) {
      console.log('[BUSINESS INSERT ERROR DEBUG]', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
    }

    throw withDatabaseContext(error, 'Business insert failed')
  }

}

export async function updateBusiness(
  businessId: string,
  input: BusinessUpdateInput,
): Promise<BusinessRecord> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('businesses')
    .update(input)
    .eq('id', businessId)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data as BusinessRecord
}

export async function updateBusinessVisibility(
  businessId: string,
  input: BusinessVisibilityUpdate,
): Promise<BusinessRecord> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('businesses')
    .update(input)
    .eq('id', businessId)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data as BusinessRecord
}

export async function rejectBusiness(
  businessId: string,
  rejectionReason: string,
): Promise<BusinessRecord> {
  const trimmedReason = rejectionReason.trim()
  if (!trimmedReason) {
    throw new Error('A rejection reason is required to reject a business.')
  }

  return updateBusinessVisibility(businessId, {
    active: false,
    verified: false,
    rejection_reason: trimmedReason,
  })
}

export async function deleteBusiness(businessId: string): Promise<void> {
  const supabase = getSupabaseClient()

  const { error } = await supabase.from('businesses').delete().eq('id', businessId)

  if (error) {
    throw error
  }
}
