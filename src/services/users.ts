import { getSupabaseClient } from '../lib/supabase'

export type UserRole = 'customer' | 'vendor' | 'admin'

export type AdminUserRecord = {
  id: string
  email: string | null
  role: UserRole
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export async function getAdminUsers(): Promise<AdminUserRecord[]> {
  const supabase = getSupabaseClient()

  // First try the secure RPC which includes auth email
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_admin_users')

  if (!rpcError && rpcData) {
    return rpcData as AdminUserRecord[]
  }

  // Fallback directly to profiles table
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []).map((p) => ({
    id: p.id,
    email: null,
    role: p.role as UserRole,
    full_name: p.full_name,
    phone: p.phone,
    avatar_url: p.avatar_url,
    active: p.active,
    created_at: p.created_at,
    updated_at: p.updated_at,
  }))
}

export async function updateAdminUserRole(
  userId: string,
  role: UserRole,
): Promise<void> {
  const supabase = getSupabaseClient()

  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)

  if (error) {
    throw error
  }
}

export async function setAdminUserActive(
  userId: string,
  active: boolean,
): Promise<void> {
  const supabase = getSupabaseClient()

  const { error } = await supabase
    .from('profiles')
    .update({ active })
    .eq('id', userId)

  if (error) {
    throw error
  }
}
