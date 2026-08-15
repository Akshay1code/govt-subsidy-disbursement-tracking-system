import '../../styles/Login.css';
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { login as apiLogin } from '../../services/authService'
import logo from '../../assets/icons/logo.png'
import { FaUser, FaUserShield, FaShieldAlt, FaEnvelope } from 'react-icons/fa'

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
          } else if (role?.includes('FINANCE')) {
            navigate('/finance')
          } else if (role?.includes('OFFICER')) {
            navigate('/officer/dashboard')
          } else {
            navigate('/dashboard')
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
