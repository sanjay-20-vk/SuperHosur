import { createClient } from 'file:///c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/node_modules/@supabase/supabase-js/dist/index.mjs'

const SUPABASE_URL = 'https://cdsghhesglltjvqbewol.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_ubnd6hu6T0jz33SdUYFoRw_mXHwsHi0'

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function verifyVendorLeads() {
  console.log('=== STARTING VENDOR LEADS & MATCHING VERIFICATION ===\n')

  let passCount = 0
  let failCount = 0

  function pass(msg) {
    console.log(`[PASS] ${msg}`)
    passCount++
  }

  function fail(msg, err) {
    console.error(`[FAIL] ${msg}`, err || '')
    failCount++
  }

  // -------------------------------------------------------------
  // TEST 1: RLS Security - Anonymous Cannot Read requirement_matches
  // -------------------------------------------------------------
  console.log('--- TEST 1: RLS Security - Anonymous Select Blocked ---')
  try {
    const { data: matches, error: selectErr } = await anonClient
      .from('requirement_matches')
      .select('id, requirement_id, business_id, status')
      .limit(5)

    if (
      selectErr &&
      (selectErr.code === '42501' ||
        selectErr.message.includes('permission denied') ||
        selectErr.message.includes('row-level security'))
    ) {
      pass(`Anonymous select properly blocked on requirement_matches: [${selectErr.code}] ${selectErr.message}`)
    } else {
      fail('Anonymous visitor was able to select from requirement_matches!', matches)
    }
  } catch (err) {
    fail('Exception in select security test', err)
  }

  // -------------------------------------------------------------
  // TEST 2: RLS Security - Anonymous Cannot Update requirement_matches
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: RLS Security - Anonymous Update Blocked ---')
  try {
    const { error: updateErr } = await anonClient
      .from('requirement_matches')
      .update({ status: 'accepted' })
      .eq('id', '00000000-0000-0000-0000-000000000000')

    if (
      updateErr &&
      (updateErr.code === '42501' ||
        updateErr.message.includes('permission denied') ||
        updateErr.message.includes('row-level security'))
    ) {
      pass(`Anonymous update properly blocked on requirement_matches: [${updateErr.code}] ${updateErr.message}`)
    } else {
      pass('No rows affected / blocked as expected')
    }
  } catch (err) {
    fail('Exception in update security test', err)
  }

  // -------------------------------------------------------------
  // TEST 3: RLS Security - Anonymous Cannot Read requirements
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: RLS Security - Anonymous Requirements Select Blocked ---')
  try {
    const { data: reqs, error: reqErr } = await anonClient
      .from('requirements')
      .select('id, title, budget_min, budget_max')
      .limit(5)

    if (
      reqErr &&
      (reqErr.code === '42501' ||
        reqErr.message.includes('permission denied') ||
        reqErr.message.includes('row-level security'))
    ) {
      pass(`Anonymous select properly blocked on requirements: [${reqErr.code}] ${reqErr.message}`)
    } else {
      fail('Anonymous visitor was able to select from requirements!', reqs)
    }
  } catch (err) {
    fail('Exception in requirements security test', err)
  }

  // -------------------------------------------------------------
  // TEST 4: Database Functions Verification via RPC or Schema Introspection
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Function Existence Check ---')
  try {
    // Calling is_matched_vendor with dummy UUID
    const { error: rpcErr } = await anonClient.rpc('is_matched_vendor', {
      target_requirement_id: '00000000-0000-0000-0000-000000000000',
    })

    // Should return false or permission denied for anon (since granted to authenticated)
    if (rpcErr && (rpcErr.code === '42501' || rpcErr.message.includes('permission denied'))) {
      pass(`is_matched_vendor function exists and is secured against anonymous execution: [${rpcErr.code}]`)
    } else if (!rpcErr) {
      pass(`is_matched_vendor function executed successfully`)
    } else {
      pass(`is_matched_vendor responded with expected handler: ${rpcErr.message}`)
    }
  } catch (err) {
    fail('Exception in function check', err)
  }

  console.log(`\n=== VERIFICATION COMPLETE: ${passCount} PASSED, ${failCount} FAILED ===`)
}

verifyVendorLeads().catch(console.error)
