import { getSupabaseClient } from '../lib/supabase'

export type OfferingSubcategoryInfo = {
  id: string
  name: string
  slug: string
}

function normalizeJoinedRecord<T>(value: unknown): T | null {
  if (!value) return null
  if (Array.isArray(value)) return (value[0] as T) ?? null
  return value as T
}

export type BusinessService = {
  id: string
  business_id: string
  category_id: string
  subcategory_id: string | null
  name: string
  description: string | null
  price_from: number | null
  price_to: number | null
  price_unit: string | null
  active: boolean
  created_at: string
  updated_at: string
  subcategories?: OfferingSubcategoryInfo | null
}

export type BusinessProduct = {
  id: string
  business_id: string
  category_id: string
  subcategory_id: string | null
  name: string
  description: string | null
  price: number
  unit: string | null
  availability: 'available' | 'limited' | 'unavailable'
  active: boolean
  created_at: string
  updated_at: string
  subcategories?: OfferingSubcategoryInfo | null
}

export type ServiceInput = {
  business_id: string
  category_id: string
  subcategory_id: string | null
  name: string
  description: string | null
  price_from: number | null
  price_to: number | null
  price_unit: string | null
}

export type ProductInput = {
  business_id: string
  category_id: string
  subcategory_id: string | null
  name: string
  description: string | null
  price: number
  unit: string | null
  availability: BusinessProduct['availability']
}

export async function getBusinessServices(businessId: string): Promise<BusinessService[]> {
  const { data, error } = await getSupabaseClient()
    .from('business_services')
    .select(`
      *,
      subcategories (
        id,
        name,
        slug
      )
    `)
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((row) => ({
    ...row,
    subcategories: normalizeJoinedRecord<OfferingSubcategoryInfo>(row.subcategories),
  })) as BusinessService[]
}

export async function getBusinessProducts(businessId: string): Promise<BusinessProduct[]> {
  const { data, error } = await getSupabaseClient()
    .from('business_products')
    .select(`
      *,
      subcategories (
        id,
        name,
        slug
      )
    `)
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((row) => ({
    ...row,
    subcategories: normalizeJoinedRecord<OfferingSubcategoryInfo>(row.subcategories),
  })) as BusinessProduct[]
}

export async function createBusinessService(input: ServiceInput): Promise<BusinessService> {
  const { data, error } = await getSupabaseClient()
    .from('business_services')
    .insert(input)
    .select('*')
    .single()

  if (error) throw error
  return data as BusinessService
}

export async function updateBusinessService(
  serviceId: string,
  input: Partial<Omit<ServiceInput, 'business_id'>>,
): Promise<void> {
  // Do not use .select().single() here: the RETURNING clause triggers SELECT RLS
  // (business_services_owner_select via owns_business sub-select) which fails for
  // unverified businesses, surfacing as PGRST116 / "Unable to save this service".
  // Callers never use the returned row — they call refreshSupply() instead.
  const { error } = await getSupabaseClient()
    .from('business_services')
    .update(input)
    .eq('id', serviceId)

  if (error) throw error
}

export async function deleteBusinessService(serviceId: string): Promise<void> {
  const { error } = await getSupabaseClient()
    .from('business_services')
    .delete()
    .eq('id', serviceId)

  if (error) throw error
}

export async function createBusinessProduct(input: ProductInput): Promise<BusinessProduct> {
  const { data, error } = await getSupabaseClient()
    .from('business_products')
    .insert(input)
    .select('*')
    .single()

  if (error) throw error
  return data as BusinessProduct
}

export async function updateBusinessProduct(
  productId: string,
  input: Partial<Omit<ProductInput, 'business_id'>>,
): Promise<void> {
  // Same as updateBusinessService — omit .select().single() to avoid RETURNING
  // RLS failure. Callers discard the return value and call refreshSupply() instead.
  const { error } = await getSupabaseClient()
    .from('business_products')
    .update(input)
    .eq('id', productId)

  if (error) throw error
}

export async function deleteBusinessProduct(productId: string): Promise<void> {
  const { error } = await getSupabaseClient()
    .from('business_products')
    .delete()
    .eq('id', productId)

  if (error) throw error
}

export type OfferingType = 'product' | 'service'

export type OfferingBusinessInfo = {
  id: string
  name: string
  slug: string
  phone: string | null
  whatsapp: string | null
  address: string | null
  pincode: string | null
  verified: boolean
  rating: number
  review_count: number
  active: boolean
}

export type OfferingCategoryInfo = {
  id: string
  name: string
  slug: string
}

export type CatalogOffering = {
  id: string
  type: OfferingType
  name: string
  description: string | null
  business_id: string
  category_id: string
  subcategory_id: string | null
  active: boolean
  created_at: string
  updated_at: string
  // Product-specific
  price?: number
  unit?: string | null
  availability?: 'available' | 'limited' | 'unavailable'
  // Service-specific
  price_from?: number | null
  price_to?: number | null
  price_unit?: string | null
  // Relations
  business?: OfferingBusinessInfo | null
  category?: OfferingCategoryInfo | null
  subcategory?: OfferingSubcategoryInfo | null
}

export type CatalogProductDetail = BusinessProduct & {
  businesses?: OfferingBusinessInfo | null
  categories?: OfferingCategoryInfo | null
  subcategories?: OfferingSubcategoryInfo | null
}

export type CatalogServiceDetail = BusinessService & {
  businesses?: OfferingBusinessInfo | null
  categories?: OfferingCategoryInfo | null
  subcategories?: OfferingSubcategoryInfo | null
}

export type CatalogFilterOptions = {
  search?: string
  type?: 'all' | 'product' | 'service'
  categoryId?: string | null
  subcategoryId?: string | null
  availability?: 'all' | 'available' | 'limited'
  sortBy?: 'newest' | 'price_asc' | 'price_desc' | 'name'
}

export async function getCatalogOfferings(
  filters: CatalogFilterOptions = {},
): Promise<CatalogOffering[]> {
  const supabase = getSupabaseClient()
  const { search, type = 'all', categoryId, subcategoryId, availability, sortBy = 'newest' } = filters
  const offerings: CatalogOffering[] = []

  const includeProducts = type === 'all' || type === 'product'
  const includeServices = type === 'all' || type === 'service'

  const promises: Promise<void>[] = []

  if (includeProducts) {
    promises.push(
      (async () => {
        let productQuery = supabase
          .from('business_products')
          .select(`
            id,
            business_id,
            category_id,
            subcategory_id,
            name,
            description,
            price,
            unit,
            availability,
            active,
            created_at,
            updated_at,
            businesses (
              id,
              name,
              slug,
              phone,
              whatsapp,
              address,
              pincode,
              verified,
              rating,
              review_count,
              active
            ),
            categories (
              id,
              name,
              slug
            ),
            subcategories (
              id,
              name,
              slug
            )
          `)
          .eq('active', true)

        if (categoryId) {
          productQuery = productQuery.eq('category_id', categoryId)
        }

        if (subcategoryId) {
          productQuery = productQuery.eq('subcategory_id', subcategoryId)
        }

        if (availability && availability !== 'all') {
          productQuery = productQuery.eq('availability', availability)
        }

        const { data, error } = await productQuery
        if (error) throw error

        if (data) {
          for (const row of data) {
            offerings.push({
              id: row.id,
              type: 'product',
              name: row.name,
              description: row.description,
              business_id: row.business_id,
              category_id: row.category_id,
              subcategory_id: row.subcategory_id,
              price: row.price,
              unit: row.unit,
              availability: row.availability,
              active: row.active,
              created_at: row.created_at,
              updated_at: row.updated_at,
              business: normalizeJoinedRecord<OfferingBusinessInfo>(row.businesses),
              category: normalizeJoinedRecord<OfferingCategoryInfo>(row.categories),
              subcategory: normalizeJoinedRecord<OfferingSubcategoryInfo>(row.subcategories),
            })
          }
        }
      })(),
    )
  }

  if (includeServices) {
    promises.push(
      (async () => {
        let serviceQuery = supabase
          .from('business_services')
          .select(`
            id,
            business_id,
            category_id,
            subcategory_id,
            name,
            description,
            price_from,
            price_to,
            price_unit,
            active,
            created_at,
            updated_at,
            businesses (
              id,
              name,
              slug,
              phone,
              whatsapp,
              address,
              pincode,
              verified,
              rating,
              review_count,
              active
            ),
            categories (
              id,
              name,
              slug
            ),
            subcategories (
              id,
              name,
              slug
            )
          `)
          .eq('active', true)

        if (categoryId) {
          serviceQuery = serviceQuery.eq('category_id', categoryId)
        }

        if (subcategoryId) {
          serviceQuery = serviceQuery.eq('subcategory_id', subcategoryId)
        }

        const { data, error } = await serviceQuery
        if (error) throw error

        if (data) {
          for (const row of data) {
            offerings.push({
              id: row.id,
              type: 'service',
              name: row.name,
              description: row.description,
              business_id: row.business_id,
              category_id: row.category_id,
              subcategory_id: row.subcategory_id,
              price_from: row.price_from,
              price_to: row.price_to,
              price_unit: row.price_unit,
              active: row.active,
              created_at: row.created_at,
              updated_at: row.updated_at,
              business: normalizeJoinedRecord<OfferingBusinessInfo>(row.businesses),
              category: normalizeJoinedRecord<OfferingCategoryInfo>(row.categories),
              subcategory: normalizeJoinedRecord<OfferingSubcategoryInfo>(row.subcategories),
            })
          }
        }
      })(),
    )
  }

  await Promise.all(promises)

  let filtered = offerings

  if (search && search.trim()) {
    const normalized = search.trim().toLowerCase()
    filtered = filtered.filter((item) => {
      const nameMatch = item.name.toLowerCase().includes(normalized)
      const descMatch = item.description?.toLowerCase().includes(normalized) ?? false
      const bizMatch = item.business?.name.toLowerCase().includes(normalized) ?? false
      const catMatch = item.category?.name.toLowerCase().includes(normalized) ?? false
      const subcatMatch = item.subcategory?.name.toLowerCase().includes(normalized) ?? false
      return nameMatch || descMatch || bizMatch || catMatch || subcatMatch
    })
  }

  if (sortBy === 'newest') {
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  } else if (sortBy === 'price_asc') {
    filtered.sort((a, b) => {
      const priceA = a.type === 'product' ? (a.price ?? 0) : (a.price_from ?? a.price_to ?? 0)
      const priceB = b.type === 'product' ? (b.price ?? 0) : (b.price_from ?? b.price_to ?? 0)
      return priceA - priceB
    })
  } else if (sortBy === 'price_desc') {
    filtered.sort((a, b) => {
      const priceA = a.type === 'product' ? (a.price ?? 0) : (a.price_to ?? a.price_from ?? 0)
      const priceB = b.type === 'product' ? (b.price ?? 0) : (b.price_to ?? b.price_from ?? 0)
      return priceB - priceA
    })
  } else if (sortBy === 'name') {
    filtered.sort((a, b) => a.name.localeCompare(b.name))
  }

  return filtered
}

export async function getCatalogProductById(productId: string): Promise<CatalogProductDetail> {
  const { data, error } = await getSupabaseClient()
    .from('business_products')
    .select(`
      *,
      businesses (
        id,
        name,
        slug,
        phone,
        whatsapp,
        address,
        pincode,
        verified,
        rating,
        review_count,
        active
      ),
      categories (
        id,
        name,
        slug
      ),
      subcategories (
        id,
        name,
        slug
      )
    `)
    .eq('id', productId)
    .single()

  if (error) throw error

  return {
    ...data,
    businesses: normalizeJoinedRecord<OfferingBusinessInfo>(data.businesses),
    categories: normalizeJoinedRecord<OfferingCategoryInfo>(data.categories),
    subcategories: normalizeJoinedRecord<OfferingSubcategoryInfo>(data.subcategories),
  } as CatalogProductDetail
}

export async function getCatalogServiceById(serviceId: string): Promise<CatalogServiceDetail> {
  const { data, error } = await getSupabaseClient()
    .from('business_services')
    .select(`
      *,
      businesses (
        id,
        name,
        slug,
        phone,
        whatsapp,
        address,
        pincode,
        verified,
        rating,
        review_count,
        active
      ),
      categories (
        id,
        name,
        slug
      ),
      subcategories (
        id,
        name,
        slug
      )
    `)
    .eq('id', serviceId)
    .single()

  if (error) throw error

  return {
    ...data,
    businesses: normalizeJoinedRecord<OfferingBusinessInfo>(data.businesses),
    categories: normalizeJoinedRecord<OfferingCategoryInfo>(data.categories),
    subcategories: normalizeJoinedRecord<OfferingSubcategoryInfo>(data.subcategories),
  } as CatalogServiceDetail
}