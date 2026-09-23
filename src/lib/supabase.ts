import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { clientEnvironment } from './env'

let supabaseClient: SupabaseClient | undefined

function requireClientEnvironment() {
  const { supabaseUrl, supabaseAnonKey } = clientEnvironment

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    )
  }

  return { supabaseUrl, supabaseAnonKey }
}

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const { supabaseUrl, supabaseAnonKey } = requireClientEnvironment()
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
  }

  return supabaseClient
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    clientEnvironment.supabaseUrl && clientEnvironment.supabaseAnonKey,
  )
}
