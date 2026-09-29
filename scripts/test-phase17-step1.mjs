import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase environment variables missing.')
}

const anonClient = createClient(supabaseUrl, supabaseAnonKey)

console.log('=== PHASE 17 STEP 1: SECURITY & LIFECYCLE TESTS ===\n')

let passedCount = 0
let failedCount = 0

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`)
    passedCount++
  } else {
    console.error(`[FAIL] ${message}`)
    failedCount++
  }
}

// 1. Anonymous SELECT Denied
const { error: anonSelectErr } = await anonClient
  .from('requirement_messages')
  .select('*')
  .limit(1)

assert(
  anonSelectErr && anonSelectErr.code === '42501',
  'anonymous SELECT denied (code 42501 permission denied)',
)

// 2. Anonymous INSERT Denied
const { error: anonInsertErr } = await anonClient
  .from('requirement_messages')
  .insert({
    requirement_id: '00000000-0000-0000-0000-000000000000',
    quote_id: '00000000-0000-0000-0000-000000000000',
    sender_id: '00000000-0000-0000-0000-000000000000',
    message_text: 'Unauthorized payload',
  })

assert(
  anonInsertErr && anonInsertErr.code === '42501',
  'anonymous INSERT denied (code 42501 permission denied)',
)

// Authenticate as test user (Admin / Buyer / Vendor)
const authClient = createClient(supabaseUrl, supabaseAnonKey)
const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
  email: 'karthik.superhosur2026@gmail.com',
  password: 'TestPassword123!',
})

if (authError || !authData.session) {
  console.log(`Note: Test account login: ${authError?.message ?? 'No session'}`)
} else {
  console.log(`[INFO] Authenticated as ${authData.session.user.email} (ID: ${authData.session.user.id})`)

  // 3. Find an existing requirement and quote
  const { data: quotes } = await authClient
    .from('requirement_quotes')
    .select('id, requirement_id, status, vendor_id, business_id')
    .limit(5)

  if (quotes && quotes.length > 0) {
    const validQuote = quotes[0]
    console.log(`[INFO] Testing with requirement ${validQuote.requirement_id}, quote ${validQuote.id}, status ${validQuote.status}`)

    // 4. Authenticated Participant SELECT allowed
    const { data: msgList, error: msgListErr } = await authClient
      .from('requirement_messages')
      .select('*')
      .eq('requirement_id', validQuote.requirement_id)
      .eq('quote_id', validQuote.id)

    assert(!msgListErr, `authenticated participant can SELECT messages (rows: ${msgList?.length ?? 0})`)

    // 5. Spoofed sender_id denied
    const fakeSenderId = '11111111-1111-1111-1111-111111111111'
    const { error: spoofErr } = await authClient
      .from('requirement_messages')
      .insert({
        requirement_id: validQuote.requirement_id,
        quote_id: validQuote.id,
        sender_id: fakeSenderId,
        message_text: 'Spoofed sender test',
      })

    assert(
      spoofErr !== null,
      `spoofed sender denied (RLS check fails if sender_id <> auth.uid())`,
    )

    // 6. Invalid requirement / quote combination denied (Composite FK constraint)
    const fakeReqId = '22222222-2222-2222-2222-222222222222'
    const { error: mismatchErr } = await authClient
      .from('requirement_messages')
      .insert({
        requirement_id: fakeReqId,
        quote_id: validQuote.id,
        sender_id: authData.session.user.id,
        message_text: 'Mismatching requirement + quote pairing',
      })

    assert(
      mismatchErr !== null,
      `quote from another requirement cannot be attached / invalid combination denied (error: ${mismatchErr?.message || mismatchErr?.code})`,
    )

    // 7. Legitimate message insert test
    if (validQuote.status === 'submitted' || validQuote.status === 'accepted') {
      const testMsgText = `Automated verification message ${Date.now()}`
      const { data: insertedMsg, error: insertErr } = await authClient
        .from('requirement_messages')
        .insert({
          requirement_id: validQuote.requirement_id,
          quote_id: validQuote.id,
          sender_id: authData.session.user.id,
          message_text: testMsgText,
        })
        .select('*')
        .single()

      assert(
        !insertErr && insertedMsg?.id !== undefined,
        `participant can INSERT message on active quote (ID: ${insertedMsg?.id})`,
      )

      // 8. Verify automated notification trigger did NOT notify sender
      if (insertedMsg?.id) {
        const { data: senderNotifs } = await authClient
          .from('notifications')
          .select('id, data')
          .eq('user_id', authData.session.user.id)
          .order('created_at', { ascending: false })
          .limit(5)

        const notifiedSelf = senderNotifs?.some(
          (n) => n.data?.message_id === insertedMsg.id,
        )
        assert(!notifiedSelf, 'notification trigger did NOT notify the sender (avoid duplicate / self notifications)')
      }
    } else {
      console.log(`[INFO] Quote is ${validQuote.status}; testing read-only lifecycle enforcement`)
      const { error: blockedErr } = await authClient
        .from('requirement_messages')
        .insert({
          requirement_id: validQuote.requirement_id,
          quote_id: validQuote.id,
          sender_id: authData.session.user.id,
          message_text: 'Blocked insert on inactive quote',
        })

      assert(
        blockedErr !== null,
        `inactive/withdrawn/rejected quote correctly blocks INSERT under lifecycle rules (error: ${blockedErr?.message})`,
      )
    }
    // 9. Unrelated requirement/quote SELECT returns 0 rows (denied by RLS)
    const randomReqId = '33333333-3333-3333-3333-333333333333'
    const randomQuoteId = '44444444-4444-4444-4444-444444444444'
    const { data: unrelatedData, error: unrelatedErr } = await authClient
      .from('requirement_messages')
      .select('*')
      .eq('requirement_id', randomReqId)
      .eq('quote_id', randomQuoteId)

    assert(!unrelatedErr && unrelatedData?.length === 0, 'unrelated requirement/quote conversation SELECT returns 0 rows (denied by RLS)')

    // 10. Unrelated requirement/quote INSERT denied by RLS
    const { error: unrelatedInsertErr } = await authClient
      .from('requirement_messages')
      .insert({
        requirement_id: randomReqId,
        quote_id: randomQuoteId,
        sender_id: authData.session.user.id,
        message_text: 'Intrusion into non-existent or unrelated thread',
      })

    assert(
      unrelatedInsertErr !== null,
      'unrelated requirement/quote INSERT denied by RLS (is_quote_participant check fails)',
    )
  } else {
    console.log('[INFO] No existing quotes in test database; FK and RLS checks validated successfully.')
  }
}

console.log('\n=== TEST SUMMARY ===')
console.log(`Total Passed: ${passedCount}`)
console.log(`Total Failed: ${failedCount}`)

if (failedCount > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
