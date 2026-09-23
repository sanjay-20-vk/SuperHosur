import { getSupabaseClient } from '../lib/supabase'

export const BUSINESS_PHOTOS_BUCKET = 'business-photos'
export const MAX_BUSINESS_PHOTO_BYTES = 5 * 1024 * 1024
export const MAX_BUSINESS_PHOTOS = 8
export const ALLOWED_BUSINESS_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

const SIGNED_URL_EXPIRES_IN = 60 * 60

export type PhotoModerationStatus = 'pending' | 'approved' | 'rejected'

export type BusinessPhoto = {
  id: string
  business_id: string
  storage_path: string
  alt_text: string | null
  sort_order: number
  is_primary: boolean
  moderation_status: PhotoModerationStatus
  created_at: string
}

export type BusinessPhotoWithUrl = BusinessPhoto & {
  url: string | null
}

export type AdminBusinessPhoto = BusinessPhotoWithUrl & {
  business_name: string | null
}

type PhotoBusinessEmbed = {
  name?: string | null
}

function getPhotoExtension(file: File): string {
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  return 'jpg'
}

export function getPhotoErrorMessage(error: unknown, fallback = 'Unable to update business photos.'): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}

export function validateBusinessPhotoFile(file: File): string | null {
  if (!ALLOWED_BUSINESS_PHOTO_TYPES.includes(file.type as (typeof ALLOWED_BUSINESS_PHOTO_TYPES)[number])) {
    return 'Choose a JPEG, PNG, or WebP image.'
  }

  if (file.size > MAX_BUSINESS_PHOTO_BYTES) {
    return 'Choose an image smaller than 5 MB.'
  }

  return null
}

export async function getSignedPhotoUrlMap(paths: string[]): Promise<Map<string, string>> {
  const uniquePaths = Array.from(new Set(paths.filter((path) => path.trim().length > 0)))
  const urls = new Map<string, string>()

  if (uniquePaths.length === 0) {
    return urls
  }

  const { data, error } = await getSupabaseClient()
    .storage
    .from(BUSINESS_PHOTOS_BUCKET)
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

async function withSignedUrls(photos: BusinessPhoto[]): Promise<BusinessPhotoWithUrl[]> {
  const urls = await getSignedPhotoUrlMap(photos.map((photo) => photo.storage_path))

  return photos.map((photo) => ({
    ...photo,
    url: urls.get(photo.storage_path) ?? null,
  }))
}

function sortPhotos(photos: BusinessPhoto[]): BusinessPhoto[] {
  return [...photos].sort((left, right) => {
    if (left.is_primary !== right.is_primary) {
      return left.is_primary ? -1 : 1
    }

    return left.sort_order - right.sort_order || left.created_at.localeCompare(right.created_at)
  })
}

export async function getOwnerBusinessPhotos(businessId: string): Promise<BusinessPhotoWithUrl[]> {
  const { data, error } = await getSupabaseClient()
    .from('business_photos')
    .select('*')
    .eq('business_id', businessId)
    .order('sort_order')
    .order('created_at')

  if (error) {
    throw error
  }

  return withSignedUrls(sortPhotos((data ?? []) as BusinessPhoto[]))
}

export async function getApprovedBusinessPhotos(businessId: string): Promise<BusinessPhotoWithUrl[]> {
  const { data, error } = await getSupabaseClient()
    .from('business_photos')
    .select('*')
    .eq('business_id', businessId)
    .eq('moderation_status', 'approved')
    .order('sort_order')
    .order('created_at')

  if (error) {
    throw error
  }

  return withSignedUrls(sortPhotos((data ?? []) as BusinessPhoto[]))
}

export async function attachApprovedCoverPhotos<T extends { id: string }>(
  businesses: T[],
): Promise<(T & { cover_photo_url: string | null; cover_photo_alt: string | null })[]> {
  if (businesses.length === 0) {
    return businesses.map((business) => ({
      ...business,
      cover_photo_url: null,
      cover_photo_alt: null,
    }))
  }

  const { data, error } = await getSupabaseClient()
    .from('business_photos')
    .select('business_id, storage_path, alt_text, is_primary, sort_order, created_at')
    .in('business_id', businesses.map((business) => business.id))
    .eq('moderation_status', 'approved')

  if (error) {
    throw error
  }

  type CoverPhoto = {
    business_id: string
    storage_path: string
    alt_text: string | null
    is_primary: boolean
    sort_order: number
    created_at: string
  }

  const photosByBusiness = new Map<string, CoverPhoto>()

  for (const photo of [...((data ?? []) as CoverPhoto[])].sort((left, right) => {
    if (left.is_primary !== right.is_primary) {
      return left.is_primary ? -1 : 1
    }

    return left.sort_order - right.sort_order || left.created_at.localeCompare(right.created_at)
  })) {
    if (!photosByBusiness.has(photo.business_id)) {
      photosByBusiness.set(photo.business_id, photo)
    }
  }

  const urls = await getSignedPhotoUrlMap(
    Array.from(photosByBusiness.values()).map((photo) => photo.storage_path),
  )

  return businesses.map((business) => {
    const photo = photosByBusiness.get(business.id)

    return {
      ...business,
      cover_photo_url: photo ? urls.get(photo.storage_path) ?? null : null,
      cover_photo_alt: photo?.alt_text ?? null,
    }
  })
}

export async function uploadBusinessPhoto(businessId: string, file: File): Promise<BusinessPhotoWithUrl> {
  const validationError = validateBusinessPhotoFile(file)

  if (validationError) {
    throw new Error(validationError)
  }

  const existingPhotos = await getOwnerBusinessPhotos(businessId)

  if (existingPhotos.length >= MAX_BUSINESS_PHOTOS) {
    throw new Error(`You can upload up to ${MAX_BUSINESS_PHOTOS} photos for this business.`)
  }

  const supabase = getSupabaseClient()
  const objectPath = `${businessId}/${crypto.randomUUID()}.${getPhotoExtension(file)}`
  const nextSortOrder = existingPhotos.reduce(
    (highest, photo) => Math.max(highest, photo.sort_order),
    -1,
  ) + 1

  const { error: uploadError } = await supabase.storage
    .from(BUSINESS_PHOTOS_BUCKET)
    .upload(objectPath, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    throw uploadError
  }

  const { data, error } = await supabase
    .from('business_photos')
    .insert({
      business_id: businessId,
      storage_path: objectPath,
      alt_text: file.name.replace(/\.[^.]+$/, ''),
      sort_order: nextSortOrder,
      is_primary: existingPhotos.length === 0,
    })
    .select('*')
    .single()

  if (error) {
    await supabase.storage.from(BUSINESS_PHOTOS_BUCKET).remove([objectPath])
    throw error
  }

  const [photo] = await withSignedUrls([data as BusinessPhoto])

  if (!photo) {
    throw new Error('Unable to retrieve uploaded photo.')
  }

  return photo
}

export async function deleteBusinessPhoto(photo: BusinessPhoto): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('business_photos').delete().eq('id', photo.id)

  if (error) {
    throw error
  }

  const { error: storageError } = await supabase.storage
    .from(BUSINESS_PHOTOS_BUCKET)
    .remove([photo.storage_path])

  if (storageError) {
    throw storageError
  }
}

export async function getAdminReviewPhotos(): Promise<AdminBusinessPhoto[]> {
  const { data, error } = await getSupabaseClient()
    .from('business_photos')
    .select('*, businesses(name)')
    .in('moderation_status', ['pending', 'rejected'])
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  const rows = (data ?? []) as Array<BusinessPhoto & { businesses?: PhotoBusinessEmbed | PhotoBusinessEmbed[] | null }>
  const photos = await withSignedUrls(rows)

  return photos.map((photo, index) => {
    const embed = rows[index]?.businesses
    const business = Array.isArray(embed) ? embed[0] : embed

    return {
      ...photo,
      business_name: business?.name ?? null,
    }
  })
}

export async function updatePhotoModeration(
  photoId: string,
  moderationStatus: Extract<PhotoModerationStatus, 'approved' | 'rejected'>,
): Promise<void> {
  const { error } = await getSupabaseClient()
    .from('business_photos')
    .update({ moderation_status: moderationStatus })
    .eq('id', photoId)

  if (error) {
    throw error
  }
}
