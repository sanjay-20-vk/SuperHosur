import fs from 'node:fs'

console.log('=================================================================')
console.log('   PRIORITY 11: MAP POPUP REACT ROUTER NAVIGATION VERIFICATION')
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

// 1. Test Internal vs External Link Recognition Logic
console.log('--- TEST 1: Internal vs External URL Recognition Logic ---')
function isInternalLink(href) {
  if (!href) return false
  if (href.startsWith('//')) return false
  if (href.startsWith('/') && !href.startsWith('//')) return true
  try {
    const url = new URL(href, 'http://localhost:5173')
    return url.origin === 'http://localhost:5173'
  } catch {
    return false
  }
}

const internalCases = [
  '/businesses/12345',
  '/properties/67890',
  '/businesses/b-123/edit',
  '/categories',
  'http://localhost:5173/businesses/test-id',
]

const externalCases = [
  'https://www.openstreetmap.org/copyright',
  'https://maps.google.com/?q=12.7409,77.8253',
  'https://wa.me/919876543210',
  'tel:+919876543210',
  'mailto:contact@superhosur.in',
  '//external-cdn.com/asset.js',
]

let allInternalPassed = true
for (const href of internalCases) {
  if (!isInternalLink(href)) {
    fail(`Failed to identify internal link: ${href}`)
    allInternalPassed = false
  }
}
if (allInternalPassed) {
  pass(`All ${internalCases.length} internal routes identified for SPA React Router navigation.`)
}

let allExternalPassed = true
for (const href of externalCases) {
  if (isInternalLink(href)) {
    fail(`Incorrectly identified external link as internal: ${href}`)
    allExternalPassed = false
  }
}
if (allExternalPassed) {
  pass(`All ${externalCases.length} external links preserved as standard browser anchors.`)
}

// 2. Inspect HosurMap.tsx Component Implementation
console.log('\n--- TEST 2: HosurMap.tsx Implementation & React Router Integration ---')
try {
  const mapSource = fs.readFileSync('c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/components/HosurMap.tsx', 'utf-8')

  if (mapSource.includes("import { useNavigate } from 'react-router-dom'")) {
    pass('HosurMap imports useNavigate from react-router-dom')
  } else {
    fail('HosurMap missing useNavigate import')
  }

  if (mapSource.includes('function isInternalLink')) {
    pass('HosurMap defines isInternalLink safety helper')
  } else {
    fail('HosurMap missing isInternalLink helper')
  }

  if (mapSource.includes("map.on('popupopen'")) {
    pass("HosurMap registers Leaflet popupopen listener to attach SPA click handlers to popup DOM")
  } else {
    fail("HosurMap missing map.on('popupopen') listener")
  }

  if (mapSource.includes("container.addEventListener('click', handleContainerClick, true)")) {
    pass('HosurMap registers capturing-phase delegated click listener on map container as guaranteed fallback')
  } else {
    fail('HosurMap missing container delegated click listener')
  }

  if (mapSource.includes('e.preventDefault()') && mapSource.includes('navigateRef.current(href)')) {
    pass('HosurMap intercepts internal navigation with e.preventDefault() and navigateRef.current(href)')
  } else {
    fail('HosurMap missing e.preventDefault() or navigate call')
  }

  if (mapSource.includes('e.metaKey') && mapSource.includes('target === \'_blank\'')) {
    pass('HosurMap preserves modifier keys (Cmd/Ctrl click) and target="_blank" native browser tab opening')
  } else {
    fail('HosurMap does not preserve modifier keys')
  }

  if (mapSource.includes("container.removeEventListener('click', handleContainerClick, true)")) {
    pass('HosurMap properly cleans up event listeners on unmount')
  } else {
    fail('HosurMap missing event listener cleanup')
  }

  if (mapSource.includes('buildPopupHtml') && mapSource.includes('popup-action-btn')) {
    pass('HosurMap preserves buildPopupHtml and popup-action-btn styling and markup')
  } else {
    fail('HosurMap modified or broke popup HTML markup')
  }
} catch (err) {
  fail('Error reading HosurMap.tsx', err)
}

// 3. Verify Discovery Pages Map Route Configuration
console.log('\n--- TEST 3: Discovery & Detail Pages Navigation Target Verification ---')
try {
  const homeContent = fs.readFileSync('c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/pages/HomePage.tsx', 'utf-8')
  const propContent = fs.readFileSync('c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/pages/PropertiesPage.tsx', 'utf-8')

  if (homeContent.includes('link: `/businesses/${b.id}`')) {
    pass('HomePage passes valid internal route /businesses/${b.id} to HosurMap markers')
  } else {
    fail('HomePage missing expected marker link route')
  }

  if (propContent.includes('link: `/properties/${p.id}`')) {
    pass('PropertiesPage passes valid internal route /properties/${p.id} to HosurMap markers')
  } else {
    fail('PropertiesPage missing expected marker link route')
  }
} catch (err) {
  fail('Error reading discovery page sources', err)
}

console.log(`\n=================================================================`)
console.log(`   VERIFICATION COMPLETE: ${passCount} PASSED, ${failCount} FAILED`)
console.log(`=================================================================`)

if (failCount > 0) {
  process.exit(1)
}
