import type { CategorySummary, SubcategorySummary } from './categories'
import { getSupabaseClient } from '../lib/supabase'

export type ExtractedRequirementData = {
  suggestedTitle?: string | null
  suggestedCategoryId?: string | null
  suggestedCategoryName?: string | null
  suggestedSubcategoryId?: string | null
  suggestedSubcategoryName?: string | null
  budgetMin?: number | null
  budgetMax?: number | null
  currency?: string | null
  requiredDate?: string | null
  duration?: string | null
  location?: string | null
  tags: string[]
  attributes: Record<string, string | number | boolean>
  confidence: number // 0.0 - 1.0
  provider: 'domain-intelligence' | 'openai'
}

export type ExtractionContext = {
  categories: CategorySummary[]
  subcategories: SubcategorySummary[]
}

// Known geographic areas & industrial hubs in Hosur
const HOSUR_LOCALITIES = [
  'SIPCOT Phase 1',
  'SIPCOT Phase 2',
  'SIPCOT Industrial Complex',
  'SIPCOT',
  'Bagalur Road',
  'Bagalur',
  'Mathigiri',
  'Mookandapalli',
  'Zuzuvadi',
  'Rayakottai Road',
  'Rayakottai',
  'Thally Road',
  'Thally',
  'Hosur Bus Stand',
  'Hosur Railway Station',
  'Avalapalli',
  'Alasanatham',
  'Moranapalli',
  'Denkanikottai Road',
  'Denkanikottai',
  'Ring Road',
  'Old Bangalore Road',
]

// Domain keyword mappings for robust category/subcategory taxonomy matching
const TAXONOMY_KEYWORDS: Record<
  string,
  {
    categorySlug: string
    subcategorySlug?: string
    keywords: string[]
  }
> = {
  plumbing: {
    categorySlug: 'services',
    subcategorySlug: 'plumbing',
    keywords: ['plumbing', 'plumber', 'pipe', 'leak', 'drain', 'tap', 'faucet', 'sanitary', 'water tank', 'borewell'],
  },
  electrical: {
    categorySlug: 'services',
    subcategorySlug: 'electrical-wiring',
    keywords: ['electrical', 'electrician', 'wiring', 'transformer', 'fuse', 'generator', 'switchboard', 'lighting', 'power'],
  },
  cleaning: {
    categorySlug: 'services',
    subcategorySlug: 'cleaning-housekeeping',
    keywords: ['cleaning', 'cleaner', 'housekeeping', 'deep clean', 'sanitize', 'disinfect', 'janitorial', 'waste'],
  },
  painting: {
    categorySlug: 'services',
    subcategorySlug: 'painting-waterproofing',
    keywords: ['painting', 'painter', 'waterproofing', 'whitewash', 'distemper', 'emulsion', 'plaster', 'paint'],
  },
  carpentry: {
    categorySlug: 'services',
    subcategorySlug: 'carpentry-woodwork',
    keywords: ['carpentry', 'carpenter', 'woodwork', 'furniture', 'cabinet', 'plywood', 'table', 'door', 'cupboard'],
  },
  hvac: {
    categorySlug: 'services',
    subcategorySlug: 'ac-repair-hvac',
    keywords: ['hvac', 'ac repair', 'air conditioning', 'air conditioner', 'chiller', 'cooling', 'ventilation'],
  },
  metal_fabrication: {
    categorySlug: 'industry',
    subcategorySlug: 'sheet-metal-fabrication',
    keywords: ['fabrication', 'metal fabrication', 'sheet metal', 'welding', 'welder', 'steel frame', 'iron works', 'shed fabrication'],
  },
  cnc_machining: {
    categorySlug: 'industry',
    subcategorySlug: 'cnc-machining',
    keywords: ['cnc', 'machining', 'milling', 'lathe', 'turning', 'tooling'],
  },
  warehousing: {
    categorySlug: 'logistics',
    subcategorySlug: 'warehouse-godown',
    keywords: ['warehouse', 'storage', 'godown', 'depot', 'cold storage', 'inventory space'],
  },
  freight_transport: {
    categorySlug: 'logistics',
    subcategorySlug: 'freight-cargo-transport',
    keywords: ['transport', 'lorry', 'truck', 'cargo', 'freight', 'carrier', 'delivery truck', 'logistics'],
  },
  commercial_property: {
    categorySlug: 'property',
    subcategorySlug: 'commercial-office',
    keywords: ['commercial', 'office space', 'shop', 'showroom', 'retail space', 'commercial property'],
  },
  industrial_property: {
    categorySlug: 'property',
    subcategorySlug: 'industrial-shed-plot',
    keywords: ['industrial shed', 'industrial plot', 'factory shed', 'industrial land', 'factory space'],
  },
  residential_property: {
    categorySlug: 'property',
    subcategorySlug: 'residential-apartment-villa',
    keywords: ['apartment', 'villa', 'residential', 'house', 'flat', 'bhk', 'rent house', 'residential rent'],
  },
  raw_materials: {
    categorySlug: 'suppliers',
    subcategorySlug: 'raw-materials-metals',
    keywords: ['cement', 'sand', 'brick', 'steel bar', 'raw materials', 'aggregate', 'tmt bars'],
  },
  it_solutions: {
    categorySlug: 'services',
    subcategorySlug: 'it-digital-solutions',
    keywords: ['computer', 'laptop', 'network', 'cctv', 'printer', 'software', 'server', 'wifi', 'it support'],
  },
}

/**
 * Extracts numeric budget or range from text.
 * Handles:
 * - "between 5000 and 15000" / "5000 to 15000" / "5k-15k"
 * - "budget around 25000" / "₹20,000" / "Rs. 10000"
 * - "under 50k" / "max 2 lakhs" / "2.5 lakh"
 */
export function extractBudget(text: string): {
  budgetMin: number | null
  budgetMax: number | null
  currency: string
} {
  const normalized = text.toLowerCase().replace(/,/g, '')

  // 1. Range match: "from X to Y", "X to Y", "between X and Y", "X - Y"
  const rangeRegex =
    /(?:between|from)?\s*(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*(k|lakhs?|lac|l)?\s*(?:to|-|and)\s*(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*(k|lakhs?|lac|l)?/i

  const rangeMatch = normalized.match(rangeRegex)
  if (rangeMatch) {
    const rawVal1 = parseFloat(rangeMatch[1] ?? '0')
    const unit1 = rangeMatch[2]?.toLowerCase()
    const rawVal2 = parseFloat(rangeMatch[3] ?? '0')
    const unit2 = rangeMatch[4]?.toLowerCase()

    let val1 = rawVal1
    if (unit1 === 'k') val1 *= 1000
    else if (unit1?.startsWith('l')) val1 *= 100000

    let val2 = rawVal2
    if (unit2 === 'k') val2 *= 1000
    else if (unit2?.startsWith('l')) val2 *= 100000
    else if (!unit2 && (unit1 === 'k' || unit1?.startsWith('l'))) {
      // e.g. "50 to 60k" -> val1 is 50, unit2 has k -> adjust both
      if (unit2 === 'k') val1 *= 1000
    }

    // If val1 was e.g. 50 and val2 is 60k -> val1 should be 50k
    if (val1 < 1000 && val2 >= 1000) {
      if (unit2 === 'k' && !unit1) val1 *= 1000
      else if (unit2?.startsWith('l') && !unit1) val1 *= 100000
    }

    const min = Math.min(val1, val2)
    const max = Math.max(val1, val2)

    if (!isNaN(min) && !isNaN(max) && max > 0) {
      return { budgetMin: min, budgetMax: max, currency: 'INR' }
    }
  }

  // 2. Upper bound match: "under X", "max X", "up to X", "below X"
  const maxRegex =
    /(?:under|max|maximum|below|up to|within)\s*(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*(k|lakhs?|lac|l)?/i
  const maxMatch = normalized.match(maxRegex)
  if (maxMatch) {
    let val = parseFloat(maxMatch[1] ?? '0')
    const unit = maxMatch[2]?.toLowerCase()
    if (unit === 'k') val *= 1000
    else if (unit?.startsWith('l')) val *= 100000

    if (!isNaN(val) && val > 0) {
      return { budgetMin: null, budgetMax: val, currency: 'INR' }
    }
  }

  // 3. Single budget mention: "budget X", "₹X", "Rs. X", "price X"
  const singleRegex =
    /(?:budget|price|cost|quote|approx|around)?\s*(?:rs\.?|inr|₹)\s*(\d+(?:\.\d+)?)\s*(k|lakhs?|lac|l)?/i
  const singleMatch = normalized.match(singleRegex)
  if (singleMatch) {
    let val = parseFloat(singleMatch[1] ?? '0')
    const unit = singleMatch[2]?.toLowerCase()
    if (unit === 'k') val *= 1000
    else if (unit?.startsWith('l')) val *= 100000

    if (!isNaN(val) && val > 0) {
      return { budgetMin: val, budgetMax: val, currency: 'INR' }
    }
  }

  // 4. Fallback: "budget [is/of] 15000"
  const budgetWordRegex =
    /(?:budget|cost)\s*(?:is|of|around|approx)?\s*(\d+(?:\.\d+)?)\s*(k|lakhs?|lac|l)?/i
  const budgetWordMatch = normalized.match(budgetWordRegex)
  if (budgetWordMatch) {
    let val = parseFloat(budgetWordMatch[1] ?? '0')
    const unit = budgetWordMatch[2]?.toLowerCase()
    if (unit === 'k') val *= 1000
    else if (unit?.startsWith('l')) val *= 100000

    if (!isNaN(val) && val > 0) {
      return { budgetMin: val, budgetMax: val, currency: 'INR' }
    }
  }

  return { budgetMin: null, budgetMax: null, currency: 'INR' }
}

/**
 * Parses timeframe and calculates target deadline date if applicable.
 */
export function extractTimeframe(text: string): {
  requiredDate: string | null
  duration: string | null
} {
  const normalized = text.toLowerCase()
  const now = new Date()

  // Relative days check
  if (normalized.includes('today')) {
    return {
      requiredDate: now.toISOString().split('T')[0] ?? null,
      duration: 'Immediate (Today)',
    }
  }

  if (normalized.includes('tomorrow')) {
    const tomorrow = new Date(now)
    tomorrow.setDate(now.getDate() + 1)
    return {
      requiredDate: tomorrow.toISOString().split('T')[0] ?? null,
      duration: 'Within 24 hours (Tomorrow)',
    }
  }

  if (normalized.includes('urgent') || normalized.includes('emergency') || normalized.includes('asap')) {
    const nextDay = new Date(now)
    nextDay.setDate(now.getDate() + 1)
    return {
      requiredDate: nextDay.toISOString().split('T')[0] ?? null,
      duration: 'Urgent / Immediate',
    }
  }

  // "within X days"
  const daysMatch = normalized.match(/within\s*(\d+)\s*days?/i)
  if (daysMatch) {
    const days = parseInt(daysMatch[1] ?? '1', 10)
    const target = new Date(now)
    target.setDate(now.getDate() + days)
    return {
      requiredDate: target.toISOString().split('T')[0] ?? null,
      duration: `Within ${days} days`,
    }
  }

  // "within X weeks" / "X weeks"
  const weeksMatch = normalized.match(/(?:within\s*)?(\d+)\s*weeks?/i)
  if (weeksMatch) {
    const weeks = parseInt(weeksMatch[1] ?? '1', 10)
    const target = new Date(now)
    target.setDate(now.getDate() + weeks * 7)
    return {
      requiredDate: target.toISOString().split('T')[0] ?? null,
      duration: `${weeks} week${weeks > 1 ? 's' : ''}`,
    }
  }

  // "next week"
  if (normalized.includes('next week')) {
    const target = new Date(now)
    target.setDate(now.getDate() + 7)
    return {
      requiredDate: target.toISOString().split('T')[0] ?? null,
      duration: 'By next week',
    }
  }

  // "within a month" / "monthly"
  if (normalized.includes('month')) {
    const target = new Date(now)
    target.setDate(now.getDate() + 30)
    return {
      requiredDate: target.toISOString().split('T')[0] ?? null,
      duration: normalized.includes('recurring') || normalized.includes('monthly') ? 'Recurring monthly' : 'Within 1 month',
    }
  }

  return { requiredDate: null, duration: null }
}

/**
 * Extracts Hosur localities and landmarks.
 */
export function extractLocation(text: string): string | null {
  for (const locality of HOSUR_LOCALITIES) {
    const regex = new RegExp(`\\b${locality}\\b`, 'i')
    if (regex.test(text)) {
      return locality
    }
  }
  return null
}

/**
 * Extracts category and subcategory from prompt based on taxonomy dictionary and live DB items.
 */
export function matchTaxonomy(
  text: string,
  categories: CategorySummary[],
  subcategories: SubcategorySummary[],
): {
  categoryId: string | null
  categoryName: string | null
  subcategoryId: string | null
  subcategoryName: string | null
  matchedTags: string[]
  matchConfidence: number
} {
  const normalized = text.toLowerCase()
  let bestScore = 0
  let matchedTaxonomyKey: string | null = null
  const matchedTags: string[] = []

  for (const [key, item] of Object.entries(TAXONOMY_KEYWORDS)) {
    let score = 0
    for (const kw of item.keywords) {
      const escaped = kw.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
      const regex = new RegExp(`\\b${escaped}\\b`, 'i')
      if (regex.test(normalized)) {
        score += 1
        if (!matchedTags.includes(kw)) {
          matchedTags.push(kw)
        }
      }
    }

    if (score > bestScore) {
      bestScore = score
      matchedTaxonomyKey = key
    }
  }

  if (!matchedTaxonomyKey || bestScore === 0) {
    return {
      categoryId: null,
      categoryName: null,
      subcategoryId: null,
      subcategoryName: null,
      matchedTags,
      matchConfidence: 0.1,
    }
  }

  const matchedDef = TAXONOMY_KEYWORDS[matchedTaxonomyKey]
  if (!matchedDef) {
    return {
      categoryId: null,
      categoryName: null,
      subcategoryId: null,
      subcategoryName: null,
      matchedTags,
      matchConfidence: 0.1,
    }
  }

  // Find Category in DB list
  const category = categories.find(
    (c) => c.slug.toLowerCase() === matchedDef.categorySlug.toLowerCase(),
  )

  // Find Subcategory in DB list if mapped
  let subcategory: SubcategorySummary | undefined
  if (matchedDef.subcategorySlug && subcategories.length > 0) {
    subcategory = subcategories.find(
      (s) => s.slug.toLowerCase() === matchedDef.subcategorySlug?.toLowerCase(),
    )
  }

  const confidence = Math.min(0.6 + bestScore * 0.15, 0.96)

  return {
    categoryId: category?.id ?? null,
    categoryName: category?.name ?? null,
    subcategoryId: subcategory?.id ?? null,
    subcategoryName: subcategory?.name ?? null,
    matchedTags,
    matchConfidence: confidence,
  }
}

/**
 * Generates a clean, concise title from the raw description.
 */
export function generateSuggestedTitle(
  rawText: string,
  subcategoryName: string | null,
  categoryName: string | null,
): string {
  const trimmed = rawText.trim()
  const firstSentence = trimmed.split(/[.!?\n]/)[0]?.trim() ?? trimmed

  // Clean leading words like "need", "looking for", "require", "wanted"
  const cleaned = firstSentence
    .replace(/^(?:i\s+)?(?:need|looking for|require|wanted|seeking|urgently need|urgent need)\s+/i, '')
    .trim()

  if (cleaned.length > 10 && cleaned.length < 90) {
    // Capitalize first letter
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  }

  if (subcategoryName) {
    return `Requirement for ${subcategoryName}`
  }

  if (categoryName) {
    return `${categoryName} Requirement in Hosur`
  }

  return trimmed.slice(0, 60)
}

/**
 * Main AI Extraction function.
 * Processes customer free-text requirement and returns structured data.
 */
export async function extractRequirementFromText(
  rawText: string,
  context: ExtractionContext,
): Promise<ExtractedRequirementData> {
  const trimmed = rawText.trim()

  // Guard against trivially short inputs
  if (!trimmed || trimmed.length < 6) {
    return {
      tags: [],
      attributes: {},
      confidence: 0,
      provider: 'domain-intelligence',
    }
  }

  // Attempt server-side Edge Function extraction via Supabase
  try {
    const serverResult = await extractWithEdgeFunction(trimmed, context)
    if (serverResult) {
      return serverResult
    }
  } catch {
    // Seamlessly fallback to domain intelligence on any server/network failure
  }

  // 1. Taxonomy matching
  const taxonomy = matchTaxonomy(trimmed, context.categories, context.subcategories)

  // 2. Budget extraction
  const budget = extractBudget(trimmed)

  // 3. Timeframe extraction
  const timeframe = extractTimeframe(trimmed)

  // 4. Location extraction
  const location = extractLocation(trimmed)

  // 5. Title generation
  const suggestedTitle = generateSuggestedTitle(
    trimmed,
    taxonomy.subcategoryName,
    taxonomy.categoryName,
  )

  // Calculate overall confidence
  let confidence = taxonomy.categoryId ? taxonomy.matchConfidence : 0.15
  if (taxonomy.categoryId) {
    if (budget.budgetMax !== null) confidence = Math.min(confidence + 0.1, 0.98)
    if (location !== null) confidence = Math.min(confidence + 0.08, 0.98)
    if (timeframe.duration !== null) confidence = Math.min(confidence + 0.05, 0.98)
  }

  return {
    suggestedTitle,
    suggestedCategoryId: taxonomy.categoryId,
    suggestedCategoryName: taxonomy.categoryName,
    suggestedSubcategoryId: taxonomy.subcategoryId,
    suggestedSubcategoryName: taxonomy.subcategoryName,
    budgetMin: budget.budgetMin,
    budgetMax: budget.budgetMax,
    currency: budget.currency,
    requiredDate: timeframe.requiredDate,
    duration: timeframe.duration,
    location,
    tags: taxonomy.matchedTags,
    attributes: {
      raw_prompt: trimmed,
      extracted_at: new Date().toISOString(),
    },
    confidence: Number(confidence.toFixed(2)),
    provider: 'domain-intelligence',
  }
}

/**
 * Server-side OpenAI extraction via Supabase Edge Function.
 * The OpenAI secret key resides exclusively in Supabase environment secrets.
 */
async function extractWithEdgeFunction(
  rawText: string,
  context: ExtractionContext,
): Promise<ExtractedRequirementData | null> {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.functions.invoke<{
      data: ExtractedRequirementData
    }>('extract-requirement', {
      body: {
        text: rawText,
        categories: context.categories.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
        })),
        subcategories: context.subcategories.map((s) => ({
          id: s.id,
          name: s.name,
          slug: s.slug,
        })),
      },
    })

    if (error || !data?.data) {
      return null
    }

    return data.data
  } catch {
    return null
  }
}
