import { getSupabaseClient } from '../lib/supabase'

export type CityOption = {
  id: string
  name: string
}

let cachedCities: CityOption[] | null = null
let pendingCitiesPromise: Promise<CityOption[]> | null = null

export function clearCitiesCache(): void {
  cachedCities = null
  pendingCitiesPromise = null
}

export async function getCities(): Promise<CityOption[]> {
  if (cachedCities) {
    return cachedCities
  }
  if (pendingCitiesPromise) {
    return pendingCitiesPromise
  }

  const supabase = getSupabaseClient()

  pendingCitiesPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('id, name')
        .eq('active', true)
        .order('name')

      if (error) {
        throw error
      }

      cachedCities = (data ?? []) as CityOption[]
      return cachedCities
    } finally {
      pendingCitiesPromise = null
    }
  })()

  return pendingCitiesPromise
}

