import { createClient } from 'file:///c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/node_modules/@supabase/supabase-js/dist/index.mjs'

const SUPABASE_URL = 'https://cdsghhesglltjvqbewol.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_ubnd6hu6T0jz33SdUYFoRw_mXHwsHi0'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function testServiceInsert() {
  console.log('Signing in as Karthik...')
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'karthik.superhosur2026@gmail.com',
    password: 'TestPassword123!',
  })

  if (authError) {
    console.error('Sign in error:', authError)
    return
  }

  console.log('Signed in as user:', authData.user.id)

  const payload = {
    business_id: '1c6ec6e0-af74-47cb-a157-9d4b1d531352',
    category_id: '3ab2219c-8c11-43e7-a850-40836d6267b7',
    subcategory_id: null,
    name: 'Car General Service',
    description: 'Complete car inspection, engine check, oil check and basic maintenance.',
    price_from: 800,
    price_to: 1500,
    price_unit: 'per visit',
  }

  console.log('Attempting to insert service with payload:', payload)
  const { data, error } = await supabase
    .from('business_services')
    .insert(payload)
    .select('*')
    .single()

  if (error) {
    console.error('INSERT ERROR FULL DETAILS:', JSON.stringify(error, null, 2))
  } else {
    console.log('INSERT SUCCESS:', data)
  }

  console.log('Testing create product for Karthik...')
  const productPayload = {
    business_id: '1c6ec6e0-af74-47cb-a157-9d4b1d531352',
    category_id: '3ab2219c-8c11-43e7-a850-40836d6267b7',
    subcategory_id: null,
    name: 'Car Oil Filter',
    description: 'High performance car oil filter',
    price: 350,
    unit: 'per piece',
    availability: 'available',
  }

  const { data: prodData, error: prodError } = await supabase
    .from('business_products')
    .insert(productPayload)
    .select('*')
    .single()

  if (prodError) {
    console.error('Product insert error:', prodError)
  } else {
    console.log('Product insert SUCCESS:', prodData.id, prodData.name)
  }
}

testServiceInsert()
