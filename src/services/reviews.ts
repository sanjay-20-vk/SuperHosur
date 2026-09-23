import { getSupabaseClient } from '../lib/supabase'
import { getCurrentSession, getCurrentUserProfile } from './auth'

export type ReviewModerationStatus = 'pending' | 'approved' | 'rejected'

export type BusinessReview = {
  id: string
  business_id: string
  user_id: string
  author_name: string
  rating: number
  comment: string
  moderation_status?: ReviewModerationStatus
  created_at: string
}

export type AdminBusinessReview = BusinessReview & {
  business_name?: string | null
}

export type ReviewSubmitInput = {
  business_id: string
  rating: number
  comment: string
}

const STORAGE_KEY_PREFIX = 'superhosur_reviews_'

function getLocalReviews(businessId: string): BusinessReview[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${businessId}`)
    return raw ? (JSON.parse(raw) as BusinessReview[]) : []
  } catch {
    return []
  }
}

function getAllLocalReviews(): BusinessReview[] {
  try {
    const results: BusinessReview[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        const raw = localStorage.getItem(key)
        if (raw) {
          const parsed = JSON.parse(raw) as BusinessReview[]
          if (Array.isArray(parsed)) {
            results.push(...parsed)
          }
        }
      }
    }
    return results
  } catch {
    return []
  }
}

function saveLocalReview(review: BusinessReview): void {
  try {
    const existing = getLocalReviews(review.business_id)
    const updated = [review, ...existing.filter((r) => r.id !== review.id)]
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${review.business_id}`, JSON.stringify(updated))
  } catch {
    // Ignore storage errors
  }
}

export function getReviewErrorMessage(error: unknown, fallback = 'Unable to process review.'): string {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}

export async function getBusinessReviews(businessId: string): Promise<BusinessReview[]> {
  const localList = getLocalReviews(businessId).filter(
    (r) => r.moderation_status === 'approved' || r.moderation_status === 'pending' || !r.moderation_status,
  )

  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('business_reviews')
      .select('*, profiles(full_name)')
      .eq('business_id', businessId)
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: false })

    if (error) {
      return localList
    }

    type ReviewWithProfile = BusinessReview & {
      profiles?: { full_name?: string | null } | { full_name?: string | null }[] | null
    }

    const rows = (data ?? []) as ReviewWithProfile[]
    const dbRows: BusinessReview[] = rows.map((r) => {
      const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
      return {
        id: r.id,
        business_id: r.business_id,
        user_id: r.user_id,
        author_name: profile?.full_name?.trim() || r.author_name || 'Verified Customer',
        rating: r.rating,
        comment: r.comment || '',
        moderation_status: r.moderation_status,
        created_at: r.created_at,
      }
    })

    const dbIds = new Set(dbRows.map((r) => r.id))
    const combined = [...dbRows]

    for (const local of localList) {
      if (!dbIds.has(local.id) && local.moderation_status !== 'rejected') {
        combined.push(local)
      }
    }

    return combined.sort((a, b) => b.created_at.localeCompare(a.created_at))
  } catch {
    return localList
  }
}

export async function submitBusinessReview(input: ReviewSubmitInput): Promise<BusinessReview> {
  const session = await getCurrentSession()

  if (!session?.user?.id) {
    throw new Error('Please sign in to submit a review.')
  }

  const rating = Math.round(Number(input.rating))
  if (isNaN(rating) || rating < 1 || rating > 5) {
    throw new Error('Please select a rating between 1 and 5 stars.')
  }

  if (input.comment && input.comment.length > 0 && !input.comment.trim()) {
    throw new Error('Review comment cannot be only whitespace.')
  }

  const comment = input.comment ? input.comment.trim() : ''
  if (comment.length > 0) {
    if (comment.length < 5) {
      throw new Error('Review comment must be at least 5 characters.')
    }
    if (comment.length > 1000) {
      throw new Error('Review comment cannot exceed 1000 characters.')
    }
  }

  const profile = await getCurrentUserProfile().catch(() => null)
  const authorName = profile?.full_name?.trim() || session.user.email?.split('@')[0] || 'Verified Customer'

  const review: BusinessReview = {
    id: crypto.randomUUID(),
    business_id: input.business_id,
    user_id: session.user.id,
    author_name: authorName,
    rating,
    comment,
    moderation_status: 'pending',
    created_at: new Date().toISOString(),
  }

  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('business_reviews')
      .insert({
        id: review.id,
        business_id: review.business_id,
        user_id: review.user_id,
        author_name: review.author_name,
        rating: review.rating,
        comment: review.comment || null,
        moderation_status: 'pending',
      })
      .select('*')
      .single()

    if (error) {
      if (error.message && (error.message.includes('policy') || error.message.includes('row-level security'))) {
        throw new Error('You cannot review your own business listing.')
      }
      throw error
    }

    if (data) {
      review.id = data.id
      review.created_at = data.created_at
      review.moderation_status = data.moderation_status
    }
  } catch (err) {
    if (err instanceof Error && err.message === 'You cannot review your own business listing.') {
      throw err
    }
    // Fall back to local storage if network or offline
  }

  saveLocalReview(review)
  return review
}

export async function getAdminReviewReviews(): Promise<AdminBusinessReview[]> {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('business_reviews')
      .select('*, businesses(name), profiles(full_name)')
      .in('moderation_status', ['pending', 'rejected'])
      .order('created_at', { ascending: false })

    if (error) {
      return getLocalReviewReviews()
    }

    type ReviewEmbed = BusinessReview & {
      businesses?: { name?: string | null } | { name?: string | null }[] | null
      profiles?: { full_name?: string | null } | { full_name?: string | null }[] | null
    }

    const rows = (data ?? []) as ReviewEmbed[]
    const remoteReviews: AdminBusinessReview[] = rows.map((r) => {
      const biz = Array.isArray(r.businesses) ? r.businesses[0] : r.businesses
      const prof = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
      return {
        id: r.id,
        business_id: r.business_id,
        user_id: r.user_id,
        author_name: prof?.full_name?.trim() || r.author_name || 'Verified Customer',
        rating: r.rating,
        comment: r.comment || '',
        moderation_status: r.moderation_status,
        created_at: r.created_at,
        business_name: biz?.name ?? null,
      }
    })

    const remoteIds = new Set(remoteReviews.map((r) => r.id))
    const localReviews = getLocalReviewReviews().filter((r) => !remoteIds.has(r.id))

    return [...remoteReviews, ...localReviews]
  } catch {
    return getLocalReviewReviews()
  }
}

function getLocalReviewReviews(): AdminBusinessReview[] {
  const all = getAllLocalReviews()
  return all
    .filter((r) => r.moderation_status === 'pending' || r.moderation_status === 'rejected')
    .map((r) => ({
      ...r,
      business_name: null,
    }))
}

export async function updateReviewModeration(
  reviewId: string,
  moderationStatus: Extract<ReviewModerationStatus, 'approved' | 'rejected'>,
): Promise<void> {
  const supabase = getSupabaseClient()
  let dbSuccess = false
  let dbError: unknown = null

  try {
    const { error } = await supabase
      .from('business_reviews')
      .update({ moderation_status: moderationStatus })
      .eq('id', reviewId)

    if (error) {
      dbError = error
    } else {
      dbSuccess = true
    }
  } catch (err) {
    dbError = err
  }

  // Update in local storage fallback
  let localFound = false
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        const raw = localStorage.getItem(key)
        if (raw) {
          const parsed = JSON.parse(raw) as BusinessReview[]
          if (Array.isArray(parsed) && parsed.some((r) => r.id === reviewId)) {
            localFound = true
            const updated = parsed.map((r) =>
              r.id === reviewId ? { ...r, moderation_status: moderationStatus } : r,
            )
            localStorage.setItem(key, JSON.stringify(updated))
          }
        }
      }
    }
  } catch {
    // Ignore local storage error
  }

  if (!dbSuccess && !localFound && dbError) {
    throw dbError
  }
}

export async function deleteBusinessReview(reviewId: string): Promise<void> {
  const supabase = getSupabaseClient()
  try {
    await supabase.from('business_reviews').delete().eq('id', reviewId)
  } catch {
    // Ignore db deletion error
  }

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        const raw = localStorage.getItem(key)
        if (raw) {
          const parsed = JSON.parse(raw) as BusinessReview[]
          if (Array.isArray(parsed)) {
            const updated = parsed.filter((r) => r.id !== reviewId)
            localStorage.setItem(key, JSON.stringify(updated))
          }
        }
      }
    }
  } catch {
    // Ignore
  }
}

