import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthGuard } from './core/auth/auth.guard.jsx'
import { DashboardLayout } from './core/layout/dashboard-layout/dashboard-layout.jsx'
import { CourierManagePage } from './pages/courier-manage-page/courier-manage-page.jsx'
import { CourierPayrollPage } from './pages/courier-payroll-page/courier-payroll-page.jsx'
import { CourierCommentTemplatesPage } from './pages/courier-comment-templates-page/courier-comment-templates-page.jsx'
import { CitiesPage } from './pages/cities-page/cities-page.jsx'
import { DeliveryItemsPage } from './pages/delivery-items-page/delivery-items-page.jsx'
import { DistrictsPage } from './pages/districts-page/districts-page.jsx'
import { DistrictStreetsPage } from './pages/district-streets-page/district-streets-page.jsx'
import { LoginPage } from './pages/login-page/login-page.jsx'
import { PartnerManagePage } from './pages/partner-manage-page/partner-manage-page.jsx'
import { PartnerPayrollPage } from './pages/partner-payroll-page/partner-payroll-page.jsx'

function getDefaultRoute(auth) {
  return auth?.user?.role === 'admin' ? '/couriers' : '/delivery-items'
}

export function AppRoutes({ auth, onAuthChange }) {
  const defaultRoute = getDefaultRoute(auth)

  return (
    <Routes>
      <Route
        path="/login"
        element={<LoginPage auth={auth} onAuthChange={onAuthChange} />}
      />
      <Route
        path="/"
        element={
          <AuthGuard auth={auth}>
            <DashboardLayout auth={auth} onAuthChange={onAuthChange} />
          </AuthGuard>
        }
      >
        <Route
          index
          element={<Navigate to={auth?.user?.role === 'admin' ? 'couriers' : 'delivery-items'} replace />}
        />
        <Route
          path="couriers"
          element={auth?.user?.role === 'admin' ? <CourierManagePage auth={auth} /> : <Navigate to="/delivery-items" replace />}
        />
        <Route
          path="courier-payroll"
          element={auth?.user?.role === 'admin' ? <CourierPayrollPage auth={auth} /> : <Navigate to="/delivery-items" replace />}
        />
        <Route
          path="partner-payroll"
          element={auth?.user?.role === 'admin' ? <PartnerPayrollPage auth={auth} /> : <Navigate to="/delivery-items" replace />}
        />
        <Route
          path="courier-comment-templates"
          element={auth?.user?.role === 'admin' ? <CourierCommentTemplatesPage auth={auth} /> : <Navigate to="/delivery-items" replace />}
        />
        <Route path="delivery-items" element={<DeliveryItemsPage auth={auth} viewScope="active" />} />
        <Route path="canceled-delivery-items" element={<DeliveryItemsPage auth={auth} viewScope="canceled" />} />
        <Route
          path="partners"
          element={auth?.user?.role === 'admin' ? <PartnerManagePage auth={auth} /> : <Navigate to="/delivery-items" replace />}
        />
        <Route
          path="districts"
          element={auth?.user?.role === 'admin' ? <DistrictsPage auth={auth} /> : <Navigate to="/delivery-items" replace />}
        />
        <Route
          path="cities"
          element={auth?.user?.role === 'admin' ? <CitiesPage auth={auth} /> : <Navigate to="/delivery-items" replace />}
        />
        <Route
          path="district-streets"
          element={auth?.user?.role === 'admin' ? <DistrictStreetsPage auth={auth} /> : <Navigate to="/delivery-items" replace />}
        />
      </Route>
      <Route
        path="*"
        element={<Navigate to={auth?.token ? defaultRoute : '/login'} replace />}
      />
    </Routes>
  )
}
