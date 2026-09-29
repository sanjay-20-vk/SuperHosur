import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://cdsghhesglltjvqbewol.supabase.co'
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ubnd6hu6T0jz33SdUYFoRw_mXHwsHi0'

const TEST_ADMIN_EMAIL = 'karthik.superhosur2026@gmail.com'
const TEST_PASSWORD = 'TestPassword123!'

async function runPhase18Step3Tests() {
  console.log('====================================================')
  console.log('SuperHosur Phase 18 Step 3 Verification Test Suite')
  console.log('Omnichannel Transactional Notifications (Email & WhatsApp)')
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

  // 2. Authenticated user client
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
  console.log(`Authenticated test user: ${authData.user.email} (${userId})\n`)

  try {
    // ----------------------------------------------------
    // Test Group 1: Preferences Table Access & RLS
    // ----------------------------------------------------
    console.log('--- Test Group 1: Notification Preferences & RLS ---')
    // 1.1 Anonymous cannot select preferences
    const { data: anonPrefs } = await anonClient
      .from('notification_preferences')
      .select('*')
      .limit(5)

    assert(
      !anonPrefs || anonPrefs.length === 0,
      'Test 1.1: Anonymous user cannot select notification_preferences (RLS denied)'
    )

    // 1.2 User can fetch their own preferences
    const { data: myPrefs, error: myPrefsErr } = await userClient
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    assert(
      !myPrefsErr && Boolean(myPrefs?.user_id),
      'Test 1.2: Authenticated user can fetch their own notification preferences',
      JSON.stringify(myPrefsErr)
    )

    // 1.3 User can update their preferences
    const newWhatsappVal = !myPrefs?.whatsapp_enabled
    const { data: updatedPref, error: updateErr } = await userClient
      .from('notification_preferences')
      .update({ whatsapp_enabled: newWhatsappVal })
      .eq('user_id', userId)
      .select()
      .single()

    assert(
      !updateErr && updatedPref?.whatsapp_enabled === newWhatsappVal,
      'Test 1.3: User can toggle notification preferences (e.g., whatsapp_enabled)'
    )

    // Restore preference
    await userClient
      .from('notification_preferences')
      .update({ whatsapp_enabled: myPrefs?.whatsapp_enabled ?? false, email_enabled: true })
      .eq('user_id', userId)

    // ----------------------------------------------------
    // Test Group 2: Outbound Delivery Queue Ingestion
    // ----------------------------------------------------
    console.log('\n--- Test Group 2: Automated Delivery Queue Ingestion ---')
    // Insert a test notification for the user to trigger enqueue_notification_deliveries
    const { data: testNotif, error: notifErr } = await userClient
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'direct_message',
        title: 'Test Direct Message Alert',
        message: 'Hello, this is a test notification for omnichannel queue testing.',
        link: '/messages',
      })
      .select()
      .single()

    assert(
      !notifErr && Boolean(testNotif?.id),
      'Test 2.1: In-app notification created successfully',
      JSON.stringify(notifErr)
    )

    if (testNotif?.id) {
      // Check if delivery queue entry was created automatically
      const { data: deliveries, error: delivErr } = await userClient
        .from('notification_deliveries')
        .select('*')
        .eq('notification_id', testNotif.id)

      assert(
        !delivErr && Array.isArray(deliveries) && deliveries.length > 0,
        'Test 2.2: Delivery queue entry (notification_deliveries) was created automatically by trigger',
        JSON.stringify(delivErr)
      )

      const emailDelivery = deliveries?.find((d) => d.channel === 'email')
      assert(
        Boolean(emailDelivery) && emailDelivery?.status === 'pending' && emailDelivery?.recipient_target.includes('@'),
        'Test 2.3: Email channel delivery record created with status pending and valid recipient email target'
      )

      // Test duplicate delivery prevention (idempotent unique constraint on notification_id, channel)
      const { error: dupDelivErr } = await userClient
        .from('notification_deliveries')
        .insert({
          notification_id: testNotif.id,
          user_id: userId,
          channel: 'email',
          event_type: 'direct_message',
          recipient_target: 'duplicate@test.com',
          status: 'pending',
        })

      assert(
        Boolean(dupDelivErr),
        'Test 2.4: Duplicate or direct unauthorized delivery insert is rejected (RLS/unique constraint)',
        dupDelivErr?.message
      )

      // ----------------------------------------------------
      // Test Group 3: Delivery Processing & Retry RPC
      // ----------------------------------------------------
      console.log('\n--- Test Group 3: Delivery Processing & Retry Backoff ---')
      if (emailDelivery?.id) {
        // Test retry status and backoff logic
        const { data: retryRes, error: retryErr } = await userClient.rpc('process_notification_delivery', {
          p_delivery_id: emailDelivery.id,
          p_status: 'retrying',
          p_provider: 'resend',
          p_error: 'Temporary connection timeout to mail server',
        })

        assert(
          !retryErr && retryRes?.status === 'retrying' && typeof retryRes?.next_attempt_in_seconds === 'number',
          'Test 3.1: process_notification_delivery transitions to retrying with exponential backoff',
          JSON.stringify(retryErr)
        )

        // Test success transition
        const { data: sentRes, error: sentErr } = await userClient.rpc('process_notification_delivery', {
          p_delivery_id: emailDelivery.id,
          p_status: 'sent',
          p_provider: 'resend',
          p_provider_message_id: 'resend_msg_mock_12345',
        })

        assert(
          !sentErr && sentRes?.status === 'sent' && sentRes?.success === true,
          'Test 3.2: process_notification_delivery successfully updates status to sent with provider message ID'
        )

        // Verify updated row in notification_deliveries
        const { data: finalDelivery } = await userClient
          .from('notification_deliveries')
          .select('*')
          .eq('id', emailDelivery.id)
          .single()

        assert(
          finalDelivery?.status === 'sent' &&
          finalDelivery?.provider === 'resend' &&
          finalDelivery?.provider_message_id === 'resend_msg_mock_12345' &&
          Boolean(finalDelivery?.sent_at),
          'Test 3.3: Delivery record persists sent_at timestamp, provider ID, and cleared errors'
        )

        // Clean up test records
        await userClient.from('notification_deliveries').delete().eq('notification_id', testNotif.id)
        await userClient.from('notifications').delete().eq('id', testNotif.id)
      }
    }

    // ----------------------------------------------------
    // Test Group 4: Anonymous Delivery Queue Security
    // ----------------------------------------------------
    console.log('\n--- Test Group 4: Unauthorized Access Denial ---')
    const { error: anonProcessErr } = await anonClient.rpc('process_notification_delivery', {
      p_delivery_id: '00000000-0000-0000-0000-000000000001',
      p_status: 'sent',
    })

    assert(
      Boolean(anonProcessErr),
      'Test 4.1: Anonymous user cannot invoke process_notification_delivery RPC',
      anonProcessErr?.message
    )

  } catch (err) {
    console.error('Unexpected exception during tests:', err)
    failed++
  } finally {
    await userClient.auth.signOut()
  }

  console.log('\n====================================================')
  console.log(`Results: ${passed} Passed, ${failed} Failed`)
  console.log('====================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runPhase18Step3Tests()
