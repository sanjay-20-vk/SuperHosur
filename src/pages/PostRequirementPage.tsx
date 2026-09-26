import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  getCategories,
  getSubcategories,
  type CategorySummary,
  type SubcategorySummary,
} from '../services/categories'
import { getCities, type CityOption } from '../services/cities'
import {
  createRequirement,
  getRequirementById,
  getRequirementErrorMessage,
  updateRequirement,
  type RequirementCreateInput,
  type RequirementUpdateInput,
} from '../services/requirements'
import {
  extractRequirementFromText,
  type ExtractedRequirementData,
} from '../services/aiRequirementExtractor'

type RequirementFieldErrors = {
  aiPrompt?: string
  title?: string
  cityId?: string
  budgetMin?: string
  budgetMax?: string
  requiredDate?: string
  description?: string
}

export function PostRequirementPage() {
  const navigate = useNavigate()
  const { requirementId } = useParams<{ requirementId?: string }>()
  const isEditMode = Boolean(requirementId)
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existingStatus, setExistingStatus] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<RequirementFieldErrors>({})

  const [cities, setCities] = useState<CityOption[]>([])
  const [categories, setCategories] = useState<CategorySummary[]>([])
  const [allSubcategories, setAllSubcategories] = useState<SubcategorySummary[]>([])
  const [subcategories, setSubcategories] = useState<SubcategorySummary[]>([])
  const [loadingSubcategories, setLoadingSubcategories] = useState(false)

  // AI Assistant State
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiExtracting, setAiExtracting] = useState(false)
  const [aiExtractedData, setAiExtractedData] = useState<ExtractedRequirementData | null>(null)
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [subcategoryId, setSubcategoryId] = useState('')
  const [cityId, setCityId] = useState('')
  const [description, setDescription] = useState('')
  const [budgetMin, setBudgetMin] = useState('')
  const [budgetMax, setBudgetMax] = useState('')
  const [requiredDate, setRequiredDate] = useState('')
  const [duration, setDuration] = useState('')
  const [address, setAddress] = useState('')

  const clearFieldError = (field: keyof RequirementFieldErrors) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  useEffect(() => {
    async function loadFormData() {
      try {
        const [cityRows, catRows, subRows] = await Promise.all([
          getCities(),
          getCategories(),
          getSubcategories(),
        ])

        setCities(cityRows)
        setCategories(catRows)
        setAllSubcategories(subRows)

        if (!isEditMode && cityRows.length > 0 && cityRows[0]) {
          setCityId(cityRows[0].id)
        }

        if (isEditMode && requirementId) {
          const req = await getRequirementById(requirementId)
          if (!req) {
            setError('Requirement not found.')
            return
          }

          if (user && req.customer_id !== user.id) {
            setError('Access denied: You can only edit your own requirements.')
            return
          }

          setExistingStatus(req.status)
          if (
            req.status === 'closed' ||
            req.status === 'completed' ||
            req.status === 'cancelled' ||
            req.status === 'expired'
          ) {
            setError(`This requirement is ${req.status} and cannot be edited.`)
          }

          setTitle(req.title)
          setCityId(req.city_id)
          setCategoryId(req.category_id || '')
          if (req.category_id) {
            const relatedSubs = subRows.filter((s) => s.category_id === req.category_id)
            setSubcategories(relatedSubs)
            setSubcategoryId(req.subcategory_id || '')
          }
          setDescription(req.description || '')
          setBudgetMin(req.budget_min !== null && req.budget_min !== undefined ? String(req.budget_min) : '')
          setBudgetMax(req.budget_max !== null && req.budget_max !== undefined ? String(req.budget_max) : '')
          setRequiredDate(req.required_date || '')
          setDuration(req.duration || '')
          setAddress(req.address || '')
        }
      } catch (err) {
        setError(getRequirementErrorMessage(err, 'Unable to load requirement details.'))
      } finally {
        setLoading(false)
      }
    }

    void loadFormData()
  }, [isEditMode, requirementId, user])

  useEffect(() => {
    async function loadSubcategoriesForCategory() {
      if (!categoryId) {
        setSubcategories([])
        setSubcategoryId('')
        return
      }

      try {
        setLoadingSubcategories(true)
        const subRows = await getSubcategories(categoryId)
        setSubcategories(subRows)
        setSubcategoryId((prev) => (subRows.some((s) => s.id === prev) ? prev : ''))
      } catch {
        setSubcategories([])
      } finally {
        setLoadingSubcategories(false)
      }
    }

    // Only run if not initial load or category explicitly changed
    if (!isEditMode || subcategories.length === 0) {
      void loadSubcategoriesForCategory()
    }
  }, [categoryId, isEditMode, subcategories.length])

  async function handleAiExtract() {
    if (aiExtracting) return
    clearFieldError('aiPrompt')
    const trimmed = aiPrompt.trim()
    if (!trimmed) {
      setFieldErrors((prev) => ({
        ...prev,
        aiPrompt: aiPrompt.length > 0 ? 'AI prompt cannot be only whitespace.' : 'Please enter a description for the AI assistant.',
      }))
      setError('Please enter a description of what you need for the AI assistant.')
      return
    }

    if (trimmed.length < 6) {
      setFieldErrors((prev) => ({
        ...prev,
        aiPrompt: 'AI prompt must be at least 6 characters.',
      }))
      setError('AI prompt must be at least 6 characters.')
      return
    }

    try {
      setAiExtracting(true)
      setError(null)
      const result = await extractRequirementFromText(trimmed, {
        categories,
        subcategories: allSubcategories,
      })

      setAiExtractedData(result)

      if (result.suggestedTitle) {
        setTitle(result.suggestedTitle)
        clearFieldError('title')
      }
      if (result.suggestedCategoryId) {
        setCategoryId(result.suggestedCategoryId)
        const subs = allSubcategories.filter((s) => s.category_id === result.suggestedCategoryId)
        setSubcategories(subs)
        if (result.suggestedSubcategoryId) {
          setSubcategoryId(result.suggestedSubcategoryId)
        }
      }
      if (result.budgetMin !== null && result.budgetMin !== undefined) {
        setBudgetMin(String(result.budgetMin))
        clearFieldError('budgetMin')
      }
      if (result.budgetMax !== null && result.budgetMax !== undefined) {
        setBudgetMax(String(result.budgetMax))
        clearFieldError('budgetMax')
      }
      if (result.requiredDate) {
        setRequiredDate(result.requiredDate)
        clearFieldError('requiredDate')
      }
      if (result.duration) setDuration(result.duration)
      if (result.location) setAddress(result.location)
      if (!description.trim()) {
        setDescription(trimmed)
        clearFieldError('description')
      }

      setAiSuccessMessage(
        `AI extracted structured details (${Math.round(result.confidence * 100)}% confidence). Review or edit any field below before submitting.`,
      )
    } catch (err) {
      setError(getRequirementErrorMessage(err, 'AI extraction encountered an issue.'))
    } finally {
      setAiExtracting(false)
    }
  }

  function handleClearAi() {
    setAiExtractedData(null)
    setAiSuccessMessage(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    setError(null)
    setFieldErrors({})

    const isClosedOrCancelled =
      existingStatus === 'closed' ||
      existingStatus === 'completed' ||
      existingStatus === 'cancelled' ||
      existingStatus === 'expired'

    if (isEditMode && isClosedOrCancelled) {
      setError(`This requirement is ${existingStatus} and cannot be modified.`)
      return
    }

    const errors: RequirementFieldErrors = {}
    const cleanTitle = title.trim()

    if (!cleanTitle) {
      errors.title = title.length > 0 ? 'Requirement title cannot be only whitespace.' : 'Requirement title is required.'
    } else if (cleanTitle.length < 5) {
      errors.title = 'Requirement title must be at least 5 characters.'
    } else if (cleanTitle.length > 100) {
      errors.title = 'Requirement title cannot exceed 100 characters.'
    }

    if (!cityId) {
      errors.cityId = 'Please select a city.'
    }

    let minNum: number | null = null
    if (budgetMin.length > 0 && !budgetMin.trim()) {
      errors.budgetMin = 'Budget cannot be only whitespace.'
    } else if (budgetMin.trim()) {
      minNum = Number(budgetMin)
      if (isNaN(minNum) || minNum < 0) {
        errors.budgetMin = 'Minimum budget must be 0 or greater.'
      }
    }

    let maxNum: number | null = null
    if (budgetMax.length > 0 && !budgetMax.trim()) {
      errors.budgetMax = 'Budget cannot be only whitespace.'
    } else if (budgetMax.trim()) {
      maxNum = Number(budgetMax)
      if (isNaN(maxNum) || maxNum < 0) {
        errors.budgetMax = 'Maximum budget must be 0 or greater.'
      }
    }

    if (
      minNum !== null &&
      maxNum !== null &&
      !isNaN(minNum) &&
      !isNaN(maxNum) &&
      minNum >= 0 &&
      maxNum >= 0
    ) {
      if (minNum > maxNum) {
        errors.budgetMax = 'Maximum budget cannot be less than minimum budget.'
      }
    }

    if (requiredDate) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const chosen = new Date(requiredDate + 'T00:00:00')
      if (!isNaN(chosen.getTime()) && chosen < today) {
        errors.requiredDate = 'Required by date cannot be in the past.'
      }
    }

    if (description.length > 0 && !description.trim()) {
      errors.description = 'Description cannot be only whitespace.'
    } else if (description.trim().length > 2000) {
      errors.description = 'Description cannot exceed 2000 characters.'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setError('Please correct the highlighted errors before submitting.')
      return
    }

    try {
      setSubmitting(true)

      if (isEditMode && requirementId) {
        const updateInput: RequirementUpdateInput = {
          title: cleanTitle,
          city_id: cityId,
          category_id: categoryId || null,
          subcategory_id: subcategoryId || null,
          description: description.trim() || null,
          budget_min: minNum,
          budget_max: maxNum,
          required_date: requiredDate || null,
          duration: duration.trim() || null,
          address: address.trim() || null,
        }

        await updateRequirement(requirementId, updateInput)
      } else {
        const createInput: RequirementCreateInput = {
          title: cleanTitle,
          city_id: cityId,
          category_id: categoryId || null,
          subcategory_id: subcategoryId || null,
          description: description.trim() || null,
          budget_min: minNum,
          budget_max: maxNum,
          required_date: requiredDate || null,
          duration: duration.trim() || null,
          address: address.trim() || null,
          ai_extracted_data: aiExtractedData ? { ...aiExtractedData } : null,
        }

        await createRequirement(createInput)
      }

      navigate('/my-requirements', { replace: true })
    } catch (submitError) {
      setError(getRequirementErrorMessage(submitError))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="page-section state-panel">
        <p>Loading requirement form…</p>
      </div>
    )
  }

  const isClosedOrCancelled =
    existingStatus === 'closed' ||
    existingStatus === 'completed' ||
    existingStatus === 'cancelled' ||
    existingStatus === 'expired'

  return (
    <section className="page-section">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">{isEditMode ? 'Requirement lifecycle' : 'Customer marketplace'}</p>
          <h1>{isEditMode ? 'Edit requirement' : 'Post a requirement'}</h1>
          <p className="page-intro">
            {isEditMode
              ? 'Update your requirement details below. Existing quotations and matched vendors will remain connected.'
              : 'Tell local businesses in Hosur what you need to receive quotes and connect with verified professionals.'}
          </p>
        </div>

        <div className="owner-actions">
          <Link to="/my-requirements" className="nav-link">
            My requirements
          </Link>
          <Link to="/" className="nav-link">
            Back to marketplace
          </Link>
        </div>
      </div>

      {/* In Edit Mode: Show Requirement Edit Status Banner; In Create Mode: Show AI Assistant */}
      {isEditMode ? (
        <div className="owner-status-banner owner-status-banner--public" role="note" style={{ marginBottom: '24px' }}>
          <div className="owner-status-banner-header">
            <span className="owner-status-banner-icon" aria-hidden="true">✏️</span>
            <div className="owner-status-banner-header-text">
              <h4 className="owner-status-banner-title">
                Editing Requirement: {title || 'Untitled'}
              </h4>
              <p className="owner-status-banner-subtitle">
                Status: <strong>{existingStatus ? existingStatus.toUpperCase() : 'ACTIVE'}</strong> • Only you (the creator) can modify these details.
              </p>
            </div>
          </div>
          {isClosedOrCancelled ? (
            <p className="owner-status-banner-instruction" style={{ color: '#b91c1c' }}>
              ⚠️ This requirement is marked as <strong>{existingStatus}</strong> and is locked from further edits.
            </p>
          ) : (
            <p className="owner-status-banner-instruction">
              You can update the scope, timeline, indicative budget, or category. Existing quotations received from Hosur businesses will remain preserved.
            </p>
          )}
        </div>
      ) : (
        /* AI Assistant Card */
        <div className="ai-assistant-card" aria-label="AI Requirement Assistant">
          <div className="ai-assistant-header">
            <div className="ai-badge">✨ AI Requirement Assistant</div>
            <span className="ai-subtext">
              Describe what you need in natural English — we&apos;ll auto-fill the form for you
            </span>
          </div>

        <div className="ai-input-group">
          <textarea
            className="ai-prompt-input"
            rows={2}
            value={aiPrompt}
            aria-invalid={Boolean(fieldErrors.aiPrompt)}
            aria-describedby={fieldErrors.aiPrompt ? 'req-ai-prompt-error' : undefined}
            onChange={(e) => {
              setAiPrompt(e.target.value)
              clearFieldError('aiPrompt')
            }}
            placeholder="e.g. Need urgent pipe leak repair at factory warehouse in SIPCOT Phase 2, budget 5k-15k by tomorrow..."
          />
          <button
            type="button"
            className="primary-button ai-extract-btn"
            onClick={handleAiExtract}
            disabled={aiExtracting || !aiPrompt.trim()}
          >
            {aiExtracting ? 'Analyzing with AI…' : '✨ Auto-Fill Form'}
          </button>
        </div>
        {fieldErrors.aiPrompt && (
          <span id="req-ai-prompt-error" className="field-error" role="alert" style={{ marginTop: '6px' }}>
            {fieldErrors.aiPrompt}
          </span>
        )}

        {/* Quick Example Chips */}
        <div className="ai-examples">
          <span className="ai-example-label">Try prompt:</span>
          <button
            type="button"
            className="ai-example-chip"
            onClick={() => {
              setAiPrompt(
                'Need urgent emergency plumbing repair for water pipe leak at warehouse in SIPCOT Phase 2, budget 5000 to 15000 by tomorrow',
              )
              clearFieldError('aiPrompt')
            }}
          >
            Emergency plumbing in SIPCOT
          </button>
          <button
            type="button"
            className="ai-example-chip"
            onClick={() => {
              setAiPrompt(
                'Require industrial metal fabrication for warehouse shed frames in SIPCOT Phase 1, budget 80000 to 120000 within 2 weeks',
              )
              clearFieldError('aiPrompt')
            }}
          >
            Metal fabrication for shed
          </button>
          <button
            type="button"
            className="ai-example-chip"
            onClick={() => {
              setAiPrompt(
                'Looking for 2 BHK apartment for rent in Bagalur Road under 18000 per month, immediate move in',
              )
              clearFieldError('aiPrompt')
            }}
          >
            2 BHK apartment on Bagalur Road
          </button>
        </div>

        {/* Extracted Feedback Banner */}
        {aiExtractedData && aiSuccessMessage && (
          <div className="ai-feedback-banner">
            <div className="ai-feedback-header">
              <p className="ai-feedback-text">{aiSuccessMessage}</p>
              <button type="button" className="ai-clear-btn" onClick={handleClearAi}>
                Dismiss
              </button>
            </div>

            <div className="ai-extracted-pills">
              {aiExtractedData.suggestedCategoryName && (
                <span className="ai-pill">
                  Category: <strong>{aiExtractedData.suggestedCategoryName}</strong>
                </span>
              )}
              {aiExtractedData.suggestedSubcategoryName && (
                <span className="ai-pill">
                  Subcategory: <strong>{aiExtractedData.suggestedSubcategoryName}</strong>
                </span>
              )}
              {(aiExtractedData.budgetMin !== null || aiExtractedData.budgetMax !== null) && (
                <span className="ai-pill">
                  Budget:{' '}
                  <strong>
                    {aiExtractedData.budgetMin && aiExtractedData.budgetMax
                      ? `₹${aiExtractedData.budgetMin.toLocaleString()} - ₹${aiExtractedData.budgetMax.toLocaleString()}`
                      : aiExtractedData.budgetMax
                      ? `Up to ₹${aiExtractedData.budgetMax.toLocaleString()}`
                      : `From ₹${aiExtractedData.budgetMin?.toLocaleString()}`}
                  </strong>
                </span>
              )}
              {aiExtractedData.duration && (
                <span className="ai-pill">
                  Timeframe: <strong>{aiExtractedData.duration}</strong>
                </span>
              )}
              {aiExtractedData.location && (
                <span className="ai-pill">
                  Location: <strong>{aiExtractedData.location}</strong>
                </span>
              )}
              {aiExtractedData.tags.map((tag) => (
                <span key={tag} className="ai-pill tag">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      )}

      <form className="owner-form" onSubmit={handleSubmit} noValidate>
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}

        <div className="form-grid">
          <label className="full-width">
            Requirement title *
            <input
              type="text"
              maxLength={100}
              value={title}
              aria-invalid={Boolean(fieldErrors.title)}
              aria-describedby={fieldErrors.title ? 'req-title-error' : undefined}
              onChange={(e) => {
                setTitle(e.target.value)
                clearFieldError('title')
              }}
              placeholder="e.g. Commercial HVAC service or 10 tons cement supply"
              required
            />
            <span className="char-hint">{title.length}/100</span>
            {fieldErrors.title && (
              <span id="req-title-error" className="field-error" role="alert">
                {fieldErrors.title}
              </span>
            )}
          </label>

          <label>
            Category
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Select a category (optional)</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Subcategory
            <select
              value={subcategoryId}
              onChange={(e) => setSubcategoryId(e.target.value)}
              disabled={!categoryId || loadingSubcategories}
            >
              <option value="">
                {!categoryId
                  ? 'Select category first'
                  : loadingSubcategories
                  ? 'Loading subcategories…'
                  : subcategories.length === 0
                  ? 'No subcategories available'
                  : 'Select subcategory (optional)'}
              </option>
              {subcategories.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            City *
            <select
              value={cityId}
              aria-invalid={Boolean(fieldErrors.cityId)}
              aria-describedby={fieldErrors.cityId ? 'req-city-error' : undefined}
              onChange={(e) => {
                setCityId(e.target.value)
                clearFieldError('cityId')
              }}
              required
            >
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
            {fieldErrors.cityId && (
              <span id="req-city-error" className="field-error" role="alert">
                {fieldErrors.cityId}
              </span>
            )}
          </label>

          <label>
            Budget minimum (₹)
            <input
              type="number"
              min="0"
              step="1"
              value={budgetMin}
              aria-invalid={Boolean(fieldErrors.budgetMin)}
              aria-describedby={fieldErrors.budgetMin ? 'req-budget-min-error' : undefined}
              onChange={(e) => {
                setBudgetMin(e.target.value)
                clearFieldError('budgetMin')
                clearFieldError('budgetMax')
              }}
              placeholder="e.g. 5000"
            />
            {fieldErrors.budgetMin && (
              <span id="req-budget-min-error" className="field-error" role="alert">
                {fieldErrors.budgetMin}
              </span>
            )}
          </label>

          <label>
            Budget maximum (₹)
            <input
              type="number"
              min="0"
              step="1"
              value={budgetMax}
              aria-invalid={Boolean(fieldErrors.budgetMax)}
              aria-describedby={fieldErrors.budgetMax ? 'req-budget-max-error' : undefined}
              onChange={(e) => {
                setBudgetMax(e.target.value)
                clearFieldError('budgetMax')
              }}
              placeholder="e.g. 15000"
            />
            {fieldErrors.budgetMax && (
              <span id="req-budget-max-error" className="field-error" role="alert">
                {fieldErrors.budgetMax}
              </span>
            )}
          </label>

          <label>
            Required by date
            <input
              type="date"
              min={new Date().toISOString().split('T')[0]}
              value={requiredDate}
              aria-invalid={Boolean(fieldErrors.requiredDate)}
              aria-describedby={fieldErrors.requiredDate ? 'req-date-error' : undefined}
              onChange={(e) => {
                setRequiredDate(e.target.value)
                clearFieldError('requiredDate')
              }}
            />
            {fieldErrors.requiredDate && (
              <span id="req-date-error" className="field-error" role="alert">
                {fieldErrors.requiredDate}
              </span>
            )}
          </label>

          <label>
            Expected duration / timeline
            <input
              type="text"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g. 2 weeks, immediate, recurring monthly"
            />
          </label>

          <label className="full-width">
            Location / Area in Hosur
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. SIPCOT Industrial Area, Phase II"
            />
          </label>

          <label className="full-width">
            Detailed requirements & specifications
            <textarea
              rows={4}
              maxLength={2000}
              value={description}
              aria-invalid={Boolean(fieldErrors.description)}
              aria-describedby={fieldErrors.description ? 'req-desc-error' : undefined}
              onChange={(e) => {
                setDescription(e.target.value)
                clearFieldError('description')
              }}
              placeholder="Describe the scope of work, materials required, or specific job instructions."
            />
            <span className="char-hint">{description.length}/2000</span>
            {fieldErrors.description && (
              <span id="req-desc-error" className="field-error" role="alert">
                {fieldErrors.description}
              </span>
            )}
          </label>
        </div>

        <div className="form-actions">
          <Link to="/my-requirements" className="secondary-button inline-button">
            Cancel
          </Link>
          <button
            type="submit"
            className="primary-button inline-button"
            disabled={submitting || isClosedOrCancelled}
          >
            {isEditMode
              ? submitting
                ? 'Saving changes…'
                : 'Save Changes'
              : submitting
              ? 'Submitting requirement…'
              : 'Submit requirement'}
          </button>
        </div>
      </form>
    </section>
  )
}
