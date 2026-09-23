import { getSupabaseClient } from '../lib/supabase'

export type CategorySummary = {
  id: string
  name: string
  slug: string
}

export type SubcategorySummary = {
  id: string
  category_id: string
  name: string
  slug: string
  description?: string | null
}

export type CategoryRecord = {
  id: string
  name: string
  slug: string
  description: string | null
  active: boolean
  created_at?: string
  updated_at?: string
}

export type SubcategoryRecord = {
  id: string
  category_id: string
  name: string
  slug: string
  description: string | null
  active: boolean
  created_at?: string
  updated_at?: string
}

export type CategoryCreateInput = {
  name: string
  slug?: string
  description?: string | null
  active?: boolean
}

export type CategoryUpdateInput = {
  name?: string
  slug?: string
  description?: string | null
  active?: boolean
}

export type SubcategoryCreateInput = {
  category_id: string
  name: string
  slug?: string
  description?: string | null
  active?: boolean
}

export type SubcategoryUpdateInput = {
  name?: string
  slug?: string
  description?: string | null
  active?: boolean
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function getCategoryErrorMessage(error: unknown, fallback = 'Unable to update category.'): string {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}

export async function getCategories(): Promise<CategorySummary[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('active', true)
    .order('name')

  if (error) {
    throw error
  }

  return data ?? []
}

export async function getSubcategories(categoryId?: string): Promise<SubcategorySummary[]> {
  const supabase = getSupabaseClient()

  let query = supabase
    .from('subcategories')
    .select('id, category_id, name, slug, description')
    .eq('active', true)
    .order('name')

  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return (data ?? []) as SubcategorySummary[]
}

export async function getAdminCategories(): Promise<CategoryRecord[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name')

  if (error) {
    throw error
  }

  return (data ?? []) as CategoryRecord[]
}

export async function getAdminSubcategories(categoryId?: string): Promise<SubcategoryRecord[]> {
  const supabase = getSupabaseClient()

  let query = supabase.from('subcategories').select('*').order('name')
  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return (data ?? []) as SubcategoryRecord[]
}

export async function createCategory(input: CategoryCreateInput): Promise<CategoryRecord> {
  const name = input.name.trim()
  if (!name) {
    throw new Error('Category name is required.')
  }

  const slug = input.slug ? slugify(input.slug) : slugify(name)
  if (!slug) {
    throw new Error('A valid category slug is required.')
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('categories')
    .insert({
      name,
      slug,
      description: input.description?.trim() || null,
      active: input.active ?? true,
    })
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('A category with this slug already exists.')
    }
    throw error
  }

  return data as CategoryRecord
}

export async function updateCategory(id: string, input: CategoryUpdateInput): Promise<CategoryRecord> {
  const payload: Partial<CategoryRecord> = {}

  if (input.name !== undefined) {
    const name = input.name.trim()
    if (!name) throw new Error('Category name cannot be empty.')
    payload.name = name
  }

  if (input.slug !== undefined) {
    const slug = slugify(input.slug)
    if (!slug) throw new Error('A valid category slug is required.')
    payload.slug = slug
  }

  if (input.description !== undefined) {
    payload.description = input.description?.trim() || null
  }

  if (input.active !== undefined) {
    payload.active = input.active
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('categories')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('A category with this slug already exists.')
    }
    throw error
  }

  return data as CategoryRecord
}

export async function setCategoryActive(id: string, active: boolean): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('categories')
    .update({ active })
    .eq('id', id)

  if (error) {
    throw error
  }
}

export async function createSubcategory(input: SubcategoryCreateInput): Promise<SubcategoryRecord> {
  if (!input.category_id) {
    throw new Error('Parent category is required.')
  }

  const name = input.name.trim()
  if (!name) {
    throw new Error('Subcategory name is required.')
  }

  const slug = input.slug ? slugify(input.slug) : slugify(name)
  if (!slug) {
    throw new Error('A valid subcategory slug is required.')
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('subcategories')
    .insert({
      category_id: input.category_id,
      name,
      slug,
      description: input.description?.trim() || null,
      active: input.active ?? true,
    })
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('A subcategory with this slug already exists under this category.')
    }
    throw error
  }

  return data as SubcategoryRecord
}

export async function updateSubcategory(id: string, input: SubcategoryUpdateInput): Promise<SubcategoryRecord> {
  const payload: Partial<SubcategoryRecord> = {}

  if (input.name !== undefined) {
    const name = input.name.trim()
    if (!name) throw new Error('Subcategory name cannot be empty.')
    payload.name = name
  }

  if (input.slug !== undefined) {
    const slug = slugify(input.slug)
    if (!slug) throw new Error('A valid subcategory slug is required.')
    payload.slug = slug
  }

  if (input.description !== undefined) {
    payload.description = input.description?.trim() || null
  }

  if (input.active !== undefined) {
    payload.active = input.active
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('subcategories')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('A subcategory with this slug already exists under this category.')
    }
    throw error
  }

  return data as SubcategoryRecord
}

export async function setSubcategoryActive(id: string, active: boolean): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('subcategories')
    .update({ active })
    .eq('id', id)

  if (error) {
    throw error
  }
}

