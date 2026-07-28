import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getSchemes, logOfficerAction } from '../data/schemes'
import ThemeToggle from '../components/ThemeToggle'

// Seed applications used the first time an officer logs in.
const SEED_APPLICATIONS = [
  {
    id: 'APP-1001',
    applicant: 'Ravi Kumar',
    email: 'ravi.kumar@example.in',
    phone: '9876501234',
    aadhaar: '4821-9930-1122',
    schemeId: 'pm-kisan',
    annualIncome: '180000',
    submittedDate: '2025-01-12',
    status: 'Pending',
    remarks: '',
    documents: [
      { name: 'Land Ownership Deed (7/12 Extract)', verified: false },
      { name: 'Aadhaar Card', verified: false },
      { name: 'Bank Passbook Photo', verified: false },
    ],
  },
  {
    id: 'APP-1002',
    applicant: 'Priya Nair',
    email: 'priya.nair@example.in',
    phone: '9812345678',
    aadhaar: '7712-8890-4521',
    schemeId: 'national-vidya',
    annualIncome: '210000',
    submittedDate: '2025-01-15',
    status: 'Approved',
    remarks: 'All documents verified. Eligible.',
    documents: [
      { name: 'Previous Year Marksheet', verified: true },
      { name: 'College Admission Fee Receipt', verified: true },
      { name: 'Aadhaar Card', verified: true },
      { name: 'Income Certificate', verified: true },
    ],
  },
  {
    id: 'APP-1003',
    applicant: 'Suresh Patel',
    email: 'suresh.patel@example.in',
    phone: '9900112233',
    aadhaar: '3391-1200-9087',
    schemeId: 'pm-awas',
    annualIncome: '540000',
    submittedDate: '2025-01-09',
    status: 'Rejected',
    remarks: 'Applicant already owns a permanent (Pucca) house.',
    documents: [
      { name: 'Income Certificate', verified: true },
      { name: 'Affidavit of No Pucca House', verified: false },
      { name: 'Aadhaar Card', verified: true },
      { name: 'Site Photo of Current Kutcha House', verified: false },
    ],
  },
  {
    id: 'APP-1004',
    applicant: 'Meena Devi',
    email: 'meena.devi@example.in',
    phone: '9765432109',
    aadhaar: '5561-2234-7788',
    schemeId: 'pm-kisan',
    annualIncome: '150000',
    submittedDate: '2025-01-18',
    status: 'Pending',
    remarks: '',
    documents: [
      { name: 'Land Ownership Deed (7/12 Extract)', verified: false },
      { name: 'Aadhaar Card', verified: true },
      { name: 'Bank Passbook Photo', verified: false },
    ],
  },
  {
    id: 'APP-1005',
    applicant: 'Arjun Reddy',
    email: 'arjun.reddy@example.in',
    phone: '9845098450',
    aadhaar: '9081-4521-3300',
    schemeId: 'pm-awas',
    annualIncome: '320000',
    submittedDate: '2025-01-20',
    status: 'Pending',
    remarks: '',
    documents: [
      { name: 'Income Certificate', verified: false },
      { name: 'Affidavit of No Pucca House', verified: false },
      { name: 'Aadhaar Card', verified: true },
      { name: 'Site Photo of Current Kutcha House', verified: false },
    ],
  },
  {
    id: 'APP-1006',
    applicant: 'Fatima Sheikh',
    email: 'fatima.sheikh@example.in',
    phone: '9711223344',
    aadhaar: '2201-9987-6543',
    schemeId: 'national-vidya',
    annualIncome: '260000',
    submittedDate: '2025-01-22',
    status: 'Approved',
    remarks: 'Scholarship sanctioned.',
    documents: [
      { name: 'Previous Year Marksheet', verified: true },
      { name: 'College Admission Fee Receipt', verified: true },
      { name: 'Aadhaar Card', verified: true },
      { name: 'Income Certificate', verified: true },
    ],
  },
]

const STORAGE_KEY = 'gov-subsidy-officer-applications'

const STATUS_BADGE = {
  Pending: 'badge-status--applied',
  Approved: 'badge-status--eligible',
  Rejected: 'badge-status--ineligible',
}

function getScheme(schemeId) {
  return getSchemes().find(s => s.id === schemeId)
}

export default function OfficerDashboard() {
  const navigate = useNavigate()

  const [officer] = useState(() => {
    const stored = window.localStorage.getItem('gov-subsidy-officer-profile')
    if (stored) return JSON.parse(stored)
    if (window.localStorage.getItem('gov-subsidy-officer-auth')) {
      return { fullName: 'Officer', designation: 'Subsidy Officer', officerId: 'OFF001' }
    }
    return null
  })
  const [applications, setApplications] = useState(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_APPLICATIONS))
    return SEED_APPLICATIONS
  })
  const [activeTab, setActiveTab] = useState('home')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [selectedApp, setSelectedApp] = useState(null)
  const [rejectMode, setRejectMode] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [toast, setToast] = useState(null)

  // Auth guard: redirect to officer login if not authenticated
  useEffect(() => {
    if (!window.localStorage.getItem('gov-subsidy-officer-auth')) {
      navigate('/officer/login')
    }
  }, [navigate])

  const persist = (next) => {
    setApplications(next)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleLogout = () => {
    window.localStorage.removeItem('gov-subsidy-officer-auth')
    navigate('/officer/login')
  }

  // Statistics
  const total = applications.length
  const pending = applications.filter(a => a.status === 'Pending').length
  const approved = applications.filter(a => a.status === 'Approved').length
  const rejected = applications.filter(a => a.status === 'Rejected').length
  const approvalRate = total ? Math.round((approved / total) * 100) : 0

  // Filtered list for Application Management
  const filteredApps = applications.filter(app => {
    const scheme = getScheme(app.schemeId)
    const schemeName = scheme ? scheme.name : ''
    const category = scheme ? scheme.category : ''
    const term = searchTerm.toLowerCase()
    const matchesSearch =
      app.applicant.toLowerCase().includes(term) ||
      app.id.toLowerCase().includes(term) ||
      schemeName.toLowerCase().includes(term)
    const matchesStatus = statusFilter === 'All' || app.status === statusFilter
    const matchesCategory = categoryFilter === 'All' || category === categoryFilter
    return matchesSearch && matchesStatus && matchesCategory
  })

  // Category distribution for reports
  const categories = ['Agriculture', 'Housing', 'Education', 'Healthcare']
  const categoryCounts = categories.map(cat => ({
    cat,
    count: applications.filter(a => {
      const s = getScheme(a.schemeId)
      return s && s.category === cat
    }).length,
  }))

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

  const toggleDocument = (docIndex) => {
    if (!selectedApp) return
    const doc = selectedApp.documents[docIndex]
    const nextVerified = !doc.verified
    const updatedApp = {
      ...selectedApp,
      documents: selectedApp.documents.map((doc, i) =>
        i === docIndex ? { ...doc, verified: !doc.verified } : doc
      ),
    }
    setSelectedApp(updatedApp)
    persist(applications.map(a => (a.id === updatedApp.id ? updatedApp : a)))

    // Log Officer Action
    logOfficerAction(
      officer?.officerId || 'OFF001',
      officer?.fullName || 'Anil Verma',
      nextVerified ? 'Verify Document' : 'Unverify Document',
      `${nextVerified ? 'Verified' : 'Unverified'} document "${doc.name}" for application ${selectedApp.id} (Applicant: ${selectedApp.applicant})`,
      selectedApp.id
    )
  }

  const decide = (status, remarks) => {
    if (!selectedApp) return
    const updatedApp = { ...selectedApp, status, remarks: remarks || selectedApp.remarks }
    persist(applications.map(a => (a.id === updatedApp.id ? updatedApp : a)))

    // Log Officer Action
    logOfficerAction(
      officer?.officerId || 'OFF001',
      officer?.fullName || 'Anil Verma',
      status === 'Approved' ? 'Approve Application' : 'Reject Application',
      `${status === 'Approved' ? 'Approved' : 'Rejected'} application ${selectedApp.id} for applicant ${selectedApp.applicant}. Remarks: ${remarks || 'None'}`,
      selectedApp.id
    )

    showToast(
      status === 'Approved'
        ? `Application ${updatedApp.id} approved.`
        : `Application ${updatedApp.id} rejected.`,
      status === 'Approved' ? 'success' : 'error'
    )
    closeModal()
  }

  const handleApprove = () => decide('Approved', 'Application approved by officer.')

  const handleReject = () => {
    if (!rejectReason.trim()) {
      showToast('Please provide a reason for rejection.', 'error')
      return
    }
    decide('Rejected', rejectReason.trim())
  }

  if (!officer) return null

  const selectedScheme = selectedApp ? getScheme(selectedApp.schemeId) : null

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
          <img src="/logo.png" alt="GS Gov Subsidy Logo" className="brand-logo" />
          <div>
            <strong>GS Gov Subsidy</strong>
            <span>Officer Portal</span>
          </div>
        </div>

        <div className="topbar__user-info">
          <span className="user-badge">
            <span className="user-badge__dot"></span>
            {officer.fullName} ({officer.designation})
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
        {/* Navigation Tabs */}
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
            Reports & Analytics
          </button>
        </div>

        <div className="tab-pane">
          {/* TAB 1: DASHBOARD HOME */}
          {activeTab === 'home' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="pane-header">
                <h2>Officer Dashboard</h2>
                <p>Monitor subsidy applications, verify documents, approve or reject requests, and review analytics.</p>
              </div>

              {/* Statistics Cards */}
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

              {/* Recent Applications */}
              <h3 className="section-title" style={{ marginTop: '2.5rem' }}>Recent Applications</h3>
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
                    {applications.slice(0, 5).map(app => {
                      const scheme = getScheme(app.schemeId)
                      return (
                        <tr key={app.id}>
                          <td className="font-mono text-soft">{app.id}</td>
                          <td>{app.applicant}</td>
                          <td>{scheme ? scheme.name : '—'}</td>
                          <td className="font-mono">{app.submittedDate}</td>
                          <td>
                            <span className={`badge-status ${STATUS_BADGE[app.status]}`}>{app.status}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: '1.5rem' }}>
                <button className="button button--primary" onClick={() => setActiveTab('applications')}>
                  Manage Applications
                </button>
              </div>
            </motion.div>
          )}

          {/* TAB 2: APPLICATION MANAGEMENT */}
          {activeTab === 'applications' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="pane-header">
                <h2>Application Management</h2>
                <p>Review submitted applications, verify uploaded documents, and approve or reject subsidy requests.</p>
              </div>

              {/* Search & Filters */}
              <div className="filter-bar">
                <div className="search-box">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by applicant, application ID or scheme..."
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

              <div className="category-chips" style={{ marginBottom: '1.5rem' }}>
                {['All', ...categories].map(cat => (
                  <button
                    key={cat}
                    className={`cat-chip ${categoryFilter === cat ? 'active' : ''}`}
                    onClick={() => setCategoryFilter(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Applications Table */}
              {filteredApps.length > 0 ? (
                <div className="dbt-ledger-wrap">
                  <table className="dbt-ledger">
                    <thead>
                      <tr>
                        <th>Application ID</th>
                        <th>Applicant</th>
                        <th>Scheme</th>
                        <th>Category</th>
                        <th>Submitted</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredApps.map(app => {
                        const scheme = getScheme(app.schemeId)
                        return (
                          <tr key={app.id}>
                            <td className="font-mono text-soft">{app.id}</td>
                            <td>{app.applicant}</td>
                            <td>{scheme ? scheme.name : '—'}</td>
                            <td>{scheme ? scheme.category : '—'}</td>
                            <td className="font-mono">{app.submittedDate}</td>
                            <td>
                              <span className={`badge-status ${STATUS_BADGE[app.status]}`}>{app.status}</span>
                            </td>
                            <td>
                              <button className="officer-view-btn" onClick={() => openApplication(app)}>
                                View
                              </button>
                            </td>
                          </tr>
                        )
                      })}
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
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="pane-header">
                <h2>Reports & Analytics</h2>
                <p>Application statistics, approval rates, and subsidy distribution across scheme categories.</p>
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

              <h3 className="section-title" style={{ marginTop: '2.5rem' }}>Distribution by Category</h3>
              <div className="report-bars">
                {categoryCounts.map(({ cat, count }) => {
                  const pct = total ? Math.round((count / total) * 100) : 0
                  return (
                    <div className="report-bar-row" key={cat}>
                      <span className="report-bar-row__label">{cat}</span>
                      <div className="report-bar-track">
                        <div className="report-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="report-bar-row__value">{count} ({pct}%)</span>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* Application Details / Verification Modal */}
      <AnimatePresence>
        {selectedApp && selectedScheme && (
          <div className="modal-overlay" onClick={closeModal}>
            <motion.div
              className="modal-panel"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '640px', textAlign: 'left' }}
            >
              <div className="tracking-card__header" style={{ marginBottom: '1.2rem' }}>
                <h3 style={{ margin: 0 }}>{selectedApp.id} · {selectedApp.applicant}</h3>
                <span className={`badge-status ${STATUS_BADGE[selectedApp.status]}`}>{selectedApp.status}</span>
              </div>

              {/* Applicant & Scheme details */}
              <div className="beneficiary-meta-card" style={{ marginBottom: '1.5rem' }}>
                <div className="meta-card__item">
                  <span className="meta-card__label">Scheme</span>
                  <span className="meta-card__val">{selectedScheme.name}</span>
                </div>
                <div className="meta-card__item">
                  <span className="meta-card__label">Category</span>
                  <span className="meta-card__val">{selectedScheme.category}</span>
                </div>
                <div className="meta-card__item">
                  <span className="meta-card__label">Subsidy Amount</span>
                  <span className="meta-card__val">{selectedScheme.amount}</span>
                </div>
                <div className="meta-card__item">
                  <span className="meta-card__label">Annual Income</span>
                  <span className="meta-card__val font-mono">₹{selectedApp.annualIncome}</span>
                </div>
                <div className="meta-card__item">
                  <span className="meta-card__label">Aadhaar</span>
                  <span className="meta-card__val font-mono">{selectedApp.aadhaar}</span>
                </div>
                <div className="meta-card__item">
                  <span className="meta-card__label">Contact</span>
                  <span className="meta-card__val font-mono">{selectedApp.phone}</span>
                </div>
              </div>

              {/* Document Verification */}
              <h3 className="section-title" style={{ fontSize: '1.1rem', marginTop: 0 }}>Document Verification</h3>
              <div className="doc-verify-list">
                {selectedApp.documents.map((doc, i) => (
                  <div className="doc-verify-row" key={i}>
                    <span className="doc-verify-row__name">
                      {doc.verified ? '✓ ' : '• '}{doc.name}
                    </span>
                    <button
                      className={`doc-verify-btn ${doc.verified ? 'is-verified' : ''}`}
                      onClick={() => toggleDocument(i)}
                    >
                      {doc.verified ? 'Verified' : 'Mark Verified'}
                    </button>
                  </div>
                ))}
              </div>

              {selectedApp.remarks && (
                <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginTop: '1rem' }}>
                  <strong>Remarks:</strong> {selectedApp.remarks}
                </p>
              )}

              {/* Reject reason input */}
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

              {/* Actions */}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', alignItems: 'center' }}>
                <button className="button button--ghost btn-apply" onClick={closeModal}>
                  Close
                </button>
                {selectedApp.status !== 'Rejected' && (
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
                {selectedApp.status !== 'Approved' && !rejectMode && (
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
