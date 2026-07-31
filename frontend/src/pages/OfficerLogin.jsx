import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

// Fixed default officer credentials
const DEFAULT_OFFICERS = [
  {
    officerId: 'OFF001',
    password: 'admin123',
    fullName: 'Anil Verma',
    designation: 'District Officer',
    email: 'anil.verma@gov.in',
    department: 'Agriculture & Farmers Welfare',
    district: 'North Delhi'
  },
  {
    officerId: 'OFF002',
    password: 'officer123',
    fullName: 'Dr. Sunita Sharma',
    designation: 'Financial Officer',
    email: 'sunita.sharma@gov.in',
    department: 'Education & Youth Welfare',
    district: 'Pune'
  },
  {
    officerId: 'OFF003',
    password: 'officer123',
    fullName: 'Rajesh Gupta',
    designation: 'Field Officer',
    email: 'rajesh.gupta@gov.in',
    department: 'Housing & Urban Affairs',
    district: 'Lucknow'
  }
]

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

export default function OfficerLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const prefilledId = location.state?.registeredId || ''

  const [form, setForm] = useState({ officerId: prefilledId || '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Officer Forgot Password State
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [forgotStep, setForgotStep] = useState(1)
  const [forgotInput, setForgotInput] = useState('')
  const [forgotOtp, setForgotOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [forgotError, setForgotError] = useState('')
  const [forgotSuccess, setForgotSuccess] = useState('')
  const [matchedOfficerObj, setMatchedOfficerObj] = useState(null)

  function handleOfficerForgot1(e) {
    e.preventDefault()
    setForgotError('')
    if (!forgotInput.trim()) { setForgotError('Please enter your Officer ID or Email.'); return }

    const inputUpper = forgotInput.trim().toUpperCase()
    const inputLower = forgotInput.trim().toLowerCase()

    // Check defaults & registered officers
    const defaultMatch = DEFAULT_OFFICERS.find(o => o.officerId.toUpperCase() === inputUpper || o.email?.toLowerCase() === inputLower)
    const storedOfficers = JSON.parse(localStorage.getItem('gov-subsidy-officers') || '[]')
    const registeredMatch = storedOfficers.find(o => o.officerId.toUpperCase() === inputUpper || o.email?.toLowerCase() === inputLower)

    const match = defaultMatch || registeredMatch
    if (match) {
      setMatchedOfficerObj(match)
      setForgotStep(2)
      setForgotSuccess(`Officer Account ${match.officerId} (${match.fullName}) identified! OTP sent.`)
    } else {
      setForgotError('No Officer account found matching that Officer ID or Email.')
    }
  }

  function handleOfficerForgot2(e) {
    e.preventDefault()
    setForgotError('')
    if (forgotOtp.trim() === '5678') {
      setForgotStep(3)
      setForgotSuccess('OTP verified successfully! Set your new officer password.')
    } else {
      setForgotError('Invalid Officer OTP code. Please enter 5678.')
    }
  }

  function handleOfficerForgot3(e) {
    e.preventDefault()
    setForgotError('')
    if (!newPassword || newPassword.length < 4) { setForgotError('Password must be at least 4 characters long.'); return }

    if (matchedOfficerObj) {
      const storedOfficers = JSON.parse(localStorage.getItem('gov-subsidy-officers') || '[]')
      const regIndex = storedOfficers.findIndex(o => o.officerId.toUpperCase() === matchedOfficerObj.officerId.toUpperCase())
      if (regIndex !== -1) {
        storedOfficers[regIndex].password = newPassword
        localStorage.setItem('gov-subsidy-officers', JSON.stringify(storedOfficers))
      }
      matchedOfficerObj.password = newPassword
    }

    setForgotSuccess('Officer password updated successfully! Redirecting to dashboard...')
    setTimeout(() => {
      setShowForgotModal(false)
      window.localStorage.setItem('gov-subsidy-officer-auth', 'true')
      window.localStorage.setItem('gov-subsidy-officer-profile', JSON.stringify(matchedOfficerObj || DEFAULT_OFFICERS[0]))
      navigate('/officer/dashboard')
    }, 1200)
  }

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.officerId.trim()) { setError('Please enter your Officer ID.'); return }
    if (!form.password) { setError('Please enter your password.'); return }

    setLoading(true)
    await new Promise(r => setTimeout(r, 700))
    setLoading(false)

    const enteredId = form.officerId.trim().toUpperCase()

    // 1. Check default officers
    const defaultMatch = DEFAULT_OFFICERS.find(off => off.officerId.toUpperCase() === enteredId && off.password === form.password)
    if (defaultMatch) {
      window.localStorage.setItem('gov-subsidy-officer-auth', 'true')
      window.localStorage.setItem('gov-subsidy-officer-profile', JSON.stringify(defaultMatch))
      navigate('/officer/dashboard')
      return
    }

    // 2. Check dynamic registered officers from localStorage
    const storedOfficers = window.localStorage.getItem('gov-subsidy-officers')
    const officersList = storedOfficers ? JSON.parse(storedOfficers) : []
    const registeredMatch = officersList.find(off => off.officerId.toUpperCase() === enteredId && off.password === form.password)

    if (registeredMatch) {
      window.localStorage.setItem('gov-subsidy-officer-auth', 'true')
      window.localStorage.setItem('gov-subsidy-officer-profile', JSON.stringify(registeredMatch))
      navigate('/officer/dashboard')
      return
    }

    setError('Invalid Officer ID or password. Please check your credentials or register.')
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
            <img src="/logo.png" alt="GS Portal Logo" className="login-page__logo" />
            <span>GS Officer Login</span>
          </Link>
        </div>

        <div className="login-page__form-area">
          <div className="login-page__copy">
            <h1>Officer Login</h1>
            <p>Verify documents, approve or reject subsidy applications, and manage workflow.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {/* Officer ID */}
            <div className="login-form__field">
              <label htmlFor="officerId">Officer ID</label>
              <div className="login-form__input-wrap">
                <svg className="login-form__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <input
                  id="officerId"
                  name="officerId"
                  type="text"
                  placeholder="Enter your Officer ID (e.g. OFF001)"
                  autoComplete="username"
                  value={form.officerId}
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
                onClick={() => { setShowForgotModal(true); setForgotStep(1); setForgotError(''); setForgotSuccess('') }}
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
                'Login to Officer Dashboard'
              )}
            </motion.button>
          </form>

          <p className="login-page__register">
            New officer?{' '}
            <Link to="/officer/register" style={{ color: 'var(--accent-strong)', fontWeight: 600 }}>Register officer credentials</Link>
          </p>
          <p className="login-page__register" style={{ marginTop: '0.4rem' }}>
            Not an officer?{' '}
            <Link to="/login">Beneficiary login</Link>
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

      {/* ── Officer Forgot Password Modal ── */}
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

              <h2 style={{ fontSize: '1.4rem', margin: '0 0 0.5rem', color: 'var(--text)' }}>Officer Password Reset</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1.25rem' }}>
                {forgotStep === 1 && 'Enter your official Officer ID or Govt Email Address.'}
                {forgotStep === 2 && 'Enter the 4-digit Officer Verification OTP.'}
                {forgotStep === 3 && 'Choose a new official password for your Officer ID.'}
              </p>

              {forgotError && (
                <div style={{ padding: '0.6rem 0.9rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', fontSize: '0.82rem', marginBottom: '1rem' }}>
                  {forgotError}
                </div>
              )}

              {forgotSuccess && (
                <div style={{ padding: '0.6rem 0.9rem', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#22c55e', fontSize: '0.82rem', marginBottom: '1rem' }}>
                  {forgotSuccess}
                </div>
              )}

              {/* STEP 1: Verify Officer ID */}
              {forgotStep === 1 && (
                <form onSubmit={handleOfficerForgot1}>
                  <div className="login-form__field" style={{ marginBottom: '1.2rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text)' }}>Officer ID or Official Email</label>
                    <input
                      type="text"
                      placeholder="e.g. OFF001 or officer@gov.in"
                      value={forgotInput}
                      onChange={e => setForgotInput(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                      required
                    />
                  </div>
                  <button type="submit" className="button button--primary" style={{ width: '100%' }}>
                    Verify Officer & Send OTP
                  </button>
                </form>
              )}

              {/* STEP 2: Verify OTP */}
              {forgotStep === 2 && (
                <form onSubmit={handleOfficerForgot2}>
                  <div style={{ background: 'rgba(255,255,255,0.04)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.82rem', color: '#ffc76a' }}>
                    💡 Simulated Officer OTP Code: <strong>5678</strong>
                  </div>
                  <div className="login-form__field" style={{ marginBottom: '1.2rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text)' }}>4-Digit Officer Verification OTP</label>
                    <input
                      type="text"
                      placeholder="Enter 5678"
                      maxLength="4"
                      value={forgotOtp}
                      onChange={e => setForgotOtp(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', textAlign: 'center', fontSize: '1.2rem', letterSpacing: '0.4em' }}
                      required
                    />
                  </div>
                  <button type="submit" className="button button--primary" style={{ width: '100%' }}>
                    Confirm OTP
                  </button>
                </form>
              )}

              {/* STEP 3: Reset Password */}
              {forgotStep === 3 && (
                <form onSubmit={handleOfficerForgot3}>
                  <div className="login-form__field" style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text)' }}>New Officer Password</label>
                    <input
                      type="password"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                      required
                    />
                  </div>
                  <button type="submit" className="button button--primary" style={{ width: '100%' }}>
                    Update Officer Password & Log In
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

