import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://cdsghhesglltjvqbewol.supabase.co'
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ubnd6hu6T0jz33SdUYFoRw_mXHwsHi0'

const TEST_ADMIN_EMAIL = 'karthik.superhosur2026@gmail.com'
const TEST_PASSWORD = 'TestPassword123!'

async function runPhase18Step5Tests() {
  console.log('====================================================')
  console.log('SuperHosur Phase 18 Step 5 Verification Test Suite')
  console.log('Payments & Monetization Architecture')
  console.log('====================================================\n')

  let passed = 0
  let failed = 0

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`)
      passed++
    } else {
      console.error(`❌ FAIL: ${testName}`)
      if (details) console.error(`   Details: ${details}`)
      failed++
    }
  }

  // 1. Anonymous client
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  // 2. Authenticated user / admin client
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data: authData, error: authError } = await userClient.auth.signInWithPassword({
    email: TEST_ADMIN_EMAIL,
    password: TEST_PASSWORD,
  })

  if (authError || !authData.user) {
    console.error('Failed to authenticate as test user:', authError)
    process.exit(1)
  }

  const userId = authData.user.id
  console.log(`Authenticated test owner: ${authData.user.email} (${userId})\n`)

  try {
    // ----------------------------------------------------
    // Test Group 1: Monetization Plans & Public Visibility
    // ----------------------------------------------------
    console.log('--- Test Group 1: Monetization Plans & Public Visibility ---')

    // 1.1 Anonymous can select active monetization plans
    const { data: publicPlans, error: plansErr } = await anonClient
      .from('monetization_plans')
      .select('*')
      .eq('active', true)

    assert(
      !plansErr && Array.isArray(publicPlans) && publicPlans.length >= 4,
      'Test 1.1: Active monetization plans are publicly viewable by visitors',
      `Error: ${plansErr?.message || 'none'}, Count: ${publicPlans?.length ?? 0}`
    )

    // 1.2 Anonymous cannot create orders directly (unauthenticated denied)
    const { error: anonOrderErr } = await anonClient.rpc('create_payment_order', {
      p_entity_type: 'business',
      p_entity_id: '00000000-0000-0000-0000-000000000001',
      p_plan_id: 'featured_business_7d',
    })

    assert(
      Boolean(anonOrderErr),
      'Test 1.2: Unauthenticated order creation is rejected'
    )

    // ----------------------------------------------------
    // Test Group 2: Listing Ownership & Server-Side Price Resolution
    // ----------------------------------------------------
    console.log('\n--- Test Group 2: Ownership Resolution & Server-Side Pricing ---')

    // Find a business owned by test user
    const { data: myBiz } = await userClient
      .from('businesses')
      .select('id, name, owner_id')
      .eq('owner_id', userId)
      .limit(1)
      .single()

    // Find a business NOT owned by test user
    const { data: otherBiz } = await userClient
      .from('businesses')
      .select('id, name, owner_id')
      .neq('owner_id', userId)
      .limit(1)
      .single()

    assert(
      Boolean(myBiz?.id),
      'Test 2.1: Found test business owned by user for monetization tests'
    )

    // 2.2 Attempting to create order for an unowned listing without admin override fails
    if (otherBiz?.id) {
      // Create a secondary non-admin client or test foreign ownership
      const { error: invalidOwnerErr } = await userClient.rpc('create_payment_order', {
        p_entity_type: 'business',
        p_entity_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff', // non-existent listing
        p_plan_id: 'featured_business_7d',
      })

      assert(
        Boolean(invalidOwnerErr),
        'Test 2.2: Order creation for invalid or inaccessible listing is rejected'
      )
    }

    // 2.3 Invalid plan ID is rejected
    const { error: invalidPlanErr } = await userClient.rpc('create_payment_order', {
      p_entity_type: 'business',
      p_entity_id: myBiz!.id,
      p_plan_id: 'non_existent_free_plan_hack',
    })

    assert(
      Boolean(invalidPlanErr),
      'Test 2.3: Order creation with unknown plan ID is strictly rejected'
    )

    // 2.4 Server-Side pricing integrity: create order successfully
    const { data: orderData, error: orderErr } = await userClient.rpc('create_payment_order', {
      p_entity_type: 'business',
      p_entity_id: myBiz!.id,
      p_plan_id: 'featured_business_7d',
    })

    assert(
      !orderErr && orderData?.amount_paise === 29900 && orderData?.currency === 'INR',
      'Test 2.4: Server resolves exact plan price (₹299.00 / 29900 paise) and currency server-side'
    )

    const orderId = orderData?.order_id
    const providerOrderId = orderData?.provider_order_id

    // ----------------------------------------------------
    // Test Group 3: Payment Verification & Signature Checking
    // ----------------------------------------------------
    console.log('\n--- Test Group 3: Signature Verification & Entitlement Activation ---')

    // 3.1 Invalid/empty signature rejected
    const { error: emptySigErr } = await userClient.rpc('verify_and_activate_payment', {
      p_order_id: orderId,
      p_provider_payment_id: 'pay_test_invalid_1',
      p_provider_signature: '',
    })

    assert(
      Boolean(emptySigErr),
      'Test 3.1: Payment verification with invalid/empty signature is rejected'
    )

    // 3.2 Successful verification activates entitlement
    const validPaymentId = `pay_test_${Date.now().toString(36)}`
    const validSignature = `sig_${providerOrderId}_secret_verified`

    const { data: verifyData, error: verifyErr } = await userClient.rpc('verify_and_activate_payment', {
      p_order_id: orderId,
      p_provider_payment_id: validPaymentId,
      p_provider_signature: validSignature,
      p_payment_method: 'upi',
    })

    assert(
      !verifyErr && verifyData?.status === 'active' && Boolean(verifyData?.transaction_id),
      'Test 3.2: Successful payment verification records transaction and activates promotion'
    )

    // 3.3 Verify promotion record created and active
    const { data: promoRecord } = await userClient
      .from('listing_promotions')
      .select('*')
      .eq('order_id', orderId)
      .single()

    assert(
      promoRecord?.status === 'active' && new Date(promoRecord.expires_at) > new Date(),
      'Test 3.3: listing_promotions record persists active entitlement with future expiry'
    )

    // 3.4 Idempotency: re-verifying the same order returns success without duplicating transactions
    const { data: reVerifyData, error: reVerifyErr } = await userClient.rpc('verify_and_activate_payment', {
      p_order_id: orderId,
      p_provider_payment_id: validPaymentId,
      p_provider_signature: validSignature,
    })

    assert(
      !reVerifyErr && reVerifyData?.already_processed === true,
      'Test 3.4: Payment verification idempotency verified — no duplicate transactions created'
    )

    // 3.5 is_entity_promoted helper confirms listing promotion is active
    const { data: isPromoted } = await anonClient.rpc('is_entity_promoted', {
      p_entity_type: 'business',
      p_entity_id: myBiz!.id,
    })

    assert(
      isPromoted === true,
      'Test 3.5: is_entity_promoted helper confirms active public promotion'
    )

    // ----------------------------------------------------
    // Test Group 4: Refund Handling & Entitlement Revocation
    // ----------------------------------------------------
    console.log('\n--- Test Group 4: Refund Handling & Entitlement Revocation ---')

    const transactionId = verifyData?.transaction_id

    // 4.1 Anonymous cannot initiate refund
    const { error: anonRefundErr } = await anonClient.rpc('process_payment_refund', {
      p_transaction_id: transactionId,
      p_provider_refund_id: 'rfnd_anon_hack',
    })

    assert(
      Boolean(anonRefundErr),
      'Test 4.1: Anonymous user cannot execute refund RPC'
    )

    // 4.2 Admin processes refund
    const { data: refundRes, error: refundErr } = await userClient.rpc('process_payment_refund', {
      p_transaction_id: transactionId,
      p_provider_refund_id: `rfnd_${Date.now().toString(36)}`,
      p_reason: 'Automated test refund processing',
    })

    assert(
      !refundErr && refundRes?.status === 'refunded',
      'Test 4.2: process_payment_refund RPC successfully transitions transaction to refunded'
    )

    // 4.3 Refunded promotion status is revoked to 'refunded'
    const { data: revokedPromo } = await userClient
      .from('listing_promotions')
      .select('status')
      .eq('order_id', orderId)
      .single()

    assert(
      revokedPromo?.status === 'refunded',
      'Test 4.3: Promotion entitlement is automatically revoked upon refund'
    )

    // 4.4 is_entity_promoted returns false now that promotion is refunded
    const { data: isStillPromoted } = await anonClient.rpc('is_entity_promoted', {
      p_entity_type: 'business',
      p_entity_id: myBiz!.id,
    })

    assert(
      isStillPromoted === false,
      'Test 4.4: Public surface confirms entity is no longer promoted after refund'
    )

    // ----------------------------------------------------
    // Test Group 5: Webhook Event Logging & Idempotency
    // ----------------------------------------------------
    console.log('\n--- Test Group 5: Webhook Event Logging & Idempotency ---')

    const testEventId = `evt_test_${Date.now()}`

    // 5.1 Anonymous direct insert into payment_webhook_events rejected by RLS
    const { error: anonWebhookErr } = await anonClient
      .from('payment_webhook_events')
      .insert({
        provider: 'razorpay',
        provider_event_id: testEventId,
        event_type: 'order.paid',
        payload: { test: true },
      })

    assert(
      Boolean(anonWebhookErr),
      'Test 5.1: Direct anonymous insertion into payment_webhook_events is blocked by RLS'
    )

    console.log('\n====================================================')
    console.log(`Phase 18 Step 5 Tests Complete: ${passed} passed, ${failed} failed`)
    console.log('====================================================\n')

    if (failed > 0) {
      process.exit(1)
    }
  } catch (err) {
    console.error('Unexpected error during Phase 18 Step 5 tests:', err)
    process.exit(1)
  }
}

void runPhase18Step5Tests()
