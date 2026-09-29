import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://cdsghhesglltjvqbewol.supabase.co'
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ubnd6hu6T0jz33SdUYFoRw_mXHwsHi0'

const TEST_ADMIN_EMAIL = 'karthik.superhosur2026@gmail.com'
const TEST_PASSWORD = 'TestPassword123!'

async function runPhase18Step1Tests() {
  console.log('====================================================')
  console.log('SuperHosur Phase 18 Step 1 Verification Test Suite')
  console.log('Abuse Prevention, Rate Limiting & User Reporting')
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

  // 1. Anonymous client
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  // 2. Authenticated Admin client
  const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data: authData, error: authError } = await adminClient.auth.signInWithPassword({
    email: TEST_ADMIN_EMAIL,
    password: TEST_PASSWORD,
  })

  if (authError || !authData.user) {
    console.error('Failed to log in as test admin user:', authError)
    process.exit(1)
  }

  const adminUserId = authData.user.id
  console.log(`Authenticated as admin: ${authData.user.email} (${adminUserId})\n`)

  try {
    // ----------------------------------------------------
    // TEST 1: Rate Limit RPC - Single invocation
    // ----------------------------------------------------
    console.log('--- Test Group 1: Server-Side Rate Limiter Engine ---')
    const uniqueAction = `test_action_${Date.now()}`
    const testIdentifier = `user_${Date.now()}`

    const { data: rl1, error: rlErr1 } = await adminClient.rpc('check_rate_limit', {
      p_action_key: uniqueAction,
      p_identifier: testIdentifier,
      p_max_requests: 3,
      p_window_seconds: 60,
    })

    assert(!rlErr1 && rl1 === true, 'Test 1.1: First call to check_rate_limit succeeds (allowed)', JSON.stringify(rlErr1))

    // ----------------------------------------------------
    // TEST 2: Rate Limit RPC - Threshold enforcement
    // ----------------------------------------------------
    const { data: rl2 } = await adminClient.rpc('check_rate_limit', {
      p_action_key: uniqueAction,
      p_identifier: testIdentifier,
      p_max_requests: 3,
      p_window_seconds: 60,
    })
    const { data: rl3 } = await adminClient.rpc('check_rate_limit', {
      p_action_key: uniqueAction,
      p_identifier: testIdentifier,
      p_max_requests: 3,
      p_window_seconds: 60,
    })
    const { data: rl4 } = await adminClient.rpc('check_rate_limit', {
      p_action_key: uniqueAction,
      p_identifier: testIdentifier,
      p_max_requests: 3,
      p_window_seconds: 60,
    })

    assert(rl2 === true && rl3 === true, 'Test 1.2: Subsequent calls within limit are allowed (2 & 3)')
    assert(rl4 === false, 'Test 1.3: Exceeding max_requests (4th call) is strictly blocked (returns false)')

    // ----------------------------------------------------
    // TEST 3: Hardened Listing Analytics RPC with Rate Limit
    // ----------------------------------------------------
    console.log('\n--- Test Group 2: Protected Listing Analytics RPC ---')
    // Get a sample business to test analytics on
    const { data: sampleBiz } = await anonClient
      .from('businesses')
      .select('id')
      .limit(1)
      .single()

    if (sampleBiz?.id) {
      const { data: analyticsRes, error: analyticsErr } = await anonClient.rpc('record_listing_analytics_event', {
        p_event_type: 'listing_view',
        p_business_id: sampleBiz.id,
        p_session_id: `test_sess_${Date.now()}`,
      })

      assert(!analyticsErr && typeof analyticsRes === 'string' && analyticsRes.length > 0, 'Test 2.1: Protected record_listing_analytics_event records view normally', JSON.stringify(analyticsErr))
    } else {
      console.log('Skipping analytics test: No sample business found.')
    }

    // ----------------------------------------------------
    // TEST 4: Abuse Reporting - Anonymous creation blocked by RLS
    // ----------------------------------------------------
    console.log('\n--- Test Group 3: Abuse Reporting RLS & Validation ---')
    const dummyBizId = sampleBiz?.id || '00000000-0000-0000-0000-000000000001'

    const { error: anonReportErr } = await anonClient
      .from('reports')
      .insert({
        reporter_id: '00000000-0000-0000-0000-000000000002',
        entity_type: 'business',
        entity_id: dummyBizId,
        reason: 'spam',
        description: 'Anonymous spam report',
      })

    assert(Boolean(anonReportErr), 'Test 3.1: Anonymous report submission is rejected by RLS', anonReportErr?.message)

    // ----------------------------------------------------
    // TEST 5: Abuse Reporting - Authenticated user report creation
    // ----------------------------------------------------
    // Clean up any old pending report for this entity first if exists
    await adminClient
      .from('reports')
      .delete()
      .eq('reporter_id', adminUserId)
      .eq('entity_id', dummyBizId)

    const { data: userReport, error: userReportErr } = await adminClient
      .from('reports')
      .insert({
        reporter_id: adminUserId,
        entity_type: 'business',
        entity_id: dummyBizId,
        reason: 'misleading_information',
        description: 'Automated test: misleading description',
      })
      .select()
      .single()

    assert(!userReportErr && Boolean(userReport?.id), 'Test 3.2: Authenticated user creates abuse report successfully', JSON.stringify(userReportErr))

    // ----------------------------------------------------
    // TEST 6: Abuse Reporting - Duplicate pending report prevention
    // ----------------------------------------------------
    const { error: dupReportErr } = await adminClient
      .from('reports')
      .insert({
        reporter_id: adminUserId,
        entity_type: 'business',
        entity_id: dummyBizId,
        reason: 'spam',
        description: 'Duplicate report attempt',
      })

    assert(
      Boolean(dupReportErr) && (dupReportErr?.message.includes('unique') || dupReportErr?.code === '23505'),
      'Test 3.3: Duplicate pending report from same user on same entity is rejected by unique constraint',
      dupReportErr?.message
    )

    // ----------------------------------------------------
    // TEST 7: Admin Report Moderation RPC & Audit Log
    // ----------------------------------------------------
    console.log('\n--- Test Group 4: Admin Report Moderation & Audit Logging ---')
    if (userReport?.id) {
      const { data: modResult, error: modErr } = await adminClient.rpc('admin_moderate_report', {
        p_report_id: userReport.id,
        p_status: 'resolved',
        p_resolution: 'Listing investigated and verified compliant.',
      })

      assert(!modErr && modResult?.success === true, 'Test 4.1: admin_moderate_report transitions status to resolved', JSON.stringify(modErr))

      // Check report state
      const { data: updatedReport } = await adminClient
        .from('reports')
        .select('*')
        .eq('id', userReport.id)
        .single()

      assert(
        updatedReport?.status === 'resolved' &&
        updatedReport?.resolution === 'Listing investigated and verified compliant.' &&
        Boolean(updatedReport?.reviewed_at) &&
        updatedReport?.reviewed_by === adminUserId,
        'Test 4.2: Report record updated with resolution, timestamp, and reviewer ID'
      )

      // Check admin_audit_logs integration
      const { data: auditEntries } = await adminClient
        .from('admin_audit_logs')
        .select('*')
        .eq('entity_type', 'report')
        .eq('entity_id', userReport.id)
        .order('created_at', { ascending: false })
        .limit(1)

      assert(
        Array.isArray(auditEntries) && auditEntries.length > 0 && auditEntries[0].action_type === 'report_resolved',
        'Test 4.3: Action was automatically recorded in admin_audit_logs',
        JSON.stringify(auditEntries)
      )

      // Clean up test report
      await adminClient.from('reports').delete().eq('id', userReport.id)
      if (auditEntries?.[0]?.id) {
        await adminClient.from('admin_audit_logs').delete().eq('id', auditEntries[0].id)
      }
    }

    // ----------------------------------------------------
    // TEST 8: Non-admin moderation denial
    // ----------------------------------------------------
    const { error: anonModErr } = await anonClient.rpc('admin_moderate_report', {
      p_report_id: '00000000-0000-0000-0000-000000000001',
      p_status: 'resolved',
      p_resolution: 'Hacker resolution',
    })

    assert(Boolean(anonModErr), 'Test 4.4: Anonymous/unauthorized callers cannot invoke admin_moderate_report', anonModErr?.message)

  } catch (err) {
    console.error('Unexpected exception during tests:', err)
    failed++
  } finally {
    await adminClient.auth.signOut()
  }

  console.log('\n====================================================')
  console.log(`Results: ${passed} Passed, ${failed} Failed`)
  console.log('====================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runPhase18Step1Tests()
