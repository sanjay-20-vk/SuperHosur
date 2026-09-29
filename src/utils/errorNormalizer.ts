import { generateCorrelationId } from '../utils/correlation'

export interface StandardizedError {
  code: string
  message: string
  userMessage: string
  correlationId: string
  isRecoverable: boolean
}

/**
 * Standardize Supabase or network exceptions into user-safe diagnostic formats
 * without exposing internal database schemas or server errors.
 */
export function normalizeAppError(error: unknown, fallbackMessage?: string): StandardizedError {
  const correlationId = generateCorrelationId('err')
  const rawMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error'
  const lower = rawMessage.toLowerCase()

  let code = 'INTERNAL_ERROR'
  let userMessage = fallbackMessage || 'Something went wrong. Please try again.'
  let isRecoverable = true

  if (lower.includes('rate limit') || lower.includes('p0001') || lower.includes('429')) {
    code = 'RATE_LIMITED'
    userMessage = 'Too many requests. Please wait a moment before trying again.'
  } else if (lower.includes('jwt') || lower.includes('unauthorized') || lower.includes('42501') || lower.includes('auth')) {
    code = 'UNAUTHORIZED'
    userMessage = 'Authentication required or session expired. Please sign in.'
    isRecoverable = false
  } else if (lower.includes('network') || lower.includes('failed to fetch') || lower.includes('timeout')) {
    code = 'NETWORK_ERROR'
    userMessage = 'Network connection issue. Please check your internet connection.'
  } else if (lower.includes('not found') || lower.includes('404')) {
    code = 'NOT_FOUND'
    userMessage = 'The requested item or listing could not be found.'
  } else if (lower.includes('duplicate') || lower.includes('unique constraint') || lower.includes('already exists')) {
    code = 'CONFLICT'
    userMessage = 'This record or action already exists.'
  } else if (lower.includes('signature') || lower.includes('verification failed')) {
    code = 'INVALID_SIGNATURE'
    userMessage = 'Security validation failed. Please try again.'
  }

  return {
    code,
    message: rawMessage,
    userMessage,
    correlationId,
    isRecoverable,
  }
}
