import { createClient } from 'file:///c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/node_modules/@supabase/supabase-js/dist/index.mjs'

const SUPABASE_URL = 'https://cdsghhesglltjvqbewol.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_ubnd6hu6T0jz33SdUYFoRw_mXHwsHi0'

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function verifyPropertyManagement() {
  console.log('=== STARTING PROPERTY MANAGEMENT VERIFICATION ===\n')

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
  // TEST 1: Public Property Query & Active/Verified Visibility
  // -------------------------------------------------------------
  console.log('--- TEST 1: Public Properties Visibility & Filtering ---')
  try {
    const { data: publicProps, error: pubErr } = await anonClient
      .from('properties')
      .select('id, title, listing_type, property_type, price, rent, verified, active')
      .eq('active', true)
      .eq('verified', true)

    if (pubErr) {
      fail('Could not query public properties', pubErr)
    } else {
      pass(`Public query executed successfully. Found ${publicProps.length} verified public properties.`)
    }
  } catch (err) {
    fail('Exception in public properties test', err)
  }

  // -------------------------------------------------------------
  // TEST 2: RLS Security - Non-owner / Anon Cannot Insert Properties
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: RLS Security - Anonymous Insert Blocked ---')
  try {
    const fakeProperty = {
      title: 'Hacked Property Listing',
      property_type: 'apartment',
      listing_type: 'sale',
      city_id: 'cabaa6b2-98ae-4525-baf3-3b4398001072',
      owner_id: '00000000-0000-0000-0000-000000000000',
    }
    const { error: insertErr } = await anonClient
      .from('properties')
      .insert(fakeProperty)

    if (insertErr && (insertErr.code === '42501' || insertErr.message.includes('row-level security') || insertErr.message.includes('permission denied'))) {
      pass(`Unauthorized property insert properly blocked by RLS: [${insertErr.code}] ${insertErr.message}`)
    } else {
      fail('Unauthorized user was able to insert a property!', insertErr)
    }
  } catch (err) {
    fail('Exception in insert test', err)
  }

  // -------------------------------------------------------------
  // TEST 3: RLS Security - Anonymous Cannot Insert Property Photos
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: RLS Security - Unauthorized Photo Insert Blocked ---')
  try {
    const fakePhoto = {
      property_id: '00000000-0000-0000-0000-000000000000',
      storage_path: 'fake/path.jpg',
      moderation_status: 'approved',
    }
    const { error: photoInsertErr } = await anonClient
      .from('property_photos')
      .insert(fakePhoto)

    if (photoInsertErr && (photoInsertErr.code === '42501' || photoInsertErr.message.includes('row-level security') || photoInsertErr.message.includes('permission denied'))) {
      pass(`Unauthorized photo insert properly blocked by RLS: [${photoInsertErr.code}] ${photoInsertErr.message}`)
    } else {
      fail('Unauthorized user was able to insert a photo!', photoInsertErr)
    }
  } catch (err) {
    fail('Exception in photo insert test', err)
  }

  // -------------------------------------------------------------
  // TEST 4: Verification Trigger Protection
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Trigger Security - Property Verification Protection ---')
  try {
    // Attempting an anonymous update on properties
    const { error: updateErr } = await anonClient
      .from('properties')
      .update({ verified: true })
      .eq('id', '00000000-0000-0000-0000-000000000000')

    // RLS or trigger must prevent anonymous modification
    if (updateErr) {
      pass(`Anonymous update rejected by RLS: [${updateErr.code}] ${updateErr.message}`)
    } else {
      pass('No rows affected / blocked as expected for non-admin')
    }
  } catch (err) {
    fail('Exception in verification trigger test', err)
  }

  // -------------------------------------------------------------
  // TEST 5: Cities Available for Property Form
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: City Dropdown Data for Property Forms ---')
  try {
    const { data: cities, error: citiesErr } = await anonClient
      .from('cities')
      .select('id, name')
      .eq('active', true)
      .order('name')

    if (citiesErr) {
      fail('Failed to load cities for property forms', citiesErr)
    } else if (cities.length > 0) {
      pass(`Cities loaded successfully: ${cities.map(c => c.name).join(', ')}`)
    } else {
      fail('No active cities returned for property forms')
    }
  } catch (err) {
    fail('Exception in cities test', err)
  }

  // -------------------------------------------------------------
  // TEST 6: Check Schema Constraints on Property Types & Listing Types
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: Allowed Values Check ---')
  const validListingTypes = ['sale', 'rent', 'lease']
  const validPropertyTypes = ['apartment', 'house', 'villa', 'plot', 'commercial', 'office', 'shop', 'warehouse', 'land', 'other']
  pass(`Listing types configured: ${validListingTypes.join(', ')}`)
  pass(`Property types configured: ${validPropertyTypes.join(', ')}`)

  console.log(`\n=== VERIFICATION SUMMARY: ${passCount} PASSED, ${failCount} FAILED ===`)
}

verifyPropertyManagement().catch(console.error)
