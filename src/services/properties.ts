import { getSupabaseClient } from '../lib/supabase'

export const PROPERTY_PHOTOS_BUCKET = 'property-photos'
export const MAX_PROPERTY_PHOTO_BYTES = 5 * 1024 * 1024 // 5 MB
export const MAX_PROPERTY_PHOTOS = 10
export const ALLOWED_PROPERTY_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

const SIGNED_URL_EXPIRES_IN = 60 * 60

export type PropertyType =
  | 'apartment'
  | 'house'
  | 'villa'
  | 'plot'
  | 'commercial'
  | 'office'
  | 'shop'
  | 'warehouse'
  | 'land'
  | 'other'

export type ListingType = 'sale' | 'rent' | 'lease'

export type PropertyPhotoModerationStatus = 'pending' | 'approved' | 'rejected'

export type PropertyRecord = {
  id: string
  owner_id: string
  city_id: string
  title: string
  property_type: PropertyType
  listing_type: ListingType
  bedrooms: number | null
  bathrooms: number | null
  area_sqft: number | null
  price: number | null
  rent: number | null
  deposit: number | null
  description: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  verified: boolean
  active: boolean
  created_at: string
  updated_at: string
  cities?: { name: string } | null
  profiles?: { full_name: string | null; phone?: string | null; email?: string | null } | null
}

export type PropertySummary = PropertyRecord & {
  cover_photo_url: string | null
}

export type PropertyPhoto = {
  id: string
  property_id: string
  storage_path: string
  sort_order: number
  is_primary: boolean
  moderation_status: PropertyPhotoModerationStatus
  created_at: string
}

export type PropertyPhotoWithUrl = PropertyPhoto & {
  url: string | null
}

export type AdminPropertyPhoto = PropertyPhotoWithUrl & {
  property_title: string | null
}

export type CreatePropertyInput = {
  city_id: string
  title: string
  property_type: PropertyType
  listing_type: ListingType
  bedrooms?: number | null
  bathrooms?: number | null
  area_sqft?: number | null
  price?: number | null
  rent?: number | null
  deposit?: number | null
  description?: string | null
  address?: string | null
  latitude?: number | null
  longitude?: number | null
}

export type UpdatePropertyInput = Partial<CreatePropertyInput> & {
  active?: boolean
}

export type PropertyFilterOptions = {
  search?: string
  listingType?: ListingType | 'all'
  propertyType?: PropertyType | 'all'
  cityId?: string | null
  bedrooms?: number | 'all'
  minPrice?: number
  maxPrice?: number
}

function getPhotoExtension(file: File): string {
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  return 'jpg'
}

export function validatePropertyPhotoFile(file: File): string | null {
  if (!ALLOWED_PROPERTY_PHOTO_TYPES.includes(file.type as (typeof ALLOWED_PROPERTY_PHOTO_TYPES)[number])) {
    return 'Choose a JPEG, PNG, or WebP image.'
  }

  if (file.size > MAX_PROPERTY_PHOTO_BYTES) {
    return 'Choose an image smaller than 5 MB.'
  }

  return null
}

export function getPropertyErrorMessage(error: unknown, fallback = 'Unable to save property.'): string {
  if (typeof error === 'object' && error !== null) {
    const err = error as { message?: string; code?: string; details?: string }
    if (err.code === '42501' || (err.message && err.message.toLowerCase().includes('row-level security'))) {
      return 'You do not have permission to perform this action.'
    }
    if (err.message) {
      return err.message
    }
  }
  if (error instanceof Error) {
    return error.message
  }
  return fallback
}

export async function getSignedPropertyPhotoUrlMap(paths: string[]): Promise<Map<string, string>> {
  const uniquePaths = Array.from(new Set(paths.filter((path) => path.trim().length > 0)))
  const urls = new Map<string, string>()

  if (uniquePaths.length === 0) {
    return urls
  }

  const { data, error } = await getSupabaseClient()
    .storage
    .from(PROPERTY_PHOTOS_BUCKET)
    .createSignedUrls(uniquePaths, SIGNED_URL_EXPIRES_IN)

  if (error) {
    throw error
  }

  for (const item of data ?? []) {
    if (item.path && item.signedUrl) {
      urls.set(item.path, item.signedUrl)
    }
  }

  return urls
}

export async function withSignedPropertyUrls(photos: PropertyPhoto[]): Promise<PropertyPhotoWithUrl[]> {
  const urls = await getSignedPropertyPhotoUrlMap(photos.map((photo) => photo.storage_path))

  return photos.map((photo) => ({
    ...photo,
    url: urls.get(photo.storage_path) ?? null,
  }))
}

function sortPropertyPhotos(photos: PropertyPhoto[]): PropertyPhoto[] {
  return [...photos].sort((left, right) => {
    if (left.is_primary !== right.is_primary) {
      return left.is_primary ? -1 : 1
    }
    return left.sort_order - right.sort_order || left.created_at.localeCompare(right.created_at)
  })
}

export async function attachApprovedPropertyCoverPhotos(
  properties: PropertyRecord[],
): Promise<PropertySummary[]> {
  if (properties.length === 0) {
    return []
  }

  const propertyIds = properties.map((property) => property.id)
  const { data, error } = await getSupabaseClient()
    .from('property_photos')
    .select('property_id, storage_path, is_primary, sort_order, created_at')
    .in('property_id', propertyIds)
    .eq('moderation_status', 'approved')

  if (error) {
    throw error
  }

  type CoverPhoto = {
    property_id: string
    storage_path: string
    is_primary: boolean
    sort_order: number
    created_at: string
  }

  const photosByProperty = new Map<string, CoverPhoto>()

  for (const photo of [...((data ?? []) as CoverPhoto[])].sort((left, right) => {
    if (left.is_primary !== right.is_primary) {
      return left.is_primary ? -1 : 1
    }
    return left.sort_order - right.sort_order || left.created_at.localeCompare(right.created_at)
  })) {
    if (!photosByProperty.has(photo.property_id)) {
      photosByProperty.set(photo.property_id, photo)
    }
  }

  const paths = Array.from(photosByProperty.values()).map((photo) => photo.storage_path)
  const urls = await getSignedPropertyPhotoUrlMap(paths)

  return properties.map((prop) => {
    const photo = photosByProperty.get(prop.id)
    return {
      ...prop,
      cover_photo_url: photo ? urls.get(photo.storage_path) ?? null : null,
    }
  })
}

// ----------------------------------------------------
// Public APIs
// ----------------------------------------------------

export async function getPublicProperties(filters: PropertyFilterOptions = {}): Promise<PropertySummary[]> {
  const supabase = getSupabaseClient()

  let query = supabase
    .from('properties')
    .select('*, cities(name)')
    .eq('active', true)
    .eq('verified', true)

  if (filters.listingType && filters.listingType !== 'all') {
    query = query.eq('listing_type', filters.listingType)
  }

  if (filters.propertyType && filters.propertyType !== 'all') {
    query = query.eq('property_type', filters.propertyType)
  }

  if (filters.cityId) {
    query = query.eq('city_id', filters.cityId)
  }

  if (filters.bedrooms && filters.bedrooms !== 'all') {
    const beds = Number(filters.bedrooms)
    if (beds >= 4) {
      query = query.gte('bedrooms', 4)
    } else {
      query = query.eq('bedrooms', beds)
    }
  }

  if (filters.search && filters.search.trim().length > 0) {
    const term = `%${filters.search.trim().replace(/[%_\\]/g, '\\$&')}%`
    query = query.or(`title.ilike."${term}",description.ilike."${term}",address.ilike."${term}"`)
  }

  query = query.order('created_at', { ascending: false }).limit(60)

  const { data, error } = await query

  if (error) {
    throw error
  }

  const records = (data ?? []) as PropertyRecord[]
  return attachApprovedPropertyCoverPhotos(records)
}

export async function getPropertyById(propertyId: string): Promise<PropertyRecord> {
  const supabase = getSupabaseClient()

  // NOTE: profiles is intentionally NOT joined here.
  // The profiles RLS policy only allows SELECT WHERE id = auth.uid(), so joining it
  // inside this query would cause an error for any visitor who is not the property
  // owner (including anonymous users), breaking the entire page load.
  // Owner contact details are fetched separately via getPropertyOwnerContact().
  const { data, error } = await supabase
    .from('properties')
    .select('*, cities(name)')
    .eq('id', propertyId)
    .single()

  if (error) {
    throw error
  }

  return data as PropertyRecord
}

/**
 * Fetches limited public contact fields for the owner of the given property.
 *
 * Uses the get_property_owner_contact SECURITY DEFINER RPC so that:
 *   - The profiles table gains no new SELECT grants or RLS policies.
 *   - Only full_name and phone (the two columns the property contact card needs)
 *     are returned — profiles has no email column (email lives in auth.users).
 *   - The function only returns a row when the property is active.
 *   - Returns null silently on any error so a missing contact card never
 *     prevents the property detail page from loading.
 */
export async function getPropertyOwnerContact(
  propertyId: string,
): Promise<{ full_name: string | null; phone: string | null } | null> {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.rpc('get_property_owner_contact', {
      target_property_id: propertyId,
    })

    if (error || !data || (data as unknown[]).length === 0) {
      return null
    }

    const row = (data as { full_name: string | null; phone: string | null }[])[0]
    return row ?? null
  } catch {
    return null
  }
}

export async function getApprovedPropertyPhotos(propertyId: string): Promise<PropertyPhotoWithUrl[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('property_photos')
    .select('*')
    .eq('property_id', propertyId)
    .eq('moderation_status', 'approved')
    .order('sort_order')
    .order('created_at')

  if (error) {
    throw error
  }

  return withSignedPropertyUrls(sortPropertyPhotos((data ?? []) as PropertyPhoto[]))
}

// ----------------------------------------------------
// Owner APIs
// ----------------------------------------------------

export async function getMyProperties(ownerId: string): Promise<PropertySummary[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('properties')
    .select('*, cities(name)')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  const records = (data ?? []) as PropertyRecord[]
  return attachApprovedPropertyCoverPhotos(records)
}

export async function getOwnerPropertyById(propertyId: string): Promise<PropertyRecord> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('properties')
    .select('*, cities(name)')
    .eq('id', propertyId)
    .single()

  if (error) {
    throw error
  }

  return data as PropertyRecord
}

export async function createProperty(input: CreatePropertyInput, userId: string): Promise<PropertyRecord> {
  const supabase = getSupabaseClient()

  const payload = {
    ...input,
    owner_id: userId,
    verified: false,
    active: true,
  }

  const { data, error } = await supabase
    .from('properties')
    .insert(payload)
    .select('*, cities(name)')
    .single()

  if (error) {
    throw error
  }

  return data as PropertyRecord
}

export async function updateProperty(propertyId: string, input: UpdatePropertyInput): Promise<PropertyRecord> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('properties')
    .update(input)
    .eq('id', propertyId)
    .select('*, cities(name)')
    .single()

  if (error) {
    throw error
  }

  return data as PropertyRecord
}

export async function deleteProperty(propertyId: string): Promise<void> {
  const supabase = getSupabaseClient()

  // First fetch photos to delete storage files
  const { data: photos } = await supabase
    .from('property_photos')
    .select('storage_path')
    .eq('property_id', propertyId)

  const { error } = await supabase
    .from('properties')
    .delete()
    .eq('id', propertyId)

  if (error) {
    throw error
  }

  if (photos && photos.length > 0) {
    const paths = photos.map((p) => p.storage_path)
    await supabase.storage.from(PROPERTY_PHOTOS_BUCKET).remove(paths)
  }
}

export async function getOwnerPropertyPhotos(propertyId: string): Promise<PropertyPhotoWithUrl[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('property_photos')
    .select('*')
    .eq('property_id', propertyId)
    .order('sort_order')
    .order('created_at')

  if (error) {
    throw error
  }

  return withSignedPropertyUrls(sortPropertyPhotos((data ?? []) as PropertyPhoto[]))
}

export async function uploadPropertyPhoto(propertyId: string, file: File): Promise<PropertyPhotoWithUrl> {
  const validationError = validatePropertyPhotoFile(file)
  if (validationError) {
    throw new Error(validationError)
  }

  const existingPhotos = await getOwnerPropertyPhotos(propertyId)
  if (existingPhotos.length >= MAX_PROPERTY_PHOTOS) {
    throw new Error(`You can upload up to ${MAX_PROPERTY_PHOTOS} photos for this property.`)
  }

  const supabase = getSupabaseClient()
  const objectPath = `${propertyId}/${crypto.randomUUID()}.${getPhotoExtension(file)}`
  const nextSortOrder = existingPhotos.reduce((highest, photo) => Math.max(highest, photo.sort_order), -1) + 1

  const { error: uploadError } = await supabase.storage
    .from(PROPERTY_PHOTOS_BUCKET)
    .upload(objectPath, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    throw uploadError
  }

  const { data, error } = await supabase
    .from('property_photos')
    .insert({
      property_id: propertyId,
      storage_path: objectPath,
      sort_order: nextSortOrder,
      is_primary: existingPhotos.length === 0,
    })
    .select('*')
    .single()

  if (error) {
    await supabase.storage.from(PROPERTY_PHOTOS_BUCKET).remove([objectPath])
    throw error
  }

  const [photo] = await withSignedPropertyUrls([data as PropertyPhoto])
  if (!photo) {
    throw new Error('Unable to retrieve uploaded photo.')
  }

  return photo
}

export async function deletePropertyPhoto(photo: PropertyPhoto): Promise<void> {
  const supabase = getSupabaseClient()

  const { error } = await supabase.from('property_photos').delete().eq('id', photo.id)
  if (error) {
    throw error
  }

  const { error: storageError } = await supabase.storage
    .from(PROPERTY_PHOTOS_BUCKET)
    .remove([photo.storage_path])

  if (storageError) {
    throw storageError
  }
}

export async function setPropertyPrimaryPhoto(propertyId: string, photoId: string): Promise<void> {
  const supabase = getSupabaseClient()

  // Unset previous primary
  await supabase
    .from('property_photos')
    .update({ is_primary: false })
    .eq('property_id', propertyId)
    .eq('is_primary', true)

  const { error } = await supabase
    .from('property_photos')
    .update({ is_primary: true })
    .eq('id', photoId)
    .eq('property_id', propertyId)

  if (error) {
    throw error
  }
}

// ----------------------------------------------------
// Admin APIs
// ----------------------------------------------------

export async function getAdminProperties(): Promise<PropertySummary[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('properties')
    .select('*, cities(name), profiles(full_name, phone)')
    .order('verified', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  const records = (data ?? []) as PropertyRecord[]
  return attachApprovedPropertyCoverPhotos(records)
}

export async function updatePropertyVerification(propertyId: string, verified: boolean): Promise<PropertyRecord> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('properties')
    .update({ verified })
    .eq('id', propertyId)
    .select('*, cities(name)')
    .single()

  if (error) {
    throw error
  }

  return data as PropertyRecord
}

export async function updatePropertyActive(propertyId: string, active: boolean): Promise<PropertyRecord> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('properties')
    .update({ active })
    .eq('id', propertyId)
    .select('*, cities(name)')
    .single()

  if (error) {
    throw error
  }

  return data as PropertyRecord
}

export async function getAdminReviewPropertyPhotos(): Promise<AdminPropertyPhoto[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('property_photos')
    .select('*, properties(title)')
    .in('moderation_status', ['pending', 'rejected'])
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  type RawPhoto = PropertyPhoto & { properties?: { title?: string | null } | { title?: string | null }[] | null }
  const rows = (data ?? []) as RawPhoto[]
  const photos = await withSignedPropertyUrls(rows)

  return photos.map((photo, index) => {
    const embed = rows[index]?.properties
    const prop = Array.isArray(embed) ? embed[0] : embed

    return {
      ...photo,
      property_title: prop?.title ?? null,
    }
  })
}

export async function updatePropertyPhotoModeration(
  photoId: string,
  moderationStatus: 'approved' | 'rejected',
): Promise<void> {
  const supabase = getSupabaseClient()

  const { error } = await supabase
    .from('property_photos')
    .update({ moderation_status: moderationStatus })
    .eq('id', photoId)

  if (error) {
    throw error
  }
}
