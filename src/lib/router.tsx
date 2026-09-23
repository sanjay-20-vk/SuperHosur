import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { LoadingState } from '../components/LoadingState'
import { useAuth } from '../hooks/useAuth'

const HomePage = lazy(() => import('../pages/HomePage').then((m) => ({ default: m.HomePage })))
const AuthPage = lazy(() => import('../pages/AuthPage').then((m) => ({ default: m.AuthPage })))
const ResetPasswordPage = lazy(() => import('../pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })))
const AdminBusinessesPage = lazy(() => import('../pages/AdminBusinessesPage').then((m) => ({ default: m.AdminBusinessesPage })))
const CatalogPage = lazy(() => import('../pages/CatalogPage').then((m) => ({ default: m.CatalogPage })))
const ProductDetailPage = lazy(() => import('../pages/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage })))
const ServiceDetailPage = lazy(() => import('../pages/ServiceDetailPage').then((m) => ({ default: m.ServiceDetailPage })))
const PropertiesPage = lazy(() => import('../pages/PropertiesPage').then((m) => ({ default: m.PropertiesPage })))
const PropertyDetailPage = lazy(() => import('../pages/PropertyDetailPage').then((m) => ({ default: m.PropertyDetailPage })))
const CreatePropertyPage = lazy(() => import('../pages/CreatePropertyPage').then((m) => ({ default: m.CreatePropertyPage })))
const OwnerDashboardPage = lazy(() => import('../pages/OwnerDashboardPage').then((m) => ({ default: m.OwnerDashboardPage })))
const CreateBusinessPage = lazy(() => import('../pages/CreateBusinessPage').then((m) => ({ default: m.CreateBusinessPage })))
const BusinessDetailPage = lazy(() => import('../pages/BusinessDetailPage').then((m) => ({ default: m.BusinessDetailPage })))
const ManageBusinessSupplyPage = lazy(() => import('../pages/ManageBusinessSupplyPage').then((m) => ({ default: m.ManageBusinessSupplyPage })))
const PostRequirementPage = lazy(() => import('../pages/PostRequirementPage').then((m) => ({ default: m.PostRequirementPage })))
const MyRequirementsPage = lazy(() => import('../pages/MyRequirementsPage').then((m) => ({ default: m.MyRequirementsPage })))
const ProfilePage = lazy(() => import('../pages/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const NotificationsPage = lazy(() => import('../pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })))

type RouteConfig = {
  path: string
  element: ReactNode
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation()
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="page-section state-panel">
        <p>Checking your access…</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/signin" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { isAdmin, loading } = useAuth()

  if (loading) {
    return <div className="page-section state-panel"><p>Checking your admin access…</p></div>
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

const routes: RouteConfig[] = [
  { path: '/', element: <HomePage /> },
  { path: '/auth/signin', element: <AuthPage /> },
  { path: '/auth/signup', element: <AuthPage /> },
  { path: '/auth/forgot-password', element: <AuthPage /> },
  { path: '/auth/reset-password', element: <ResetPasswordPage /> },
  { path: '/auth', element: <Navigate to="/auth/signin" replace /> },
  {
    path: '/admin',
    element: <Navigate to="/admin/businesses" replace />,
  },
  {
    path: '/admin/businesses',
    element: (
      <AdminRoute>
        <AdminBusinessesPage initialTab="moderation" />
      </AdminRoute>
    ),
  },
  {
    path: '/admin/categories',
    element: (
      <AdminRoute>
        <AdminBusinessesPage initialTab="taxonomy" />
      </AdminRoute>
    ),
  },
  {
    path: '/admin/properties',
    element: (
      <AdminRoute>
        <AdminBusinessesPage initialTab="properties" />
      </AdminRoute>
    ),
  },
  {
    path: '/admin/requirements',
    element: (
      <AdminRoute>
        <AdminBusinessesPage initialTab="requirements" />
      </AdminRoute>
    ),
  },
  {
    path: '/admin/users',
    element: (
      <AdminRoute>
        <AdminBusinessesPage initialTab="users" />
      </AdminRoute>
    ),
  },
  {
    path: '/catalog',
    element: <CatalogPage />,
  },
  {
    path: '/products/:productId',
    element: <ProductDetailPage />,
  },
  {
    path: '/services/:serviceId',
    element: <ServiceDetailPage />,
  },
  {
    path: '/properties',
    element: <PropertiesPage />,
  },
  {
    path: '/properties/:propertyId',
    element: <PropertyDetailPage />,
  },
  {
    path: '/owner/properties/create',
    element: (
      <ProtectedRoute>
        <CreatePropertyPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/owner/properties/:propertyId/edit',
    element: (
      <ProtectedRoute>
        <CreatePropertyPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/owner',
    element: (
      <ProtectedRoute>
        <OwnerDashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/owner/onboarding',
    element: (
      <ProtectedRoute>
        <CreateBusinessPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/owner/create',
    element: (
      <ProtectedRoute>
        <CreateBusinessPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/businesses/:businessId',
    element: <BusinessDetailPage />,
  },
  {
    path: '/owner/businesses/:businessId',
    element: (
      <ProtectedRoute>
        <BusinessDetailPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/owner/businesses/:businessId/edit',
    element: (
      <ProtectedRoute>
        <CreateBusinessPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/owner/businesses/:businessId/offerings',
    element: (
      <ProtectedRoute>
        <ManageBusinessSupplyPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/requirements/new',
    element: (
      <ProtectedRoute>
        <PostRequirementPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/my-requirements',
    element: (
      <ProtectedRoute>
        <MyRequirementsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/profile',
    element: (
      <ProtectedRoute>
        <ProfilePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/notifications',
    element: (
      <ProtectedRoute>
        <NotificationsPage />
      </ProtectedRoute>
    ),
  },
  { path: '*', element: <Navigate to="/" replace /> },
]

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingState message="Loading SuperHosur…" />}>
        <Routes>
          {routes.map((route) => (
            <Route key={route.path} path={route.path} element={route.element} />
          ))}
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
