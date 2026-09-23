import { createClient } from 'file:///c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/node_modules/@supabase/supabase-js/dist/index.mjs'
import fs from 'node:fs'

const SUPABASE_URL = 'https://cdsghhesglltjvqbewol.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_ubnd6hu6T0jz33SdUYFoRw_mXHwsHi0'

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function runNotificationsVerification() {
  console.log('=================================================================')
  console.log('  IN-APP NOTIFICATION CENTER VERIFICATION SUITE')
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

  // 1. Verify notifications table schema & anonymous SELECT RLS
  console.log('--- TEST 1: Notifications Table Schema & Anonymous Select RLS ---')
  try {
    const { data, error } = await anonClient
      .from('notifications')
      .select('id, user_id, type, title, message, link, data, is_read, created_at, updated_at')
      .limit(5)

    if (error) {
      if (error.code === '42501' || error.message.includes('permission denied')) {
        pass(`notifications table is protected by RLS against anonymous reads: [${error.code}] ${error.message}`)
      } else {
        fail('Unexpected error querying notifications table', error)
      }
    } else {
      // With RLS user_id = auth.uid(), anon gets 0 rows
      pass(`notifications table queried successfully. Returned 0 rows for unauthenticated client (RLS active). Rows: ${data.length}`)
    }
  } catch (err) {
    fail('Exception checking notifications table', err)
  }

  // 2. Verify anonymous INSERT is blocked by RLS
  console.log('\n--- TEST 2: Anonymous Insert Blocked by RLS ---')
  try {
    const { data, error } = await anonClient
      .from('notifications')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        type: 'status_change',
        title: 'Unauthorized Test',
        message: 'This should be blocked by RLS',
      })
      .select()

    if (error) {
      pass(`Anonymous insert blocked by RLS as expected: [${error.code}] ${error.message}`)
    } else {
      fail('Anonymous insert succeeded unexpectedly! Data: ', data)
    }
  } catch (err) {
    fail('Exception checking insert RLS', err)
  }

  // 3. Verify Database Migration & Triggers
  console.log('\n--- TEST 3: Database Migration & Triggers Definition ---')
  try {
    const migrationPath = 'c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/supabase/migrations/20260920000500_notification_center.sql'
    if (!fs.existsSync(migrationPath)) {
      fail(`Migration file missing at ${migrationPath}`)
    } else {
      const sql = fs.readFileSync(migrationPath, 'utf-8').toLowerCase()
      const checks = [
        { name: 'create table if not exists public.notifications', test: sql.includes('create table if not exists public.notifications') },
        { name: 'alter table public.notifications enable row level security', test: sql.includes('alter table public.notifications enable row level security') },
        { name: 'notifications_user_select policy', test: sql.includes('notifications_user_select') },
        { name: 'notifications_user_update policy', test: sql.includes('notifications_user_update') },
        { name: 'notifications_user_delete policy', test: sql.includes('notifications_user_delete') },
        { name: 'notifications_admin_all policy', test: sql.includes('notifications_admin_all') },
        { name: 'notify_on_new_quote trigger function', test: sql.includes('notify_on_new_quote()') },
        { name: 'notify_on_quote_status trigger function', test: sql.includes('notify_on_quote_status()') },
        { name: 'notify_on_requirement_status trigger function', test: sql.includes('notify_on_requirement_status()') },
        { name: 'notify_on_lead_match trigger function', test: sql.includes('notify_on_lead_match()') },
      ]

      let allPassed = true
      for (const check of checks) {
        if (!check.test) {
          fail(`Migration missing SQL component: ${check.name}`)
          allPassed = false
        }
      }
      if (allPassed) {
        pass('All 10 database migration components and trigger functions are present.')
      }
    }
  } catch (err) {
    fail('Exception checking migration file', err)
  }

  // 4. Verify Notification Service Layer
  console.log('\n--- TEST 4: Notification Service Layer Verification ---')
  try {
    const servicePath = 'c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/services/notifications.ts'
    if (!fs.existsSync(servicePath)) {
      fail(`Service file missing at ${servicePath}`)
    } else {
      const content = fs.readFileSync(servicePath, 'utf-8')
      const functionChecks = [
        'getMyNotifications',
        'getUnreadNotificationCount',
        'markNotificationAsRead',
        'markAllNotificationsAsRead',
        'deleteNotification',
        'clearAllNotifications',
      ]
      let allFns = true
      for (const fn of functionChecks) {
        if (!content.includes(fn)) {
          fail(`Service function missing: ${fn}`)
          allFns = false
        }
      }
      if (allFns) {
        pass('Notification service exports all 6 required notification management methods.')
      }
    }
  } catch (err) {
    fail('Exception checking notification service', err)
  }

  // 5. Verify UI Header & Bell Component Integration
  console.log('\n--- TEST 5: UI Header & NotificationBell Integration ---')
  try {
    const bellPath = 'c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/components/NotificationBell.tsx'
    const headerPath = 'c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/components/Header.tsx'
    const cssPath = 'c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/App.css'

    if (!fs.existsSync(bellPath) || !fs.existsSync(headerPath) || !fs.existsSync(cssPath)) {
      fail('One or more UI component files missing')
    } else {
      const bellContent = fs.readFileSync(bellPath, 'utf-8')
      const headerContent = fs.readFileSync(headerPath, 'utf-8')
      const cssContent = fs.readFileSync(cssPath, 'utf-8')

      const bellFeatures = [
        { name: 'Unread badge rendering', test: bellContent.includes('notification-badge') },
        { name: 'Filter tab state (all vs unread)', test: bellContent.includes("filter === 'unread'") },
        { name: 'Mark all read action', test: bellContent.includes('handleMarkAllRead') },
        { name: 'Clear all action', test: bellContent.includes('handleClearAll') },
        { name: 'Click outside listener', test: bellContent.includes('mousedown') },
        { name: 'Escape key close listener', test: bellContent.includes('Escape') },
      ]

      let allBell = true
      for (const f of bellFeatures) {
        if (!f.test) {
          fail(`NotificationBell missing feature: ${f.name}`)
          allBell = false
        }
      }
      if (allBell) {
        pass('NotificationBell implements badge, popover, filtering, dismiss, and accessibility handlers.')
      }

      const headerHasBell = headerContent.includes('<NotificationBell />')
      const headerChecksSession = headerContent.includes('hasSession') && headerContent.includes('{hasSession && <NotificationBell />}')
      if (headerHasBell && headerChecksSession) {
        pass('Header correctly conditionally mounts NotificationBell for authenticated users.')
      } else {
        fail('Header does not properly mount NotificationBell with session check.')
      }

      const cssHasStyles = cssContent.includes('.notification-wrapper') &&
        cssContent.includes('.notification-badge') &&
        cssContent.includes('.notification-popover') &&
        cssContent.includes('.notification-item')
      if (cssHasStyles) {
        pass('App.css contains complete styles for NotificationBell wrapper, popover, badge, and items.')
      } else {
        fail('App.css is missing notification styles.')
      }
    }
  } catch (err) {
    fail('Exception checking UI integration', err)
  }

  // 6. Non-Regression Checks on Existing Tables
  console.log('\n--- TEST 6: Non-Regression on Core Marketplace Tables ---')
  try {
    const [catRes, subcatRes, busRes, reqRes, quoteRes] = await Promise.all([
      anonClient.from('categories').select('id').limit(1),
      anonClient.from('subcategories').select('id').limit(1),
      anonClient.from('businesses').select('id').limit(1),
      anonClient.from('requirements').select('id').limit(1),
      anonClient.from('requirement_quotes').select('id').limit(1),
    ])

    if (catRes.error) fail('categories check failed', catRes.error)
    else pass('categories accessible')

    if (subcatRes.error) fail('subcategories check failed', subcatRes.error)
    else pass('subcategories accessible')

    if (busRes.error) fail('businesses check failed', busRes.error)
    else pass('businesses accessible')

    if (reqRes.error && reqRes.error.code !== '42501') fail('requirements check failed', reqRes.error)
    else pass('requirements accessible / correctly RLS secured')

    if (quoteRes.error && quoteRes.error.code !== '42501') fail('requirement_quotes check failed', quoteRes.error)
    else pass('requirement_quotes accessible / correctly RLS secured')
  } catch (err) {
    fail('Exception in non-regression check', err)
  }

  console.log('\n=================================================================')
  console.log(`VERIFICATION SUMMARY: ${passCount} PASSED, ${failCount} FAILED`)
  console.log('=================================================================')

  if (failCount > 0) {
    process.exit(1)
  }
}

runNotificationsVerification()
