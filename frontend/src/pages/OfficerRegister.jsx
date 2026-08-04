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

export default function OfficerRegister() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    fullName: '',
    officerId: 'OFF-' + Math.floor(1000 + Math.random() * 9000),
    designation: 'Field Officer',
    department: 'Agriculture & Farmers Welfare',
    district: '',
    email: '',
    employeeCode: '',
    password: '',
    confirmPassword: ''
  })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  function handleSubmit(e) {
    e.preventDefault()

    if (!form.fullName.trim()) { setError('Please enter your full name.'); return }
    if (!form.officerId.trim()) { setError('Please enter your Officer ID.'); return }
    if (!form.district.trim()) { setError('Please enter your assigned district or jurisdiction.'); return }
    if (!form.email.trim()) { setError('Please enter your official email.'); return }

    // Password validation (letters and numbers, min 6 chars)
    const hasLetter = /[a-zA-Z]/.test(form.password)
    const hasNumber = /[0-9]/.test(form.password)
    if (form.password.length < 6 || !hasLetter || !hasNumber) {
      setError('Password must be at least 6 characters long and contain both letters and numbers.')
      return
    }

    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return }

    setLoading(true)
    setTimeout(() => {
      setLoading(false)

      const storedOfficers = window.localStorage.getItem('gov-subsidy-officers')
      const officersList = storedOfficers ? JSON.parse(storedOfficers) : []

      // Check if Officer ID already exists
      const idExists = officersList.some(
        off => off.officerId.toUpperCase() === form.officerId.trim().toUpperCase()
      ) || form.officerId.trim().toUpperCase() === 'OFF001'

      if (idExists) {
        setError('Officer ID already registered. Please choose or generate a unique ID.')
        return
      }

      const newOfficer = {
        fullName: form.fullName.trim(),
        officerId: form.officerId.trim().toUpperCase(),
        designation: form.designation,
        department: form.department,
        district: form.district.trim(),
        email: form.email.trim(),
        employeeCode: form.employeeCode.trim() || 'EMP-' + Math.floor(100000 + Math.random() * 900000),
        password: form.password,
        registeredAt: new Date().toISOString()
      }

      officersList.push(newOfficer)
      window.localStorage.setItem('gov-subsidy-officers', JSON.stringify(officersList))

      showToast('Officer registration successful! Redirecting to login...', 'success')
      setTimeout(() => {
        navigate('/officer/login', { state: { registeredId: newOfficer.officerId } })
      }, 1400)
    }, 800)
  }

  return (
    <div className="login-page">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className={`toast toast--${toast.type}`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Left panel ── */}
      <motion.div
        className="login-page__left"
        initial={{ opacity: 0, x: -28 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        style={{ overflowY: 'auto' }}
      >
        {/* Brand & Theme Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <Link to="/" className="login-page__brand" style={{ margin: 0 }}>
            <img src="/logo.png" alt="GS Portal Logo" className="login-page__logo" />
            <span>GS Officer Portal</span>
          </Link>
        </div>

        <div className="login-page__form-area" style={{ marginTop: '1.5rem', marginBottom: '2rem' }}>
          <div className="login-page__copy">
            <h1 style={{ fontSize: '1.8rem', margin: '0 0 0.2rem' }}>Officer Registration</h1>
            <p style={{ margin: '0 0 1.25rem' }}>Register official credentials to verify citizen applications and oversee subsidy sanctioning.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="form-group-row">
              {/* Full Name */}
              <div className="login-form__field">
                <label htmlFor="fullName">Full Name</label>
                <div className="login-form__input-wrap">
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    placeholder="e.g. Dr. Sunita Sharma"
                    value={form.fullName}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Officer ID */}
              <div className="login-form__field">
                <label htmlFor="officerId">Officer ID</label>
                <div className="login-form__input-wrap">
                  <input
                    id="officerId"
                    name="officerId"
                    type="text"
                    placeholder="e.g. OFF002"
                    value={form.officerId}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div className="form-group-row">
              {/* Designation */}
              <div className="login-form__field">
                <label htmlFor="designation">Designation</label>
                <div className="login-form__input-wrap">
                  <select
                    id="designation"
                    name="designation"
                    value={form.designation}
                    onChange={handleChange}
                  >
                    <option value="Field Officer">Field Officer</option>
                    <option value="District Officer">District Officer</option>
                    <option value="Financial Officer">Financial Officer</option>
                  </select>
                </div>
              </div>

              {/* Department */}
              <div className="login-form__field">
                <label htmlFor="department">Department</label>
                <div className="login-form__input-wrap">
                  <select
                    id="department"
                    name="department"
                    value={form.department}
                    onChange={handleChange}
                  >
                    <option value="Agriculture & Farmers Welfare">Agriculture & Farmers Welfare</option>
                    <option value="Education & Skill Development">Education & Skill Development</option>
                    <option value="Housing & Urban Affairs">Housing & Urban Affairs</option>
                    <option value="Renewable Energy">Renewable Energy</option>
                    <option value="Social Justice & Empowerment">Social Justice & Empowerment</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="form-group-row">
              {/* District */}
              <div className="login-form__field">
                <label htmlFor="district">District / Jurisdiction</label>
                <div className="login-form__input-wrap">
                  <input
                    id="district"
                    name="district"
                    type="text"
                    placeholder="e.g. Pune, Maharashtra"
                    value={form.district}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Employee Code */}
              <div className="login-form__field">
                <label htmlFor="employeeCode">Employee Code / Govt ID</label>
                <div className="login-form__input-wrap">
                  <input
                    id="employeeCode"
                    name="employeeCode"
                    type="text"
                    placeholder="e.g. EMP-982310"
                    value={form.employeeCode}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Official Email */}
            <div className="login-form__field">
              <label htmlFor="email">Official Email Address</label>
              <div className="login-form__input-wrap">
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="officer.name@gov.in"
                  value={form.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group-row">
              {/* Password */}
              <div className="login-form__field">
                <label htmlFor="password">Password</label>
                <div className="login-form__input-wrap">
                  <input
                    id="password"
                    name="password"
                    type={showPw ? 'text' : 'password'}
                    placeholder="Set password"
                    value={form.password}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    className="login-form__pw-toggle"
                    onClick={() => setShowPw(v => !v)}
                  >
                    <EyeIcon open={showPw} />
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="login-form__field">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className="login-form__input-wrap">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPw ? 'text' : 'password'}
                    placeholder="Repeat password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                  />
                </div>
              </div>
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
              {loading ? <span className="login-form__spinner" /> : 'Register Officer Credentials'}
            </motion.button>
          </form>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.2rem', fontSize: '0.88rem' }}>
            <span>Already registered? <Link to="/officer/login" style={{ color: 'var(--accent-strong)', fontWeight: 600 }}>Officer Login</Link></span>
            <span>Citizen? <Link to="/login" style={{ color: 'var(--accent-strong)', fontWeight: 600 }}>Beneficiary Login</Link></span>
          </div>
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
      </motion.div>
    </div>
  )
}
