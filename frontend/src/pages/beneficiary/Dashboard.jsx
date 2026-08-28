import '../../styles/Dashboard.css'
import { useState, useEffect, useRef, useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getSchemes as fetchSchemesFromAPI } from '../../services/schemeService'
import { getApplications } from '../../services/applicationService'
import { getCurrentBeneficiaryRecord } from '../../services/fundsService'
import { clearPortalSessionCaches } from '../../services/sessionCleanup'
import ProfilePanel from '../../components/ProfilePanel'
import logo from '../../assets/icons/logo.png'
import api from '../../services/api'

/* ─── Pure helper functions (unchanged logic) ─────────────────────────────── */
function getApplicationStatus(app) {
  return String(app?.applicationStatus || app?.status || '').toUpperCase()
}

function isDraftStatus(status) {
  return status === 'DRAFT' || status === 'PENDING'
}

function getApplicationForScheme(applications, schemeCode) {
  return applications.find(app => {
    const appSchemeCode = app?.schemeCode || app?.schemeId || app?.scheme?.schemeCode
    return appSchemeCode === schemeCode
  })
}

function getApplicationSchemeCode(app) {
  return app?.schemeCode || app?.schemeId || app?.scheme?.schemeCode || ''
}

function getApplicationSchemeName(app, schemes) {
  const appSchemeCode = getApplicationSchemeCode(app)
  const matchedScheme = schemes.find(scheme => scheme.schemeCode === appSchemeCode)
  return matchedScheme?.name || app?.schemeName || app?.scheme?.schemeName || appSchemeCode || 'Scheme'
}

function getApplicationSchemeDescription(app, schemes) {
  const appSchemeCode = getApplicationSchemeCode(app)
  const matchedScheme = schemes.find(scheme => scheme.schemeCode === appSchemeCode)
  return matchedScheme?.description || app?.scheme?.description || 'Open this scheme to view the current application details.'
}

function getUniqueAppliedSchemes(applications, schemes) {
  const seen = new Set()
  return applications
    .map(app => {
      const schemeCode = getApplicationSchemeCode(app)
      if (!schemeCode || seen.has(schemeCode)) return null
      seen.add(schemeCode)
      return {
        schemeCode,
        app,
        schemeName: getApplicationSchemeName(app, schemes),
        schemeDescription: getApplicationSchemeDescription(app, schemes),
      }
    })
    .filter(Boolean)
}

function formatApplicationDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function timeAgo(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const diff = Date.now() - date.getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return '1 week ago'
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  if (days < 60) return '1 month ago'
  return `${Math.floor(days / 30)} months ago`
}

/* ─── Inline SVG Icon Components (Lucide-style outlined) ───────────────────── */
const Icon = {
  Home: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Grid: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  Folder: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  DollarSign: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  User: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  PlusCircle: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  Search2: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  MessageSquare: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  HelpCircle: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Bell: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  Search: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  ChevronDown: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  ChevronRight: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Download: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  TrendingUp: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  ArrowUpRight: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>,
  FileText: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  Activity: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  CheckCircle: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  XCircle: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  Clock: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Shield: () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Gift: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>,
  Menu: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  X: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  LogOut: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
}

/* ─── StatusBadge (reusable inline) ────────────────────────────────────────── */
function StatusBadge({ status }) {
  const s = String(status || '').toUpperCase()
  let cls = 'status-badge '
  let label = s
  if (s === 'APPROVED')      { cls += 'status-badge--approved';      label = 'Approved' }
  else if (s === 'UNDER_REVIEW') { cls += 'status-badge--under_review'; label = 'Under Review' }
  else if (s === 'SUBMITTED') { cls += 'status-badge--submitted';     label = 'Submitted' }
  else if (s === 'REJECTED')  { cls += 'status-badge--rejected';      label = 'Rejected' }
  else if (s === 'DISBURSED') { cls += 'status-badge--disbursed';     label = 'Disbursed' }
  else                        { cls += 'status-badge--draft';          label = s || 'Draft' }
  return <span className={cls} aria-label={`Status: ${label}`}>{label}</span>
}

/* ─── Donut Chart (pure SVG, no library) ───────────────────────────────────── */
function DonutChart({ segments, total }) {
  const R = 70, CX = 80, CY = 80
  const CIRCUMFERENCE = 2 * Math.PI * R
  let offset = 0
  const paths = segments.map((seg, i) => {
    const dash = (seg.pct / 100) * CIRCUMFERENCE
    const path = (
      <circle
        key={i}
        cx={CX} cy={CY} r={R}
        fill="none"
        stroke={seg.color}
        strokeWidth="18"
        strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
        strokeDashoffset={-offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 600ms ease' }}
      />
    )
    offset += dash
    return path
  })
  return (
    <svg width="160" height="160" viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="#F0F4F2" strokeWidth="18" />
      {total > 0 ? paths : null}
    </svg>
  )
}

/* ─── Monthly Trend Chart (pure SVG) ───────────────────────────────────────── */
function TrendChart({ applications }) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const counts = useMemo(() => {
    const arr = new Array(12).fill(0)
    applications.forEach(app => {
      const d = new Date(app.submittedDate || app.createdAt || '')
      if (!Number.isNaN(d.getTime())) arr[d.getMonth()]++
    })
    return arr
  }, [applications])

  const maxVal = Math.max(...counts, 1)
  const W = 600, H = 140, padL = 8, padR = 8, padT = 12, padB = 28
  const innerW = W - padL - padR
  const innerH = H - padT - padB

  const pts = counts.map((v, i) => ({
    x: padL + (i / 11) * innerW,
    y: padT + (1 - v / maxVal) * innerH,
    v,
  }))

  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ')
  const areaPath = [
    `M ${pts[0].x} ${pts[0].y}`,
    ...pts.slice(1).map(p => `L ${p.x} ${p.y}`),
    `L ${pts[pts.length - 1].x} ${padT + innerH}`,
    `L ${pts[0].x} ${padT + innerH}`,
    'Z',
  ].join(' ')

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="trend-chart-svg"
      role="img"
      aria-label="Monthly application trend chart"
    >
      <defs>
        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#087443" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#087443" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75, 1].map((f, i) => (
        <line
          key={i}
          x1={padL} y1={padT + f * innerH}
          x2={padL + innerW} y2={padT + f * innerH}
          stroke="#E4EAE7" strokeWidth="1"
        />
      ))}
      {/* Area fill */}
      <path d={areaPath} fill="url(#trendGrad)" />
      {/* Line */}
      <polyline
        points={polyline}
        fill="none"
        stroke="#087443"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Data points */}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4.5" fill="#087443" stroke="#fff" strokeWidth="2" />
        </g>
      ))}
      {/* Month labels */}
      {months.map((m, i) => (
        <text
          key={i}
          x={padL + (i / 11) * innerW}
          y={H - 4}
          textAnchor="middle"
          className="trend-axis-label"
          fill="#8A98AA"
          fontSize="9"
        >
          {m}
        </text>
      ))}
    </svg>
  )
}

/* ─── Loading Skeleton ───────────────────────────────────────────────────────── */
function LoadingShell() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#fff', flexDirection: 'column', gap: '1rem'
    }}>
      <div style={{
        width: 44, height: 44, border: '3px solid #EAF7EF',
        borderTopColor: '#087443', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <span style={{ color: '#60718B', fontSize: '0.9rem', fontWeight: 500 }}>Loading Portal…</span>
    </div>
  )
}

/* ─── Main Dashboard Component ────────────────────────────────────────────── */
export default function Dashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const landingResolvedRef = useRef(false)

  // ── Existing state (unchanged) ──
  const [profile, setProfile] = useState(null)
  const [beneficiaryRecord, setBeneficiaryRecord] = useState(null)
  const [beneficiaryLoaded, setBeneficiaryLoaded] = useState(false)
  const [schemes, setSchemes] = useState([])
  const [applications, setApplications] = useState([])
  const [activeTab, setActiveTab] = useState('schemes')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('')
  const [toast, setToast] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [loadingSchemes, setLoadingSchemes] = useState(true)

  // ── New UI state ──
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Auth guard + profile fetch (unchanged) ──
  useEffect(() => {
    async function init() {
      try {
        const [res, beneficiaryRes] = await Promise.all([
          api.get('/gov/auth/profile/get'),
          getCurrentBeneficiaryRecord().catch(() => null),
        ])
        if (res.data && res.data.status !== false) {
          const profileData = res.data.data || res.data
          setProfile(profileData)
          setBeneficiaryRecord(beneficiaryRes || null)
          setBeneficiaryLoaded(true)
        } else {
          navigate('/login')
        }
      } catch {
        navigate('/login')
      } finally {
        setBeneficiaryLoaded(true)
        setLoadingProfile(false)
      }
    }
    init()
  }, [navigate])

  // ── Scheme fetch (unchanged) ──
  useEffect(() => {
    async function loadSchemes() {
      try {
        setLoadingSchemes(true)
        const data = await fetchSchemesFromAPI(selectedCategory)
        setSchemes(Array.isArray(data) ? data : data?.data || [])
      } catch (err) {
        console.error('Failed to load schemes:', err.message)
        setSchemes([])
      } finally {
        setLoadingSchemes(false)
      }
    }
    loadSchemes()
  }, [selectedCategory])

  // ── Application fetch (unchanged) ──
  useEffect(() => {
    async function loadApplications() {
      try {
        const data = await getApplications()
        setApplications(Array.isArray(data) ? data : data?.data || [])
      } catch (err) {
        console.error('Failed to load applications:', err.message)
        setApplications([])
      }
    }
    loadApplications()
  }, [])

  // ── Login redirect logic (unchanged, but starts on 'home' tab now) ──
  useEffect(() => {
    if (!location.state?.fromLogin) return
    if (landingResolvedRef.current) return
    if (!profile || applications.length === 0 || !beneficiaryLoaded) return
    if (!beneficiaryLoaded) return

    const hasAllocatedFunds = Number(beneficiaryRecord?.sanctionedAmount || 0) > 0
    const sanctionedApplicationId = beneficiaryRecord?.applicationId
    const sanctionedApplication = applications.find(
      app => (app.id || app.applicationId) === sanctionedApplicationId
    )

    if (hasAllocatedFunds && sanctionedApplication) {
      setActiveTab('funds')
    } else {
      setActiveTab('schemes')
    }
    landingResolvedRef.current = true
  }, [applications, beneficiaryLoaded, beneficiaryRecord, location.state, profile])

  const handleLogout = async () => {
    try {
      await api.post('/gov/auth/signout')
    } catch { /* silently ignore */ }
    clearPortalSessionCaches()
    navigate('/')
  }

  const handleSaveProfile = async (updatedProfile) => {
    try {
      const res = await api.put('/gov/auth/profile/update', updatedProfile)
      if (res.data.status) {
        setProfile(res.data.data || updatedProfile)
        showToast(res.data.message || 'Profile updated successfully!')
      } else {
        showToast(res.data.message || 'Failed to update profile.', 'error')
      }
    } catch (err) {
      showToast(err.message || 'Failed to update profile.', 'error')
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmInput.toLowerCase() !== 'delete') {
      showToast('Please type DELETE to confirm', 'error')
      return
    }
    try {
      const res = await api.delete('/gov/auth/delete')
      if (res.data.status) {
        navigate('/')
      } else {
        showToast(res.data.message || 'Failed to delete account.', 'error')
      }
    } catch (err) {
      showToast(err.message || 'Failed to delete account.', 'error')
    }
  }

  if (loadingProfile) return <LoadingShell />
  if (!profile) return null

  /* ── Derived data (unchanged logic) ── */
  const filteredSchemes = schemes.filter(scheme => {
    const matchesSearch =
      scheme.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scheme.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || scheme.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const appliedSchemes = getUniqueAppliedSchemes(applications, schemes)
  const hasApplications = appliedSchemes.length > 0

  const fundedApplication = applications.find(app => {
    const appId = app.id || app.applicationId
    const isBeneficiaryMatch =
      beneficiaryRecord?.applicationId && appId === beneficiaryRecord.applicationId
    const isApprovedWithAmount =
      Number(app.amount || 0) > 0 &&
      ['APPROVED', 'DISBURSED'].includes(String(app.status || '').toUpperCase())
    return isBeneficiaryMatch || isApprovedWithAmount
  })

  const fundedSchemeCode = fundedApplication ? getApplicationSchemeCode(fundedApplication) : ''
  const hasFundsAllocation =
    Number(beneficiaryRecord?.sanctionedAmount || 0) > 0 ||
    Number(fundedApplication?.amount || 0) > 0
  const currentAllocated = Number(
    fundedApplication?.amount || beneficiaryRecord?.sanctionedAmount || 0
  )
  const currentDisbursed = Number(beneficiaryRecord?.disbursedAmount || 0)
  const currentRemaining = Math.max(0, currentAllocated - currentDisbursed)

  /* ── Dashboard overview derived stats ── */
  const totalApps     = applications.length
  const approvedApps  = applications.filter(a => ['APPROVED','DISBURSED'].includes(getApplicationStatus(a))).length
  const reviewApps    = applications.filter(a => ['UNDER_REVIEW','SUBMITTED'].includes(getApplicationStatus(a))).length
  const rejectedApps  = applications.filter(a => getApplicationStatus(a) === 'REJECTED').length

  const donutSegments = totalApps > 0 ? [
    { label: 'Approved',     pct: Math.round((approvedApps / totalApps) * 100), color: '#087443', count: approvedApps },
    { label: 'Under Review', pct: Math.round((reviewApps   / totalApps) * 100), color: '#F4C542', count: reviewApps },
    { label: 'Rejected',     pct: Math.round((rejectedApps / totalApps) * 100), color: '#EF4444', count: rejectedApps },
    { label: 'Other',        pct: Math.max(0, 100 - Math.round((approvedApps + reviewApps + rejectedApps) / totalApps * 100)), color: '#E4EAE7', count: totalApps - approvedApps - reviewApps - rejectedApps },
  ] : [{ label: 'No data', pct: 100, color: '#E4EAE7', count: 0 }]

  const recentApps = [...applications]
    .sort((a, b) => new Date(b.submittedDate || b.createdAt || 0) - new Date(a.submittedDate || a.createdAt || 0))
    .slice(0, 5)

  const popularSchemes = schemes.slice(0, 3)

  const getCategoryBadgeClass = (cat) => {
    const c = String(cat || '').toLowerCase()
    if (c === 'agriculture') return 'cat-badge--agriculture'
    if (c === 'housing')     return 'cat-badge--housing'
    if (c === 'education')   return 'cat-badge--education'
    if (c === 'healthcare')  return 'cat-badge--healthcare'
    return 'cat-badge--default'
  }

  const getStatusLabel = (status) => {
    switch (String(status || '').toUpperCase()) {
      case 'DRAFT': case 'PENDING':  return 'Application started'
      case 'SUBMITTED':              return 'Application submitted'
      case 'UNDER_REVIEW':           return 'Under review'
      case 'APPROVED':               return 'Approved'
      case 'REJECTED':               return 'Rejected'
      case 'DISBURSED':              return 'Disbursed'
      default:                       return 'Status unavailable'
    }
  }

  const getStatusHint = (status) => {
    switch (String(status || '').toUpperCase()) {
      case 'DRAFT': case 'PENDING':  return 'Your application is saved but not yet submitted.'
      case 'SUBMITTED':              return 'The application has been finalized and sent for review.'
      case 'UNDER_REVIEW':           return 'The officer team is checking your submission.'
      case 'APPROVED':               return 'The application has cleared review.'
      case 'REJECTED':               return 'The application was rejected after review.'
      case 'DISBURSED':              return 'Funds have been released for this application.'
      default:                       return 'Please open the details panel for more information.'
    }
  }

  const avatarLetter = (profile?.fullName || profile?.username || 'U').trim().charAt(0).toUpperCase()
  const displayName  = profile?.fullName || profile?.username || 'Beneficiary'
  const firstName    = displayName.split(' ')[0]

  /* ── Static notifications (contextual, no new API) ── */
  const notifications = [
    {
      id: 1, type: 'green', icon: <Icon.Bell />,
      title: 'New Housing Scheme Launched',
      desc: 'Deslepada Housing Scheme applications are now open.',
      time: '2 hours ago',
    },
    {
      id: 2, type: 'yellow', icon: <Icon.Clock />,
      title: 'Scholarship Deadline Extended',
      desc: 'Education scholarship deadline has been extended by 15 days.',
      time: '1 day ago',
    },
    {
      id: 3, type: 'blue', icon: <Icon.Activity />,
      title: 'Maintenance Update',
      desc: 'Portal will undergo scheduled maintenance this Sunday.',
      time: '2 days ago',
    },
    {
      id: 4, type: 'green', icon: <Icon.CheckCircle />,
      title: 'New Healthcare Scheme',
      desc: 'Healthcare support scheme is now available for applications.',
      time: '3 days ago',
    },
  ]

  const mainNavItems = [
    { key: 'schemes',  label: 'Available Schemes',   icon: <Icon.Grid /> },
    { key: 'tracking', label: 'My Schemes',          icon: <Icon.Folder />, badge: hasApplications ? appliedSchemes.length : null },
    { key: 'funds',    label: 'Funds Tracker',       icon: <Icon.DollarSign />, badge: hasFundsAllocation ? 1 : null },
    { key: 'profile',  label: 'Profile Management',  icon: <Icon.User /> },
  ]

  const quickNavItems = [
    { key: 'apply',     label: 'Apply for Scheme',    icon: <Icon.PlusCircle />, action: () => setActiveTab('schemes') },
    { key: 'track',     label: 'Track Application',   icon: <Icon.Search2 />,    action: () => setActiveTab('tracking') },
    { key: 'grievance', label: 'Grievance Redressal', icon: <Icon.MessageSquare />, disabled: true },
    { key: 'help',      label: 'Help & Support',      icon: <Icon.HelpCircle />,    disabled: true },
  ]

  /* ─────────────────────────────────────────────────────────────────────── */
  return (
    <div className="dashboard-shell" data-theme="light">
      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className={`toast toast--${toast.type}`}
            role="alert"
            aria-live="polite"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            {toast.type === 'success'
              ? <Icon.CheckCircle />
              : <Icon.XCircle />
            }
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating Top Header ── */}
      <div className="dash-header-wrapper">
        <header className="dash-header-pill" role="banner">
          {/* Brand */}
          <div className="dash-header__brand">
            <img src={logo} alt="GS Gov Subsidy Logo" className="dash-header__brand-logo" />
            <div className="dash-header__brand-text">
              <span className="dash-header__brand-name">GS GOV SUBSIDY</span>
              <span className="dash-header__brand-sub">Portal Dashboard</span>
            </div>
          </div>
          
          <div className="dash-header__right">
            {/* User profile area */}
            <div className="dash-header__user-pill" role="button" aria-label="User menu" tabIndex={0}>
              <span className="badge-dot-green"></span>
              <span className="dash-header__user-name">{displayName}</span>
            </div>

            {/* Logout */}
            <button onClick={handleLogout} className="btn-logout-pill" aria-label="Sign out">
              <span>Logout</span>
              <Icon.LogOut />
            </button>
          </div>
        </header>
      </div>

      {/* ── Body: Sidebar + Main ── */}
      <div className="dashboard-body">

        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div
            className="sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* ── SIDEBAR ── */}
        <nav
          className={`sidebar${sidebarOpen ? ' sidebar--open' : ''}`}
          aria-label="Main navigation"
        >
          {/* Brand */}
          <div className="sidebar__brand">
            <img src={logo} alt="GS Gov Subsidy Logo" className="sidebar__brand-logo" />
            <div className="sidebar__brand-text">
              <span className="sidebar__brand-name">GS GOV SUBSIDY</span>
              <span className="sidebar__brand-sub">Portal Dashboard</span>
            </div>
          </div>

          {/* Nav */}
          <div className="sidebar__nav">
            {mainNavItems.map(item => (
              <button
                key={item.key}
                className={`sidebar__nav-item${activeTab === item.key ? ' active' : ''}`}
                onClick={() => { setActiveTab(item.key); setSidebarOpen(false) }}
                aria-current={activeTab === item.key ? 'page' : undefined}
              >
                <span className="sidebar__nav-icon" aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
                {item.badge != null && (
                  <span className="sidebar__nav-badge" aria-label={`${item.badge} items`}>
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Eligibility card at bottom */}
          <div className="sidebar__eligibility-card" role="complementary" aria-label="Eligibility checker">
            <div className="sidebar__elig-icon" aria-hidden="true">
              <Icon.Gift />
            </div>
            <div className="sidebar__elig-title">Check Your Eligibility</div>
            <div className="sidebar__elig-desc">
              Find schemes you&rsquo;re eligible for based on your profile.
            </div>
            <button
              className="sidebar__elig-btn"
              onClick={() => setActiveTab('schemes')}
              aria-label="Check scheme eligibility"
            >
              Check Now →
            </button>
          </div>
        </nav>

        {/* ── MAIN CONTENT ── */}
        <main className="dashboard-main" id="main-content" tabIndex={-1}>
          <div className="dashboard-content">

            <AnimatePresence mode="wait">



              {/* ════════════════════ TAB: BROWSE SCHEMES ════════════════════ */}
              {activeTab === 'schemes' && (
                <motion.div
                  key="schemes"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="pane-header">
                    <h1>Browse Government Schemes</h1>
                    <p>View eligibility requirements and submit online applications for subsidies directly processed through DBTs.</p>
                  </div>

                  <div className="filter-bar">
                    <div className="search-box" role="search">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                      <input
                        type="text"
                        placeholder="Search schemes by name or keywords..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        aria-label="Search schemes"
                      />
                    </div>
                    <div className="category-chips" role="group" aria-label="Filter by category">
                      {['All', 'Agriculture', 'Housing', 'Education', 'Healthcare'].map(cat => (
                        <button
                          key={cat}
                          className={`cat-chip${selectedCategory === cat ? ' active' : ''}`}
                          onClick={() => setSelectedCategory(cat)}
                          aria-pressed={selectedCategory === cat}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {loadingSchemes ? (
                    <div className="empty-state"><p>Loading schemes…</p></div>
                  ) : filteredSchemes.length > 0 ? (
                    <div className="schemes-grid">
                      {filteredSchemes.map(scheme => (
                        <motion.div
                          className="scheme-card"
                          key={scheme.schemeCode}
                          whileHover={{ y: -3 }}
                        >
                          <div className="scheme-card__header">
                            <span className={`scheme-card__category category--${String(scheme.category || '').toLowerCase()}`}>
                              {scheme.category}
                            </span>
                          </div>
                          <h3>{scheme.name}</h3>
                          <p className="scheme-card__desc">{scheme.description}</p>
                          <div className="scheme-card__meta">
                            <div>
                              <span className="meta-label">Subsidy Amount</span>
                              <span className="meta-value accent">{scheme.amount}</span>
                            </div>
                            <div>
                              <span className="meta-label">Processing</span>
                              <span className="meta-value">{scheme.processingTime}</span>
                            </div>
                          </div>
                          <div className="scheme-card__actions">
                            {(() => {
                              const appForScheme = getApplicationForScheme(applications, scheme.schemeCode)
                              const appStatus = getApplicationStatus(appForScheme)
                              if (!appForScheme) return (
                                <Link to={`/scheme/${scheme.schemeCode}`} className="btn-card-view btn-apply">
                                  View Scheme Details →
                                </Link>
                              )
                              if (isDraftStatus(appStatus)) return (
                                <Link to={`/scheme/${scheme.schemeCode}`} className="btn-card-view btn-apply">
                                  Continue Application
                                </Link>
                              )
                              return (
                                <Link to={`/tracking/${scheme.schemeCode}`} className="btn-card-view btn-apply">
                                  Track Application
                                </Link>
                              )
                            })()}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <h3>No schemes match your criteria</h3>
                      <p>Try refining your search terms or selecting another category filter.</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ════════════════════ TAB: MY SCHEMES ════════════════════ */}
              {activeTab === 'tracking' && (
                <motion.div
                  key="tracking"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="pane-header">
                    <h1>My Schemes</h1>
                    <p>Review the schemes you have applied for and open any one to see the latest application details.</p>
                  </div>

                  {!hasApplications ? (
                    <div className="tracking-empty-state">
                      <div className="tracking-empty-card">
                        <div className="tracking-empty-card__icon">
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                            <rect x="3" y="4" width="18" height="18" rx="2"/>
                            <path d="M16 2v4M8 2v4M3 10h18M10 14l2 2 4-4"/>
                          </svg>
                        </div>
                        <h3>No Schemes Yet</h3>
                        <p>Once you apply for a scheme, it will appear here with the current application status and details.</p>
                        <button
                          onClick={() => setActiveTab('schemes')}
                          className="button button--primary btn-apply"
                          style={{ marginTop: '1.2rem' }}
                        >
                          Browse Schemes
                        </button>
                      </div>

                      <div style={{ marginTop: '2rem' }}>
                        <div className="pane-header" style={{ marginBottom: '1rem' }}>
                          <h2 style={{ fontSize: '1.25rem', margin: '0 0 0.35rem' }}>Available schemes you can apply for</h2>
                          <p style={{ marginTop: 0 }}>Open any scheme to review eligibility and submit your application.</p>
                        </div>
                        <div className="schemes-grid">
                          {schemes.slice(0, 4).map(scheme => (
                            <motion.div
                              className="scheme-card"
                              key={scheme.schemeCode}
                              whileHover={{ y: -3 }}
                            >
                              <div className="scheme-card__header">
                                <span className={`scheme-card__category category--${String(scheme.category || '').toLowerCase()}`}>
                                  {scheme.category}
                                </span>
                              </div>
                              <h3>{scheme.name}</h3>
                              <p className="scheme-card__desc">{scheme.description}</p>
                              <div className="scheme-card__meta">
                                <div>
                                  <span className="meta-label">Subsidy Amount</span>
                                  <span className="meta-value accent">{scheme.amount}</span>
                                </div>
                                <div>
                                  <span className="meta-label">Processing</span>
                                  <span className="meta-value">{scheme.processingTime}</span>
                                </div>
                              </div>
                              <div className="scheme-card__actions">
                                <Link to={`/scheme/${scheme.schemeCode}`} className="btn-card-view btn-apply">
                                  View Scheme Details →
                                </Link>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="tracking-list">
                      {appliedSchemes.map(({ app, schemeCode, schemeName, schemeDescription }) => {
                        const appStatus = getApplicationStatus(app)
                        const submittedLabel = formatApplicationDate(app.submittedDate || app.createdAt)
                        const applicationCode = app.applicationCode || app.applicationId || '—'

                        return (
                          <div
                            className="tracking-card tracking-card--clickable tracking-card--scheme"
                            key={schemeCode}
                            onClick={() => navigate(`/tracking/${schemeCode}`)}
                            role="button"
                            tabIndex={0}
                            aria-label={`${schemeName} — ${getStatusLabel(appStatus)}`}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                navigate(`/tracking/${schemeCode}`)
                              }
                            }}
                          >
                            <div className="tracking-card__top">
                              <div className="tracking-card__copy">
                                <h4>{schemeName}</h4>
                                <p className="tracking-card__strap">{schemeDescription}</p>
                                <p className="tracking-card__summary">{getStatusLabel(appStatus)}</p>
                              </div>
                              <span className={`tracking-badge tracking-badge--${String(appStatus).toLowerCase()}`}>
                                {appStatus || 'DRAFT'}
                              </span>
                            </div>

                            <div className="tracking-card__meta tracking-card__meta--scheme">
                              <div>
                                <span className="meta-label">Submitted</span>
                                <span className="meta-value">{submittedLabel}</span>
                              </div>
                              <div>
                                <span className="meta-label">Application Code</span>
                                <span className="meta-value">{applicationCode}</span>
                              </div>
                            </div>

                            <div className="tracking-card__footer tracking-card__footer--scheme">
                              <span>{getStatusHint(appStatus)}</span>
                              <div className="tracking-card__actions">
                                <Link
                                  to={`/funds/${schemeCode}`}
                                  className="tracking-card__secondary-link"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Funds tracker
                                </Link>
                                <Link
                                  to={`/tracking/${schemeCode}`}
                                  className="tracking-card__cta"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  View application details →
                                </Link>
                              </div>
                            </div>
                            {app.remarks && (
                              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 1.5rem 1rem', padding: '0.75rem 1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                                <strong>Remarks:</strong> {app.remarks}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ════════════════════ TAB: FUNDS TRACKER ════════════════════ */}
              {activeTab === 'funds' && (
                <motion.div
                  key="funds"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="pane-header">
                    <h1>Funds Tracker</h1>
                    <p>See your current funds utilization and jump into the detailed disbursement timeline.</p>
                  </div>

                  {!hasFundsAllocation || !fundedSchemeCode ? (
                    <div className="tracking-empty-state">
                      <div className="tracking-empty-card">
                        <div className="tracking-empty-card__icon">
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                            <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                          </svg>
                        </div>
                        <h3>No allocated funds yet</h3>
                        <p>You can browse schemes and apply first. Once a beneficiary record is created, this tracker will show your funds here.</p>
                        <button
                          onClick={() => setActiveTab('schemes')}
                          className="button button--primary btn-apply"
                          style={{ marginTop: '1.2rem' }}
                        >
                          Browse Schemes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="funds-summary-grid" style={{ marginTop: '0.5rem' }}>
                      <div className="funds-summary-card">
                        <div className="funds-summary-card__label">Current Allocated</div>
                        <div className="funds-summary-card__amount">₹{currentAllocated.toLocaleString('en-IN')}</div>
                        <div className="funds-summary-card__caption">From approved subsidy plan</div>
                      </div>
                      <div className="funds-summary-card">
                        <div className="funds-summary-card__label">Disbursed So Far</div>
                        <div className="funds-summary-card__amount funds-summary-card__amount--success">₹{currentDisbursed.toLocaleString('en-IN')}</div>
                        <div className="funds-summary-card__caption">Already transferred</div>
                      </div>
                      <div className="funds-summary-card funds-summary-card--accent">
                        <div className="funds-summary-card__label">Remaining Balance</div>
                        <div className="funds-summary-card__amount funds-summary-card__amount--accent">₹{currentRemaining.toLocaleString('en-IN')}</div>
                        <div className="funds-summary-card__caption">Available for upcoming milestones</div>
                      </div>
                    </div>
                  )}

                  {hasFundsAllocation && fundedSchemeCode && (
                    <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <Link to={`/funds/${fundedSchemeCode}`} className="button button--primary">
                        Open detailed tracker
                      </Link>
                      <Link to={`/tracking/${fundedSchemeCode}`} className="button button--ghost">
                        View application details
                      </Link>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ════════════════════ TAB: PROFILE ════════════════════ */}
              {activeTab === 'profile' && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.25 }}
                >
                  <ProfilePanel
                    profile={profile}
                    role={profile?.role || 'BENEFICIARY'}
                    editable
                    deletable
                    onSave={handleSaveProfile}
                    onDelete={() => setShowDeleteModal(true)}
                  />
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* ── Account Deletion Modal (unchanged logic) ── */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
            <motion.div
              className="modal-panel modal-panel--danger"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
            >
              <h3 id="delete-modal-title">Permanently Delete Account?</h3>
              <p className="danger-text">
                This action is irreversible. Your account and all associated data will be permanently deleted from the system.
              </p>

              <div className="delete-confirm-box">
                <label htmlFor="delete-confirm-input">
                  To confirm, type <strong>DELETE</strong> in the box below:
                </label>
                <input
                  id="delete-confirm-input"
                  type="text"
                  placeholder="Type DELETE"
                  value={deleteConfirmInput}
                  onChange={(e) => setDeleteConfirmInput(e.target.value)}
                  aria-describedby="delete-modal-title"
                />
              </div>

              <div className="modal-actions">
                <button
                  className="button button--ghost"
                  onClick={() => {
                    setShowDeleteModal(false)
                    setDeleteConfirmInput('')
                  }}
                >
                  Keep Account
                </button>
                <button
                  className="btn-danger-confirm"
                  onClick={handleDeleteAccount}
                >
                  Yes, Delete My Account
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
