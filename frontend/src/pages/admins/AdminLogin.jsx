import '../../styles/Login.css';
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import logo from '../../assets/icons/logo.png'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!password) {
      setError('Please enter your password.')
      return
    }

    setLoading(true)
    await new Promise(r => setTimeout(r, 600))
    setLoading(false)

    // Admin password check (default: admin123)
    if (password === 'admin123' || password === 'admin') {
      window.localStorage.setItem('gov-subsidy-admin-auth', 'true')
      window.localStorage.setItem('gov-subsidy-admin-profile', JSON.stringify({
        adminId: 'ADMIN001',
        fullName: 'System Administrator',
        role: 'Chief Subsidy Nodal Admin',
        email: 'admin@govsubsidyportal.in'
      }))
      navigate('/admin/dashboard')
      return
    }

    setError('Invalid password.')
  }

  return (
    <div className="login-page">
      <motion.div
        className="login-page__left"
        initial={{ opacity: 0, x: -28 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <Link to="/" className="login-page__brand" style={{ margin: 0 }}>
            <img src={logo} alt="GS Portal Logo" className="login-page__logo" />
            <span>GS Admin Center</span>
          </Link>
        </div>

        <div className="login-page__form-area">
          <div className="login-page__copy">
            <h1>Admin Authentication</h1>
            <p>Access high-level analytics and system oversight. Please enter the administrator password.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="login-form__field">
              <label htmlFor="password">Password</label>
              <div className="login-form__input-wrap">
                <svg className="login-form__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter admin password (e.g. admin123)"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setError('')
                  }}
                />
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.p className="login-form__error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.button type="submit" className="login-form__submit" disabled={loading} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
              {loading ? <span className="login-form__spinner" /> : 'Login to Admin Dashboard'}
            </motion.button>
          </form>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2.5rem', fontSize: '0.86rem' }}>
            <Link to="/login">Go to Main Portal Login</Link>
          </div>
        </div>
      </motion.div>

      <motion.div 
        className="login-page__right" 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.1 }}
      >
        <div className="login-page__right-overlay" />
      </motion.div>
    </div>
  )
}
