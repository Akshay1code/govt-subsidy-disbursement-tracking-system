import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import ThemeToggle from './ThemeToggle'
import logo from '../assets/icons/logo.png'
import { FaSignOutAlt, FaUserCircle } from 'react-icons/fa'

/**
 * DashboardTopbar – shared across OfficerDashboard, FinanceDashboard, AdminDashboard
 *
 * Props:
 *  - portalName   {string}   subtitle under the logo, e.g. "Officer Portal"
 *  - userName     {string}   display name shown in the user badge
 *  - userRole     {string}   role label shown in brackets
 *  - onLogout     {function} logout handler
 *  - extraActions {ReactNode} optional extra buttons rendered after ThemeToggle
 */
export default function DashboardTopbar({
  portalName = 'Officer Portal',
  userName = '',
  userRole = '',
  onLogout,
  extraActions = null,
}) {
  return (
    <header className="topbar" style={{ background: 'var(--panel-strong)', borderBottom: '1px solid var(--border)' }}>
      {/* Brand */}
      <div className="topbar__brand">
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <img src={logo} alt="GS Gov Subsidy Logo" className="brand-logo" />
          <div>
            <strong style={{ color: 'var(--text)' }}>GS Gov Subsidy</strong>
            <span style={{ color: 'var(--muted)', display: 'block', fontSize: '0.75rem' }}>{portalName}</span>
          </div>
        </Link>
      </div>

      {/* Right side controls */}
      <div className="topbar__user-info">
        {userName && (
          <span className="user-badge">
            <FaUserCircle style={{ fontSize: '1rem', opacity: 0.8 }} />
            {userName}{userRole ? ` (${userRole})` : ''}
          </span>
        )}

        <ThemeToggle />

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
