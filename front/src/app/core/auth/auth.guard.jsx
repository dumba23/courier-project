import { Navigate, useLocation } from 'react-router-dom'

export function AuthGuard({ auth, children }) {
  const location = useLocation()

  if (!auth?.token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}
