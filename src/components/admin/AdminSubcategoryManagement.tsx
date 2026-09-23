import { useState, type FormEvent } from 'react'
import {
  createSubcategory,
  getCategoryErrorMessage,
  setSubcategoryActive,
  slugify,
  updateSubcategory,
  type CategoryRecord,
  type SubcategoryRecord,
} from '../../services/categories'

export interface AdminSubcategoryManagementProps {
  categories: CategoryRecord[]
  subcategories: SubcategoryRecord[]
  loading: boolean
  selectedCategoryFilter: string
  onSelectCategoryFilter: (catId: string) => void
  addSubcatPresetId?: string | null
  onClearSubcatPreset?: () => void
  actionId: string | null
  onRefresh: () => Promise<void>
}

export function AdminSubcategoryManagement({
  categories,
  subcategories,
  loading,
  selectedCategoryFilter,
  onSelectCategoryFilter,
  addSubcatPresetId,
  onClearSubcatPreset,
  actionId,
  onRefresh,
}: AdminSubcategoryManagementProps) {
  const [showSubcategoryForm, setShowSubcategoryForm] = useState(false)
  const [editingSubcategoryId, setEditingSubcategoryId] = useState<string | null>(null)
  const [subcatCategoryId, setSubcatCategoryId] = useState('')
  const [subcatName, setSubcatName] = useState('')
  const [subcatSlug, setSubcatSlug] = useState('')
  const [subcatDescription, setSubcatDescription] = useState('')
  const [subcatActive, setSubcatActiveState] = useState(true)
  const [subcatSaving, setSubcatSaving] = useState(false)
  const [subcatFormError, setSubcatFormError] = useState<string | null>(null)
  const [localActionId, setLocalActionId] = useState<string | null>(null)

  function startAddSubcategory(presetCatId?: string) {
    const targetCatId =
      presetCatId ||
      (selectedCategoryFilter !== 'all' ? selectedCategoryFilter : categories[0]?.id || '')
    setEditingSubcategoryId(null)
    setSubcatCategoryId(targetCatId)
    setSubcatName('')
    setSubcatSlug('')
    setSubcatDescription('')
    setSubcatActiveState(true)
    setSubcatFormError(null)
    setShowSubcategoryForm(true)
  }

  const [prevPresetId, setPrevPresetId] = useState<string | null>(null)
  if (addSubcatPresetId && addSubcatPresetId !== prevPresetId) {
    setPrevPresetId(addSubcatPresetId)
    setShowSubcategoryForm(true)
    setEditingSubcategoryId(null)
    setSubcatCategoryId(addSubcatPresetId)
    setSubcatName('')
    setSubcatSlug('')
    setSubcatDescription('')
    setSubcatActiveState(true)
    setSubcatFormError(null)
  }

  function startEditSubcategory(sub: SubcategoryRecord) {
    setEditingSubcategoryId(sub.id)
    setSubcatCategoryId(sub.category_id)
    setSubcatName(sub.name)
    setSubcatSlug(sub.slug)
    setSubcatDescription(sub.description || '')
    setSubcatActiveState(sub.active)
    setSubcatFormError(null)
    setShowSubcategoryForm(true)
  }

  function cancelSubcategoryForm() {
    setShowSubcategoryForm(false)
    setEditingSubcategoryId(null)
    setSubcatFormError(null)
    setPrevPresetId(null)
    onClearSubcatPreset?.()
  }

  function handleSubcatNameInput(value: string) {
    setSubcatName(value)
    if (!editingSubcategoryId) {
      setSubcatSlug(slugify(value))
    }
  }

  async function handleSubcategorySubmit(e: FormEvent) {
    e.preventDefault()
    if (!subcatCategoryId) {
      setSubcatFormError('Please select a parent category.')
      return
    }

    const trimmedName = subcatName.trim()
    if (!trimmedName) {
      setSubcatFormError('Subcategory name is required.')
      return
    }

    const computedSlug = slugify(subcatSlug || trimmedName)
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(computedSlug)) {
      setSubcatFormError(
        'Slug must contain only lowercase letters, numbers, and hyphens (e.g. coffee-shops).',
      )
      return
    }

    try {
      setSubcatSaving(true)
      setSubcatFormError(null)

      if (editingSubcategoryId) {
        await updateSubcategory(editingSubcategoryId, {
          name: trimmedName,
          slug: computedSlug,
          description: subcatDescription.trim() || null,
          active: subcatActive,
        })
      } else {
        await createSubcategory({
          category_id: subcatCategoryId,
          name: trimmedName,
          slug: computedSlug,
          description: subcatDescription.trim() || null,
          active: subcatActive,
        })
      }

      await onRefresh()
      setShowSubcategoryForm(false)
      setEditingSubcategoryId(null)
      setPrevPresetId(null)
      onClearSubcatPreset?.()
    } catch (err) {
      setSubcatFormError(getCategoryErrorMessage(err, 'Failed to save subcategory.'))
    } finally {
      setSubcatSaving(false)
    }
  }

  async function handleToggleSubcategoryActive(sub: SubcategoryRecord) {
    const action = sub.active ? 'deactivate' : 'activate'
    const msg = sub.active
      ? `Deactivate subcategory "${sub.name}"?`
      : `Activate subcategory "${sub.name}"?`
    if (!window.confirm(msg)) return

    try {
      setLocalActionId(sub.id)
      await setSubcategoryActive(sub.id, !sub.active)
      await onRefresh()
    } catch (err) {
      alert(getCategoryErrorMessage(err, `Unable to ${action} subcategory.`))
    } finally {
      setLocalActionId(null)
    }
  }

  const categoryMap = new Map<string, CategoryRecord>()
  categories.forEach((cat) => categoryMap.set(cat.id, cat))

  const filteredSubcategories =
    selectedCategoryFilter === 'all'
      ? subcategories
      : subcategories.filter((s) => s.category_id === selectedCategoryFilter)

  const effectiveActionId = actionId || localActionId

  return (
    <section
      className="taxonomy-section"
      aria-labelledby="subcategories-heading"
      style={{ marginTop: '1.5rem' }}
    >
      <div className="taxonomy-section-header">
        <div>
          <p className="eyebrow">Taxonomy</p>
          <h2 id="subcategories-heading">
            Subcategories ({filteredSubcategories.length}
            {selectedCategoryFilter !== 'all' ? ` of ${subcategories.length}` : ''})
          </h2>
        </div>
        {!showSubcategoryForm && categories.length > 0 && (
          <button
            type="button"
            className="primary-button inline-button"
            onClick={() => startAddSubcategory()}
          >
            + Add Subcategory
          </button>
        )}
      </div>

      <div className="taxonomy-filter-bar">
        <label>
          Filter by Category:
          <select
            value={selectedCategoryFilter}
            onChange={(e) => onSelectCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories ({subcategories.length})</option>
            {categories.map((cat) => {
              const count = subcategories.filter((s) => s.category_id === cat.id).length
              return (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({count})
                </option>
              )
            })}
          </select>
        </label>
        {selectedCategoryFilter !== 'all' && (
          <button
            type="button"
            className="nav-link"
            onClick={() => onSelectCategoryFilter('all')}
            style={{ fontSize: '0.85rem' }}
          >
            Clear filter
          </button>
        )}
      </div>

      {showSubcategoryForm && (
        <form className="supply-form" onSubmit={handleSubcategorySubmit}>
          <h3>{editingSubcategoryId ? 'Edit Subcategory' : 'Add New Subcategory'}</h3>
          {subcatFormError && <p className="form-error">{subcatFormError}</p>}
          <div className="form-grid">
            <label>
              Parent Category *
              <select
                value={subcatCategoryId}
                onChange={(e) => setSubcatCategoryId(e.target.value)}
                required
              >
                <option value="" disabled>
                  Select a category
                </option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} {!cat.active ? '(Inactive)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Subcategory Name *
              <input
                type="text"
                value={subcatName}
                onChange={(e) => handleSubcatNameInput(e.target.value)}
                placeholder="e.g. Vegetarian Restaurants"
                required
                autoFocus
              />
            </label>
            <label>
              URL Slug *
              <input
                type="text"
                value={subcatSlug}
                onChange={(e) => setSubcatSlug(e.target.value)}
                placeholder="e.g. vegetarian-restaurants"
                required
              />
              <span className="form-hint">
                Format: lowercase alphanumeric and hyphens (e.g. vegetarian-restaurants)
              </span>
            </label>
            <label className="full-width">
              Description (optional)
              <textarea
                rows={2}
                value={subcatDescription}
                onChange={(e) => setSubcatDescription(e.target.value)}
                placeholder="Optional brief description of this subcategory"
              />
            </label>
            <div className="full-width">
              <label className="form-checkbox-label">
                <input
                  type="checkbox"
                  checked={subcatActive}
                  onChange={(e) => setSubcatActiveState(e.target.checked)}
                />
                Active subcategory (available for business tagging)
              </label>
            </div>
          </div>
          <div className="form-actions supply-form-actions">
            <button
              type="button"
              className="secondary-button inline-button"
              onClick={cancelSubcategoryForm}
              disabled={subcatSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-button inline-button"
              disabled={subcatSaving}
            >
              {subcatSaving
                ? 'Saving…'
                : editingSubcategoryId
                ? 'Update Subcategory'
                : 'Create Subcategory'}
            </button>
          </div>
        </form>
      )}

      {!loading && filteredSubcategories.length === 0 ? (
        <div className="state-panel empty-state">
          <h3>No subcategories found</h3>
          <p>
            {selectedCategoryFilter !== 'all'
              ? 'No subcategories match the selected category filter.'
              : 'Click "+ Add Subcategory" to add your first subcategory.'}
          </p>
        </div>
      ) : (
        <div className="table-responsive">
          <div className="admin-business-list">
            {filteredSubcategories.map((sub) => {
              const isActionLoading = effectiveActionId === sub.id
              const parentCat = categoryMap.get(sub.category_id)

              return (
                <article key={sub.id} className="taxonomy-card">
                  <div className="taxonomy-card-info">
                    <p className="owner-card-label">
                      Category: {parentCat ? parentCat.name : 'Unknown parent'}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <h3>{sub.name}</h3>
                      <span className="taxonomy-slug">{sub.slug}</span>
                      <span
                        className={
                          sub.active ? 'status-badge verified' : 'status-badge'
                        }
                      >
                        {sub.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {sub.description && <p className="taxonomy-desc">{sub.description}</p>}
                  </div>

                  <div className="owner-business-actions">
                    <button
                      type="button"
                      className="nav-link"
                      onClick={() => startEditSubcategory(sub)}
                      disabled={isActionLoading}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className={sub.active ? 'nav-link danger-button' : 'primary-button inline-button'}
                      onClick={() => handleToggleSubcategoryActive(sub)}
                      disabled={isActionLoading}
                    >
                      {isActionLoading
                        ? 'Updating…'
                        : sub.active
                        ? 'Deactivate'
                        : 'Activate'}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
