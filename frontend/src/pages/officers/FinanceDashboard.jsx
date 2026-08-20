import '../../styles/Dashboard.css';
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../services/api'
import { getMyApplications } from '../../services/officerService'
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

  const [notifications, setNotifications] = useState([])
  const [activeMilestone, setActiveMilestone] = useState(null)
  const [showNotifications, setShowNotifications] = useState(false)
  
  const [modalError, setModalError] = useState('')
  const [modalLoading, setModalLoading] = useState(false)
  const [toast, setToast] = useState(null)

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

      try {
        const data = await getMyApplications()
        setApplications(Array.isArray(data) ? data : data?.data || [])
      } catch (err) {
        console.error('Failed to load applications:', err.message)
      }
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

  const queueApps = applications.filter(app => app.status === 'Approved' || app.status === 'APPROVED')
  const disbursedApps = applications.filter(app => app.status === 'Disbursed' || app.status === 'DISBURSED')

  const filteredQueue = queueApps.filter(app => {
    const term = searchTerm.toLowerCase()
    return (
      (app.applicant || app.applicantName || '').toLowerCase().includes(term) ||
      (app.id || app.applicationId || '').toLowerCase().includes(term) ||
      (app.schemeName || SCHEME_NAMES[app.schemeId] || '').toLowerCase().includes(term)
    )
  })

  const totalApprovedAmount = queueApps.reduce((acc, curr) => acc + Number(curr.amount || 0), 0)
  const totalDisbursedAmount = disbursedApps.reduce((acc, curr) => acc + Number(curr.amount || 0), 0)
  const pendingCount = queueApps.length

  const openDisburseModal = (app) => {
    setSelectedApp(app)
    setApprovalForm({ approvedAmount: app.amount || '', numberOfInstallments: '' })
    setStep('approve')
    setPlanId(null)
    setStages([])
    setTotalAmount(0)
    setModalError('')
  }

  async function handleApprove(e) {
    e.preventDefault()
    setModalLoading(true)
    setModalError('')
    try {
      const appId = selectedApp.id || selectedApp.applicationId
      await approveWithInstallments(
        appId,
        Number(approvalForm.approvedAmount),
        Number(approvalForm.numberOfInstallments)
      )
      const plan = await getDisbursementPlanByApplicationId(appId)
      setPlanId(plan.planId)
      setTotalAmount(plan.totalAmount)
      const suggestion = await suggestStages(plan.planId)
      setStages(suggestion.suggestedStages)
      setStep('suggest')
    } catch (err) {
      setModalError(err.response?.data?.message || err.message)
    } finally {
      setModalLoading(false)
    }
  }

  async function handleFinalize() {
    setModalLoading(true)
    try {
      await configurePlan(planId, stages)
      setStep('finalized')
      
      const appId = selectedApp.id || selectedApp.applicationId
      const nextApps = applications.map(app => 
        (app.id || app.applicationId) === appId ? { ...app, status: 'Disbursed' } : app
      )
      setApplications(nextApps)
    } catch (err) {
      setModalError(err.response?.data?.message || err.message)
    } finally {
      setModalLoading(false)
    }
  }

  const runningTotal = stages.reduce((sum, s) => sum + Number(s.amountToRelease || 0), 0)
  const isBalanced = Math.abs(runningTotal - totalAmount) < 0.01

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
                <h2>Approved Subsidy Payout Queue</h2>
                <p>Verify records and initiate Direct Benefit Transfers (DBT) for verified citizens.</p>
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
                  <p>No pending approved applications found matching your criteria.</p>
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
                      {filteredQueue.map(app => (
                        <tr key={app.id || app.applicationId}>
                          <td>{app.applicant || app.applicantName}</td>
                          <td>{app.schemeName || SCHEME_NAMES[app.schemeId] || app.schemeId}</td>
                          <td className="font-mono">₹{(app.amount || 0).toLocaleString()}</td>
                          <td><span className="badge-status badge-status--eligible">Approved</span></td>
                          <td>{app.assignedOfficerName || 'Anil Verma'}</td>
                          <td className="font-mono">{app.submittedDate || '—'}</td>
                          <td>
                            <button onClick={() => openDisburseModal(app)} className="officer-view-btn">
                              Configure
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
              style={{ maxWidth: '600px', width: '90%', textAlign: 'left', background: 'var(--panel-strong)', border: '1px solid var(--border)' }}
            >
              <div className="tracking-card__header" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.8rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Configure Disbursement Plan</h3>
                <span className="badge-status badge-status--eligible">APP APPROVED</span>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.88rem', color: 'var(--muted)' }}>
                  <strong>Beneficiary:</strong> {selectedApp.applicant || selectedApp.applicantName}
                </p>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.88rem', color: 'var(--muted)' }}>
                  <strong>Scheme:</strong> {selectedApp.schemeName || SCHEME_NAMES[selectedApp.schemeId] || selectedApp.schemeId}
                </p>
              </div>

              {step === 'approve' && (
                <form onSubmit={handleApprove} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  {modalError && (
                    <div style={{ color: '#ff6b76', background: 'rgba(220,53,69,0.1)', padding: '0.6rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                      ⚠️ {modalError}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Approved Amount (₹) <span style={{ color: '#ff6b76' }}>*</span></label>
                    <input
                      type="number"
                      value={approvalForm.approvedAmount}
                      onChange={(e) => setApprovalForm({ ...approvalForm, approvedAmount: e.target.value })}
                      style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.75rem', color: 'var(--text)', outline: 'none' }}
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Number of Installments <span style={{ color: '#ff6b76' }}>*</span></label>
                    <input
                      type="number"
                      value={approvalForm.numberOfInstallments}
                      onChange={(e) => setApprovalForm({ ...approvalForm, numberOfInstallments: e.target.value })}
                      style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.75rem', color: 'var(--text)', outline: 'none' }}
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                    <button type="button" className="button button--ghost" onClick={() => setSelectedApp(null)} disabled={modalLoading}>Cancel</button>
                    <button type="submit" className="button button--primary" disabled={modalLoading}>
                      {modalLoading ? 'Processing...' : 'Submit'}
                    </button>
                  </div>
                </form>
              )}

              {step === 'suggest' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  <p style={{ fontSize: '0.9rem' }}>Based on the decimal values came and finalise the adjustments.</p>
                  
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
                              style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', padding: '4px', color: 'var(--text)', outline: 'none' }}
                            />
                          </td>
                          <td style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
                            <input
                              type="number"
                              step="0.01"
                              value={stage.amountToRelease}
                              onChange={(e) => handleStageChange(idx, 'amountToRelease', e.target.value)}
                              style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', padding: '4px', color: 'var(--text)', outline: 'none' }}
                            />
                          </td>
                          <td style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
                            <input
                              type="date"
                              value={stage.dueDate}
                              onChange={(e) => handleStageChange(idx, 'dueDate', e.target.value)}
                              style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', padding: '4px', color: 'var(--text)', outline: 'none' }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.9rem' }}>
                      Running Total: <span style={{ color: isBalanced ? '#2ecc71' : '#ff6b76', fontWeight: 'bold' }}>₹{runningTotal.toFixed(2)}</span> / ₹{totalAmount.toFixed(2)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                    <button type="button" className="button button--ghost" onClick={() => setSelectedApp(null)} disabled={modalLoading}>Cancel</button>
                    <button type="button" className="button button--primary" onClick={handleFinalize} disabled={modalLoading || !isBalanced}>
                      {modalLoading ? 'Processing...' : 'Finalize Disbursement Plan'}
                    </button>
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
