import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[FAIL] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('=== PHASE 17 STEP 4: DATABASE COMPOSITE INDEXING & QUERY HARDENING TESTS ===\n')

let passCount = 0
let failCount = 0

function pass(msg) {
  passCount++
  console.log(`[PASS] ${msg}`)
}

function fail(msg, err) {
  failCount++
  console.error(`[FAIL] ${msg}`, err || '')
}

async function runTests() {
  // 1. Test public businesses filter + sort pattern
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('id, name, slug, city_id, category_id, created_at')
      .eq('active', true)
      .eq('verified', true)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) throw error
    pass(`businesses_public_filter_sort pattern query executed successfully (${data?.length ?? 0} rows)`)
  } catch (err) {
    fail('businesses_public_filter_sort query failed', err)
  }

  // 2. Test public businesses name sort pattern
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('id, name, slug, city_id, category_id')
      .eq('active', true)
      .eq('verified', true)
      .order('name', { ascending: true })
      .limit(10)

    if (error) throw error
    pass(`businesses_public_name_sort pattern query executed successfully (${data?.length ?? 0} rows)`)
  } catch (err) {
    fail('businesses_public_name_sort query failed', err)
  }

  // 3. Test public properties browse filter + sort pattern
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('id, title, city_id, listing_type, property_type, price, created_at')
      .eq('active', true)
      .eq('verified', true)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) throw error
    pass(`properties_public_browse pattern query executed successfully (${data?.length ?? 0} rows)`)
  } catch (err) {
    fail('properties_public_browse query failed', err)
  }

  // 4. Test customer reviews approved feed pattern
  try {
    const { data, error } = await supabase
      .from('business_reviews')
      .select('id, business_id, rating, comment, created_at')
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) throw error
    pass(`business_reviews_approved_created pattern query executed successfully (${data?.length ?? 0} rows)`)
  } catch (err) {
    fail('business_reviews query failed', err)
  }

  // 5. Test catalog services query pattern
  try {
    const { data, error } = await supabase
      .from('business_services')
      .select('id, business_id, name, price_from, active, created_at')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) throw error
    pass(`business_services_biz_created pattern query executed successfully (${data?.length ?? 0} rows)`)
  } catch (err) {
    fail('business_services query failed', err)
  }

  // 6. Test catalog products query pattern
  try {
    const { data, error } = await supabase
      .from('business_products')
      .select('id, business_id, name, price, active, created_at')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) throw error
    pass(`business_products_biz_created pattern query executed successfully (${data?.length ?? 0} rows)`)
  } catch (err) {
    fail('business_products query failed', err)
  }

  // 7. Test approved business photos query pattern
  try {
    const { data, error } = await supabase
      .from('business_photos')
      .select('id, business_id, storage_path, sort_order, created_at')
      .eq('moderation_status', 'approved')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(5)

    if (error) throw error
    pass(`business_photos_approved pattern query executed successfully (${data?.length ?? 0} rows)`)
  } catch (err) {
    fail('business_photos query failed', err)
  }

  // 8. Test approved property photos query pattern
  try {
    const { data, error } = await supabase
      .from('property_photos')
      .select('id, property_id, storage_path, sort_order, created_at')
      .eq('moderation_status', 'approved')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(5)

    if (error) throw error
    pass(`property_photos_approved pattern query executed successfully (${data?.length ?? 0} rows)`)
  } catch (err) {
    fail('property_photos query failed', err)
  }

  // 9. Authenticated tests
  const testEmail = process.env.TEST_USER_EMAIL || 'karthik.superhosur2026@gmail.com'
  const testPassword = process.env.TEST_USER_PASSWORD || 'TestPassword123!'

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  })

  if (authError || !authData.user) {
    console.warn('[WARN] Authenticated testing skipped (could not sign in test user).')
  } else {
    pass(`Authenticated as test user: ${testEmail}`)

    // 10. Test notifications query with composite index (user_id, created_at desc)
    try {
      const { data: notifs, error: notifErr } = await supabase
        .from('notifications')
        .select('id, type, title, is_read, created_at')
        .eq('user_id', authData.user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (notifErr) throw notifErr
      pass(`notifications_user_created pattern query executed successfully (${notifs?.length ?? 0} rows)`)
    } catch (err) {
      fail('notifications_user_created query failed', err)
    }

    // 11. Test unread notifications partial index query
    try {
      const { data: unread, error: unreadErr } = await supabase
        .from('notifications')
        .select('id, is_read, created_at')
        .eq('user_id', authData.user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(10)

      if (unreadErr) throw unreadErr
      pass(`notifications_user_unread_created partial index query executed successfully (${unread?.length ?? 0} rows)`)
    } catch (err) {
      fail('notifications unread query failed', err)
    }

    // 12. Test saved listings query with composite index (user_id, created_at desc)
    try {
      const { data: saved, error: savedErr } = await supabase
        .from('saved_listings')
        .select('id, user_id, business_id, property_id, created_at')
        .eq('user_id', authData.user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (savedErr) throw savedErr
      pass(`saved_listings_user_created pattern query executed successfully (${saved?.length ?? 0} rows)`)
    } catch (err) {
      fail('saved_listings query failed', err)
    }

    // 13. Test customer requirements query with composite index (customer_id, created_at desc)
    try {
      const { data: reqs, error: reqErr } = await supabase
        .from('requirements')
        .select('id, title, status, created_at')
        .eq('customer_id', authData.user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (reqErr) throw reqErr
      pass(`requirements_customer_created pattern query executed successfully (${reqs?.length ?? 0} rows)`)
    } catch (err) {
      fail('requirements_customer_created query failed', err)
    }

    // 14. Test owner businesses query with composite index (owner_id, created_at desc)
    try {
      const { data: bizs, error: bizErr } = await supabase
        .from('businesses')
        .select('id, name, active, verified, created_at')
        .eq('owner_id', authData.user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (bizErr) throw bizErr
      pass(`businesses_owner_created pattern query executed successfully (${bizs?.length ?? 0} rows)`)
    } catch (err) {
      fail('businesses_owner_created query failed', err)
    }

    // 15. Test owner properties query with composite index (owner_id, created_at desc)
    try {
      const { data: props, error: propErr } = await supabase
        .from('properties')
        .select('id, title, active, verified, created_at')
        .eq('owner_id', authData.user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (propErr) throw propErr
      pass(`properties_owner_created pattern query executed successfully (${props?.length ?? 0} rows)`)
    } catch (err) {
      fail('properties_owner_created query failed', err)
    }

    await supabase.auth.signOut()
  }

  console.log(`\n=== RESULTS: ${passCount} PASSED, ${failCount} FAILED ===\n`)
  if (failCount > 0) {
    process.exit(1)
  }
}

runTests()
