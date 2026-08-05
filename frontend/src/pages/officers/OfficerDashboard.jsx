import '../../styles/Dashboard.css';
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ThemeToggle from '../../components/ThemeToggle'
import logo from '../../assets/icons/logo.png'
import api from '../../services/api'
import { updateApprovalStatus } from '../../services/adminService'
import { getMyApplications } from '../../services/officerService'

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
    sessionStorage.removeItem('gov-subsidy-auth')
    navigate('/officer/login')
  }

  // Statistics
  const total = applications.length
  const pending = applications.filter(a => a.status === 'Pending' || a.status === 'PENDING').length
  const approved = applications.filter(a => a.status === 'Approved' || a.status === 'APPROVED').length
  const rejected = applications.filter(a => a.status === 'Rejected' || a.status === 'REJECTED').length
  const approvalRate = total ? Math.round((approved / total) * 100) : 0

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
        </div>

        <div className="tab-pane">
          {/* TAB 1: DASHBOARD HOME */}
          {activeTab === 'home' && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <div className="pane-header">
                <h2>Officer Dashboard</h2>
                <p>Monitor subsidy applications, verify documents, and approve or reject requests.</p>
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
    </div>
  )
}
