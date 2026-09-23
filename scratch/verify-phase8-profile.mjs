import fs from 'fs'

console.log('=================================================================')
console.log('     PREMIUM UI/UX PHASE 8: PROFILE & ACCOUNT VERIFICATION')
console.log('=================================================================\n')

let passCount = 0
let failCount = 0

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`)
    passCount++
  } else {
    console.error(`[FAIL] ${message}`)
    failCount++
  }
}

// 1. Inspect ProfilePage.tsx
const profileSource = fs.readFileSync('src/pages/ProfilePage.tsx', 'utf8')

console.log('--- TEST 1: Header Hierarchy & Action Placement ---')
assert(profileSource.includes('<h1 className="owner-dash-title">My Profile</h1>'), 'Semantic h1 page title present')
assert(profileSource.includes('Account Settings • Personal Profile &amp; Credentials'), 'Contextual eyebrow badge present')
assert(profileSource.includes('Manage your personal identity, contact numbers, and SuperHosur credentials'), 'Supporting subtitle present')
assert(profileSource.includes('handleSignOut') && profileSource.includes('Sign out'), 'Sign out action present in header')

console.log('\n--- TEST 2: Identity Overview Card ---')
assert(profileSource.includes('profile-identity-card'), 'Profile identity card container present')
assert(profileSource.includes('profile-avatar-circle') && profileSource.includes('{initials}'), 'Initials avatar circle present')
assert(profileSource.includes('profile-identity-name'), 'Semantic profile identity name present')
assert(profileSource.includes('roleBadge'), 'User role badge rendered')
assert(profileSource.includes('Active Account') || profileSource.includes('Inactive'), 'Account status badge rendered')
assert(profileSource.includes('{userEmail || \'No email associated\'}'), 'User email displayed')

console.log('\n--- TEST 3: Personal Information Form & Fields ---')
assert(profileSource.includes('Full Name *'), 'Full name field present with required asterisk')
assert(profileSource.includes('Phone Number'), 'Phone number field present')
assert(profileSource.includes('PROFILE_NAME_REGEX'), 'Name validation regex utilized')
assert(profileSource.includes('PROFILE_PHONE_REGEX'), 'Indian phone validation regex utilized')
assert(profileSource.includes('aria-invalid={Boolean(fieldErrors.fullName)}'), 'Full name has aria-invalid')
assert(profileSource.includes('aria-describedby={fieldErrors.fullName ? \'profile-fullname-error\' : undefined}'), 'Full name has aria-describedby linkage')
assert(profileSource.includes('aria-invalid={Boolean(fieldErrors.phone)}'), 'Phone has aria-invalid')
assert(profileSource.includes('aria-describedby={fieldErrors.phone ? \'profile-phone-error\' : undefined}'), 'Phone has aria-describedby linkage')

console.log('\n--- TEST 4: Save & Update Experience ---')
assert(profileSource.includes('Save Profile Changes'), 'Primary save button present')
assert(profileSource.includes('Saving changes…'), 'Loading state on save button present')
assert(profileSource.includes('disabled={saving}'), 'Duplicate submit protection preserved')
assert(profileSource.includes('handleReset') && profileSource.includes('Cancel'), 'Cancel/reset button present')
assert(profileSource.includes('updateCurrentUserProfile'), 'updateCurrentUserProfile service function invoked')
assert(profileSource.includes('form-success') && profileSource.includes('Profile updated successfully!'), 'Success notification banner present')

console.log('\n--- TEST 5: Account & Security Credentials (Read-Only) ---')
assert(profileSource.includes('Account Credentials'), 'Account credentials section present')
assert(profileSource.includes('readOnly') && profileSource.includes('userEmail'), 'Email is read-only')
assert(profileSource.includes('readOnly') && profileSource.includes('roleBadge'), 'Account role is read-only')
assert(profileSource.includes('readOnly') && profileSource.includes('profile?.id'), 'SuperHosur User ID is read-only')

console.log('\n--- TEST 6: Quick Navigation Links ---')
assert(profileSource.includes('/my-requirements') && profileSource.includes('My Requirements'), 'My Requirements quick link wired')
assert(profileSource.includes('/owner') && profileSource.includes('My Dashboard'), 'Owner dashboard quick link wired')
assert(profileSource.includes('/owner/properties/create') && profileSource.includes('List a Property'), 'List property quick link wired')
assert(profileSource.includes('/properties') && profileSource.includes('Browse Properties'), 'Browse properties quick link wired')

console.log('\n--- TEST 7: Loading & Error States ---')
assert(profileSource.includes('LoadingState message="Loading your profile…"'), 'LoadingState component preserved')
assert(profileSource.includes('role="alert"') && profileSource.includes('{error}'), 'Accessible error alert banner present')

console.log('\n--- TEST 8: CSS Responsiveness in App.css ---')
const appCss = fs.readFileSync('src/App.css', 'utf8')
assert(appCss.includes('.profile-container'), 'App.css defines .profile-container')
assert(appCss.includes('.profile-header-banner'), 'App.css defines .profile-header-banner')
assert(appCss.includes('.profile-identity-card'), 'App.css defines .profile-identity-card')
assert(appCss.includes('.profile-avatar-circle'), 'App.css defines .profile-avatar-circle')
assert(appCss.includes('.profile-card-section'), 'App.css defines .profile-card-section')
assert(appCss.includes('@media (max-width: 600px)') && appCss.includes('.profile-header-banner'), 'Mobile 600px responsive rules present')
assert(appCss.includes('@media (max-width: 360px)') && appCss.includes('.profile-card-section'), 'Mobile 360px responsive rules present')

console.log(`\n=================================================================`)
console.log(`   PHASE 8 VERIFICATION: ${passCount} PASSED, ${failCount} FAILED`)
console.log(`=================================================================`)

if (failCount > 0) {
  process.exit(1)
}
