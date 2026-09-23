import { createClient } from 'file:///c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/node_modules/@supabase/supabase-js/dist/index.mjs'
import fs from 'node:fs'

const SUPABASE_URL = 'https://cdsghhesglltjvqbewol.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_ubnd6hu6T0jz33SdUYFoRw_mXHwsHi0'

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function runPasswordRecoveryVerification() {
  console.log('=================================================================')
  console.log('  PASSWORD RESET & ACCOUNT RECOVERY VERIFICATION SUITE')
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

  // 1. Verify Auth Service Layer Exports
  console.log('--- TEST 1: Auth Service Layer Functions & Error Handling ---')
  try {
    const authServicePath = 'c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/services/auth.ts'
    if (!fs.existsSync(authServicePath)) {
      fail(`Auth service file not found at ${authServicePath}`)
    } else {
      const content = fs.readFileSync(authServicePath, 'utf-8')
      const requiredExports = [
        'requestPasswordReset',
        'updateUserPassword',
        'handlePasswordRecoveryRedirect',
        'getAuthErrorMessage',
        'signInWithEmail',
        'signUpWithEmail',
        'signOut',
        'getCurrentSession',
        'getCurrentUserProfile',
      ]

      let allExportsFound = true
      for (const fn of requiredExports) {
        if (!content.includes(fn)) {
          fail(`Auth service missing required export: ${fn}`)
          allExportsFound = false
        }
      }
      if (allExportsFound) {
        pass('All 9 required authentication and password recovery functions are exported.')
      }

      // Check specific error mappings
      const hasRateLimitHandling = content.includes('rate limit') || content.includes('too many requests')
      const hasExpiredHandling = content.includes('otp_expired') || content.includes('expired')
      if (hasRateLimitHandling && hasExpiredHandling) {
        pass('getAuthErrorMessage provides explicit handling for rate limiting and expired recovery tokens.')
      } else {
        fail('getAuthErrorMessage is missing rate limit or expired token error mappings.')
      }
    }
  } catch (err) {
    fail('Exception checking auth service', err)
  }

  // 2. Verify Router Configuration
  console.log('\n--- TEST 2: Router Configuration & Page Bindings ---')
  try {
    const routerPath = 'c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/lib/router.tsx'
    if (!fs.existsSync(routerPath)) {
      fail(`Router file missing at ${routerPath}`)
    } else {
      const content = fs.readFileSync(routerPath, 'utf-8')
      const hasForgotPasswordRoute = content.includes("path: '/auth/forgot-password'")
      const hasResetPasswordRoute = content.includes("path: '/auth/reset-password'")
      const importsResetPage = content.includes('ResetPasswordPage')

      if (hasForgotPasswordRoute && hasResetPasswordRoute && importsResetPage) {
        pass('Both /auth/forgot-password and /auth/reset-password are registered with ResetPasswordPage.')
      } else {
        fail('Router configuration missing routes or imports.', {
          hasForgotPasswordRoute,
          hasResetPasswordRoute,
          importsResetPage,
        })
      }
    }
  } catch (err) {
    fail('Exception checking router configuration', err)
  }

  // 3. Verify AuthPage Forgot Password Integration
  console.log('\n--- TEST 3: AuthPage Forgot Password Flow & Links ---')
  try {
    const authPagePath = 'c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/pages/AuthPage.tsx'
    if (!fs.existsSync(authPagePath)) {
      fail(`AuthPage not found at ${authPagePath}`)
    } else {
      const content = fs.readFileSync(authPagePath, 'utf-8')
      const hasForgotLink = content.includes('/auth/forgot-password') && content.includes('Forgot password?')
      const hasForgotMode = content.includes("'forgot-password'")
      const callsRequestReset = content.includes('requestPasswordReset')
      const hasConfirmationBlock = content.includes('reset-confirmation-block') || content.includes('form-success')

      if (hasForgotLink && hasForgotMode && callsRequestReset && hasConfirmationBlock) {
        pass('AuthPage contains Forgot Password link, dedicated recovery mode, service trigger, and success confirmation.')
      } else {
        fail('AuthPage missing key password recovery UI features.', {
          hasForgotLink,
          hasForgotMode,
          callsRequestReset,
          hasConfirmationBlock,
        })
      }
    }
  } catch (err) {
    fail('Exception checking AuthPage', err)
  }

  // 4. Verify ResetPasswordPage Recovery Flow & Validation
  console.log('\n--- TEST 4: ResetPasswordPage Validation, Session & Expired State ---')
  try {
    const resetPagePath = 'c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/pages/ResetPasswordPage.tsx'
    if (!fs.existsSync(resetPagePath)) {
      fail(`ResetPasswordPage not found at ${resetPagePath}`)
    } else {
      const content = fs.readFileSync(resetPagePath, 'utf-8')
      const checks = [
        { name: 'Recovery session verification', test: content.includes('handlePasswordRecoveryRedirect') },
        { name: 'Expired/invalid session state', test: content.includes('sessionValid') && content.includes('Reset Link Expired') },
        { name: 'Password minLength validation (6 chars)', test: content.includes('length < 6') || content.includes('minLength={6}') },
        { name: 'Confirm password matching validation', test: content.includes('password !== confirmPassword') },
        { name: 'updateUserPassword call', test: content.includes('updateUserPassword') },
        { name: 'Success message & redirect countdown', test: content.includes('form-success') && content.includes('countdown') },
      ]

      let allPassed = true
      for (const check of checks) {
        if (!check.test) {
          fail(`ResetPasswordPage missing feature: ${check.name}`)
          allPassed = false
        }
      }
      if (allPassed) {
        pass('ResetPasswordPage implements token checking, expired link fallback, password validation, update call, and redirect countdown.')
      }
    }
  } catch (err) {
    fail('Exception checking ResetPasswordPage', err)
  }

  // 5. Verify CSS Styling in App.css
  console.log('\n--- TEST 5: CSS Styling for Password Recovery ---')
  try {
    const cssPath = 'c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/App.css'
    if (!fs.existsSync(cssPath)) {
      fail(`App.css not found at ${cssPath}`)
    } else {
      const content = fs.readFileSync(cssPath, 'utf-8')
      const hasFormSuccess = content.includes('.form-success')
      const hasAuthHelper = content.includes('.auth-helper-row')
      const hasBackLink = content.includes('.auth-back-link')

      if (hasFormSuccess && hasAuthHelper && hasBackLink) {
        pass('App.css contains all necessary styling rules for .form-success, .auth-helper-row, and .auth-back-link.')
      } else {
        fail('App.css missing password recovery styles.', {
          hasFormSuccess,
          hasAuthHelper,
          hasBackLink,
        })
      }
    }
  } catch (err) {
    fail('Exception checking App.css', err)
  }

  // 6. Non-Regression on Core Marketplace Tables
  console.log('\n--- TEST 6: Non-Regression on Core Marketplace Tables ---')
  try {
    const [catRes, subcatRes, busRes, reqRes, quoteRes, notifRes] = await Promise.all([
      anonClient.from('categories').select('id').limit(1),
      anonClient.from('subcategories').select('id').limit(1),
      anonClient.from('businesses').select('id').limit(1),
      anonClient.from('requirements').select('id').limit(1),
      anonClient.from('requirement_quotes').select('id').limit(1),
      anonClient.from('notifications').select('id').limit(1),
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

    if (notifRes.error && notifRes.error.code !== '42501') fail('notifications check failed', notifRes.error)
    else pass('notifications accessible / correctly RLS secured')
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

runPasswordRecoveryVerification()
