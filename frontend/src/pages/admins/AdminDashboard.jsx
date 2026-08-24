import '../../styles/Dashboard.css';
import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getSchemes, addScheme, updateScheme } from '../../services/schemeService'
import DashboardTopbar from '../../components/DashboardTopbar'
import { updateApprovalStatus, getOfficerRequests, getAllocationSummary } from '../../services/adminService'
import { getApplications, allocateApplication, getAvailableOfficersWorkload, batchAllocateApplications } from '../../services/applicationService'
import { getProfilesByRole } from '../../services/adminService'
import { clearPortalSessionCaches } from '../../services/sessionCleanup'
import ProfilePanel from '../../components/ProfilePanel'
import api from '../../services/api'
import { FaUserShield, FaTools, FaClipboardList, FaComments, FaHourglassHalf, FaTimesCircle, FaFileInvoice, FaCheck, FaUserCircle } from 'react-icons/fa'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const contentRef = useRef(null)
  const [profile, setProfile] = useState(null)

  // Auth guard: backend cookie + profile role check
  useEffect(() => {
    async function verifyAdmin() {
      try {
        const res = await api.get('/gov/auth/profile/get')
        const user = res.data?.data || res.data
        if (!user || String(user.role || '').toUpperCase() !== 'ADMIN') {
          navigate('/login')
          return
        }
        setProfile(user)
      } catch {
        navigate('/login')
      }
    }
    verifyAdmin()
  }, [navigate])

  const handleLogout = () => {
    api.post('/gov/auth/signout').catch(() => { })
    clearPortalSessionCaches()
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
        const roles = ['FIELD_OFFICER', 'DISTRICT_OFFICER', 'REGIONAL_OFFICER', 'FINANCE_OFFICER']
        const results = await Promise.all(roles.map(role => getProfilesByRole(role)))
        const merged = results.flatMap((data, index) => {
          const items = Array.isArray(data) ? data : data?.data || []
          return items.map(item => ({
            ...item,
            role: item.role || roles[index],
          }))
        })
        setOfficers(merged)
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
    benefit: '',
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

  const normalizeRuleForm = (rule = {}) => ({
    fieldName: rule.fieldName || 'AGE',
    operator: rule.operator || 'GREATER_THAN_EQUAL',
    expectedValue: rule.expectedValue ?? '',
    points: Number(rule.points ?? 0),
    partialPercentage: Number(rule.partialPercentage ?? 0),
  })

  // Log filter State
  const [logSearch, setLogSearch] = useState('')
  const [logActionFilter, setLogActionFilter] = useState('All')
  const [logOfficerFilter, setLogOfficerFilter] = useState('All')

  // Load backend-backed data with empty-state fallbacks
  const [applications, setApplications] = useState([])
  const [officers, setOfficers] = useState([])
  const [queries, setQueries] = useState([])

  // View state (declared early so useEffects below can reference it)
  const [activeTab, setActiveTab] = useState('allocation') // 'allocation' | 'officers' | 'schemes' | 'action-logs' | 'officer-requests' | 'queries' | 'profile'

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
  const [searchTerm] = useState('')
  const [statusFilter] = useState('All')
  const [officerFilter] = useState('All')
  const [stageFilter] = useState('All')
  const [selectedApp, setSelectedApp] = useState(null)
  const [selectedOfficer, setSelectedOfficer] = useState(null)
  const [selectedQuery, setSelectedQuery] = useState(null)
  const [queryReplyText, setQueryReplyText] = useState('')
  const [reassignApp, setReassignApp] = useState(null)
  const [targetOfficerId, setTargetOfficerId] = useState('')
  const [toast, setToast] = useState(null)

  // Batch allocation state (workload engine). The admin enters a single count
  // for the selected stage; the backend picks applications (FCFS) and officers
  // (by workload). officerWorkloads is a read-only roster for that stage.
  const [fcfsCount, setFcfsCount] = useState(10)
  const [officerWorkloads, setOfficerWorkloads] = useState([])
  const [workloadsLoading, setWorkloadsLoading] = useState(false)
  const [fcfsAllocating, setFcfsAllocating] = useState(false)
  const [allocationSummary, setAllocationSummary] = useState([]) // [{stage, unassignedCount}]
  const [allocationStageTab, setAllocationStageTab] = useState('FIELD_OFFICER')
  const tabContentMeta = {
    allocation: {
      title: 'Application Allocation',
      subtitle: 'Assign submitted applications to the correct officer before the review flow begins.',
    },
    officers: {
      title: 'Officer Work Tracker',
      subtitle: 'Monitor officer workload, coverage, and assignment distribution.',
    },
    schemes: {
      title: 'Manage Schemes',
      subtitle: 'Create, edit, and retire welfare schemes from a single control panel.',
    },
    'action-logs': {
      title: 'Officer Actions History',
      subtitle: 'Audit administrative and officer actions recorded across the system.',
    },
    'officer-requests': {
      title: 'Officer Requests',
      subtitle: 'Process new officer onboarding and role change requests.',
    },
    queries: {
      title: 'Citizen Queries',
      subtitle: 'Respond to citizen support requests and unresolved issues.',
    },
    profile: {
      title: 'Profile',
      subtitle: 'Review and update the administrator account details.',
    },
  }

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
      benefit: '',
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
      benefit: scheme.benefit || '',
      allocatedFunds: scheme.allocatedFunds || 0,
      minimumEligibleScore: scheme.minimumEligibleScore || 50,
      active: scheme.active ?? true,
      categoryId: scheme.categoryId || scheme.category?.id || 1,
      rules: Array.isArray(scheme.rules) ? scheme.rules.map(normalizeRuleForm) : [],
      documents: scheme.documents || [],
      fields: scheme.fields || []
    })
    setShowSchemeModal(true)
  }

  const addRule = () => setSchemeForm(p => ({ ...p, rules: [...p.rules, { fieldName: 'AGE', operator: 'GREATER_THAN_EQUAL', expectedValue: '', points: 0, partialPercentage: 0 }] }))
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

    const processedRules = schemeForm.rules.map(normalizeRuleForm)
    const processedScheme = {
      schemeCode: schemeForm.schemeCode,
      schemeName: schemeForm.schemeName,
      description: schemeForm.description,
      benefit: schemeForm.benefit,
      allocatedFunds: Number(schemeForm.allocatedFunds),
      minimumEligibleScore: Number(schemeForm.minimumEligibleScore),
      active: schemeForm.active,
      categoryId: Number(schemeForm.categoryId),
      categoryName: getCategoryNameById(schemeForm.categoryId),
      rules: processedRules,
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
    } catch {
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

  // Filtered applications for allocation view
  const filteredApps = applications.filter(app => {
    const matchesSearch =
      app.applicant.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.aadhaar.includes(searchTerm)

    const matchesStatus = statusFilter === 'All' || app.status === statusFilter
    const matchesOfficer = officerFilter === 'All' || app.assignedOfficerId === officerFilter
    const matchesStage = stageFilter === 'All' || String(app.currentStage || '').toUpperCase() === stageFilter

    return matchesSearch && matchesStatus && matchesOfficer && matchesStage
  })

  const allocationApps = filteredApps.filter(app => {
    const normalizedStatus = String(app.status || app.applicationStatus || '').toUpperCase()
    return !['APPROVED', 'REJECTED', 'DISBURSED'].includes(normalizedStatus)
  })

  // Handle allocating application to another officer
  async function handleReassignSubmit(e) {
    e.preventDefault()
    if (!targetOfficerId) {
      showToast('Please select a target officer', 'error')
      return
    }

    const newOfficerObj = officers.find(o => String(o.officerId || o.uniqueID || o.id) === String(targetOfficerId))
    if (!newOfficerObj) return

    try {
      const res = await allocateApplication(reassignApp.id, String(newOfficerObj.officerId || newOfficerObj.uniqueID || newOfficerObj.id))
      if (res?.status === false) {
        showToast(res.message || 'Allocation failed', 'error')
        return
      }

      const updatedApps = applications.map(app => {
        if (app.id === reassignApp.id) {
          return {
            ...app,
            assignedOfficerId: newOfficerObj.officerId || newOfficerObj.uniqueID || newOfficerObj.id,
            assignedOfficerName: newOfficerObj.fullName,
          }
        }
        return app
      })

      setApplications(updatedApps)
      showToast(`Application ${reassignApp.id} allocated to ${newOfficerObj.fullName}`)
      setReassignApp(null)
    } catch (err) {
      console.error('Allocation failed:', err)
      showToast(err.message || 'Allocation failed', 'error')
    }
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

  async function refreshAllocationSummary() {
    try {
      const data = await getAllocationSummary()
      setAllocationSummary(Array.isArray(data) ? data : [])
    } catch {
      setAllocationSummary([])
    }
  }

  async function refreshOfficerWorkloads(stage) {
    setWorkloadsLoading(true)
    try {
      const data = await getAvailableOfficersWorkload(stage)
      setOfficerWorkloads(Array.isArray(data) ? data : [])
    } catch {
      setOfficerWorkloads([])
    } finally {
      setWorkloadsLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'allocation') {
      refreshAllocationSummary()
      refreshOfficerWorkloads(allocationStageTab)
    }
  }, [activeTab, allocationStageTab])

  // Batch allocation (workload engine). The admin enters ONE count for the
  // selected stage; the backend picks the oldest unassigned applications (FCFS,
  // id tie-break) AND the officer for each (lowest active workload first, id
  // tie-break). The admin never chooses the officer — that decision is the
  // engine's, so this replaces the old per-officer manual bulk path.
  async function handleBatchAllocate() {
    const count = Number(fcfsCount || 0)
    if (!count || count < 1) {
      showToast('Enter a valid number of applications to allocate', 'error')
      return
    }
    setFcfsAllocating(true)
    try {
      const res = await batchAllocateApplications(allocationStageTab, count)
      const allocated = res?.allocatedCount ?? 0
      const requested = res?.requestedCount ?? count
      if (allocated === 0) {
        showToast(res?.message || 'No applications could be allocated', 'error')
      } else if (allocated < requested) {
        showToast(res?.message || `Partially allocated ${allocated} of ${requested} application(s)`, 'error')
      } else {
        showToast(res?.message || `Allocated ${allocated} application(s)`)
      }
      await refreshAllocationSummary()
      await refreshOfficerWorkloads(allocationStageTab)
    } catch (err) {
      showToast(err?.message || 'Allocation failed', 'error')
    } finally {
      setFcfsAllocating(false)
    }
  }

  return (
    <div className="dashboard-layout">
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
      <DashboardTopbar
        brandTitle="GS GOV SUBSIDY"
        brandSubtitle="ADMIN DASHBOARD"
        userName={profile?.fullName || 'System Administrator'}
        userRole={profile?.role || 'ADMIN'}
        onLogout={handleLogout}
        homeLink="/"
        homeLabel="Back to Home"
        showHomeLink
      />

      {/* ── Main Content Container ── */}
      <main ref={contentRef} className="dashboard-main">

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="dashboard-tabs"
        >
          <button
            className={`dashboard-tab ${activeTab === 'allocation' ? 'active' : ''}`}
            onClick={() => handleTabChange('allocation')}
          >
            <FaFileInvoice /> Application Allocation ({allocationApps.length})
          </button>
          <button
            className={`dashboard-tab ${activeTab === 'officers' ? 'active' : ''}`}
            onClick={() => handleTabChange('officers')}
          >
            <FaUserShield /> Officer Work Tracker ({officers.length})
          </button>
          <button
            className={`dashboard-tab ${activeTab === 'schemes' ? 'active' : ''}`}
            onClick={() => handleTabChange('schemes')}
          >
            <FaTools /> Manage Schemes ({schemes.length})
          </button>
          <button
            className={`dashboard-tab ${activeTab === 'action-logs' ? 'active' : ''}`}
            onClick={() => handleTabChange('action-logs')}
          >
            <FaUserShield /> Officer Actions History
          </button>
          <button
            className={`dashboard-tab ${activeTab === 'officer-requests' ? 'active' : ''}`}
            onClick={() => handleTabChange('officer-requests')}
          >
            <FaClipboardList /> Officer Requests ({officerRequests.length})
          </button>
          <button
            className={`dashboard-tab ${activeTab === 'queries' ? 'active' : ''}`}
            onClick={() => handleTabChange('queries')}
          >
            <FaComments /> Citizen Queries ({queries.length})
          </button>
          <button
            className={`dashboard-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => handleTabChange('profile')}
          >
            <FaUserCircle /> Profile
          </button>
        </motion.div>

        <div className="tab-pane">
          <div className="pane-header">
            <h2>{tabContentMeta[activeTab]?.title || 'Admin Dashboard'}</h2>
            <p>{tabContentMeta[activeTab]?.subtitle || 'Manage the subsidy platform from one consistent portal.'}</p>
          </div>
          {/* ── TAB 1: ANALYTICS & INSIGHTS ── */}

          {activeTab === 'allocation' && (
            <motion.div
              key="allocation"
              initial={{ opacity: 0, y: 22, rotateX: -10, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
              exit={{ opacity: 0, y: -18, rotateX: 8, scale: 0.985 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              style={{ transformOrigin: 'top center' }}
            >
              {/* Stage summary cards — counts only, no application detail */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {['FIELD_OFFICER', 'DISTRICT_OFFICER', 'REGIONAL_OFFICER', 'FINANCE_OFFICER'].map(stage => {
                  const entry = allocationSummary.find(s => s.stage === stage)
                  const unassignedCount = entry ? entry.unassignedCount : 0

                  // Calculate total applications in this stage (assigned + unassigned)
                  const totalCount = applications.filter(app => {
                    const status = String(app.status || app.applicationStatus || '').toUpperCase()
                    if (['APPROVED', 'REJECTED', 'DISBURSED'].includes(status)) return false
                    return String(app.currentStage || '').toUpperCase() === stage
                  }).length

                  const active = allocationStageTab === stage
                  return (
                    <button
                      key={stage}
                      onClick={() => setAllocationStageTab(stage)}
                      className="officer-stat-card"
                      style={{
                        textAlign: 'left',
                        cursor: 'pointer',
                        border: active ? '2px solid var(--accent)' : '1px solid var(--border)',
                        background: 'var(--panel-strong)',
                        borderRadius: '14px',
                        padding: '1.2rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                      }}
                    >
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                        {stage.replace('_', ' ')}
                      </div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)', marginTop: '0.3rem' }}>
                        {totalCount}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text)' }}>
                        total application{totalCount === 1 ? '' : 's'} in stage
                      </div>
                      <div style={{ fontSize: '0.75rem', color: unassignedCount > 0 ? '#f59e0b' : 'var(--muted)', marginTop: '0.4rem', fontWeight: 600 }}>
                        • {unassignedCount} awaiting allocation
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Batch allocation control — one count for the whole stage. The
                backend picks the oldest unassigned applications (FCFS) and
                spreads them across the least-loaded officers. The admin does
                not choose the officer. */}
              {(() => {
                const totalRemaining = officerWorkloads.reduce((sum, o) => sum + (o.remainingCapacity || 0), 0)
                const queueEntry = allocationSummary.find(s => s.stage === allocationStageTab)
                const queueCount = queueEntry ? queueEntry.unassignedCount : 0
                const suggestedMax = Math.min(queueCount, totalRemaining)
                return (
                  <div style={{ background: 'var(--panel-strong)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.3rem', marginBottom: '1.6rem' }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.35rem' }}>
                      Allocate applications — {allocationStageTab.replace(/_/g, ' ')}
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: '0 0 0.9rem 0' }}>
                      Enter how many applications to assign. The system takes the oldest unassigned applications first and distributes them to the least-loaded officers automatically.
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.6rem', marginBottom: '1rem' }}>
                      <div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)' }}>{queueCount}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>awaiting allocation</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: totalRemaining > 0 ? '#22c55e' : '#ef4444' }}>{totalRemaining}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>officer capacity free</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        type="number"
                        min="1"
                        value={fcfsCount}
                        onChange={(e) => setFcfsCount(e.target.value)}
                        placeholder="Count"
                        style={{ width: '120px', padding: '0.55rem', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.9rem', background: 'var(--panel)', color: 'var(--text)' }}
                        disabled={fcfsAllocating}
                      />
                      <button
                        className="button button--primary"
                        onClick={handleBatchAllocate}
                        disabled={fcfsAllocating || suggestedMax <= 0}
                        style={{ padding: '0.55rem 1.3rem', fontSize: '0.9rem' }}
                      >
                        {fcfsAllocating ? 'Allocating…' : 'Allocate'}
                      </button>
                      {suggestedMax > 0 && (
                        <button
                          type="button"
                          onClick={() => setFcfsCount(suggestedMax)}
                          style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}
                        >
                          Fill {suggestedMax}
                        </button>
                      )}
                    </div>
                    {suggestedMax <= 0 && (
                      <p style={{ fontSize: '0.78rem', color: '#ef4444', margin: '0.8rem 0 0 0' }}>
                        {queueCount === 0 ? 'No applications are awaiting allocation at this stage.' : 'No officer has free capacity at this stage.'}
                      </p>
                    )}
                  </div>
                )
              })()}

              {/* Officer workload roster (read-only). The engine assigns officers;
                this is a live view of who is carrying how much. */}
              <h3 style={{ fontSize: '1.05rem', margin: '0 0 0.8rem 0', color: 'var(--text)' }}>
                {allocationStageTab.replace(/_/g, ' ')} officer workload
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {workloadsLoading && (
                  <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Loading workloads…</p>
                )}
                {!workloadsLoading && officerWorkloads.length === 0 && (
                  <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No officers found for this stage.</p>
                )}
                {officerWorkloads.map(officer => {
                  const pct = officer.capacity > 0 ? Math.min(100, Math.round((officer.allocatedCount / officer.capacity) * 100)) : 0
                  return (
                    <div
                      key={officer.officerId}
                      style={{ background: 'var(--panel-strong)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}
                    >
                      <div style={{ fontWeight: 700, color: 'var(--text)' }}>{officer.officerName}</div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text)' }}>
                        <strong>{officer.allocatedCount}</strong> / {officer.capacity} assigned
                        {' · '}
                        <span style={{ color: officer.remainingCapacity > 0 ? '#22c55e' : '#ef4444' }}>
                          {officer.remainingCapacity} slot{officer.remainingCapacity === 1 ? '' : 's'} free
                        </span>
                      </div>
                      <div style={{ height: '6px', background: 'var(--border)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? '#ef4444' : 'var(--accent)' }} />
                      </div>
                    </div>
                  )
                })}
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
                  const officerKey = officer.officerId || officer.uniqueID || officer.id
                  const officerApps = applications.filter(a => String(a.assignedOfficerId) === String(officerKey))
                  const assignedCount = officerApps.length
                  const pendingCount = officerApps.filter(a => a.status === 'Pending').length
                  const approvedCount = officerApps.filter(a => a.status === 'Approved').length
                  const rejectedCount = officerApps.filter(a => a.status === 'Rejected').length
                  const reviewedCount = approvedCount + rejectedCount
                  const approvalRate = reviewedCount > 0 ? ((approvedCount / reviewedCount) * 100).toFixed(0) : 100

                  const loadStatus = pendingCount >= 3 ? { text: 'High Workload', color: '#ef4444' } : pendingCount >= 1 ? { text: 'Optimal Load', color: '#f59e0b' } : { text: 'Available', color: '#22c55e' }

                  return (
                    <div
                      key={officer.officerId || officer.uniqueID || officer.id}
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
                        <span style={{ background: 'rgba(255, 255, 255, 0.06)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontFamily: 'monospace' }}>ID: {officerKey}</span>
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

              <div className="table-card" style={{ background: 'var(--panel-strong)', borderRadius: '12px', border: '1px solid var(--border)', overflowX: 'auto' }}>
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

              <div className="table-card" style={{ background: 'var(--panel-strong)', borderRadius: '12px', border: '1px solid var(--border)', overflowX: 'auto' }}>
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
          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 22, rotateX: -10, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
              exit={{ opacity: 0, y: -18, rotateX: 8, scale: 0.985 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              style={{ transformOrigin: 'top center' }}
            >
              <ProfilePanel
                profile={profile}
                role={profile?.role || 'ADMIN'}
                editable={false}
                deletable={false}
                subtitle="Manage the administrator account details stored in the backend."
              />
            </motion.div>
          )}

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

              <div className="table-card" style={{ background: 'var(--panel-strong)', borderRadius: '12px', border: '1px solid var(--border)', overflowX: 'auto' }}>
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

        </div>

      </main>

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
              <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: 'var(--text)' }}>Allocate Application {reassignApp.id}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1.25rem' }}>Currently assigned to: <strong>{reassignApp.assignedOfficerName || '—'}</strong></p>

              <form onSubmit={handleReassignSubmit}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 600 }}>Select Field Officer</label>
                <select
                  value={targetOfficerId}
                  onChange={e => setTargetOfficerId(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', marginBottom: '1.5rem' }}
                >
                  <option value="">-- Choose Officer --</option>
                  {officers.map(o => (
                    <option key={o.officerId || o.uniqueID || o.id} value={o.officerId || o.uniqueID || o.id}>
                      {o.fullName} ({o.officerId || o.uniqueID || o.id}) - {o.district || 'Jurisdiction'}
                    </option>
                  ))}
                </select>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="submit" className="button button--primary" style={{ flex: 1 }}>Confirm Allocation</button>
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
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Officer ID: {selectedOfficer.officer.officerId || selectedOfficer.officer.uniqueID || selectedOfficer.officer.id}</span>
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
              className="modal-content scheme-theme-modal"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', maxWidth: '720px', width: '100%', padding: '2rem', maxHeight: '90vh', overflowY: 'auto', overflowX: 'hidden', color: '#1e293b', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.8rem', color: '#714b27', fontFamily: 'Georgia, serif', fontWeight: 700 }}>
                    {editingScheme ? 'Edit Scheme' : 'Create Scheme'}
                  </h3>
                  <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
                    {schemeForm.schemeName || 'New Subsidy Scheme'}
                  </div>
                </div>
                <button onClick={() => setShowSchemeModal(false)} style={{ background: 'none', border: 0, color: '#475569', fontSize: '1.4rem', cursor: 'pointer', padding: '0.2rem' }}>✕</button>
              </div>

              <form onSubmit={handleSaveScheme} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                {/* Section 1: Identification */}
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#8e6c46', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FaClipboardList /> IDENTIFICATION
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.4rem', color: '#475569', fontWeight: 700 }}>Scheme Code</label>
                      <input
                        type="text"
                        placeholder="e.g. SCH-1234"
                        value={schemeForm.schemeCode}
                        onChange={e => setSchemeForm(prev => ({ ...prev, schemeCode: e.target.value }))}
                        disabled={!!editingScheme}
                        style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', fontSize: '0.9rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.4rem', color: '#475569', fontWeight: 700 }}>Category ID</label>
                      <select
                        value={schemeForm.categoryId}
                        onChange={e => setSchemeForm(prev => ({ ...prev, categoryId: e.target.value }))}
                        style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', fontSize: '0.9rem' }}
                      >
                        <option value="1">1 - Agriculture</option>
                        <option value="2">2 - Housing</option>
                        <option value="3">3 - Education</option>
                        <option value="4">4 - Healthcare</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.4rem', color: '#475569', fontWeight: 700 }}>Scheme Name</label>
                    <input
                      type="text"
                      placeholder="e.g. PM Kisan Samman Nidhi"
                      value={schemeForm.schemeName}
                      onChange={e => setSchemeForm(prev => ({ ...prev, schemeName: e.target.value }))}
                      required
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', fontSize: '0.9rem' }}
                    />
                  </div>
                </div>

                {/* Section 2: Financial Details */}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#8e6c46', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FaFileInvoice /> FINANCIAL DETAILS
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.4rem', color: '#475569', fontWeight: 700 }}>Allocated Funds (₹)</label>
                      <input
                        type="number"
                        placeholder="e.g. 10000000"
                        value={schemeForm.allocatedFunds}
                        onChange={e => setSchemeForm(prev => ({ ...prev, allocatedFunds: e.target.value }))}
                        required
                        style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', fontSize: '0.9rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.4rem', color: '#475569', fontWeight: 700 }}>Benefit Amount per Applicant (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="e.g. 6000.00"
                        value={schemeForm.benefit}
                        onChange={e => setSchemeForm(prev => ({ ...prev, benefit: e.target.value ? parseFloat(e.target.value) : '' }))}
                        style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', fontSize: '0.9rem' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Criteria & Status */}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#8e6c46', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FaCheck /> CRITERIA & STATUS
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.4rem', color: '#475569', fontWeight: 700 }}>Min Eligible Score</label>
                      <input
                        type="number"
                        placeholder="e.g. 30"
                        value={schemeForm.minimumEligibleScore}
                        onChange={e => setSchemeForm(prev => ({ ...prev, minimumEligibleScore: e.target.value }))}
                        required
                        style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', fontSize: '0.9rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.4rem', color: '#475569', fontWeight: 700 }}>Status</label>
                      <select
                        value={schemeForm.active}
                        onChange={e => setSchemeForm(prev => ({ ...prev, active: e.target.value === 'true' }))}
                        style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: schemeForm.active ? '#15803d' : '#b91c1c', fontWeight: 600, fontSize: '0.9rem' }}
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 4: Details */}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#8e6c46', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FaComments /> DETAILS
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.4rem', color: '#475569', fontWeight: 700 }}>Scheme Description</label>
                    <textarea
                      rows="4"
                      placeholder="Enter full details of the scheme..."
                      value={schemeForm.description}
                      onChange={e => setSchemeForm(prev => ({ ...prev, description: e.target.value }))}
                      required
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', fontSize: '0.9rem', resize: 'vertical' }}
                    />
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#8e6c46', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FaTools /> ELIGIBILITY RULES
                    </div>
                    <button type="button" onClick={addRule} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>+ Add Rule</button>
                  </div>
                  {schemeForm.rules.length === 0 && <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>No rules added.</p>}
                  {schemeForm.rules.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, 1.5fr) minmax(130px, 1.5fr) minmax(120px, 2fr) 90px 70px 30px', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Field</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Operator</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Expected Value</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Partial Points</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Points</div>
                      <div></div>
                    </div>
                  )}
                  {schemeForm.rules.map((rule, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, 1.5fr) minmax(130px, 1.5fr) minmax(120px, 2fr) 90px 70px 30px', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                      <select value={rule.fieldName} onChange={e => updateRule(i, 'fieldName', e.target.value)} style={{ padding: '0.55rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', fontSize: '0.8rem', minWidth: 0 }}>
                        <option value="AGE">Age</option>
                        <option value="ANNUAL_INCOME">Annual Income</option>
                        <option value="LAND_AREA">Land Area</option>
                        <option value="OCCUPATION">Occupation</option>
                        <option value="CASTE">Caste</option>
                        <option value="STATE">State</option>
                        <option value="GENDER">Gender</option>
                      </select>
                      <select value={rule.operator} onChange={e => updateRule(i, 'operator', e.target.value)} style={{ padding: '0.55rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', fontSize: '0.8rem', minWidth: 0 }}>
                        <option value="LESS_THAN">Less Than (&lt;)</option>
                        <option value="LESS_THAN_EQUAL">Less Than/Equal (&lt;=)</option>
                        <option value="GREATER_THAN">Greater Than (&gt;)</option>
                        <option value="GREATER_THAN_EQUAL">Greater/Equal (&gt;=)</option>
                        <option value="EQUALS">Equals (==)</option>
                        <option value="NOT_EQUALS">Not Equals (!=)</option>
                      </select>
                      <input type="text" placeholder="Value" value={rule.expectedValue} onChange={e => updateRule(i, 'expectedValue', e.target.value)} required style={{ padding: '0.55rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', fontSize: '0.8rem', minWidth: 0 }} />
                      <input type="number" min="0" max="100" step="0.1" placeholder="Partial %" value={rule.partialPercentage ?? 0} onChange={e => updateRule(i, 'partialPercentage', Number(e.target.value))} style={{ padding: '0.55rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', fontSize: '0.8rem', minWidth: 0 }} />
                      <input type="number" placeholder="Points" value={rule.points} onChange={e => updateRule(i, 'points', Number(e.target.value))} required style={{ padding: '0.55rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', fontSize: '0.8rem', minWidth: 0 }} />
                      <button type="button" onClick={() => removeRule(i)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.2rem', padding: '0' }}>×</button>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#8e6c46', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FaFileInvoice /> REQUIRED DOCUMENTS
                    </div>
                    <button type="button" onClick={addDocument} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>+ Add Document</button>
                  </div>
                  {schemeForm.documents.length === 0 && <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>No documents required.</p>}
                  {schemeForm.documents.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 2fr) minmax(100px, 1fr) 30px', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Document Type</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Requirement</div>
                      <div></div>
                    </div>
                  )}
                  {schemeForm.documents.map((doc, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 2fr) minmax(100px, 1fr) 30px', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                      <select value={doc.documentType} onChange={e => updateDocument(i, 'documentType', e.target.value)} style={{ padding: '0.55rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', fontSize: '0.8rem', minWidth: 0 }}>
                        <option value="AADHAAR">Aadhaar Card</option>
                        <option value="PAN">PAN Card</option>
                        <option value="RATION_CARD">Ration Card</option>
                        <option value="INCOME_CERTIFICATE">Income Certificate</option>
                        <option value="CASTE_CERTIFICATE">Caste Certificate</option>
                        <option value="DOMICILE_CERTIFICATE">Domicile Certificate</option>
                        <option value="LAND_RECORD">Land Record (7/12)</option>
                        <option value="BANK_PASSBOOK">Bank Passbook</option>
                      </select>
                      <select value={doc.mandatory} onChange={e => updateDocument(i, 'mandatory', e.target.value === 'true')} style={{ padding: '0.55rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', fontSize: '0.8rem', minWidth: 0 }}>
                        <option value="true">Mandatory</option>
                        <option value="false">Optional</option>
                      </select>
                      <button type="button" onClick={() => removeDocument(i)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.2rem', padding: '0' }}>×</button>
                    </div>
                  ))}
                </div>

                {/* ── REQUIRED APPLICATION FIELDS ── */}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#8e6c46', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FaClipboardList /> REQUIRED APPLICATION FIELDS
                      </div>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>Fields the applicant must fill in when applying</p>
                    </div>
                    <button type="button" onClick={addField} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 600 }}>+ Add Field</button>
                  </div>
                  {schemeForm.fields.length === 0 && <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>No additional fields required.</p>}
                  {schemeForm.fields.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 2fr) minmax(100px, 1fr) 30px', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Field Name</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Requirement</div>
                      <div></div>
                    </div>
                  )}
                  {schemeForm.fields.map((field, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 2fr) minmax(100px, 1fr) 30px', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                      <select
                        value={field.fieldName}
                        onChange={e => updateField(i, 'fieldName', e.target.value)}
                        style={{ padding: '0.55rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', fontSize: '0.8rem', minWidth: 0 }}
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
                          <option value="CROP_TYPE">Crop Type</option>
                        </optgroup>
                        <optgroup label="Housing">
                          <option value="HOUSE_CONDITION">House Condition</option>
                          <option value="OWNERSHIP_TYPE">Ownership Type</option>
                          <option value="FAMILY_MEMBERS_COUNT">Family Members Count</option>
                        </optgroup>
                        <optgroup label="Education">
                          <option value="CURRENT_EDUCATION_LEVEL">Current Education Level</option>
                          <option value="PREVIOUS_YEAR_MARKS">Previous Year Marks (%)</option>
                          <option value="INSTITUTION_NAME">Institution Name</option>
                        </optgroup>
                      </select>
                      <select
                        value={field.mandatory}
                        onChange={e => updateField(i, 'mandatory', e.target.value === 'true')}
                        style={{ padding: '0.55rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', fontSize: '0.8rem', minWidth: 0 }}
                      >
                        <option value="true">Mandatory</option>
                        <option value="false">Optional</option>
                      </select>
                      <button type="button" onClick={() => removeField(i)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.2rem', padding: '0' }}>×</button>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
                  <button type="button" className="button button--ghost" onClick={() => setShowSchemeModal(false)} style={{ color: '#475569', padding: '0.75rem 1.5rem', fontSize: '0.9rem', fontWeight: 600 }}>Cancel</button>
                  <button type="submit" className="button button--primary" style={{ background: '#714b27', border: 'none', padding: '0.75rem 2rem', fontSize: '0.9rem', fontWeight: 600, borderRadius: '6px', color: '#fff' }}>
                    {editingScheme ? 'Save Changes' : 'Create Scheme'}
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


