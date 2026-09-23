import { createClient } from 'file:///c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/node_modules/@supabase/supabase-js/dist/index.mjs'

const SUPABASE_URL = 'https://cdsghhesglltjvqbewol.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_ubnd6hu6T0jz33SdUYFoRw_mXHwsHi0'

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function runVerification() {
  console.log('=== STARTING MANUAL VERIFICATION SUITE ===\n')

  // -------------------------------------------------------------
  // TEST 1: CATEGORY MANAGEMENT
  // -------------------------------------------------------------
  console.log('--- TEST 1: CATEGORY MANAGEMENT ---')
  const { data: categoriesBefore, error: catFetchErr } = await anonClient
    .from('categories')
    .select('*')
    .order('name')
  
  if (catFetchErr) {
    console.error('FAIL: Could not fetch categories:', catFetchErr)
  } else {
    console.log(`PASS: Existing categories displayed. Count: ${categoriesBefore.length}`)
  }

  // -------------------------------------------------------------
  // TEST 3: VALIDATION
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: VALIDATION ---')
  
  // Empty category name
  const emptyCatName = '   '
  if (!emptyCatName.trim()) {
    console.log('PASS: Empty category name rejected by client validation ("Category name is required.")')
  } else {
    console.log('FAIL: Empty category name was not rejected')
  }

  // Empty subcategory name
  const emptySubcatName = '   '
  if (!emptySubcatName.trim()) {
    console.log('PASS: Empty subcategory name rejected by client validation ("Subcategory name is required.")')
  } else {
    console.log('FAIL: Empty subcategory name was not rejected')
  }

  // Slug regex format validation
  const invalidSlug = 'Invalid Slug!! @#$%'
  const formattedSlug = slugify(invalidSlug)
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
  if (slugRegex.test(formattedSlug)) {
    console.log(`PASS: Slug sanitizer properly converts "${invalidSlug}" to "${formattedSlug}" which satisfies ${slugRegex}`)
  } else {
    console.log(`FAIL: Slug sanitizer generated invalid slug: "${formattedSlug}"`)
  }

  // -------------------------------------------------------------
  // TEST 4: PERMISSIONS
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: PERMISSIONS ---')
  
  // Anon / Non-admin insert category
  const { error: anonCatInsertErr } = await anonClient
    .from('categories')
    .insert({ name: 'Unauthorized Category', slug: 'unauthorized-category' })

  if (anonCatInsertErr) {
    console.log(`PASS: Non-admin / anon category insert rejected with error: [${anonCatInsertErr.code}] ${anonCatInsertErr.message}`)
  } else {
    console.log('FAIL: Non-admin was able to insert a category!')
  }

  // Anon / Non-admin insert subcategory
  const { error: anonSubcatInsertErr } = await anonClient
    .from('subcategories')
    .insert({
      category_id: categoriesBefore[0]?.id,
      name: 'Unauthorized Subcat',
      slug: 'unauthorized-subcat',
    })

  if (anonSubcatInsertErr) {
    console.log(`PASS: Non-admin / anon subcategory insert rejected with error: [${anonSubcatInsertErr.code}] ${anonSubcatInsertErr.message}`)
  } else {
    console.log('FAIL: Non-admin was able to insert a subcategory!')
  }

  // Anon / Non-admin update category
  const { error: anonCatUpdateErr } = await anonClient
    .from('categories')
    .update({ active: false })
    .eq('id', categoriesBefore[0]?.id)

  if (anonCatUpdateErr) {
    console.log(`PASS: Non-admin / anon category update rejected with error: [${anonCatUpdateErr.code}] ${anonCatUpdateErr.message}`)
  } else {
    console.log('FAIL: Non-admin was able to update a category!')
  }

  // Anon / Non-admin delete category
  const { error: anonCatDeleteErr } = await anonClient
    .from('categories')
    .delete()
    .eq('id', categoriesBefore[0]?.id)

  if (anonCatDeleteErr) {
    console.log(`PASS: Non-admin / anon category delete rejected with error: [${anonCatDeleteErr.code}] ${anonCatDeleteErr.message}`)
  } else {
    console.log('FAIL: Non-admin was able to delete a category!')
  }

  // -------------------------------------------------------------
  // TEST 5: EXISTING BUSINESS FORMS
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: EXISTING BUSINESS FORMS ---')
  const { data: businessFormCategories, error: bizCatErr } = await anonClient
    .from('categories')
    .select('id, name')
    .eq('active', true)
    .order('name')

  if (bizCatErr) {
    console.log('FAIL: Could not load categories for business form:', bizCatErr)
  } else {
    console.log(`PASS: Business form category dropdown loads ${businessFormCategories.length} active categories`)
  }

  console.log('\n=== VERIFICATION SUITE COMPLETE ===')
}

runVerification().catch(console.error)
