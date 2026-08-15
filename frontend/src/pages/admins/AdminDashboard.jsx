import '../../styles/Dashboard.css';
import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getSchemes, addScheme, updateScheme } from '../../services/schemeService'
import ThemeToggle from '../../components/ThemeToggle'
import { updateApprovalStatus, getOfficerRequests } from '../../services/adminService'
import { getApplications } from '../../services/applicationService'
import { getProfilesByRole } from '../../services/adminService'
import api from '../../services/api'
import logo from '../../assets/icons/logo.png'
import { FaChartBar, FaHistory, FaUserShield, FaTools, FaClipboardList, FaComments, FaFileAlt, FaHourglassHalf, FaCheckCircle, FaTimesCircle, FaMoneyBillWave, FaFileInvoice, FaCheck } from 'react-icons/fa'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const contentRef = useRef(null)

  // Auth guard: backend cookie + profile role check
  useEffect(() => {
    async function verifyAdmin() {
      try {
        const res = await api.get('/gov/auth/profile/get')
        const user = res.data?.data || res.data
        if (!user || String(user.role || '').toUpperCase() !== 'ADMIN') {
          navigate('/login')
        }
      } catch {
        navigate('/login')
      }
    }
    verifyAdmin()
  }, [navigate])

  const handleLogout = () => {
    api.post('/gov/auth/signout').catch(() => {})
    navigate('/login')
  }

  // Load schemes state
  const [schemes, setSchemes] = useState([])
  const [actionLogs, setActionLogs] = useState([])
  const [showSchemeModal, setShowSchemeModal] = useState(false)
  const [editingScheme, setEditingScheme] = useState(null)
  
  useEffect(() => {
    async function fetchSchemes() {
      const data = await getSchemes()
      setSchemes(data || [])
    }
    fetchSchemes()
  }, [])

  useEffect(() => {
    async function fetchApplications() {
      try {
        const data = await getApplications()
        setApplications(Array.isArray(data) ? data : data?.data || [])
      } catch {
        setApplications([])
      }
    }
    fetchApplications()
  }, [])

  useEffect(() => {
    async function fetchOfficers() {
      try {
        const data = await getProfilesByRole('FIELD_OFFICER')
        setOfficers(Array.isArray(data) ? data : data?.data || [])
      } catch {
        setOfficers([])
      }
    }
    fetchOfficers()
  }, [])

  // Scheme Form State (Maps to SchemesDto + Rules/Docs)
  const [schemeForm, setSchemeForm] = useState({
    schemeCode: '',
    schemeName: '',
    description: '',
    allocatedFunds: '',
    minimumEligibleScore: 50,
    active: true,
    categoryId: 1,
    rules: [],
    documents: [],
    fields: []
  })

  const getCategoryNameById = (id) => {
    switch (Number(id)) {
      case 1:
        return 'Agriculture'
      case 2:
        return 'Housing'
      case 3:
        return 'Education'
      case 4:
        return 'Healthcare'
      default:
        return 'General'
    }
  }

  // Log filter State
  const [logSearch, setLogSearch] = useState('')
  const [logActionFilter, setLogActionFilter] = useState('All')
  const [logOfficerFilter, setLogOfficerFilter] = useState('All')

  // Load backend-backed data with empty-state fallbacks
  const [applications, setApplications] = useState([])
  const [officers, setOfficers] = useState([])
  const [queries, setQueries] = useState([])

  // View state (declared early so useEffects below can reference it)
  const [activeTab, setActiveTab] = useState('analytics') // 'analytics' | 'history' | 'officers' | 'queries'

  // Officer Requests from backend (GET /gov/auth/officer/get-request)
  const [officerRequests, setOfficerRequests] = useState([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [requestsFilter, setRequestsFilter] = useState('All')

  async function fetchOfficerRequests() {
    setRequestsLoading(true)
    try {
      const data = await getOfficerRequests()
      setOfficerRequests(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to fetch officer requests:', err)
    } finally {
      setRequestsLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'officer-requests') fetchOfficerRequests()
  }, [activeTab])

  async function handleRequestAction(request, status) {
    const uniqueId = request.uniqueId || request.uniqueID || request.id
    if (!uniqueId) {
      showToast('Cannot act: request identifier missing from backend response.', 'error')
      return
    }
    try {
      const res = await updateApprovalStatus(uniqueId, status)
      if (res.status) {
        showToast(`Request ${status === 'APPROVED' ? 'Approved' : 'Rejected'} successfully!`)
        setOfficerRequests(prev =>
          prev.map(item =>
            (item.uniqueId || item.uniqueID || item.id) === uniqueId
              ? { ...item, status }
              : item
          )
        )
        await fetchOfficerRequests()
      } else {
        showToast(res.message || 'Action failed', 'error')
      }
    } catch (err) {
      console.error('Request action failed:', err)
      showToast(err.message || 'Error updating request status', 'error')
    }
  }

  // View state (activeTab declared above near line 97 to avoid temporal dead zone)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [officerFilter, setOfficerFilter] = useState('All')
  const [selectedApp, setSelectedApp] = useState(null)
  const [selectedOfficer, setSelectedOfficer] = useState(null)
  const [selectedQuery, setSelectedQuery] = useState(null)
  const [queryReplyText, setQueryReplyText] = useState('')
  const [reassignApp, setReassignApp] = useState(null)
  const [targetOfficerId, setTargetOfficerId] = useState('')
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey)
    window.setTimeout(() => {
      contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 40)
  }

  // Load Action Logs when needed
  useEffect(() => {
    async function fetchAuditLogs() {
      if (activeTab === 'action-logs') {
        try {
          const res = await api.get('/api/v1/disbursement/audit-logs')
          const data = res.data?.data || res.data || []
          const formattedLogs = data.map(log => ({
            id: log.auditId || String(log.id),
            timestamp: log.createdAt ? new Date(log.createdAt).toLocaleString('en-IN') : 'N/A',
            officerName: log.user ? log.user.fullName : 'System / Admin',
            officerId: log.user ? log.user.uniqueID : 'N/A',
            action: log.action || 'UNKNOWN',
            details: log.description || 'No details',
            targetId: 'N/A'
          }))
          // Sort by timestamp descending
          formattedLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          setActionLogs(formattedLogs)
        } catch (error) {
          console.error("Failed to fetch audit logs", error)
          setActionLogs([])
        }
      }
    }
    fetchAuditLogs()
  }, [activeTab])

  // Scheme CRUD Handlers
  function openCreateScheme() {
    setEditingScheme(null)
    setSchemeForm({
      schemeCode: '',
      schemeName: '',
      description: '',
      allocatedFunds: '',
      minimumEligibleScore: 50,
      active: true,
      categoryId: 1,
      rules: [],
      documents: [],
      fields: []
    })
    setShowSchemeModal(true)
  }

  function openEditScheme(scheme) {
    setEditingScheme(scheme)
    setSchemeForm({
      schemeCode: scheme.schemeCode || '',
      schemeName: scheme.schemeName || scheme.name || '',
      description: scheme.description || '',
      allocatedFunds: scheme.allocatedFunds || 0,
      minimumEligibleScore: scheme.minimumEligibleScore || 50,
      active: scheme.active ?? true,
      categoryId: scheme.categoryId || scheme.category?.id || 1,
      rules: scheme.rules || [],
      documents: scheme.documents || [],
      fields: scheme.fields || []
    })
    setShowSchemeModal(true)
  }

  const addRule = () => setSchemeForm(p => ({ ...p, rules: [...p.rules, { fieldName: 'AGE', operator: 'GREATER_THAN_EQUAL', expectedValue: '', points: 0 }] }))
  const removeRule = (i) => setSchemeForm(p => ({ ...p, rules: p.rules.filter((_, idx) => idx !== i) }))
  const updateRule = (i, k, v) => setSchemeForm(p => { const r = [...p.rules]; r[i][k] = v; return { ...p, rules: r } })

  const addDocument = () => setSchemeForm(p => ({ ...p, documents: [...p.documents, { documentType: 'AADHAAR', mandatory: true }] }))
  const removeDocument = (i) => setSchemeForm(p => ({ ...p, documents: p.documents.filter((_, idx) => idx !== i) }))
  const updateDocument = (i, k, v) => setSchemeForm(p => { const d = [...p.documents]; d[i][k] = v; return { ...p, documents: d } })

  const addField = () => setSchemeForm(p => ({ ...p, fields: [...p.fields, { fieldName: 'ANNUAL_INCOME', mandatory: true }] }))
  const removeField = (i) => setSchemeForm(p => ({ ...p, fields: p.fields.filter((_, idx) => idx !== i) }))
  const updateField = (i, k, v) => setSchemeForm(p => { const f = [...p.fields]; f[i][k] = v; return { ...p, fields: f } })

  async function handleSaveScheme(e) {
    e.preventDefault()
    if (!schemeForm.schemeName || !schemeForm.allocatedFunds) {
      showToast('Please fill out Scheme Name and Allocated Funds', 'error')
      return
    }

    const processedScheme = {
      schemeCode: schemeForm.schemeCode,
      schemeName: schemeForm.schemeName,
      description: schemeForm.description,
      allocatedFunds: Number(schemeForm.allocatedFunds),
      minimumEligibleScore: Number(schemeForm.minimumEligibleScore),
      active: schemeForm.active,
      categoryId: Number(schemeForm.categoryId),
      categoryName: getCategoryNameById(schemeForm.categoryId),
      rules: schemeForm.rules,
      documents: schemeForm.documents,
      fields: schemeForm.fields
    }

    try {
      const res = editingScheme
        ? await updateScheme(editingScheme.schemeCode || editingScheme.id, processedScheme)
        : await addScheme(processedScheme)
      if (res.status) {
        showToast(`Scheme "${processedScheme.schemeName}" ${editingScheme ? 'updated' : 'saved'} successfully!`)

        setShowSchemeModal(false)
        setEditingScheme(null)
        const updatedSchemes = await getSchemes()
        setSchemes(updatedSchemes)
      } else {
        showToast(res.message || 'Failed to save scheme', 'error')
      }
    } catch (error) {
      showToast('Error saving scheme to backend', 'error')
    }
  }

  function handleDeleteScheme(schemeId) {
    if (window.confirm('Are you sure you want to delete this scheme? This will prevent citizens from applying.')) {
      const nextSchemes = schemes.filter(s => s.id !== schemeId)
      setSchemes(nextSchemes)
      showToast('Scheme deleted successfully!')
    }
  }

  // Action Logs Filters
  const filteredLogs = actionLogs.filter(log => {
    const matchesSearch = log.details.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.id.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.targetId.toLowerCase().includes(logSearch.toLowerCase())
    const matchesAction = logActionFilter === 'All' || log.action === logActionFilter
    const matchesOfficer = logOfficerFilter === 'All' || log.officerId === logOfficerFilter
    return matchesSearch && matchesAction && matchesOfficer
  })

  // Calculate high-level analytics
  const totalApps = applications.length
  const pendingApps = applications.filter(a => a.status === 'Pending').length
  const approvedApps = applications.filter(a => a.status === 'Approved').length
  const rejectedApps = applications.filter(a => a.status === 'Rejected').length

  const totalFundsDisbursed = applications
    .filter(a => a.status === 'Approved')
    .reduce((sum, a) => {
      const scheme = schemes.find(s => s.id === a.schemeId)
      // Extract number from amount e.g. 6000 or 50000 or scheme monetary value
      return sum + (a.amount || (scheme ? parseInt(scheme.amount.replace(/[^0-9]/g, '')) || 10000 : 10000))
    }, 0)

  // Filtered applications for History tab
  const filteredApps = applications.filter(app => {
    const matchesSearch =
      app.applicant.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.aadhaar.includes(searchTerm)

    const matchesStatus = statusFilter === 'All' || app.status === statusFilter
    const matchesOfficer = officerFilter === 'All' || app.assignedOfficerId === officerFilter

    return matchesSearch && matchesStatus && matchesOfficer
  })

  // Handle reassigning application to another officer
  function handleReassignSubmit(e) {
    e.preventDefault()
    if (!targetOfficerId) {
      showToast('Please select a target officer', 'error')
      return
    }

    const newOfficerObj = officers.find(o => o.officerId === targetOfficerId)
    if (!newOfficerObj) return

    const updatedApps = applications.map(app => {
      if (app.id === reassignApp.id) {
        return {
          ...app,
          assignedOfficerId: newOfficerObj.officerId,
          assignedOfficerName: newOfficerObj.fullName
        }
      }
      return app
    })

    setApplications(updatedApps)
    showToast(`Application ${reassignApp.id} reassigned to ${newOfficerObj.fullName}`)
    setReassignApp(null)
  }

  // Admin Quick Action: Approve / Reject application override
  async function handleAdminStatusChange(appId, newStatus) {
    // ── 1. Optimistic local update ──────────────────────────────────────
    const updatedApps = applications.map(app => {
      if (app.id === appId) {
        return {
          ...app,
          status: newStatus,
          remarks: `[Admin Override]: Status changed to ${newStatus}`
        }
      }
      return app
    })

    setApplications(updatedApps)

    if (selectedApp && selectedApp.id === appId) {
      setSelectedApp(prev => ({ ...prev, status: newStatus, remarks: `[Admin Override]: Status changed to ${newStatus}` }))
    }

    // ── 2. Sync to backend ──────────────────────────────────────────────
    try {
      await updateApprovalStatus(appId, newStatus.toUpperCase())
      showToast(`Application ${appId} marked as ${newStatus}`)
    } catch (err) {
      console.warn('Backend sync failed, local update preserved:', err.message)
      showToast(`Application ${appId} marked as ${newStatus} (offline mode)`)
    }
  }

  return (
    <div className="dashboard-layout" style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className={`toast toast--${toast.type}`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ position: 'fixed', top: '1rem', right: '1.5rem', zIndex: 1100 }}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Admin Top Navigation Bar ── */}
      <header
        className="topbar"
        style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          padding: '1rem 2rem',
          background: 'var(--panel-strong)',
          borderBottom: '1px solid var(--border)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src={logo} alt="GS Portal" style={{ height: '36px' }} />
            <div>
              <strong style={{ fontSize: '1.1rem', color: 'var(--text)', display: 'block' }}>GS Admin Command Center</strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>National Subsidy Tracking & Oversight</span>
            </div>
          </Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.05)', padding: '0.4rem 0.8rem', borderRadius: '20px', border: '1px solid var(--border)' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
            <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>System Administrator</span>
          </div>

          <ThemeToggle />

          <Link to="/" className="button button--ghost" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
            Back to Home
          </Link>
          <button
            onClick={handleLogout}
            className="button button--primary"
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', background: '#dc2626', border: 'none', cursor: 'pointer' }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* ── Main Content Container ── */}
      <div ref={contentRef} style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem', scrollMarginTop: '1rem' }}>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', flexWrap: 'wrap' }}
        >
          <button
            className={`button ${activeTab === 'analytics' ? 'button--primary' : 'button--ghost'}`}
            onClick={() => handleTabChange('analytics')}
            style={{ fontSize: '0.9rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <FaChartBar /> Analytics & Insights
          </button>
          <button
            className={`button ${activeTab === 'history' ? 'button--primary' : 'button--ghost'}`}
            onClick={() => handleTabChange('history')}
            style={{ fontSize: '0.9rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <FaHistory /> Application History ({applications.length})
          </button>
          <button
            className={`button ${activeTab === 'officers' ? 'button--primary' : 'button--ghost'}`}
            onClick={() => handleTabChange('officers')}
            style={{ fontSize: '0.9rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <FaUserShield /> Officer Work Tracker ({officers.length})
          </button>
          <button
            className={`button ${activeTab === 'schemes' ? 'button--primary' : 'button--ghost'}`}
            onClick={() => handleTabChange('schemes')}
            style={{ fontSize: '0.9rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <FaTools /> Manage Schemes ({schemes.length})
          </button>
          <button
            className={`button ${activeTab === 'action-logs' ? 'button--primary' : 'button--ghost'}`}
            onClick={() => handleTabChange('action-logs')}
            style={{ fontSize: '0.9rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <FaUserShield /> Officer Actions History
          </button>
          <button
            className={`button ${activeTab === 'officer-requests' ? 'button--primary' : 'button--ghost'}`}
            onClick={() => handleTabChange('officer-requests')}
            style={{ fontSize: '0.9rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <FaClipboardList /> Officer Requests ({officerRequests.length})
          </button>
          <button
            className={`button ${activeTab === 'queries' ? 'button--primary' : 'button--ghost'}`}
            onClick={() => handleTabChange('queries')}
            style={{ fontSize: '0.9rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <FaComments /> Citizen Queries ({queries.length})
          </button>
        </motion.div>

        {/* ── TAB 1: ANALYTICS & INSIGHTS ── */}
        <AnimatePresence mode="wait">
        {activeTab === 'analytics' && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 22, rotateX: -10, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
            exit={{ opacity: 0, y: -18, rotateX: 8, scale: 0.985 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            style={{ transformOrigin: 'top center' }}
          >
            {/* High Level Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>

              {/* Card 1: Total Applications */}
              <div className="admin-card" style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--panel-strong)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', fontSize: '0.84rem', marginBottom: '0.5rem' }}>
                  <span>Total Applications</span>
                  <FaClipboardList style={{ fontSize: '1.1rem', opacity: 0.7 }} />
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)' }}>{totalApps}</div>
                <span style={{ fontSize: '0.78rem', color: '#82aeca' }}>Across all subsidy schemes</span>
              </div>

              {/* Card 2: Pending Applications */}
              <div className="admin-card" style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--panel-strong)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', fontSize: '0.84rem', marginBottom: '0.5rem' }}>
                  <span>Pending Action</span>
                  <FaHourglassHalf style={{ fontSize: '1.1rem', opacity: 0.7 }} />
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f59e0b' }}>{pendingApps}</div>
                <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Requires officer verification</span>
              </div>

              {/* Card 3: Approved */}
              <div className="admin-card" style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--panel-strong)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', fontSize: '0.84rem', marginBottom: '0.5rem' }}>
                  <span>Approved & Sanctioned</span>
                  <FaCheckCircle style={{ fontSize: '1.1rem', opacity: 0.7, color: '#22c55e' }} />
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#22c55e' }}>{approvedApps}</div>
                <span style={{ fontSize: '0.78rem', color: '#8ed66a' }}>{((approvedApps / totalApps) * 100).toFixed(1)}% Approval rate</span>
              </div>

              {/* Card 4: Rejected */}
              <div className="admin-card" style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--panel-strong)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', fontSize: '0.84rem', marginBottom: '0.5rem' }}>
                  <span>Rejected Applications</span>
                  <FaTimesCircle style={{ fontSize: '1.1rem', opacity: 0.7, color: '#ef4444' }} />
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ef4444' }}>{rejectedApps}</div>
                <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Ineligible / invalid documents</span>
              </div>

              {/* Card 5: Disbursed Funds */}
              <div className="admin-card" style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--panel-strong)', border: '1px solid var(--border)', gridColumn: 'span 2' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', fontSize: '0.84rem', marginBottom: '0.5rem' }}>
                  <span>Total Funds Disbursed</span>
                  <FaMoneyBillWave style={{ fontSize: '1.1rem', opacity: 0.7, color: '#ffc76a' }} />
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#ffc76a' }}>
                  ₹ {totalFundsDisbursed.toLocaleString('en-IN')}
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Direct Benefit Transfer (DBT) confirmed into beneficiary bank accounts</span>
              </div>

            </div>

            {/* Visual Analytics & Number Representations */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', marginBottom: '2rem' }}>

              {/* Application Status Distribution */}
              <div className="admin-card" style={{ padding: '1.5rem', borderRadius: '12px', background: 'var(--panel-strong)', border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1.2rem', color: 'var(--text)' }}>Application Status Breakdown</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1.25rem', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.06)', border: '1px solid rgba(34, 197, 94, 0.15)' }}>
                    <span style={{ fontWeight: 600, color: '#22c55e', fontSize: '0.95rem' }}>Approved</span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#22c55e' }}>{approvedApps}</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>/ {totalApps} ({totalApps > 0 ? ((approvedApps / totalApps) * 100).toFixed(0) : 0}%)</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1.25rem', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
                    <span style={{ fontWeight: 600, color: '#f59e0b', fontSize: '0.95rem' }}>Pending</span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b' }}>{pendingApps}</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>/ {totalApps} ({totalApps > 0 ? ((pendingApps / totalApps) * 100).toFixed(0) : 0}%)</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1.25rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                    <span style={{ fontWeight: 600, color: '#ef4444', fontSize: '0.95rem' }}>Rejected</span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444' }}>{rejectedApps}</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>/ {totalApps} ({totalApps > 0 ? ((rejectedApps / totalApps) * 100).toFixed(0) : 0}%)</span>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </motion.div>
        )}

        {/* ── TAB 2: APPLICATION HISTORY & AUDIT ── */}
        {activeTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 22, rotateX: -10, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
            exit={{ opacity: 0, y: -18, rotateX: 8, scale: 0.985 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            style={{ transformOrigin: 'top center' }}
          >

            {/* Filters Row */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search applicant name, App ID, or Aadhaar..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ flex: 1, minWidth: '240px', padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--panel-strong)', color: 'var(--text)' }}
              />

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{ padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--panel-strong)', color: 'var(--text)' }}
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>

              <select
                value={officerFilter}
                onChange={e => setOfficerFilter(e.target.value)}
                style={{ padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--panel-strong)', color: 'var(--text)' }}
              >
                <option value="All">All Officers</option>
                {officers.map(off => (
                  <option key={off.officerId} value={off.officerId}>{off.fullName} ({off.officerId})</option>
                ))}
              </select>
            </div>

            {/* History Table */}
            <div className="table-card" style={{ background: 'var(--panel-strong)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>App ID</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Applicant Name</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Scheme</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Submitted</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Assigned Officer</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Status</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApps.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
                        No application records matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredApps.map(app => {
                      const scheme = schemes.find(s => s.id === app.schemeId)
                      const statusColor = app.status === 'Approved' ? '#22c55e' : app.status === 'Rejected' ? '#ef4444' : '#f59e0b'
                      return (
                        <tr key={app.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '0.9rem 1.2rem', fontWeight: 700, fontFamily: 'monospace' }}>{app.id}</td>
                          <td style={{ padding: '0.9rem 1.2rem' }}>
                            <div style={{ fontWeight: 600 }}>{app.applicant}</div>
                            <small style={{ color: 'var(--muted)' }}>Aadhaar: {app.aadhaar}</small>
                          </td>
                          <td style={{ padding: '0.9rem 1.2rem', fontSize: '0.88rem' }}>
                            {scheme ? (scheme.name || scheme.title) : app.schemeId}
                          </td>
                          <td style={{ padding: '0.9rem 1.2rem', fontSize: '0.84rem', color: 'var(--muted)' }}>
                            {app.submittedDate}
                          </td>
                          <td style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>
                            <span style={{ fontWeight: 600 }}>{app.assignedOfficerName || '—'}</span>
                            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>ID: {app.assignedOfficerId || '—'}</div>
                          </td>
                          <td style={{ padding: '0.9rem 1.2rem' }}>
                            <span style={{ padding: '0.3rem 0.7rem', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 700, background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}40` }}>
                              {app.status}
                            </span>
                          </td>
                          <td style={{ padding: '0.9rem 1.2rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <button
                                className="button button--ghost"
                                style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                                onClick={() => setSelectedApp(app)}
                              >
                                View Details
                              </button>
                              <button
                                className="button button--ghost"
                                style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', borderColor: 'rgba(217, 130, 43, 0.4)', color: '#ffc76a' }}
                                onClick={() => { setReassignApp(app); setTargetOfficerId('') }}
                              >
                                Reassign
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* ── TAB 3: OFFICER WORK PROGRESS TRACKER ── */}
        {activeTab === 'officers' && (
          <motion.div
            key="officers"
            initial={{ opacity: 0, y: 22, rotateX: -10, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
            exit={{ opacity: 0, y: -18, rotateX: 8, scale: 0.985 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            style={{ transformOrigin: 'top center' }}
          >
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', margin: 0, color: 'var(--text)' }}>Officer Work Progress & Performance Tracker</h2>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>Monitor officer review queues, turnaround efficiency, approval ratios, and audit histories.</p>
              </div>
              <Link to="/officer/register" className="button button--primary" style={{ fontSize: '0.85rem' }}>
                + Register New Officer
              </Link>
            </div>

            {/* Officer Performance Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
              {officers.map(officer => {
                // Applications assigned to this officer
                const officerApps = applications.filter(a => a.assignedOfficerId === officer.officerId)
                const assignedCount = officerApps.length
                const pendingCount = officerApps.filter(a => a.status === 'Pending').length
                const approvedCount = officerApps.filter(a => a.status === 'Approved').length
                const rejectedCount = officerApps.filter(a => a.status === 'Rejected').length
                const reviewedCount = approvedCount + rejectedCount
                const approvalRate = reviewedCount > 0 ? ((approvedCount / reviewedCount) * 100).toFixed(0) : 100

                const loadStatus = pendingCount >= 3 ? { text: 'High Workload', color: '#ef4444' } : pendingCount >= 1 ? { text: 'Optimal Load', color: '#f59e0b' } : { text: 'Available', color: '#22c55e' }

                return (
                  <div
                    key={officer.officerId}
                    className="officer-progress-card"
                    style={{
                      background: 'var(--panel-strong)',
                      borderRadius: '14px',
                      border: '1px solid var(--border)',
                      padding: '1.4rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem'
                    }}
                  >
                    {/* Card Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text)' }}>{officer.fullName}</h3>
                        <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>{officer.designation}</span>
                        <div style={{ fontSize: '0.76rem', color: '#82aeca', marginTop: '0.2rem' }}>{officer.department || 'Subsidy Dept'} • {officer.district || 'District Nodal'}</div>
                      </div>
                      <span style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem', borderRadius: '12px', fontWeight: 700, background: `${loadStatus.color}20`, color: loadStatus.color, border: `1px solid ${loadStatus.color}40` }}>
                        {loadStatus.text}
                      </span>
                    </div>

                    {/* ID & Email Badge */}
                    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--muted)' }}>
                      <span style={{ background: 'rgba(255, 255, 255, 0.06)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontFamily: 'monospace' }}>ID: {officer.officerId}</span>
                      <span style={{ background: 'rgba(255, 255, 255, 0.06)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{officer.email}</span>
                    </div>

                    {/* Progress & Stat Metrics */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.03)', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                      <div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>{assignedCount}</div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Assigned</span>
                      </div>
                      <div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f59e0b' }}>{pendingCount}</div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Pending</span>
                      </div>
                      <div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#22c55e' }}>{reviewedCount}</div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Reviewed</span>
                      </div>
                    </div>

                    {/* Approval Rate Meter */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.4rem', color: 'var(--muted)' }}>
                        <span>Approval Rate</span>
                        <strong style={{ color: 'var(--text)' }}>{approvalRate}% ({approvedCount} approved / {rejectedCount} rejected)</strong>
                      </div>
                      <div style={{ height: '8px', borderRadius: '999px', background: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${approvalRate}%`, background: 'linear-gradient(90deg, #16a34a, #22c55e)', borderRadius: '999px' }} />
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button
                        className="button button--ghost"
                        style={{ flex: 1, fontSize: '0.78rem', padding: '0.45rem' }}
                        onClick={() => setSelectedOfficer({ officer, apps: officerApps })}
                      >
                        Activity Audit Log
                      </button>
                    </div>

                  </div>
                )
              })}
            </div>

          </motion.div>
        )}

        {/* ── TAB 4: CITIZEN SUPPORT QUERIES ── */}
        {activeTab === 'queries' && (
          <motion.div
            key="queries"
            initial={{ opacity: 0, y: 22, rotateX: -10, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
            exit={{ opacity: 0, y: -18, rotateX: 8, scale: 0.985 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            style={{ transformOrigin: 'top center' }}
          >
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.3rem', margin: 0, color: 'var(--text)' }}>Citizen Support Queries & Assistance Tickets</h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>Review messages submitted through the portal support desk and send officer responses.</p>
            </div>

            <div className="table-card" style={{ background: 'var(--panel-strong)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Ticket ID</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Submitter Name</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Contact Info</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Subject</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Submitted At</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Status</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {queries.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
                        No support queries submitted yet.
                      </td>
                    </tr>
                  ) : (
                    queries.map(q => {
                      const statusColor = q.status === 'Resolved' ? '#22c55e' : q.status === 'In Progress' ? '#82aeca' : '#f59e0b'
                      return (
                        <tr key={q.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '0.9rem 1.2rem', fontWeight: 700, fontFamily: 'monospace', color: '#ffc76a' }}>{q.id}</td>
                          <td style={{ padding: '0.9rem 1.2rem', fontWeight: 600 }}>{q.name}</td>
                          <td style={{ padding: '0.9rem 1.2rem', fontSize: '0.82rem' }}>
                            <div>{q.email}</div>
                            <small style={{ color: 'var(--muted)' }}>{q.phone || 'N/A'}</small>
                          </td>
                          <td style={{ padding: '0.9rem 1.2rem', fontSize: '0.88rem' }}>{q.subject}</td>
                          <td style={{ padding: '0.9rem 1.2rem', fontSize: '0.82rem', color: 'var(--muted)' }}>{q.submittedAt}</td>
                          <td style={{ padding: '0.9rem 1.2rem' }}>
                            <span style={{ padding: '0.25rem 0.65rem', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 700, background: `${statusColor}20`, color: statusColor, border: `1px solid ${statusColor}40` }}>
                              {q.status}
                            </span>
                          </td>
                          <td style={{ padding: '0.9rem 1.2rem', textAlign: 'right' }}>
                            <button
                              className="button button--ghost"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                              onClick={() => { setSelectedQuery(q); setQueryReplyText(q.reply || '') }}
                            >
                              Review & Respond
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* ── TAB: OFFICER REGISTRATION REQUESTS ── */}
        {activeTab === 'officer-requests' && (
          <motion.div
            key="officer-requests"
            initial={{ opacity: 0, y: 22, rotateX: -10, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
            exit={{ opacity: 0, y: -18, rotateX: 8, scale: 0.985 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            style={{ transformOrigin: 'top center' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', margin: 0, color: 'var(--text)' }}>Officer Registration Requests</h2>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>Review officer account requests. Approving creates a live system account.</p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <select
                  value={requestsFilter}
                  onChange={e => setRequestsFilter(e.target.value)}
                  style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--panel-strong)', color: 'var(--text)', fontSize: '0.85rem' }}
                >
                  <option value="All">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
                <button
                  className="button button--ghost"
                  style={{ fontSize: '0.82rem' }}
                  onClick={fetchOfficerRequests}
                  disabled={requestsLoading}
                >
                  {requestsLoading ? '⟳ Loading...' : '⟳ Refresh'}
                </button>
              </div>
            </div>

            <div className="table-card" style={{ background: 'var(--panel-strong)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Full Name</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Role</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Mobile No</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Region / District</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>State</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Submitted</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Status</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requestsLoading ? (
                    <tr><td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>Loading requests...</td></tr>
                  ) : officerRequests.filter(r => requestsFilter === 'All' || r.status === requestsFilter).length === 0 ? (
                    <tr><td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>No requests found for this filter.</td></tr>
                  ) : (
                    officerRequests
                      .filter(r => requestsFilter === 'All' || r.status === requestsFilter)
                      .map((r, idx) => {
                        const statusColor = r.status === 'APPROVED' ? '#22c55e' : r.status === 'REJECTED' ? '#ef4444' : '#f59e0b'
                        const submittedDate = r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '0.9rem 1.2rem', fontWeight: 600 }}>{r.fullName}</td>
                            <td style={{ padding: '0.9rem 1.2rem' }}>
                              <span style={{ padding: '0.2rem 0.55rem', borderRadius: '4px', background: 'rgba(130, 174, 202, 0.15)', fontSize: '0.8rem', color: '#82aeca', fontWeight: 600 }}>{r.role}</span>
                            </td>
                            <td style={{ padding: '0.9rem 1.2rem', fontSize: '0.87rem', fontFamily: 'monospace' }}>{r.mobileNo}</td>
                            <td style={{ padding: '0.9rem 1.2rem', fontSize: '0.87rem' }}>
                              <div>{r.region}</div>
                              <small style={{ color: 'var(--muted)' }}>{r.district}</small>
                            </td>
                            <td style={{ padding: '0.9rem 1.2rem', fontSize: '0.87rem' }}>{r.state}</td>
                            <td style={{ padding: '0.9rem 1.2rem', fontSize: '0.82rem', color: 'var(--muted)' }}>{submittedDate}</td>
                            <td style={{ padding: '0.9rem 1.2rem' }}>
                              <span style={{ padding: '0.25rem 0.65rem', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 700, background: `${statusColor}20`, color: statusColor, border: `1px solid ${statusColor}40` }}>
                                {r.status}
                              </span>
                            </td>
                            <td style={{ padding: '0.9rem 1.2rem', textAlign: 'right' }}>
                              {r.status === 'PENDING' ? (
                                <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                  <button
                                    type="button"
                                    className="button button--ghost"
                                    style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem', borderColor: 'rgba(34, 197, 94, 0.4)', color: '#22c55e' }}
                                    onClick={() => handleRequestAction(r, 'APPROVED')}
                                  >
                                    <FaCheck style={{ fontSize: '0.85rem' }} /> Approve
                                  </button>
                                  <button
                                    type="button"
                                    className="button button--ghost"
                                    style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#ef4444' }}
                                    onClick={() => handleRequestAction(r, 'REJECTED')}
                                  >
                                    <FaTimesCircle style={{ fontSize: '0.85rem' }} /> Reject
                                  </button>
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* ── TAB 5: MANAGE SCHEMES CRUD ── */}
        {activeTab === 'schemes' && (
          <motion.div
            key="schemes"
            initial={{ opacity: 0, y: 22, rotateX: -10, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
            exit={{ opacity: 0, y: -18, rotateX: 8, scale: 0.985 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            style={{ transformOrigin: 'top center' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', margin: 0, color: 'var(--text)' }}>Manage Government Subsidy Schemes</h2>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>Create new subsidy campaigns, update criteria parameters, or deprecate schemes.</p>
              </div>
              <button onClick={openCreateScheme} className="button button--primary" style={{ fontSize: '0.85rem' }}>
                + Create New Scheme
              </button>
            </div>

            <div className="table-card" style={{ background: 'var(--panel-strong)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Scheme Code</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Scheme Name</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Category ID</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Allocated Funds</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Min Score</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Status</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {schemes.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
                        No schemes exist. Click "+ Create New Scheme" to get started.
                      </td>
                    </tr>
                  ) : (
                    schemes.map(s => (
                      <tr key={s.id || s.schemeCode} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.9rem 1.2rem', fontFamily: 'monospace', fontWeight: 700, color: '#82aeca' }}>{s.schemeCode}</td>
                        <td style={{ padding: '0.9rem 1.2rem', fontWeight: 600 }}>{s.schemeName || s.name || 'Unnamed Scheme'}</td>
                        <td style={{ padding: '0.9rem 1.2rem' }}>
                          <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', fontSize: '0.8rem' }}>
                            {s.categoryId || s.category?.id || 'N/A'}
                          </span>
                        </td>
                        <td style={{ padding: '0.9rem 1.2rem', fontWeight: 700, color: '#ffc76a' }}>₹{(s.allocatedFunds || 0).toLocaleString()}</td>
                        <td style={{ padding: '0.9rem 1.2rem' }}>{s.minimumEligibleScore} pts</td>
                        <td style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem', color: s.active ? '#22c55e' : 'var(--muted)' }}>{s.active ? 'Active' : 'Inactive'}</td>
                        <td style={{ padding: '0.9rem 1.2rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button
                              className="button button--ghost"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}
                              onClick={() => openEditScheme(s)}
                            >
                              Edit
                            </button>
                            <button
                              className="button button--ghost"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#ef4444' }}
                              onClick={() => handleDeleteScheme(s.id || s.schemeCode)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* ── TAB 6: OFFICER ACTION HISTORY LOGS ── */}
        {activeTab === 'action-logs' && (
          <motion.div
            key="action-logs"
            initial={{ opacity: 0, y: 22, rotateX: -10, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
            exit={{ opacity: 0, y: -18, rotateX: 8, scale: 0.985 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            style={{ transformOrigin: 'top center' }}
          >
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.3rem', margin: 0, color: 'var(--text)' }}>Officer Action & Event History Log</h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>Auditable trace of all verification activities, status decisions, and reassignments completed by regional officers.</p>
            </div>

            {/* Filters Row */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search log description, ticket ID, or log ID..."
                value={logSearch}
                onChange={e => setLogSearch(e.target.value)}
                style={{ flex: 1, minWidth: '240px', padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--panel-strong)', color: 'var(--text)' }}
              />

              <select
                value={logActionFilter}
                onChange={e => setLogActionFilter(e.target.value)}
                style={{ padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--panel-strong)', color: 'var(--text)' }}
              >
                <option value="All">All Actions</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
                <option value="APPROVE">APPROVE</option>
                <option value="DISBURSE">DISBURSE</option>
                <option value="LOGIN">LOGIN</option>
                <option value="LOGOUT">LOGOUT</option>
              </select>

              <select
                value={logOfficerFilter}
                onChange={e => setLogOfficerFilter(e.target.value)}
                style={{ padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--panel-strong)', color: 'var(--text)' }}
              >
                <option value="All">All Officers</option>
                {officers.map(off => (
                  <option key={off.officerId} value={off.officerId}>{off.fullName} ({off.officerId})</option>
                ))}
              </select>
            </div>

            <div className="table-card" style={{ background: 'var(--panel-strong)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Log ID</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Timestamp</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Officer</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Action Type</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Description Details</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Target ID</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
                        No audit action logs found. Actions are logged when officers approve, reject, or verify applications.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map(log => {
                      let actionColor = '#82aeca'
                      if (log.action.includes('APPROVE')) actionColor = '#22c55e'
                      if (log.action.includes('UPDATE')) actionColor = '#f59e0b'
                      if (log.action.includes('DELETE')) actionColor = '#ef4444'
                      if (log.action.includes('CREATE')) actionColor = '#22c55e'
                      if (log.action.includes('DISBURSE')) actionColor = '#10b981'

                      return (
                        <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '0.9rem 1.2rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--muted)' }}>{log.id}</td>
                          <td style={{ padding: '0.9rem 1.2rem', fontSize: '0.82rem', color: 'var(--muted)' }}>{log.timestamp}</td>
                          <td style={{ padding: '0.9rem 1.2rem' }}>
                            <div style={{ fontWeight: 600 }}>{log.officerName}</div>
                            <small style={{ color: 'var(--muted)', fontFamily: 'monospace' }}>ID: {log.officerId}</small>
                          </td>
                          <td style={{ padding: '0.9rem 1.2rem' }}>
                            <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.76rem', fontWeight: 700, background: `${actionColor}18`, color: actionColor, border: `1px solid ${actionColor}30`, whiteSpace: 'nowrap' }}>
                              {log.action}
                            </span>
                          </td>
                          <td style={{ padding: '0.9rem 1.2rem', fontSize: '0.88rem' }}>{log.details}</td>
                          <td style={{ padding: '0.9rem 1.2rem', fontFamily: 'monospace', fontWeight: 700, color: '#ffc76a' }}>{log.targetId}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        </AnimatePresence>

      </div>

      {/* ── MODAL 1: APPLICATION DETAILS & ADMIN OVERRIDE ── */}
      <AnimatePresence>
        {selectedApp && (
          <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div
              className="modal-content"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ background: 'var(--panel-strong)', borderRadius: '16px', border: '1px solid var(--border)', maxWidth: '580px', width: '100%', padding: '1.75rem', maxHeight: '90vh', overflowY: 'auto' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text)' }}>Application Audit: {selectedApp.id}</h3>
                <button onClick={() => setSelectedApp(null)} style={{ background: 'none', border: 0, color: 'var(--muted)', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><FaTimesCircle /></button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', fontSize: '0.9rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: 'rgba(255, 255, 255, 0.03)', padding: '0.85rem', borderRadius: '8px' }}>
                  <div><span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Applicant Name</span><div style={{ fontWeight: 600 }}>{selectedApp.applicant}</div></div>
                  <div><span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Aadhaar Number</span><div style={{ fontWeight: 600 }}>{selectedApp.aadhaar}</div></div>
                  <div><span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Email / Phone</span><div>{selectedApp.email} | {selectedApp.phone}</div></div>
                  <div><span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Submitted On</span><div>{selectedApp.submittedDate}</div></div>
                  <div><span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Assigned Officer</span><div style={{ fontWeight: 600 }}>{selectedApp.assignedOfficerName || '—'}</div></div>
                  <div><span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Current Status</span><div style={{ fontWeight: 700, color: selectedApp.status === 'Approved' ? '#22c55e' : selectedApp.status === 'Rejected' ? '#ef4444' : '#f59e0b' }}>{selectedApp.status}</div></div>
                </div>

                <h4 style={{ margin: '0.5rem 0 0.25rem', fontSize: '0.95rem' }}>Submitted Documents Verification Audit</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selectedApp.documents?.map((doc, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.04)', fontSize: '0.84rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><FaFileInvoice /> {doc.name}</span>
                      <span style={{ fontWeight: 700, color: doc.verified ? '#22c55e' : '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>{doc.verified ? <><FaCheck /> Verified</> : <><FaHourglassHalf /> Pending</>}</span>
                    </div>
                  ))}
                </div>

                {selectedApp.remarks && (
                  <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(255, 199, 106, 0.1)', border: '1px solid rgba(255, 199, 106, 0.3)', color: '#ffc76a', fontSize: '0.85rem' }}>
                    <strong>Officer Remarks:</strong> {selectedApp.remarks}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                  <button className="button button--primary btn-approve" style={{ flex: 1, background: '#16a34a' }} onClick={() => handleAdminStatusChange(selectedApp.id, 'Approved')}>
                    <FaCheck /> Admin Approve
                  </button>
                  <button className="button button--primary btn-reject" style={{ flex: 1, background: '#dc2626' }} onClick={() => handleAdminStatusChange(selectedApp.id, 'Rejected')}>
                    <FaTimesCircle /> Admin Reject
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL 2: REASSIGN WORKLOAD ── */}
      <AnimatePresence>
        {reassignApp && (
          <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div
              className="modal-content"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ background: 'var(--panel-strong)', borderRadius: '16px', border: '1px solid var(--border)', maxWidth: '460px', width: '100%', padding: '1.75rem' }}
            >
              <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: 'var(--text)' }}>Reassign Application {reassignApp.id}</h3>
               <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1.25rem' }}>Currently assigned to: <strong>{reassignApp.assignedOfficerName || '—'}</strong></p>

              <form onSubmit={handleReassignSubmit}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 600 }}>Select New Target Officer</label>
                <select
                  value={targetOfficerId}
                  onChange={e => setTargetOfficerId(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', marginBottom: '1.5rem' }}
                >
                  <option value="">-- Choose Officer --</option>
                  {officers.map(o => (
                    <option key={o.officerId} value={o.officerId}>
                      {o.fullName} ({o.officerId}) - {o.district || 'Jurisdiction'}
                    </option>
                  ))}
                </select>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="submit" className="button button--primary" style={{ flex: 1 }}>Confirm Reassignment</button>
                  <button type="button" className="button button--ghost" style={{ flex: 1 }} onClick={() => setReassignApp(null)}>Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL 3: OFFICER AUDIT DRAWER ── */}
      <AnimatePresence>
        {selectedOfficer && (
          <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div
              className="modal-content"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ background: 'var(--panel-strong)', borderRadius: '16px', border: '1px solid var(--border)', maxWidth: '580px', width: '100%', padding: '1.75rem', maxHeight: '85vh', overflowY: 'auto' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text)' }}>Activity Audit: {selectedOfficer.officer.fullName}</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Officer ID: {selectedOfficer.officer.officerId}</span>
                </div>
                <button onClick={() => setSelectedOfficer(null)} style={{ background: 'none', border: 0, color: 'var(--muted)', fontSize: '1rem', cursor: 'cursor', display: 'flex', alignItems: 'center' }}><FaTimesCircle /></button>
              </div>

              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>Assigned Applications Workload ({selectedOfficer.apps.length})</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {selectedOfficer.apps.length === 0 ? (
                  <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No applications currently assigned to this officer.</p>
                ) : (
                  selectedOfficer.apps.map(app => (
                    <div key={app.id} style={{ padding: '0.85rem', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{app.id} - {app.applicant}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Submitted: {app.submittedDate}</div>
                        {app.remarks && <div style={{ fontSize: '0.76rem', color: '#ffc76a', marginTop: '0.2rem' }}>Remarks: {app.remarks}</div>}
                      </div>
                      <span style={{ padding: '0.3rem 0.6rem', borderRadius: '10px', fontSize: '0.76rem', fontWeight: 700, background: app.status === 'Approved' ? 'rgba(34, 197, 94, 0.15)' : app.status === 'Rejected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: app.status === 'Approved' ? '#22c55e' : app.status === 'Rejected' ? '#ef4444' : '#f59e0b' }}>
                        {app.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL 4: QUERY RESPONSE & STATUS UPDATE ── */}
      <AnimatePresence>
        {selectedQuery && (
          <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div
              className="modal-content"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ background: 'var(--panel-strong)', borderRadius: '16px', border: '1px solid var(--border)', maxWidth: '540px', width: '100%', padding: '1.75rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text)' }}>Query Ticket: {selectedQuery.id}</h3>
                <button onClick={() => setSelectedQuery(null)} style={{ background: 'none', border: 0, color: 'var(--muted)', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><FaTimesCircle /></button>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.85rem', borderRadius: '8px', marginBottom: '1.2rem', fontSize: '0.86rem' }}>
                <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>{selectedQuery.name} ({selectedQuery.email})</div>
                <div style={{ color: '#ffc76a', fontWeight: 600, fontSize: '0.82rem', marginBottom: '0.5rem' }}>Subject: {selectedQuery.subject}</div>
                <div style={{ color: 'var(--text-soft)', fontStyle: 'italic', background: 'rgba(0,0,0,0.2)', padding: '0.6rem', borderRadius: '6px' }}>"{selectedQuery.message}"</div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 600 }}>Official Response Message</label>
                <textarea
                  rows="3"
                  placeholder="Type official response to citizen..."
                  value={queryReplyText}
                  onChange={e => setQueryReplyText(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  className="button button--primary"
                  style={{ flex: 1, background: '#16a34a' }}
                  onClick={() => {
                    const updated = queries.map(q => q.id === selectedQuery.id ? { ...q, status: 'Resolved', reply: queryReplyText } : q)
                    setQueries(updated)
                    showToast(`Query ${selectedQuery.id} marked as Resolved!`)
                    setSelectedQuery(null)
                  }}
                >
                  <FaCheck /> Send Response & Resolve
                </button>
                <button
                  className="button button--ghost"
                  style={{ flex: 1 }}
                  onClick={() => {
                    const updated = queries.map(q => q.id === selectedQuery.id ? { ...q, status: 'In Progress', reply: queryReplyText } : q)
                    setQueries(updated)
                    showToast(`Query ${selectedQuery.id} marked as In Progress`)
                    setSelectedQuery(null)
                  }}
                >
                  ⏳ Mark In Progress
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL 5: SCHEME CREATION / UPDATION ── */}
      <AnimatePresence>
        {showSchemeModal && (
          <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div
              className="modal-content"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ background: 'var(--panel-strong)', borderRadius: '16px', border: '1px solid var(--border)', maxWidth: '580px', width: '100%', padding: '1.75rem', maxHeight: '90vh', overflowY: 'auto' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text)' }}>
                  {editingScheme ? `Edit Scheme: ${editingScheme.name}` : 'Create New Subsidy Scheme'}
                </h3>
                <button onClick={() => setShowSchemeModal(false)} style={{ background: 'none', border: 0, color: 'var(--muted)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
              </div>

              <form onSubmit={handleSaveScheme} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.25rem', color: 'var(--text-soft)', fontWeight: 600 }}>Scheme Code</label>
                    <input
                      type="text"
                      placeholder="e.g. SCH-1234 (Leave blank to auto-generate)"
                      value={schemeForm.schemeCode}
                      onChange={e => setSchemeForm(prev => ({ ...prev, schemeCode: e.target.value }))}
                      disabled={!!editingScheme}
                      style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.88rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.25rem', color: 'var(--text-soft)', fontWeight: 600 }}>Category ID</label>
                    <select
                      value={schemeForm.categoryId}
                      onChange={e => setSchemeForm(prev => ({ ...prev, categoryId: e.target.value }))}
                      style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.88rem' }}
                    >
                      <option value="1">1 - Agriculture</option>
                      <option value="2">2 - Housing</option>
                      <option value="3">3 - Education</option>
                      <option value="4">4 - Healthcare</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.25rem', color: 'var(--text-soft)', fontWeight: 600 }}>Scheme Name</label>
                  <input
                    type="text"
                    placeholder="e.g. PM Kisan Samman Nidhi"
                    value={schemeForm.schemeName}
                    onChange={e => setSchemeForm(prev => ({ ...prev, schemeName: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.88rem' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.25rem', color: 'var(--text-soft)', fontWeight: 600 }}>Allocated Funds</label>
                    <input
                      type="number"
                      placeholder="e.g. 10000000"
                      value={schemeForm.allocatedFunds}
                      onChange={e => setSchemeForm(prev => ({ ...prev, allocatedFunds: e.target.value }))}
                      required
                      style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.88rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.25rem', color: 'var(--text-soft)', fontWeight: 600 }}>Min Eligible Score</label>
                    <input
                      type="number"
                      placeholder="e.g. 50"
                      value={schemeForm.minimumEligibleScore}
                      onChange={e => setSchemeForm(prev => ({ ...prev, minimumEligibleScore: e.target.value }))}
                      required
                      style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.88rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.25rem', color: 'var(--text-soft)', fontWeight: 600 }}>Status</label>
                    <select
                      value={schemeForm.active}
                      onChange={e => setSchemeForm(prev => ({ ...prev, active: e.target.value === 'true' }))}
                      style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.88rem' }}
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.25rem', color: 'var(--text-soft)', fontWeight: 600 }}>Scheme Description</label>
                  <textarea
                    rows="4"
                    placeholder="Enter full details of the scheme..."
                    value={schemeForm.description}
                    onChange={e => setSchemeForm(prev => ({ ...prev, description: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.88rem' }}
                  />
                </div>

                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <label style={{ fontSize: '0.88rem', color: 'var(--text)', fontWeight: 600 }}>Eligibility Rules</label>
                    <button type="button" onClick={addRule} style={{ background: 'var(--panel-light)', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.25rem 0.75rem', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}>+ Add Rule</button>
                  </div>
                  {schemeForm.rules.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>No rules added.</p>}
                  {schemeForm.rules.map((rule, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px 40px', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                      <select value={rule.fieldName} onChange={e => updateRule(i, 'fieldName', e.target.value)} style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.8rem' }}>
                        <option value="AGE">Age</option>
                        <option value="INCOME">Income</option>
                        <option value="CGPA">CGPA</option>
                        <option value="CASTE">Caste</option>
                        <option value="STATE">State</option>
                        <option value="GENDER">Gender</option>
                      </select>
                      <select value={rule.operator} onChange={e => updateRule(i, 'operator', e.target.value)} style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.8rem' }}>
                        <option value="LESS_THAN">Less Than (&lt;)</option>
                        <option value="LESS_THAN_EQUAL">Less Than/Equal (&lt;=)</option>
                        <option value="GREATER_THAN">Greater Than (&gt;)</option>
                        <option value="GREATER_THAN_EQUAL">Greater/Equal (&gt;=)</option>
                        <option value="EQUALS">Equals (==)</option>
                        <option value="NOT_EQUALS">Not Equals (!=)</option>
                      </select>
                      <input type="text" placeholder="Expected Value" value={rule.expectedValue} onChange={e => updateRule(i, 'expectedValue', e.target.value)} required style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.8rem' }} />
                      <input type="number" placeholder="Pts" value={rule.points} onChange={e => updateRule(i, 'points', Number(e.target.value))} required style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.8rem' }} />
                      <button type="button" onClick={() => removeRule(i)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem' }}>×</button>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <label style={{ fontSize: '0.88rem', color: 'var(--text)', fontWeight: 600 }}>Required Documents</label>
                    <button type="button" onClick={addDocument} style={{ background: 'var(--panel-light)', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.25rem 0.75rem', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}>+ Add Document</button>
                  </div>
                  {schemeForm.documents.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>No documents required.</p>}
                  {schemeForm.documents.map((doc, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 40px', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                      <select value={doc.documentType} onChange={e => updateDocument(i, 'documentType', e.target.value)} style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.8rem' }}>
                        <option value="AADHAAR">Aadhaar Card</option>
                        <option value="PAN">PAN Card</option>
                        <option value="RATION_CARD">Ration Card</option>
                        <option value="INCOME_CERTIFICATE">Income Certificate</option>
                        <option value="CASTE_CERTIFICATE">Caste Certificate</option>
                        <option value="DOMICILE_CERTIFICATE">Domicile Certificate</option>
                        <option value="LAND_RECORD">Land Record (7/12)</option>
                        <option value="BANK_PASSBOOK">Bank Passbook</option>
                      </select>
                      <select value={doc.mandatory} onChange={e => updateDocument(i, 'mandatory', e.target.value === 'true')} style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.8rem' }}>
                        <option value="true">Mandatory</option>
                        <option value="false">Optional</option>
                      </select>
                      <button type="button" onClick={() => removeDocument(i)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem' }}>×</button>
                    </div>
                  ))}
                </div>

                {/* ── REQUIRED APPLICATION FIELDS ── */}
                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.88rem', color: 'var(--text)', fontWeight: 600 }}>Required Application Fields</label>
                      <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: 'var(--muted)' }}>Fields the applicant must fill in when applying</p>
                    </div>
                    <button type="button" onClick={addField} style={{ background: 'var(--panel-light)', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.25rem 0.75rem', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Add Field</button>
                  </div>
                  {schemeForm.fields.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>No additional fields required.</p>}
                  {schemeForm.fields.map((field, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 40px', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                      <select
                        value={field.fieldName}
                        onChange={e => updateField(i, 'fieldName', e.target.value)}
                        style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.8rem' }}
                      >
                        <optgroup label="Common">
                          <option value="ANNUAL_INCOME">Annual Income</option>
                          <option value="OCCUPATION">Occupation</option>
                          <option value="CATEGORY">Category (Caste)</option>
                          <option value="GENDER">Gender</option>
                          <option value="AGE">Age</option>
                        </optgroup>
                        <optgroup label="Agriculture">
                          <option value="LAND_AREA">Land Area</option>
                          <option value="LAND_SURVEY_NUMBER">Land Survey Number</option>
                        </optgroup>
                        <optgroup label="Education">
                          <option value="COLLEGE_NAME">College Name</option>
                          <option value="COURSE_NAME">Course Name</option>
                          <option value="MARKS_PERCENTAGE">Marks / Percentage</option>
                        </optgroup>
                        <optgroup label="Fisheries">
                          <option value="BOAT_REGISTRATION_NUMBER">Boat Registration Number</option>
                          <option value="FISHING_EXPERIENCE">Fishing Experience</option>
                        </optgroup>
                        <optgroup label="Business">
                          <option value="BUSINESS_TYPE">Business Type</option>
                          <option value="INVESTMENT_AMOUNT">Investment Amount</option>
                          <option value="GST_NUMBER">GST Number</option>
                        </optgroup>
                      </select>
                      <select
                        value={field.mandatory}
                        onChange={e => updateField(i, 'mandatory', e.target.value === 'true')}
                        style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.8rem' }}
                      >
                        <option value="true">Mandatory</option>
                        <option value="false">Optional</option>
                      </select>
                      <button type="button" onClick={() => removeField(i)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem' }}>×</button>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="submit" className="button button--primary" style={{ flex: 1 }}>
                    {editingScheme ? <><FaCheck /> Save Changes</> : <><FaCheck /> Create Scheme</>}
                  </button>
                  <button type="button" className="button button--ghost" style={{ flex: 1 }} onClick={() => setShowSchemeModal(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
