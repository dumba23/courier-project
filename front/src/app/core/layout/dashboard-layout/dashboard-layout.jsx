import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { apiRequest } from '../../http/api.js'
import './dashboard-layout.scss'

export function DashboardLayout({ auth, onAuthChange }) {
  const navigate = useNavigate()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  async function handleLogout() {
    try {
      await apiRequest('/api/logout', {
        method: 'POST',
        token: auth?.token,
      })
    } catch {
      // Local logout should still work if the API call fails.
    } finally {
      onAuthChange(null)
      navigate('/login', { replace: true })
    }
  }

  return (
    <main
      className={`dashboard-layout${isSidebarOpen ? ' dashboard-layout--sidebar-open' : ''}`}
    >
      <header className="dashboard-layout__topbar">
        <div className="dashboard-layout__left">
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setIsSidebarOpen((current) => !current)}
            aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            aria-expanded={isSidebarOpen}
          >
            <span />
            <span />
            <span />
          </button>

          <div className="dashboard-layout__brand">
            <strong>Courier</strong>
          </div>
        </div>

        <div className="dashboard-layout__account">
          <strong>{auth?.user?.name ?? 'Admin'}</strong>
          <span className="dashboard-layout__role">{auth?.user?.role}</span>
        </div>

        <button type="button" className="button-secondary" onClick={handleLogout}>
          Log out
        </button>
      </header>

      <aside className="dashboard-layout__sidebar">
        <div className="dashboard-layout__sidebar-title">Navigation</div>
        <nav className="dashboard-layout__sidebar-nav">
          <NavLink
            className="nav-link nav-link--sidebar"
            to="/couriers"
            onClick={() => setIsSidebarOpen(false)}
          >
            Couriers
          </NavLink>
        </nav>
      </aside>

      <button
        type="button"
        className={`dashboard-layout__backdrop${isSidebarOpen ? ' is-visible' : ''}`}
        aria-label="Close sidebar"
        onClick={() => setIsSidebarOpen(false)}
      />

      <section className="dashboard-layout__content">
        <Outlet />
      </section>
    </main>
  )
}
