import { getSupabaseClient } from '../lib/supabase'

export type CityOption = {
  id: string
  name: string
}

export async function getCities(): Promise<CityOption[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('cities')
    .select('id, name')
    .eq('active', true)
    .order('name')

  if (error) {
    throw error
  }

  return (data ?? []) as CityOption[]
}
