import { createClient } from 'file:///c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/node_modules/@supabase/supabase-js/dist/index.mjs'

const SUPABASE_URL = 'https://cdsghhesglltjvqbewol.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_ubnd6hu6T0jz33SdUYFoRw_mXHwsHi0'

async function checkAccount(email, password) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError) {
    console.log(`[${email}] Sign in error:`, authError.message)
    return null
  }

  const userId = authData.user.id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, full_name, active')
    .eq('id', userId)
    .single()

  console.log(`[${email}] User ID: ${userId} | Profile:`, profile, 'Error:', profileError?.message)
  return { userId, profile }
}

async function main() {
  console.log('--- Checking Karthik account ---')
  await checkAccount('karthik.superhosur2026@gmail.com', 'TestPassword123!')

  console.log('--- Checking Sanjay account ---')
  await checkAccount('sanjayvijaykumar1720@gmail.com', 'TestPassword123!')
}

main()
