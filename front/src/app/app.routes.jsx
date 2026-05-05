import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthGuard } from './core/auth/auth.guard.jsx'
import { DashboardLayout } from './core/layout/dashboard-layout/dashboard-layout.jsx'
import { CourierManagePage } from './pages/courier-manage-page/courier-manage-page.jsx'
import { LoginPage } from './pages/login-page/login-page.jsx'

export function AppRoutes({ auth, onAuthChange }) {
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
        <Route index element={<Navigate to="/couriers" replace />} />
        <Route path="couriers" element={<CourierManagePage auth={auth} />} />
      </Route>
      <Route
        path="*"
        element={<Navigate to={auth?.token ? '/couriers' : '/login'} replace />}
      />
    </Routes>
  )
}
