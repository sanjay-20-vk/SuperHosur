import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  getAdminBusinesses,
  updateBusinessVisibility,
  rejectBusiness,
  type BusinessRecord,
  type BusinessVisibilityUpdate,
} from '../services/businesses'
import {
  getAdminReviewPhotos,
  getPhotoErrorMessage,
  updatePhotoModeration,
  type AdminBusinessPhoto,
} from '../services/photos'
import {
  getAdminReviewVideos,
  getVideoErrorMessage,
  updateVideoModeration,
  type AdminBusinessVideo,
} from '../services/videos'
import {
  getAdminReviewReviews,
  getReviewErrorMessage,
  updateReviewModeration,
  type AdminBusinessReview,
} from '../services/reviews'
import {
  getAdminCategories,
  getAdminSubcategories,
  getCategoryErrorMessage,
  type CategoryRecord,
  type SubcategoryRecord,
} from '../services/categories'
import {
  getAdminProperties,
  getAdminReviewPropertyPhotos,
  updatePropertyModeration,
  rejectProperty,
  updatePropertyPhotoModeration,
  getPropertyErrorMessage,
  type PropertySummary,
  type AdminPropertyPhoto,
  type PropertyModerationUpdate,
} from '../services/properties'
import {
  getAdminRequirements,
  updateAdminRequirementStatus,
  getRequirementErrorMessage,
  type AdminRequirementRecord,
  type RequirementStatus,
} from '../services/requirements'
import {
  getAdminUsers,
  updateAdminUserRole,
  setAdminUserActive,
  type AdminUserRecord,
  type UserRole,
} from '../services/users'

import { AdminBusinessModeration } from '../components/admin/AdminBusinessModeration'
import { AdminReviewsModeration } from '../components/admin/AdminReviewsModeration'
import { AdminCategoryManagement } from '../components/admin/AdminCategoryManagement'
import { AdminSubcategoryManagement } from '../components/admin/AdminSubcategoryManagement'
import { AdminPropertyModeration } from '../components/admin/AdminPropertyModeration'
import { AdminRequirementsModeration } from '../components/admin/AdminRequirementsModeration'
import { AdminUserManagement } from '../components/admin/AdminUserManagement'

function getErrorMessage(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : 'Unable to update business visibility.'
}

export type AdminBusinessesPageProps = {
  initialTab?: 'moderation' | 'taxonomy' | 'properties' | 'requirements' | 'users'
}

export function AdminBusinessesPage({ initialTab }: AdminBusinessesPageProps = {}) {
  const navigate = useNavigate()
  const location = useLocation()
  const currentTab: 'moderation' | 'taxonomy' | 'properties' | 'requirements' | 'users' =
    location.pathname === '/admin/categories'
      ? 'taxonomy'
      : location.pathname === '/admin/properties'
      ? 'properties'
      : location.pathname === '/admin/requirements'
      ? 'requirements'
      : location.pathname === '/admin/users'
      ? 'users'
      : location.pathname === '/admin/businesses'
      ? 'moderation'
      : initialTab ?? 'moderation'

  // Businesses & Moderation State
  const [businesses, setBusinesses] = useState<BusinessRecord[]>([])
  const [reviewPhotos, setReviewPhotos] = useState<AdminBusinessPhoto[]>([])
  const [reviewVideos, setReviewVideos] = useState<AdminBusinessVideo[]>([])
  const [reviewCustomerReviews, setReviewCustomerReviews] = useState<AdminBusinessReview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  // Properties State
  const [properties, setProperties] = useState<PropertySummary[]>([])
  const [reviewPropertyPhotos, setReviewPropertyPhotos] = useState<AdminPropertyPhoto[]>([])
  const [propertiesLoading, setPropertiesLoading] = useState(true)
  const [propertiesError, setPropertiesError] = useState<string | null>(null)
  const [propertyActionId, setPropertyActionId] = useState<string | null>(null)
  const [propertyFilter, setPropertyFilter] = useState<'all' | 'pending' | 'verified' | 'rejected' | 'inactive'>('pending')

  // Taxonomy (Categories & Subcategories) State
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [subcategories, setSubcategories] = useState<SubcategoryRecord[]>([])
  const [taxonomyLoading, setTaxonomyLoading] = useState(true)
  const [taxonomyError, setTaxonomyError] = useState<string | null>(null)
  const [taxonomyActionId] = useState<string | null>(null)
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all')
  const [addSubcatPresetId, setAddSubcatPresetId] = useState<string | null>(null)

  // Requirements Oversight State
  const [adminRequirements, setAdminRequirements] = useState<AdminRequirementRecord[]>([])
  const [requirementsLoading, setRequirementsLoading] = useState(true)
  const [requirementsError, setRequirementsError] = useState<string | null>(null)
  const [reqStatusFilter, setReqStatusFilter] = useState<'all' | RequirementStatus>('all')
  const [reqSearchQuery, setReqSearchQuery] = useState('')
  const [reqActionLoadingId, setReqActionLoadingId] = useState<string | null>(null)
  const [expandedMatchesReqId, setExpandedMatchesReqId] = useState<string | null>(null)

  // Users Oversight State
  const [adminUsers, setAdminUsers] = useState<AdminUserRecord[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | UserRole>('all')
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'suspended'>('all')
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [userActionLoadingId, setUserActionLoadingId] = useState<string | null>(null)

  function handleTabChange(tab: 'moderation' | 'taxonomy' | 'properties' | 'requirements' | 'users') {
    if (tab === 'taxonomy') {
      navigate('/admin/categories', { replace: true })
    } else if (tab === 'properties') {
      navigate('/admin/properties', { replace: true })
    } else if (tab === 'requirements') {
      navigate('/admin/requirements', { replace: true })
    } else if (tab === 'users') {
      navigate('/admin/users', { replace: true })
    } else {
      navigate('/admin/businesses', { replace: true })
    }
  }

  async function refreshBusinesses() {
    try {
      setError(null)
      const [bizData, photosData, videosData, reviewsData] = await Promise.all([
        getAdminBusinesses(),
        getAdminReviewPhotos(),
        getAdminReviewVideos(),
        getAdminReviewReviews(),
      ])
      setBusinesses(bizData)
      setReviewPhotos(photosData)
      setReviewVideos(videosData)
      setReviewCustomerReviews(reviewsData)
    } catch (loadError) {
      setError(getErrorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }

  async function refreshTaxonomy() {
    try {
      setTaxonomyError(null)
      const [cats, subcats] = await Promise.all([
        getAdminCategories(),
        getAdminSubcategories(),
      ])
      setCategories(cats)
      setSubcategories(subcats)
    } catch (err) {
      setTaxonomyError(getCategoryErrorMessage(err, 'Unable to load categories & subcategories.'))
    } finally {
      setTaxonomyLoading(false)
    }
  }

  async function refreshProperties() {
    try {
      setPropertiesError(null)
      const [propRows, photoRows] = await Promise.all([
        getAdminProperties(),
        getAdminReviewPropertyPhotos(),
      ])
      setProperties(propRows)
      setReviewPropertyPhotos(photoRows)
    } catch (err) {
      setPropertiesError(getPropertyErrorMessage(err, 'Unable to load properties.'))
    } finally {
      setPropertiesLoading(false)
    }
  }

  async function refreshRequirements() {
    try {
      setRequirementsLoading(true)
      setRequirementsError(null)
      const data = await getAdminRequirements()
      setAdminRequirements(data)
    } catch (err) {
      setRequirementsError(getRequirementErrorMessage(err, 'Unable to load requirements.'))
    } finally {
      setRequirementsLoading(false)
    }
  }

  async function refreshUsers() {
    try {
      setUsersLoading(true)
      setUsersError(null)
      const data = await getAdminUsers()
      setAdminUsers(data)
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : 'Unable to load users.')
    } finally {
      setUsersLoading(false)
    }
  }

  useEffect(() => {
    async function loadInitial() {
      await Promise.all([
        refreshBusinesses(),
        refreshTaxonomy(),
        refreshProperties(),
        refreshRequirements(),
        refreshUsers(),
      ])
    }

    loadInitial()
  }, [])

  // Admin Requirement Moderation Action
  async function handleAdminStatusChange(requirementId: string, newStatus: RequirementStatus) {
    if (!window.confirm(`Are you sure you want to change this requirement status to "${newStatus}"?`)) {
      return
    }
    try {
      setReqActionLoadingId(requirementId)
      await updateAdminRequirementStatus(requirementId, newStatus)
      await refreshRequirements()
    } catch (err) {
      alert(getRequirementErrorMessage(err, 'Failed to update requirement status.'))
    } finally {
      setReqActionLoadingId(null)
    }
  }

  // Admin User Moderation Actions
  async function handleAdminRoleChange(userId: string, newRole: UserRole) {
    if (!window.confirm(`Are you sure you want to update this user's role to "${newRole}"?`)) {
      return
    }
    try {
      setUserActionLoadingId(userId)
      await updateAdminUserRole(userId, newRole)
      await refreshUsers()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update user role.')
    } finally {
      setUserActionLoadingId(null)
    }
  }

  async function handleAdminUserActiveToggle(user: AdminUserRecord) {
    const action = user.active ? 'suspend' : 'reactivate'
    if (!window.confirm(`Are you sure you want to ${action} user "${user.full_name || user.email || user.id}"?`)) {
      return
    }
    try {
      setUserActionLoadingId(user.id)
      await setAdminUserActive(user.id, !user.active)
      await refreshUsers()
    } catch (err) {
      alert(err instanceof Error ? err.message : `Failed to ${action} user.`)
    } finally {
      setUserActionLoadingId(null)
    }
  }

  // Property Moderation Actions (Atomic single-update operations)
  async function updatePropertyStatus(
    prop: PropertySummary,
    input: PropertyModerationUpdate,
    confirmMessage?: string,
  ) {
    if (confirmMessage && !window.confirm(confirmMessage)) return

    try {
      setPropertyActionId(prop.id)
      setPropertiesError(null)
      await updatePropertyModeration(prop.id, input)
      await refreshProperties()
    } catch (err) {
      setPropertiesError(getPropertyErrorMessage(err, 'Unable to update property.'))
    } finally {
      setPropertyActionId(null)
    }
  }

  async function handleRejectProperty(
    prop: PropertySummary,
    rejectionReason: string,
  ) {
    try {
      setPropertyActionId(prop.id)
      setPropertiesError(null)
      await rejectProperty(prop.id, rejectionReason)
      await refreshProperties()
    } catch (err) {
      setPropertiesError(getPropertyErrorMessage(err, 'Unable to reject property listing.'))
      throw err
    } finally {
      setPropertyActionId(null)
    }
  }

  async function updatePropPhotoStatus(
    photo: AdminPropertyPhoto,
    status: 'approved' | 'rejected',
    confirmMessage: string,
  ) {
    if (!window.confirm(confirmMessage)) return

    try {
      setPropertyActionId(photo.id)
      setPropertiesError(null)
      await updatePropertyPhotoModeration(photo.id, status)
      await refreshProperties()
    } catch (err) {
      setPropertiesError(getPropertyErrorMessage(err, 'Unable to update photo moderation.'))
    } finally {
      setPropertyActionId(null)
    }
  }

  async function updateVisibility(
    business: BusinessRecord,
    input: BusinessVisibilityUpdate,
    confirmation?: string,
  ) {
    if (confirmation && !window.confirm(confirmation)) return

    try {
      setActionLoadingId(business.id)
      setError(null)
      await updateBusinessVisibility(business.id, input)
      await refreshBusinesses()
    } catch (updateError) {
      setError(getErrorMessage(updateError))
    } finally {
      setActionLoadingId(null)
    }
  }

  async function handleRejectBusiness(
    business: BusinessRecord,
    rejectionReason: string,
  ) {
    try {
      setActionLoadingId(business.id)
      setError(null)
      await rejectBusiness(business.id, rejectionReason)
      await refreshBusinesses()
    } catch (updateError) {
      setError(getErrorMessage(updateError))
      throw updateError
    } finally {
      setActionLoadingId(null)
    }
  }

  async function updatePhotoStatus(
    photo: AdminBusinessPhoto,
    moderationStatus: 'approved' | 'rejected',
    confirmation: string,
  ) {
    if (!window.confirm(confirmation)) return

    try {
      setActionLoadingId(photo.id)
      setError(null)
      await updatePhotoModeration(photo.id, moderationStatus)
      await refreshBusinesses()
    } catch (updateError) {
      setError(getPhotoErrorMessage(updateError, 'Unable to update this photo.'))
    } finally {
      setActionLoadingId(null)
    }
  }

  async function updateVideoStatus(
    video: AdminBusinessVideo,
    moderationStatus: 'approved' | 'rejected',
    confirmation: string,
  ) {
    if (!window.confirm(confirmation)) return

    try {
      setActionLoadingId(video.id)
      setError(null)
      await updateVideoModeration(video.id, moderationStatus)
      await refreshBusinesses()
    } catch (updateError) {
      setError(getVideoErrorMessage(updateError, 'Unable to update this video.'))
    } finally {
      setActionLoadingId(null)
    }
  }

  async function updateCustomerReviewStatus(
    review: AdminBusinessReview,
    moderationStatus: 'approved' | 'rejected',
    confirmation: string,
  ) {
    if (!window.confirm(confirmation)) return

    try {
      setActionLoadingId(review.id)
      setError(null)
      await updateReviewModeration(review.id, moderationStatus)
      await refreshBusinesses()
    } catch (updateError) {
      setError(getReviewErrorMessage(updateError, 'Unable to update this review.'))
    } finally {
      setActionLoadingId(null)
    }
  }

  return (
    <section className="page-section owner-dashboard admin-page">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Administration</p>
          <h1>Admin Portal</h1>
        </div>
        <Link to="/" className="nav-link">
          Back to marketplace
        </Link>
      </div>

      {/* Tab Switcher */}
      <div className="admin-tab-bar" role="tablist" aria-label="Admin Sections" style={{ flexWrap: 'wrap', gap: '8px' }}>
        <button
          type="button"
          role="tab"
          aria-selected={currentTab === 'moderation'}
          className={`admin-tab-btn ${currentTab === 'moderation' ? 'active' : ''}`}
          onClick={() => handleTabChange('moderation')}
        >
          Moderation & Listings ({businesses.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={currentTab === 'requirements'}
          className={`admin-tab-btn ${currentTab === 'requirements' ? 'active' : ''}`}
          onClick={() => handleTabChange('requirements')}
        >
          Customer Requirements ({adminRequirements.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={currentTab === 'users'}
          className={`admin-tab-btn ${currentTab === 'users' ? 'active' : ''}`}
          onClick={() => handleTabChange('users')}
        >
          Users & Profiles ({adminUsers.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={currentTab === 'properties'}
          className={`admin-tab-btn ${currentTab === 'properties' ? 'active' : ''}`}
          onClick={() => handleTabChange('properties')}
        >
          Properties & Real Estate ({properties.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={currentTab === 'taxonomy'}
          className={`admin-tab-btn ${currentTab === 'taxonomy' ? 'active' : ''}`}
          onClick={() => handleTabChange('taxonomy')}
        >
          Categories & Subcategories ({categories.length})
        </button>
      </div>

      {/* TAB 1: MODERATION & LISTINGS */}
      {currentTab === 'moderation' && (
        <>
          <div className="table-responsive">
            <AdminBusinessModeration
              businesses={businesses}
              reviewPhotos={reviewPhotos}
              reviewVideos={reviewVideos}
              loading={loading}
              error={error}
              actionLoadingId={actionLoadingId}
              onUpdateVisibility={updateVisibility}
              onRejectBusiness={handleRejectBusiness}
              onUpdatePhotoStatus={updatePhotoStatus}
              onUpdateVideoStatus={updateVideoStatus}
            />
          </div>
          <div className="table-responsive">
            <AdminReviewsModeration
              reviews={reviewCustomerReviews}
              loading={loading}
              actionLoadingId={actionLoadingId}
              onUpdateReviewStatus={updateCustomerReviewStatus}
            />
          </div>
        </>
      )}

      {/* TAB 2: CATEGORIES & SUBCATEGORIES MANAGEMENT */}
      {currentTab === 'taxonomy' && (
        <div className="admin-taxonomy-container">
          {taxonomyLoading && (
            <div className="state-panel">
              <p>Loading categories and subcategories…</p>
            </div>
          )}

          {!taxonomyLoading && taxonomyError && (
            <div className="state-panel error-state">
              <h3>Taxonomy error</h3>
              <p>{taxonomyError}</p>
            </div>
          )}

          <div className="table-responsive">
            <AdminCategoryManagement
              categories={categories}
              subcategories={subcategories}
              loading={taxonomyLoading}
              error={taxonomyError}
              actionId={taxonomyActionId}
              onRefresh={refreshTaxonomy}
              onAddSubcategory={(catId) => {
                setSelectedCategoryFilter(catId)
                setAddSubcatPresetId(catId)
              }}
              onViewSubcategories={(catId) => {
                setSelectedCategoryFilter(catId)
              }}
            />
          </div>

          {/* Responsive table wrapper for subcategories (filteredSubcategories.map) */}
          <div className="table-responsive">
            <AdminSubcategoryManagement
              categories={categories}
              subcategories={subcategories}
              loading={taxonomyLoading}
              selectedCategoryFilter={selectedCategoryFilter}
              onSelectCategoryFilter={setSelectedCategoryFilter}
              addSubcatPresetId={addSubcatPresetId}
              onClearSubcatPreset={() => setAddSubcatPresetId(null)}
              actionId={taxonomyActionId}
              onRefresh={refreshTaxonomy}
            />
          </div>
        </div>
      )}

      {/* TAB 3: PROPERTIES & REAL ESTATE */}
      {currentTab === 'properties' && (
        /* Responsive table wrapper for {properties} oversight */
        <div className="table-responsive">
          <AdminPropertyModeration
            properties={properties}
            reviewPhotos={reviewPropertyPhotos}
            loading={propertiesLoading}
            error={propertiesError}
            actionId={propertyActionId}
            filter={propertyFilter}
            onFilterChange={setPropertyFilter}
            onUpdateStatus={updatePropertyStatus}
            onRejectProperty={handleRejectProperty}
            onUpdatePhotoStatus={updatePropPhotoStatus}
          />
        </div>
      )}

      {/* TAB 4: CUSTOMER REQUIREMENTS OVERSIGHT */}
      {currentTab === 'requirements' && (
        /* Responsive table wrapper for requirements (filteredRequirements.map) */
        <div className="table-responsive">
          <AdminRequirementsModeration
            requirements={adminRequirements}
            loading={requirementsLoading}
            error={requirementsError}
            actionLoadingId={reqActionLoadingId}
            statusFilter={reqStatusFilter}
            onStatusFilterChange={setReqStatusFilter}
            searchQuery={reqSearchQuery}
            onSearchQueryChange={setReqSearchQuery}
            expandedMatchesReqId={expandedMatchesReqId}
            onToggleMatchesExpand={(id) =>
              setExpandedMatchesReqId((prev) => (prev === id ? null : id))
            }
            onRefresh={refreshRequirements}
            onStatusChange={handleAdminStatusChange}
          />
        </div>
      )}

      {/* TAB 5: USERS & PROFILES OVERSIGHT */}
      {currentTab === 'users' && (
        /* Responsive table wrapper for users (filteredUsers.map) */
        <div className="table-responsive">
          <AdminUserManagement
            users={adminUsers}
            loading={usersLoading}
            error={usersError}
            actionLoadingId={userActionLoadingId}
            roleFilter={userRoleFilter}
            onRoleFilterChange={setUserRoleFilter}
            statusFilter={userStatusFilter}
            onStatusFilterChange={setUserStatusFilter}
            searchQuery={userSearchQuery}
            onSearchQueryChange={setUserSearchQuery}
            onRefresh={refreshUsers}
            onRoleChange={handleAdminRoleChange}
            onActiveToggle={handleAdminUserActiveToggle}
          />
        </div>
      )}
    </section>
  )
}