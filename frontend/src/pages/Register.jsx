import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    fullName: '',
    address: '',
    state: '',
    phone: '',
    username: '',
    password: '',
    confirmPassword: '',
    occupation: 'Farmer'
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  function handleChange(e) {
    const { name, value } = e.target
    if (name === 'phone') {
      // Restrict phone to digits only, max 10 characters
      const cleaned = value.replace(/\D/g, '').slice(0, 10)
      setForm(prev => ({ ...prev, [name]: cleaned }))
    } else {
      setForm(prev => ({ ...prev, [name]: value }))
    }
    setError('')
  }

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  function handleSubmit(e) {
    e.preventDefault()

    // Validations
    if (!form.fullName.trim()) { setError('Please enter your full name.'); return }
    if (!form.address.trim()) { setError('Please enter your address.'); return }
    if (!form.state.trim()) { setError('Please enter your state.'); return }

    // Phone validation (10 digits)
    if (!/^\d{10}$/.test(form.phone.trim())) {
      setError('Phone number must contain exactly 10 digits.')
      return
    }

    if (!form.username.trim()) { setError('Please choose a username.'); return }

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
      
      // Load current user registry
      const storedUsers = window.localStorage.getItem('gov-subsidy-users')
      const usersList = storedUsers ? JSON.parse(storedUsers) : []

      // Check if username already exists
      const usernameExists = usersList.some(user => user.username.toLowerCase() === form.username.toLowerCase())
      if (usernameExists) {
        setError('Username is already taken. Please choose another.')
        return
      }

      // Add new user profile with deferred eligibility parameters
      const newUser = {
        fullName: form.fullName.trim(),
        address: form.address.trim(),
        state: form.state.trim(),
        phone: form.phone.trim(),
        username: form.username.trim(),
        password: form.password,
        occupation: form.occupation,
        annualIncome: '',
        landHolding: '',
        aadhaar: '',
        bankName: '',
        accountNumber: '',
        ifsc: ''
      }

      usersList.push(newUser)
      window.localStorage.setItem('gov-subsidy-users', JSON.stringify(usersList))
      
      showToast('Registration successful! Redirecting to login...', 'success')
      setTimeout(() => {
        navigate('/login')
      }, 1500)
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

      {/* Left panel - registration form */}
      <motion.div
        className="login-page__left"
        initial={{ opacity: 0, x: -28 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        style={{ overflowY: 'auto' }}
      >
        {/* Brand & Theme */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <Link to="/" className="login-page__brand" style={{ margin: 0 }}>
            <img src="/logo.png" alt="GS Portal Logo" className="login-page__logo" />
            <span>GS Gov Subsidy</span>
          </Link>
        </div>

        <div className="login-page__form-area" style={{ marginTop: '1.5rem', marginBottom: '2rem' }}>
          <div className="login-page__copy">
            <h1 style={{ fontSize: '1.8rem', margin: '0 0 0.2rem' }}>Create Account</h1>
            <p style={{ margin: '0 0 1.25rem' }}>Register today to browse, qualify, and track direct subsidy disbursements.</p>
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
                    placeholder="Enter full name"
                    value={form.fullName}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="login-form__field">
                <label htmlFor="phone">Phone Number (10 Digits)</label>
                <div className="login-form__input-wrap">
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    maxLength={10}
                    placeholder="10-digit phone number"
                    value={form.phone}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="login-form__field">
              <label htmlFor="address">Address</label>
              <div className="login-form__input-wrap">
                <input
                  id="address"
                  name="address"
                  type="text"
                  placeholder="Enter residential address"
                  value={form.address}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group-row">
              {/* State */}
              <div className="login-form__field">
                <label htmlFor="state">State of Residence</label>
                <div className="login-form__input-wrap">
                  <input
                    id="state"
                    name="state"
                    type="text"
                    placeholder="e.g. Maharashtra"
                    value={form.state}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Occupation */}
              <div className="login-form__field">
                <label htmlFor="occupation">Primary Occupation</label>
                <div className="login-form__input-wrap">
                  <select
                    id="occupation"
                    name="occupation"
                    value={form.occupation}
                    onChange={handleChange}
                  >
                    <option value="Farmer">Farmer / Cultivator</option>
                    <option value="Student">Student / Academic</option>
                    <option value="Unemployed">Unemployed</option>
                    <option value="Salaried">Salaried Employee</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Username */}
            <div className="login-form__field">
              <label htmlFor="username">Choose Username</label>
              <div className="login-form__input-wrap">
                <input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="e.g. rahul_sharma"
                  value={form.username}
                  onChange={handleChange}
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="form-group-row">
              {/* Password */}
              <div className="login-form__field">
                <label htmlFor="password">Password (Letters & Numbers)</label>
                <div className="login-form__input-wrap">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="e.g. pass123 (letters & numbers)"
                    value={form.password}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div className="login-form__field">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className="login-form__input-wrap">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="Verify password"
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
                  style={{ color: '#dc3545', fontSize: '0.85rem', margin: '0.5rem 0' }}
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
              style={{ marginTop: '1rem' }}
            >
              {loading ? (
                <span className="login-form__spinner" />
              ) : (
                'Register Account'
              )}
            </motion.button>
          </form>

          <p className="login-page__register" style={{ marginTop: '1.2rem' }}>
            Already registered?{' '}
            <Link to="/login" style={{ color: 'var(--accent-strong)', fontWeight: '700' }}>Login here</Link>
          </p>
        </div>
      </motion.div>

      {/* Right panel - split design */}
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
