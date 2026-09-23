import assert from 'node:assert'

console.log('=== Running Validation Phase 3 Test Suite ===\n')

// ==========================================
// 1. REQUIREMENTS VALIDATION TESTS
// ==========================================
console.log('--- 1. Testing Requirements Validation ---')

function validateRequirement({ title, city, budgetMin, budgetMax, requiredBy, description }) {
  const errors = {}
  const trimmedTitle = (title || '').trim()

  if (!title || !trimmedTitle) {
    errors.title = (title && title.length > 0)
      ? 'Title cannot be only whitespace.'
      : 'Title is required.'
  } else if (trimmedTitle.length < 5) {
    errors.title = 'Title must be at least 5 characters.'
  } else if (trimmedTitle.length > 100) {
    errors.title = 'Title must be at most 100 characters.'
  }

  if (!city || !city.trim()) {
    errors.city = 'Please select a city.'
  }

  let minVal = null
  let maxVal = null

  if (budgetMin !== undefined && budgetMin !== null && budgetMin !== '') {
    const minStr = String(budgetMin)
    if (minStr.length > 0 && !minStr.trim()) {
      errors.budgetMin = 'Budget cannot be only whitespace.'
    } else {
      const parsed = Number(minStr)
      if (Number.isNaN(parsed) || parsed < 0) {
        errors.budgetMin = 'Budget minimum must be 0 or more.'
      } else {
        minVal = parsed
      }
    }
  }

  if (budgetMax !== undefined && budgetMax !== null && budgetMax !== '') {
    const maxStr = String(budgetMax)
    if (maxStr.length > 0 && !maxStr.trim()) {
      errors.budgetMax = 'Budget cannot be only whitespace.'
    } else {
      const parsed = Number(maxStr)
      if (Number.isNaN(parsed) || parsed < 0) {
        errors.budgetMax = 'Budget maximum must be 0 or more.'
      } else {
        maxVal = parsed
      }
    }
  }

  if (minVal !== null && maxVal !== null && maxVal < minVal) {
    errors.budgetMax = 'Maximum budget cannot be less than minimum budget.'
  }

  if (requiredBy) {
    const today = new Date().toISOString().split('T')[0]
    if (requiredBy < today) {
      errors.requiredBy = 'Required date cannot be in the past.'
    }
  }

  if (description !== undefined && description !== null && description.length > 0) {
    if (!description.trim()) {
      errors.description = 'Description cannot be only whitespace.'
    } else if (description.trim().length > 2000) {
      errors.description = 'Description must be at most 2000 characters.'
    }
  }

  return errors
}

function validateAiPrompt(prompt) {
  const trimmed = (prompt || '').trim()
  if (!prompt || !trimmed) {
    return 'Please enter what you are looking for.'
  }
  if (trimmed.length < 6) {
    return 'Please describe your requirement in at least 6 characters.'
  }
  return null
}

// Requirement Title
assert.equal(validateRequirement({ title: '', city: 'Hosur' }).title, 'Title is required.')
assert.equal(validateRequirement({ title: '    ', city: 'Hosur' }).title, 'Title cannot be only whitespace.')
assert.equal(validateRequirement({ title: 'Four', city: 'Hosur' }).title, 'Title must be at least 5 characters.')
assert.equal(validateRequirement({ title: 'Valid Title Here', city: 'Hosur' }).title, undefined)
assert.equal(validateRequirement({ title: 'A'.repeat(101), city: 'Hosur' }).title, 'Title must be at most 100 characters.')

// Requirement Budget
assert.equal(validateRequirement({ title: 'Need Plumber', city: 'Hosur', budgetMin: '-10' }).budgetMin, 'Budget minimum must be 0 or more.')
assert.equal(validateRequirement({ title: 'Need Plumber', city: 'Hosur', budgetMax: '-5' }).budgetMax, 'Budget maximum must be 0 or more.')
assert.equal(validateRequirement({ title: 'Need Plumber', city: 'Hosur', budgetMin: '500', budgetMax: '200' }).budgetMax, 'Maximum budget cannot be less than minimum budget.')
assert.equal(validateRequirement({ title: 'Need Plumber', city: 'Hosur', budgetMin: '200', budgetMax: '500' }).budgetMax, undefined)
assert.equal(validateRequirement({ title: 'Need Plumber', city: 'Hosur', budgetMin: '300', budgetMax: '300' }).budgetMax, undefined)

// Requirement Required Date
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
assert.equal(validateRequirement({ title: 'Need Plumber', city: 'Hosur', requiredBy: yesterday }).requiredBy, 'Required date cannot be in the past.')
assert.equal(validateRequirement({ title: 'Need Plumber', city: 'Hosur', requiredBy: tomorrow }).requiredBy, undefined)

// AI Prompt
assert.equal(validateAiPrompt(''), 'Please enter what you are looking for.')
assert.equal(validateAiPrompt('   '), 'Please enter what you are looking for.')
assert.equal(validateAiPrompt('hello'), 'Please describe your requirement in at least 6 characters.')
assert.equal(validateAiPrompt('I need lathe machine service'), null)

console.log('✓ Requirement validation passed!')

// ==========================================
// 2. PRODUCTS & SERVICES VALIDATION TESTS
// ==========================================
console.log('\n--- 2. Testing Products & Services Validation ---')

function validateService({ name, priceFrom, priceTo, priceUnit, description }) {
  const errors = {}
  const trimmedName = (name || '').trim()
  const trimmedDesc = (description || '').trim()
  const trimmedUnit = (priceUnit || '').trim()

  if (!trimmedName) {
    errors.name = 'Service name is required.'
  } else if (trimmedName.length > 100) {
    errors.name = 'Service name must be at most 100 characters.'
  }

  if (description && description.length > 0 && !trimmedDesc) {
    errors.description = 'Description cannot be whitespace only.'
  } else if (trimmedDesc.length > 500) {
    errors.description = 'Description must be at most 500 characters.'
  }

  if (trimmedUnit.length > 30) {
    errors.priceUnit = 'Price unit must be at most 30 characters.'
  }

  let parsedFrom = null
  let parsedTo = null

  if (priceFrom !== undefined && priceFrom !== null && String(priceFrom).trim()) {
    const numFrom = Number(priceFrom)
    if (Number.isNaN(numFrom) || numFrom < 0) {
      errors.priceFrom = 'Starting price must be 0 or more.'
    } else {
      parsedFrom = numFrom
    }
  }

  if (priceTo !== undefined && priceTo !== null && String(priceTo).trim()) {
    const numTo = Number(priceTo)
    if (Number.isNaN(numTo) || numTo < 0) {
      errors.priceTo = 'Ending price must be 0 or more.'
    } else {
      parsedTo = numTo
    }
  }

  if (parsedFrom !== null && parsedTo !== null && parsedTo < parsedFrom) {
    errors.priceTo = 'Ending price cannot be less than starting price.'
  }

  return errors
}

function validateProduct({ name, price, unit, description }) {
  const errors = {}
  const trimmedName = (name || '').trim()
  const trimmedDesc = (description || '').trim()
  const trimmedUnit = (unit || '').trim()
  const trimmedPrice = String(price ?? '').trim()

  if (!trimmedName) {
    errors.name = 'Product name is required.'
  } else if (trimmedName.length > 100) {
    errors.name = 'Product name must be at most 100 characters.'
  }

  if (!trimmedPrice) {
    errors.price = 'Product price is required.'
  } else {
    const numPrice = Number(trimmedPrice)
    if (Number.isNaN(numPrice) || numPrice <= 0) {
      errors.price = 'Product price must be greater than 0.'
    }
  }

  if (description && description.length > 0 && !trimmedDesc) {
    errors.description = 'Description cannot be whitespace only.'
  } else if (trimmedDesc.length > 500) {
    errors.description = 'Description must be at most 500 characters.'
  }

  if (trimmedUnit.length > 30) {
    errors.unit = 'Unit must be at most 30 characters.'
  }

  return errors
}

// Service Validation
assert.equal(validateService({ name: '' }).name, 'Service name is required.')
assert.equal(validateService({ name: '   ' }).name, 'Service name is required.')
assert.equal(validateService({ name: 'A'.repeat(101) }).name, 'Service name must be at most 100 characters.')
assert.equal(validateService({ name: 'Valid Service' }).name, undefined)

assert.equal(validateService({ name: 'Car Wash', priceFrom: '-10' }).priceFrom, 'Starting price must be 0 or more.')
assert.equal(validateService({ name: 'Car Wash', priceTo: '-5' }).priceTo, 'Ending price must be 0 or more.')
assert.equal(validateService({ name: 'Car Wash', priceFrom: '500', priceTo: '200' }).priceTo, 'Ending price cannot be less than starting price.')
assert.equal(validateService({ name: 'Car Wash', priceFrom: '200', priceTo: '500' }).priceTo, undefined)

assert.equal(validateService({ name: 'Car Wash', priceUnit: 'A'.repeat(31) }).priceUnit, 'Price unit must be at most 30 characters.')
assert.equal(validateService({ name: 'Car Wash', description: '    ' }).description, 'Description cannot be whitespace only.')
assert.equal(validateService({ name: 'Car Wash', description: 'A'.repeat(501) }).description, 'Description must be at most 500 characters.')

// Product Validation
assert.equal(validateProduct({ name: '', price: '100' }).name, 'Product name is required.')
assert.equal(validateProduct({ name: '   ', price: '100' }).name, 'Product name is required.')
assert.equal(validateProduct({ name: 'A'.repeat(101), price: '100' }).name, 'Product name must be at most 100 characters.')

assert.equal(validateProduct({ name: 'Oil Filter', price: '' }).price, 'Product price is required.')
assert.equal(validateProduct({ name: 'Oil Filter', price: '0' }).price, 'Product price must be greater than 0.')
assert.equal(validateProduct({ name: 'Oil Filter', price: '-50' }).price, 'Product price must be greater than 0.')
assert.equal(validateProduct({ name: 'Oil Filter', price: '250.50' }).price, undefined)

assert.equal(validateProduct({ name: 'Oil Filter', price: '100', unit: 'A'.repeat(31) }).unit, 'Unit must be at most 30 characters.')
assert.equal(validateProduct({ name: 'Oil Filter', price: '100', description: '   ' }).description, 'Description cannot be whitespace only.')
assert.equal(validateProduct({ name: 'Oil Filter', price: '100', description: 'A'.repeat(501) }).description, 'Description must be at most 500 characters.')

console.log('✓ Products & Services validation passed!')

// ==========================================
// 3. REVIEWS VALIDATION TESTS
// ==========================================
console.log('\n--- 3. Testing Reviews Validation ---')

function validateReview({ rating, comment }) {
  if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return 'Rating must be an integer between 1 and 5.'
  }

  if (comment !== undefined && comment !== null && comment.length > 0) {
    const trimmed = comment.trim()
    if (!trimmed) {
      return 'Review comment cannot be only whitespace.'
    }
    if (trimmed.length < 5) {
      return 'Review comment must be at least 5 characters.'
    }
    if (trimmed.length > 1000) {
      return 'Review comment must be at most 1000 characters.'
    }
  }

  return null
}

// Rating bounds
assert.equal(validateReview({ rating: 0 }), 'Rating must be an integer between 1 and 5.')
assert.equal(validateReview({ rating: 6 }), 'Rating must be an integer between 1 and 5.')
assert.equal(validateReview({ rating: 3.5 }), 'Rating must be an integer between 1 and 5.')
assert.equal(validateReview({ rating: 1 }), null)
assert.equal(validateReview({ rating: 5 }), null)

// Comment validation
assert.equal(validateReview({ rating: 5, comment: '' }), null)
assert.equal(validateReview({ rating: 5, comment: '    ' }), 'Review comment cannot be only whitespace.')
assert.equal(validateReview({ rating: 5, comment: 'Good' }), 'Review comment must be at least 5 characters.')
assert.equal(validateReview({ rating: 5, comment: 'Great service provided by the team!' }), null)
assert.equal(validateReview({ rating: 5, comment: 'A'.repeat(1001) }), 'Review comment must be at most 1000 characters.')
assert.equal(validateReview({ rating: 5, comment: 'A'.repeat(1000) }), null)

console.log('✓ Reviews validation passed!')

// ==========================================
// 4. MARKETPLACE SEARCH VALIDATION TESTS
// ==========================================
console.log('\n--- 4. Testing Marketplace Search Validation ---')

function sanitizeSearchQuery(query) {
  if (typeof query !== 'string') return ''
  const trimmed = query.trim()
  if (!trimmed) return ''
  return trimmed.slice(0, 100)
}

assert.equal(sanitizeSearchQuery(''), '')
assert.equal(sanitizeSearchQuery('     '), '')
assert.equal(sanitizeSearchQuery('   hardware tools   '), 'hardware tools')
assert.equal(sanitizeSearchQuery('A'.repeat(120)).length, 100)
assert.equal(sanitizeSearchQuery('  ' + 'B'.repeat(100) + '   '), 'B'.repeat(100))

console.log('✓ Marketplace Search validation passed!')

console.log('\n=== All Validation Phase 3 Tests Passed Successfully! ===')
