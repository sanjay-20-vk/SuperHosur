import { errorReporting } from '../src/services/errorReporting'
import { redactSensitiveData } from '../src/utils/redact'
import { generateCorrelationId } from '../src/utils/correlation'
import { normalizeAppError } from '../src/utils/errorNormalizer'
import { validateClientEnvironment, validateServerEnvironment } from '../src/utils/envValidation'
import { withBoundedRetry } from '../src/utils/retry'

// Ensure client environment defaults are populated in test process if not loaded via runner
if (!process.env['VITE_SUPABASE_URL']) {
  process.env['VITE_SUPABASE_URL'] = 'https://cdsghhesglltjvqbewol.supabase.co'
}
if (!process.env['VITE_SUPABASE_ANON_KEY']) {
  process.env['VITE_SUPABASE_ANON_KEY'] = 'sb_publishable_ubnd6hu6T0jz33SdUYFoRw_mXHwsHi0'
}

async function runPhase18Step6Tests() {
  console.log('====================================================')
  console.log('SuperHosur Phase 18 Step 6 Verification Test Suite')
  console.log('Codebase Hardening, Monitoring & Production Observability')
  console.log('====================================================\n')

  let passed = 0
  let failed = 0

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`)
      passed++
    } else {
      console.error(`❌ FAIL: ${testName}`)
      if (details) console.error(`   Details: ${details}`)
      failed++
    }
  }

  try {
    // ----------------------------------------------------
    // Test Group 1: Error Normalization & Redaction
    // ----------------------------------------------------
    console.log('--- Test Group 1: Error Normalization & Redaction ---')

    // 1.1 Sensitive data redaction utility
    const sensitivePayload = {
      user_id: 'usr_123',
      password: 'SuperSecretPassword!',
      access_token: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      razorpay_key_secret: 'rzp_sec_live_12345',
      cvv: '123',
      meta: {
        note: 'Customer inquiry',
        upi_pin: '9876',
      },
    }

    const redacted = redactSensitiveData(sensitivePayload)

    assert(
      redacted.password === '[REDACTED]' &&
        redacted.access_token === '[REDACTED]' &&
        redacted.razorpay_key_secret === '[REDACTED]' &&
        redacted.cvv === '[REDACTED]' &&
        redacted.meta.upi_pin === '[REDACTED]' &&
        redacted.meta.note === 'Customer inquiry',
      'Test 1.1: redactSensitiveData recursively strips passwords, tokens, CVVs, and secrets'
    )

    // 1.2 Error Normalizer produces user-safe messages and classification
    const rateLimitErr = new Error('Database error: check_rate_limit returned false (P0001)')
    const normalizedRateLimit = normalizeAppError(rateLimitErr)

    assert(
      normalizedRateLimit.code === 'RATE_LIMITED' &&
        normalizedRateLimit.userMessage.includes('Too many requests') &&
        Boolean(normalizedRateLimit.correlationId),
      'Test 1.2: normalizeAppError safely detects rate limit and masks internal codes'
    )

    const authErr = new Error('JWT expired or permission denied (42501)')
    const normalizedAuth = normalizeAppError(authErr)

    assert(
      normalizedAuth.code === 'UNAUTHORIZED' &&
        normalizedAuth.userMessage.includes('Authentication required') &&
        normalizedAuth.isRecoverable === false,
      'Test 1.3: normalizeAppError marks auth failures non-recoverable with friendly user message'
    )

    // ----------------------------------------------------
    // Test Group 2: Error Reporting & Correlation Tracking
    // ----------------------------------------------------
    console.log('\n--- Test Group 2: Error Reporting & Correlation Tracking ---')

    errorReporting.clearRecentEvents()
    errorReporting.setUser('usr_test_audit_456')

    const correlationId = errorReporting.captureException(new Error('Sample test rendering exception'), {
      severity: 'error',
      component: 'TestComponent',
      metadata: { action: 'render_card', token: 'secret_leak_attempt' },
    })

    const recent = errorReporting.getRecentEvents()

    assert(
      recent.length === 1 &&
        recent[0]?.correlationId === correlationId &&
        recent[0]?.metadata?.token === '[REDACTED]',
      'Test 2.1: errorReporting logs exception with correlation ID and applies automatic redaction'
    )

    assert(
      recent[0]?.userId === 'usr_test_audit_456',
      'Test 2.2: errorReporting properly scopes authenticated user context'
    )

    // ----------------------------------------------------
    // Test Group 3: Bounded Retry & Jitter Mechanism
    // ----------------------------------------------------
    console.log('\n--- Test Group 3: Bounded Retry & Network Hardening ---')

    let attempts = 0
    const retryResult = await withBoundedRetry(
      async () => {
        attempts++
        if (attempts < 3) {
          throw new Error('Temporary 503 network blip')
        }
        return 'recovered_payload'
      },
      { maxRetries: 3, initialDelayMs: 20 }
    )

    assert(
      retryResult === 'recovered_payload' && attempts === 3,
      'Test 3.1: withBoundedRetry retries transient network blips up to limit and recovers'
    )

    // 3.2 Should not retry client fatal 404
    let fatalAttempts = 0
    try {
      await withBoundedRetry(
        async () => {
          fatalAttempts++
          throw new Error('Resource 404 not found')
        },
        { maxRetries: 3, initialDelayMs: 20 }
      )
    } catch {
      // expected fatal throw
    }

    assert(
      fatalAttempts === 1,
      'Test 3.2: withBoundedRetry aborts immediately without retrying fatal 404 errors'
    )

    // ----------------------------------------------------
    // Test Group 4: Environment Configuration Validation
    // ----------------------------------------------------
    console.log('\n--- Test Group 4: Environment Validation ---')

    const clientEnvCheck = validateClientEnvironment()
    assert(
      clientEnvCheck.isValid === true,
      'Test 4.1: validateClientEnvironment confirms presence of VITE_SUPABASE_URL and ANON key'
    )

    const serverEnvCheck = validateServerEnvironment({
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test_service_key',
    })

    assert(
      serverEnvCheck.isValid === true && serverEnvCheck.warnings.length >= 2,
      'Test 4.2: validateServerEnvironment flags sandbox warnings for optional payment/whatsapp providers'
    )

    // ----------------------------------------------------
    // Test Group 5: Correlation ID Security & Randomness
    // ----------------------------------------------------
    console.log('\n--- Test Group 5: Correlation ID Randomness ---')

    const id1 = generateCorrelationId()
    const id2 = generateCorrelationId()

    assert(
      id1.startsWith('sh_') && id2.startsWith('sh_') && id1 !== id2,
      'Test 5.1: generateCorrelationId creates distinct, prefixed, non-predictable trace IDs'
    )

    console.log('\n====================================================')
    console.log(`Phase 18 Step 6 Tests Complete: ${passed} passed, ${failed} failed`)
    console.log('====================================================\n')

    if (failed > 0) {
      process.exit(1)
    }
  } catch (err) {
    console.error('Unexpected error during Phase 18 Step 6 tests:', err)
    process.exit(1)
  }
}

void runPhase18Step6Tests()
