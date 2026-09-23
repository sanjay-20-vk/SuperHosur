import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Header } from '../components/Header'
import { LoadingState } from '../components/LoadingState'
import { OwnerPropertyPhotoManager } from '../components/OwnerPropertyPhotoManager'
import { getCurrentSession } from '../services/auth'
import { getCities, type CityOption } from '../services/cities'
import {
  createProperty,
  deleteProperty,
  getOwnerPropertyById,
  getOwnerPropertyPhotos,
  getPropertyErrorMessage,
  updateProperty,
  type CreatePropertyInput,
  type ListingType,
  type PropertyPhotoWithUrl,
  type PropertyType,
} from '../services/properties'
import { parseAndValidateCoordinates } from '../utils/coordinates'

const PROPERTY_TYPES: { label: string; value: PropertyType }[] = [
  { label: 'Apartment / Flat', value: 'apartment' },
  { label: 'Independent House', value: 'house' },
  { label: 'Villa', value: 'villa' },
  { label: 'Plot / Land', value: 'plot' },
  { label: 'Commercial Space', value: 'commercial' },
  { label: 'Office Space', value: 'office' },
  { label: 'Shop / Showroom', value: 'shop' },
  { label: 'Warehouse / Godown', value: 'warehouse' },
  { label: 'Agricultural Land', value: 'land' },
  { label: 'Other', value: 'other' },
]

const LISTING_TYPES: { label: string; value: ListingType }[] = [
  { label: 'For Sale', value: 'sale' },
  { label: 'For Rent', value: 'rent' },
  { label: 'For Lease', value: 'lease' },
]

type PropertyFieldErrors = {
  title?: string
  cityId?: string
  price?: string
  rent?: string
  deposit?: string
  areaSqft?: string
  bedrooms?: string
  bathrooms?: string
  address?: string
  description?: string
  latitude?: string
  longitude?: string
  coordinates?: string
}

function validatePropertyFields(values: {
  title: string
  cityId: string
  listingType: ListingType
  price: string
  rent: string
  deposit: string
  areaSqft: string
  bedrooms: string
  bathrooms: string
  address: string
  description: string
  latitude: string
  longitude: string
}): { errors: PropertyFieldErrors; isValid: boolean } {
  const errors: PropertyFieldErrors = {}

  const trimmedTitle = values.title.trim()
  if (!trimmedTitle) {
    errors.title = values.title.length > 0 ? 'Property title cannot be only whitespace.' : 'Property title is required.'
  } else if (trimmedTitle.length < 5 || trimmedTitle.length > 120) {
    errors.title = 'Property title must be between 5 and 120 characters.'
  }

  if (!values.cityId) {
    errors.cityId = 'Please select a city.'
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
        errors.rent = `${values.listingType === 'rent' ? 'Rent' : 'Lease'} listing requires an amount greater than ₹0.`
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

  const coordResult = parseAndValidateCoordinates(values.latitude, values.longitude)
  if (coordResult.error) {
    errors.coordinates = coordResult.error
  }

  return { errors, isValid: Object.keys(errors).length === 0 }
}

export function CreatePropertyPage() {
  const navigate = useNavigate()
  const { propertyId } = useParams()
  const isEditing = Boolean(propertyId)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<PropertyFieldErrors>({})
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Form Fields
  const [title, setTitle] = useState('')
  const [propertyType, setPropertyType] = useState<PropertyType>('apartment')
  const [listingType, setListingType] = useState<ListingType>('sale')
  const [cityId, setCityId] = useState('')
  const [bedrooms, setBedrooms] = useState<string>('')
  const [bathrooms, setBathrooms] = useState<string>('')
  const [areaSqft, setAreaSqft] = useState<string>('')
  const [price, setPrice] = useState<string>('')
  const [rent, setRent] = useState<string>('')
  const [deposit, setDeposit] = useState<string>('')
  const [address, setAddress] = useState('')
  const [latitude, setLatitude] = useState<string>('')
  const [longitude, setLongitude] = useState<string>('')
  const [description, setDescription] = useState('')
  const [active, setActive] = useState(true)
  const [verified, setVerified] = useState(false)

  const [cities, setCities] = useState<CityOption[]>([])

  // Photos
  const [photos, setPhotos] = useState<PropertyPhotoWithUrl[]>([])
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const clearFieldError = (field: keyof PropertyFieldErrors) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true)
        setError(null)

        const session = await getCurrentSession()
        if (!session?.user?.id) {
          navigate('/auth', { replace: true })
          return
        }

        const cityRows = await getCities()
        setCities(cityRows)

        const defaultCity = cityRows[0]
        if (defaultCity) {
          setCityId((prev) => prev || defaultCity.id)
        }

        if (isEditing && propertyId) {
          const prop = await getOwnerPropertyById(propertyId)
          if (prop.owner_id !== session.user.id) {
            setError('You do not have permission to edit this property.')
            setLoading(false)
            return
          }

          setTitle(prop.title)
          setPropertyType(prop.property_type)
          setListingType(prop.listing_type)
          setCityId(prop.city_id)
          setBedrooms(prop.bedrooms !== null ? String(prop.bedrooms) : '')
          setBathrooms(prop.bathrooms !== null ? String(prop.bathrooms) : '')
          setAreaSqft(prop.area_sqft !== null ? String(prop.area_sqft) : '')
          setPrice(prop.price !== null ? String(prop.price) : '')
          setRent(prop.rent !== null ? String(prop.rent) : '')
          setDeposit(prop.deposit !== null ? String(prop.deposit) : '')
          setAddress(prop.address ?? '')
          setLatitude(prop.latitude !== null && prop.latitude !== undefined ? String(prop.latitude) : '')
          setLongitude(prop.longitude !== null && prop.longitude !== undefined ? String(prop.longitude) : '')
          setDescription(prop.description ?? '')
          setActive(prop.active)
          setVerified(prop.verified)

          try {
            const photoRows = await getOwnerPropertyPhotos(propertyId)
            setPhotos(photoRows)
          } catch (photoLoadErr) {
            console.error('Failed to load photos:', photoLoadErr)
          }
        }
      } catch (err) {
        setError(getPropertyErrorMessage(err, 'Unable to load property data.'))
      } finally {
        setLoading(false)
      }
    }

    loadInitialData()
  }, [isEditing, propertyId, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return

    const { errors: validationErrors, isValid } = validatePropertyFields({
      title,
      cityId,
      listingType,
      price,
      rent,
      deposit,
      areaSqft,
      bedrooms,
      bathrooms,
      address,
      description,
      latitude,
      longitude,
    })

    if (!isValid) {
      setFieldErrors(validationErrors)
      setError('Please correct the highlighted errors before submitting.')
      return
    }

    setFieldErrors({})
    setSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const coordResult = parseAndValidateCoordinates(latitude, longitude)
      if (coordResult.error) {
        setFieldErrors((prev) => ({ ...prev, coordinates: coordResult.error }))
        setError(coordResult.error)
        return
      }

      const session = await getCurrentSession()
      if (!session?.user?.id) {
        navigate('/auth', { replace: true })
        return
      }

      const cleanTitle = title.trim()
      const cleanAddress = address.trim() || null
      const cleanDescription = description.trim() || null
      const cleanBedrooms = bedrooms.trim() ? Number(bedrooms) : null
      const cleanBathrooms = bathrooms.trim() ? Number(bathrooms) : null
      const cleanArea = areaSqft.trim() ? Number(areaSqft) : null
      const cleanPrice = price.trim() ? Number(price) : null
      const cleanRent = rent.trim() ? Number(rent) : null
      const cleanDeposit = deposit.trim() ? Number(deposit) : null

      const input: CreatePropertyInput = {
        title: cleanTitle,
        property_type: propertyType,
        listing_type: listingType,
        city_id: cityId,
        bedrooms: cleanBedrooms,
        bathrooms: cleanBathrooms,
        area_sqft: cleanArea,
        price: cleanPrice,
        rent: cleanRent,
        deposit: cleanDeposit,
        address: cleanAddress,
        latitude: coordResult.latitude,
        longitude: coordResult.longitude,
        description: cleanDescription,
      }

      if (isEditing && propertyId) {
        await updateProperty(propertyId, {
          ...input,
          active,
        })
        setSuccessMessage('Property updated successfully!')
      } else {
        const created = await createProperty(input, session.user.id)
        setSuccessMessage('Property created! You can now add photos below.')
        navigate(`/owner/properties/${created.id}/edit`, { replace: true })
      }
    } catch (saveErr) {
      setError(getPropertyErrorMessage(saveErr, 'Unable to save property.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!propertyId) return

    if (!window.confirm('Are you sure you want to permanently delete this property and all its photos?')) {
      return
    }

    try {
      setDeleting(true)
      setError(null)
      await deleteProperty(propertyId)
      navigate('/owner', { replace: true })
    } catch (delErr) {
      setError(getPropertyErrorMessage(delErr, 'Unable to delete property.'))
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <>
        <Header />
        <LoadingState message="Loading property..." />
      </>
    )
  }

  return (
    <>
      <Header />

      <section className="page-section">
        <div className="property-form-wrapper">
          <div className="property-form-header">
            <div>
              <p className="eyebrow">{isEditing ? 'Manage Listing' : 'New Listing'}</p>
              <h1>{isEditing ? `Edit: ${title || 'Property'}` : 'List a Property in Hosur'}</h1>
              <p className="property-form-intro">
                {isEditing
                  ? 'Update your property specifications, pricing, and photo gallery.'
                  : 'Provide details about your property. Once submitted, it will be reviewed for verification.'}
              </p>
            </div>

            <div className="property-form-nav">
              {isEditing && propertyId && (
                <Link to={`/properties/${propertyId}`} className="secondary-button">
                  View Public Listing
                </Link>
              )}
              <Link to="/owner" className="secondary-button">
                Back to Dashboard
              </Link>
            </div>
          </div>

          {error && (
            <div className="form-error property-alert" role="alert">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="form-success property-alert" role="status" style={{ color: '#17614d', fontWeight: 600 }}>
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="property-form-card">
            <div className="property-grid">
              {/* Row 1: Property Title — full width */}
              <div className="property-field col-span-6">
                <label htmlFor="property-title">Property Title *</label>
                <input
                  id="property-title"
                  type="text"
                  maxLength={120}
                  aria-invalid={Boolean(fieldErrors.title)}
                  aria-describedby={fieldErrors.title ? 'property-title-error' : undefined}
                  placeholder="e.g. Spacious 3 BHK Villa in Bagalur Road"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value)
                    clearFieldError('title')
                  }}
                  required
                />
                {fieldErrors.title && (
                  <span id="property-title-error" className="field-error" role="alert">
                    {fieldErrors.title}
                  </span>
                )}
              </div>

              {/* Row 2: Listing Type, Property Type, City / Region */}
              <div className="property-field col-span-2">
                <label htmlFor="property-listing-type">Listing Type *</label>
                <select
                  id="property-listing-type"
                  value={listingType}
                  onChange={(e) => {
                    setListingType(e.target.value as ListingType)
                    clearFieldError('price')
                    clearFieldError('rent')
                  }}
                >
                  {LISTING_TYPES.map((lt) => (
                    <option key={lt.value} value={lt.value}>
                      {lt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="property-field col-span-2">
                <label htmlFor="property-type">Property Type *</label>
                <select
                  id="property-type"
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value as PropertyType)}
                >
                  {PROPERTY_TYPES.map((pt) => (
                    <option key={pt.value} value={pt.value}>
                      {pt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="property-field col-span-2 col-tablet-full">
                <label htmlFor="property-city">City / Region *</label>
                <select
                  id="property-city"
                  aria-invalid={Boolean(fieldErrors.cityId)}
                  aria-describedby={fieldErrors.cityId ? 'property-city-error' : undefined}
                  value={cityId}
                  onChange={(e) => {
                    setCityId(e.target.value)
                    clearFieldError('cityId')
                  }}
                  required
                >
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {fieldErrors.cityId && (
                  <span id="property-city-error" className="field-error" role="alert">
                    {fieldErrors.cityId}
                  </span>
                )}
              </div>

              {/* Row 3: Bedrooms (BHK), Bathrooms, Area (sq.ft) */}
              <div className="property-field col-span-2">
                <label htmlFor="property-bedrooms">Bedrooms (BHK)</label>
                <input
                  id="property-bedrooms"
                  type="number"
                  min="0"
                  step="1"
                  aria-invalid={Boolean(fieldErrors.bedrooms)}
                  aria-describedby={fieldErrors.bedrooms ? 'property-bedrooms-error' : undefined}
                  placeholder="e.g. 2 or 3"
                  value={bedrooms}
                  onChange={(e) => {
                    setBedrooms(e.target.value)
                    clearFieldError('bedrooms')
                  }}
                />
                {fieldErrors.bedrooms && (
                  <span id="property-bedrooms-error" className="field-error" role="alert">
                    {fieldErrors.bedrooms}
                  </span>
                )}
              </div>

              <div className="property-field col-span-2">
                <label htmlFor="property-bathrooms">Bathrooms</label>
                <input
                  id="property-bathrooms"
                  type="number"
                  min="0"
                  step="0.5"
                  aria-invalid={Boolean(fieldErrors.bathrooms)}
                  aria-describedby={fieldErrors.bathrooms ? 'property-bathrooms-error' : undefined}
                  placeholder="e.g. 2"
                  value={bathrooms}
                  onChange={(e) => {
                    setBathrooms(e.target.value)
                    clearFieldError('bathrooms')
                  }}
                />
                {fieldErrors.bathrooms && (
                  <span id="property-bathrooms-error" className="field-error" role="alert">
                    {fieldErrors.bathrooms}
                  </span>
                )}
              </div>

              <div className="property-field col-span-2 col-tablet-full">
                <label htmlFor="property-area">Area (sq.ft)</label>
                <input
                  id="property-area"
                  type="number"
                  min="1"
                  step="1"
                  aria-invalid={Boolean(fieldErrors.areaSqft)}
                  aria-describedby={fieldErrors.areaSqft ? 'property-area-error' : undefined}
                  placeholder="e.g. 1450"
                  value={areaSqft}
                  onChange={(e) => {
                    setAreaSqft(e.target.value)
                    clearFieldError('areaSqft')
                  }}
                />
                {fieldErrors.areaSqft && (
                  <span id="property-area-error" className="field-error" role="alert">
                    {fieldErrors.areaSqft}
                  </span>
                )}
              </div>

              {/* Row 4: Pricing & Address */}
              {listingType === 'sale' ? (
                <>
                  <div className="property-field col-span-2">
                    <label htmlFor="property-price">Sale Price (₹) *</label>
                    <input
                      id="property-price"
                      type="number"
                      min="1"
                      step="1000"
                      aria-invalid={Boolean(fieldErrors.price)}
                      aria-describedby={fieldErrors.price ? 'property-price-error' : undefined}
                      placeholder="e.g. 6500000"
                      value={price}
                      onChange={(e) => {
                        setPrice(e.target.value)
                        clearFieldError('price')
                      }}
                    />
                    {fieldErrors.price && (
                      <span id="property-price-error" className="field-error" role="alert">
                        {fieldErrors.price}
                      </span>
                    )}
                  </div>

                  <div className="property-field col-span-4">
                    <label htmlFor="property-address">Full Address / Landmark</label>
                    <input
                      id="property-address"
                      type="text"
                      maxLength={250}
                      aria-invalid={Boolean(fieldErrors.address)}
                      aria-describedby={fieldErrors.address ? 'property-address-error' : undefined}
                      placeholder="e.g. Plot 42, Green Glen Layout, Rayakottai Road, Hosur"
                      value={address}
                      onChange={(e) => {
                        setAddress(e.target.value)
                        clearFieldError('address')
                      }}
                    />
                    <span className="char-hint">{address.length}/250</span>
                    {fieldErrors.address && (
                      <span id="property-address-error" className="field-error" role="alert">
                        {fieldErrors.address}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="property-field col-span-3">
                    <label htmlFor="property-rent">
                      {listingType === 'rent' ? 'Monthly Rent (₹) *' : 'Lease Amount (₹) *'}
                    </label>
                    <input
                      id="property-rent"
                      type="number"
                      min="1"
                      step="500"
                      aria-invalid={Boolean(fieldErrors.rent)}
                      aria-describedby={fieldErrors.rent ? 'property-rent-error' : undefined}
                      placeholder="e.g. 18000"
                      value={rent}
                      onChange={(e) => {
                        setRent(e.target.value)
                        clearFieldError('rent')
                      }}
                    />
                    {fieldErrors.rent && (
                      <span id="property-rent-error" className="field-error" role="alert">
                        {fieldErrors.rent}
                      </span>
                    )}
                  </div>

                  <div className="property-field col-span-3">
                    <label htmlFor="property-deposit">Security Deposit (₹)</label>
                    <input
                      id="property-deposit"
                      type="number"
                      min="0"
                      step="1000"
                      aria-invalid={Boolean(fieldErrors.deposit)}
                      aria-describedby={fieldErrors.deposit ? 'property-deposit-error' : undefined}
                      placeholder="e.g. 100000"
                      value={deposit}
                      onChange={(e) => {
                        setDeposit(e.target.value)
                        clearFieldError('deposit')
                      }}
                    />
                    {fieldErrors.deposit && (
                      <span id="property-deposit-error" className="field-error" role="alert">
                        {fieldErrors.deposit}
                      </span>
                    )}
                  </div>

                  <div className="property-field col-span-6">
                    <label htmlFor="property-address">Full Address / Landmark</label>
                    <input
                      id="property-address"
                      type="text"
                      maxLength={250}
                      aria-invalid={Boolean(fieldErrors.address)}
                      aria-describedby={fieldErrors.address ? 'property-address-error' : undefined}
                      placeholder="e.g. Plot 42, Green Glen Layout, Rayakottai Road, Hosur"
                      value={address}
                      onChange={(e) => {
                        setAddress(e.target.value)
                        clearFieldError('address')
                      }}
                    />
                    <span className="char-hint">{address.length}/250</span>
                    {fieldErrors.address && (
                      <span id="property-address-error" className="field-error" role="alert">
                        {fieldErrors.address}
                      </span>
                    )}
                  </div>
                </>
              )}

              {/* Row 5: Latitude & Longitude (GPS Coordinates) */}
              <div className="property-field col-span-3">
                <label htmlFor="property-latitude">Latitude (GPS Coordinates)</label>
                <input
                  id="property-latitude"
                  type="number"
                  step="any"
                  aria-invalid={Boolean(fieldErrors.latitude || fieldErrors.coordinates)}
                  aria-describedby={
                    fieldErrors.latitude
                      ? 'property-latitude-error'
                      : fieldErrors.coordinates
                        ? 'property-coord-error'
                        : undefined
                  }
                  placeholder="e.g. 12.7409"
                  value={latitude}
                  onChange={(e) => {
                    setLatitude(e.target.value)
                    clearFieldError('latitude')
                    clearFieldError('coordinates')
                  }}
                />
                <span className="property-helper-text">
                  Hosur: ~12.7409 (Range: -90 to 90)
                </span>
                {fieldErrors.latitude && (
                  <span id="property-latitude-error" className="field-error" role="alert">
                    {fieldErrors.latitude}
                  </span>
                )}
                {fieldErrors.coordinates && (
                  <span id="property-coord-error" className="field-error" role="alert">
                    {fieldErrors.coordinates}
                  </span>
                )}
              </div>

              <div className="property-field col-span-3">
                <label htmlFor="property-longitude">Longitude (GPS Coordinates)</label>
                <input
                  id="property-longitude"
                  type="number"
                  step="any"
                  aria-invalid={Boolean(fieldErrors.longitude || fieldErrors.coordinates)}
                  aria-describedby={
                    fieldErrors.longitude
                      ? 'property-longitude-error'
                      : fieldErrors.coordinates
                        ? 'property-coord-error'
                        : undefined
                  }
                  placeholder="e.g. 77.8253"
                  value={longitude}
                  onChange={(e) => {
                    setLongitude(e.target.value)
                    clearFieldError('longitude')
                    clearFieldError('coordinates')
                  }}
                />
                <span className="property-helper-text">
                  Hosur: ~77.8253 (Range: -180 to 180)
                </span>
                {fieldErrors.longitude && (
                  <span id="property-longitude-error" className="field-error" role="alert">
                    {fieldErrors.longitude}
                  </span>
                )}
              </div>

              {/* Row 6: Description & Amenities — full width */}
              <div className="property-field col-span-6">
                <label htmlFor="property-description">Description & Amenities</label>
                <textarea
                  id="property-description"
                  rows={4}
                  maxLength={1000}
                  aria-invalid={Boolean(fieldErrors.description)}
                  aria-describedby={fieldErrors.description ? 'property-desc-error' : undefined}
                  placeholder="Describe key features: 24/7 water, modular kitchen, car parking, power backup, etc."
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value)
                    clearFieldError('description')
                  }}
                />
                <span className="char-hint">{description.length}/1000</span>
                {fieldErrors.description && (
                  <span id="property-desc-error" className="field-error" role="alert">
                    {fieldErrors.description}
                  </span>
                )}
              </div>

              {/* Active Toggle (Only for editing) */}
              {isEditing && (
                <div className="property-field col-span-6">
                  <div className="property-active-row">
                    <input
                      type="checkbox"
                      id="property-active"
                      checked={active}
                      onChange={(e) => setActive(e.target.checked)}
                    />
                    <label htmlFor="property-active">
                      Property is Active (visible in search once verified)
                    </label>
                    <span className={verified ? 'status-badge verified' : 'status-badge'}>
                      {verified ? 'Admin Verified' : 'Pending Admin Verification'}
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="property-form-actions col-span-6">
                <button type="submit" className="primary-button property-submit-btn" disabled={saving}>
                  {saving ? 'Saving...' : isEditing ? 'Save Property Changes' : 'Create Property Listing'}
                </button>

                {isEditing && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="danger-button property-delete-btn"
                    disabled={deleting || saving}
                  >
                    {deleting ? 'Deleting...' : 'Delete Property'}
                  </button>
                )}
              </div>
            </div>
          </form>

          {/* Photo Management Section (Available in Edit Mode) */}
          {isEditing && propertyId && (
            <div className="property-photo-section">
              <OwnerPropertyPhotoManager
                propertyId={propertyId}
                photos={photos}
                uploading={uploadingPhoto}
                error={photoError}
                onError={setPhotoError}
                onPhotosChange={setPhotos}
                onUploadingChange={setUploadingPhoto}
              />
            </div>
          )}
        </div>
      </section>
    </>
  )
}
