import '../../styles/Dashboard.css';
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../services/api'
import { getMyApplications, getInspectionContext } from '../../services/officerService'
import { clearPortalSessionCaches } from '../../services/sessionCleanup'
import DashboardTopbar from '../../components/DashboardTopbar'
import ProfilePanel from '../../components/ProfilePanel'
import { FaUserCircle, FaBell } from 'react-icons/fa'
import {
  getDisbursementPlanByApplicationId,
  suggestStages,
  configurePlan,
  releaseMilestone,
  approveWithInstallments,
  getNotifications,
  markNotificationRead,
  getMilestoneContext
} from '../../services/fundsService'

const SCHEME_NAMES = {
  'pm-kisan': 'PM-KISAN (Farmers Income Support)',
  'national-vidya': 'National Vidya Scholarship',
  'pm-awas': 'Pradhan Mantri Awas Yojana (Rural Housing)',
}

function isPendingFinanceQueueApp(app) {
  const status = String(app?.status || app?.applicationStatus || '').toUpperCase()
  const stage = String(app?.currentStage || app?.stage || '').toUpperCase()
  const isConfigured = Boolean(app?.isPlanConfigured || (app?.milestones && app?.milestones.length > 0))

  // Fresh Finance Officer work awaiting approval / sanction
  const isFreshFinanceWork =
    ['UNDER_REVIEW', 'PENDING', 'SUBMITTED'].includes(status) &&
    ['FINANCE_OFFICER', 'FINANCE'].includes(stage)

  // Already approved applications that have NOT yet configured their disbursement plan
  const isApprovedAwaitingPlan =
    status === 'APPROVED' && !isConfigured

  return isFreshFinanceWork || isApprovedAwaitingPlan
}

function isFinanceActivePlanApp(app) {
  const status = String(app?.status || app?.applicationStatus || '').toUpperCase()
  const isConfigured = Boolean(app?.isPlanConfigured || (app?.milestones && app?.milestones.length > 0))
  return (status === 'APPROVED' || status === 'DISBURSED') && isConfigured
}

function getFinanceStatusDisplay(app) {
  const status = String(app?.status || app?.applicationStatus || '').toUpperCase()
  const stage = String(app?.currentStage || app?.stage || '').toUpperCase()

  if (['UNDER_REVIEW', 'PENDING', 'SUBMITTED'].includes(status) && ['FINANCE_OFFICER', 'FINANCE'].includes(stage)) {
    return {
      label: 'Pending Sanction',
      badgeClass: 'badge-status--applied'
    }
  }

  if (app?.disbursementStatus) {
    return {
      label: app.disbursementStatus,
      badgeClass: 'badge-status--eligible'
    }
  }

  const milestones = Array.isArray(app?.milestones) ? app.milestones : []
  if (milestones.length > 0) {
    const releasedCount = milestones.filter(m => String(m.completionStatus || '').toUpperCase() === 'RELEASED').length
    if (releasedCount === milestones.length) {
      return { label: 'Fully Disbursed', badgeClass: 'badge-status--eligible' }
    } else if (releasedCount > 0) {
      return { label: `Stage ${releasedCount} Released / Stage ${releasedCount + 1} Pending`, badgeClass: 'badge-status--eligible' }
    } else {
      return { label: 'Plan Configured / Stage 1 Pending', badgeClass: 'badge-status--eligible' }
    }
  }

  if (status === 'APPROVED') {
    return {
      label: 'Approved / Ready for Plan',
      badgeClass: 'badge-status--eligible'
    }
  }

  if (status === 'REJECTED') {
    return {
      label: 'Rejected',
      badgeClass: 'badge-status--ineligible'
    }
  }

  if (status === 'DISBURSED') {
    return {
      label: 'Disbursed',
      badgeClass: 'badge-status--eligible'
    }
  }

  return {
    label: app?.status || 'Under Review',
    badgeClass: 'badge-status--applied'
  }
}

function getActionButtonLabel(app) {
  const status = String(app?.status || app?.applicationStatus || '').toUpperCase()
  const stage = String(app?.currentStage || app?.stage || '').toUpperCase()
  const isConfigured = Boolean(app?.isPlanConfigured || (app?.milestones && app?.milestones.length > 0))

  if (['UNDER_REVIEW', 'PENDING', 'SUBMITTED'].includes(status) && ['FINANCE_OFFICER', 'FINANCE'].includes(stage)) {
    return 'Review & Sanction'
  }

  if (status === 'APPROVED' || status === 'DISBURSED') {
    if (isConfigured) {
      return 'View Plan & Milestones'
    }
    return 'Configure Plan'
  }

  return 'Review & Sanction'
}

export default function FinanceDashboard() {
  const navigate = useNavigate()

  const [officer, setOfficer] = useState(null)
  const [applications, setApplications] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('queue')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedApp, setSelectedApp] = useState(null)
  
  // Disbursement Form State
  const [approvalForm, setApprovalForm] = useState({ approvedAmount: '', numberOfInstallments: '' })
  const [planId, setPlanId] = useState(null)
  const [stages, setStages] = useState([])
  const [totalAmount, setTotalAmount] = useState(0)
  const [step, setStep] = useState('approve')

  const [inspectionContext, setInspectionContext] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [activeMilestone, setActiveMilestone] = useState(null)
  const [showNotifications, setShowNotifications] = useState(false)
  
  const [modalError, setModalError] = useState('')
  const [modalLoading, setModalLoading] = useState(false)
  const [toast, setToast] = useState(null)

  async function refreshApplications() {
    try {
      const data = await getMyApplications()
      setApplications(Array.isArray(data) ? data : data?.data || [])
    } catch (err) {
      console.error('Failed to load applications:', err.message)
    }
  }

  useEffect(() => {
    async function init() {
      try {
        const res = await api.get('/gov/auth/profile/get')
        if (res.data && res.data.status !== false) {
          const profileData = res.data.data || res.data
          const allowedRoles = ['FINANCE_OFFICER', 'ADMIN']
          if (!allowedRoles.includes(profileData.role?.toUpperCase())) {
            navigate('/login')
            return
          }
          setOfficer(profileData)
          
          // Fetch notifications
          getNotifications().then(setNotifications).catch(console.error)
        } else {
          navigate('/login')
          return
        }
      } catch {
        navigate('/login')
        return
      }

      await refreshApplications()
      setAuditLogs([])
      setLoading(false)
    }
    init()
  }, [navigate])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleLogout = async () => {
    try {
      await api.post('/gov/auth/signout')
    } catch { /* ignore */ }
    clearPortalSessionCaches()
    navigate('/login')
  }

  const pendingQueueApps = applications.filter(isPendingFinanceQueueApp)
  const activePlanApps = applications.filter(isFinanceActivePlanApp)

  const filteredQueue = pendingQueueApps.filter(app => {
    const term = searchTerm.toLowerCase()
    return (
      (app.applicant || app.applicantName || '').toLowerCase().includes(term) ||
      (app.id || app.applicationId || '').toString().toLowerCase().includes(term) ||
      (app.schemeName || SCHEME_NAMES[app.schemeId] || '').toLowerCase().includes(term)
    )
  })

  const filteredActivePlans = activePlanApps.filter(app => {
    const term = searchTerm.toLowerCase()
    return (
      (app.applicant || app.applicantName || '').toLowerCase().includes(term) ||
      (app.id || app.applicationId || '').toString().toLowerCase().includes(term) ||
      (app.schemeName || SCHEME_NAMES[app.schemeId] || '').toLowerCase().includes(term)
    )
  })

  // Total Disbursed (All Time) sums amountReleased from all RELEASED milestones
  const totalDisbursedAmount = applications.reduce((acc, curr) => acc + Number(curr.disbursedAmount || 0), 0)
  const pendingCount = pendingQueueApps.length
  const totalApprovedAmount = pendingQueueApps.reduce((acc, curr) => acc + Number(curr.amount || 0), 0)

  const openDisburseModal = async (app) => {
    const appId = app.id || app.applicationId
    setSelectedApp(app)
    setApprovalForm({
      approvedAmount: app.amount && Number(app.amount) > 0 ? String(app.amount) : '',
      numberOfInstallments: ''
    })
    setPlanId(null)
    setStages([])
    setTotalAmount(Number(app.amount || 0))
    setModalError('')
    setModalLoading(true)
    setInspectionContext(null)
    setStep('approve')

    try {
      const ctx = await getInspectionContext(appId)
      setInspectionContext(ctx)
    } catch {
      setInspectionContext(null)
    }

    try {
      const plan = await getDisbursementPlanByApplicationId(appId)
      if (plan && plan.planId) {
        setPlanId(plan.planId)
        setTotalAmount(Number(plan.totalAmount || 0))
        if (plan.milestones && plan.milestones.length > 0) {
          setStages(plan.milestones)
          setStep('view_plan')
        } else {
          const suggestion = await suggestStages(plan.planId)
          const suggested = suggestion?.suggestedStages || suggestion?.stages || []
          setStages(suggested)
          setStep('suggest')
        }
      } else {
        setStep('approve')
      }
    } catch (err) {
      const errMsg = String(err?.message || '').toLowerCase()
      const isNotFound =
        errMsg.includes('404') ||
        errMsg.includes('not found') ||
        errMsg.includes('no disbursement plan')

      if (isNotFound) {
        // Genuine no-plan state -> Proceed to Step 1 (approve)
        setStep('approve')
      } else {
        // Server / network / auth error
        setModalError(err.message || 'Failed to check existing disbursement plan.')
        showToast(err.message || 'Failed to check disbursement plan.', 'error')
      }
    } finally {
      setModalLoading(false)
    }
  }

  const handleReleaseMilestone = async (milestoneId) => {
    setModalLoading(true)
    setModalError('')
    try {
      await releaseMilestone(milestoneId)
      showToast('Milestone funds released successfully!')
      const appId = selectedApp.id || selectedApp.applicationId
      const updatedPlan = await getDisbursementPlanByApplicationId(appId)
      if (updatedPlan && updatedPlan.milestones) {
        setStages(updatedPlan.milestones)
      }
      await refreshApplications()
    } catch (err) {
      setModalError(err.message || 'Failed to release milestone funds.')
      showToast(err.message || 'Failed to release milestone funds.', 'error')
    } finally {
      setModalLoading(false)
    }
  }

  async function handleApprove(e) {
    e.preventDefault()
    setModalLoading(true)
    setModalError('')
    try {
      const appId = selectedApp.id || selectedApp.applicationId
      const amount = Number(approvalForm.approvedAmount)
      const installments = Number(approvalForm.numberOfInstallments)

      if (!amount || amount <= 0) {
        throw new Error('Please enter a valid sanctioned subsidy amount greater than 0.')
      }
      if (!installments || installments < 1) {
        throw new Error('Please enter at least 1 installment.')
      }

      await approveWithInstallments(appId, amount, installments)
      const plan = await getDisbursementPlanByApplicationId(appId)
      if (!plan || !plan.planId) {
        throw new Error('Disbursement plan could not be created or loaded.')
      }
      setPlanId(plan.planId)
      setTotalAmount(plan.totalAmount)
      const suggestion = await suggestStages(plan.planId)
      const suggested = suggestion?.suggestedStages || suggestion?.stages || []
      setStages(suggested)
      setStep('suggest')
      await refreshApplications()
    } catch (err) {
      setModalError(err.response?.data?.message || err.message)
    } finally {
      setModalLoading(false)
    }
  }

  async function handleFinalize() {
    setModalLoading(true)
    setModalError('')
    try {
      await configurePlan(planId, stages)
      setStep('finalized')
      await refreshApplications()
      showToast('Disbursement plan finalized and Stage 1 released!', 'success')
    } catch (err) {
      setModalError(err.response?.data?.message || err.message)
    } finally {
      setModalLoading(false)
    }
  }

  const runningTotal = stages.reduce((sum, s) => sum + Number(s.amountToRelease || 0), 0)
  const balanceRemaining = totalAmount - runningTotal
  const isBalanced = Math.abs(balanceRemaining) < 0.01

  const handleStageChange = (index, field, value) => {
    setStages(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s))
  }

  async function handleNotificationClick(notification) {
    if (notification.notificationType === 'MILESTONE_READY' && notification.milestoneId) {
      const context = await getMilestoneContext(notification.milestoneId)
      setActiveMilestone(context)
      setShowNotifications(false)
      if (!notification.isRead) {
        await markNotificationRead(notification.id)
        setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n))
      }
    }
  }

  async function handleReleaseFromModal() {
    setModalLoading(true)
    try {
      await releaseMilestone(activeMilestone.milestoneId)
      setActiveMilestone(null)
      const refreshed = await getNotifications()
      setNotifications(refreshed)
      showToast('Milestone released successfully!', 'success')
    } catch (err) {
      alert(err.response?.data?.message || err.message)
    } finally {
      setModalLoading(false)
    }
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--muted)' }}>
        Loading Finance Module...
      </div>
    )
  }

  return (
    <div className="dashboard-layout">
      <AnimatePresence>
        {toast && (
          <motion.div
            className={`toast toast--${toast.type}`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ zIndex: 2000 }}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <DashboardTopbar
        brandTitle="GS Officer Portal"
        brandSubtitle="Finance & Disbursement Officer Portal"
        userName={officer?.fullName}
        userRole={officer?.role === 'FINANCE_OFFICER' ? 'Finance Officer' : officer?.role}
        onLogout={handleLogout}
        extraActions={
          <div style={{ position: 'relative' }}>
            <button 
              className="button button--ghost" 
              style={{ position: 'relative', padding: '0.4rem 0.6rem' }}
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <FaBell />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: -2, right: -2, background: '#ff6b76', 
                  color: '#fff', fontSize: '10px', borderRadius: '50%', padding: '2px 5px', fontWeight: 'bold'
                }}>
                  {unreadCount}
                </span>
              )}
            </button>
            {showNotifications && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, width: '320px', 
                background: 'var(--panel)', border: '1px solid var(--border)', 
                borderRadius: '8px', zIndex: 3000, marginTop: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                maxHeight: '400px', overflowY: 'auto'
              }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', fontWeight: 'bold' }}>Notifications</div>
                {notifications.length === 0 ? (
                  <div style={{ padding: '1rem', color: 'var(--muted)', textAlign: 'center', fontSize: '0.9rem' }}>No notifications</div>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n.id} 
                      onClick={() => handleNotificationClick(n)}
                      style={{ 
                        padding: '1rem', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                        background: n.isRead ? 'transparent' : 'rgba(187, 143, 206, 0.1)'
                      }}
                    >
                      <div style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>{n.message}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{n.sentDate}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        }
      />

      <main className="dashboard-main">
        <div className="dashboard-tabs">
          <button className={`dashboard-tab ${activeTab === 'queue' ? 'active' : ''}`} onClick={() => setActiveTab('queue')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            Pending Disbursement Queue
            {pendingCount > 0 && <span className="tab-badge">{pendingCount}</span>}
          </button>
          <button className={`dashboard-tab ${activeTab === 'active_plans' ? 'active' : ''}`} onClick={() => setActiveTab('active_plans')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
            Active Disbursements
            {activePlanApps.length > 0 && <span className="tab-badge" style={{ background: '#2ecc71' }}>{activePlanApps.length}</span>}
          </button>
          <button className={`dashboard-tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Finance Audit &amp; History
          </button>
          <button className={`dashboard-tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
            <FaUserCircle /> Profile
          </button>
        </div>

        <div className="tab-pane">
          <div className="officer-stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="officer-stat-card officer-stat-card--pending">
              <span className="officer-stat-card__label">Pending Queue Count</span>
              <span className="officer-stat-card__value">{pendingCount}</span>
            </div>
            <div className="officer-stat-card officer-stat-card--approved">
              <span className="officer-stat-card__label">Queue Disbursement Volume</span>
              <span className="officer-stat-card__value">₹{totalApprovedAmount.toLocaleString()}</span>
            </div>
            <div className="officer-stat-card officer-stat-card--total">
              <span className="officer-stat-card__label">Total Disbursed (All Time)</span>
              <span className="officer-stat-card__value">₹{totalDisbursedAmount.toLocaleString()}</span>
            </div>
          </div>

          {activeTab === 'queue' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <div className="pane-header">
                <h2>Pending Subsidy Sanctions &amp; Plans</h2>
                <p>Applications awaiting finance sanction determination or initial installment stage configuration.</p>
              </div>
              
              <div className="filter-bar">
                <div className="search-box">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by name, ID or scheme..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {filteredQueue.length === 0 ? (
                <div className="empty-state">
                  <p>No pending applications awaiting sanction or plan configuration.</p>
                </div>
              ) : (
                <div className="dbt-ledger-wrap">
                  <table className="dbt-ledger">
                    <thead>
                      <tr>
                        <th>Beneficiary Name</th>
                        <th>Scheme Name</th>
                        <th>Approved Amount</th>
                        <th>Application Status</th>
                        <th>Assigned Officer</th>
                        <th>Pending Date</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredQueue.map(app => {
                        const statusDisplay = getFinanceStatusDisplay(app)
                        const actionLabel = getActionButtonLabel(app)
                        return (
                          <tr key={app.id || app.applicationId}>
                            <td>{app.applicant || app.applicantName || '—'}</td>
                            <td>{app.schemeName || SCHEME_NAMES[app.schemeId] || app.schemeId || '—'}</td>
                            <td className="font-mono">₹{Number(app.amount || 0).toLocaleString()}</td>
                            <td>
                              <span className={`badge-status ${statusDisplay.badgeClass}`}>
                                {statusDisplay.label}
                              </span>
                            </td>
                            <td>{app.assignedOfficerName || '—'}</td>
                            <td className="font-mono">{app.submittedDate || '—'}</td>
                            <td>
                              <button onClick={() => openDisburseModal(app)} className="officer-view-btn">
                                {actionLabel}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'active_plans' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <div className="pane-header">
                <h2>Active Subsidy Disbursements</h2>
                <p>Track milestone completions, released disbursements, and schedule execution for approved beneficiaries.</p>
              </div>
              
              <div className="filter-bar">
                <div className="search-box">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search active disbursements by name, ID or scheme..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {filteredActivePlans.length === 0 ? (
                <div className="empty-state">
                  <p>No active disbursement plans found.</p>
                </div>
              ) : (
                <div className="dbt-ledger-wrap">
                  <table className="dbt-ledger">
                    <thead>
                      <tr>
                        <th>Beneficiary Name</th>
                        <th>Scheme Name</th>
                        <th>Sanctioned Amount</th>
                        <th>Disbursed So Far</th>
                        <th>Milestone Status</th>
                        <th>Assigned Officer</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredActivePlans.map(app => {
                        const statusDisplay = getFinanceStatusDisplay(app)
                        const actionLabel = getActionButtonLabel(app)
                        return (
                          <tr key={app.id || app.applicationId}>
                            <td>{app.applicant || app.applicantName || '—'}</td>
                            <td>{app.schemeName || SCHEME_NAMES[app.schemeId] || app.schemeId || '—'}</td>
                            <td className="font-mono">₹{Number(app.amount || 0).toLocaleString()}</td>
                            <td className="font-mono" style={{ color: '#2ecc71', fontWeight: 600 }}>
                              ₹{Number(app.disbursedAmount || 0).toLocaleString()}
                            </td>
                            <td>
                              <span className={`badge-status ${statusDisplay.badgeClass}`}>
                                {statusDisplay.label}
                              </span>
                            </td>
                            <td>{app.assignedOfficerName || '—'}</td>
                            <td>
                              <button onClick={() => openDisburseModal(app)} className="officer-view-btn">
                                {actionLabel}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <div className="pane-header">
                <h2>Direct Disbursement Logs</h2>
                <p>Audit trails of all Direct Benefit Transfer payouts cleared by the Finance department.</p>
              </div>
              {auditLogs.length === 0 ? (
                <div className="empty-state">
                  <p>No audit history records available yet.</p>
                </div>
              ) : (
                <div className="dbt-ledger-wrap">
                  <table className="dbt-ledger">
                    <thead>
                      <tr>
                        <th>Action</th>
                        <th>Performed By</th>
                        <th>Description</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log, index) => (
                        <tr key={index}>
                          <td style={{ fontWeight: 600, color: '#bb8fce' }}>{log.action}</td>
                          <td>{log.performedBy}</td>
                          <td className="text-soft">{log.description}</td>
                          <td className="font-mono text-soft">{log.timestamp}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}


          {activeTab === 'profile' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <ProfilePanel
                profile={officer}
                role={officer?.role || 'FINANCE_OFFICER'}
                editable={false}
                deletable={false}
                subtitle="Review the finance officer account details stored in the backend."
              />
            </motion.div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {selectedApp && (
          <div className="modal-overlay" onClick={() => setSelectedApp(null)} style={{ background: 'rgba(0,0,0,0.7)', zIndex: 1900 }}>
            <motion.div
              className="modal-panel"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '780px', width: '92%', maxHeight: '90vh', overflowY: 'auto', textAlign: 'left', background: 'var(--panel-strong)', border: '1px solid var(--border)' }}
            >
              <div className="tracking-card__header" style={{ marginBottom: '1.2rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.8rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem' }}>
                    {step === 'view_plan' ? 'Active Disbursement Plan' : step === 'suggest' ? 'Configure Disbursement Plan' : step === 'finalized' ? 'Disbursement Finalized' : 'Review & Sanction Application'}
                  </h3>
                  <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                    Application ID: {selectedApp.applicationCode || selectedApp.id || selectedApp.applicationId}
                  </span>
                </div>
                <span className={`badge-status ${getFinanceStatusDisplay(selectedApp).badgeClass}`}>
                  {getFinanceStatusDisplay(selectedApp).label.toUpperCase()}
                </span>
              </div>

              {modalLoading && step === 'approve' && !modalError && (
                <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--muted)', fontSize: '0.95rem' }}>
                  <div style={{ display: 'inline-block', width: '24px', height: '24px', border: '3px solid rgba(187,143,206,0.3)', borderTopColor: '#bb8fce', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '0.8rem' }}></div>
                  <div>Loading application context and checking disbursement plan...</div>
                </div>
              )}

              {(!modalLoading || modalError) && step === 'approve' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  {/* Beneficiary & Scheme Info Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                    {/* Beneficiary Details */}
                    <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem' }}>
                      <h4 style={{ margin: '0 0 0.8rem 0', fontSize: '0.95rem', color: '#bb8fce', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        👤 Beneficiary Information
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.85rem' }}>
                        <div><span style={{ color: 'var(--muted)' }}>Full Name:</span> <strong>{selectedApp.applicant || selectedApp.applicantName || '—'}</strong></div>
                        <div><span style={{ color: 'var(--muted)' }}>Contact Phone:</span> {selectedApp.phone || selectedApp.mobileNo || '—'}</div>
                        <div><span style={{ color: 'var(--muted)' }}>Location:</span> {selectedApp.district || '—'}, {selectedApp.state || '—'}</div>
                        <div>
                          <span style={{ color: 'var(--muted)' }}>Annual Income:</span>{' '}
                          <strong>
                            {selectedApp.annualIncome ? `₹${Number(selectedApp.annualIncome).toLocaleString()}` : (selectedApp.fields?.ANNUAL_INCOME || selectedApp.fields?.INCOME ? `₹${Number(selectedApp.fields.ANNUAL_INCOME || selectedApp.fields.INCOME).toLocaleString()}` : '—')}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Scheme Details */}
                    <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem' }}>
                      <h4 style={{ margin: '0 0 0.8rem 0', fontSize: '0.95rem', color: '#bb8fce', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        📋 Scheme Details
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.85rem' }}>
                        <div><span style={{ color: 'var(--muted)' }}>Scheme Code:</span> <strong>{selectedApp.schemeId || '—'}</strong></div>
                        <div><span style={{ color: 'var(--muted)' }}>Scheme Name:</span> {selectedApp.schemeName || SCHEME_NAMES[selectedApp.schemeId] || selectedApp.schemeId || '—'}</div>
                        <div><span style={{ color: 'var(--muted)' }}>Workflow Stage:</span> <span className="font-mono">{selectedApp.currentStage || 'FINANCE_OFFICER'}</span></div>
                        <div><span style={{ color: 'var(--muted)' }}>Submitted Date:</span> {selectedApp.submittedDate || '—'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Previous Verification & Field Inspection */}
                  <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem' }}>
                    <h4 style={{ margin: '0 0 0.8rem 0', fontSize: '0.95rem', color: '#bb8fce', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      🔍 Previous Verifications &amp; Inspection Reports
                    </h4>
                    
                    {inspectionContext && (inspectionContext.addressVerified != null || inspectionContext.lastSubmittedAt) ? (
                      <div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.8rem', marginBottom: '0.8rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                            <span style={{ color: inspectionContext.addressVerified ? '#2ecc71' : '#ff6b76', fontWeight: 'bold' }}>
                              {inspectionContext.addressVerified ? '✓' : '✕'}
                            </span>
                            Address Verified
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                            <span style={{ color: inspectionContext.businessActivityConfirmed ? '#2ecc71' : '#ff6b76', fontWeight: 'bold' }}>
                              {inspectionContext.businessActivityConfirmed ? '✓' : '✕'}
                            </span>
                            Business Activity Confirmed
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                            <span style={{ color: inspectionContext.assetsInspected ? '#2ecc71' : '#ff6b76', fontWeight: 'bold' }}>
                              {inspectionContext.assetsInspected ? '✓' : '✕'}
                            </span>
                            Assets Inspected
                          </div>
                        </div>

                        {inspectionContext.notes && (
                          <div style={{ marginBottom: '0.8rem' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                              Inspector Notes / Remarks
                            </div>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.6rem 0.8rem' }}>
                              {inspectionContext.notes}
                            </p>
                          </div>
                        )}

                        {inspectionContext.evidenceMediaIds?.length > 0 && (
                          <div style={{ marginBottom: '0.5rem' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                              Evidence Media ({inspectionContext.evidenceMediaIds.length})
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              {inspectionContext.evidenceMediaIds.map((id, idx) => (
                                <span key={idx} style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', background: 'rgba(187, 143, 206, 0.1)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-soft)' }}>
                                  📷 Media #{id}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {inspectionContext.lastSubmittedAt && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.4rem' }}>
                            Field inspection submitted on {new Date(inspectionContext.lastSubmittedAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>
                        {selectedApp.remarks ? `Officer Remarks: ${selectedApp.remarks}` : 'Field inspection report pending or not attached.'}
                      </p>
                    )}

                    {selectedApp.documents && selectedApp.documents.length > 0 && (
                      <div style={{ marginTop: '0.8rem', borderTop: '1px solid var(--border)', paddingTop: '0.8rem' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                          Verified Documents ({selectedApp.documents.length})
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {selectedApp.documents.map((doc, idx) => (
                            <a
                              key={idx}
                              href={doc.url}
                              target="_blank"
                              rel="noreferrer"
                              style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', background: 'rgba(52, 152, 219, 0.1)', border: '1px solid rgba(52, 152, 219, 0.3)', borderRadius: '4px', color: '#3498db', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                            >
                              📄 {doc.type?.replace(/_/g, ' ') || 'Document'} ↗
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Finance Sanction Section */}
                  <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem' }}>
                    <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '0.95rem', color: '#2ecc71', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      💰 Finance Sanction &amp; Subsidy Determination
                    </h4>
                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: 'var(--muted)' }}>
                      Determine the sanctioned subsidy amount and number of installments. The citizen does not request this amount.
                    </p>

                    <form onSubmit={handleApprove} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {modalError && (
                        <div style={{ color: '#ff6b76', background: 'rgba(220,53,69,0.1)', padding: '0.6rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                          ⚠️ {modalError}
                        </div>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                            Sanctioned Subsidy Amount (₹) <span style={{ color: '#ff6b76' }}>*</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            placeholder="e.g. 50000"
                            value={approvalForm.approvedAmount}
                            onChange={(e) => setApprovalForm({ ...approvalForm, approvedAmount: e.target.value })}
                            style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.75rem', color: 'var(--text)', outline: 'none' }}
                            required
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                            Number of Installments <span style={{ color: '#ff6b76' }}>*</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="12"
                            placeholder="e.g. 3"
                            value={approvalForm.numberOfInstallments}
                            onChange={(e) => setApprovalForm({ ...approvalForm, numberOfInstallments: e.target.value })}
                            style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.75rem', color: 'var(--text)', outline: 'none' }}
                            required
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                        <button type="button" className="button button--ghost" onClick={() => setSelectedApp(null)} disabled={modalLoading}>
                          Cancel
                        </button>
                        <button type="submit" className="button button--primary" disabled={modalLoading}>
                          {modalLoading ? 'Processing...' : 'Approve & Generate Plan'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {step === 'suggest' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  <p style={{ fontSize: '0.9rem', color: 'var(--muted)', margin: 0 }}>
                    Review and adjust the installment stages for the sanctioned amount of <strong>₹{totalAmount.toLocaleString()}</strong>.
                  </p>
                  
                  {modalError && (
                    <div style={{ color: '#ff6b76', background: 'rgba(220,53,69,0.1)', padding: '0.6rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                      ⚠️ {modalError}
                    </div>
                  )}

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid var(--border)' }}>Stage #</th>
                        <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid var(--border)' }}>Milestone Name</th>
                        <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid var(--border)' }}>Amount (₹)</th>
                        <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid var(--border)' }}>Due Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stages.map((stage, idx) => (
                        <tr key={idx}>
                          <td style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>{stage.stageNumber}</td>
                          <td style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
                            <input
                              type="text"
                              value={stage.milestoneName}
                              onChange={(e) => handleStageChange(idx, 'milestoneName', e.target.value)}
                              style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', padding: '6px 8px', borderRadius: '4px', color: 'var(--text)', outline: 'none' }}
                            />
                          </td>
                          <td style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
                            <input
                              type="number"
                              step="0.01"
                              value={stage.amountToRelease}
                              onChange={(e) => handleStageChange(idx, 'amountToRelease', e.target.value)}
                              style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', padding: '6px 8px', borderRadius: '4px', color: 'var(--text)', outline: 'none' }}
                            />
                          </td>
                          <td style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
                            <input
                              type="date"
                              value={stage.dueDate}
                              onChange={(e) => handleStageChange(idx, 'dueDate', e.target.value)}
                              style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', padding: '6px 8px', borderRadius: '4px', color: 'var(--text)', outline: 'none' }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Balance Validator Card */}
                  <div style={{
                    background: 'var(--panel)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '1rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: '1rem',
                    textAlign: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Sanctioned</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '0.2rem' }}>₹{totalAmount.toLocaleString()}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>Allocated Amount</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '0.2rem', color: isBalanced ? '#2ecc71' : '#bb8fce' }}>₹{runningTotal.toLocaleString()}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>Balance Remaining</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '0.2rem', color: isBalanced ? '#2ecc71' : '#ff6b76' }}>₹{balanceRemaining.toLocaleString()}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>Validation</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '0.2rem', color: isBalanced ? '#2ecc71' : '#ff6b76' }}>
                        {isBalanced ? '✓ Balanced' : '✕ Unbalanced'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                    <button type="button" className="button button--ghost" onClick={() => setSelectedApp(null)} disabled={modalLoading}>Cancel</button>
                    <button type="button" className="button button--primary" onClick={handleFinalize} disabled={modalLoading || !isBalanced}>
                      {modalLoading ? 'Processing...' : 'Finalize Disbursement Plan'}
                    </button>
                  </div>
                </div>
              )}

              {step === 'view_plan' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', textAlign: 'center' }}>
                    <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.8rem' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Sanctioned</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '0.2rem' }}>₹{totalAmount.toLocaleString()}</div>
                    </div>
                    <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.8rem' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>Released So Far</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '0.2rem', color: '#2ecc71' }}>
                        ₹{stages.filter(s => String(s.completionStatus || '').toUpperCase() === 'RELEASED').reduce((a, s) => a + Number(s.amountReleased || s.amountToRelease || 0), 0).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.8rem' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Stages</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '0.2rem' }}>{stages.length}</div>
                    </div>
                  </div>

                  {modalError && (
                    <div style={{ color: '#ff6b76', background: 'rgba(220,53,69,0.1)', padding: '0.6rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                      ⚠️ {modalError}
                    </div>
                  )}

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid var(--border)' }}>Stage</th>
                        <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid var(--border)' }}>Milestone</th>
                        <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid var(--border)' }}>Configured (₹)</th>
                        <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid var(--border)' }}>Released (₹)</th>
                        <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid var(--border)' }}>Status</th>
                        <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid var(--border)' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stages.map((stage) => {
                        const st = String(stage.completionStatus || '').toUpperCase()
                        const isReleased = st === 'RELEASED'
                        const isPending = st === 'PENDING' || st === ''
                        return (
                          <tr key={stage.milestoneId || stage.stageNumber}>
                            <td style={{ padding: '8px', borderBottom: '1px solid var(--border)', fontWeight: 700 }}>#{stage.stageNumber}</td>
                            <td style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>{stage.milestoneName || `Stage ${stage.stageNumber}`}</td>
                            <td style={{ padding: '8px', borderBottom: '1px solid var(--border)', fontFamily: 'monospace' }}>₹{Number(stage.amountToRelease || 0).toLocaleString()}</td>
                            <td style={{ padding: '8px', borderBottom: '1px solid var(--border)', fontFamily: 'monospace', color: isReleased ? '#2ecc71' : 'var(--muted)' }}>
                              {isReleased ? `₹${Number(stage.amountReleased || stage.amountToRelease || 0).toLocaleString()}` : '—'}
                            </td>
                            <td style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
                              <span className={`badge-status ${isReleased ? 'badge-status--eligible' : 'badge-status--applied'}`}>
                                {isReleased ? 'Released' : isPending ? 'Pending' : st}
                              </span>
                            </td>
                            <td style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
                              {isPending && (
                                <button
                                  className="officer-view-btn"
                                  disabled={modalLoading}
                                  onClick={() => handleReleaseMilestone(stage.milestoneId)}
                                  style={{ fontSize: '0.78rem', padding: '0.3rem 0.7rem' }}
                                >
                                  {modalLoading ? '...' : 'Release Funds'}
                                </button>
                              )}
                              {isReleased && <span style={{ color: '#2ecc71', fontSize: '0.82rem' }}>✓ Disbursed</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                    <button type="button" className="button button--ghost" onClick={() => setSelectedApp(null)}>Close</button>
                  </div>
                </div>
              )}

              {step === 'finalized' && (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <div style={{ color: '#2ecc71', fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
                  <h3 style={{ margin: '0 0 1rem' }}>Plan Finalized Successfully</h3>
                  <p style={{ color: 'var(--muted)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                    Stage 1 has been released — the beneficiary has received the first installment.
                    <br/><br/>
                    Subsequent installments will appear in Notifications once the beneficiary or officer completes each stage's compliance milestone.
                  </p>
                  <button type="button" className="button button--primary" onClick={() => setSelectedApp(null)} style={{ marginTop: '2rem' }}>
                    Close
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeMilestone && (
          <div className="modal-overlay" onClick={() => setActiveMilestone(null)} style={{ background: 'rgba(0,0,0,0.7)', zIndex: 1900 }}>
            <motion.div
              className="modal-panel"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '600px', width: '90%', textAlign: 'left', background: 'var(--panel-strong)', border: '1px solid var(--border)' }}
            >
              <div className="tracking-card__header" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.8rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Release Milestone Funds</h3>
                <span className="badge-status badge-status--eligible">READY TO RELEASE</span>
              </div>

              <div style={{ marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--muted)' }}>
                  <strong>Beneficiary:</strong> {activeMilestone.beneficiaryName}
                </p>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--muted)' }}>
                  <strong>Application Code:</strong> {activeMilestone.applicationCode}
                </p>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--muted)' }}>
                  <strong>Scheme:</strong> {activeMilestone.schemeName}
                </p>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--muted)' }}>
                  <strong>Stage:</strong> {activeMilestone.stageNumber} - {activeMilestone.milestoneName}
                </p>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--muted)' }}>
                  <strong>Amount:</strong> ₹{activeMilestone.amountToRelease.toLocaleString()}
                </p>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--muted)' }}>
                  <strong>Due Date:</strong> {activeMilestone.dueDate}
                </p>
              </div>

              <h4 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>Disbursement Plan Context</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '6px', borderBottom: '1px solid var(--border)' }}>Stage</th>
                    <th style={{ textAlign: 'left', padding: '6px', borderBottom: '1px solid var(--border)' }}>Name</th>
                    <th style={{ textAlign: 'left', padding: '6px', borderBottom: '1px solid var(--border)' }}>Amount</th>
                    <th style={{ textAlign: 'left', padding: '6px', borderBottom: '1px solid var(--border)' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activeMilestone.allMilestones.map(m => (
                    <tr key={m.milestoneId}>
                      <td style={{ padding: '6px', borderBottom: '1px solid var(--border)' }}>{m.stageNumber}</td>
                      <td style={{ padding: '6px', borderBottom: '1px solid var(--border)' }}>{m.milestoneName}</td>
                      <td style={{ padding: '6px', borderBottom: '1px solid var(--border)' }}>₹{m.amountToRelease.toLocaleString()}</td>
                      <td style={{ padding: '6px', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ 
                          padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold',
                          background: m.completionStatus === 'RELEASED' ? 'rgba(46, 204, 113, 0.2)' : 
                                      m.completionStatus === 'COMPLETED' ? 'rgba(52, 152, 219, 0.2)' : 
                                      'rgba(241, 196, 15, 0.2)',
                          color: m.completionStatus === 'RELEASED' ? '#2ecc71' : 
                                 m.completionStatus === 'COMPLETED' ? '#3498db' : 
                                 '#f1c40f'
                        }}>
                          {m.completionStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="button button--ghost" onClick={() => setActiveMilestone(null)} disabled={modalLoading}>Cancel</button>
                <button type="button" className="button button--primary" onClick={handleReleaseFromModal} disabled={modalLoading}>
                  {modalLoading ? 'Processing...' : `Release ₹${activeMilestone.amountToRelease.toLocaleString()} Now`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
