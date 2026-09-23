const metaEnv = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : undefined
const globalProcess = (globalThis as unknown as { process?: { env?: Record<string, string> } }).process

export const clientEnvironment = {
  supabaseUrl: metaEnv?.['VITE_SUPABASE_URL'] ?? globalProcess?.env?.['VITE_SUPABASE_URL'],
  supabaseAnonKey: metaEnv?.['VITE_SUPABASE_ANON_KEY'] ?? globalProcess?.env?.['VITE_SUPABASE_ANON_KEY'],
}

