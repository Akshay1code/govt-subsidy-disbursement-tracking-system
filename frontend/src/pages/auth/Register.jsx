import '../../styles/Login.css'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { register as apiRegister, registerOfficer as apiRegisterOfficer } from '../../services/authService'
import logo from '../../assets/icons/logo.png'
import { FaUser, FaLandmark, FaUserPlus, FaFileSignature, FaChartPie, FaRegCheckCircle } from 'react-icons/fa'

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
  role: 'FIELD_OFFICER',
}

function validate(form, mode) {
  if (!form.fullName.trim())    return 'Please enter your full name.'
  if (!/^\d{10}$/.test(form.mobileNo)) return 'Mobile number must be exactly 10 digits.'
  if (!form.region.trim())      return 'Please enter your region / address.'
  if (!form.district.trim())    return 'Please enter your district.'
  if (!form.state.trim())       return 'Please enter your state.'
  if (!form.username.trim())    return 'Please choose a username.'
  if (mode === 'officer' && !form.role) return 'Please select a role.'

  const backendPasswordPattern = /^[A-Z](?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&]).{7,}$/
  if (!backendPasswordPattern.test(form.password)) {
    return 'Password must start with an uppercase letter and include lowercase letters, a number, and a special character.'
  }

  if (form.password !== form.confirmPassword) return 'Passwords do not match.'
  return null
}

/* ─────────────────────────────────────────────────────────────── */
/*  Shared helpers                                                 */
/* ─────────────────────────────────────────────────────────────── */
function Field({ id, label, name, placeholder, value, onChange, type = 'text', maxLength, autoComplete }) {
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <div className="input-wrapper">
        <input
          id={id}
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          maxLength={maxLength}
          autoComplete={autoComplete}
          style={{ padding: 0 }}
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
          className="form-error"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          style={{ marginTop: '0.5rem' }}
        >
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  )
}

/* ─────────────────────────────────────────────────────────────── */
/*  Sub-form: Beneficiary                                          */
/* ─────────────────────────────────────────────────────────────── */
function BeneficiaryForm({ form, onChange, error, loading }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="login-header" style={{ marginBottom: '0.5rem' }}>
        <h2>Register as Beneficiary</h2>
        <p>Citizens, farmers &amp; eligible individuals — create your subsidy portal account.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Field id="fullName"   label="Full Name"             name="fullName"   placeholder="Enter full name"       value={form.fullName}   onChange={onChange} />
        <Field id="mobileNo"   label="Mobile Number" name="mobileNo" placeholder="10-digit mobile"   value={form.mobileNo}   onChange={onChange} type="tel" maxLength={10} />
      </div>

      <Field id="region" label="Region / Address" name="region" placeholder="Residential region / address" value={form.region} onChange={onChange} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Field id="district" label="District" name="district" placeholder="e.g. Pune"         value={form.district} onChange={onChange} />
        <Field id="state"    label="State"    name="state"    placeholder="e.g. Maharashtra"  value={form.state}    onChange={onChange} />
      </div>

      <Field id="username" label="Choose Username" name="username" placeholder="e.g. rahul_sharma" value={form.username} onChange={onChange} autoComplete="off" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Field id="password"        label="Password" name="password"        type="password" placeholder="e.g. Pass@123"      value={form.password}        onChange={onChange} />
        <Field id="confirmPassword" label="Confirm Password"             name="confirmPassword" type="password" placeholder="Repeat password"    value={form.confirmPassword} onChange={onChange} />
      </div>

      <ErrorMsg message={error} />

      <motion.button type="submit" className="submit-btn" disabled={loading} whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
        {loading ? <span className="spinner" /> : 'Register Account'}
      </motion.button>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────── */
/*  Sub-form: Officer                                              */
/* ─────────────────────────────────────────────────────────────── */
function OfficerForm({ form, onChange, error, loading }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="login-header" style={{ marginBottom: '0.5rem' }}>
        <h2>Register as Officer</h2>
        <p>Government officials — sign up and await admin approval before accessing the Officer Portal.</p>
      </div>

      <div className="form-field">
        <label htmlFor="role">Officer Role</label>
        <div className="input-wrapper">
          <select
            id="role"
            name="role"
            value={form.role}
            onChange={onChange}
            style={{ width: '100%', background: 'transparent', color: 'var(--text-main)', border: 'none', outline: 'none', fontSize: '0.95rem', height: '100%', appearance: 'none', cursor: 'pointer' }}
          >
            {OFFICER_ROLES.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Field id="fullName" label="Full Name"             name="fullName" placeholder="Enter full name"   value={form.fullName} onChange={onChange} />
        <Field id="mobileNo" label="Mobile Number" name="mobileNo" placeholder="10-digit mobile" value={form.mobileNo} onChange={onChange} type="tel" maxLength={10} />
      </div>

      <Field id="region" label="Region / Address" name="region" placeholder="Posting region / address" value={form.region} onChange={onChange} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Field id="district" label="District / Jurisdiction" name="district" placeholder="e.g. North Delhi"   value={form.district} onChange={onChange} />
        <Field id="state"    label="State"                   name="state"    placeholder="e.g. Delhi"         value={form.state}    onChange={onChange} />
      </div>

      <Field id="username" label="Choose Username" name="username" placeholder="e.g. officer_anil" value={form.username} onChange={onChange} autoComplete="off" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Field id="password"        label="Password" name="password"        type="password" placeholder="e.g. Pass@123"   value={form.password}        onChange={onChange} />
        <Field id="confirmPassword" label="Confirm Password"             name="confirmPassword" type="password" placeholder="Repeat password" value={form.confirmPassword} onChange={onChange} />
      </div>

      <ErrorMsg message={error} />

      <motion.button type="submit" className="submit-btn" disabled={loading} whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
        {loading ? <span className="spinner" /> : 'Submit for Approval'}
      </motion.button>

      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '-0.5rem', lineHeight: 1.5 }}>
        ⓘ Officer accounts require Admin approval before login access is granted.
      </p>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────── */
/*  Main Register page                                             */
/* ─────────────────────────────────────────────────────────────── */
export default function Register() {
  const location = useLocation()
  const navigate = useNavigate()
  const [mode, setMode] = useState(() => (
    location.pathname.startsWith('/officer') ? 'officer' : 'beneficiary'
  ))
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
    <div className="login-wrapper">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className={`toast toast--${toast.type}`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'fixed',
              top: '1rem',
              left: '50%',
              transform: 'translateX(-50%)',
              background: toast.type === 'success' ? '#047857' : '#b91c1c',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              zIndex: 1000,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

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

          <div className="login-left__features">
            <div className="feature-card">
              <div className="feature-card__icon"><FaUserPlus /></div>
              <h4 className="feature-card__title">Register</h4>
              <p className="feature-card__text">Create your portal account easily</p>
            </div>
            <div className="feature-card">
              <div className="feature-card__icon"><FaFileSignature /></div>
              <h4 className="feature-card__title">Apply</h4>
              <p className="feature-card__text">Submit subsidy applications online</p>
            </div>
            <div className="feature-card">
              <div className="feature-card__icon"><FaChartPie /></div>
              <h4 className="feature-card__title">Track</h4>
              <p className="feature-card__text">Monitor application status in real-time</p>
            </div>
            <div className="feature-card">
              <div className="feature-card__icon"><FaRegCheckCircle /></div>
              <h4 className="feature-card__title">Receive</h4>
              <p className="feature-card__text">Secure and direct benefit transfers</p>
            </div>
          </div>
        </div>

        {/* Decorative Watermark */}
        <div className="login-left__watermark">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
      </motion.div>

      {/* ── Right panel (Form) ── */}
      <motion.div
        className="login-right"
        style={{ overflowY: 'auto' }}
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
      >
        <div className="login-right__container" style={{ maxWidth: '480px', padding: '2rem 0' }}>
          
          {/* ── Mode switcher tabs ── */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-input)',
            borderRadius: '10px',
            padding: '4px',
            marginBottom: '2rem',
            gap: '4px',
          }}>
            {[
              { key: 'beneficiary', label: <span style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'}}><FaUser /> Register as Beneficiary</span> },
              { key: 'officer',     label: <span style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'}}><FaLandmark /> Register as Officer</span> },
            ].map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => switchMode(tab.key)}
                style={{
                  flex: 1,
                  padding: '0.65rem 0.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                  background: mode === tab.key ? '#ffffff' : 'transparent',
                  color: mode === tab.key ? 'var(--text-main)' : 'var(--text-muted)',
                  boxShadow: mode === tab.key ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22 }}
              >
                {mode === 'beneficiary'
                  ? <BeneficiaryForm form={form} onChange={handleChange} error={error} loading={loading} />
                  : <OfficerForm     form={form} onChange={handleChange} error={error} loading={loading} />
                }
              </motion.div>
            </AnimatePresence>
          </form>

          <p className="register-text">
            Already registered? <Link to="/login">Login here</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
