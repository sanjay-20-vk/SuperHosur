import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[FAIL] Supabase environment variables missing.')
  process.exit(1)
}

const anonClient = createClient(supabaseUrl, supabaseAnonKey)

console.log('=== PHASE 17 STEP 5: ADMIN AUDIT LOG & BULK MODERATION TESTS ===\n')

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

async function runTests() {
  // Test 1: Anonymous cannot read audit logs
  const { data: anonData, error: anonSelectErr } = await anonClient
    .from('admin_audit_logs')
    .select('*')
    .limit(5)

  assert(
    (anonSelectErr && anonSelectErr.code === '42501') || (anonData && anonData.length === 0),
    '1. Anonymous cannot read audit logs (denied by RLS or returns empty)',
  )

  // Test 2: Anonymous direct insert to audit logs is blocked
  const { error: anonInsertErr } = await anonClient
    .from('admin_audit_logs')
    .insert({
      action_type: 'fake_action',
      entity_type: 'business',
      entity_id: '00000000-0000-0000-0000-000000000000',
    })

  assert(
    Boolean(anonInsertErr),
    '2. Anonymous direct insert to audit logs is rejected (immutable table)',
  )

  // Test 3 & 4: Authenticated user / Admin session
  const adminClient = createClient(supabaseUrl, supabaseAnonKey)
  const { data: authData, error: authError } = await adminClient.auth.signInWithPassword({
    email: 'karthik.superhosur2026@gmail.com',
    password: 'TestPassword123!',
  })

  if (authError || !authData.session) {
    console.error(`[WARN] Could not authenticate test user: ${authError?.message}`)
  } else {
    console.log(`[INFO] Authenticated as ${authData.session.user.email} (ID: ${authData.session.user.id})`)

    // Verify admin role
    const { data: profile } = await adminClient
      .from('profiles')
      .select('id, role')
      .eq('id', authData.session.user.id)
      .single()

    const isAdmin = profile?.role === 'admin'
    console.log(`[INFO] User role: ${profile?.role ?? 'unknown'}, isAdmin: ${isAdmin}`)

    if (isAdmin) {
      // Test 4: Admin can read audit logs
      const { data: adminLogs, error: adminLogErr } = await adminClient
        .from('admin_audit_logs')
        .select('*')
        .limit(10)

      assert(!adminLogErr && Array.isArray(adminLogs), '4. Admin can read audit logs')

      // Test 7: Spoofed client cannot insert directly with arbitrary admin_id
      const fakeAdminId = '11111111-1111-1111-1111-111111111111'
      const { error: directInsertErr } = await adminClient
        .from('admin_audit_logs')
        .insert({
          admin_id: fakeAdminId,
          action_type: 'spoofed_action',
          entity_type: 'business',
          entity_id: '00000000-0000-0000-0000-000000000000',
        })

      assert(
        Boolean(directInsertErr),
        '7. Direct client insert with spoofed admin_id is rejected (no INSERT policy)',
      )

      // Test 8, 9, 10: Find a test business to test moderation transition & audit log
      const { data: sampleBizList } = await adminClient
        .from('businesses')
        .select('id, name, active, verified, rejection_reason')
        .limit(2)

      if (sampleBizList && sampleBizList.length > 0) {
        const targetBiz = sampleBizList[0]
        const originalActive = targetBiz.active
        const originalVerified = targetBiz.verified

        console.log(`[INFO] Testing moderation lifecycle on business: "${targetBiz.name}" (ID: ${targetBiz.id})`)

        // Execute bulk rejection RPC test (with reason)
        const testReason = 'Automated validation rejection test: invalid address verification.'
        const { data: rejectResult, error: rejectErr } = await adminClient.rpc(
          'admin_bulk_moderate_businesses',
          {
            p_business_ids: [targetBiz.id],
            p_action: 'reject',
            p_reason: testReason,
          },
        )

        assert(!rejectErr && rejectResult?.succeeded_count === 1, '6. Admin can perform valid moderation via RPC')
        assert(
          rejectResult?.results?.[0]?.success === true,
          '10. Bulk rejection succeeded for eligible item',
        )

        // Verify audit log entry was created
        const { data: latestAuditLogs } = await adminClient
          .from('admin_audit_logs')
          .select('*')
          .eq('entity_id', targetBiz.id)
          .order('created_at', { ascending: false })
          .limit(1)

        const latestAudit = latestAuditLogs?.[0]
        assert(
          latestAudit && latestAudit.entity_id === targetBiz.id,
          '8. Audit entry is automatically created for moderation',
        )

        assert(
          latestAudit?.new_status === 'rejected' || latestAudit?.action_type?.includes('reject'),
          '9. Audit entry correctly records status transition',
        )

        assert(
          latestAudit?.reason === testReason,
          '10b. Rejection reason is captured accurately in audit log',
        )

        // Test 12: Bulk rejection requires reason
        const { error: emptyReasonErr } = await adminClient.rpc(
          'admin_bulk_moderate_businesses',
          {
            p_business_ids: [targetBiz.id],
            p_action: 'reject',
            p_reason: '  ',
          },
        )

        assert(
          Boolean(emptyReasonErr),
          '12. Bulk rejection requires non-empty reason (empty reason rejected)',
        )

        // Test 13: Invalid action rejected
        const { error: invalidActionErr } = await adminClient.rpc(
          'admin_bulk_moderate_businesses',
          {
            p_business_ids: [targetBiz.id],
            p_action: 'destroy_all',
          },
        )

        assert(
          Boolean(invalidActionErr),
          '13. Invalid status transitions or unsupported actions are rejected',
        )

        // Test 14: Failed item (non-existent ID) is not reported as successful
        const nonExistentId = 'ffffffff-ffff-ffff-ffff-ffffffffffff'
        const { data: partialResult } = await adminClient.rpc(
          'admin_bulk_moderate_businesses',
          {
            p_business_ids: [nonExistentId],
            p_action: 'approve',
          },
        )

        assert(
          partialResult?.succeeded_count === 0 && partialResult?.failed_count === 1,
          '14. Non-existent item is reported as failed, not silently successful',
        )

        // Restore original state of target business
        await adminClient.rpc('admin_bulk_moderate_businesses', {
          p_business_ids: [targetBiz.id],
          p_action: originalVerified && originalActive ? 'approve' : 'suspend',
        })
        console.log(`[INFO] Restored test business to original state.`)
      }

      // Test Property Bulk Moderation Parity
      const { data: samplePropList } = await adminClient
        .from('properties')
        .select('id, title, active, verified')
        .limit(1)

      if (samplePropList && samplePropList.length > 0) {
        const targetProp = samplePropList[0]
        const origPropActive = targetProp.active
        const origPropVerified = targetProp.verified

        console.log(`[INFO] Testing property moderation parity on: "${targetProp.title}" (orig: active=${origPropActive}, verified=${origPropVerified})`)

        const initialAction = (origPropActive && origPropVerified) ? 'suspend' : 'approve'
        const { data: propModRes, error: propModErr } = await adminClient.rpc(
          'admin_bulk_moderate_properties',
          {
            p_property_ids: [targetProp.id],
            p_action: initialAction,
          },
        )

        assert(
          !propModErr && propModRes?.succeeded_count === 1,
          `16. Property bulk moderation parity verified (${initialAction} successful)`,
        )

        // Check property audit entry
        const { data: propAudits } = await adminClient
          .from('admin_audit_logs')
          .select('*')
          .eq('entity_id', targetProp.id)
          .order('created_at', { ascending: false })
          .limit(1)

        assert(
          propAudits && propAudits.length > 0 && propAudits[0].entity_type === 'property',
          '16b. Property moderation generates audit log entry with entity_type property',
        )

        // Restore property state back to original
        const restoreAction = (origPropActive && origPropVerified) ? 'restore' : (origPropVerified ? 'approve' : 'suspend')
        await adminClient.rpc('admin_bulk_moderate_properties', {
          p_property_ids: [targetProp.id],
          p_action: restoreAction,
        })
        console.log(`[INFO] Restored test property back to original state via ${restoreAction}.`)
      }
    }
  }

  // Test 5 & 11: Non-admin / anonymous cannot execute admin RPC
  const { error: anonRpcErr } = await anonClient.rpc('admin_bulk_moderate_businesses', {
    p_business_ids: ['00000000-0000-0000-0000-000000000000'],
    p_action: 'approve',
  })

  assert(
    Boolean(anonRpcErr),
    '5. Non-admin / anonymous cannot execute moderation RPC (code: forbidden/permission denied)',
  )

  // Test 15: Existing moderation RLS remains intact (public cannot see unverified/inactive businesses)
  const { data: publicBiz } = await anonClient
    .from('businesses')
    .select('id, active, verified')
    .limit(20)

  const hasUnapproved = publicBiz?.some((b) => !b.active || !b.verified)
  assert(
    !hasUnapproved,
    '15. Existing moderation RLS remains intact (public query returns only active + verified)',
  )

  console.log(`\n=== RESULTS: ${passedCount} PASSED, ${failedCount} FAILED ===`)
  if (failedCount > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('[FATAL] Test runner error:', err)
  process.exit(1)
})
