import { createClient } from 'file:///c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/node_modules/@supabase/supabase-js/dist/index.mjs'

const SUPABASE_URL = 'https://cdsghhesglltjvqbewol.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_ubnd6hu6T0jz33SdUYFoRw_mXHwsHi0'

const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function runVerification() {
  console.log('=================================================================')
  console.log('   SUBCATEGORY SUPPLY INTEGRATION SUITE VERIFICATION')
  console.log('=================================================================\n')

  // 1. Verify Subcategories Retrieval for Multiple Categories
  console.log('1. Subcategories Taxonomy Verification:')
  const { data: categories, error: catErr } = await client
    .from('categories')
    .select('id, name, slug')
    .order('name')

  if (catErr || !categories || categories.length === 0) {
    throw new Error('Failed to load categories: ' + JSON.stringify(catErr))
  }

  const { data: allSubcategories, error: subErr } = await client
    .from('subcategories')
    .select('id, category_id, name, slug, description, active')
    .eq('active', true)
    .order('name')

  if (subErr || !allSubcategories) {
    throw new Error('Failed to load subcategories: ' + JSON.stringify(subErr))
  }

  console.log(`✓ Retrieved ${categories.length} categories and ${allSubcategories.length} seeded subcategories.`)
  for (const cat of categories.slice(0, 4)) {
    const subcats = allSubcategories.filter((s) => s.category_id === cat.id)
    console.log(`   - Category "${cat.name}": ${subcats.length} subcategories (${subcats.map((s) => s.name).join(', ') || 'none'})`)
  }

  // 2. Querying Business Services with Joined Subcategories
  console.log('\n2. Services Query Structure & Subcategories Join Verification:')
  const { data: serviceRows, error: sErr } = await client
    .from('business_services')
    .select(`
      id,
      name,
      category_id,
      subcategory_id,
      price_from,
      price_to,
      price_unit,
      categories (id, name, slug),
      subcategories (id, name, slug)
    `)
    .limit(5)

  if (sErr) {
    throw new Error('business_services joined query failed: ' + JSON.stringify(sErr))
  }
  console.log(`✓ business_services joined query succeeded (columns and relationship intact, returned ${serviceRows.length} rows)`)

  // 3. Querying Business Products with Joined Subcategories
  console.log('\n3. Products Query Structure & Subcategories Join Verification:')
  const { data: productRows, error: pErr } = await client
    .from('business_products')
    .select(`
      id,
      name,
      category_id,
      subcategory_id,
      price,
      unit,
      availability,
      categories (id, name, slug),
      subcategories (id, name, slug)
    `)
    .limit(5)

  if (pErr) {
    throw new Error('business_products joined query failed: ' + JSON.stringify(pErr))
  }
  console.log(`✓ business_products joined query succeeded (columns and relationship intact, returned ${productRows.length} rows)`)

  // 4. Catalog Subcategory Filtering Query
  console.log('\n4. Catalog Subcategory Filtering Verification:')
  const sampleSubcat = allSubcategories[0]
  const { data: filteredProducts, error: fErr } = await client
    .from('business_products')
    .select(`
      id,
      name,
      category_id,
      subcategory_id,
      subcategories (id, name, slug)
    `)
    .eq('subcategory_id', sampleSubcat.id)
    .limit(5)

  if (fErr) {
    throw new Error('Catalog subcategory filter query failed: ' + JSON.stringify(fErr))
  }
  console.log(`✓ Subcategory filter query for "${sampleSubcat.name}" (${sampleSubcat.id}) succeeded.`)

  // 5. RLS Security Enforcement
  console.log('\n5. RLS Security Verification on Supply Mutation:')
  const { error: insertErr } = await client
    .from('business_services')
    .insert({
      business_id: '00000000-0000-0000-0000-000000000001',
      category_id: sampleSubcat.category_id,
      subcategory_id: sampleSubcat.id,
      name: 'Unauthorized Insertion Test',
    })

  if (insertErr) {
    console.log(`✓ Unauthenticated supply mutation was blocked by RLS/Postgres as expected: ${insertErr.message}`)
  } else {
    throw new Error('SECURITY VIOLATION: Unauthenticated insertion into business_services was allowed!')
  }

  console.log('\n=================================================================')
  console.log('   ALL 5 SUBCATEGORY SUPPLY VERIFICATION CRITERIA PASSED')
  console.log('=================================================================')
}

runVerification().catch((err) => {
  console.error('Verification failed:', err)
  process.exit(1)
})
