import { createClient } from 'file:///c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/node_modules/@supabase/supabase-js/dist/index.mjs'

const SUPABASE_URL = 'https://cdsghhesglltjvqbewol.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_ubnd6hu6T0jz33SdUYFoRw_mXHwsHi0'

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function verifyCatalog() {
  console.log('=== STARTING GLOBAL PRODUCTS & SERVICES CATALOG VERIFICATION ===\n')

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
  // TEST 1: Public Products Query with Relational Joins
  // -------------------------------------------------------------
  console.log('--- TEST 1: Public Products Query with Relations ---')
  try {
    const { data: products, error: pErr } = await anonClient
      .from('business_products')
      .select(`
        id,
        business_id,
        category_id,
        subcategory_id,
        name,
        description,
        price,
        unit,
        availability,
        active,
        created_at,
        updated_at,
        businesses (
          id,
          name,
          slug,
          phone,
          whatsapp,
          address,
          pincode,
          verified,
          rating,
          review_count,
          active
        ),
        categories (
          id,
          name,
          slug
        )
      `)
      .eq('active', true)
      .limit(10)

    if (pErr) {
      fail('Failed querying business_products with joins', pErr)
    } else {
      pass(`Products query with joins succeeded. Returned ${products.length} active products.`)
    }
  } catch (err) {
    fail('Exception in products query test', err)
  }

  // -------------------------------------------------------------
  // TEST 2: Public Services Query with Relational Joins
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Public Services Query with Relations ---')
  try {
    const { data: services, error: sErr } = await anonClient
      .from('business_services')
      .select(`
        id,
        business_id,
        category_id,
        subcategory_id,
        name,
        description,
        price_from,
        price_to,
        price_unit,
        active,
        created_at,
        updated_at,
        businesses (
          id,
          name,
          slug,
          phone,
          whatsapp,
          address,
          pincode,
          verified,
          rating,
          review_count,
          active
        ),
        categories (
          id,
          name,
          slug
        )
      `)
      .eq('active', true)
      .limit(10)

    if (sErr) {
      fail('Failed querying business_services with joins', sErr)
    } else {
      pass(`Services query with joins succeeded. Returned ${services.length} active services.`)
    }
  } catch (err) {
    fail('Exception in services query test', err)
  }

  // -------------------------------------------------------------
  // TEST 3: RLS Security - Anonymous Cannot Insert into business_products
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: RLS Security - Anonymous Product Insert Blocked ---')
  try {
    const fakeProduct = {
      business_id: '00000000-0000-0000-0000-000000000000',
      category_id: '7d5b5388-eb47-4305-919e-d9ab7f142b01',
      name: 'Unauthorized Test Product',
      price: 999,
      unit: 'item',
      availability: 'available',
    }
    const { error: insertErr } = await anonClient
      .from('business_products')
      .insert(fakeProduct)

    if (
      insertErr &&
      (insertErr.code === '42501' ||
        insertErr.message.includes('row-level security') ||
        insertErr.message.includes('permission denied'))
    ) {
      pass(`Unauthorized product insert properly rejected by RLS: [${insertErr.code}] ${insertErr.message}`)
    } else {
      fail('Unauthorized user was able to insert a product!', insertErr)
    }
  } catch (err) {
    fail('Exception in product insert security test', err)
  }

  // -------------------------------------------------------------
  // TEST 4: RLS Security - Anonymous Cannot Insert into business_services
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: RLS Security - Anonymous Service Insert Blocked ---')
  try {
    const fakeService = {
      business_id: '00000000-0000-0000-0000-000000000000',
      category_id: '7d5b5388-eb47-4305-919e-d9ab7f142b01',
      name: 'Unauthorized Test Service',
      price_from: 500,
      price_to: 1000,
      price_unit: 'per visit',
    }
    const { error: insertErr } = await anonClient
      .from('business_services')
      .insert(fakeService)

    if (
      insertErr &&
      (insertErr.code === '42501' ||
        insertErr.message.includes('row-level security') ||
        insertErr.message.includes('permission denied'))
    ) {
      pass(`Unauthorized service insert properly rejected by RLS: [${insertErr.code}] ${insertErr.message}`)
    } else {
      fail('Unauthorized user was able to insert a service!', insertErr)
    }
  } catch (err) {
    fail('Exception in service insert security test', err)
  }

  // -------------------------------------------------------------
  // TEST 5: Single Item Detail Lookup Simulation
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Single Item Detail Query Format ---')
  try {
    const dummyId = '00000000-0000-0000-0000-000000000000'
    const { error: pErr } = await anonClient
      .from('business_products')
      .select('id, name, businesses(name)')
      .eq('id', dummyId)
      .single()

    // Single with no match returns PGRST116 (0 rows) which our detail pages handle gracefully
    if (pErr && pErr.code === 'PGRST116') {
      pass(`PGRST116 cleanly returned for non-existent product ID as expected`)
    } else if (!pErr) {
      pass(`Product found and returned single record`)
    } else {
      fail('Unexpected error for single product query', pErr)
    }

    const { error: sErr } = await anonClient
      .from('business_services')
      .select('id, name, businesses(name)')
      .eq('id', dummyId)
      .single()

    if (sErr && sErr.code === 'PGRST116') {
      pass(`PGRST116 cleanly returned for non-existent service ID as expected`)
    } else if (!sErr) {
      pass(`Service found and returned single record`)
    } else {
      fail('Unexpected error for single service query', sErr)
    }
  } catch (err) {
    fail('Exception in single item lookup test', err)
  }

  console.log(`\n=== VERIFICATION COMPLETE: ${passCount} PASSED, ${failCount} FAILED ===`)
}

verifyCatalog().catch(console.error)
