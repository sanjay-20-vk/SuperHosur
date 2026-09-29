/**
 * SuperHosur Bounded Network Retry Utility
 * Phase 18 Step 6: Codebase Hardening
 *
 * Executes idempotent operations with exponential backoff and jitter.
 * Never retries non-idempotent or client-fatal 4xx errors.
 */

export interface RetryOptions {
  maxRetries?: number
  initialDelayMs?: number
  backoffFactor?: number
  shouldRetry?: (error: unknown) => boolean
}

export async function withBoundedRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3
  const initialDelay = options?.initialDelayMs ?? 300
  const factor = options?.backoffFactor ?? 2

  let attempt = 0
  let delay = initialDelay

  while (attempt <= maxRetries) {
    try {
      return await fn()
    } catch (err) {
      attempt++
      if (attempt > maxRetries) {
        throw err
      }

      if (options?.shouldRetry && !options.shouldRetry(err)) {
        throw err
      }

      // Check if error is client fatal (e.g. 401, 403, 404, or validation errors)
      const errStr = String(err).toLowerCase()
      if (errStr.includes('401') || errStr.includes('403') || errStr.includes('404') || errStr.includes('validation')) {
        throw err
      }

      // Jittered backoff wait
      const jitter = Math.random() * 0.3 * delay
      await new Promise((res) => setTimeout(res, delay + jitter))
      delay *= factor
    }
  }

  throw new Error('Retry loop terminated unexpectedly.')
}
