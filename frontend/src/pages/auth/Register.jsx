import '../../styles/Login.css'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { register as apiRegister, registerOfficer as apiRegisterOfficer } from '../../services/authService'
import logo from '../../assets/icons/logo.png'

const OFFICER_ROLES = [
  { value: 'FIELD_OFFICER',    label: 'Field Officer' },
  { value: 'DISTRICT_OFFICER', label: 'District Officer' },
  { value: 'REGIONAL_OFFICER', label: 'Regional Officer' },
  { value: 'FINANCE_OFFICER',  label: 'Finance Officer' },
]

const EMPTY_FORM = {
  fullName: '',
  mobileNo: '',
  region: '',
  district: '',
  state: '',
  username: '',
  password: '',
  confirmPassword: '',
  role: 'FIELD_OFFICER',   // officer-only
}

function validate(form, mode) {
  if (!form.fullName.trim())    return 'Please enter your full name.'
  if (!/^\d{10}$/.test(form.mobileNo)) return 'Mobile number must be exactly 10 digits.'
  if (!form.region.trim())      return 'Please enter your region / address.'
  if (!form.district.trim())    return 'Please enter your district.'
  if (!form.state.trim())       return 'Please enter your state.'
  if (!form.username.trim())    return 'Please choose a username.'
  if (mode === 'officer' && !form.role) return 'Please select a role.'

  const hasLetter = /[a-zA-Z]/.test(form.password)
  const hasNumber = /[0-9]/.test(form.password)
  if (form.password.length < 6 || !hasLetter || !hasNumber)
    return 'Password must be ≥ 6 characters and contain letters & numbers.'

  if (form.password !== form.confirmPassword) return 'Passwords do not match.'
  return null
}

/* ─────────────────────────────────────────────────────────────── */
/*  Sub-form: Beneficiary                                          */
/* ─────────────────────────────────────────────────────────────── */
function BeneficiaryForm({ form, onChange, error, loading }) {
  return (
    <>
      <div className="login-page__copy" style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.55rem', margin: 0 }}>Register as Beneficiary</h2>
        <p style={{ margin: '0.3rem 0 0', color: 'var(--muted)', fontSize: '0.88rem' }}>
          Citizens, farmers &amp; eligible individuals — create your subsidy portal account.
        </p>
      </div>

      <div className="form-group-row">
        <Field id="fullName"   label="Full Name"             name="fullName"   placeholder="Enter full name"       value={form.fullName}   onChange={onChange} />
        <Field id="mobileNo"   label="Mobile Number (10 Digits)" name="mobileNo" placeholder="10-digit mobile"   value={form.mobileNo}   onChange={onChange} type="tel" maxLength={10} />
      </div>

      <Field id="region" label="Region / Address" name="region" placeholder="Residential region / address" value={form.region} onChange={onChange} />

      <div className="form-group-row">
        <Field id="district" label="District" name="district" placeholder="e.g. Pune"         value={form.district} onChange={onChange} />
        <Field id="state"    label="State"    name="state"    placeholder="e.g. Maharashtra"  value={form.state}    onChange={onChange} />
      </div>

      <Field id="username" label="Choose Username" name="username" placeholder="e.g. rahul_sharma" value={form.username} onChange={onChange} autoComplete="off" />

      <div className="form-group-row">
        <Field id="password"        label="Password (Letters & Numbers)" name="password"        type="password" placeholder="e.g. pass123"      value={form.password}        onChange={onChange} />
        <Field id="confirmPassword" label="Confirm Password"             name="confirmPassword" type="password" placeholder="Repeat password"    value={form.confirmPassword} onChange={onChange} />
      </div>

      <ErrorMsg message={error} />

      <motion.button type="submit" className="login-form__submit" disabled={loading} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} style={{ marginTop: '1rem' }}>
        {loading ? <span className="login-form__spinner" /> : 'Register Account'}
      </motion.button>
    </>
  )
}

/* ─────────────────────────────────────────────────────────────── */
/*  Sub-form: Officer                                              */
/* ─────────────────────────────────────────────────────────────── */
function OfficerForm({ form, onChange, error, loading }) {
  return (
    <>
      <div className="login-page__copy" style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.55rem', margin: 0 }}>Register as Officer</h2>
        <p style={{ margin: '0.3rem 0 0', color: 'var(--muted)', fontSize: '0.88rem' }}>
          Government officials — sign up and await admin approval before accessing the Officer Portal.
        </p>
      </div>

      {/* Role selector */}
      <div className="login-form__field" style={{ marginBottom: '0.5rem' }}>
        <label htmlFor="role">Officer Role</label>
        <div className="login-form__input-wrap">
          <select
            id="role"
            name="role"
            value={form.role}
            onChange={onChange}
            style={{ width: '100%', background: 'transparent', color: 'var(--text)', border: 'none', outline: 'none', fontSize: '0.95rem' }}
          >
            {OFFICER_ROLES.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group-row">
        <Field id="fullName" label="Full Name"             name="fullName" placeholder="Enter full name"   value={form.fullName} onChange={onChange} />
        <Field id="mobileNo" label="Mobile Number (10 Digits)" name="mobileNo" placeholder="10-digit mobile" value={form.mobileNo} onChange={onChange} type="tel" maxLength={10} />
      </div>

      <Field id="region" label="Region / Address" name="region" placeholder="Posting region / address" value={form.region} onChange={onChange} />

      <div className="form-group-row">
        <Field id="district" label="District / Jurisdiction" name="district" placeholder="e.g. North Delhi"   value={form.district} onChange={onChange} />
        <Field id="state"    label="State"                   name="state"    placeholder="e.g. Delhi"         value={form.state}    onChange={onChange} />
      </div>

      <Field id="username" label="Choose Username" name="username" placeholder="e.g. officer_anil" value={form.username} onChange={onChange} autoComplete="off" />

      <div className="form-group-row">
        <Field id="password"        label="Password (Letters & Numbers)" name="password"        type="password" placeholder="e.g. pass123"   value={form.password}        onChange={onChange} />
        <Field id="confirmPassword" label="Confirm Password"             name="confirmPassword" type="password" placeholder="Repeat password" value={form.confirmPassword} onChange={onChange} />
      </div>

      <ErrorMsg message={error} />

      <motion.button type="submit" className="login-form__submit" disabled={loading} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} style={{ marginTop: '1rem' }}>
        {loading ? <span className="login-form__spinner" /> : 'Submit for Approval'}
      </motion.button>

      <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.75rem', lineHeight: 1.5 }}>
        ⓘ Officer accounts require Admin approval before login access is granted.
      </p>
    </>
  )
}

/* ─────────────────────────────────────────────────────────────── */
/*  Shared helpers                                                 */
/* ─────────────────────────────────────────────────────────────── */
function Field({ id, label, name, placeholder, value, onChange, type = 'text', maxLength, autoComplete }) {
  return (
    <div className="login-form__field">
      <label htmlFor={id}>{label}</label>
      <div className="login-form__input-wrap">
        <input
          id={id}
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          maxLength={maxLength}
          autoComplete={autoComplete}
        />
      </div>
    </div>
  )
}

function ErrorMsg({ message }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.p
          className="login-form__error"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          style={{ color: '#dc3545', fontSize: '0.85rem', margin: '0.5rem 0' }}
        >
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  )
}

/* ─────────────────────────────────────────────────────────────── */
/*  Main Register page                                             */
/* ─────────────────────────────────────────────────────────────── */
export default function Register() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('beneficiary') // 'beneficiary' | 'officer'
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  function handleChange(e) {
    const { name, value } = e.target
    const cleaned = name === 'mobileNo' ? value.replace(/\D/g, '').slice(0, 10) : value
    setForm(prev => ({ ...prev, [name]: cleaned }))
    setError('')
  }

  function switchMode(newMode) {
    setMode(newMode)
    setForm(EMPTY_FORM)
    setError('')
  }

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const validationError = validate(form, mode)
    if (validationError) { setError(validationError); return }

    setLoading(true)
    try {
      const result = mode === 'beneficiary'
        ? await apiRegister(form)
        : await apiRegisterOfficer(form)

      if (result.status) {
        showToast(result.message || 'Registration successful! Redirecting...', 'success')
        setTimeout(() => navigate('/login'), 1800)
      } else {
        setError(result.message || 'Registration failed. Please try again.')
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      {/* Toast */}
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

      {/* Left panel */}
      <motion.div
        className="login-page__left"
        initial={{ opacity: 0, x: -28 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        style={{ overflowY: 'auto' }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <Link to="/" className="login-page__brand" style={{ margin: 0 }}>
            <img src={logo} alt="GS Portal Logo" className="login-page__logo" />
            <span>GS Gov Subsidy</span>
          </Link>
        </div>

        <div className="login-page__form-area" style={{ marginTop: '0.5rem', marginBottom: '2rem' }}>

          {/* ── Mode switcher tabs ── */}
          <div style={{
            display: 'flex',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '4px',
            marginBottom: '1.75rem',
            gap: '4px',
          }}>
            {[
              { key: 'beneficiary', label: '👤 Register as Beneficiary' },
              { key: 'officer',     label: '🏛️ Register as Officer' },
            ].map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => switchMode(tab.key)}
                style={{
                  flex: 1,
                  padding: '0.55rem 0.75rem',
                  borderRadius: '9px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  transition: 'all 0.2s ease',
                  background: mode === tab.key ? 'var(--accent)' : 'transparent',
                  color: mode === tab.key ? '#fff' : 'var(--muted)',
                  boxShadow: mode === tab.key ? '0 2px 10px rgba(0,0,0,0.25)' : 'none',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Form ── */}
          <form className="login-form" onSubmit={handleSubmit} noValidate style={{ display: 'block' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}
              >
                {mode === 'beneficiary'
                  ? <BeneficiaryForm form={form} onChange={handleChange} error={error} loading={loading} />
                  : <OfficerForm     form={form} onChange={handleChange} error={error} loading={loading} />
                }
              </motion.div>
            </AnimatePresence>
          </form>

          <p className="login-page__register" style={{ marginTop: '1.2rem' }}>
            Already registered?{' '}
            <Link to="/login" style={{ color: 'var(--accent-strong)', fontWeight: '700' }}>Login here</Link>
          </p>
        </div>
      </motion.div>

      {/* Right panel */}
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
