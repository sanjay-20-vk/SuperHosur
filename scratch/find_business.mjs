import { createClient } from 'file:///c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/node_modules/@supabase/supabase-js/dist/index.mjs'

const SUPABASE_URL = 'https://cdsghhesglltjvqbewol.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_ubnd6hu6T0jz33SdUYFoRw_mXHwsHi0'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function run() {
  const { data: businesses, error } = await supabase.rpc('inspect_all_businesses')

  if (error) {
    console.error('Error fetching businesses:', error)
  } else {
    console.log('Businesses:', JSON.stringify(businesses, null, 2))
  }
}

run()
