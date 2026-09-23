import { createClient } from 'file:///c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/node_modules/@supabase/supabase-js/dist/index.mjs'

const SUPABASE_URL = 'https://cdsghhesglltjvqbewol.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_ubnd6hu6T0jz33SdUYFoRw_mXHwsHi0'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function run() {
  console.log('Signing in as customer...')
  const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'sanjayvijaykumar1720@gmail.com',
    password: 'TestPassword123!',
  })

  if (signInError) {
    console.error('Sign in failed:', signInError)
    return
  }

  const userId = authData.user.id
  console.log('Signed in successfully! Authenticated User ID:', userId)

  const { data: cities } = await supabase.from('cities').select('id').limit(1)
  const { data: categories } = await supabase.from('categories').select('id').limit(1)

  const cityId = cities[0].id
  const categoryId = categories[0].id
  console.log('City ID:', cityId, 'Category ID:', categoryId)

  // Emulate payload from src/services/requirements.ts:
  const payload = {
    customer_id: userId,
    city_id: cityId,
    category_id: categoryId,
    subcategory_id: null,
    title: 'Test Requirement Creation',
    description: 'Testing customer requirement creation',
    budget_min: 1000,
    budget_max: 5000,
    required_date: null,
    duration: null,
    address: 'Hosur Town',
    ai_extracted_data: {},
    status: 'open',
  }

  console.log('Attempting insert with unauthorized customer_id (should FAIL with RLS error)...')
  const unauthorizedPayload = {
    ...payload,
    customer_id: '5fb98086-6d50-437b-a1b4-ff0fd0e9e9a4', // Different user ID (Test Vendor)
  }

  const { data: evilData, error: evilError } = await supabase
    .from('requirements')
    .insert(unauthorizedPayload)
    .select('*')
    .single()

  if (evilError) {
    console.log('Unauthorized insert BLOCKED by RLS as expected:', evilError.code, evilError.message)
  } else {
    console.error('SECURITY VULNERABILITY: Unauthorized insert succeeded!', evilData)
  }
}

run()
