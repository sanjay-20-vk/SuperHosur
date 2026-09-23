export type CoordinateValidationResult = {
  latitude: number | null
  longitude: number | null
  error?: string
}

export function isValidLatitude(lat: number): boolean {
  return typeof lat === 'number' && !Number.isNaN(lat) && Number.isFinite(lat) && lat >= -90 && lat <= 90
}

export function isValidLongitude(lng: number): boolean {
  return typeof lng === 'number' && !Number.isNaN(lng) && Number.isFinite(lng) && lng >= -180 && lng <= 180
}

/**
 * Validates and parses latitude and longitude strings.
 * - If both are empty/blank, returns { latitude: null, longitude: null } (optional coordinates).
 * - If one is provided and the other is blank, returns an error.
 * - Latitude must be a valid number between -90 and 90.
 * - Longitude must be a valid number between -180 and 180.
 */
export function parseAndValidateCoordinates(
  latInput: string | number | null | undefined,
  lngInput: string | number | null | undefined,
): CoordinateValidationResult {
  const latStr = latInput !== null && latInput !== undefined ? String(latInput).trim() : ''
  const lngStr = lngInput !== null && lngInput !== undefined ? String(lngInput).trim() : ''

  if (latStr === '' && lngStr === '') {
    return { latitude: null, longitude: null }
  }

  if (latStr === '' || lngStr === '') {
    return {
      latitude: null,
      longitude: null,
      error: 'Please provide both latitude and longitude, or leave both empty.',
    }
  }

  const lat = Number(latStr)
  if (Number.isNaN(lat) || !Number.isFinite(lat)) {
    return {
      latitude: null,
      longitude: null,
      error: 'Latitude must be a valid number between -90 and 90.',
    }
  }

  if (lat < -90 || lat > 90) {
    return {
      latitude: null,
      longitude: null,
      error: 'Latitude must be between -90 and 90.',
    }
  }

  const lng = Number(lngStr)
  if (Number.isNaN(lng) || !Number.isFinite(lng)) {
    return {
      latitude: null,
      longitude: null,
      error: 'Longitude must be a valid number between -180 and 180.',
    }
  }

  if (lng < -180 || lng > 180) {
    return {
      latitude: null,
      longitude: null,
      error: 'Longitude must be between -180 and 180.',
    }
  }

  return { latitude: lat, longitude: lng }
}
