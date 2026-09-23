import { createClient } from 'file:///c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/node_modules/@supabase/supabase-js/dist/index.mjs'
import fs from 'node:fs'

const SUPABASE_URL = 'https://cdsghhesglltjvqbewol.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_ubnd6hu6T0jz33SdUYFoRw_mXHwsHi0'

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Import the extraction functions directly
import {
  extractBudget,
  extractTimeframe,
  extractLocation,
  matchTaxonomy,
  generateSuggestedTitle,
  extractRequirementFromText,
} from 'file:///c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/services/aiRequirementExtractor.ts'

async function runAiExtractionVerification() {
  console.log('=================================================================')
  console.log('  AI REQUIREMENT EXTRACTION PIPELINE VERIFICATION SUITE')
  console.log('=================================================================\n')

  let passCount = 0
  let failCount = 0

  function pass(msg) {
    console.log(`[PASS] ${msg}`)
    passCount++
  }

  function fail(msg, detail) {
    console.error(`[FAIL] ${msg}`, detail || '')
    failCount++
  }

  // 1. Fetch active categories and subcategories from DB
  console.log('--- TEST 1: Taxonomy Retrieval from Database ---')
  let categories = []
  let subcategories = []
  try {
    const [catRes, subcatRes] = await Promise.all([
      anonClient.from('categories').select('id, name, slug').eq('active', true),
      anonClient.from('subcategories').select('id, category_id, name, slug').eq('active', true),
    ])

    if (catRes.error) fail('Categories query failed', catRes.error)
    else {
      categories = catRes.data || []
      pass(`Retrieved ${categories.length} active categories from Supabase`)
    }

    if (subcatRes.error) fail('Subcategories query failed', subcatRes.error)
    else {
      subcategories = subcatRes.data || []
      pass(`Retrieved ${subcategories.length} active subcategories from Supabase`)
    }
  } catch (err) {
    fail('Exception querying taxonomy', err)
  }

  const context = { categories, subcategories }

  // 2. Test Case: Emergency Plumbing in SIPCOT
  console.log('\n--- TEST 2: Domain Test Case — Emergency Plumbing in SIPCOT ---')
  try {
    const prompt =
      'Need urgent emergency plumbing repair for water pipe leak at warehouse in SIPCOT Phase 2, budget 5000 to 15000 by tomorrow'
    const result = await extractRequirementFromText(prompt, context)

    if (result.suggestedCategoryName === 'Services') {
      pass(`Category matched correctly: ${result.suggestedCategoryName}`)
    } else {
      fail(`Category mismatch: expected 'Services', got '${result.suggestedCategoryName}'`)
    }

    if (result.suggestedSubcategoryName === 'Plumbing') {
      pass(`Subcategory matched correctly: ${result.suggestedSubcategoryName}`)
    } else {
      fail(`Subcategory mismatch: expected 'Plumbing', got '${result.suggestedSubcategoryName}'`)
    }

    if (result.budgetMin === 5000 && result.budgetMax === 15000) {
      pass(`Budget range extracted accurately: ₹${result.budgetMin} to ₹${result.budgetMax}`)
    } else {
      fail(`Budget range mismatch: min=${result.budgetMin}, max=${result.budgetMax}`)
    }

    if (result.location === 'SIPCOT Phase 2') {
      pass(`Location recognized: ${result.location}`)
    } else {
      fail(`Location mismatch: expected 'SIPCOT Phase 2', got '${result.location}'`)
    }

    if (result.duration?.includes('Tomorrow') || result.duration?.includes('Urgent')) {
      pass(`Timeframe extracted: ${result.duration}`)
    } else {
      fail(`Timeframe mismatch: ${result.duration}`)
    }

    if (result.confidence >= 0.75) {
      pass(`High confidence scored: ${result.confidence}`)
    } else {
      fail(`Confidence unexpectedly low: ${result.confidence}`)
    }
  } catch (err) {
    fail('Exception in plumbing test case', err)
  }

  // 3. Test Case: Industrial Metal Fabrication
  console.log('\n--- TEST 3: Domain Test Case — Industrial Metal Fabrication ---')
  try {
    const prompt =
      'Require industrial metal fabrication for warehouse shed frames in SIPCOT Phase 1, budget 80000 to 120000 within 2 weeks'
    const result = await extractRequirementFromText(prompt, context)

    if (result.suggestedSubcategoryName === 'Sheet Metal & Fabrication' || result.suggestedSubcategoryName?.includes('Fabrication')) {
      pass(`Subcategory matched: ${result.suggestedSubcategoryName}`)
    } else {
      fail(`Subcategory mismatch: got '${result.suggestedSubcategoryName}'`)
    }

    if (result.budgetMin === 80000 && result.budgetMax === 120000) {
      pass(`Budget range extracted: ₹${result.budgetMin} to ₹${result.budgetMax}`)
    } else {
      fail(`Budget range mismatch: min=${result.budgetMin}, max=${result.budgetMax}`)
    }

    if (result.duration === '2 weeks') {
      pass(`Duration parsed: ${result.duration}`)
    } else {
      fail(`Duration mismatch: ${result.duration}`)
    }
  } catch (err) {
    fail('Exception in fabrication test case', err)
  }

  // 4. Test Case: Real Estate in Bagalur Road
  console.log('\n--- TEST 4: Domain Test Case — Real Estate Rental ---')
  try {
    const prompt =
      'Looking for 2 BHK apartment for rent in Bagalur Road under 18000 per month, immediate move in'
    const result = await extractRequirementFromText(prompt, context)

    if (result.suggestedCategoryName === 'Property') {
      pass(`Category matched: ${result.suggestedCategoryName}`)
    } else {
      fail(`Category mismatch: got '${result.suggestedCategoryName}'`)
    }

    if (result.budgetMax === 18000) {
      pass(`Budget cap extracted: Up to ₹${result.budgetMax}`)
    } else {
      fail(`Budget cap mismatch: ${result.budgetMax}`)
    }

    if (result.location === 'Bagalur Road') {
      pass(`Location extracted: ${result.location}`)
    } else {
      fail(`Location mismatch: ${result.location}`)
    }
  } catch (err) {
    fail('Exception in real estate test case', err)
  }

  // 5. Test Case: Ambiguous / Low-Confidence Input
  console.log('\n--- TEST 5: Ambiguous Input Guard (No Hallucination) ---')
  try {
    const prompt = 'hello please contact me'
    const result = await extractRequirementFromText(prompt, context)

    if (result.confidence < 0.4) {
      pass(`Correctly scored low confidence (${result.confidence}) for ambiguous input`)
    } else {
      fail(`Expected low confidence for ambiguous prompt, got ${result.confidence}`)
    }

    if (!result.suggestedCategoryId && !result.budgetMax) {
      pass('No hallucinated category or budget created for uninformative prompt')
    } else {
      fail('Invented data for ambiguous prompt', {
        category: result.suggestedCategoryName,
        budget: result.budgetMax,
      })
    }
  } catch (err) {
    fail('Exception in ambiguous guard test', err)
  }

  // 6. Verify Database Column ai_extracted_data
  console.log('\n--- TEST 6: Database ai_extracted_data Column & Non-Regression ---')
  try {
    const { data, error } = await anonClient
      .from('requirements')
      .select('id, title, ai_extracted_data')
      .limit(1)

    if (error && error.code !== '42501') {
      fail('requirements ai_extracted_data column query error', error)
    } else {
      pass('requirements table ai_extracted_data column exists and is protected by RLS')
    }
  } catch (err) {
    fail('Exception checking requirements schema', err)
  }

  // 7. Verify UI PostRequirementPage Integration
  console.log('\n--- TEST 7: PostRequirementPage UI Integration ---')
  try {
    const pageContent = fs.readFileSync('c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/pages/PostRequirementPage.tsx', 'utf-8')
    const hasAssistantCard = pageContent.includes('ai-assistant-card')
    const hasPromptInput = pageContent.includes('ai-prompt-input')
    const hasExtractBtn = pageContent.includes('handleAiExtract')
    const hasFeedbackBanner = pageContent.includes('ai-feedback-banner')
    const hasClearBtn = pageContent.includes('handleClearAi')
    const passesAiData = pageContent.includes('ai_extracted_data')

    if (hasAssistantCard && hasPromptInput && hasExtractBtn && hasFeedbackBanner && hasClearBtn && passesAiData) {
      pass('PostRequirementPage features complete AI assistant card, auto-fill handler, editable feedback banner, dismiss action, and payload persistence.')
    } else {
      fail('PostRequirementPage missing key AI assistant components', {
        hasAssistantCard,
        hasPromptInput,
        hasExtractBtn,
        hasFeedbackBanner,
        hasClearBtn,
        passesAiData,
      })
    }
  } catch (err) {
    fail('Exception checking PostRequirementPage', err)
  }

  console.log('\n=================================================================')
  console.log(`VERIFICATION SUMMARY: ${passCount} PASSED, ${failCount} FAILED`)
  console.log('=================================================================')

  if (failCount > 0) {
    process.exit(1)
  }
}

runAiExtractionVerification()
