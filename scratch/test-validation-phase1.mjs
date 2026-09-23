import assert from 'node:assert'

// Business validation rules replicated from CreateBusinessPage.tsx
const PHONE_REGEX = /^(?:\+91|91)?[6-9]\d{9}$/
const PINCODE_REGEX = /^[1-9]\d{5}$/
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function toBusinessSlug(input) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function validateBusiness(values) {
  const errors = {}
  const trimmedName = values.name.trim()
  if (!trimmedName) {
    errors.name = values.name.length > 0 ? 'Business name cannot be only whitespace.' : 'Business name is required.'
  } else if (trimmedName.length < 2 || trimmedName.length > 100) {
    errors.name = 'Business name must be between 2 and 100 characters.'
  }

  if (values.slug.length > 0 && !values.slug.trim()) {
    errors.slug = 'Slug cannot be only whitespace.'
  } else {
    const trimmedSlug = values.slug.trim()
    if (trimmedSlug) {
      if (trimmedSlug.length > 100) {
        errors.slug = 'Slug cannot exceed 100 characters.'
      } else if (!SLUG_REGEX.test(trimmedSlug)) {
        errors.slug = 'Slug must use lowercase letters, numbers, and hyphens only (e.g. my-business).'
      }
    }
  }

  if (values.phone.length > 0 && !values.phone.trim()) {
    errors.phone = 'Phone number cannot be only whitespace.'
  } else {
    const cleanPhone = values.phone.trim().replace(/[\s\-()]+/g, '')
    if (cleanPhone && !PHONE_REGEX.test(cleanPhone)) {
      errors.phone = 'Enter a valid 10-digit Indian phone number.'
    }
  }

  if (values.whatsapp.length > 0 && !values.whatsapp.trim()) {
    errors.whatsapp = 'WhatsApp number cannot be only whitespace.'
  } else {
    const cleanWhatsapp = values.whatsapp.trim().replace(/[\s\-()]+/g, '')
    if (cleanWhatsapp && !PHONE_REGEX.test(cleanWhatsapp)) {
      errors.whatsapp = 'Enter a valid 10-digit Indian WhatsApp number.'
    }
  }

  if (values.pincode.length > 0 && !values.pincode.trim()) {
    errors.pincode = 'Pincode cannot be only whitespace.'
  } else {
    const trimmedPincode = values.pincode.trim()
    if (trimmedPincode && !PINCODE_REGEX.test(trimmedPincode)) {
      errors.pincode = 'Enter a valid 6-digit Indian PIN code.'
    }
  }

  if (values.address.length > 0 && !values.address.trim()) {
    errors.address = 'Address cannot be only whitespace.'
  } else if (values.address.trim().length > 250) {
    errors.address = 'Address cannot exceed 250 characters.'
  }

  if (values.description.length > 0 && !values.description.trim()) {
    errors.description = 'Description cannot be only whitespace.'
  } else if (values.description.trim().length > 1000) {
    errors.description = 'Description cannot exceed 1000 characters.'
  }

  return errors
}

// Property validation rules replicated from CreatePropertyPage.tsx
function validateProperty(values) {
  const errors = {}
  const trimmedTitle = values.title.trim()
  if (!trimmedTitle) {
    errors.title = values.title.length > 0 ? 'Property title cannot be only whitespace.' : 'Property title is required.'
  } else if (trimmedTitle.length < 5 || trimmedTitle.length > 120) {
    errors.title = 'Property title must be between 5 and 120 characters.'
  }

  if (values.listingType === 'sale') {
    if (values.price.length > 0 && !values.price.trim()) {
      errors.price = 'Price cannot be only whitespace.'
    } else {
      const trimmedPrice = values.price.trim()
      const p = trimmedPrice ? Number(trimmedPrice) : null
      if (p === null || isNaN(p) || p <= 0) {
        errors.price = 'Sale listing requires a valid price greater than ₹0.'
      }
    }
  } else {
    if (values.rent.length > 0 && !values.rent.trim()) {
      errors.rent = 'Rent cannot be only whitespace.'
    } else {
      const trimmedRent = values.rent.trim()
      const r = trimmedRent ? Number(trimmedRent) : null
      if (r === null || isNaN(r) || r <= 0) {
        errors.rent = 'Rent listing requires an amount greater than ₹0.'
      }
    }

    if (values.deposit.length > 0 && !values.deposit.trim()) {
      errors.deposit = 'Deposit cannot be only whitespace.'
    } else {
      const trimmedDeposit = values.deposit.trim()
      if (trimmedDeposit) {
        const d = Number(trimmedDeposit)
        if (isNaN(d) || d < 0) {
          errors.deposit = 'Security deposit cannot be negative.'
        }
      }
    }
  }

  if (values.areaSqft.length > 0 && !values.areaSqft.trim()) {
    errors.areaSqft = 'Area cannot be only whitespace.'
  } else {
    const trimmedArea = values.areaSqft.trim()
    if (trimmedArea) {
      const a = Number(trimmedArea)
      if (isNaN(a) || a <= 0) {
        errors.areaSqft = 'Super built-up area must be greater than 0 sq.ft.'
      }
    }
  }

  if (values.bedrooms.length > 0 && !values.bedrooms.trim()) {
    errors.bedrooms = 'Bedrooms cannot be only whitespace.'
  } else {
    const trimmedBedrooms = values.bedrooms.trim()
    if (trimmedBedrooms) {
      const b = Number(trimmedBedrooms)
      if (isNaN(b) || b < 0) {
        errors.bedrooms = 'Bedrooms count cannot be negative.'
      }
    }
  }

  if (values.bathrooms.length > 0 && !values.bathrooms.trim()) {
    errors.bathrooms = 'Bathrooms cannot be only whitespace.'
  } else {
    const trimmedBathrooms = values.bathrooms.trim()
    if (trimmedBathrooms) {
      const bath = Number(trimmedBathrooms)
      if (isNaN(bath) || bath < 0) {
        errors.bathrooms = 'Bathrooms count cannot be negative.'
      }
    }
  }

  if (values.address.length > 0 && !values.address.trim()) {
    errors.address = 'Address cannot be only whitespace.'
  } else if (values.address.trim().length > 250) {
    errors.address = 'Address cannot exceed 250 characters.'
  }

  if (values.description.length > 0 && !values.description.trim()) {
    errors.description = 'Description cannot be only whitespace.'
  } else if (values.description.trim().length > 1000) {
    errors.description = 'Description cannot exceed 1000 characters.'
  }

  return errors
}

console.log('Testing Business Validations...')
// Phone regex test
assert.ok(PHONE_REGEX.test('9876543210'), 'Valid 10 digit Indian number')
assert.ok(PHONE_REGEX.test('+919876543210'), 'Valid +91 Indian number')
assert.ok(PHONE_REGEX.test('919876543210'), 'Valid 91 Indian number')
assert.ok(!PHONE_REGEX.test('5876543210'), 'Invalid starting digit')
assert.ok(!PHONE_REGEX.test('987654321'), 'Too short')
assert.ok(!PHONE_REGEX.test('98765432100'), 'Too long')

// Pincode regex test
assert.ok(PINCODE_REGEX.test('635109'), 'Valid Hosur pincode')
assert.ok(!PINCODE_REGEX.test('035109'), 'Cannot start with 0')
assert.ok(!PINCODE_REGEX.test('63510'), 'Too short')
assert.ok(!PINCODE_REGEX.test('6351099'), 'Too long')
assert.ok(!PINCODE_REGEX.test('63510A'), 'Alphanumeric invalid')

// Whitespace-only rejection
const bErr = validateBusiness({
  name: '   ',
  slug: '   ',
  phone: '   ',
  whatsapp: '   ',
  pincode: '   ',
  address: '   ',
  description: '   ',
})
assert.equal(bErr.name, 'Business name cannot be only whitespace.')
assert.equal(bErr.slug, 'Slug cannot be only whitespace.')
assert.equal(bErr.phone, 'Phone number cannot be only whitespace.')
assert.equal(bErr.whatsapp, 'WhatsApp number cannot be only whitespace.')
assert.equal(bErr.pincode, 'Pincode cannot be only whitespace.')
assert.equal(bErr.address, 'Address cannot be only whitespace.')
assert.equal(bErr.description, 'Description cannot be only whitespace.')

// Length constraints
assert.ok(validateBusiness({ name: 'A', slug: '', phone: '', whatsapp: '', pincode: '', address: '', description: '' }).name)
assert.ok(validateBusiness({ name: 'A'.repeat(101), slug: '', phone: '', whatsapp: '', pincode: '', address: '', description: '' }).name)
assert.ok(validateBusiness({ name: 'Valid Name', slug: '', phone: '', whatsapp: '', pincode: '', address: 'A'.repeat(251), description: '' }).address)
assert.ok(validateBusiness({ name: 'Valid Name', slug: '', phone: '', whatsapp: '', pincode: '', address: '', description: 'A'.repeat(1001) }).description)

// Slug sanitizer
assert.equal(toBusinessSlug('Karthik Auto Services!'), 'karthik-auto-services')
assert.equal(toBusinessSlug('---Hosur-Tech---'), 'hosur-tech')
assert.ok(SLUG_REGEX.test(toBusinessSlug('Valid Business 123')))

console.log('Testing Property Validations...')
const pErr = validateProperty({
  title: '   ',
  listingType: 'sale',
  price: '0',
  rent: '',
  deposit: '-100',
  areaSqft: '0',
  bedrooms: '-1',
  bathrooms: '-1',
  address: '   ',
  description: '   ',
})
assert.equal(pErr.title, 'Property title cannot be only whitespace.')
assert.ok(pErr.price.includes('greater than ₹0'))
assert.equal(pErr.areaSqft, 'Super built-up area must be greater than 0 sq.ft.')
assert.equal(pErr.bedrooms, 'Bedrooms count cannot be negative.')
assert.equal(pErr.bathrooms, 'Bathrooms count cannot be negative.')
assert.equal(pErr.address, 'Address cannot be only whitespace.')
assert.equal(pErr.description, 'Description cannot be only whitespace.')

// Property rent validation
const rentErr = validateProperty({
  title: 'Luxury 3 BHK Flat in Hosur',
  listingType: 'rent',
  price: '',
  rent: '0',
  deposit: '-50',
  areaSqft: '1200',
  bedrooms: '3',
  bathrooms: '2',
  address: 'Ring Road, Hosur',
  description: 'Spacious flat',
})
assert.ok(rentErr.rent.includes('greater than ₹0'))
assert.equal(rentErr.deposit, 'Security deposit cannot be negative.')

console.log('ALL PHASE 1 VALIDATION ASSERTIONS PASSED!')
