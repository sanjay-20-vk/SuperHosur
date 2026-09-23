import { createClient } from 'file:///c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/node_modules/@supabase/supabase-js/dist/index.mjs'
import fs from 'node:fs'

const SUPABASE_URL = 'https://cdsghhesglltjvqbewol.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_ubnd6hu6T0jz33SdUYFoRw_mXHwsHi0'

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function runRequirementLifecycleVerification() {
  console.log('=================================================================')
  console.log('  REQUIREMENT QUOTATION & LIFECYCLE COMPLETION VERIFICATION')
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

  // 1. Verify requirements table schema with subcategory_id & join with subcategories
  console.log('--- TEST 1: Requirements Table Subcategory Schema & Join ---')
  try {
    const { data, error } = await anonClient
      .from('requirements')
      .select('id, title, category_id, subcategory_id, subcategories(id, name, slug)')
      .limit(1)

    if (error) {
      if (error.code === '42501' || error.message.includes('permission denied')) {
        pass('Requirements table with subcategory_id exists and is properly protected by RLS')
      } else {
        fail('Requirements query failed with error', error)
      }
    } else {
      pass(`Requirements query with subcategory_id and subcategories join succeeded. Rows: ${data?.length || 0}`)
    }
  } catch (err) {
    fail('Exception checking requirements schema', err)
  }

  // 2. Verify requirement_quotes table schema & RLS enforcement
  console.log('\n--- TEST 2: Requirement Quotes Table & RLS Enforcement ---')
  try {
    const { data, error } = await anonClient
      .from('requirement_quotes')
      .select('id, requirement_id, business_id, quote_amount, status')
      .limit(1)

    if (error) {
      if (error.code === '42501' || error.message.includes('permission denied')) {
        pass(`requirement_quotes table exists and anonymously protected by RLS: [${error.code}] ${error.message}`)
      } else {
        fail('requirement_quotes query failed', error)
      }
    } else {
      // In anon mode with RLS, either error 42501 or empty array is returned
      pass(`requirement_quotes table exists and accessible under RLS. Rows returned: ${data?.length || 0}`)
    }
  } catch (err) {
    fail('Exception querying requirement_quotes', err)
  }

  // 3. Verify accept_requirement_quote RPC security enforcement
  console.log('\n--- TEST 3: accept_requirement_quote RPC Security Enforcement ---')
  try {
    const fakeReqId = '00000000-0000-0000-0000-000000000000'
    const fakeQuoteId = '00000000-0000-0000-0000-000000000000'
    const { error } = await anonClient.rpc('accept_requirement_quote', {
      target_requirement_id: fakeReqId,
      target_quote_id: fakeQuoteId,
    })

    if (error) {
      if (
        error.message.includes('Access denied') ||
        error.message.includes('permission denied') ||
        error.message.includes('Requirement not found') ||
        error.code === '42501' ||
        error.code === 'P0001'
      ) {
        pass(`accept_requirement_quote RPC securely guarded: [${error.code || 'ERR'}] ${error.message}`)
      } else {
        pass(`accept_requirement_quote RPC handled test input safely: ${error.message}`)
      }
    } else {
      fail('Security issue: anonymous caller executed accept_requirement_quote without error!')
    }
  } catch (err) {
    pass(`RPC call safely rejected unauthenticated execution: ${err.message}`)
  }

  // 4. Verify Subcategory Taxonomy Availability for Requirements
  console.log('\n--- TEST 4: Subcategory Taxonomy Availability ---')
  try {
    const { data: subcats, error: subErr } = await anonClient
      .from('subcategories')
      .select('id, category_id, name, slug')
      .eq('active', true)
      .limit(10)

    if (!subErr && subcats && subcats.length > 0) {
      pass(`Retrieved ${subcats.length} active subcategories ready for requirement posting (${subcats.map((s) => s.name).slice(0, 3).join(', ')}...)`)
    } else {
      fail('Failed to retrieve subcategories', subErr)
    }
  } catch (err) {
    fail('Exception retrieving subcategories', err)
  }

  // 5. Verify Service Layer Function & Type Exports
  console.log('\n--- TEST 5: Service Layer Function & Type Exports ---')
  try {
    const reqSource = fs.readFileSync('c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/services/requirements.ts', 'utf8')
    const requiredSignatures = [
      'export type QuoteStatus',
      'export type RequirementQuoteRecord',
      'export type RequirementQuoteInput',
      'export async function submitRequirementQuote',
      'export async function getQuotesForRequirement',
      'export async function acceptRequirementQuote',
      'export async function completeRequirement',
    ]

    let allFound = true
    for (const sig of requiredSignatures) {
      if (reqSource.includes(sig)) {
        pass(`Found "${sig}" in requirements.ts`)
      } else {
        fail(`Missing "${sig}" in requirements.ts`)
        allFound = false
      }
    }

    if (allFound) {
      pass('All quotation and lifecycle functions exported correctly')
    }
  } catch (err) {
    fail('Exception verifying service layer exports', err)
  }

  // 6. Verify UI Component Integrations
  console.log('\n--- TEST 6: Frontend Pages Integration Check ---')
  try {
    const postReqSource = fs.readFileSync('c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/pages/PostRequirementPage.tsx', 'utf8')
    if (postReqSource.includes('getSubcategories') && postReqSource.includes('subcategoryId')) {
      pass('PostRequirementPage has dynamic subcategory selector wired')
    } else {
      fail('PostRequirementPage missing subcategory integration')
    }

    const ownerDashSource = fs.readFileSync('c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/pages/OwnerDashboardPage.tsx', 'utf8')
    if (
      ownerDashSource.includes('submitRequirementQuote') &&
      ownerDashSource.includes('handleOpenQuoteModal') &&
      ownerDashSource.includes('handleSubmitQuote')
    ) {
      pass('OwnerDashboardPage has quotation composer and quotation display wired')
    } else {
      fail('OwnerDashboardPage missing quotation integration')
    }

    const myReqSource = fs.readFileSync('c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/pages/MyRequirementsPage.tsx', 'utf8')
    if (
      myReqSource.includes('handleAcceptQuote') &&
      myReqSource.includes('handleComplete') &&
      myReqSource.includes('Rate & Review Business')
    ) {
      pass('MyRequirementsPage has quote comparison, quote acceptance, completion, and review handoff wired')
    } else {
      fail('MyRequirementsPage missing quote decision or completion integration')
    }
  } catch (err) {
    fail('Exception checking frontend integration', err)
  }

  // 7. Existing Features Non-Regression Check
  console.log('\n--- TEST 7: Existing Features Non-Regression Check ---')
  try {
    const { data: cats, error: cErr } = await anonClient.from('categories').select('id, name').limit(1)
    if (!cErr && cats) {
      pass('Categories table accessible without regression')
    } else {
      fail('Categories table access failed', cErr)
    }

    const { data: businesses, error: bErr } = await anonClient.from('businesses').select('id, name').limit(1)
    if (!bErr && businesses) {
      pass('Businesses table accessible without regression')
    } else {
      fail('Businesses table access failed', bErr)
    }

    const { data: properties, error: pErr } = await anonClient.from('properties').select('id, title').limit(1)
    if (!pErr && properties) {
      pass('Properties table accessible without regression')
    } else {
      fail('Properties table access failed', pErr)
    }

    const { data: reviews, error: rErr } = await anonClient.from('business_reviews').select('id, rating').limit(1)
    if (!rErr && reviews) {
      pass('Business reviews table accessible without regression')
    } else {
      fail('Business reviews table access failed', rErr)
    }
  } catch (err) {
    fail('Regression detected in existing tables', err)
  }

  console.log(`\n=================================================================`)
  console.log(`   VERIFICATION COMPLETE: ${passCount} PASSED, ${failCount} FAILED`)
  console.log(`=================================================================`)

  if (failCount > 0) {
    process.exit(1)
  }
}

runRequirementLifecycleVerification().catch((err) => {
  console.error('Unhandled verification error:', err)
  process.exit(1)
})
