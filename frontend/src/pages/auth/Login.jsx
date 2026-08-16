import '../../styles/Login.css';
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { login as apiLogin } from '../../services/authService'
import logo from '../../assets/icons/logo.png'

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

// No mock data — all authentication goes through the backend API

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Forgot Password State
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
        // Fetch profile to determine role-based redirect
        try {
          const { default: api } = await import('../../services/api')
          const profileRes = await api.get('/gov/auth/profile/get')
          const user = profileRes.data?.data || profileRes.data

          const role = user?.role?.toUpperCase()

          if (role === 'ADMIN') {
            navigate('/admin/dashboard')
          } else if (role?.includes('OFFICER')) {
            navigate('/officer/dashboard')
          } else {
            navigate('/dashboard')
          }
        } catch {
          // Fallback: go to beneficiary dashboard if profile fetch fails
          navigate('/dashboard')
        }
      } else {
        setError(result.message || 'Invalid credentials. Please try again.')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError(err.message || 'Invalid username or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      {/* ── Left panel ── */}
      <motion.div
        className="login-page__left"
        initial={{ opacity: 0, x: -28 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      >
        {/* Brand & Theme */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <Link to="/" className="login-page__brand" style={{ margin: 0 }}>
            <img src={logo} alt="GS Portal Logo" className="login-page__logo" />
            <span>GS Gov Subsidy</span>
          </Link>
        </div>

        <div className="login-page__form-area">
          <div className="login-page__copy">
            <h1>Portal Login</h1>
            <p>Login as a citizen, officer, or administrator to access the government subsidy portal.</p>
          </div>

          {/* Role Info Badges */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            {[
              { label: 'Beneficiary', color: '#16a34a', icon: '👤' },
              { label: 'Officer',     color: '#0284c7', icon: '👮' },
              { label: 'Admin',       color: '#ea580c', icon: '🛡️' },
            ].map(r => (
              <span key={r.label} style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.65rem',
                borderRadius: '99px', background: `${r.color}12`,
                border: `1px solid ${r.color}30`, color: r.color
              }}>
                {r.icon} {r.label}
              </span>
            ))}
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {/* Username/ID */}
            <div className="login-form__field">
              <label htmlFor="identifier">Username / Admin ID</label>
              <div className="login-form__input-wrap">
                <svg className="login-form__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  placeholder="Enter your username"
                  autoComplete="username"
                  value={form.identifier}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Password */}
            <div className="login-form__field">
              <label htmlFor="password">Password</label>
              <div className="login-form__input-wrap">
                <svg className="login-form__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
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
                  className="login-form__pw-toggle"
                  onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon open={showPw} />
                </button>
              </div>
            </div>

            <div className="login-form__meta">
              <label className="login-form__remember">
                <input type="checkbox" name="remember" />
                <span>Remember me</span>
              </label>
              <button
                type="button"
                className="login-form__forgot"
                style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => setShowForgotModal(true)}
              >
                Forgot password?
              </button>
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  className="login-form__error"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              className="login-form__submit"
              disabled={loading}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <span className="login-form__spinner" />
              ) : (
                'Sign In'
              )}
            </motion.button>
          </form>

          <p className="login-page__register">
            New user?{' '}
            <Link to="/register">Register on portal</Link>
          </p>
        </div>
      </motion.div>

      {/* ── Right panel ── */}
      <motion.div
        className="login-page__right"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.1 }}
      >
        <div className="login-page__right-overlay" />
        <div className="login-page__right-overlay" />
      </motion.div>

      {/* ── Forgot Password Modal ── */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div
              className="modal-content"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ background: 'var(--panel-strong)', borderRadius: '16px', border: '1px solid var(--border)', maxWidth: '440px', width: '100%', padding: '2rem', position: 'relative' }}
            >
              <button
                onClick={() => setShowForgotModal(false)}
                style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 0, color: 'var(--muted)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>

              <h2 style={{ fontSize: '1.4rem', margin: '0 0 0.5rem', color: 'var(--text)' }}>Reset Account Password</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1.5rem' }}>
                To reset your password, please contact your portal administrator with your registered username or email. They will initiate the reset process from the system backend.
              </p>

              <div style={{ padding: '1rem', borderRadius: '10px', background: 'rgba(130, 174, 202, 0.08)', border: '1px solid rgba(130, 174, 202, 0.2)', fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1.5rem' }}>
                📧 <strong style={{ color: 'var(--text)' }}>admin@govsubsidyportal.in</strong>
                <br />
                Please include your full name and registered username in the email.
              </div>

              <button
                className="button button--primary"
                style={{ width: '100%' }}
                onClick={() => setShowForgotModal(false)}
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
