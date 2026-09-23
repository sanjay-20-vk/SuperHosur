import { createClient } from 'file:///c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/node_modules/@supabase/supabase-js/dist/index.mjs'

const SUPABASE_URL = 'https://cdsghhesglltjvqbewol.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_ubnd6hu6T0jz33SdUYFoRw_mXHwsHi0'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function test() {
  const email = `test_req_${Date.now()}@gmail.com`
  const password = 'TestPassword123!'
  
  console.log('Attempting sign up:', email)
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: 'Test Customer',
      },
    },
  })
  
  if (authErr) {
    console.error('Sign up error:', authErr)
    return
  }
  
  const user = authData.user
  console.log('User created:', user?.id, 'Session:', Boolean(authData.session))
  
  // If no session (email confirmation required), try signing in
  let client = supabase
  if (!authData.session) {
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (signInErr) {
      console.log('Sign in error (may need email confirmation):', signInErr.message)
    } else {
      console.log('Sign in succeeded, session present')
    }
  }

  // Get cities and categories for a valid insert
  const { data: cities } = await client.from('cities').select('id').limit(1)
  const { data: categories } = await client.from('categories').select('id').limit(1)

  console.log('City:', cities?.[0]?.id, 'Category:', categories?.[0]?.id)

  // Now attempt to insert a requirement row
  const payload = {
    customer_id: user?.id,
    city_id: cities?.[0]?.id,
    category_id: categories?.[0]?.id,
    title: 'Test Requirement For RLS Investigation',
    description: 'Testing RLS insert',
    status: 'open',
  }

  console.log('Inserting payload with user client:', payload)
  const { data: reqData, error: reqErr } = await client
    .from('requirements')
    .insert(payload)
    .select('*')
    .single()

  console.log('Insert result:', reqErr ? reqErr : reqData)
}

test()
