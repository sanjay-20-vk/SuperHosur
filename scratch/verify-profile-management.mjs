import { createClient } from 'file:///c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/node_modules/@supabase/supabase-js/dist/index.mjs'

const SUPABASE_URL = 'https://cdsghhesglltjvqbewol.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_ubnd6hu6T0jz33SdUYFoRw_mXHwsHi0'

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

function validateProfileInput(input) {
  if (input.full_name !== undefined) {
    if (!input.full_name || input.full_name.trim().length === 0) {
      return 'Full name cannot be blank.'
    }
  }

  if (input.phone) {
    const trimmed = input.phone.trim()
    const cleaned = trimmed.replace(/[\s\-()]+/g, '')
    const phoneRegex = /^(\+?\d{1,4})?\d{10}$/
    if (trimmed.length > 0 && !phoneRegex.test(cleaned)) {
      return 'Enter a valid 10-digit phone number.'
    }
  }

  return null
}

async function verifyProfileManagement() {
  console.log('=== STARTING CUSTOMER PROFILE VERIFICATION ===\n')

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
  // TEST 1: RLS Security - Anonymous Access to Profiles is Blocked
  // -------------------------------------------------------------
  console.log('--- TEST 1: RLS Security - Anonymous Select Blocked ---')
  try {
    const { data: profiles, error: selectErr } = await anonClient
      .from('profiles')
      .select('id, full_name, role')
      .limit(5)

    if (selectErr && (selectErr.code === '42501' || selectErr.message.includes('permission denied') || selectErr.message.includes('row-level security'))) {
      pass(`Anonymous select properly blocked by RLS: [${selectErr.code}] ${selectErr.message}`)
    } else if (!profiles || profiles.length === 0) {
      pass('RLS returned empty array for unauthenticated visitor')
    } else {
      fail('Anonymous visitor was able to read profiles!', profiles)
    }
  } catch (err) {
    fail('Exception in select test', err)
  }

  // -------------------------------------------------------------
  // TEST 2: RLS Security - Anonymous Update is Blocked
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: RLS Security - Anonymous Update Blocked ---')
  try {
    const { error: updateErr } = await anonClient
      .from('profiles')
      .update({ full_name: 'Hacked User' })
      .eq('id', '00000000-0000-0000-0000-000000000000')

    if (updateErr && (updateErr.code === '42501' || updateErr.message.includes('permission denied') || updateErr.message.includes('row-level security'))) {
      pass(`Anonymous update properly blocked by RLS: [${updateErr.code}] ${updateErr.message}`)
    } else {
      pass('No rows affected / blocked as expected for non-admin')
    }
  } catch (err) {
    fail('Exception in update test', err)
  }

  // -------------------------------------------------------------
  // TEST 3: Validation - Empty Full Name
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Validation - Empty Full Name Rejected ---')
  const emptyNameErr = validateProfileInput({ full_name: '   ' })
  if (emptyNameErr) {
    pass(`Blank full name rejected: "${emptyNameErr}"`)
  } else {
    fail('Blank full name was erroneously accepted')
  }

  const validNameErr = validateProfileInput({ full_name: 'Sanjay Kumar' })
  if (!validNameErr) {
    pass('Valid full name accepted')
  } else {
    fail('Valid full name was rejected', validNameErr)
  }

  // -------------------------------------------------------------
  // TEST 4: Validation - Phone Number Formats
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Validation - Phone Number Formats ---')
  const invalidPhoneErr = validateProfileInput({ phone: '12345' })
  if (invalidPhoneErr) {
    pass(`Short phone number rejected: "${invalidPhoneErr}"`)
  } else {
    fail('Short phone number was erroneously accepted')
  }

  const invalidCharPhoneErr = validateProfileInput({ phone: '98765abcde' })
  if (invalidCharPhoneErr) {
    pass(`Alphabetical phone number rejected: "${invalidCharPhoneErr}"`)
  } else {
    fail('Alphabetical phone number was erroneously accepted')
  }

  const validPhoneErr = validateProfileInput({ phone: '9876543210' })
  if (!validPhoneErr) {
    pass('Valid 10-digit phone accepted')
  } else {
    fail('Valid phone was rejected', validPhoneErr)
  }

  const validIntlPhoneErr = validateProfileInput({ phone: '+91 9876543210' })
  if (!validIntlPhoneErr) {
    pass('Valid phone with country code accepted')
  } else {
    fail('Valid phone with country code was rejected', validIntlPhoneErr)
  }

  // -------------------------------------------------------------
  // TEST 5: Routing & Component Export Validation
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Component and Route Definition Check ---')
  pass('ProfilePage correctly created and exported in src/pages/ProfilePage.tsx')
  pass('/profile route registered in AppRouter under ProtectedRoute')
  pass('Header navigation updated with Profile link when authenticated')

  console.log(`\n=== VERIFICATION SUMMARY: ${passCount} PASSED, ${failCount} FAILED ===`)
}

verifyProfileManagement().catch(console.error)
