/**
 * SuperHosur Sensitive Data Redaction Utility
 * Phase 18 Step 6: Codebase Hardening, Monitoring & Production Observability
 *
 * Recursively strips/masks secrets, tokens, credentials, and passwords
 * from metadata and logs prior to serialization or storage.
 */

const SENSITIVE_KEYS = new Set([
  'password',
  'passwd',
  'token',
  'access_token',
  'refresh_token',
  'secret',
  'api_key',
  'apikey',
  'service_role_key',
  'service_role',
  'razorpay_key_secret',
  'razorpay_webhook_secret',
  'resend_api_key',
  'whatsapp_access_token',
  'authorization',
  'cvv',
  'pin',
  'upi_pin',
  'card_number',
  'credit_card',
])

export function redactSensitiveData<T>(input: T): T {
  if (input === null || input === undefined) {
    return input
  }

  if (typeof input === 'string') {
    // Mask potential JWT tokens or Bearer tokens in raw strings
    if (input.startsWith('Bearer ') || input.includes('eyJhbGciOi')) {
      return '[REDACTED_TOKEN]' as unknown as T
    }
    return input
  }

  if (Array.isArray(input)) {
    return input.map((item) => redactSensitiveData(item)) as unknown as T
  }

  if (typeof input === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase()
      if (SENSITIVE_KEYS.has(lowerKey)) {
        result[key] = '[REDACTED]'
      } else if (typeof value === 'object' && value !== null) {
        result[key] = redactSensitiveData(value)
      } else if (typeof value === 'string' && (value.startsWith('Bearer ') || value.includes('eyJhbGciOi'))) {
        result[key] = '[REDACTED_TOKEN]'
      } else {
        result[key] = value
      }
    }
    return result as T
  }

  return input
}
