import '../../styles/Dashboard.css';
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../services/api'
import { getMyApplications } from '../../services/officerService'
import { clearPortalSessionCaches } from '../../services/sessionCleanup'
import DashboardTopbar from '../../components/DashboardTopbar'
import ProfilePanel from '../../components/ProfilePanel'
import { FaUserCircle } from 'react-icons/fa'

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
  const [activeTab, setActiveTab] = useState('queue') // 'queue' | 'history'
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedApp, setSelectedApp] = useState(null)
  
  // Disbursement Form State
  const [disbursedAmount, setDisbursedAmount] = useState('')
  const [disbursedDate, setDisbursedDate] = useState('')
  const [remarks, setRemarks] = useState('')
  
  const [modalError, setModalError] = useState('')
  const [modalLoading, setModalLoading] = useState(false)
  const [toast, setToast] = useState(null)

  // Auth guard + fetch profile on mount
  useEffect(() => {
    async function init() {
      try {
        const res = await api.get('/gov/auth/profile/get')
        if (res.data && res.data.status !== false) {
          const profileData = res.data.data || res.data
          const allowedRoles = ['FINANCE_OFFICER', 'ADMIN', 'FIELD_OFFICER']
          if (!allowedRoles.includes(profileData.role?.toUpperCase())) {
            navigate('/login')
            return
          }
          setOfficer(profileData)
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

  // Filter Queue & History list
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

  // Aggregate statistics
  const totalApprovedAmount = queueApps.reduce((acc, curr) => acc + Number(curr.amount || 0), 0)
  const totalDisbursedAmount = disbursedApps.reduce((acc, curr) => acc + Number(curr.amount || 0), 0)
  const pendingCount = queueApps.length

  const openDisburseModal = (app) => {
    setSelectedApp(app)
    setDisbursedAmount(app.amount || '')
    setDisbursedDate(new Date().toISOString().substring(0, 10))
    setRemarks('')
    setModalError('')
  }

  const handleDisbursementSubmit = (e) => {
    e.preventDefault()

    if (!disbursedAmount || Number(disbursedAmount) <= 0) {
      setModalError('Disbursed Amount is required and must be greater than 0.')
      return
    }

    setModalLoading(true)

    // Simulate 1s network latency for disbursement clearance
    setTimeout(() => {
      const appId = selectedApp.id || selectedApp.applicationId

      // 1. Update status to 'Disbursed' in applications state & localstorage
      const nextApps = applications.map(app => {
        if ((app.id || app.applicationId) === appId) {
          return {
            ...app,
            status: 'Disbursed',
            disbursedAmount: Number(disbursedAmount),
            disbursedDate: disbursedDate || new Date().toLocaleDateString(),
            remarks: remarks || app.remarks
          }
        }
        return app
      })
      setApplications(nextApps)

      // 2. Append new audit history log
      const newAuditLog = {
        action: 'Direct Benefit Transfer (DBT)',
        performedBy: `${officer?.fullName || 'Finance Officer'} (ID: ${officer?.uniqueID || 'FIN007'})`,
        description: `Disbursed ₹${Number(disbursedAmount).toLocaleString()} for ${selectedApp.applicant || selectedApp.applicantName} (${appId})`,
        timestamp: new Date().toLocaleString(),
      }
      const nextLogs = [newAuditLog, ...auditLogs]
      setAuditLogs(nextLogs)

      setModalLoading(false)
      setSelectedApp(null)
      showToast(`Disbursement of ₹${Number(disbursedAmount).toLocaleString()} cleared successfully!`, 'success')
    }, 1000)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--muted)' }}>
        Loading Finance Module...
      </div>
    )
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
      />

      {/* Main Panel Content */}
      <main className="dashboard-main">
        {/* Navigation Tabs */}
        <div className="dashboard-tabs">
          <button
            className={`dashboard-tab ${activeTab === 'queue' ? 'active' : ''}`}
            onClick={() => setActiveTab('queue')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            Pending Disbursement Queue
            {pendingCount > 0 && <span className="tab-badge">{pendingCount}</span>}
          </button>
          <button
            className={`dashboard-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Finance Audit &amp; History
          </button>
          <button
            className={`dashboard-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <FaUserCircle /> Profile
          </button>
        </div>

        <div className="tab-pane">
          {/* STATS OVERVIEW CARDS */}
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

          {/* TAB 1: PENDING QUEUE */}
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
                          <td>
                            <span className="badge-status badge-status--eligible">Approved</span>
                          </td>
                          <td>{app.assignedOfficerName || 'Anil Verma'}</td>
                          <td className="font-mono">{app.submittedDate || '—'}</td>
                          <td>
                            <button
                              onClick={() => openDisburseModal(app)}
                              className="officer-view-btn"
                            >
                              Disburse
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

          {/* TAB 2: AUDIT & HISTORY */}
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
                          <td style={{ fontWeight: 600, color: '#bb8fce' }}>
                            {log.action}
                          </td>
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

      {/* DISBURSEMENT FORM MODAL */}
      <AnimatePresence>
        {selectedApp && (
          <div className="modal-overlay" onClick={() => setSelectedApp(null)} style={{ background: 'rgba(0,0,0,0.7)', zIndex: 1900 }}>
            <motion.div
              className="modal-panel"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '500px', textAlign: 'left', background: 'var(--panel-strong)', border: '1px solid var(--border)' }}
            >
              <div className="tracking-card__header" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.8rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>
                  Disburse Subsidy
                </h3>
                <span className="badge-status badge-status--eligible">APP APPROVED</span>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.88rem', color: 'var(--muted)' }}>
                  <strong>Beneficiary:</strong> {selectedApp.applicant || selectedApp.applicantName}
                </p>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.88rem', color: 'var(--muted)' }}>
                  <strong>Scheme:</strong> {selectedApp.schemeName || SCHEME_NAMES[selectedApp.schemeId] || selectedApp.schemeId}
                </p>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.88rem', color: 'var(--muted)' }}>
                  <strong>Approved Payout Amount:</strong> ₹{(selectedApp.amount || 0).toLocaleString()}
                </p>
              </div>

              <form onSubmit={handleDisbursementSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                {modalError && (
                  <div style={{ color: '#ff6b76', background: 'rgba(220,53,69,0.1)', padding: '0.6rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                    ⚠️ {modalError}
                  </div>
                )}

                {/* Disbursed Amount (Required) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label htmlFor="disbursedAmount" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    Disbursed Amount (₹) <span style={{ color: '#ff6b76' }}>*</span>
                  </label>
                  <input
                    id="disbursedAmount"
                    type="number"
                    placeholder="Enter payout amount"
                    value={disbursedAmount}
                    onChange={(e) => {
                      setDisbursedAmount(e.target.value)
                      setModalError('')
                    }}
                    style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.75rem', color: 'var(--text)', outline: 'none' }}
                    required
                  />
                </div>

                {/* Disbursed Date (Optional) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label htmlFor="disbursedDate" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    Disbursed Date (Optional)
                  </label>
                  <input
                    id="disbursedDate"
                    type="date"
                    value={disbursedDate}
                    onChange={(e) => setDisbursedDate(e.target.value)}
                    style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.75rem', color: 'var(--text)', outline: 'none' }}
                  />
                </div>

                {/* Remarks (Optional) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label htmlFor="remarks" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    Remarks / Audit Note (Optional)
                  </label>
                  <textarea
                    id="remarks"
                    placeholder="Enter audit logs or payout references..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows={3}
                    style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.75rem', color: 'var(--text)', outline: 'none', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() => setSelectedApp(null)}
                    disabled={modalLoading}
                    style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="button button--primary"
                    disabled={modalLoading}
                    style={{
                      padding: '0.6rem 1.2rem',
                      fontSize: '0.85rem',
                      background: modalLoading ? '#bb8fce50' : '#bb8fce',
                      color: '#111',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    {modalLoading && (
                      <span
                        style={{
                          width: '14px',
                          height: '14px',
                          border: '2px solid #111',
                          borderTopColor: 'transparent',
                          borderRadius: '50%',
                          display: 'inline-block',
                          animation: 'spin 0.8s linear infinite'
                        }}
                      />
                    )}
                    {modalLoading ? 'Processing DBT...' : 'Approve Disbursement'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Tiny embedded spinner animation style */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
