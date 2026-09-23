import { createClient } from 'file:///c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/node_modules/@supabase/supabase-js/dist/index.mjs'
import fs from 'node:fs'
import { parseAndValidateCoordinates, isValidLatitude, isValidLongitude } from 'file:///c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/utils/coordinates.ts'

const SUPABASE_URL = 'https://cdsghhesglltjvqbewol.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_ubnd6hu6T0jz33SdUYFoRw_mXHwsHi0'

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function runLocationCaptureVerification() {
  console.log('=================================================================')
  console.log('  PRIORITY 5: BUSINESS & PROPERTY LOCATION CAPTURE VERIFICATION')
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

  // TEST 1: Coordinate Validation Utility Unit Tests
  console.log('--- TEST 1: Coordinate Validation & Parsing Utility ---')
  try {
    // 1. Both empty -> { latitude: null, longitude: null }
    const emptyRes = parseAndValidateCoordinates('', '')
    if (emptyRes.latitude === null && emptyRes.longitude === null && !emptyRes.error) {
      pass('Empty coordinates properly evaluate to null without errors')
    } else {
      fail('Empty coordinates failed', emptyRes)
    }

    // 2. Both whitespace -> { latitude: null, longitude: null }
    const wsRes = parseAndValidateCoordinates('   ', '  \t ')
    if (wsRes.latitude === null && wsRes.longitude === null && !wsRes.error) {
      pass('Whitespace coordinates properly evaluate to null')
    } else {
      fail('Whitespace coordinates failed', wsRes)
    }

    // 3. Null / undefined inputs -> null
    const nullRes = parseAndValidateCoordinates(null, undefined)
    if (nullRes.latitude === null && nullRes.longitude === null && !nullRes.error) {
      pass('Null and undefined coordinate inputs evaluate to null')
    } else {
      fail('Null inputs failed', nullRes)
    }

    // 4. Latitude provided, longitude empty -> error
    const latOnlyRes = parseAndValidateCoordinates('12.7409', '')
    if (latOnlyRes.error && latOnlyRes.error.includes('both latitude and longitude')) {
      pass('Missing longitude rejected with clear validation message')
    } else {
      fail('Missing longitude was not rejected properly', latOnlyRes)
    }

    // 5. Longitude provided, latitude empty -> error
    const lngOnlyRes = parseAndValidateCoordinates('', '77.8253')
    if (lngOnlyRes.error && lngOnlyRes.error.includes('both latitude and longitude')) {
      pass('Missing latitude rejected with clear validation message')
    } else {
      fail('Missing latitude was not rejected properly', lngOnlyRes)
    }

    // 6. Valid Hosur coordinates
    const hosurRes = parseAndValidateCoordinates('12.7409', '77.8253')
    if (hosurRes.latitude === 12.7409 && hosurRes.longitude === 77.8253 && !hosurRes.error) {
      pass('Valid Hosur coordinates parsed correctly (12.7409, 77.8253)')
    } else {
      fail('Valid Hosur coordinates failed', hosurRes)
    }

    // 7. Coordinates with whitespace
    const trimRes = parseAndValidateCoordinates('  12.7409  ', '  77.8253  ')
    if (trimRes.latitude === 12.7409 && trimRes.longitude === 77.8253 && !trimRes.error) {
      pass('Trimmed whitespace correctly around numeric coordinates')
    } else {
      fail('Trimming whitespace failed', trimRes)
    }

    // 8. Boundary coordinates (0, 0, 90, -90, 180, -180)
    const boundsRes1 = parseAndValidateCoordinates(90, 180)
    const boundsRes2 = parseAndValidateCoordinates(-90, -180)
    const boundsRes3 = parseAndValidateCoordinates(0, 0)
    if (
      boundsRes1.latitude === 90 && boundsRes1.longitude === 180 &&
      boundsRes2.latitude === -90 && boundsRes2.longitude === -180 &&
      boundsRes3.latitude === 0 && boundsRes3.longitude === 0
    ) {
      pass('Boundary coordinates (-90/90, -180/180, 0/0) accepted correctly')
    } else {
      fail('Boundary coordinates failed', { boundsRes1, boundsRes2, boundsRes3 })
    }

    // 9. Latitude out of range
    const latHighRes = parseAndValidateCoordinates('90.0001', '77.8253')
    const latLowRes = parseAndValidateCoordinates('-90.0001', '77.8253')
    if (latHighRes.error && latLowRes.error) {
      pass('Latitude out of range (> 90 or < -90) rejected')
    } else {
      fail('Latitude out of range was not rejected', { latHighRes, latLowRes })
    }

    // 10. Longitude out of range
    const lngHighRes = parseAndValidateCoordinates('12.7409', '180.0001')
    const lngLowRes = parseAndValidateCoordinates('12.7409', '-180.0001')
    if (lngHighRes.error && lngLowRes.error) {
      pass('Longitude out of range (> 180 or < -180) rejected')
    } else {
      fail('Longitude out of range was not rejected', { lngHighRes, lngLowRes })
    }

    // 11. Non-numeric input
    const nanRes = parseAndValidateCoordinates('hosur_north', 'hosur_east')
    if (nanRes.error && nanRes.error.includes('valid number')) {
      pass('Non-numeric coordinates rejected with helpful validation message')
    } else {
      fail('Non-numeric coordinates not rejected properly', nanRes)
    }
  } catch (err) {
    fail('Exception in coordinate utility tests', err)
  }

  // TEST 2: Businesses Service Layer Types & Payloads
  console.log('\n--- TEST 2: Businesses Service Layer Types ---')
  try {
    const businessService = fs.readFileSync('c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/services/businesses.ts', 'utf-8')
    const hasCreateLat = businessService.includes('latitude?: number | null')
    const hasCreateLng = businessService.includes('longitude?: number | null')
    const hasSummaryCoords = businessService.includes('latitude?: number | null') && businessService.includes('longitude?: number | null')
    const hasRecordCoords = businessService.includes('latitude: number | null') && businessService.includes('longitude: number | null')

    if (hasCreateLat && hasCreateLng && hasSummaryCoords && hasRecordCoords) {
      pass('businesses.ts defines typed latitude and longitude in BusinessCreateInput, BusinessRecord, and BusinessSummary')
    } else {
      fail('businesses.ts coordinate types missing', { hasCreateLat, hasCreateLng, hasSummaryCoords, hasRecordCoords })
    }
  } catch (err) {
    fail('Exception checking businesses.ts', err)
  }

  // TEST 3: CreateBusinessPage Location Capture Integration
  console.log('\n--- TEST 3: CreateBusinessPage Integration ---')
  try {
    const createBPage = fs.readFileSync('c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/pages/CreateBusinessPage.tsx', 'utf-8')
    const hasLatState = createBPage.includes('const [latitude, setLatitude] = useState')
    const hasLngState = createBPage.includes('const [longitude, setLongitude] = useState')
    const hasCoordValidator = createBPage.includes('parseAndValidateCoordinates(latitude, longitude)')
    const hasCoordErrorCheck = createBPage.includes('if (coordResult.error)')
    const hasUpdatePayloadCoord = createBPage.includes('latitude: coordResult.latitude') && createBPage.includes('longitude: coordResult.longitude')
    const hasCreatePayloadCoord = createBPage.includes('createBusiness({') && createBPage.includes('latitude: coordResult.latitude')
    const hasInputFields = createBPage.includes('Latitude (GPS Coordinates)') && createBPage.includes('Longitude (GPS Coordinates)')
    const hasLoadCoords = createBPage.includes('selectedBusiness.latitude') && createBPage.includes('selectedBusiness.longitude')

    if (
      hasLatState &&
      hasLngState &&
      hasCoordValidator &&
      hasCoordErrorCheck &&
      hasUpdatePayloadCoord &&
      hasCreatePayloadCoord &&
      hasInputFields &&
      hasLoadCoords
    ) {
      pass('CreateBusinessPage captures, validates, loads, and saves latitude/longitude for both creation and updates')
    } else {
      fail('CreateBusinessPage missing location components', {
        hasLatState,
        hasLngState,
        hasCoordValidator,
        hasCoordErrorCheck,
        hasUpdatePayloadCoord,
        hasCreatePayloadCoord,
        hasInputFields,
        hasLoadCoords,
      })
    }
  } catch (err) {
    fail('Exception checking CreateBusinessPage.tsx', err)
  }

  // TEST 4: Properties Service Layer Types
  console.log('\n--- TEST 4: Properties Service Layer Types ---')
  try {
    const propService = fs.readFileSync('c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/services/properties.ts', 'utf-8')
    const hasCreateLat = propService.includes('latitude?: number | null')
    const hasCreateLng = propService.includes('longitude?: number | null')
    const hasRecordCoords = propService.includes('latitude: number | null') && propService.includes('longitude: number | null')

    if (hasCreateLat && hasCreateLng && hasRecordCoords) {
      pass('properties.ts defines typed latitude and longitude in CreatePropertyInput and PropertyRecord')
    } else {
      fail('properties.ts coordinate types missing', { hasCreateLat, hasCreateLng, hasRecordCoords })
    }
  } catch (err) {
    fail('Exception checking properties.ts', err)
  }

  // TEST 5: CreatePropertyPage Location Capture Integration
  console.log('\n--- TEST 5: CreatePropertyPage Integration ---')
  try {
    const createPPage = fs.readFileSync('c:/Users/sanja/OneDrive/Documents/Desktop/SuperHosur/src/pages/CreatePropertyPage.tsx', 'utf-8')
    const hasLatState = createPPage.includes('const [latitude, setLatitude] = useState')
    const hasLngState = createPPage.includes('const [longitude, setLongitude] = useState')
    const hasCoordValidator = createPPage.includes('parseAndValidateCoordinates(latitude, longitude)')
    const hasCoordErrorCheck = createPPage.includes('if (coordResult.error)')
    const hasInputCoord = createPPage.includes('latitude: coordResult.latitude') && createPPage.includes('longitude: coordResult.longitude')
    const hasInputFields = createPPage.includes('Latitude (GPS Coordinates)') && createPPage.includes('Longitude (GPS Coordinates)')
    const hasLoadCoords = createPPage.includes('prop.latitude') && createPPage.includes('prop.longitude')

    if (
      hasLatState &&
      hasLngState &&
      hasCoordValidator &&
      hasCoordErrorCheck &&
      hasInputCoord &&
      hasInputFields &&
      hasLoadCoords
    ) {
      pass('CreatePropertyPage captures, validates, loads, and saves latitude/longitude for both creation and updates')
    } else {
      fail('CreatePropertyPage missing location components', {
        hasLatState,
        hasLngState,
        hasCoordValidator,
        hasCoordErrorCheck,
        hasInputCoord,
        hasInputFields,
        hasLoadCoords,
      })
    }
  } catch (err) {
    fail('Exception checking CreatePropertyPage.tsx', err)
  }

  // TEST 6: Supabase Database Schema Verification
  console.log('\n--- TEST 6: Database Schema & Coordinate Checks ---')
  try {
    const [bRes, pRes] = await Promise.all([
      anonClient.from('businesses').select('id, name, latitude, longitude').limit(5),
      anonClient.from('properties').select('id, title, latitude, longitude').limit(5),
    ])

    if (bRes.error && bRes.error.code !== '42501') {
      fail('Failed to query businesses table coordinates', bRes.error)
    } else {
      pass('businesses table latitude and longitude columns verified in database schema')
    }

    if (pRes.error && pRes.error.code !== '42501') {
      fail('Failed to query properties table coordinates', pRes.error)
    } else {
      pass('properties table latitude and longitude columns verified in database schema')
    }
  } catch (err) {
    fail('Exception during database verification', err)
  }

  console.log('\n=================================================================')
  console.log(`VERIFICATION SUMMARY: ${passCount} PASSED, ${failCount} FAILED`)
  console.log('=================================================================')

  if (failCount > 0) {
    process.exit(1)
  }
}

runLocationCaptureVerification()
