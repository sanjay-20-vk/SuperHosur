import { createClient } from 'file:///c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/node_modules/@supabase/supabase-js/dist/index.mjs'

const supabaseUrl = 'https://cdsghhesglltjvqbewol.supabase.co'
const supabaseAnonKey = 'sb_publishable_ubnd6hu6T0jz33SdUYFoRw_mXHwsHi0'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testPropertySystem() {
  console.log('--- 1. Testing Storage Bucket ---')
  const { data: buckets, error: bErr } = await supabase.storage.listBuckets()
  if (bErr) {
    console.error('Storage list error:', bErr)
  } else {
    const propBucket = buckets.find(b => b.id === 'property-photos')
    console.log('property-photos bucket exists:', Boolean(propBucket), propBucket ? { id: propBucket.id, public: propBucket.public } : null)
  }

  console.log('\n--- 2. Testing Cities Fetch ---')
  const { data: cities, error: cErr } = await supabase.from('cities').select('id, name').limit(3)
  if (cErr) console.error('Cities error:', cErr)
  else console.log('Sample cities:', cities)

  console.log('\n--- 3. Testing Properties Public Read (RLS) ---')
  const { data: props, error: pErr } = await supabase
    .from('properties')
    .select('id, title, verified, active')
    .eq('verified', true)
    .eq('active', true)
  if (pErr) console.error('Properties public fetch error:', pErr)
  else console.log('Verified public properties count:', props.length)

  console.log('\n--- 4. Testing Profiles (for existing test owner) ---')
  const { data: profiles, error: prErr } = await supabase
    .from('profiles')
    .select('id, full_name, role, active')
    .limit(5)
  if (prErr) console.error('Profiles fetch error:', prErr)
  else console.log('Profiles:', profiles)
}

testPropertySystem().catch(console.error)
