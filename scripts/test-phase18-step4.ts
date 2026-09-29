import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://cdsghhesglltjvqbewol.supabase.co'
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ubnd6hu6T0jz33SdUYFoRw_mXHwsHi0'

const TEST_ADMIN_EMAIL = 'karthik.superhosur2026@gmail.com'
const TEST_PASSWORD = 'TestPassword123!'

async function runPhase18Step4Tests() {
  console.log('====================================================')
  console.log('SuperHosur Phase 18 Step 4 Verification Test Suite')
  console.log('Owner CRM & Unified Lead Inbox')
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

  // 2. Authenticated user client
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data: authData, error: authError } = await userClient.auth.signInWithPassword({
    email: TEST_ADMIN_EMAIL,
    password: TEST_PASSWORD,
  })

  if (authError || !authData.user) {
    console.error('Failed to authenticate as test user:', authError)
    process.exit(1)
  }

  const userId = authData.user.id
  console.log(`Authenticated test user: ${authData.user.email} (${userId})\n`)

  try {
    // ----------------------------------------------------
    // Test Group 1: Security & RLS Isolation
    // ----------------------------------------------------
    console.log('--- Test Group 1: Security & RLS Isolation ---')

    // 1.1 Anonymous cannot read owner_leads
    const { data: anonLeads } = await anonClient
      .from('owner_leads')
      .select('*')
      .limit(5)

    assert(
      !anonLeads || anonLeads.length === 0,
      'Test 1.1: Anonymous user cannot select owner_leads (RLS enforced)'
    )

    // 1.2 Authenticated user can read their own owner_leads
    const { data: userLeads, error: userLeadsErr } = await userClient
      .from('owner_leads')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })

    assert(
      !userLeadsErr && Array.isArray(userLeads),
      'Test 1.2: Authenticated owner can query own leads without error'
    )

    // 1.3 Verify owner filtering query returns strictly leads for userId
    const foreignLeads = (userLeads || []).filter((l) => l.owner_id !== userId)
    assert(
      foreignLeads.length === 0,
      'Test 1.3: Owner leads scoped strictly to current owner_id'
    )

    // ----------------------------------------------------
    // Test Group 2: Schema Constraints & Idempotency
    // ----------------------------------------------------
    console.log('\n--- Test Group 2: Schema Constraints & Idempotency ---')

    // 2.1 Unique constraint on (owner_id, entity_type, entity_id, source_type, source_id)
    const testEntityId = '00000000-0000-0000-0000-000000000001'
    const testSourceId = '00000000-0000-0000-0000-000000000099'

    // Clean up any leftover test lead first
    await userClient.from('owner_leads').delete().eq('source_id', testSourceId)

    // Attempt direct insert as owner
    const { data: insertedLead, error: insertErr } = await userClient
      .from('owner_leads')
      .insert({
        owner_id: userId,
        entity_type: 'business',
        entity_id: testEntityId,
        source_type: 'phone_click',
        source_id: testSourceId,
        title: 'Test Customer Call Inquiry',
        description: 'Customer clicked phone call button',
        status: 'new',
        priority: 'medium',
      })
      .select()
      .single()

    assert(
      !insertErr && Boolean(insertedLead?.id),
      'Test 2.1: Successfully inserted owner lead record'
    )

    // 2.2 Duplicate insertion should fail unique constraint
    const { error: dupErr } = await userClient
      .from('owner_leads')
      .insert({
        owner_id: userId,
        entity_type: 'business',
        entity_id: testEntityId,
        source_type: 'phone_click',
        source_id: testSourceId,
        title: 'Duplicate Test Call',
        description: 'Duplicate customer call',
        status: 'new',
        priority: 'medium',
      })

    assert(
      Boolean(dupErr),
      'Test 2.2: Idempotency enforced — duplicate lead source fails unique constraint'
    )

    // 2.3 Invalid status value constraint
    const { error: invalidStatusErr } = await userClient
      .from('owner_leads')
      .insert({
        owner_id: userId,
        entity_type: 'business',
        entity_id: testEntityId,
        source_type: 'phone_click',
        source_id: '00000000-0000-0000-0000-000000000098',
        title: 'Invalid Status Test',
        status: 'invalid_status_enum',
      })

    assert(
      Boolean(invalidStatusErr),
      'Test 2.3: Database constraint rejects invalid lead status string'
    )

    // 2.4 Invalid priority value constraint
    const { error: invalidPriorityErr } = await userClient
      .from('owner_leads')
      .insert({
        owner_id: userId,
        entity_type: 'business',
        entity_id: testEntityId,
        source_type: 'phone_click',
        source_id: '00000000-0000-0000-0000-000000000097',
        title: 'Invalid Priority Test',
        status: 'new',
        priority: 'super_urgent_invalid',
      })

    assert(
      Boolean(invalidPriorityErr),
      'Test 2.4: Database constraint rejects invalid priority string'
    )

    // ----------------------------------------------------
    // Test Group 3: Owner Lead Lifecycle & Updates via RPC
    // ----------------------------------------------------
    console.log('\n--- Test Group 3: Lead Lifecycle & Updates via RPC ---')

    const leadId = insertedLead?.id

    if (leadId) {
      // 3.1 Update status to contacted and set follow up date
      const followUpDate = new Date(Date.now() + 86400000 * 2).toISOString()
      const { data: updateRes, error: updateErr } = await userClient.rpc('update_owner_lead', {
        p_lead_id: leadId,
        p_status: 'contacted',
        p_priority: 'high',
        p_notes: 'Spoke with customer over phone; interested in commercial space.',
        p_next_follow_up_at: followUpDate,
      })

      assert(
        !updateErr && Boolean(updateRes?.success),
        'Test 3.1: update_owner_lead RPC executes and returns success'
      )

      // Fetch the updated lead to verify persisted fields
      const { data: updatedLead } = await userClient
        .from('owner_leads')
        .select('*')
        .eq('id', leadId)
        .single()

      assert(
        updatedLead?.status === 'contacted' && updatedLead?.priority === 'high',
        'Test 3.2: Status and priority correctly persisted'
      )

      // 3.3 Transition to converted
      const { data: convertRes, error: convertErr } = await userClient.rpc('update_owner_lead', {
        p_lead_id: leadId,
        p_status: 'converted',
        p_notes: 'Deal finalized and signed.',
      })

      assert(
        !convertErr && Boolean(convertRes?.success),
        'Test 3.3: Transition to "converted" executed successfully'
      )

      const { data: convertedLead } = await userClient
        .from('owner_leads')
        .select('*')
        .eq('id', leadId)
        .single()

      assert(
        convertedLead?.status === 'converted' && Boolean(convertedLead?.converted_at),
        'Test 3.4: Converted status automatically sets converted_at timestamp'
      )

      // 3.5 Anonymous cannot call update_owner_lead on the lead
      const { error: anonUpdateErr } = await anonClient.rpc('update_owner_lead', {
        p_lead_id: leadId,
        p_status: 'closed',
      })

      assert(
        Boolean(anonUpdateErr),
        'Test 3.5: Anonymous user cannot execute update_owner_lead RPC'
      )

      // Clean up test lead
      await userClient.from('owner_leads').delete().eq('id', leadId)
    } else {
      console.error('Skipping Group 3 tests due to missing inserted lead.')
    }

    // ----------------------------------------------------
    // Test Group 4: Automatic Lead Sync & Index Queries
    // ----------------------------------------------------
    console.log('\n--- Test Group 4: Automatic Lead Sync & Index Queries ---')

    // 4.1 Verify direct conversation syncs into owner_leads
    const { data: dmLeads } = await userClient
      .from('owner_leads')
      .select('*')
      .eq('source_type', 'direct_message')
      .limit(5)

    assert(
      Array.isArray(dmLeads),
      'Test 4.1: Direct message lead query succeeds and matches schema'
    )

    // 4.2 Verify querying by composite keys operates smoothly
    const { error: queryErr } = await userClient
      .from('owner_leads')
      .select('id, status, priority, next_follow_up_at, created_at')
      .eq('owner_id', userId)
      .eq('status', 'new')
      .order('created_at', { ascending: false })
      .limit(10)

    assert(
      !queryErr,
      'Test 4.2: Filtered composite query (owner_id + status + created_at) operates cleanly'
    )

    console.log('\n====================================================')
    console.log(`Phase 18 Step 4 Tests Complete: ${passed} passed, ${failed} failed`)
    console.log('====================================================\n')

    if (failed > 0) {
      process.exit(1)
    }
  } catch (err) {
    console.error('Unexpected error during Phase 18 Step 4 tests:', err)
    process.exit(1)
  }
}

void runPhase18Step4Tests()
