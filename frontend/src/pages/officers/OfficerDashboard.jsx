import '../../styles/Dashboard.css';
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ThemeToggle from '../../components/ThemeToggle'
import logo from '../../assets/icons/logo.png'
import api from '../../services/api'
import { updateApprovalStatus } from '../../services/adminService'
import { 
  getMyApplications, 
  getDisbursementPlan, 
  configureDisbursementPlan, 
  completeMilestone, 
  releaseMilestone, 
  resolveMilestone,
  getOverdueMilestones,
  getNotifications,
} from '../../services/officerService'

const STATUS_BADGE = {
  Pending: 'badge-status--applied',
  Approved: 'badge-status--eligible',
  Rejected: 'badge-status--ineligible',
  PENDING: 'badge-status--applied',
  APPROVED: 'badge-status--eligible',
  REJECTED: 'badge-status--ineligible',
}

export default function OfficerDashboard() {
  const navigate = useNavigate()

  const [officer, setOfficer] = useState(null)
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('home')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedApp, setSelectedApp] = useState(null)
  const [rejectMode, setRejectMode] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [toast, setToast] = useState(null)

  // Disbursement states
  const [disbursementPlan, setDisbursementPlan] = useState(null)
  const [showDisbursementManager, setShowDisbursementManager] = useState(false)
  const [planConfigStages, setPlanConfigStages] = useState([])

  // Task 2 compliance states
  const [overdueReports, setOverdueReports] = useState([])
  const [notifications, setNotifications] = useState([])
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [resolvingMilestoneId, setResolvingMilestoneId] = useState(null)
  const [resolvedReasonInput, setResolvedReasonInput] = useState('')
  const [isResolving, setIsResolving] = useState(false)
  // Auth guard + fetch officer profile on mount
  useEffect(() => {
    async function init() {
      try {
        const res = await api.get('/gov/auth/profile/get')
        if (res.data && res.data.status !== false) {
          setOfficer(res.data.data || res.data)
        } else {
          navigate('/officer/login')
          return
        }
      } catch {
        navigate('/officer/login')
        return
      }

      try {
        const data = await getMyApplications()
        setApplications(Array.isArray(data) ? data : data?.data || [])
      } catch (err) {
        console.error('Failed to load applications:', err.message)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [navigate])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleLogout = async () => {
    try { await api.post('/gov/auth/signout') } catch { /* ignore */ }
    navigate('/officer/login')
  }

  // Statistics
  const total = applications.length
  const pending = applications.filter(a => a.status === 'Pending' || a.status === 'PENDING').length
  const approved = applications.filter(a => a.status === 'Approved' || a.status === 'APPROVED').length
  const rejected = applications.filter(a => a.status === 'Rejected' || a.status === 'REJECTED').length
  const approvalRate = total ? Math.round((approved / total) * 100) : 0

  const officerProfileChecks = officer ? [
    { label: 'Full Name', value: officer.fullName, required: true },
    { label: 'Username', value: officer.username, required: true },
    { label: 'Role', value: officer.role, required: true },
    { label: 'Mobile Number', value: officer.mobileNo, required: true },
    { label: 'Region', value: officer.region, required: true },
    { label: 'District', value: officer.district, required: true },
    { label: 'State', value: officer.state, required: true },
    { label: 'Officer ID', value: officer.uniqueID || officer.uniqueId || officer.id, required: false },
    { label: 'Created On', value: officer.createdAt, required: false },
    { label: 'Updated On', value: officer.updatedAt, required: false },
  ] : []
  const profileFilledCount = officerProfileChecks.filter(item => Boolean(item.value)).length
  const profileCompletion = officerProfileChecks.length
    ? Math.round((profileFilledCount / officerProfileChecks.length) * 100)
    : 0

  const filteredApps = applications.filter(app => {
    const term = searchTerm.toLowerCase()
    const matchesSearch =
      app.applicant?.toLowerCase().includes(term) ||
      app.applicantName?.toLowerCase().includes(term) ||
      (app.id || app.applicationId || '').toLowerCase().includes(term) ||
      app.schemeName?.toLowerCase().includes(term)
    const appStatus = app.status || ''
    const matchesStatus = statusFilter === 'All' || appStatus.toLowerCase() === statusFilter.toLowerCase()
    return matchesSearch && matchesStatus
  })

  const openApplication = (app) => {
    setSelectedApp(app)
    setRejectMode(false)
    setRejectReason('')
  }

  const closeModal = () => {
    setSelectedApp(null)
    setRejectMode(false)
    setRejectReason('')
  }

  const decide = async (status) => {
    if (!selectedApp) return
    const appId = selectedApp.id || selectedApp.applicationId
    try {
      const result = await updateApprovalStatus(appId, status.toUpperCase())
      if (result.status) {
        setApplications(prev =>
          prev.map(a => (a.id || a.applicationId) === appId ? { ...a, status } : a)
        )
        showToast(result.message || `Application ${appId} ${status.toLowerCase()}.`, status === 'Approved' ? 'success' : 'error')
        closeModal()
      } else {
        showToast(result.message || 'Action failed.', 'error')
      }
    } catch (err) {
      showToast(err.message || 'Action failed.', 'error')
    }
  }

  const handleApprove = () => decide('Approved')
  const handleReject = () => {
    if (!rejectReason.trim()) { showToast('Please provide a reason for rejection.', 'error'); return }
    decide('Rejected')
  }

  const fetchAndOpenDisbursement = async (applicationId) => {
    try {
      const plan = await getDisbursementPlan(applicationId)
      setDisbursementPlan(plan)
      
      // If milestones are empty, initialize default configuration stages
      if (!plan.milestones || plan.milestones.length === 0) {
        const count = plan.totalStages || 3
        const defaultStages = []
        for (let i = 1; i <= count; i++) {
          defaultStages.push({
            stageNumber: i,
            milestoneName: i === 1 ? 'Initial Documentation Submitted' : i === 2 ? 'Ground Verification Completed' : 'Final Utilization Proof Submitted',
            amountToRelease: i === 1 ? 20000 : i === 2 ? 15000 : 15000,
            dueDate: new Date(Date.now() + i * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          })
        }
        setPlanConfigStages(defaultStages)
      }
      setShowDisbursementManager(true)
    } catch (err) {
      showToast(err.message || 'Disbursement plan not found.', 'error')
    }
  }

  const handleConfigurePlan = async () => {
    if (!disbursementPlan) return
    const sum = planConfigStages.reduce((acc, curr) => acc + Number(curr.amountToRelease), 0)
    if (Math.abs(sum - disbursementPlan.totalAmount) > 0.01) {
      showToast(`Stage amounts sum to ₹${sum.toLocaleString('en-IN')}, but must equal the total plan amount ₹${disbursementPlan.totalAmount.toLocaleString('en-IN')}.`, 'error')
      return
    }

    try {
      const updatedPlan = await configureDisbursementPlan(disbursementPlan.planId, planConfigStages)
      setDisbursementPlan(updatedPlan)
      showToast('Disbursement plan configured successfully!')
    } catch (err) {
      showToast(err.message || 'Configuration failed.', 'error')
    }
  }

  const handleCompleteMilestone = async (milestoneId) => {
    try {
      await completeMilestone(milestoneId)
      showToast('Milestone status marked as COMPLETED!')
      // Refresh plan
      const plan = await getDisbursementPlan(selectedApp.id)
      setDisbursementPlan(plan)
    } catch (err) {
      showToast(err.message || 'Failed to complete milestone.', 'error')
    }
  }

  const handleReleaseMilestone = async (milestoneId) => {
    try {
      await releaseMilestone(milestoneId)
      showToast('Funds released successfully!', 'success')
      // Refresh plan
      const plan = await getDisbursementPlan(selectedApp.id)
      setDisbursementPlan(plan)
      // Reload applications to sync potential state or stats
      const data = await getMyApplications()
      setApplications(Array.isArray(data) ? data : data?.data || [])
    } catch (err) {
      showToast(err.message || 'Release failed.', 'error')
    }
  }

  // Task 2 Handlers
  const fetchOverdueReports = async () => {
    try {
      const data = await getOverdueMilestones()
      setOverdueReports(data || [])
    } catch (err) {
      console.error('Failed to load overdue report:', err.message)
    }
  }

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications()
      setNotifications(data || [])
    } catch (err) {
      console.error('Failed to load notifications:', err.message)
    }
  }

  const handleResolveMilestone = async () => {
    if (!resolvedReasonInput.trim()) {
      showToast('Resolution reason is mandatory', 'error')
      return
    }
    setIsResolving(true)
    try {
      await resolveMilestone(resolvingMilestoneId, resolvedReasonInput)
      showToast('Overdue milestone resolved successfully!')
      setShowResolveModal(false)
      setResolvedReasonInput('')
      
      // Refresh current plan if open
      if (selectedApp) {
        const plan = await getDisbursementPlan(selectedApp.id)
        setDisbursementPlan(plan)
      }
      // Refresh overdue report list
      await fetchOverdueReports()
    } catch (err) {
      showToast(err.message || 'Failed to resolve milestone.', 'error')
    } finally {
      setIsResolving(false)
    }
  }

  // Load compliance records on active tab change
  useEffect(() => {
    if (activeTab === 'reports') {
      fetchOverdueReports()
    }
    if (activeTab === 'notifications') {
      fetchNotifications()
    }
    // Fetch notifications initially to get badge count
    if (activeTab === 'home') {
      fetchNotifications()
    }
  }, [activeTab])

  // Initial notification load on mount
  useEffect(() => {
    fetchNotifications()
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--muted)' }}>
        Loading...
      </div>
    )
  }

  if (!officer) return null

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
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Sticky Topbar */}
      <header className="topbar" style={{ background: 'var(--panel-strong)', borderBottom: '1px solid var(--border)' }}>
        <div className="topbar__brand">
          <img src={logo} alt="GS Gov Subsidy Logo" className="brand-logo" />
          <div>
            <strong>GS Gov Subsidy</strong>
            <span>Officer Portal</span>
          </div>
        </div>

        <div className="topbar__user-info">
          <span className="user-badge">
            <span className="user-badge__dot"></span>
            {officer.fullName} ({officer.designation || 'Officer'})
          </span>
          <ThemeToggle />
          <button onClick={handleLogout} className="btn-logout">
            Logout
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Panel Content */}
      <main className="dashboard-main">
        <div className="dashboard-tabs">
          <button
            className={`dashboard-tab ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => setActiveTab('home')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Dashboard Home
          </button>
          <button
            className={`dashboard-tab ${activeTab === 'applications' ? 'active' : ''}`}
            onClick={() => setActiveTab('applications')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            Application Management
            {pending > 0 && <span className="tab-badge">{pending}</span>}
          </button>
          <button
            className={`dashboard-tab ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3v18h18" />
              <rect x="7" y="10" width="3" height="8" />
              <rect x="12" y="6" width="3" height="12" />
              <rect x="17" y="13" width="3" height="5" />
            </svg>
            Reports &amp; Analytics
          </button>
          <button
            className={`dashboard-tab ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            Alerts &amp; Reminders
            {notifications.length > 0 && <span className="tab-badge" style={{ background: '#a855f7' }}>{notifications.length}</span>}
          </button>
          <button
            className={`dashboard-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21a8 8 0 1 0-16 0" />
              <circle cx="12" cy="8" r="4" />
            </svg>
            Profile Check
          </button>
        </div>

        <div className="tab-pane">
          {/* TAB 1: DASHBOARD HOME */}
          {activeTab === 'home' && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <div className="pane-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h2>Officer Dashboard</h2>
                  <p>Monitor subsidy applications, verify documents, and approve or reject requests.</p>
                </div>
              </div>

              <div className="officer-stats-grid">
                <div className="officer-stat-card officer-stat-card--total">
                  <span className="officer-stat-card__label">Total Applications</span>
                  <span className="officer-stat-card__value">{total}</span>
                </div>
                <div className="officer-stat-card officer-stat-card--pending">
                  <span className="officer-stat-card__label">Pending Applications</span>
                  <span className="officer-stat-card__value">{pending}</span>
                </div>
                <div className="officer-stat-card officer-stat-card--approved">
                  <span className="officer-stat-card__label">Approved Applications</span>
                  <span className="officer-stat-card__value">{approved}</span>
                </div>
                <div className="officer-stat-card officer-stat-card--rejected">
                  <span className="officer-stat-card__label">Rejected Applications</span>
                  <span className="officer-stat-card__value">{rejected}</span>
                </div>
              </div>

              <h3 className="section-title" style={{ marginTop: '2.5rem' }}>Recent Applications</h3>
              {applications.length === 0 ? (
                <div className="empty-state"><p>No applications assigned yet.</p></div>
              ) : (
                <div className="dbt-ledger-wrap">
                  <table className="dbt-ledger">
                    <thead>
                      <tr>
                        <th>Application ID</th>
                        <th>Applicant</th>
                        <th>Scheme</th>
                        <th>Submitted</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applications.slice(0, 5).map(app => (
                        <tr key={app.id || app.applicationId}>
                          <td className="font-mono text-soft">{app.id || app.applicationId}</td>
                          <td>{app.applicant || app.applicantName}</td>
                          <td>{app.schemeName || app.schemeId || '—'}</td>
                          <td className="font-mono">{app.submittedDate || app.createdAt || '—'}</td>
                          <td>
                            <span className={`badge-status ${STATUS_BADGE[app.status] || ''}`}>{app.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div style={{ marginTop: '1.5rem' }}>
                <button className="button button--primary" onClick={() => setActiveTab('applications')}>
                  Manage Applications
                </button>
              </div>
            </motion.div>
          )}

          {/* TAB 2: APPLICATION MANAGEMENT */}
          {activeTab === 'applications' && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <div className="pane-header">
                <h2>Application Management</h2>
                <p>Review submitted applications and approve or reject subsidy requests.</p>
              </div>

              <div className="filter-bar">
                <div className="search-box">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by applicant or application ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="category-chips">
                  {['All', 'Pending', 'Approved', 'Rejected'].map(status => (
                    <button
                      key={status}
                      className={`cat-chip ${statusFilter === status ? 'active' : ''}`}
                      onClick={() => setStatusFilter(status)}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {filteredApps.length > 0 ? (
                <div className="dbt-ledger-wrap">
                  <table className="dbt-ledger">
                    <thead>
                      <tr>
                        <th>Application ID</th>
                        <th>Applicant</th>
                        <th>Scheme</th>
                        <th>Submitted</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredApps.map(app => (
                        <tr key={app.id || app.applicationId}>
                          <td className="font-mono text-soft">{app.id || app.applicationId}</td>
                          <td>{app.applicant || app.applicantName}</td>
                          <td>{app.schemeName || app.schemeId || '—'}</td>
                          <td className="font-mono">{app.submittedDate || app.createdAt || '—'}</td>
                          <td>
                            <span className={`badge-status ${STATUS_BADGE[app.status] || ''}`}>{app.status}</span>
                          </td>
                          <td>
                            <button className="officer-view-btn" onClick={() => openApplication(app)}>
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <h3>No applications match your criteria</h3>
                  <p>Try adjusting your search terms or filters.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 3: REPORTS & ANALYTICS */}
          {activeTab === 'reports' && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <div className="pane-header">
                <h2>Reports &amp; Analytics</h2>
                <p>Application statistics and approval rates.</p>
              </div>

              <div className="beneficiary-meta-card">
                <div className="meta-card__item">
                  <span className="meta-card__label">Total Processed</span>
                  <span className="meta-card__val">{approved + rejected} / {total}</span>
                </div>
                <div className="meta-card__item">
                  <span className="meta-card__label">Approval Rate</span>
                  <span className="meta-card__val">{approvalRate}%</span>
                </div>
                <div className="meta-card__item">
                  <span className="meta-card__label">Awaiting Review</span>
                  <span className="meta-card__val text-secondary flex-align">
                    <span className="badge-dot-green"></span> {pending} Pending
                  </span>
                </div>
              </div>

              <h3 className="section-title" style={{ marginTop: '2.5rem' }}>Applications by Status</h3>
              <div className="officer-stats-grid">
                <div className="officer-stat-card officer-stat-card--total">
                  <span className="officer-stat-card__label">Total</span>
                  <span className="officer-stat-card__value">{total}</span>
                </div>
                <div className="officer-stat-card officer-stat-card--pending">
                  <span className="officer-stat-card__label">Pending</span>
                  <span className="officer-stat-card__value">{pending}</span>
                </div>
                <div className="officer-stat-card officer-stat-card--approved">
                  <span className="officer-stat-card__label">Approved</span>
                  <span className="officer-stat-card__value">{approved}</span>
                </div>
                <div className="officer-stat-card officer-stat-card--rejected">
                  <span className="officer-stat-card__label">Rejected</span>
                  <span className="officer-stat-card__value">{rejected}</span>
                </div>
              </div>

              <h3 className="section-title" style={{ marginTop: '2.5rem', color: '#ef4444' }}>⚠️ Non-Compliance &amp; Overdue Milestones</h3>
              {overdueReports.length === 0 ? (
                <div className="empty-state" style={{ border: '1px dashed var(--border)', padding: '2rem' }}>
                  <p>All milestones are compliant. No overdue stages found.</p>
                </div>
              ) : (
                <div className="dbt-ledger-wrap" style={{ marginTop: '1rem' }}>
                  <table className="dbt-ledger">
                    <thead>
                      <tr>
                        <th>Milestone ID</th>
                        <th>Beneficiary Name</th>
                        <th>Scheme</th>
                        <th>Milestone Name</th>
                        <th>Due Date</th>
                        <th>Days Overdue</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overdueReports.map(rep => (
                        <tr key={rep.milestoneId}>
                          <td className="font-mono text-soft">#{rep.milestoneId}</td>
                          <td style={{ fontWeight: 600 }}>{rep.beneficiaryName}</td>
                          <td>{rep.schemeName}</td>
                          <td>{rep.milestoneName}</td>
                          <td className="font-mono" style={{ color: '#ef4444' }}>{rep.dueDate}</td>
                          <td style={{ color: '#ef4444', fontWeight: 'bold' }}>
                            {rep.daysOverdue} days
                          </td>
                          <td>
                            <button 
                              className="button button--secondary" 
                              style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', borderColor: '#ef4444', color: '#ef4444' }}
                              onClick={() => {
                                setResolvingMilestoneId(rep.milestoneId)
                                setShowResolveModal(true)
                              }}
                            >
                              Resolve Override
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 4: ALERTS & REMINDERS */}
          {activeTab === 'notifications' && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <div className="pane-header">
                <h2>Alerts &amp; Reminders Log</h2>
                <p>Notifications dispatched to beneficiaries reminding them of upcoming due dates.</p>
              </div>

              {notifications.length === 0 ? (
                <div className="empty-state" style={{ padding: '3rem' }}>
                  <p>No notifications have been dispatched yet.</p>
                </div>
              ) : (
                <div className="notifications-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
                  {notifications.map(notif => (
                    <div 
                      key={notif.id} 
                      className="notification-item" 
                      style={{ 
                        background: 'var(--card-bg)', 
                        border: '1px solid var(--border)', 
                        borderRadius: '8px', 
                        padding: '1.2rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                          Recipient: {notif.user?.fullName} (@{notif.user?.username})
                        </span>
                        <span className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                          Sent: {notif.sentDate}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text)' }}>
                        {notif.message}
                      </p>
                      <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                        Milestone Reference: #{notif.milestoneId}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 5: PROFILE CHECK */}
          {activeTab === 'profile' && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <div className="pane-header">
                <h2>Profile Check</h2>
                <p>Review the officer account details that are already stored in the backend.</p>
              </div>

              <div className="profile-container">
                <div className="profile-sidebar">
                  <div className="profile-avatar-card">
                    <div className="avatar-circle">
                      {(officer.fullName || officer.username || 'O').charAt(0).toUpperCase()}
                    </div>
                    <h3>{officer.fullName || 'Officer'}</h3>
                    <p>@{officer.username || 'unknown'}</p>
                    <span className="profile-occup-badge">{officer.role || 'OFFICER'}</span>
                  </div>

                  <div className="profile-actions-panel">
                    <div className="beneficiary-meta-card" style={{ width: '100%' }}>
                      <div className="meta-card__item" style={{ width: '100%' }}>
                        <span className="meta-card__label">Profile Completion</span>
                        <span className="meta-card__val">{profileCompletion}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="profile-form-card officer-profile-card">
                  <div className="card-title-bar">
                    <h3>Account Information</h3>
                  </div>

                  <div className="profile-form officer-profile-form">
                    <div className="form-grid">
                      {officerProfileChecks.map((item) => (
                        <div className="form-group" key={item.label}>
                          <label>
                            {item.label} {item.required && <span style={{ color: '#ef4444' }}>*</span>}
                          </label>
                          <input
                            type="text"
                            readOnly
                            value={item.value || 'Not provided'}
                            className={`profile-field-input ${item.value ? 'profile-field-input--filled' : 'profile-field-input--missing'}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* Application Details Modal */}
      <AnimatePresence>
        {selectedApp && (
          <div className="modal-overlay" onClick={closeModal}>
            <motion.div
              className="modal-panel"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '600px', textAlign: 'left' }}
            >
              <div className="tracking-card__header" style={{ marginBottom: '1.2rem' }}>
                <h3 style={{ margin: 0 }}>
                  {selectedApp.id || selectedApp.applicationId} · {selectedApp.applicant || selectedApp.applicantName}
                </h3>
                <span className={`badge-status ${STATUS_BADGE[selectedApp.status] || ''}`}>{selectedApp.status}</span>
              </div>

              <div className="beneficiary-meta-card" style={{ marginBottom: '1.5rem' }}>
                <div className="meta-card__item">
                  <span className="meta-card__label">Scheme</span>
                  <span className="meta-card__val">{selectedApp.schemeName || selectedApp.schemeId || '—'}</span>
                </div>
                {selectedApp.annualIncome && (
                  <div className="meta-card__item">
                    <span className="meta-card__label">Annual Income</span>
                    <span className="meta-card__val font-mono">₹{selectedApp.annualIncome}</span>
                  </div>
                )}
                {selectedApp.aadhaar && (
                  <div className="meta-card__item">
                    <span className="meta-card__label">Aadhaar</span>
                    <span className="meta-card__val font-mono">{selectedApp.aadhaar}</span>
                  </div>
                )}
                {selectedApp.phone && (
                  <div className="meta-card__item">
                    <span className="meta-card__label">Contact</span>
                    <span className="meta-card__val font-mono">{selectedApp.phone}</span>
                  </div>
                )}
              </div>

              {selectedApp.remarks && (
                <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginTop: '1rem' }}>
                  <strong>Remarks:</strong> {selectedApp.remarks}
                </p>
              )}

              {rejectMode && (
                <div className="delete-confirm-box" style={{ marginTop: '1.2rem' }}>
                  <label>Reason for rejection</label>
                  <input
                    type="text"
                    placeholder="Enter reason for rejecting this application"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', alignItems: 'center' }}>
                <button className="button button--ghost btn-apply" onClick={closeModal}>Close</button>
                {(selectedApp.status === 'Approved' || selectedApp.status === 'APPROVED') && (
                  <button 
                    className="button button--primary" 
                    onClick={() => {
                      closeModal();
                      fetchAndOpenDisbursement(selectedApp.id);
                    }}
                  >
                    Manage Disbursement
                  </button>
                )}
                {selectedApp.status !== 'Rejected' && selectedApp.status !== 'REJECTED' && (
                  rejectMode ? (
                    <button className="btn-danger-confirm btn-reject" onClick={handleReject}>
                      Confirm Reject
                    </button>
                  ) : (
                    <button className="btn-danger-outline btn-reject" onClick={() => setRejectMode(true)}>
                      Reject Application
                    </button>
                  )
                )}
                {selectedApp.status !== 'Approved' && selectedApp.status !== 'APPROVED' && !rejectMode && (
                  <button className="button button--primary btn-approve" onClick={handleApprove}>
                    Approve Application
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Disbursement Plan Modal */}
      <AnimatePresence>
        {showDisbursementManager && disbursementPlan && (
          <div className="modal-overlay" onClick={() => setShowDisbursementManager(false)}>
            <motion.div
              className="modal-panel"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '650px', textAlign: 'left', overflowY: 'auto', maxHeight: '90vh' }}
            >
              <div className="tracking-card__header" style={{ marginBottom: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>
                  Disbursement Plan for App #{disbursementPlan.applicationId}
                </h3>
                <span className="badge-status badge-status--eligible">
                  Total Approved: ₹{disbursementPlan.totalAmount.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Check if plan is configured */}
              {!disbursementPlan.milestones || disbursementPlan.milestones.length === 0 ? (
                // CONFIGURATION FORM
                <div>
                  <h4 style={{ margin: '0 0 1rem 0' }}>Configure Milestones ({disbursementPlan.totalStages} Stages)</h4>
                  <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                    Configure the milestone names, amounts to release, and target due dates. The stage amounts must sum up to the total approved grant of ₹{disbursementPlan.totalAmount.toLocaleString('en-IN')}.
                  </p>

                  <table className="stage-config-table">
                    <thead>
                      <tr>
                        <th style={{ width: '8%', color: 'var(--muted)' }}>Stage</th>
                        <th style={{ width: '45%', color: 'var(--muted)' }}>Milestone Name</th>
                        <th style={{ width: '25%', color: 'var(--muted)' }}>Amount to Release (₹)</th>
                        <th style={{ width: '22%', color: 'var(--muted)' }}>Due Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {planConfigStages.map((stage, idx) => (
                        <tr key={idx}>
                          <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--text)' }}>{stage.stageNumber}</td>
                          <td>
                            <input 
                              type="text" 
                              value={stage.milestoneName} 
                              onChange={(e) => {
                                const val = e.target.value;
                                setPlanConfigStages(prev => prev.map((s, i) => i === idx ? { ...s, milestoneName: val } : s))
                              }}
                              style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--bg)', color: 'var(--text)' }}
                            />
                          </td>
                          <td>
                            <input 
                              type="number" 
                              value={stage.amountToRelease} 
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setPlanConfigStages(prev => prev.map((s, i) => i === idx ? { ...s, amountToRelease: val } : s))
                              }}
                              style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--bg)', color: 'var(--text)' }}
                            />
                          </td>
                          <td>
                            <input 
                              type="date" 
                              value={stage.dueDate} 
                              onChange={(e) => {
                                const val = e.target.value;
                                setPlanConfigStages(prev => prev.map((s, i) => i === idx ? { ...s, dueDate: val } : s))
                              }}
                              style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--bg)', color: 'var(--text)' }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Show live sum tracker */}
                  {(() => {
                    const sum = planConfigStages.reduce((acc, curr) => acc + Number(curr.amountToRelease), 0);
                    const diff = sum - disbursementPlan.totalAmount;
                    if (Math.abs(diff) > 0.01) {
                      return (
                        <div className="sum-warning" style={{ color: '#ef4444', fontWeight: '600', marginBottom: '1rem' }}>
                          ⚠️ Warning: Sum of stages (₹{sum.toLocaleString('en-IN')}) does not match the total approved grant (₹{disbursementPlan.totalAmount.toLocaleString('en-IN')}). Diff: ₹{diff.toLocaleString('en-IN')}.
                        </div>
                      );
                    } else {
                      return (
                        <div className="sum-success" style={{ color: '#22c55e', fontWeight: '600', marginBottom: '1rem' }}>
                          ✅ Verified: Sum of stages matches exactly the approved grant (₹{sum.toLocaleString('en-IN')}).
                        </div>
                      );
                    }
                  })()}

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                    <button className="button button--ghost" onClick={() => setShowDisbursementManager(false)}>Cancel</button>
                    <button className="button button--primary" onClick={handleConfigurePlan}>Save Configuration</button>
                  </div>
                </div>
              ) : (
                // MILESTONE TIMELINE VIEW
                <div>
                  <h4 style={{ margin: '0 0 1.5rem 0' }}>Disbursement Milestone Tracking</h4>
                  
                  <div className="timeline">
                    {disbursementPlan.milestones.map((m, idx) => {
                      const isPrevReleasedOrCompleted = idx === 0 || 
                        disbursementPlan.milestones.slice(0, idx).every(prev => 
                          prev.completionStatus === 'RELEASED' || prev.completionStatus === 'COMPLETED'
                        );
                      
                      const hasOverdueEarlier = disbursementPlan.milestones.slice(0, idx).some(prev => 
                        prev.completionStatus === 'OVERDUE'
                      );

                      const isReleaseBlocked = !isPrevReleasedOrCompleted || hasOverdueEarlier || m.completionStatus !== 'COMPLETED';

                      return (
                        <div className="timeline-item" key={m.milestoneId}>
                          <div className={`timeline-badge status-${m.completionStatus.toLowerCase()}`}>
                            {m.stageNumber}
                          </div>
                          <div className="timeline-content">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <h5 className="timeline-title">{m.milestoneName}</h5>
                              <span className={`badge-status status-${m.completionStatus.toLowerCase()}`} style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}>
                                {m.completionStatus}
                              </span>
                            </div>
                            <div className="timeline-meta">
                              <div><strong>Amount:</strong> ₹{m.amountToRelease.toLocaleString('en-IN')}</div>
                              <div><strong>Due Date:</strong> {m.dueDate}</div>
                              {m.completedDate && <div><strong>Completed:</strong> {m.completedDate}</div>}
                              {m.releaseDate && <div><strong>Released:</strong> {m.releaseDate}</div>}
                              {m.resolvedReason && (
                                <div style={{ width: '100%', color: '#22c55e', marginTop: '0.3rem' }}>
                                  <strong>Override Reason:</strong> {m.resolvedReason} (on {m.resolvedDate})
                                </div>
                              )}
                            </div>

                            <div className="timeline-actions">
                              {m.completionStatus === 'PENDING' && (
                                <button 
                                  className="button button--ghost" 
                                  style={{ padding: '0.35rem 0.8rem', fontSize: '0.82rem' }}
                                  onClick={() => handleCompleteMilestone(m.milestoneId)}
                                >
                                  Mark Completed
                                </button>
                              )}
                              {m.completionStatus === 'COMPLETED' && (
                                <button 
                                  className="button button--primary" 
                                  style={{ padding: '0.35rem 0.8rem', fontSize: '0.82rem' }}
                                  onClick={() => handleReleaseMilestone(m.milestoneId)}
                                  disabled={isReleaseBlocked}
                                  title={
                                    hasOverdueEarlier 
                                      ? "Release blocked because an earlier stage is OVERDUE." 
                                      : isReleaseBlocked 
                                      ? "Previous stage must be complete/released to release funds." 
                                      : "Release milestone funds"
                                  }
                                >
                                  Release Funds
                                </button>
                              )}
                              {m.completionStatus === 'OVERDUE' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}>
                                  <span style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>
                                    ⚠️ Non-compliant / Overdue
                                  </span>
                                  <button 
                                    className="button button--secondary" 
                                    style={{ padding: '0.35rem 0.8rem', fontSize: '0.82rem', borderColor: '#ef4444', color: '#ef4444' }}
                                    onClick={() => {
                                      setResolvingMilestoneId(m.milestoneId)
                                      setShowResolveModal(true)
                                    }}
                                  >
                                    Resolve Overdue
                                  </button>
                                </div>
                              )}
                              {m.completionStatus === 'RELEASED' && (
                                <span style={{ color: '#22c55e', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                  ✓ Funds Disbursed (₹{m.amountReleased.toLocaleString('en-IN')})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                    <button className="button button--ghost" onClick={() => setShowDisbursementManager(false)}>Close</button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Override Resolve Modal */}
      <AnimatePresence>
        {showResolveModal && (
          <div className="modal-overlay" onClick={() => {
            setShowResolveModal(false)
            setResolvedReasonInput('')
          }}>
            <motion.div
              className="modal-panel"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '450px', textAlign: 'left' }}
            >
              <h3 style={{ margin: '0 0 1rem 0', color: '#ef4444' }}>Admin Compliance Override</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: '1.5rem' }}>
                You are performing an administrative override to resolve overdue milestone #{resolvingMilestoneId}. A mandatory resolution reason must be provided to audit this transaction.
              </p>

              <div className="delete-confirm-box" style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Reason for Resolution</label>
                <textarea
                  placeholder="Enter administrative justification for override..."
                  value={resolvedReasonInput}
                  onChange={(e) => setResolvedReasonInput(e.target.value)}
                  rows={4}
                  style={{ 
                    width: '100%', 
                    padding: '0.6rem', 
                    borderRadius: '6px', 
                    border: '1px solid var(--border)', 
                    background: 'var(--bg)', 
                    color: 'var(--text)',
                    fontFamily: 'inherit',
                    fontSize: '0.9rem',
                    resize: 'none',
                    marginTop: '0.4rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button className="button button--ghost" onClick={() => {
                  setShowResolveModal(false)
                  setResolvedReasonInput('')
                }}>
                  Cancel
                </button>
                <button 
                  className="button button--primary" 
                  style={{ background: '#ef4444', borderColor: '#ef4444' }}
                  onClick={handleResolveMilestone}
                  disabled={isResolving || !resolvedReasonInput.trim()}
                >
                  {isResolving ? 'Resolving...' : 'Confirm Resolve'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .timeline {
          position: relative;
          padding: 1.5rem 0;
          margin-left: 1.5rem;
          border-left: 2px solid var(--border);
        }
        .timeline-item {
          position: relative;
          margin-bottom: 2rem;
          padding-left: 2rem;
        }
        .timeline-item:last-child {
          margin-bottom: 0;
        }
        .timeline-badge {
          position: absolute;
          left: -11px;
          top: 2px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--bg);
          border: 2px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: bold;
          color: var(--muted);
        }
        .timeline-badge.status-completed {
          background: #a855f7;
          border-color: #a855f7;
          color: #fff;
        }
        .timeline-badge.status-released {
          background: #22c55e;
          border-color: #22c55e;
          color: #fff;
        }
        .timeline-badge.status-pending {
          background: #eab308;
          border-color: #eab308;
          color: #fff;
        }
        .timeline-content {
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 1.2rem;
        }
        .timeline-title {
          font-weight: 600;
          font-size: 0.95rem;
          margin: 0 0 0.5rem 0;
          color: var(--text);
        }
        .timeline-meta {
          font-size: 0.8rem;
          color: var(--muted);
          margin-bottom: 1rem;
          display: flex;
          flex-wrap: wrap;
          gap: 1.2rem;
        }
        .timeline-actions {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }
        .stage-config-table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5rem 0;
        }
        .stage-config-table th {
          font-size: 0.8rem;
          font-weight: 600;
          padding: 0.6rem;
          text-align: left;
        }
        .stage-config-table td {
          padding: 0.5rem 0.25rem;
        }
        .badge-status.status-completed {
          background: rgba(168, 85, 247, 0.15);
          color: #a855f7;
          border: 1px solid rgba(168, 85, 247, 0.3);
        }
        .badge-status.status-released {
          background: rgba(34, 197, 94, 0.15);
          color: #22c55e;
          border: 1px solid rgba(34, 197, 94, 0.3);
        }
        .badge-status.status-pending {
          background: rgba(234, 179, 8, 0.15);
          color: #eab308;
          border: 1px solid rgba(234, 179, 8, 0.3);
        }
        .timeline-badge.status-overdue {
          background: #ef4444;
          border-color: #ef4444;
          color: #fff;
        }
        .badge-status.status-overdue {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
      `}</style>
    </div>
  )
}
