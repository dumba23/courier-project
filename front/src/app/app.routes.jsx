import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthGuard } from './core/auth/auth.guard.jsx'
import { DashboardLayout } from './core/layout/dashboard-layout/dashboard-layout.jsx'
import { CourierManagePage } from './pages/courier-manage-page/courier-manage-page.jsx'
import { DeliveryItemsPage } from './pages/delivery-items-page/delivery-items-page.jsx'
import { DeliveryZonesPage } from './pages/delivery-zones-page/delivery-zones-page.jsx'
import { LoginPage } from './pages/login-page/login-page.jsx'
import { PartnerManagePage } from './pages/partner-manage-page/partner-manage-page.jsx'

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
        <Route path="delivery-items" element={<DeliveryItemsPage auth={auth} />} />
        <Route
          path="partners"
          element={auth?.user?.role === 'admin' ? <PartnerManagePage auth={auth} /> : <Navigate to="/delivery-items" replace />}
        />
        <Route
          path="delivery-zones"
          element={auth?.user?.role === 'admin' ? <DeliveryZonesPage auth={auth} /> : <Navigate to="/delivery-items" replace />}
        />
      </Route>
      <Route
        path="*"
        element={<Navigate to={auth?.token ? defaultRoute : '/login'} replace />}
      />
    </Routes>
  )
}
