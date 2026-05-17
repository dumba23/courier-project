import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { apiRequest } from '../../http/api.js'
import { useI18n } from '../../i18n/i18n.context.jsx'
import {
  BuildingIcon,
  CloseIcon,
  MapPinIcon,
  NoteIcon,
  PackageIcon,
  RoadIcon,
  UserIcon,
  UsersIcon,
  WalletIcon,
} from '../../ui/icons.jsx'
import './dashboard-layout.scss'

export function DashboardLayout({ auth, onAuthChange }) {
  const navigate = useNavigate()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const isAdmin = auth?.user?.role === 'admin'
  const { language, setLanguage, t } = useI18n()

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
            aria-label={isSidebarOpen ? t('common.closeSidebar') : t('common.openSidebar')}
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

        <div className="dashboard-layout__topbar-actions">
          <button
            type="button"
            className="button-secondary dashboard-layout__language-toggle"
            onClick={() => setLanguage(language === 'ka' ? 'en' : 'ka')}
            aria-label={language === 'ka' ? t('lang.switchToEn') : t('lang.switchToKa')}
            title={language === 'ka' ? t('lang.switchToEn') : t('lang.switchToKa')}
          >
            {language === 'ka' ? t('lang.en') : t('lang.ka')}
          </button>
          <button type="button" className="button-secondary" onClick={handleLogout}>
            {t('nav.logout')}
          </button>
        </div>
      </header>

      <aside className="dashboard-layout__sidebar">
        <div className="dashboard-layout__sidebar-head">
          <div className="dashboard-layout__sidebar-title">{t('nav.navigation')}</div>
          <button
            type="button"
            className="button-secondary icon-button dashboard-layout__sidebar-close"
            aria-label={t('common.closeSidebar')}
            title={t('common.closeSidebar')}
            onClick={() => setIsSidebarOpen(false)}
          >
            <CloseIcon className="action-icon" />
          </button>
        </div>
        <nav className="dashboard-layout__sidebar-nav">
          <NavLink
            className="nav-link nav-link--sidebar"
            to="/delivery-items"
            onClick={() => setIsSidebarOpen(false)}
          >
            <PackageIcon className="nav-link__icon" />
            {t('nav.deliveries')}
          </NavLink>
          <NavLink
            className="nav-link nav-link--sidebar"
            to="/canceled-delivery-items"
            onClick={() => setIsSidebarOpen(false)}
          >
            <CloseIcon className="nav-link__icon" />
            {t('nav.canceled')}
          </NavLink>
          {isAdmin ? (
            <>
              <NavLink
                className="nav-link nav-link--sidebar"
                to="/couriers"
                onClick={() => setIsSidebarOpen(false)}
              >
                <UserIcon className="nav-link__icon" />
                {t('nav.couriers')}
              </NavLink>
              <NavLink
                className="nav-link nav-link--sidebar"
                to="/partners"
                onClick={() => setIsSidebarOpen(false)}
              >
                <UsersIcon className="nav-link__icon" />
                {t('nav.partners')}
              </NavLink>
              <NavLink
                className="nav-link nav-link--sidebar"
                to="/courier-payroll"
                onClick={() => setIsSidebarOpen(false)}
              >
                <WalletIcon className="nav-link__icon" />
                {t('nav.courierPayroll')}
              </NavLink>
              <NavLink
                className="nav-link nav-link--sidebar"
                to="/partner-payroll"
                onClick={() => setIsSidebarOpen(false)}
              >
                <WalletIcon className="nav-link__icon" />
                {t('nav.partnerPayroll')}
              </NavLink>
              <NavLink
                className="nav-link nav-link--sidebar"
                to="/courier-comment-templates"
                onClick={() => setIsSidebarOpen(false)}
              >
                <NoteIcon className="nav-link__icon" />
                {t('nav.commentTemplates')}
              </NavLink>
              <NavLink
                className="nav-link nav-link--sidebar"
                to="/districts"
                onClick={() => setIsSidebarOpen(false)}
              >
                <MapPinIcon className="nav-link__icon" />
                {t('nav.districts')}
              </NavLink>
              <NavLink
                className="nav-link nav-link--sidebar"
                to="/cities"
                onClick={() => setIsSidebarOpen(false)}
              >
                <BuildingIcon className="nav-link__icon" />
                {t('nav.cities')}
              </NavLink>
              <NavLink
                className="nav-link nav-link--sidebar"
                to="/district-streets"
                onClick={() => setIsSidebarOpen(false)}
              >
                <RoadIcon className="nav-link__icon" />
                {t('nav.streets')}
              </NavLink>
            </>
          ) : null}
        </nav>
      </aside>

      <button
        type="button"
        className={`dashboard-layout__backdrop${isSidebarOpen ? ' is-visible' : ''}`}
        aria-label={t('common.closeSidebar')}
        onClick={() => setIsSidebarOpen(false)}
      />

      <section className="dashboard-layout__content">
        <Outlet />
      </section>
    </main>
  )
}
