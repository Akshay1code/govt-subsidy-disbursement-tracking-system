import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

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

const DEFAULT_CITIZEN_PROFILE = {
  fullName: 'Rahul Sharma',
  username: 'rahul_sharma',
  email: 'rahul.sharma.farmer@gov.in',
  phone: '9876543210',
  state: 'Maharashtra',
  occupation: 'Farmer',
  annualIncome: '240000',
  landHolding: '3.5',
  aadhaar: '5829-1920-4821',
  bankName: 'State Bank of India',
  accountNumber: '38920192831',
  ifsc: 'SBIN0004829'
}

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ identifier: '', password: '', role: 'citizen' })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Forgot Password State
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [forgotStep, setForgotStep] = useState(1)
  const [forgotInput, setForgotInput] = useState('')
  const [forgotOtp, setForgotOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [forgotError, setForgotError] = useState('')
  const [forgotSuccess, setForgotSuccess] = useState('')
  const [matchedUserIndex, setMatchedUserIndex] = useState(-1)

  function handleForgotStep1(e) {
    e.preventDefault()
    setForgotError('')
    if (!forgotInput.trim()) { setForgotError('Please enter your Username or Email.'); return }

    const inputLower = forgotInput.trim().toLowerCase()
    const storedUsers = JSON.parse(localStorage.getItem('gov-subsidy-users') || '[]')
    const userIndex = storedUsers.findIndex(u => u.username?.toLowerCase() === inputLower || u.email?.toLowerCase() === inputLower)

    if (userIndex !== -1 || inputLower === 'rahul_sharma') {
      setMatchedUserIndex(userIndex)
      setForgotStep(2)
      setForgotSuccess('Account identified! OTP sent to registered mobile.')
    } else {
      setForgotError('No registered account found matching that Username or Email.')
    }
  }

  function handleForgotStep2(e) {
    e.preventDefault()
    setForgotError('')
    if (forgotOtp.trim() === '1234') {
      setForgotStep(3)
      setForgotSuccess('OTP verified successfully! Please enter your new password.')
    } else {
      setForgotError('Invalid OTP code. Please enter 1234.')
    }
  }

  function handleForgotStep3(e) {
    e.preventDefault()
    setForgotError('')
    if (!newPassword || newPassword.length < 4) { setForgotError('Password must be at least 4 characters long.'); return }

    const storedUsers = JSON.parse(localStorage.getItem('gov-subsidy-users') || '[]')
    if (matchedUserIndex !== -1 && storedUsers[matchedUserIndex]) {
      storedUsers[matchedUserIndex].password = newPassword
      localStorage.setItem('gov-subsidy-users', JSON.stringify(storedUsers))
    }

    setForgotSuccess('Password updated successfully! Logging you in...')
    setTimeout(() => {
      setShowForgotModal(false)
      window.localStorage.setItem('gov-subsidy-auth', 'true')
      window.localStorage.setItem('gov-subsidy-profile', JSON.stringify(
        matchedUserIndex !== -1 ? storedUsers[matchedUserIndex] : DEFAULT_CITIZEN_PROFILE
      ))
      navigate('/dashboard')
    }, 1200)
  }

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.identifier.trim()) { setError('Please enter your User ID or email.'); return }
    if (!form.password) { setError('Please enter your password.'); return }
    setLoading(true)
    await new Promise(r => setTimeout(r, 900))
    setLoading(false)

    // Check credentials against registered users list
    const storedUsers = window.localStorage.getItem('gov-subsidy-users')
    const usersList = storedUsers ? JSON.parse(storedUsers) : []

    const matchedUser = usersList.find(user => 
      (user.username.toLowerCase() === form.identifier.toLowerCase() || user.email?.toLowerCase() === form.identifier.toLowerCase()) && 
      user.password === form.password
    )

    if (matchedUser) {
      window.localStorage.setItem('gov-subsidy-auth', 'true')
      window.localStorage.setItem('gov-subsidy-profile', JSON.stringify(matchedUser))
      navigate('/dashboard')
      return
    }

    // Default demo login fallback
    if (form.identifier.toLowerCase() === 'rahul_sharma' && form.password === 'password') {
      window.localStorage.setItem('gov-subsidy-auth', 'true')
      window.localStorage.setItem('gov-subsidy-profile', JSON.stringify(DEFAULT_CITIZEN_PROFILE))
      navigate('/dashboard')
      return
    }

    setError('Invalid username or password. Please try again or register as a new user.')
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
            <span>GS Gov Subsidy</span>
          </Link>
        </div>

        <div className="login-page__form-area">
          <div className="login-page__copy">
            <h1>Login to Portal</h1>
            <p>Access schemes, track disbursements and manage your subsidy journey.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {/* Username */}
            <div className="login-form__field">
              <label htmlFor="identifier">Username</label>
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
                'Login to Portal'
              )}
            </motion.button>
          </form>

          <p className="login-page__register">
            New beneficiary?{' '}
            <Link to="/register">Register on portal</Link>
          </p>
          <p className="login-page__register">
            Are you an officer?{' '}
            <Link to="/officer/login">Officer login</Link>
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
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1.25rem' }}>
                {forgotStep === 1 && 'Enter your registered Username, Email Address, or Phone Number.'}
                {forgotStep === 2 && 'Enter the 4-digit OTP sent to your registered phone number.'}
                {forgotStep === 3 && 'Choose a new password for your account.'}
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

              {/* STEP 1: Identify Account */}
              {forgotStep === 1 && (
                <form onSubmit={handleForgotStep1}>
                  <div className="login-form__field" style={{ marginBottom: '1.2rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text)' }}>Username or Email</label>
                    <input
                      type="text"
                      placeholder="e.g. rahul_sharma or farmer@gov.in"
                      value={forgotInput}
                      onChange={e => setForgotInput(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                      required
                    />
                  </div>
                  <button type="submit" className="button button--primary" style={{ width: '100%' }}>
                    Verify Account & Send OTP
                  </button>
                </form>
              )}

              {/* STEP 2: Verify OTP */}
              {forgotStep === 2 && (
                <form onSubmit={handleForgotStep2}>
                  <div style={{ background: 'rgba(255,255,255,0.04)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.82rem', color: '#ffc76a' }}>
                    💡 Simulated OTP Code: <strong>1234</strong>
                  </div>
                  <div className="login-form__field" style={{ marginBottom: '1.2rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text)' }}>4-Digit Verification OTP</label>
                    <input
                      type="text"
                      placeholder="Enter 1234"
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
                <form onSubmit={handleForgotStep3}>
                  <div className="login-form__field" style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text)' }}>New Password</label>
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
                    Set New Password & Log In
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
