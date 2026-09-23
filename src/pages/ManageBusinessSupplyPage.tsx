import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getBusinessById, type BusinessRecord } from '../services/businesses'
import { getSubcategories, type SubcategorySummary } from '../services/categories'
import {
  createBusinessProduct,
  createBusinessService,
  deleteBusinessProduct,
  deleteBusinessService,
  getBusinessProducts,
  getBusinessServices,
  updateBusinessProduct,
  updateBusinessService,
  type BusinessProduct,
  type BusinessService,
} from '../services/supply'

type ServiceForm = {
  name: string
  subcategoryId: string
  description: string
  priceFrom: string
  priceTo: string
  priceUnit: string
}

type ProductForm = {
  name: string
  subcategoryId: string
  description: string
  price: string
  unit: string
  availability: BusinessProduct['availability']
}

const emptyServiceForm: ServiceForm = {
  name: '',
  subcategoryId: '',
  description: '',
  priceFrom: '',
  priceTo: '',
  priceUnit: '',
}

const emptyProductForm: ProductForm = {
  name: '',
  subcategoryId: '',
  description: '',
  price: '',
  unit: '',
  availability: 'available',
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string' &&
    error.message.trim().length > 0
  ) {
    return error.message
  }
  return fallback
}

function toNullableNumber(value: string): number | null {
  return value.trim() ? Number(value) : null
}

type ServiceFieldErrors = Partial<Record<keyof ServiceForm, string>>

type ProductFieldErrors = Partial<Record<keyof ProductForm, string>>

function ServiceFormPanel({
  form,
  subcategories,
  saving,
  editing,
  errors = {},
  formRef,
  onChange,
  onSubmit,
  onCancel,
}: {
  form: ServiceForm
  subcategories: SubcategorySummary[]
  saving: boolean
  editing: boolean
  errors?: ServiceFieldErrors
  formRef?: React.RefObject<HTMLFormElement | null>
  onChange: (field: keyof ServiceForm, value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onCancel: () => void
}) {
  return (
    <form
      className="supply-form supply-form-card biz-form-section-card"
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      aria-labelledby="service-form-title"
    >
      <div className="supply-form-header">
        <div className="supply-form-header-copy">
          <div className="supply-form-title-row">
            <span className="supply-form-badge" aria-hidden="true">
              {editing ? '✏️' : '✨'}
            </span>
            <h3 id="service-form-title" className="supply-form-title">
              {editing ? 'Edit Service' : 'Add Service'}
            </h3>
            {editing && (
              <span className="supply-editing-pill" role="status">
                <span className="supply-editing-dot" aria-hidden="true" />
                Editing Mode
              </span>
            )}
          </div>
          <p className="supply-form-desc">
            {editing
              ? 'Update service details, pricing ranges, and description below.'
              : 'Add a new service offered by your business with optional pricing estimates.'}
          </p>
        </div>
      </div>

      {editing && (
        <div className="supply-editing-banner" role="status" aria-live="polite">
          <div className="supply-editing-banner-content">
            <span className="supply-editing-pulse" aria-hidden="true" />
            <span>
              Currently editing: <strong>{form.name.trim() || 'Untitled Service'}</strong>
            </span>
          </div>
          <button
            type="button"
            className="supply-editing-cancel-btn"
            onClick={onCancel}
            aria-label="Cancel editing this service and reset form"
          >
            Cancel Edit
          </button>
        </div>
      )}

      <div className="biz-form-grid supply-form-grid">
        <div className="biz-field-group">
          <label htmlFor="service-name" className="biz-field-label">
            Service name <span className="biz-required" aria-hidden="true">*</span>
          </label>
          <input
            id="service-name"
            className={`biz-field-input ${errors.name ? 'biz-field-input--error' : ''}`}
            value={form.name}
            maxLength={100}
            placeholder="e.g. 24/7 Electrical Repairs, AC Installation"
            aria-required="true"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'service-name-error' : 'service-name-hint'}
            onChange={(event) => onChange('name', event.target.value)}
            required
          />
          <div className="biz-field-footer">
            {errors.name ? (
              <span id="service-name-error" className="biz-field-error" role="alert">
                {errors.name}
              </span>
            ) : (
              <span id="service-name-hint" className="biz-field-hint">
                Clear title describing what you do
              </span>
            )}
            <span className="char-hint" aria-live="polite">{form.name.length}/100</span>
          </div>
        </div>

        <div className="biz-field-group">
          <label htmlFor="service-subcategory" className="biz-field-label">
            Subcategory
          </label>
          <select
            id="service-subcategory"
            className="biz-field-input"
            value={form.subcategoryId}
            aria-describedby="service-subcategory-hint"
            onChange={(event) => onChange('subcategoryId', event.target.value)}
          >
            <option value="">Select subcategory (optional)</option>
            {subcategories.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>
          <div className="biz-field-footer">
            <span id="service-subcategory-hint" className="biz-field-hint">
              Helps Hosur customers filter your service
            </span>
          </div>
        </div>

        <div className="biz-field-group">
          <label htmlFor="service-price-from" className="biz-field-label">
            Price from (₹)
          </label>
          <div className="supply-currency-input-wrap">
            <span className="supply-currency-symbol" aria-hidden="true">₹</span>
            <input
              id="service-price-from"
              type="number"
              min="0"
              step="0.01"
              className={`biz-field-input supply-currency-input ${errors.priceFrom ? 'biz-field-input--error' : ''}`}
              value={form.priceFrom}
              placeholder="0.00"
              aria-invalid={Boolean(errors.priceFrom)}
              aria-describedby={errors.priceFrom ? 'service-pricefrom-error' : 'service-pricefrom-hint'}
              onChange={(event) => onChange('priceFrom', event.target.value)}
            />
          </div>
          <div className="biz-field-footer">
            {errors.priceFrom ? (
              <span id="service-pricefrom-error" className="biz-field-error" role="alert">
                {errors.priceFrom}
              </span>
            ) : (
              <span id="service-pricefrom-hint" className="biz-field-hint">
                Starting rate in INR
              </span>
            )}
          </div>
        </div>

        <div className="biz-field-group">
          <label htmlFor="service-price-to" className="biz-field-label">
            Price to (₹)
          </label>
          <div className="supply-currency-input-wrap">
            <span className="supply-currency-symbol" aria-hidden="true">₹</span>
            <input
              id="service-price-to"
              type="number"
              min="0"
              step="0.01"
              className={`biz-field-input supply-currency-input ${errors.priceTo ? 'biz-field-input--error' : ''}`}
              value={form.priceTo}
              placeholder="0.00"
              aria-invalid={Boolean(errors.priceTo)}
              aria-describedby={errors.priceTo ? 'service-priceto-error' : 'service-priceto-hint'}
              onChange={(event) => onChange('priceTo', event.target.value)}
            />
          </div>
          <div className="biz-field-footer">
            {errors.priceTo ? (
              <span id="service-priceto-error" className="biz-field-error" role="alert">
                {errors.priceTo}
              </span>
            ) : (
              <span id="service-priceto-hint" className="biz-field-hint">
                Upper rate in INR (optional)
              </span>
            )}
          </div>
        </div>

        <div className="biz-field-group biz-field-full">
          <label htmlFor="service-price-unit" className="biz-field-label">
            Price unit
          </label>
          <input
            id="service-price-unit"
            className={`biz-field-input ${errors.priceUnit ? 'biz-field-input--error' : ''}`}
            value={form.priceUnit}
            maxLength={30}
            placeholder="e.g. per visit, per hour, per sq ft, per consultation"
            aria-invalid={Boolean(errors.priceUnit)}
            aria-describedby={errors.priceUnit ? 'service-priceunit-error' : 'service-priceunit-hint'}
            onChange={(event) => onChange('priceUnit', event.target.value)}
          />
          <div className="biz-field-footer">
            {errors.priceUnit ? (
              <span id="service-priceunit-error" className="biz-field-error" role="alert">
                {errors.priceUnit}
              </span>
            ) : (
              <span id="service-priceunit-hint" className="biz-field-hint">
                How pricing is structured or charged
              </span>
            )}
            <span className="char-hint" aria-live="polite">{form.priceUnit.length}/30</span>
          </div>
        </div>

        <div className="biz-field-group biz-field-full">
          <label htmlFor="service-description" className="biz-field-label">
            Description
          </label>
          <textarea
            id="service-description"
            rows={3}
            maxLength={500}
            className={`biz-field-input biz-field-textarea ${errors.description ? 'biz-field-input--error' : ''}`}
            value={form.description}
            placeholder="Describe service details, scope of work, warranty, deliverables, or turnaround time..."
            aria-invalid={Boolean(errors.description)}
            aria-describedby={errors.description ? 'service-desc-error' : 'service-desc-hint'}
            onChange={(event) => onChange('description', event.target.value)}
          />
          <div className="biz-field-footer">
            {errors.description ? (
              <span id="service-desc-error" className="biz-field-error" role="alert">
                {errors.description}
              </span>
            ) : (
              <span id="service-desc-hint" className="biz-field-hint">
                Comprehensive explanation of the service for potential clients
              </span>
            )}
            <span className="char-hint" aria-live="polite">{form.description.length}/500</span>
          </div>
        </div>
      </div>

      <div className="form-actions supply-form-actions biz-form-actions">
        {editing && (
          <button
            type="button"
            className="secondary-button biz-action-cancel supply-btn-cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="primary-button biz-action-save supply-btn-submit"
          disabled={saving}
        >
          {saving ? (
            <>
              <span className="biz-saving-dot" aria-hidden="true" />
              <span>Saving…</span>
            </>
          ) : editing ? (
            'Update service'
          ) : (
            'Add service'
          )}
        </button>
      </div>
    </form>
  )
}

function ProductFormPanel({
  form,
  subcategories,
  saving,
  editing,
  errors = {},
  formRef,
  onChange,
  onSubmit,
  onCancel,
}: {
  form: ProductForm
  subcategories: SubcategorySummary[]
  saving: boolean
  editing: boolean
  errors?: ProductFieldErrors
  formRef?: React.RefObject<HTMLFormElement | null>
  onChange: (field: keyof ProductForm, value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onCancel: () => void
}) {
  return (
    <form
      className="supply-form supply-form-card biz-form-section-card"
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      aria-labelledby="product-form-title"
    >
      <div className="supply-form-header">
        <div className="supply-form-header-copy">
          <div className="supply-form-title-row">
            <span className="supply-form-badge" aria-hidden="true">
              {editing ? '✏️' : '📦'}
            </span>
            <h3 id="product-form-title" className="supply-form-title">
              {editing ? 'Edit Product' : 'Add Product'}
            </h3>
            {editing && (
              <span className="supply-editing-pill" role="status">
                <span className="supply-editing-dot" aria-hidden="true" />
                Editing Mode
              </span>
            )}
          </div>
          <p className="supply-form-desc">
            {editing
              ? 'Update product details, pricing, inventory availability, and description below.'
              : 'Add physical items, merchandise, or goods sold by your business with clear pricing and stock status.'}
          </p>
        </div>
      </div>

      {editing && (
        <div className="supply-editing-banner" role="status" aria-live="polite">
          <div className="supply-editing-banner-content">
            <span className="supply-editing-pulse" aria-hidden="true" />
            <span>
              Currently editing: <strong>{form.name.trim() || 'Untitled Product'}</strong>
            </span>
          </div>
          <button
            type="button"
            className="supply-editing-cancel-btn"
            onClick={onCancel}
            aria-label="Cancel editing this product and reset form"
          >
            Cancel Edit
          </button>
        </div>
      )}

      <div className="biz-form-grid supply-form-grid">
        <div className="biz-field-group">
          <label htmlFor="product-name" className="biz-field-label">
            Product name <span className="biz-required" aria-hidden="true">*</span>
          </label>
          <input
            id="product-name"
            className={`biz-field-input ${errors.name ? 'biz-field-input--error' : ''}`}
            value={form.name}
            maxLength={100}
            placeholder="e.g. Organic Raw Honey 500g, Industrial Safety Helmet"
            aria-required="true"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'product-name-error' : 'product-name-hint'}
            onChange={(event) => onChange('name', event.target.value)}
            required
          />
          <div className="biz-field-footer">
            {errors.name ? (
              <span id="product-name-error" className="biz-field-error" role="alert">
                {errors.name}
              </span>
            ) : (
              <span id="product-name-hint" className="biz-field-hint">
                Specific title of the product item
              </span>
            )}
            <span className="char-hint" aria-live="polite">{form.name.length}/100</span>
          </div>
        </div>

        <div className="biz-field-group">
          <label htmlFor="product-subcategory" className="biz-field-label">
            Subcategory
          </label>
          <select
            id="product-subcategory"
            className="biz-field-input"
            value={form.subcategoryId}
            aria-describedby="product-subcategory-hint"
            onChange={(event) => onChange('subcategoryId', event.target.value)}
          >
            <option value="">Select subcategory (optional)</option>
            {subcategories.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>
          <div className="biz-field-footer">
            <span id="product-subcategory-hint" className="biz-field-hint">
              Organizes your product within your category
            </span>
          </div>
        </div>

        <div className="biz-field-group">
          <label htmlFor="product-price" className="biz-field-label">
            Price (₹) <span className="biz-required" aria-hidden="true">*</span>
          </label>
          <div className="supply-currency-input-wrap">
            <span className="supply-currency-symbol" aria-hidden="true">₹</span>
            <input
              id="product-price"
              type="number"
              min="0.01"
              step="0.01"
              className={`biz-field-input supply-currency-input ${errors.price ? 'biz-field-input--error' : ''}`}
              value={form.price}
              placeholder="0.00"
              aria-required="true"
              aria-invalid={Boolean(errors.price)}
              aria-describedby={errors.price ? 'product-price-error' : 'product-price-hint'}
              onChange={(event) => onChange('price', event.target.value)}
              required
            />
          </div>
          <div className="biz-field-footer">
            {errors.price ? (
              <span id="product-price-error" className="biz-field-error" role="alert">
                {errors.price}
              </span>
            ) : (
              <span id="product-price-hint" className="biz-field-hint">
                Selling price in INR (greater than 0)
              </span>
            )}
          </div>
        </div>

        <div className="biz-field-group">
          <label htmlFor="product-unit" className="biz-field-label">
            Unit
          </label>
          <input
            id="product-unit"
            className={`biz-field-input ${errors.unit ? 'biz-field-input--error' : ''}`}
            value={form.unit}
            maxLength={30}
            placeholder="e.g. per piece, per kg, per box, per pack"
            aria-invalid={Boolean(errors.unit)}
            aria-describedby={errors.unit ? 'product-unit-error' : 'product-unit-hint'}
            onChange={(event) => onChange('unit', event.target.value)}
          />
          <div className="biz-field-footer">
            {errors.unit ? (
              <span id="product-unit-error" className="biz-field-error" role="alert">
                {errors.unit}
              </span>
            ) : (
              <span id="product-unit-hint" className="biz-field-hint">
                Quantity packaging or measurement
              </span>
            )}
            <span className="char-hint" aria-live="polite">{form.unit.length}/30</span>
          </div>
        </div>

        <div className="biz-field-group">
          <label htmlFor="product-availability" className="biz-field-label">
            Availability status
          </label>
          <select
            id="product-availability"
            className="biz-field-input supply-availability-select"
            value={form.availability}
            aria-describedby="product-availability-hint"
            onChange={(event) => onChange('availability', event.target.value as ProductForm['availability'])}
          >
            <option value="available">Available</option>
            <option value="limited">Limited</option>
            <option value="unavailable">Unavailable</option>
          </select>
          <div className="biz-field-footer">
            <span id="product-availability-hint" className="biz-field-hint">
              Current stock availability visible to buyers
            </span>
          </div>
        </div>

        <div className="biz-field-group biz-field-full">
          <label htmlFor="product-description" className="biz-field-label">
            Description
          </label>
          <textarea
            id="product-description"
            rows={3}
            maxLength={500}
            className={`biz-field-input biz-field-textarea ${errors.description ? 'biz-field-input--error' : ''}`}
            value={form.description}
            placeholder="Describe product specifications, materials, warranty, dimensions, or pack contents..."
            aria-invalid={Boolean(errors.description)}
            aria-describedby={errors.description ? 'product-desc-error' : 'product-desc-hint'}
            onChange={(event) => onChange('description', event.target.value)}
          />
          <div className="biz-field-footer">
            {errors.description ? (
              <span id="product-desc-error" className="biz-field-error" role="alert">
                {errors.description}
              </span>
            ) : (
              <span id="product-desc-hint" className="biz-field-hint">
                Accurate specifications and details for buyers
              </span>
            )}
            <span className="char-hint" aria-live="polite">{form.description.length}/500</span>
          </div>
        </div>
      </div>

      <div className="form-actions supply-form-actions biz-form-actions">
        {editing && (
          <button
            type="button"
            className="secondary-button biz-action-cancel supply-btn-cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="primary-button biz-action-save supply-btn-submit"
          disabled={saving}
        >
          {saving ? (
            <>
              <span className="biz-saving-dot" aria-hidden="true" />
              <span>Saving…</span>
            </>
          ) : editing ? (
            'Update product'
          ) : (
            'Add product'
          )}
        </button>
      </div>
    </form>
  )
}

export function ManageBusinessSupplyPage() {
  const { businessId } = useParams()
  const [business, setBusiness] = useState<BusinessRecord | null>(null)
  const [services, setServices] = useState<BusinessService[]>([])
  const [products, setProducts] = useState<BusinessProduct[]>([])
  const [subcategories, setSubcategories] = useState<SubcategorySummary[]>([])
  const [loading, setLoading] = useState(Boolean(businessId))
  const [error, setError] = useState<string | null>(businessId ? null : 'Business not found.')
  const [serviceForm, setServiceForm] = useState(emptyServiceForm)
  const [productForm, setProductForm] = useState(emptyProductForm)
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [saving, setSaving] = useState<'service' | 'product' | null>(null)
  const [serviceErrors, setServiceErrors] = useState<ServiceFieldErrors>({})
  const [productErrors, setProductErrors] = useState<ProductFieldErrors>({})
  const serviceFormRef = useRef<HTMLFormElement>(null)
  const productFormRef = useRef<HTMLFormElement>(null)

  async function refreshSupply(selectedBusinessId: string) {
    const [selectedBusiness, serviceRows, productRows] = await Promise.all([
      getBusinessById(selectedBusinessId),
      getBusinessServices(selectedBusinessId),
      getBusinessProducts(selectedBusinessId),
    ])
    setBusiness(selectedBusiness)
    setServices(serviceRows)
    setProducts(productRows)

    if (selectedBusiness.category_id) {
      try {
        const subcatRows = await getSubcategories(selectedBusiness.category_id)
        setSubcategories(subcatRows)
      } catch (err) {
        console.error('Failed to load subcategories for business category:', err)
      }
    }
  }

  useEffect(() => {
    if (!businessId) {
      return
    }

    const selectedBusinessId = businessId

    async function loadSupply() {
      try {
        await refreshSupply(selectedBusinessId)
      } catch (loadError) {
        setError(getErrorMessage(loadError, 'Unable to load business offerings.'))
      } finally {
        setLoading(false)
      }
    }

    loadSupply()
  }, [businessId])

  function updateServiceForm(field: keyof ServiceForm, value: string) {
    setServiceForm((current) => ({ ...current, [field]: value }))
    setServiceErrors((current) => (current[field] ? { ...current, [field]: undefined } : current))
  }

  function updateProductForm(field: keyof ProductForm, value: string) {
    setProductForm((current) => ({ ...current, [field]: value }))
    setProductErrors((current) => (current[field] ? { ...current, [field]: undefined } : current))
  }

  function startServiceEdit(service: BusinessService) {
    setEditingServiceId(service.id)
    setServiceErrors({})
    setServiceForm({
      name: service.name,
      subcategoryId: service.subcategory_id ?? '',
      description: service.description ?? '',
      priceFrom: service.price_from?.toString() ?? '',
      priceTo: service.price_to?.toString() ?? '',
      priceUnit: service.price_unit ?? '',
    })
    // Scroll the service form into view — it lives above the service list
    // and without this the user sees no visible change after clicking Edit.
    window.setTimeout(() => {
      serviceFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
  }

  function startProductEdit(product: BusinessProduct) {
    setEditingProductId(product.id)
    setProductErrors({})
    setProductForm({
      name: product.name,
      subcategoryId: product.subcategory_id ?? '',
      description: product.description ?? '',
      price: product.price.toString(),
      unit: product.unit ?? '',
      availability: product.availability,
    })
    // Scroll the product form into view — it lives above the product list
    // and without this the user sees no visible change after clicking Edit.
    window.setTimeout(() => {
      productFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
  }

  async function handleServiceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving !== null || !business) return

    const errors: ServiceFieldErrors = {}
    const trimmedName = serviceForm.name.trim()
    const trimmedDesc = serviceForm.description.trim()
    const trimmedUnit = serviceForm.priceUnit.trim()

    if (!trimmedName) {
      errors.name = 'Service name is required.'
    } else if (trimmedName.length > 100) {
      errors.name = 'Service name must be at most 100 characters.'
    }

    if (serviceForm.description.length > 0 && !trimmedDesc) {
      errors.description = 'Description cannot be whitespace only.'
    } else if (trimmedDesc.length > 500) {
      errors.description = 'Description must be at most 500 characters.'
    }

    if (trimmedUnit.length > 30) {
      errors.priceUnit = 'Price unit must be at most 30 characters.'
    }

    let parsedFrom: number | null = null
    let parsedTo: number | null = null

    if (serviceForm.priceFrom.trim()) {
      const numFrom = Number(serviceForm.priceFrom)
      if (Number.isNaN(numFrom) || numFrom < 0) {
        errors.priceFrom = 'Starting price must be 0 or more.'
      } else {
        parsedFrom = numFrom
      }
    }

    if (serviceForm.priceTo.trim()) {
      const numTo = Number(serviceForm.priceTo)
      if (Number.isNaN(numTo) || numTo < 0) {
        errors.priceTo = 'Ending price must be 0 or more.'
      } else {
        parsedTo = numTo
      }
    }

    if (parsedFrom !== null && parsedTo !== null && parsedTo < parsedFrom) {
      errors.priceTo = 'Ending price cannot be less than starting price.'
    }

    if (Object.keys(errors).length > 0) {
      setServiceErrors(errors)
      return
    }

    try {
      setSaving('service')
      setError(null)
      const input = {
        category_id: business.category_id,
        subcategory_id: serviceForm.subcategoryId.trim() || null,
        name: trimmedName,
        description: trimmedDesc || null,
        price_from: toNullableNumber(serviceForm.priceFrom),
        price_to: toNullableNumber(serviceForm.priceTo),
        price_unit: trimmedUnit || null,
      }

      if (editingServiceId) {
        await updateBusinessService(editingServiceId, input)
      } else {
        await createBusinessService({ business_id: business.id, ...input })
      }

      setServiceForm(emptyServiceForm)
      setEditingServiceId(null)
      setServiceErrors({})
      await refreshSupply(business.id)
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to save this service.'))
    } finally {
      setSaving(null)
    }
  }

  async function handleProductSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving !== null || !business) return

    const errors: ProductFieldErrors = {}
    const trimmedName = productForm.name.trim()
    const trimmedDesc = productForm.description.trim()
    const trimmedUnit = productForm.unit.trim()
    const trimmedPrice = productForm.price.trim()

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

    if (productForm.description.length > 0 && !trimmedDesc) {
      errors.description = 'Description cannot be whitespace only.'
    } else if (trimmedDesc.length > 500) {
      errors.description = 'Description must be at most 500 characters.'
    }

    if (trimmedUnit.length > 30) {
      errors.unit = 'Unit must be at most 30 characters.'
    }

    if (Object.keys(errors).length > 0) {
      setProductErrors(errors)
      return
    }

    try {
      setSaving('product')
      setError(null)
      const input = {
        category_id: business.category_id,
        subcategory_id: productForm.subcategoryId.trim() || null,
        name: trimmedName,
        description: trimmedDesc || null,
        price: Number(trimmedPrice),
        unit: trimmedUnit || null,
        availability: productForm.availability,
      }

      if (editingProductId) {
        await updateBusinessProduct(editingProductId, input)
      } else {
        await createBusinessProduct({ business_id: business.id, ...input })
      }

      setProductForm(emptyProductForm)
      setEditingProductId(null)
      setProductErrors({})
      await refreshSupply(business.id)
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to save this product.'))
    } finally {
      setSaving(null)
    }
  }

  async function handleDeleteService(serviceId: string) {
    if (!business || !window.confirm('Delete this service?')) return

    try {
      setError(null)
      await deleteBusinessService(serviceId)
      await refreshSupply(business.id)
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Unable to delete this service.'))
    }
  }

  async function handleDeleteProduct(productId: string) {
    if (!business || !window.confirm('Delete this product?')) return

    try {
      setError(null)
      await deleteBusinessProduct(productId)
      await refreshSupply(business.id)
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Unable to delete this product.'))
    }
  }

  if (loading) return <div className="page-section state-panel"><p>Loading offerings…</p></div>

  if (error && !business) {
    return <section className="page-section"><div className="state-panel error-state"><h3>Unable to load offerings</h3><p>{error}</p></div></section>
  }

  if (!business) return null

  return (
    <section className="page-section owner-dashboard supply-page-container" aria-labelledby="supply-page-title">
      {/* ── Breadcrumb Navigation ── */}
      <nav className="supply-breadcrumb-nav" aria-label="Breadcrumb">
        <ol className="supply-breadcrumb-list">
          <li className="supply-breadcrumb-item">
            <Link to="/owner" className="supply-breadcrumb-link">Dashboard</Link>
          </li>
          <li className="supply-breadcrumb-sep" aria-hidden="true">/</li>
          <li className="supply-breadcrumb-item">
            <Link to={`/owner/businesses/${business.id}`} className="supply-breadcrumb-link">
              {business.name}
            </Link>
          </li>
          <li className="supply-breadcrumb-sep" aria-hidden="true">/</li>
          <li className="supply-breadcrumb-item supply-breadcrumb-item--current" aria-current="page">
            Products &amp; Services
          </li>
        </ol>
      </nav>

      {/* ── Premium Offerings Page Header ── */}
      <header className="supply-page-header">
        <div className="supply-header-content">
          <div className="supply-eyebrow-row">
            <span className="supply-badge-pill">
              <span className="supply-badge-dot" aria-hidden="true" />
              BUSINESS OFFERINGS
            </span>
            <span className="supply-business-tag">{business.name}</span>
          </div>

          <h1 id="supply-page-title" className="supply-page-title">
            Products &amp; Services
          </h1>

          <p className="supply-page-desc">
            Manage the commercial catalog, inventory, and services offered by{' '}
            <strong className="supply-business-highlight">{business.name}</strong> to customers across Hosur.
          </p>

          {/* ── Compact Summary Metrics ── */}
          <div className="supply-metrics-row" role="region" aria-label="Offerings Summary">
            <div className="supply-metric-card" aria-label={`${services.length} services listed`}>
              <div className="supply-metric-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
              </div>
              <div className="supply-metric-copy">
                <span className="supply-metric-val">{services.length}</span>
                <span className="supply-metric-lbl">Services Listed</span>
              </div>
            </div>

            <div className="supply-metric-card" aria-label={`${products.length} products listed`}>
              <div className="supply-metric-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
              </div>
              <div className="supply-metric-copy">
                <span className="supply-metric-val">{products.length}</span>
                <span className="supply-metric-lbl">Products Listed</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Header Action Navigation Links ── */}
        <div className="supply-header-actions">
          <Link
            to={`/owner/businesses/${business.id}`}
            className="secondary-button supply-header-btn"
            aria-label={`View public listing for ${business.name}`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            View Listing
          </Link>
          <Link
            to="/owner"
            className="secondary-button supply-header-btn"
            aria-label="Back to owner dashboard"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      {error && <div className="state-panel error-state"><p>{error}</p></div>}

      <section className="supply-section" aria-labelledby="services-heading">
        <div className="section-header">
          <div><p className="eyebrow">What you do</p><h2 id="services-heading">Services</h2></div>
          <span className="results-summary">{services.length} listed</span>
        </div>
        <ServiceFormPanel
          form={serviceForm}
          subcategories={subcategories}
          saving={saving === 'service'}
          editing={Boolean(editingServiceId)}
          errors={serviceErrors}
          formRef={serviceFormRef}
          onChange={updateServiceForm}
          onSubmit={handleServiceSubmit}
          onCancel={() => { setEditingServiceId(null); setServiceForm(emptyServiceForm); setServiceErrors({}) }}
        />
        {services.length === 0 ? <div className="state-panel empty-state"><h3>No services added yet</h3><p>Add your first service to help customers understand what you offer.</p></div> : (
          <div className="table-responsive">
            <div className="supply-list">
              {services.map((service) => (
              <article key={service.id} className="supply-item supply-card" aria-labelledby={`service-title-${service.id}`}>
                <div className="supply-card-main">
                  <div className="supply-card-top">
                    <div className="supply-card-badge-row">
                      <span className="supply-card-kind-badge supply-card-kind-badge--service" aria-hidden="true">
                        Service
                      </span>
                      {service.subcategories && (
                        <span className="business-tag supply-card-taxonomy-badge">
                          {service.subcategories.name}
                        </span>
                      )}
                    </div>
                    <h3 id={`service-title-${service.id}`} className="supply-card-title">
                      {service.name}
                    </h3>
                  </div>

                  <p className="supply-card-description">
                    {service.description || <span className="supply-card-desc-empty">No description added.</span>}
                  </p>

                  <div className="supply-card-meta">
                    {(service.price_from !== null || service.price_to !== null) ? (
                      <div className="supply-card-price-box">
                        <span className="supply-card-price-label">Price</span>
                        <strong className="supply-card-price-val">
                          From ₹{service.price_from ?? service.price_to}
                          {service.price_to !== null && service.price_to !== service.price_from ? ` – ₹${service.price_to}` : ''}
                          {service.price_unit ? <span className="supply-card-price-unit"> {service.price_unit}</span> : ''}
                        </strong>
                      </div>
                    ) : (
                      <div className="supply-card-price-box supply-card-price-box--flexible">
                        <span className="supply-card-price-label">Price</span>
                        <span className="supply-card-price-tbd">Price on inquiry</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="supply-card-actions owner-business-actions">
                  <button
                    type="button"
                    className="supply-action-btn supply-action-btn--edit nav-link"
                    onClick={() => startServiceEdit(service)}
                    aria-label={`Edit ${service.name}`}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    className="supply-action-btn supply-action-btn--delete nav-link danger-button"
                    onClick={() => handleDeleteService(service.id)}
                    aria-label={`Delete ${service.name}`}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                    <span>Delete</span>
                  </button>
                </div>
              </article>
            ))}
            </div>
          </div>
        )}
      </section>

      <section className="supply-section" aria-labelledby="products-heading">
        <div className="section-header">
          <div><p className="eyebrow">What you sell</p><h2 id="products-heading">Products</h2></div>
          <span className="results-summary">{products.length} listed</span>
        </div>
        <ProductFormPanel
          form={productForm}
          subcategories={subcategories}
          saving={saving === 'product'}
          editing={Boolean(editingProductId)}
          errors={productErrors}
          formRef={productFormRef}
          onChange={updateProductForm}
          onSubmit={handleProductSubmit}
          onCancel={() => { setEditingProductId(null); setProductForm(emptyProductForm); setProductErrors({}) }}
        />
        {products.length === 0 ? <div className="state-panel empty-state"><h3>No products added yet</h3><p>Add products so customers can discover what is available.</p></div> : (
          <div className="table-responsive">
            <div className="supply-list">
              {products.map((product) => (
              <article key={product.id} className="supply-item supply-card" aria-labelledby={`product-title-${product.id}`}>
                <div className="supply-card-main">
                  <div className="supply-card-top">
                    <div className="supply-card-badge-row">
                      <span className="supply-card-kind-badge supply-card-kind-badge--product" aria-hidden="true">
                        Product
                      </span>
                      {product.subcategories && (
                        <span className="business-tag supply-card-taxonomy-badge">
                          {product.subcategories.name}
                        </span>
                      )}
                      <span
                        className={`supply-avail-badge supply-avail-badge--${product.availability}`}
                        role="status"
                        aria-label={`Availability: ${product.availability}`}
                      >
                        <span className="supply-avail-dot" aria-hidden="true" />
                        {product.availability === 'available'
                          ? 'Available'
                          : product.availability === 'limited'
                          ? 'Limited'
                          : 'Unavailable'}
                      </span>
                    </div>
                    <h3 id={`product-title-${product.id}`} className="supply-card-title">
                      {product.name}
                    </h3>
                  </div>

                  <p className="supply-card-description">
                    {product.description || <span className="supply-card-desc-empty">No description added.</span>}
                  </p>

                  <div className="supply-card-meta">
                    <div className="supply-card-price-box">
                      <span className="supply-card-price-label">Price</span>
                      <strong className="supply-card-price-val">
                        ₹{product.price}
                        {product.unit ? <span className="supply-card-price-unit"> / {product.unit}</span> : ''}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="supply-card-actions owner-business-actions">
                  <button
                    type="button"
                    className="supply-action-btn supply-action-btn--edit nav-link"
                    onClick={() => startProductEdit(product)}
                    aria-label={`Edit ${product.name}`}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    className="supply-action-btn supply-action-btn--delete nav-link danger-button"
                    onClick={() => handleDeleteProduct(product.id)}
                    aria-label={`Delete ${product.name}`}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                    <span>Delete</span>
                  </button>
                </div>
              </article>
            ))}
            </div>
          </div>
        )}
      </section>
    </section>
  )
}