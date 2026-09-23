import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { OwnerPhotoManager } from '../components/OwnerPhotoManager'
import { OwnerVideoManager } from '../components/OwnerVideoManager'
import { getCurrentSession } from '../services/auth'
import { getCities } from '../services/cities'
import {
  createBusiness,
  getBusinessById,
  getCategoriesForBusinessForm,
  getBusinessErrorMessage,
  toBusinessSlug,
  updateBusiness,
  type BusinessCreateInput,
  type BusinessUpdateInput,
} from '../services/businesses'
import { getOwnerBusinessPhotos, getPhotoErrorMessage, type BusinessPhotoWithUrl } from '../services/photos'
import { getOwnerBusinessVideos, getVideoErrorMessage, type BusinessVideoWithUrl } from '../services/videos'
import { parseAndValidateCoordinates } from '../utils/coordinates'

const PHONE_REGEX = /^(?:\+91|91)?[6-9]\d{9}$/
const PINCODE_REGEX = /^[1-9]\d{5}$/
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

type BusinessFieldErrors = {
  name?: string
  slug?: string
  cityId?: string
  categoryId?: string
  phone?: string
  whatsapp?: string
  email?: string
  pincode?: string
  address?: string
  description?: string
  coordinates?: string
}

function validateBusinessFields(values: {
  name: string
  slug: string
  cityId: string
  categoryId: string
  phone: string
  whatsapp: string
  email: string
  pincode: string
  address: string
  description: string
  latitude: string
  longitude: string
}): { errors: BusinessFieldErrors; isValid: boolean } {
  const errors: BusinessFieldErrors = {}

  const trimmedName = values.name.trim()
  if (!trimmedName) {
    errors.name = values.name.length > 0 ? 'Business name cannot be only whitespace.' : 'Business name is required.'
  } else if (trimmedName.length < 2 || trimmedName.length > 100) {
    errors.name = 'Business name must be between 2 and 100 characters.'
  }

  if (!values.cityId) {
    errors.cityId = 'Please select a city.'
  }
  if (!values.categoryId) {
    errors.categoryId = 'Please select a category.'
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
      errors.phone = 'Enter a valid 10-digit Indian phone number (e.g. 9876543210 or +919876543210).'
    }
  }

  if (values.whatsapp.length > 0 && !values.whatsapp.trim()) {
    errors.whatsapp = 'WhatsApp number cannot be only whitespace.'
  } else {
    const cleanWhatsapp = values.whatsapp.trim().replace(/[\s\-()]+/g, '')
    if (cleanWhatsapp && !PHONE_REGEX.test(cleanWhatsapp)) {
      errors.whatsapp = 'Enter a valid 10-digit Indian WhatsApp number (e.g. 9876543210 or +919876543210).'
    }
  }

  if (values.email.length > 0 && !values.email.trim()) {
    errors.email = 'Email cannot be only whitespace.'
  } else {
    const trimmedEmail = values.email.trim()
    if (trimmedEmail && (trimmedEmail.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail))) {
      errors.email = 'Enter a valid email address (e.g. contact@business.com).'
    }
  }

  if (values.pincode.length > 0 && !values.pincode.trim()) {
    errors.pincode = 'Pincode cannot be only whitespace.'
  } else {
    const trimmedPincode = values.pincode.trim()
    if (trimmedPincode && !PINCODE_REGEX.test(trimmedPincode)) {
      errors.pincode = 'Enter a valid 6-digit Indian PIN code (e.g. 635109).'
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

export function CreateBusinessPage() {
  const navigate = useNavigate()
  const { businessId } = useParams()
  const isEditing = Boolean(businessId)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<BusinessFieldErrors>({})
  const [cityId, setCityId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [pincode, setPincode] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [availabilityStatus, setAvailabilityStatus] = useState<
    BusinessCreateInput['availability_status']
  >('available')
  const [cities, setCities] = useState<{ id: string; name: string }[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [photos, setPhotos] = useState<BusinessPhotoWithUrl[]>([])
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [videos, setVideos] = useState<BusinessVideoWithUrl[]>([])
  const [videoError, setVideoError] = useState<string | null>(null)
  const [uploadingVideo, setUploadingVideo] = useState(false)

  const clearFieldError = (field: keyof BusinessFieldErrors) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  useEffect(() => {
    async function loadForm() {
      try {
        const session = await getCurrentSession()

        if (!session) {
          navigate('/auth', { replace: true })
          return
        }

        const [cityRows, categoryRows] = await Promise.all([
          getCities(),
          getCategoriesForBusinessForm(),
        ])

        setCities(cityRows)
        setCategories(categoryRows)

        if (isEditing && businessId) {
          const selectedBusiness = await getBusinessById(businessId)

          setCityId(selectedBusiness.city_id)
          setCategoryId(selectedBusiness.category_id)
          setName(selectedBusiness.name)
          setSlug(selectedBusiness.slug)
          setDescription(selectedBusiness.description ?? '')
          setPhone(selectedBusiness.phone ?? '')
          setWhatsapp(selectedBusiness.whatsapp ?? '')
          setEmail(selectedBusiness.email ?? '')
          setAddress(selectedBusiness.address ?? '')
          setPincode(selectedBusiness.pincode ?? '')
          setLatitude(
            selectedBusiness.latitude !== null && selectedBusiness.latitude !== undefined
              ? String(selectedBusiness.latitude)
              : '',
          )
          setLongitude(
            selectedBusiness.longitude !== null && selectedBusiness.longitude !== undefined
              ? String(selectedBusiness.longitude)
              : '',
          )
          setAvailabilityStatus(selectedBusiness.availability_status)

          try {
            setPhotos(await getOwnerBusinessPhotos(businessId))
          } catch (photoLoadError) {
            setPhotoError(getPhotoErrorMessage(photoLoadError, 'Unable to load business photos.'))
          }

          try {
            setVideos(await getOwnerBusinessVideos(businessId))
          } catch (videoLoadError) {
            setVideoError(getVideoErrorMessage(videoLoadError, 'Unable to load business videos.'))
          }
        } else {
          setCityId(cityRows[0]?.id ?? '')
          setCategoryId(categoryRows[0]?.id ?? '')
        }
      } catch (loadError) {
        const message =
          loadError instanceof Error ? loadError.message : 'Unable to load form data.'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    loadForm()
  }, [businessId, isEditing, navigate])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return

    const { errors: validationErrors, isValid } = validateBusinessFields({
      name,
      slug,
      cityId,
      categoryId,
      phone,
      whatsapp,
      email,
      pincode,
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

    try {
      const coordResult = parseAndValidateCoordinates(latitude, longitude)
      if (coordResult.error) {
        setFieldErrors((prev) => ({ ...prev, coordinates: coordResult.error }))
        setError(coordResult.error)
        return
      }

      const cleanPhone = phone.trim().replace(/[\s\-()]+/g, '') || null
      const cleanWhatsapp = whatsapp.trim().replace(/[\s\-()]+/g, '') || null
      const cleanEmail = email.trim() || null
      const cleanAddress = address.trim() || null
      const cleanPincode = pincode.trim() || null
      const cleanDescription = description.trim() || null
      const cleanSlug = toBusinessSlug(slug.trim() || name.trim())

      if (isEditing && businessId) {
        const updatePayload: BusinessUpdateInput = {
          city_id: cityId,
          category_id: categoryId,
          name: name.trim(),
          slug: cleanSlug,
          description: cleanDescription,
          phone: cleanPhone,
          whatsapp: cleanWhatsapp,
          email: cleanEmail,
          address: cleanAddress,
          pincode: cleanPincode,
          latitude: coordResult.latitude,
          longitude: coordResult.longitude,
          availability_status: availabilityStatus,
        }

        await updateBusiness(businessId, updatePayload)
      } else {
        await createBusiness({
          city_id: cityId,
          category_id: categoryId,
          name: name.trim(),
          slug: cleanSlug,
          description: cleanDescription,
          phone: cleanPhone,
          whatsapp: cleanWhatsapp,
          email: cleanEmail,
          address: cleanAddress,
          pincode: cleanPincode,
          availability_status: availabilityStatus,
          latitude: coordResult.latitude,
          longitude: coordResult.longitude,
        })
      }

      navigate('/owner', { replace: true })
    } catch (submitError) {
      setError(getBusinessErrorMessage(submitError))
    } finally {
      setSaving(false)
    }
  }

  /* ── Loading state ─────────────────────────────────────────────────── */
  if (loading) {
    return (
      <main className="page-section biz-form-page" aria-label="Loading business form">
        <div className="biz-form-header">
          <div className="biz-form-header-copy">
            <p className="eyebrow">Business Listing</p>
            <div className="biz-form-skeleton-title skeleton-shimmer" aria-hidden="true" />
            <div className="biz-form-skeleton-sub skeleton-shimmer" aria-hidden="true" />
          </div>
        </div>
        <div className="biz-form-body">
          {[1, 2, 3].map((i) => (
            <div key={i} className="biz-form-section-card biz-form-skeleton-card" aria-hidden="true">
              <div className="skeleton-shimmer" style={{ width: '40%', height: '18px', marginBottom: '18px' }} />
              <div className="biz-form-skeleton-grid">
                {[1, 2].map((j) => (
                  <div key={j} className="skeleton-shimmer" style={{ height: '52px', borderRadius: '10px' }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    )
  }

  /* ── Main form ─────────────────────────────────────────────────────── */
  return (
    <main className="page-section biz-form-page" aria-labelledby="biz-form-title">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <header className="biz-form-header">
        <div className="biz-form-header-copy">
          <p className="eyebrow">Business Listing</p>
          <h1 id="biz-form-title">
            {isEditing ? 'Edit Your Business' : 'Create Your Business'}
          </h1>
          <p className="page-intro" style={{ marginTop: '12px' }}>
            {isEditing
              ? 'Keep your business information accurate and up to date.'
              : 'Add your business details so customers across Hosur can discover and contact you.'}
          </p>
        </div>
        <Link to="/owner" className="secondary-button biz-form-back-btn" aria-label="Back to owner dashboard">
          ← Back to Dashboard
        </Link>
      </header>

      {/* ── Global error banner ─────────────────────────────────── */}
      {error && (
        <div className="biz-form-error-banner" role="alert" aria-live="assertive">
          <span className="biz-form-error-icon" aria-hidden="true">⚠</span>
          <p>{error}</p>
        </div>
      )}

      <form
        id="business-listing-form"
        className="biz-form-body"
        onSubmit={handleSubmit}
        noValidate
        aria-label={isEditing ? 'Edit business form' : 'Create business form'}
      >
        {/* ── Section A: Business Information ─────────────────── */}
        <section className="biz-form-section-card" aria-labelledby="section-business-info">
          <h2 id="section-business-info" className="biz-form-section-heading">
            <span className="biz-form-section-num" aria-hidden="true">A</span>
            Business Information
          </h2>
          <p className="biz-form-section-desc">
            This is how your business will appear to customers on the marketplace.
          </p>

          <div className="biz-form-grid">
            {/* Business name */}
            <div className="biz-field-group biz-field-full">
              <label htmlFor="biz-name" className="biz-field-label">
                Business Name
                <span className="biz-required" aria-hidden="true">*</span>
              </label>
              <input
                id="biz-name"
                type="text"
                className={`biz-field-input${fieldErrors.name ? ' biz-field-input--error' : ''}`}
                value={name}
                maxLength={100}
                aria-required="true"
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? 'biz-name-error' : 'biz-name-hint'}
                onChange={(event) => {
                  setName(event.target.value)
                  clearFieldError('name')
                }}
                placeholder="e.g. Karthik Auto Services"
              />
              <div className="biz-field-footer">
                {fieldErrors.name ? (
                  <span id="biz-name-error" className="biz-field-error" role="alert">
                    {fieldErrors.name}
                  </span>
                ) : (
                  <span id="biz-name-hint" className="biz-field-hint">
                    2–100 characters
                  </span>
                )}
                <span className="char-hint" aria-live="polite">{name.length}/100</span>
              </div>
            </div>

            {/* Slug */}
            <div className="biz-field-group">
              <label htmlFor="biz-slug" className="biz-field-label">
                URL Slug
              </label>
              <input
                id="biz-slug"
                type="text"
                className={`biz-field-input${fieldErrors.slug ? ' biz-field-input--error' : ''}`}
                value={slug}
                maxLength={100}
                aria-invalid={Boolean(fieldErrors.slug)}
                aria-describedby={fieldErrors.slug ? 'biz-slug-error' : 'biz-slug-hint'}
                onChange={(event) => {
                  setSlug(event.target.value)
                  clearFieldError('slug')
                }}
                placeholder="e.g. karthik-auto-services"
              />
              {fieldErrors.slug ? (
                <span id="biz-slug-error" className="biz-field-error" role="alert">
                  {fieldErrors.slug}
                </span>
              ) : (
                <span id="biz-slug-hint" className="biz-field-hint">
                  Lowercase letters, numbers, and hyphens only. Auto-generated if left blank.
                </span>
              )}
            </div>

            {/* Availability */}
            <div className="biz-field-group">
              <label htmlFor="biz-availability" className="biz-field-label">
                Availability Status
              </label>
              <select
                id="biz-availability"
                className="biz-field-input"
                value={availabilityStatus}
                onChange={(event) =>
                  setAvailabilityStatus(
                    event.target.value as BusinessCreateInput['availability_status'],
                  )
                }
                aria-label="Business availability status"
              >
                <option value="available">Available — Open for enquiries</option>
                <option value="busy">Busy — Currently at capacity</option>
                <option value="offline">Offline — Not taking new work</option>
              </select>
              <span className="biz-field-hint">
                Customers see this status on your listing.
              </span>
            </div>
          </div>
        </section>

        {/* ── Section B: Category & Classification ─────────────── */}
        <section className="biz-form-section-card" aria-labelledby="section-category">
          <h2 id="section-category" className="biz-form-section-heading">
            <span className="biz-form-section-num" aria-hidden="true">B</span>
            Category &amp; Classification
          </h2>
          <p className="biz-form-section-desc">
            Helps customers find your business when browsing the marketplace.
          </p>

          <div className="biz-form-grid">
            {/* City */}
            <div className="biz-field-group">
              <label htmlFor="biz-city" className="biz-field-label">
                City
                <span className="biz-required" aria-hidden="true">*</span>
              </label>
              <select
                id="biz-city"
                className={`biz-field-input${fieldErrors.cityId ? ' biz-field-input--error' : ''}`}
                value={cityId}
                aria-required="true"
                aria-invalid={Boolean(fieldErrors.cityId)}
                aria-describedby={fieldErrors.cityId ? 'biz-city-error' : undefined}
                onChange={(event) => {
                  setCityId(event.target.value)
                  clearFieldError('cityId')
                }}
              >
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
              {fieldErrors.cityId && (
                <span id="biz-city-error" className="biz-field-error" role="alert">
                  {fieldErrors.cityId}
                </span>
              )}
            </div>

            {/* Category */}
            <div className="biz-field-group">
              <label htmlFor="biz-category" className="biz-field-label">
                Category
                <span className="biz-required" aria-hidden="true">*</span>
              </label>
              <select
                id="biz-category"
                className={`biz-field-input${fieldErrors.categoryId ? ' biz-field-input--error' : ''}`}
                value={categoryId}
                aria-required="true"
                aria-invalid={Boolean(fieldErrors.categoryId)}
                aria-describedby={fieldErrors.categoryId ? 'biz-category-error' : 'biz-category-hint'}
                onChange={(event) => {
                  setCategoryId(event.target.value)
                  clearFieldError('categoryId')
                }}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {fieldErrors.categoryId ? (
                <span id="biz-category-error" className="biz-field-error" role="alert">
                  {fieldErrors.categoryId}
                </span>
              ) : (
                <span id="biz-category-hint" className="biz-field-hint">
                  Choose the primary industry your business operates in.
                </span>
              )}
            </div>
          </div>
        </section>

        {/* ── Section C: Contact Information ───────────────────── */}
        <section className="biz-form-section-card" aria-labelledby="section-contact">
          <h2 id="section-contact" className="biz-form-section-heading">
            <span className="biz-form-section-num" aria-hidden="true">C</span>
            Contact Information
          </h2>
          <p className="biz-form-section-desc">
            Customers use these details to call, message, or email your business directly.
          </p>

          <div className="biz-form-grid">
            {/* Phone */}
            <div className="biz-field-group">
              <label htmlFor="biz-phone" className="biz-field-label">
                Phone Number
              </label>
              <input
                id="biz-phone"
                type="tel"
                className={`biz-field-input${fieldErrors.phone ? ' biz-field-input--error' : ''}`}
                value={phone}
                maxLength={15}
                aria-invalid={Boolean(fieldErrors.phone)}
                aria-describedby={fieldErrors.phone ? 'biz-phone-error' : 'biz-phone-hint'}
                onChange={(event) => {
                  setPhone(event.target.value)
                  clearFieldError('phone')
                }}
                placeholder="e.g. 9876543210"
                inputMode="tel"
                autoComplete="tel"
              />
              {fieldErrors.phone ? (
                <span id="biz-phone-error" className="biz-field-error" role="alert">
                  {fieldErrors.phone}
                </span>
              ) : (
                <span id="biz-phone-hint" className="biz-field-hint">
                  Indian mobile: 9876543210 or +919876543210
                </span>
              )}
            </div>

            {/* WhatsApp */}
            <div className="biz-field-group">
              <label htmlFor="biz-whatsapp" className="biz-field-label">
                WhatsApp Number
              </label>
              <input
                id="biz-whatsapp"
                type="tel"
                className={`biz-field-input${fieldErrors.whatsapp ? ' biz-field-input--error' : ''}`}
                value={whatsapp}
                maxLength={15}
                aria-invalid={Boolean(fieldErrors.whatsapp)}
                aria-describedby={fieldErrors.whatsapp ? 'biz-whatsapp-error' : 'biz-whatsapp-hint'}
                onChange={(event) => {
                  setWhatsapp(event.target.value)
                  clearFieldError('whatsapp')
                }}
                placeholder="e.g. 9876543210"
                inputMode="tel"
              />
              {fieldErrors.whatsapp ? (
                <span id="biz-whatsapp-error" className="biz-field-error" role="alert">
                  {fieldErrors.whatsapp}
                </span>
              ) : (
                <span id="biz-whatsapp-hint" className="biz-field-hint">
                  Enables the WhatsApp contact button on your listing.
                </span>
              )}
            </div>

            {/* Email */}
            <div className="biz-field-group biz-field-full">
              <label htmlFor="biz-email" className="biz-field-label">
                Email Address
              </label>
              <input
                id="biz-email"
                type="email"
                className={`biz-field-input${fieldErrors.email ? ' biz-field-input--error' : ''}`}
                value={email}
                maxLength={255}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'biz-email-error' : 'biz-email-hint'}
                onChange={(event) => {
                  setEmail(event.target.value)
                  clearFieldError('email')
                }}
                placeholder="contact@business.com"
                autoComplete="email"
                inputMode="email"
              />
              {fieldErrors.email ? (
                <span id="biz-email-error" className="biz-field-error" role="alert">
                  {fieldErrors.email}
                </span>
              ) : (
                <span id="biz-email-hint" className="biz-field-hint">
                  Optional — only visible to customers who contact you.
                </span>
              )}
            </div>
          </div>
        </section>

        {/* ── Section D: Business Location ─────────────────────── */}
        <section className="biz-form-section-card" aria-labelledby="section-location">
          <h2 id="section-location" className="biz-form-section-heading">
            <span className="biz-form-section-num" aria-hidden="true">D</span>
            Business Location
          </h2>
          <p className="biz-form-section-desc">
            A complete address helps customers visit you and improves your map visibility.
          </p>

          <div className="biz-form-grid">
            {/* Address */}
            <div className="biz-field-group biz-field-full">
              <label htmlFor="biz-address" className="biz-field-label">
                Address
              </label>
              <textarea
                id="biz-address"
                className={`biz-field-input biz-field-textarea${fieldErrors.address ? ' biz-field-input--error' : ''}`}
                value={address}
                maxLength={250}
                aria-invalid={Boolean(fieldErrors.address)}
                aria-describedby={fieldErrors.address ? 'biz-address-error' : 'biz-address-hint'}
                onChange={(event) => {
                  setAddress(event.target.value)
                  clearFieldError('address')
                }}
                placeholder="Door No, Street Name, Landmark"
                rows={3}
              />
              <div className="biz-field-footer">
                {fieldErrors.address ? (
                  <span id="biz-address-error" className="biz-field-error" role="alert">
                    {fieldErrors.address}
                  </span>
                ) : (
                  <span id="biz-address-hint" className="biz-field-hint">
                    Door No, Street, Landmark, Area
                  </span>
                )}
                <span className="char-hint" aria-live="polite">{address.length}/250</span>
              </div>
            </div>

            {/* Pincode */}
            <div className="biz-field-group">
              <label htmlFor="biz-pincode" className="biz-field-label">
                PIN Code
              </label>
              <input
                id="biz-pincode"
                type="text"
                className={`biz-field-input${fieldErrors.pincode ? ' biz-field-input--error' : ''}`}
                value={pincode}
                maxLength={6}
                aria-invalid={Boolean(fieldErrors.pincode)}
                aria-describedby={fieldErrors.pincode ? 'biz-pincode-error' : 'biz-pincode-hint'}
                onChange={(event) => {
                  setPincode(event.target.value)
                  clearFieldError('pincode')
                }}
                placeholder="e.g. 635109"
                inputMode="numeric"
              />
              {fieldErrors.pincode ? (
                <span id="biz-pincode-error" className="biz-field-error" role="alert">
                  {fieldErrors.pincode}
                </span>
              ) : (
                <span id="biz-pincode-hint" className="biz-field-hint">
                  6-digit Indian postal code
                </span>
              )}
            </div>

            {/* GPS Coordinates */}
            <div className="biz-field-group biz-field-full">
              <div className="biz-coord-banner" role="note" aria-label="GPS coordinates tip">
                <span className="biz-coord-icon" aria-hidden="true">📍</span>
                <span className="biz-coord-tip">
                  Adding GPS coordinates helps customers find your business on the interactive map.
                  Leave both fields empty to skip.
                </span>
              </div>

              {fieldErrors.coordinates && (
                <span id="biz-coord-error" className="biz-field-error" role="alert" style={{ marginBottom: '10px', display: 'block' }}>
                  {fieldErrors.coordinates}
                </span>
              )}

              <div className="biz-coord-grid">
                <div className="biz-field-group" style={{ margin: 0 }}>
                  <label htmlFor="biz-latitude" className="biz-field-label">
                    Latitude
                  </label>
                  <input
                    id="biz-latitude"
                    type="number"
                    step="any"
                    className={`biz-field-input${fieldErrors.coordinates ? ' biz-field-input--error' : ''}`}
                    placeholder="e.g. 12.7409"
                    value={latitude}
                    aria-invalid={Boolean(fieldErrors.coordinates)}
                    aria-describedby={fieldErrors.coordinates ? 'biz-coord-error' : 'biz-lat-hint'}
                    onChange={(event) => {
                      setLatitude(event.target.value)
                      clearFieldError('coordinates')
                    }}
                    inputMode="decimal"
                  />
                  <span id="biz-lat-hint" className="biz-field-hint">
                    Hosur: ~12.7409 &nbsp;·&nbsp; Range: −90 to 90
                  </span>
                </div>

                <div className="biz-field-group" style={{ margin: 0 }}>
                  <label htmlFor="biz-longitude" className="biz-field-label">
                    Longitude
                  </label>
                  <input
                    id="biz-longitude"
                    type="number"
                    step="any"
                    className={`biz-field-input${fieldErrors.coordinates ? ' biz-field-input--error' : ''}`}
                    placeholder="e.g. 77.8253"
                    value={longitude}
                    aria-invalid={Boolean(fieldErrors.coordinates)}
                    aria-describedby={fieldErrors.coordinates ? 'biz-coord-error' : 'biz-lng-hint'}
                    onChange={(event) => {
                      setLongitude(event.target.value)
                      clearFieldError('coordinates')
                    }}
                    inputMode="decimal"
                  />
                  <span id="biz-lng-hint" className="biz-field-hint">
                    Hosur: ~77.8253 &nbsp;·&nbsp; Range: −180 to 180
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section E: Business Description ──────────────────── */}
        <section className="biz-form-section-card" aria-labelledby="section-description">
          <h2 id="section-description" className="biz-form-section-heading">
            <span className="biz-form-section-num" aria-hidden="true">E</span>
            Business Description
          </h2>
          <p className="biz-form-section-desc">
            Tell customers what makes your business unique — services offered, experience, and specialisations.
          </p>

          <div className="biz-field-group">
            <label htmlFor="biz-description" className="biz-field-label">
              Description
            </label>
            <textarea
              id="biz-description"
              className={`biz-field-input biz-field-textarea biz-field-textarea--tall${fieldErrors.description ? ' biz-field-input--error' : ''}`}
              value={description}
              maxLength={1000}
              aria-invalid={Boolean(fieldErrors.description)}
              aria-describedby={fieldErrors.description ? 'biz-desc-error' : 'biz-desc-hint'}
              onChange={(event) => {
                setDescription(event.target.value)
                clearFieldError('description')
              }}
              placeholder="Tell customers about your services, experience, equipment, and what makes your business stand out in Hosur."
              rows={6}
            />
            <div className="biz-field-footer">
              {fieldErrors.description ? (
                <span id="biz-desc-error" className="biz-field-error" role="alert">
                  {fieldErrors.description}
                </span>
              ) : (
                <span id="biz-desc-hint" className="biz-field-hint">
                  Up to 1000 characters. Be specific about your specialisations.
                </span>
              )}
              <span className="char-hint" aria-live="polite">{description.length}/1000</span>
            </div>
          </div>
        </section>

        {/* ── Section F: Save / Cancel ──────────────────────────── */}
        <div className="biz-form-actions" role="group" aria-label="Form submission actions">
          <Link to="/owner" className="secondary-button biz-action-cancel">
            Cancel
          </Link>
          <button
            type="submit"
            className="primary-button biz-action-save"
            disabled={saving}
            aria-label={saving ? 'Saving business…' : isEditing ? 'Save changes to your business' : 'Create your business listing'}
          >
            {saving ? (
              <>
                <span className="biz-saving-dot" aria-hidden="true" />
                Saving…
              </>
            ) : isEditing ? (
              'Save Changes'
            ) : (
              'Create Business'
            )}
          </button>
        </div>
      </form>

      {/* ── Media managers (edit mode only) ─────────────────────── */}
      {isEditing && businessId && (
        <>
          <OwnerPhotoManager
            businessId={businessId}
            photos={photos}
            uploading={uploadingPhoto}
            error={photoError}
            onError={setPhotoError}
            onPhotosChange={setPhotos}
            onUploadingChange={setUploadingPhoto}
          />
          <OwnerVideoManager
            businessId={businessId}
            videos={videos}
            uploading={uploadingVideo}
            error={videoError}
            onError={setVideoError}
            onVideosChange={setVideos}
            onUploadingChange={setUploadingVideo}
          />
        </>
      )}
    </main>
  )
}
