import assert from 'node:assert'

const PROFILE_PHONE_REGEX = /^(?:\+91|91)?[6-9]\d{9}$/
const PROFILE_NAME_REGEX = /^[a-zA-Z\s.'-]+$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateProfileInput(input) {
  if (input.full_name !== undefined) {
    if (!input.full_name || input.full_name.trim().length === 0) {
      return input.full_name && input.full_name.length > 0
        ? 'Full name cannot be only whitespace.'
        : 'Full name is required.'
    }
    const trimmed = input.full_name.trim()
    if (trimmed.length < 2 || trimmed.length > 70) {
      return 'Full name must be between 2 and 70 characters.'
    }
    if (!PROFILE_NAME_REGEX.test(trimmed)) {
      return 'Full name can only contain letters and spaces.'
    }
  }

  if (input.phone !== undefined && input.phone !== null) {
    if (input.phone.length > 0 && !input.phone.trim()) {
      return 'Phone number cannot be only whitespace.'
    }
    const trimmed = input.phone.trim()
    if (trimmed.length > 0) {
      const cleaned = trimmed.replace(/[\s\-()]+/g, '')
      if (!PROFILE_PHONE_REGEX.test(cleaned)) {
        return 'Enter a valid 10-digit Indian phone number (e.g. 9876543210 or +919876543210).'
      }
    }
  }

  return null
}

console.log('--- Testing Phase 2: Profile Validation ---')

// 1. Full name required & whitespace-only rejection
assert.equal(
  validateProfileInput({ full_name: '' }),
  'Full name is required.'
)
assert.equal(
  validateProfileInput({ full_name: '   ' }),
  'Full name cannot be only whitespace.'
)

// 2. Full name length constraints (2–70 chars)
assert.equal(
  validateProfileInput({ full_name: 'A' }),
  'Full name must be between 2 and 70 characters.'
)
assert.equal(
  validateProfileInput({ full_name: 'A'.repeat(71) }),
  'Full name must be between 2 and 70 characters.'
)
assert.equal(
  validateProfileInput({ full_name: 'A'.repeat(70) }),
  null
)
assert.equal(
  validateProfileInput({ full_name: 'Al' }),
  null
)

// 3. Full name character constraints (normal letters and spaces, dots, hyphens)
assert.equal(
  validateProfileInput({ full_name: 'Sanjay Kumar' }),
  null
)
assert.equal(
  validateProfileInput({ full_name: 'K. Karthik' }),
  null
)
assert.equal(
  validateProfileInput({ full_name: 'Mary-Jane' }),
  null
)
assert.equal(
  validateProfileInput({ full_name: 'User 123' }),
  'Full name can only contain letters and spaces.'
)
assert.equal(
  validateProfileInput({ full_name: 'User@Hosur' }),
  'Full name can only contain letters and spaces.'
)

// 4. Phone validation: ^(?:\+91|91)?[6-9]\d{9}$
assert.equal(
  validateProfileInput({ phone: '   ' }),
  'Phone number cannot be only whitespace.'
)
assert.equal(
  validateProfileInput({ phone: '9876543210' }),
  null
)
assert.equal(
  validateProfileInput({ phone: '+91 9876543210' }),
  null
)
assert.equal(
  validateProfileInput({ phone: '+919876543210' }),
  null
)
assert.equal(
  validateProfileInput({ phone: '919876543210' }),
  null
)
assert.equal(
  validateProfileInput({ phone: '+91 (987) 654-3210' }),
  null
)
// Invalid phone checks
assert.equal(
  validateProfileInput({ phone: '5876543210' }),
  'Enter a valid 10-digit Indian phone number (e.g. 9876543210 or +919876543210).'
)
assert.equal(
  validateProfileInput({ phone: '987654321' }),
  'Enter a valid 10-digit Indian phone number (e.g. 9876543210 or +919876543210).'
)
assert.equal(
  validateProfileInput({ phone: '98765432100' }),
  'Enter a valid 10-digit Indian phone number (e.g. 9876543210 or +919876543210).'
)
assert.equal(
  validateProfileInput({ phone: '+19876543210' }),
  'Enter a valid 10-digit Indian phone number (e.g. 9876543210 or +919876543210).'
)

console.log('--- Testing Phase 2: Auth / Signup Validation Logic ---')

function validateSignupFields(fullName, email, password) {
  const errors = {}
  const cleanFullName = fullName.trim()
  if (!cleanFullName) {
    errors.fullName = fullName.length > 0 ? 'Full name cannot be only whitespace.' : 'Full name is required.'
  } else if (cleanFullName.length < 2 || cleanFullName.length > 70) {
    errors.fullName = 'Full name must be between 2 and 70 characters.'
  } else if (!PROFILE_NAME_REGEX.test(cleanFullName)) {
    errors.fullName = 'Full name can only contain letters and spaces.'
  }

  const cleanEmail = email.trim()
  if (!cleanEmail) {
    errors.email = email.length > 0 ? 'Email cannot be only whitespace.' : 'Email is required.'
  } else if (!EMAIL_REGEX.test(cleanEmail)) {
    errors.email = 'Enter a valid email address (e.g. you@example.com).'
  }

  if (!password) {
    errors.password = 'Password is required.'
  } else if (password.length < 6) {
    errors.password = 'Password must be at least 6 characters long.'
  }

  return errors
}

// Valid signup
assert.deepEqual(validateSignupFields('John Doe', 'john@example.com', 'secret123'), {})

// Whitespace-only fields
const signupWhitespace = validateSignupFields('   ', '   ', '')
assert.equal(signupWhitespace.fullName, 'Full name cannot be only whitespace.')
assert.equal(signupWhitespace.email, 'Email cannot be only whitespace.')
assert.equal(signupWhitespace.password, 'Password is required.')

// Email format validation
assert.ok(validateSignupFields('John Doe', 'invalid-email', 'secret123').email)
assert.ok(validateSignupFields('John Doe', 'user@domain', 'secret123').email)
assert.deepEqual(validateSignupFields('John Doe', '  user@domain.com  ', 'secret123'), {})

// Password minimum 6 characters
assert.equal(
  validateSignupFields('John Doe', 'user@domain.com', '12345').password,
  'Password must be at least 6 characters long.'
)
assert.equal(
  validateSignupFields('John Doe', 'user@domain.com', '123456').password,
  undefined
)

console.log('--- Testing Phase 2: Password Reset Validation Logic ---')

function validatePasswordResetFields(password, confirmPassword) {
  const errors = {}
  if (!password) {
    errors.password = 'New password is required.'
  } else if (password.length < 6) {
    errors.password = 'Password must be at least 6 characters long.'
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Please confirm your new password.'
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match. Please ensure both fields are identical.'
  }

  return errors
}

// Valid matching reset
assert.deepEqual(validatePasswordResetFields('newsecret123', 'newsecret123'), {})

// Mismatch
assert.equal(
  validatePasswordResetFields('newsecret123', 'differentpassword').confirmPassword,
  'Passwords do not match. Please ensure both fields are identical.'
)

// Too short
assert.equal(
  validatePasswordResetFields('123', '123').password,
  'Password must be at least 6 characters long.'
)

console.log('ALL PHASE 2 VALIDATION TESTS PASSED SUCCESSFULLY!')
