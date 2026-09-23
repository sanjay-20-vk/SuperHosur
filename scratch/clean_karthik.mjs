import { createClient } from 'file:///c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/node_modules/@supabase/supabase-js/dist/index.mjs'

const SUPABASE_URL = 'https://cdsghhesglltjvqbewol.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_ubnd6hu6T0jz33SdUYFoRw_mXHwsHi0'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function clean() {
  await supabase.auth.signInWithPassword({
    email: 'karthik.superhosur2026@gmail.com',
    password: 'TestPassword123!',
  })

  const { data: delServices, error: delServErr } = await supabase
    .from('business_services')
    .delete()
    .eq('business_id', '1c6ec6e0-af74-47cb-a157-9d4b1d531352')

  const { data: delProds, error: delProdErr } = await supabase
    .from('business_products')
    .delete()
    .eq('business_id', '1c6ec6e0-af74-47cb-a157-9d4b1d531352')

  console.log('Cleaned test offerings for Karthik. delServices error:', delServErr, 'delProds error:', delProdErr)
}

clean()
