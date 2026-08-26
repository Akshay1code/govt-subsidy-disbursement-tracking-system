import '../../styles/Login.css';
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { login as apiLogin } from '../../services/authService'
import { clearPortalSessionCaches } from '../../services/sessionCleanup'
import logo from '../../assets/icons/logo.png'
import { FaUserPlus, FaFileSignature, FaChartPie, FaRegCheckCircle } from 'react-icons/fa'

function EyeIcon({ open }) {
  return open ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForgotModal, setShowForgotModal] = useState(false)

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.identifier.trim()) { setError('Please enter your Username.'); return }
    if (!form.password) { setError('Please enter your password.'); return }

    setLoading(true)
    try {
      const result = await apiLogin({ username: form.identifier.trim(), password: form.password })

      if (result.status) {
        clearPortalSessionCaches()
        try {
          const { default: api } = await import('../../services/api')
          const profileRes = await api.get('/gov/auth/profile/get')
          const user = profileRes.data?.data || profileRes.data
          const role = user?.role?.toUpperCase()

          if (role === 'ADMIN') navigate('/admin/dashboard')
          else if (role === 'FINANCE_OFFICER') navigate('/finance')
          else if (role?.includes('OFFICER')) navigate('/officer/dashboard')
          else navigate('/dashboard', { state: { fromLogin: true } })
        } catch {
          navigate('/dashboard', { state: { fromLogin: true } })
        }
      } else {
        setError(result.message || 'Incorrect credentials. Please check and try again.')
      }
    } catch (err) {
      console.error('Login error:', err)
      const message = String(err?.message || '').toLowerCase()
      if (message.includes('username not found')) setError('Username not found')
      else if (message.includes('password is incorrect') || message.includes('bad credentials')) setError('Password is incorrect')
      else setError('Server is down or unavailable')
    } finally {
      setLoading(false)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.4
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
  }

  return (
    <div className="login-wrapper">
      {/* ── Left panel (Branding) ── */}
      <motion.div
        className="login-left"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className="login-left__content">
          <div className="login-brand">
            <img src={logo} alt="GS Portal Logo" className="login-brand__logo" />
            <span className="login-brand__text">GS Gov Subsidy</span>
          </div>
          
          <h1 className="login-left__title">
            Empowering Citizens<br/>through Transparency
          </h1>
          <p className="login-left__subtitle">
            Your central gateway for secure, efficient, and<br/>transparent government subsidy services.
          </p>

          <motion.div 
            className="login-left__features"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={itemVariants} className="feature-card">
              <div className="feature-card__icon"><FaUserPlus /></div>
              <h4 className="feature-card__title">Register</h4>
              <p className="feature-card__text">Create your portal account easily</p>
            </motion.div>
            <motion.div variants={itemVariants} className="feature-card">
              <div className="feature-card__icon"><FaFileSignature /></div>
              <h4 className="feature-card__title">Apply</h4>
              <p className="feature-card__text">Submit subsidy applications online</p>
            </motion.div>
            <motion.div variants={itemVariants} className="feature-card">
              <div className="feature-card__icon"><FaChartPie /></div>
              <h4 className="feature-card__title">Track</h4>
              <p className="feature-card__text">Monitor application status in real-time</p>
            </motion.div>
            <motion.div variants={itemVariants} className="feature-card">
              <div className="feature-card__icon"><FaRegCheckCircle /></div>
              <h4 className="feature-card__title">Receive</h4>
              <p className="feature-card__text">Secure and direct benefit transfers</p>
            </motion.div>
          </motion.div>
        </div>

        {/* Decorative Watermark */}
        <motion.div 
          className="login-left__watermark"
          animate={{ y: [0, -15, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </motion.div>
      </motion.div>

      {/* ── Right panel (Form) ── */}
      <motion.div
        className="login-right"
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
      >
        <div className="login-right__container">
          <div className="login-header">
            <h2>Secure Portal Access</h2>
            <p>Sign in to access your secure government dashboard for subsidy management and applications.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="form-field">
              <label htmlFor="identifier">EMAIL OR USERNAME</label>
              <div className="input-wrapper">
                <span className="input-icon"><UserIcon /></span>
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  placeholder="Enter your details"
                  autoComplete="username"
                  value={form.identifier}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="password">PASSWORD</label>
              <div className="input-wrapper">
                <span className="input-icon"><LockIcon /></span>
                <input
                  id="password"
                  name="password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="pw-toggle"
                  onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon open={showPw} />
                </button>
              </div>
            </div>

            <div className="form-options">
              <label className="checkbox-label">
                <input type="checkbox" name="remember" />
                <span>Remember me</span>
              </label>
              <button
                type="button"
                className="link-btn"
                onClick={() => setShowForgotModal(true)}
              >
                Forgot password?
              </button>
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  className="form-error"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              className="submit-btn"
              disabled={loading}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? <span className="spinner" /> : 'Sign In'}
            </motion.button>
          </form>

          <p className="register-text">
            Don't have an account? <Link to="/register">Register here</Link>
          </p>
        </div>
      </motion.div>

      {/* ── Forgot Password Modal ── */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="modal-overlay">
            <motion.div
              className="modal-content"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <button className="modal-close" onClick={() => setShowForgotModal(false)}>✕</button>
              <h3>Reset Account Password</h3>
              <p>To reset your password, please contact your portal administrator with your registered username or email.</p>
              <div className="modal-info">
                📧 <strong>admin@govsubsidyportal.in</strong><br />
                Please include your full name and registered username in the email.
              </div>
              <button className="submit-btn" onClick={() => setShowForgotModal(false)}>Close</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
