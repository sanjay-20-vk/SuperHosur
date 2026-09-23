import { useState, type FormEvent } from 'react'
import {
  createCategory,
  getCategoryErrorMessage,
  setCategoryActive,
  slugify,
  updateCategory,
  type CategoryRecord,
  type SubcategoryRecord,
} from '../../services/categories'

export interface AdminCategoryManagementProps {
  categories: CategoryRecord[]
  subcategories: SubcategoryRecord[]
  loading: boolean
  error: string | null
  actionId: string | null
  onRefresh: () => Promise<void>
  onAddSubcategory: (categoryId: string) => void
  onViewSubcategories: (categoryId: string) => void
}

export function AdminCategoryManagement({
  categories,
  subcategories,
  loading,
  error,
  actionId,
  onRefresh,
  onAddSubcategory,
  onViewSubcategories,
}: AdminCategoryManagementProps) {
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [categoryName, setCategoryName] = useState('')
  const [categorySlug, setCategorySlug] = useState('')
  const [categoryDescription, setCategoryDescription] = useState('')
  const [categoryActive, setCategoryActiveState] = useState(true)
  const [categorySaving, setCategorySaving] = useState(false)
  const [categoryFormError, setCategoryFormError] = useState<string | null>(null)
  const [localActionId, setLocalActionId] = useState<string | null>(null)

  function startAddCategory() {
    setEditingCategoryId(null)
    setCategoryName('')
    setCategorySlug('')
    setCategoryDescription('')
    setCategoryActiveState(true)
    setCategoryFormError(null)
    setShowCategoryForm(true)
  }

  function startEditCategory(cat: CategoryRecord) {
    setEditingCategoryId(cat.id)
    setCategoryName(cat.name)
    setCategorySlug(cat.slug)
    setCategoryDescription(cat.description || '')
    setCategoryActiveState(cat.active)
    setCategoryFormError(null)
    setShowCategoryForm(true)
  }

  function cancelCategoryForm() {
    setShowCategoryForm(false)
    setEditingCategoryId(null)
    setCategoryFormError(null)
  }

  function handleCategoryNameInput(value: string) {
    setCategoryName(value)
    if (!editingCategoryId) {
      setCategorySlug(slugify(value))
    }
  }

  async function handleCategorySubmit(e: FormEvent) {
    e.preventDefault()
    const trimmedName = categoryName.trim()
    if (!trimmedName) {
      setCategoryFormError('Category name is required.')
      return
    }

    const computedSlug = slugify(categorySlug || trimmedName)
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(computedSlug)) {
      setCategoryFormError(
        'Slug must contain only lowercase letters, numbers, and hyphens (e.g. food-and-dining).',
      )
      return
    }

    try {
      setCategorySaving(true)
      setCategoryFormError(null)

      if (editingCategoryId) {
        await updateCategory(editingCategoryId, {
          name: trimmedName,
          slug: computedSlug,
          description: categoryDescription.trim() || null,
          active: categoryActive,
        })
      } else {
        await createCategory({
          name: trimmedName,
          slug: computedSlug,
          description: categoryDescription.trim() || null,
          active: categoryActive,
        })
      }

      await onRefresh()
      setShowCategoryForm(false)
      setEditingCategoryId(null)
    } catch (err) {
      setCategoryFormError(getCategoryErrorMessage(err, 'Failed to save category.'))
    } finally {
      setCategorySaving(false)
    }
  }

  async function handleToggleCategoryActive(cat: CategoryRecord) {
    const action = cat.active ? 'deactivate' : 'activate'
    const msg = cat.active
      ? `Deactivate category "${cat.name}"? Inactive categories will not appear in public marketplace search.`
      : `Activate category "${cat.name}"?`
    if (!window.confirm(msg)) return

    try {
      setLocalActionId(cat.id)
      await setCategoryActive(cat.id, !cat.active)
      await onRefresh()
    } catch (err) {
      alert(getCategoryErrorMessage(err, `Unable to ${action} category.`))
    } finally {
      setLocalActionId(null)
    }
  }

  const effectiveActionId = actionId || localActionId

  return (
    <section className="taxonomy-section" aria-labelledby="categories-heading">
      <div className="taxonomy-section-header">
        <div>
          <p className="eyebrow">Taxonomy</p>
          <h2 id="categories-heading">Categories ({categories.length})</h2>
        </div>
        {!showCategoryForm && (
          <button
            type="button"
            className="primary-button inline-button"
            onClick={startAddCategory}
          >
            + Add Category
          </button>
        )}
      </div>

      {showCategoryForm && (
        <form className="supply-form" onSubmit={handleCategorySubmit}>
          <h3>{editingCategoryId ? 'Edit Category' : 'Add New Category'}</h3>
          {categoryFormError && <p className="form-error">{categoryFormError}</p>}
          <div className="form-grid">
            <label>
              Category Name *
              <input
                type="text"
                value={categoryName}
                onChange={(e) => handleCategoryNameInput(e.target.value)}
                placeholder="e.g. Food & Dining"
                required
                autoFocus
              />
            </label>
            <label>
              URL Slug *
              <input
                type="text"
                value={categorySlug}
                onChange={(e) => setCategorySlug(e.target.value)}
                placeholder="e.g. food-and-dining"
                required
              />
              <span className="form-hint">
                Format: lowercase alphanumeric and hyphens (e.g. automotive-services)
              </span>
            </label>
            <label className="full-width">
              Description (optional)
              <textarea
                rows={2}
                value={categoryDescription}
                onChange={(e) => setCategoryDescription(e.target.value)}
                placeholder="Optional brief description of this category"
              />
            </label>
            <div className="full-width">
              <label className="form-checkbox-label">
                <input
                  type="checkbox"
                  checked={categoryActive}
                  onChange={(e) => setCategoryActiveState(e.target.checked)}
                />
                Active category (visible in public search & business forms)
              </label>
            </div>
          </div>
          <div className="form-actions supply-form-actions">
            <button
              type="button"
              className="secondary-button inline-button"
              onClick={cancelCategoryForm}
              disabled={categorySaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-button inline-button"
              disabled={categorySaving}
            >
              {categorySaving
                ? 'Saving…'
                : editingCategoryId
                ? 'Update Category'
                : 'Create Category'}
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="state-panel error-state" style={{ margin: '1rem 0' }}>
          <p>{error}</p>
        </div>
      )}

      {!loading && categories.length === 0 ? (
        <div className="state-panel empty-state">
          <h3>No categories found</h3>
          <p>Click &quot;+ Add Category&quot; to create your first category.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <div className="admin-business-list">
            {categories.map((cat) => {
              const isActionLoading = effectiveActionId === cat.id
              const subcatCount = subcategories.filter((s) => s.category_id === cat.id).length

              return (
                <article key={cat.id} className="taxonomy-card">
                  <div className="taxonomy-card-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <h3>{cat.name}</h3>
                      <span className="taxonomy-slug">{cat.slug}</span>
                      <span
                        className={
                          cat.active ? 'status-badge verified' : 'status-badge'
                        }
                      >
                        {cat.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {cat.description && <p className="taxonomy-desc">{cat.description}</p>}
                    <div className="taxonomy-meta-row">
                      <span style={{ fontSize: '0.85rem', color: '#5c6d66' }}>
                        {subcatCount} {subcatCount === 1 ? 'subcategory' : 'subcategories'}
                      </span>
                    </div>
                  </div>

                  <div className="owner-business-actions">
                    <button
                      type="button"
                      className="nav-link"
                      onClick={() => {
                        onAddSubcategory(cat.id)
                      }}
                    >
                      + Subcategory
                    </button>
                    <button
                      type="button"
                      className="nav-link"
                      onClick={() => {
                        onViewSubcategories(cat.id)
                      }}
                    >
                      View Subcategories
                    </button>
                    <button
                      type="button"
                      className="nav-link"
                      onClick={() => startEditCategory(cat)}
                      disabled={isActionLoading}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className={cat.active ? 'nav-link danger-button' : 'primary-button inline-button'}
                      onClick={() => handleToggleCategoryActive(cat)}
                      disabled={isActionLoading}
                    >
                      {isActionLoading
                        ? 'Updating…'
                        : cat.active
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
