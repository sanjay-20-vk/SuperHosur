export interface EnvironmentValidationResult {
  isValid: boolean
  missingPublic: string[]
  missingServer: string[]
  warnings: string[]
}

/**
 * Validates frontend environment variables at runtime without printing secret values.
 */
export function validateClientEnvironment(): { isValid: boolean; missing: string[] } {
  const metaEnv = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : undefined
  const globalProcess = (globalThis as unknown as { process?: { env?: Record<string, string> } }).process

  const supabaseUrl = metaEnv?.['VITE_SUPABASE_URL'] ?? globalProcess?.env?.['VITE_SUPABASE_URL']
  const supabaseAnonKey = metaEnv?.['VITE_SUPABASE_ANON_KEY'] ?? globalProcess?.env?.['VITE_SUPABASE_ANON_KEY']

  const missing: string[] = []
  if (!supabaseUrl) missing.push('VITE_SUPABASE_URL')
  if (!supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY')

  return {
    isValid: missing.length === 0,
    missing,
  }
}

/**
 * Validates server-side environment secrets for Edge Functions and background workers.
 */
export function validateServerEnvironment(env: Record<string, string | undefined>): EnvironmentValidationResult {
  const missingPublic: string[] = []
  const missingServer: string[] = []
  const warnings: string[] = []

  if (!env['SUPABASE_URL']) missingPublic.push('SUPABASE_URL')
  if (!env['SUPABASE_SERVICE_ROLE_KEY']) missingServer.push('SUPABASE_SERVICE_ROLE_KEY')

  // Conditional integrations:
  if (!env['RAZORPAY_KEY_ID'] || !env['RAZORPAY_KEY_SECRET']) {
    warnings.push('Razorpay credentials not fully configured; payments running in sandbox mode.')
  }

  if (!env['RESEND_API_KEY']) {
    warnings.push('Resend email provider API key missing; emails queued in sandbox.')
  }

  if (!env['WHATSAPP_ACCESS_TOKEN'] || !env['WHATSAPP_PHONE_NUMBER_ID']) {
    warnings.push('WhatsApp Cloud API credentials missing; WhatsApp messages queued in sandbox.')
  }

  return {
    isValid: missingPublic.length === 0 && missingServer.length === 0,
    missingPublic,
    missingServer,
    warnings,
  }
}
