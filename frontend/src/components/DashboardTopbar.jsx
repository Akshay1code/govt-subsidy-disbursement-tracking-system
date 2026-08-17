import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import logo from '../assets/icons/logo.png'
import { FaSignOutAlt, FaUserCircle } from 'react-icons/fa'

/**
 * DashboardTopbar - shared across OfficerDashboard, FinanceDashboard, AdminDashboard
 *
 * Props:
 *  - brandTitle   {string}   primary logo title
 *  - brandSubtitle {string}  subtitle under the logo
 *  - userName     {string}    display name shown in the user badge
 *  - userRole     {string}    role label shown in brackets
 *  - onLogout     {function}  logout handler
 *  - homeLink     {string}    optional back/home link
 *  - homeLabel    {string}    label for the home link
 *  - extraActions {ReactNode} optional extra buttons rendered before Logout
 */
export default function DashboardTopbar({
  brandTitle = 'GS Gov Subsidy',
  brandSubtitle = 'Officer Portal',
  userName = '',
  userRole = '',
  onLogout,
  homeLink = '/',
  homeLabel = 'Back to Home',
  extraActions = null,
  showHomeLink = true,
}) {
  return (
    <header className="topbar" style={{ background: 'var(--panel-strong)', borderBottom: '1px solid var(--border)' }}>
      <div className="topbar__brand">
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <img src={logo} alt="GS Gov Subsidy Logo" className="brand-logo" />
          <div>
            <strong>{brandTitle}</strong>
            <span>{brandSubtitle}</span>
          </div>
        </Link>
      </div>

      <div className="topbar__user-info">
        {userName && (
          <span className="user-badge">
            <FaUserCircle style={{ fontSize: '1rem', opacity: 0.8 }} />
            {userName}{userRole ? ` (${userRole})` : ''}
          </span>
        )}

        {showHomeLink && homeLink && (
          <Link to={homeLink} className="button button--ghost" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
            {homeLabel}
          </Link>
        )}

        {extraActions}

        {onLogout && (
          <motion.button
            onClick={onLogout}
            className="btn-logout"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Logout
            <FaSignOutAlt />
          </motion.button>
        )}
      </div>
    </header>
  )
}
