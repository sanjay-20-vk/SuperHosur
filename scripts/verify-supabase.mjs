import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL is missing from .env')
}

if (!supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_ANON_KEY is missing from .env')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)
console.log('ENV_LOADED VITE_SUPABASE_URL=present VITE_SUPABASE_ANON_KEY=present')
console.log('CLIENT_INITIALIZED passed')

const { error: sessionError } = await supabase.auth.getSession()

if (sessionError) {
  throw new Error(`Auth session check failed: ${sessionError.message}`)
}

console.log('AUTH_SESSION_CHECK passed')

const { error: storageError } = await supabase.storage.listBuckets()

if (storageError) {
  throw new Error(`Read-only Supabase SDK check failed: ${storageError.message}`)
}

console.log('READ_ONLY_SUPABASE_SDK_CHECK passed')