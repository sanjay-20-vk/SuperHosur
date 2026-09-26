import { getSupabaseClient } from '../lib/supabase'
import type { BusinessSummary } from './businesses'
import { attachApprovedCoverPhotos } from './photos'
import {
  attachApprovedPropertyCoverPhotos,
  type PropertyRecord,
  type PropertySummary,
} from './properties'

export type SavedListingType = 'business' | 'property'

export type SavedListingRecord = {
  id: string
  user_id: string
  business_id: string | null
  property_id: string | null
  created_at: string
}

export type SavedBusinessItem = {
  savedId: string
  savedAt: string
  type: 'business'
  business: BusinessSummary & {
    slug?: string
    verified?: boolean
    active?: boolean
  }
}

export type SavedPropertyItem = {
  savedId: string
  savedAt: string
  type: 'property'
  property: PropertySummary
}

export type SavedListingItem = SavedBusinessItem | SavedPropertyItem

export function getSavedErrorMessage(error: unknown, fallback = 'Unable to update saved listings.'): string {
  if (error instanceof Error && error.message) {
    return error.message
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return fallback
}

/**
 * Returns a lightweight set of IDs saved by the current user.
 * Enables O(1) checks for listing cards without making repeated queries.
 */
export async function getSavedListingIds(): Promise<{ businessIds: Set<string>; propertyIds: Set<string> }> {
  const supabase = getSupabaseClient()
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id

  if (!userId) {
    return { businessIds: new Set(), propertyIds: new Set() }
  }

  const { data, error } = await supabase
    .from('saved_listings')
    .select('business_id, property_id')
    .eq('user_id', userId)

  if (error || !data) {
    return { businessIds: new Set(), propertyIds: new Set() }
  }

  const businessIds = new Set<string>()
  const propertyIds = new Set<string>()

  for (const row of data) {
    if (row.business_id) businessIds.add(row.business_id)
    if (row.property_id) propertyIds.add(row.property_id)
  }

  return { businessIds, propertyIds }
}

/**
 * Checks if a specific business is saved by the current user.
 */
export async function isBusinessSaved(businessId: string): Promise<boolean> {
  const supabase = getSupabaseClient()
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id

  if (!userId) {
    return false
  }

  const { data, error } = await supabase
    .from('saved_listings')
    .select('id')
    .eq('user_id', userId)
    .eq('business_id', businessId)
    .maybeSingle()

  if (error) {
    return false
  }

  return Boolean(data)
}

/**
 * Checks if a specific property is saved by the current user.
 */
export async function isPropertySaved(propertyId: string): Promise<boolean> {
  const supabase = getSupabaseClient()
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id

  if (!userId) {
    return false
  }

  const { data, error } = await supabase
    .from('saved_listings')
    .select('id')
    .eq('user_id', userId)
    .eq('property_id', propertyId)
    .maybeSingle()

  if (error) {
    return false
  }

  return Boolean(data)
}

/**
 * Saves a business for the current authenticated user (idempotent).
 */
export async function saveBusiness(businessId: string): Promise<SavedListingRecord> {
  const supabase = getSupabaseClient()
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id

  if (!userId) {
    throw new Error('Please sign in to save businesses to your favorites.')
  }

  const { data, error } = await supabase
    .from('saved_listings')
    .insert({
      user_id: userId,
      business_id: businessId,
    })
    .select()
    .single()

  if (error) {
    // Unique violation (already saved)
    if (error.code === '23505') {
      const { data: existing } = await supabase
        .from('saved_listings')
        .select('*')
        .eq('user_id', userId)
        .eq('business_id', businessId)
        .single()

      if (existing) {
        return existing as SavedListingRecord
      }
    }
    throw error
  }

  return data as SavedListingRecord
}

/**
 * Removes a business from the current user's saved listings.
 */
export async function unsaveBusiness(businessId: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id

  if (!userId) {
    throw new Error('Please sign in to manage your saved listings.')
  }

  const { error } = await supabase
    .from('saved_listings')
    .delete()
    .eq('user_id', userId)
    .eq('business_id', businessId)

  if (error) {
    throw error
  }
}

/**
 * Saves a property for the current authenticated user (idempotent).
 */
export async function saveProperty(propertyId: string): Promise<SavedListingRecord> {
  const supabase = getSupabaseClient()
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id

  if (!userId) {
    throw new Error('Please sign in to save properties to your favorites.')
  }

  const { data, error } = await supabase
    .from('saved_listings')
    .insert({
      user_id: userId,
      property_id: propertyId,
    })
    .select()
    .single()

  if (error) {
    // Unique violation (already saved)
    if (error.code === '23505') {
      const { data: existing } = await supabase
        .from('saved_listings')
        .select('*')
        .eq('user_id', userId)
        .eq('property_id', propertyId)
        .single()

      if (existing) {
        return existing as SavedListingRecord
      }
    }
    throw error
  }

  return data as SavedListingRecord
}

/**
 * Removes a property from the current user's saved listings.
 */
export async function unsaveProperty(propertyId: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id

  if (!userId) {
    throw new Error('Please sign in to manage your saved listings.')
  }

  const { error } = await supabase
    .from('saved_listings')
    .delete()
    .eq('user_id', userId)
    .eq('property_id', propertyId)

  if (error) {
    throw error
  }
}

/**
 * Removes a saved listing record by its primary key ID.
 */
export async function removeSavedListing(savedId: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id

  if (!userId) {
    throw new Error('Please sign in to manage your saved listings.')
  }

  const { error } = await supabase
    .from('saved_listings')
    .delete()
    .eq('id', savedId)
    .eq('user_id', userId)

  if (error) {
    throw error
  }
}

/**
 * Fetches all saved listings for the current user, resolving both
 * businesses and properties in parallel with their cover photos.
 */
export async function getSavedListings(): Promise<SavedListingItem[]> {
  const supabase = getSupabaseClient()
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id

  if (!userId) {
    return []
  }

  const { data: savedRows, error: savedError } = await supabase
    .from('saved_listings')
    .select('id, user_id, business_id, property_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (savedError) {
    throw savedError
  }

  if (!savedRows || savedRows.length === 0) {
    return []
  }

  const businessIds = savedRows
    .map((r) => r.business_id)
    .filter((id): id is string => Boolean(id))

  const propertyIds = savedRows
    .map((r) => r.property_id)
    .filter((id): id is string => Boolean(id))

  const [businessMap, propertyMap] = await Promise.all([
    (async () => {
      const map = new Map<string, BusinessSummary & { slug?: string; verified?: boolean; active?: boolean }>()
      if (businessIds.length === 0) return map

      const { data: bData, error: bErr } = await supabase
        .from('businesses')
        .select('id, name, slug, category_id, description, address, latitude, longitude, verified, active')
        .in('id', businessIds)

      if (bErr) {
        console.error('Error loading saved businesses:', bErr)
        return map
      }

      if (bData && bData.length > 0) {
        const withPhotos = await attachApprovedCoverPhotos(
          bData as Omit<BusinessSummary, 'cover_photo_url' | 'cover_photo_alt'>[],
        )
        for (const item of withPhotos) {
          map.set(item.id, item)
        }
      }
      return map
    })(),

    (async () => {
      const map = new Map<string, PropertySummary>()
      if (propertyIds.length === 0) return map

      const { data: pData, error: pErr } = await supabase
        .from('properties')
        .select('*, cities(name)')
        .in('id', propertyIds)

      if (pErr) {
        console.error('Error loading saved properties:', pErr)
        return map
      }

      if (pData && pData.length > 0) {
        const withPhotos = await attachApprovedPropertyCoverPhotos(pData as PropertyRecord[])
        for (const item of withPhotos) {
          map.set(item.id, item)
        }
      }
      return map
    })(),
  ])

  const items: SavedListingItem[] = []

  for (const row of savedRows) {
    if (row.business_id) {
      const business = businessMap.get(row.business_id)
      if (business) {
        items.push({
          savedId: row.id,
          savedAt: row.created_at,
          type: 'business',
          business,
        })
      }
    } else if (row.property_id) {
      const property = propertyMap.get(row.property_id)
      if (property) {
        items.push({
          savedId: row.id,
          savedAt: row.created_at,
          type: 'property',
          property,
        })
      }
    }
  }

  return items
}

/**
 * Returns total count of saved listings for the current user.
 */
export async function getSavedListingsCount(): Promise<number> {
  const supabase = getSupabaseClient()
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id

  if (!userId) {
    return 0
  }

  const { count, error } = await supabase
    .from('saved_listings')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (error || typeof count !== 'number') {
    return 0
  }

  return count
}
