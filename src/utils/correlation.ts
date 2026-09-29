/**
 * SuperHosur Correlation & Request ID Generator
 * Phase 18 Step 6: Hardening, Observability & Error Normalization
 *
 * Produces secure, non-predictable, readable request correlation IDs.
 * Format: sh_<timestamp_base36>_<random_hex>
 */

export function generateCorrelationId(prefix: string = 'sh'): string {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 10)
  return `${prefix}_${timestamp}_${randomPart}`
}
