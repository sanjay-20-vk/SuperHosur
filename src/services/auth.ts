import { getSupabaseClient } from '../lib/supabase'

export type SignUpInput = {
  email: string
  password: string
  fullName?: string
}

export type SignInInput = {
  email: string
  password: string
}

export type UserProfile = {
  id: string
  role: 'customer' | 'vendor' | 'admin'
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  active: boolean
}

export type SignUpResult = {
  userId: string | null
  requiresEmailConfirmation: boolean
}

type AuthErrorLike = {
  message?: unknown
  code?: unknown
  status?: unknown
  name?: unknown
}

function getErrorDetails(error: unknown): AuthErrorLike {
  return typeof error === 'object' && error !== null
    ? (error as AuthErrorLike)
    : {}
}

export function getAuthErrorMessage(error: unknown): string {
  const details = getErrorDetails(error)
  const message = typeof details.message === 'string' ? details.message : ''
  const normalizedMessage = message.toLowerCase()
  const code = typeof details.code === 'string' ? details.code.toLowerCase() : ''

  if (code === 'user_already_exists' || normalizedMessage.includes('already registered')) {
    return 'An account with this email already exists. Sign in instead.'
  }

  if (
    normalizedMessage.includes('invalid email') ||
    normalizedMessage.includes('unable to validate email')
  ) {
    return 'Enter a valid email address.'
  }

  if (
    normalizedMessage.includes('password') &&
    (normalizedMessage.includes('weak') ||
      normalizedMessage.includes('short') ||
      normalizedMessage.includes('characters') ||
      normalizedMessage.includes('at least'))
  ) {
    return `Password rejected by Supabase: ${message}`
  }

  if (
    normalizedMessage.includes('email confirmation') ||
    normalizedMessage.includes('confirm your email')
  ) {
    return 'Account created. Check your email to confirm the account before signing in.'
  }

  if (
    normalizedMessage.includes('failed to fetch') ||
    normalizedMessage.includes('network') ||
    normalizedMessage.includes('fetch')
  ) {
    return 'Unable to reach Supabase. Check your internet connection and Supabase URL.'
  }

  if (
    normalizedMessage.includes('supabase is not configured') ||
    normalizedMessage.includes('invalid api key') ||
    normalizedMessage.includes('invalid jwt') ||
    normalizedMessage.includes('apikey')
  ) {
    return 'Supabase configuration is invalid. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  }

  if (
    normalizedMessage.includes('rate limit') ||
    normalizedMessage.includes('too many requests')
  ) {
    return 'Too many requests. Please wait a few minutes before requesting another reset email.'
  }

  if (
    normalizedMessage.includes('token has expired') ||
    normalizedMessage.includes('otp_expired') ||
    normalizedMessage.includes('invalid link') ||
    normalizedMessage.includes('expired')
  ) {
    return 'Your password reset link has expired or is invalid. Please request a new one.'
  }

  if (message) {
    return message
  }

  return 'Authentication failed. Please try again.'
}

export async function signUpWithEmail({
  email,
  password,
  fullName,
}: SignUpInput): Promise<SignUpResult> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName ?? '',
      },
    },
  })

  if (error) {
    throw error
  }

  const userId = data.user?.id ?? null

  if (!userId) {
    return {
      userId: null,
      requiresEmailConfirmation: false,
    }
  }

  if (data.session) {
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      role: 'customer',
      full_name: fullName ?? null,
      active: true,
    })

    if (profileError) {
      throw profileError
    }
  }

  return {
    userId,
    requiresEmailConfirmation: !data.session,
  }
}

export async function signInWithEmail({
  email,
  password,
}: SignInInput): Promise<void> {
  const supabase = getSupabaseClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw error
  }
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    throw error
  }
}

export async function getCurrentSession() {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase.auth.getSession()

  if (error) {
    throw error
  }

  return data.session
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, full_name, phone, avatar_url, active')
    .eq('id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }

    throw error
  }

  return data as UserProfile
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const supabase = getSupabaseClient()

  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id

  if (!userId) {
    return null
  }

  return getUserProfile(userId)
}

export type UpdateProfileInput = {
  full_name?: string | null
  phone?: string | null
  avatar_url?: string | null
}

export const PROFILE_PHONE_REGEX = /^(?:\+91|91)?[6-9]\d{9}$/
export const PROFILE_NAME_REGEX = /^[a-zA-Z\s.'-]+$/

export function validateProfileInput(input: UpdateProfileInput): string | null {
  if (input.full_name !== undefined) {
    if (!input.full_name || input.full_name.trim().length === 0) {
      return input.full_name && input.full_name.length > 0
        ? 'Full name cannot be only whitespace.'
        : 'Full name is required.'
    }
    const trimmed = input.full_name.trim()
    if (trimmed.length < 2 || trimmed.length > 70) {
      return 'Full name must be between 2 and 70 characters.'
    }
    if (!PROFILE_NAME_REGEX.test(trimmed)) {
      return 'Full name can only contain letters and spaces.'
    }
  }

  if (input.phone !== undefined && input.phone !== null) {
    if (input.phone.length > 0 && !input.phone.trim()) {
      return 'Phone number cannot be only whitespace.'
    }
    const trimmed = input.phone.trim()
    if (trimmed.length > 0) {
      const cleaned = trimmed.replace(/[\s\-()]+/g, '')
      if (!PROFILE_PHONE_REGEX.test(cleaned)) {
        return 'Enter a valid 10-digit Indian phone number (e.g. 9876543210 or +919876543210).'
      }
    }
  }

  return null
}

export async function updateCurrentUserProfile(input: UpdateProfileInput): Promise<UserProfile> {
  const supabase = getSupabaseClient()
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError) {
    throw sessionError
  }

  const userId = sessionData.session?.user.id
  if (!userId) {
    throw new Error('Please sign in to update your profile.')
  }

  const validationError = validateProfileInput(input)
  if (validationError) {
    throw new Error(validationError)
  }

  const payload: {
    full_name?: string | null
    phone?: string | null
    avatar_url?: string | null
  } = {}
  if (input.full_name !== undefined) {
    payload.full_name = input.full_name ? input.full_name.trim() : null
  }
  if (input.phone !== undefined) {
    payload.phone = input.phone ? input.phone.trim() : null
  }
  if (input.avatar_url !== undefined) {
    payload.avatar_url = input.avatar_url ? input.avatar_url.trim() : null
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select('id, role, full_name, phone, avatar_url, active')
    .single()

  if (error) {
    throw error
  }

  if (input.full_name) {
    try {
      await supabase.auth.updateUser({
        data: { full_name: input.full_name.trim() },
      })
    } catch {
      // Non-fatal if metadata update fails
    }
  }

  return data as UserProfile
}

export async function requestPasswordReset(
  email: string,
  redirectTo?: string,
): Promise<void> {
  const supabase = getSupabaseClient()
  const trimmedEmail = email.trim()

  if (!trimmedEmail) {
    throw new Error('Please enter your registered email address.')
  }

  const defaultRedirect = typeof window !== 'undefined'
    ? `${window.location.origin}/auth/reset-password`
    : undefined

  const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
    redirectTo: redirectTo || defaultRedirect,
  })

  if (error) {
    throw error
  }
}

export async function updateUserPassword(newPassword: string): Promise<void> {
  const supabase = getSupabaseClient()

  if (!newPassword || newPassword.length < 6) {
    throw new Error('Password must be at least 6 characters long.')
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    throw error
  }
}

export async function handlePasswordRecoveryRedirect(): Promise<{
  isRecovery: boolean
  error?: string
}> {
  if (typeof window === 'undefined') {
    return { isRecovery: false }
  }

  const supabase = getSupabaseClient()

  // 1. Check URL hash parameters (default Supabase implicit flow)
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.substring(1)
    : window.location.hash
  const hashParams = new URLSearchParams(hash)

  // 2. Check query string parameters (PKCE or server redirects)
  const searchParams = new URLSearchParams(window.location.search)

  const errorDesc =
    hashParams.get('error_description') ||
    searchParams.get('error_description') ||
    hashParams.get('error') ||
    searchParams.get('error')

  if (errorDesc) {
    const errorCode = hashParams.get('error_code') || searchParams.get('error_code')
    if (
      errorCode === 'otp_expired' ||
      errorDesc.toLowerCase().includes('expired') ||
      errorDesc.toLowerCase().includes('invalid')
    ) {
      return {
        isRecovery: false,
        error: 'Your password reset link has expired or is invalid. Please request a new link.',
      }
    }

    return {
      isRecovery: false,
      error: decodeURIComponent(errorDesc.replace(/\+/g, ' ')),
    }
  }

  // 3. Handle PKCE authorization code if present
  const code = searchParams.get('code')
  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (exchangeError) {
      return {
        isRecovery: false,
        error: getAuthErrorMessage(exchangeError),
      }
    }
    return { isRecovery: true }
  }

  // 4. Check if we have an active session
  const { data: sessionData } = await supabase.auth.getSession()
  if (sessionData.session) {
    return { isRecovery: true }
  }

  // 5. If hash contains recovery markers
  if (hashParams.get('type') === 'recovery' || hashParams.get('access_token')) {
    return { isRecovery: true }
  }

  return {
    isRecovery: false,
    error: 'No active password recovery session found. Please request a new reset link.',
  }
}

