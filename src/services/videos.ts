import { getSupabaseClient } from '../lib/supabase'

export const BUSINESS_VIDEOS_BUCKET = 'business-videos'
export const MAX_BUSINESS_VIDEO_BYTES = 50 * 1024 * 1024 // 50 MB
export const MAX_BUSINESS_VIDEOS = 5
export const ALLOWED_BUSINESS_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
] as const

const SIGNED_URL_EXPIRES_IN = 60 * 60
const STORAGE_KEY_PREFIX = 'superhosur_videos_'

export type VideoModerationStatus = 'pending' | 'approved' | 'rejected'

export type BusinessVideo = {
  id: string
  business_id: string
  storage_path: string
  thumbnail_path: string | null
  duration_seconds: number | null
  is_featured: boolean
  moderation_status: VideoModerationStatus
  created_at: string
  updated_at?: string
}

export type BusinessVideoWithUrl = BusinessVideo & {
  url: string | null
}

export type AdminBusinessVideo = BusinessVideoWithUrl & {
  business_name: string | null
}

export type VideoUploadOptions = {
  isFeatured?: boolean
  durationSeconds?: number
}

function getVideoExtension(file: File): string {
  if (file.type === 'video/webm') return 'webm'
  if (file.type === 'video/ogg') return 'ogv'
  if (file.type === 'video/quicktime') return 'mov'
  return 'mp4'
}

export function getVideoErrorMessage(error: unknown, fallback = 'Unable to update business videos.'): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}

export function validateBusinessVideoFile(file: File): string | null {
  const isAllowedType = ALLOWED_BUSINESS_VIDEO_TYPES.some((type) => type === file.type)

  if (!isAllowedType) {
    return 'Choose an MP4, WebM, OGG, or MOV video file.'
  }

  if (file.size > MAX_BUSINESS_VIDEO_BYTES) {
    return `Choose a video file smaller than ${Math.round(MAX_BUSINESS_VIDEO_BYTES / (1024 * 1024))} MB.`
  }

  return null
}

function getLocalVideos(businessId: string): BusinessVideoWithUrl[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${businessId}`)
    return raw ? (JSON.parse(raw) as BusinessVideoWithUrl[]) : []
  } catch {
    return []
  }
}

function saveLocalVideos(businessId: string, videos: BusinessVideoWithUrl[]): void {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${businessId}`, JSON.stringify(videos))
  } catch {
    // Ignore storage errors
  }
}

export async function getSignedVideoUrlMap(paths: string[]): Promise<Map<string, string>> {
  const uniquePaths = Array.from(new Set(paths.filter((path) => path.trim().length > 0)))
  const urls = new Map<string, string>()

  if (uniquePaths.length === 0) {
    return urls
  }

  const storagePathsToSign: string[] = []

  for (const path of uniquePaths) {
    if (
      path.startsWith('http://') ||
      path.startsWith('https://') ||
      path.startsWith('blob:') ||
      path.startsWith('data:')
    ) {
      urls.set(path, path)
    } else {
      storagePathsToSign.push(path)
    }
  }

  if (storagePathsToSign.length > 0) {
    try {
      const { data, error } = await getSupabaseClient()
        .storage
        .from(BUSINESS_VIDEOS_BUCKET)
        .createSignedUrls(storagePathsToSign, SIGNED_URL_EXPIRES_IN)

      if (!error && data) {
        for (const item of data) {
          if (item.path && item.signedUrl) {
            urls.set(item.path, item.signedUrl)
          }
        }
      }
    } catch {
      // Fall back to public URL resolution if signed URL endpoint fails
      for (const path of storagePathsToSign) {
        const { data } = getSupabaseClient().storage.from(BUSINESS_VIDEOS_BUCKET).getPublicUrl(path)
        if (data?.publicUrl) {
          urls.set(path, data.publicUrl)
        }
      }
    }
  }

  return urls
}

async function withSignedUrls(videos: BusinessVideo[]): Promise<BusinessVideoWithUrl[]> {
  const urls = await getSignedVideoUrlMap(videos.map((v) => v.storage_path))

  return videos.map((video) => ({
    ...video,
    url: urls.get(video.storage_path) ?? null,
  }))
}

function sortVideos(videos: BusinessVideoWithUrl[]): BusinessVideoWithUrl[] {
  return [...videos].sort((left, right) => {
    if (left.is_featured !== right.is_featured) {
      return left.is_featured ? -1 : 1
    }

    return right.created_at.localeCompare(left.created_at)
  })
}

export async function getApprovedBusinessVideos(businessId: string): Promise<BusinessVideoWithUrl[]> {
  const localList = getLocalVideos(businessId).filter(
    (v) => v.moderation_status === 'approved' || v.moderation_status === 'pending',
  )

  try {
    const { data, error } = await getSupabaseClient()
      .from('business_videos')
      .select('*')
      .eq('business_id', businessId)
      .eq('moderation_status', 'approved')
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      return sortVideos(localList)
    }

    const dbVideos = (data ?? []) as BusinessVideo[]
    const withUrls = await withSignedUrls(dbVideos)

    const dbIds = new Set(withUrls.map((v) => v.id))
    const combined = [...withUrls]

    for (const local of localList) {
      if (!dbIds.has(local.id)) {
        combined.push(local)
      }
    }

    return sortVideos(combined)
  } catch {
    return sortVideos(localList)
  }
}

export async function getOwnerBusinessVideos(businessId: string): Promise<BusinessVideoWithUrl[]> {
  const localList = getLocalVideos(businessId)

  try {
    const { data, error } = await getSupabaseClient()
      .from('business_videos')
      .select('*')
      .eq('business_id', businessId)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      return sortVideos(localList)
    }

    const dbVideos = (data ?? []) as BusinessVideo[]
    const withUrls = await withSignedUrls(dbVideos)

    const dbIds = new Set(withUrls.map((v) => v.id))
    const combined = [...withUrls]

    for (const local of localList) {
      if (!dbIds.has(local.id)) {
        combined.push(local)
      }
    }

    return sortVideos(combined)
  } catch {
    return sortVideos(localList)
  }
}

export async function uploadBusinessVideo(
  businessId: string,
  file: File,
  options?: VideoUploadOptions,
): Promise<BusinessVideoWithUrl> {
  const validationError = validateBusinessVideoFile(file)

  if (validationError) {
    throw new Error(validationError)
  }

  const existingVideos = await getOwnerBusinessVideos(businessId)

  if (existingVideos.length >= MAX_BUSINESS_VIDEOS) {
    throw new Error(`You can upload up to ${MAX_BUSINESS_VIDEOS} videos for this business.`)
  }

  const supabase = getSupabaseClient()
  const fileExt = getVideoExtension(file)
  const objectPath = `${businessId}/${crypto.randomUUID()}.${fileExt}`
  const isFirst = existingVideos.length === 0
  const isFeatured = options?.isFeatured ?? isFirst

  let directUrl: string | null = null

  // Try uploading to Supabase Storage
  try {
    const { error: uploadError } = await supabase.storage
      .from(BUSINESS_VIDEOS_BUCKET)
      .upload(objectPath, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      // If remote bucket is not configured yet, create object URL for in-session preview
      directUrl = URL.createObjectURL(file)
    }
  } catch {
    directUrl = URL.createObjectURL(file)
  }

  const newVideoId = crypto.randomUUID()
  const newVideoRecord: BusinessVideo = {
    id: newVideoId,
    business_id: businessId,
    storage_path: objectPath,
    thumbnail_path: null,
    duration_seconds: options?.durationSeconds ?? null,
    is_featured: isFeatured,
    moderation_status: 'pending',
    created_at: new Date().toISOString(),
  }

  // Attempt database insert
  let insertedVideo: BusinessVideo = newVideoRecord

  try {
    if (isFeatured && existingVideos.some((v) => v.is_featured)) {
      // Clear previous featured video in remote DB
      await supabase
        .from('business_videos')
        .update({ is_featured: false })
        .eq('business_id', businessId)
    }

    const { data, error } = await supabase
      .from('business_videos')
      .insert({
        id: newVideoRecord.id,
        business_id: businessId,
        storage_path: newVideoRecord.storage_path,
        thumbnail_path: newVideoRecord.thumbnail_path,
        duration_seconds: newVideoRecord.duration_seconds,
        is_featured: newVideoRecord.is_featured,
        moderation_status: newVideoRecord.moderation_status,
      })
      .select('*')
      .single()

    if (!error && data) {
      insertedVideo = data as BusinessVideo
    }
  } catch {
    // Database insert fallback to local record
  }

  let finalUrl = directUrl
  if (!finalUrl) {
    const urls = await getSignedVideoUrlMap([insertedVideo.storage_path])
    finalUrl = urls.get(insertedVideo.storage_path) ?? null
  }

  const createdVideoWithUrl: BusinessVideoWithUrl = {
    ...insertedVideo,
    url: finalUrl,
  }

  // Update local storage fallback
  const localExisting = getLocalVideos(businessId).map((v) => ({
    ...v,
    is_featured: isFeatured ? false : v.is_featured,
  }))

  saveLocalVideos(businessId, [createdVideoWithUrl, ...localExisting])

  return createdVideoWithUrl
}

export async function deleteBusinessVideo(video: BusinessVideo): Promise<void> {
  const supabase = getSupabaseClient()

  try {
    await supabase.from('business_videos').delete().eq('id', video.id)
  } catch {
    // Continue with storage & local deletion
  }

  try {
    await supabase.storage.from(BUSINESS_VIDEOS_BUCKET).remove([video.storage_path])
  } catch {
    // Ignore storage deletion errors
  }

  const localVideos = getLocalVideos(video.business_id).filter((v) => v.id !== video.id)
  saveLocalVideos(video.business_id, localVideos)
}

export async function setFeaturedBusinessVideo(businessId: string, videoId: string): Promise<void> {
  const supabase = getSupabaseClient()

  try {
    // Clear all featured videos for this business
    await supabase
      .from('business_videos')
      .update({ is_featured: false })
      .eq('business_id', businessId)

    // Set selected video as featured
    await supabase
      .from('business_videos')
      .update({ is_featured: true })
      .eq('id', videoId)
  } catch {
    // Continue with local update
  }

  const localVideos = getLocalVideos(businessId).map((v) => ({
    ...v,
    is_featured: v.id === videoId,
  }))
  saveLocalVideos(businessId, localVideos)
}

type VideoBusinessEmbed = {
  name?: string | null
}

function getAllLocalVideos(): BusinessVideoWithUrl[] {
  try {
    const results: BusinessVideoWithUrl[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        const raw = localStorage.getItem(key)
        if (raw) {
          const parsed = JSON.parse(raw) as BusinessVideoWithUrl[]
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

function getLocalReviewVideos(): AdminBusinessVideo[] {
  const all = getAllLocalVideos()
  return all
    .filter((v) => v.moderation_status === 'pending' || v.moderation_status === 'rejected')
    .map((v) => ({
      ...v,
      business_name: null,
    }))
}

export async function getAdminReviewVideos(): Promise<AdminBusinessVideo[]> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('business_videos')
      .select('*, businesses(name)')
      .in('moderation_status', ['pending', 'rejected'])
      .order('created_at', { ascending: false })

    if (error) {
      return getLocalReviewVideos()
    }

    const rows = (data ?? []) as Array<BusinessVideo & { businesses?: VideoBusinessEmbed | VideoBusinessEmbed[] | null }>
    const withUrls = await withSignedUrls(rows)
    const remoteVideos: AdminBusinessVideo[] = withUrls.map((video, index) => {
      const embed = rows[index]?.businesses
      const business = Array.isArray(embed) ? embed[0] : embed
      return {
        ...video,
        business_name: business?.name ?? null,
      }
    })

    const remoteIds = new Set(remoteVideos.map((v) => v.id))
    const localVideos = getLocalReviewVideos().filter((v) => !remoteIds.has(v.id))

    return [...remoteVideos, ...localVideos]
  } catch {
    return getLocalReviewVideos()
  }
}

export async function updateVideoModeration(
  videoId: string,
  moderationStatus: Extract<VideoModerationStatus, 'approved' | 'rejected'>,
): Promise<void> {
  const supabase = getSupabaseClient()
  let dbSuccess = false
  let dbError: unknown = null

  try {
    const { error } = await supabase
      .from('business_videos')
      .update({ moderation_status: moderationStatus })
      .eq('id', videoId)

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
          const parsed = JSON.parse(raw) as BusinessVideoWithUrl[]
          if (Array.isArray(parsed) && parsed.some((v) => v.id === videoId)) {
            localFound = true
            const updated = parsed.map((v) =>
              v.id === videoId ? { ...v, moderation_status: moderationStatus } : v,
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

