import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase environment variables missing.')
}

const anonClient = createClient(supabaseUrl, supabaseAnonKey)

console.log('=== PHASE 17 STEP 2: OWNER ANALYTICS & LEAD TELEMETRY TESTS ===\n')

let passedCount = 0
let failedCount = 0

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`)
    passedCount++
  } else {
    console.error(`[FAIL] ${message}`)
    failedCount++
  }
}

// 1. Anonymous Direct SELECT Denied / Protected by RLS
const { data: anonSelectData, error: anonSelectErr } = await anonClient
  .from('listing_analytics_events')
  .select('*')
  .limit(10)

assert(
  (!anonSelectData || anonSelectData.length === 0) || anonSelectErr,
  'anonymous SELECT directly on listing_analytics_events returns no data (RLS protected)',
)

// 2. Anonymous Direct INSERT Denied by RLS
const { error: anonInsertErr } = await anonClient
  .from('listing_analytics_events')
  .insert({
    business_id: '00000000-0000-0000-0000-000000000000',
    event_type: 'listing_view',
  })

assert(
  anonInsertErr !== null,
  `anonymous direct INSERT denied by RLS (code: ${anonInsertErr?.code || 'blocked'})`,
)

// 3. Find a real business for telemetry testing
const { data: sampleBiz } = await anonClient
  .from('businesses')
  .select('id, name, owner_id')
  .limit(1)
  .single()

if (!sampleBiz) {
  console.log('No existing businesses to test against. Exiting.')
  process.exit(1)
}

console.log(`Testing with target business: "${sampleBiz.name}" (${sampleBiz.id})`)

// 4. Safe Public/Anonymous Telemetry RPC invocation (listing_view)
const { data: rpcViewResult, error: rpcViewErr } = await anonClient.rpc('record_listing_analytics_event', {
  p_business_id: sampleBiz.id,
  p_property_id: null,
  p_event_type: 'listing_view',
  p_session_id: 'test-session-123',
  p_metadata: { source: 'automated_test' },
})

assert(
  !rpcViewErr && typeof rpcViewResult === 'string' && rpcViewResult.length > 0,
  `public/anonymous listing_view recorded safely via record_listing_analytics_event RPC (id: ${rpcViewResult})`,
)

// 5. Contact Click Telemetry RPC (call_click, whatsapp_click)
const { data: rpcCallResult, error: rpcCallErr } = await anonClient.rpc('record_listing_analytics_event', {
  p_business_id: sampleBiz.id,
  p_property_id: null,
  p_event_type: 'call_click',
  p_session_id: 'test-session-123',
  p_metadata: { channel: 'tel' },
})

assert(
  !rpcCallErr && typeof rpcCallResult === 'string' && rpcCallResult.length > 0,
  `call_click recorded safely via record_listing_analytics_event RPC (id: ${rpcCallResult})`,
)

const { data: rpcWaResult, error: rpcWaErr } = await anonClient.rpc('record_listing_analytics_event', {
  p_business_id: sampleBiz.id,
  p_property_id: null,
  p_event_type: 'whatsapp_click',
  p_session_id: 'test-session-123',
  p_metadata: { channel: 'whatsapp' },
})

assert(
  !rpcWaErr && typeof rpcWaResult === 'string' && rpcWaResult.length > 0,
  `whatsapp_click recorded safely via record_listing_analytics_event RPC (id: ${rpcWaResult})`,
)

// 6. Security constraint: Exact-one listing target enforcement (both target provided)
const { data: doubleTargetResult, error: doubleTargetErr } = await anonClient.rpc('record_listing_analytics_event', {
  p_business_id: sampleBiz.id,
  p_property_id: '00000000-0000-0000-0000-000000000000',
  p_event_type: 'listing_view',
})

assert(
  doubleTargetErr !== null || (doubleTargetResult && doubleTargetResult.success === false),
  'validation rejects providing BOTH business_id and property_id',
)

// 7. Security constraint: Exact-one listing target enforcement (neither target provided)
const { data: noTargetResult, error: noTargetErr } = await anonClient.rpc('record_listing_analytics_event', {
  p_business_id: null,
  p_property_id: null,
  p_event_type: 'listing_view',
})

assert(
  noTargetErr !== null || (noTargetResult && noTargetResult.success === false),
  'validation rejects providing NEITHER business_id nor property_id',
)

// 8. Security constraint: Invalid event_type rejected
const { data: badEventResult, error: badEventErr } = await anonClient.rpc('record_listing_analytics_event', {
  p_business_id: sampleBiz.id,
  p_property_id: null,
  p_event_type: 'malicious_event_injection',
})

assert(
  badEventErr !== null || (badEventResult && badEventResult.success === false),
  'validation rejects unknown or invalid event_type',
)

// 9. Authenticated Owner tests
const authClient = createClient(supabaseUrl, supabaseAnonKey)
const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
  email: 'karthik.superhosur2026@gmail.com',
  password: 'TestPassword123!',
})

if (authError || !authData.session) {
  console.log(`Could not sign in as test owner: ${authError?.message}. Skipping owner-scoped test.`)
} else {
  console.log(`Authenticated as test owner ${authData.user.email} (${authData.user.id})`)

  // 10. Owner can call get_owner_analytics RPC
  const { data: analyticsData, error: analyticsErr } = await authClient.rpc('get_owner_analytics', {
    p_days: 30,
  })

  assert(
    !analyticsErr && analyticsData && typeof analyticsData === 'object',
    'owner can fetch aggregated analytics via get_owner_analytics RPC',
  )

  if (analyticsData) {
    assert(
      'summary' in analyticsData && 'listings' in analyticsData,
      'analytics payload contains summary and per-listing breakdown',
    )
    assert(
      typeof analyticsData.summary.total_views === 'number' &&
      typeof analyticsData.summary.total_call_clicks === 'number' &&
      typeof analyticsData.summary.total_whatsapp_clicks === 'number' &&
      typeof analyticsData.summary.total_saved_listings === 'number' &&
      typeof analyticsData.summary.conversion_rate === 'number',
      'summary metrics are correctly typed numbers (views, calls, whatsapps, saves, conversion rate)',
    )
  }

  // 11. Anonymous user CANNOT call get_owner_analytics
  const { error: anonRpcErr } = await anonClient.rpc('get_owner_analytics', {
    p_days: 30,
  })

  assert(
    anonRpcErr !== null,
    'anonymous user cannot call get_owner_analytics (auth required)',
  )

  // 12. RLS Isolation: Test owner cannot query raw analytics for listings they do NOT own
  const { data: rawEvents } = await authClient
    .from('listing_analytics_events')
    .select('id, business_id, property_id')
    .limit(10)

  // Every returned event must belong to an owned business or property (or empty if none owned)
  let allOwned = true
  if (rawEvents && rawEvents.length > 0) {
    for (const ev of rawEvents) {
      if (ev.business_id) {
        const { data: b } = await authClient
          .from('businesses')
          .select('owner_id')
          .eq('id', ev.business_id)
          .single()
        // If the user can see this business, check ownership or admin
        if (b && b.owner_id !== authData.user.id) {
          // Check if admin
          const { data: isAdm } = await authClient.rpc('is_admin')
          if (!isAdm) allOwned = false
        }
      }
    }
  }

  assert(
    allOwned,
    'owner can only select raw analytics events belonging to their own listings (or admin)',
  )
}

console.log(`\n=== RESULTS: ${passedCount} PASSED, ${failedCount} FAILED ===`)

if (failedCount > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
