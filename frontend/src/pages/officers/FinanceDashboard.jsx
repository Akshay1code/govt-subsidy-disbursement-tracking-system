import '../../styles/Dashboard.css';
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ThemeToggle from '../../components/ThemeToggle'
import logo from '../../assets/icons/logo.png'
import api from '../../services/api'

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
          if (profileData.role !== 'FINANCE_OFFICER') {
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

      // Fetch applications from LocalStorage (or create defaults if empty)
      const storedApps = window.localStorage.getItem('gov-subsidy-officer-applications')
      let appsList = []
      if (storedApps) {
        appsList = JSON.parse(storedApps)
      } else {
        appsList = [
          {
            id: 'APP-1001',
            applicant: 'Ravi Kumar',
            email: 'ravi.kumar@example.in',
            phone: '9876501234',
            aadhaar: '4821-9930-1122',
            schemeId: 'pm-kisan',
            amount: 6000,
            annualIncome: '180000',
            submittedDate: '2025-01-12',
            status: 'Approved',
            assignedOfficerId: 'OFF001',
            assignedOfficerName: 'Anil Verma',
            remarks: 'Land records verified. Recommended for final payout.',
          },
          {
            id: 'APP-1002',
            applicant: 'Priya Nair',
            email: 'priya.nair@example.in',
            phone: '9812345678',
            aadhaar: '7712-8890-4521',
            schemeId: 'national-vidya',
            amount: 50000,
            annualIncome: '210000',
            submittedDate: '2025-01-15',
            status: 'Approved',
            assignedOfficerId: 'OFF002',
            assignedOfficerName: 'Dr. Sunita Sharma',
            remarks: 'Marksheets match requirements. Finalizing DBT.',
          },
          {
            id: 'APP-1004',
            applicant: 'Meena Devi',
            email: 'meena.devi@example.in',
            phone: '9765432109',
            aadhaar: '5561-2234-7788',
            schemeId: 'pm-kisan',
            amount: 6000,
            annualIncome: '150000',
            submittedDate: '2025-01-18',
            status: 'Pending',
            assignedOfficerId: 'OFF002',
            assignedOfficerName: 'Dr. Sunita Sharma',
            remarks: '',
          },
          {
            id: 'APP-1005',
            applicant: 'Arjun Reddy',
            email: 'arjun.reddy@example.in',
            phone: '9845098450',
            aadhaar: '9081-4521-3300',
            schemeId: 'pm-awas',
            amount: 250000,
            annualIncome: '320000',
            submittedDate: '2025-01-20',
            status: 'Approved',
            assignedOfficerId: 'OFF001',
            assignedOfficerName: 'Anil Verma',
            remarks: 'Verification complete. Home subsidy approved.',
          }
        ]
        window.localStorage.setItem('gov-subsidy-officer-applications', JSON.stringify(appsList))
      }
      setApplications(appsList)

      // Fetch audit logs from LocalStorage
      const storedLogs = window.localStorage.getItem('gov-subsidy-finance-audit-logs')
      if (storedLogs) {
        setAuditLogs(JSON.parse(storedLogs))
      } else {
        const defaultLogs = [
          {
            action: 'Disbursement Approved',
            performedBy: 'FIN007 - Finance Lead',
            description: 'Released ₹6,000 for APP-1001 (Ravi Kumar)',
            timestamp: '2025-02-01 10:24:15',
          },
          {
            action: 'Flagged Mismatch',
            performedBy: 'FIN007 - Finance Lead',
            description: 'Flagged APP-1003 due to name mismatch with Aadhaar records',
            timestamp: '2025-01-28 14:15:30',
          }
        ]
        window.localStorage.setItem('gov-subsidy-finance-audit-logs', JSON.stringify(defaultLogs))
        setAuditLogs(defaultLogs)
      }
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
    sessionStorage.removeItem('gov-subsidy-auth')
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
      window.localStorage.setItem('gov-subsidy-officer-applications', JSON.stringify(nextApps))

      // Sync beneficiary's tracking state in localStorage too
      const storedCitizenApps = window.localStorage.getItem('gov-subsidy-applications')
      if (storedCitizenApps && selectedApp.schemeId) {
        const citizenApps = JSON.parse(storedCitizenApps)
        if (citizenApps[selectedApp.schemeId]) {
          citizenApps[selectedApp.schemeId] = {
            ...citizenApps[selectedApp.schemeId],
            status: 'Disbursed',
            remarks: remarks || `Disbursed ₹${disbursedAmount} on ${disbursedDate}`
          }
          window.localStorage.setItem('gov-subsidy-applications', JSON.stringify(citizenApps))
        }
      }

      // 2. Append new audit history log
      const newAuditLog = {
        action: 'Direct Benefit Transfer (DBT)',
        performedBy: `${officer?.fullName || 'Finance Officer'} (ID: ${officer?.uniqueID || 'FIN007'})`,
        description: `Disbursed ₹${Number(disbursedAmount).toLocaleString()} for ${selectedApp.applicant || selectedApp.applicantName} (${appId})`,
        timestamp: new Date().toLocaleString(),
      }
      const nextLogs = [newAuditLog, ...auditLogs]
      setAuditLogs(nextLogs)
      window.localStorage.setItem('gov-subsidy-finance-audit-logs', JSON.stringify(nextLogs))

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

      {/* Topbar */}
      <header className="topbar" style={{ background: 'var(--panel-strong)', borderBottom: '1px solid var(--border)' }}>
        <div className="topbar__brand">
          <img src={logo} alt="GS Gov Subsidy Logo" className="brand-logo" />
          <div>
            <strong>GS Gov Subsidy</strong>
            <span>Finance &amp; Disbursement Officer Portal</span>
          </div>
        </div>

        <div className="topbar__user-info">
          <span className="user-badge" style={{ border: '1px solid #bb8fce50' }}>
            <span className="user-badge__dot" style={{ background: '#bb8fce' }}></span>
            {officer?.fullName} ({officer?.role === 'FINANCE_OFFICER' ? 'Finance Officer' : officer?.role})
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
            className={`dashboard-tab ${activeTab === 'queue' ? 'active' : ''}`}
            onClick={() => setActiveTab('queue')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            Pending Disbursement Queue
            {pendingCount > 0 && <span className="tab-badge" style={{ background: '#bb8fce', color: '#111' }}>{pendingCount}</span>}
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
        </div>

        <div className="tab-pane">
          {/* STATS OVERVIEW CARDS */}
          <div className="dashboard-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.2rem', marginBottom: '2rem' }}>
            <div className="metric-card" style={{ background: 'var(--panel-strong)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.2rem' }}>
              <span className="metric-card__label" style={{ color: 'var(--muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending Queue Count</span>
              <strong className="metric-card__val" style={{ display: 'block', fontSize: '2rem', marginTop: '0.4rem', color: '#f59e0b' }}>{pendingCount} Beneficiaries</strong>
            </div>
            <div className="metric-card" style={{ background: 'var(--panel-strong)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.2rem' }}>
              <span className="metric-card__label" style={{ color: 'var(--muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Queue Disbursement Volume</span>
              <strong className="metric-card__val" style={{ display: 'block', fontSize: '2rem', marginTop: '0.4rem', color: '#82aeca' }}>₹{totalApprovedAmount.toLocaleString()}</strong>
            </div>
            <div className="metric-card" style={{ background: 'var(--panel-strong)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.2rem' }}>
              <span className="metric-card__label" style={{ color: 'var(--muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Disbursed (All Time)</span>
              <strong className="metric-card__val" style={{ display: 'block', fontSize: '2rem', marginTop: '0.4rem', color: '#bb8fce' }}>₹{totalDisbursedAmount.toLocaleString()}</strong>
            </div>
          </div>

          {/* TAB 1: PENDING QUEUE */}
          {activeTab === 'queue' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <div className="pane-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.3rem', margin: 0 }}>Approved Subsidy Payout Queue</h2>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>Verify records and initiate Direct Benefit Transfers (DBT) for verified citizens.</p>
                </div>
                <div className="search-box" style={{ maxWidth: '300px' }}>
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
                <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--panel-strong)', border: '1px solid var(--border)', borderRadius: '10px' }}>
                  <p style={{ color: 'var(--muted)' }}>No pending approved applications found matching your criteria.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', background: 'var(--panel-strong)', border: '1px solid var(--border)', borderRadius: '10px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                        <th style={{ padding: '1rem 1.2rem', fontSize: '0.85rem', color: 'var(--muted)' }}>Beneficiary Name</th>
                        <th style={{ padding: '1rem 1.2rem', fontSize: '0.85rem', color: 'var(--muted)' }}>Scheme Name</th>
                        <th style={{ padding: '1rem 1.2rem', fontSize: '0.85rem', color: 'var(--muted)' }}>Approved Amount</th>
                        <th style={{ padding: '1rem 1.2rem', fontSize: '0.85rem', color: 'var(--muted)' }}>Application Status</th>
                        <th style={{ padding: '1rem 1.2rem', fontSize: '0.85rem', color: 'var(--muted)' }}>Assigned Officer</th>
                        <th style={{ padding: '1rem 1.2rem', fontSize: '0.85rem', color: 'var(--muted)' }}>Pending Date</th>
                        <th style={{ padding: '1rem 1.2rem', fontSize: '0.85rem', color: 'var(--muted)', textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredQueue.map(app => (
                        <tr key={app.id || app.applicationId} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '1.2rem', fontWeight: 600 }}>{app.applicant || app.applicantName}</td>
                          <td style={{ padding: '1.2rem' }}>{app.schemeName || SCHEME_NAMES[app.schemeId] || app.schemeId}</td>
                          <td style={{ padding: '1.2rem', fontFamily: 'monospace', fontWeight: 700 }}>₹{(app.amount || 0).toLocaleString()}</td>
                          <td style={{ padding: '1.2rem' }}>
                            <span className="badge-status badge-status--eligible">Approved</span>
                          </td>
                          <td style={{ padding: '1.2rem', color: 'var(--muted)', fontSize: '0.9rem' }}>{app.assignedOfficerName || 'Anil Verma'}</td>
                          <td style={{ padding: '1.2rem', color: 'var(--muted)', fontSize: '0.9rem' }}>{app.submittedDate || '—'}</td>
                          <td style={{ padding: '1.2rem', textAlign: 'center' }}>
                            <button
                              onClick={() => openDisburseModal(app)}
                              className="button button--secondary btn-apply"
                              style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', background: '#bb8fce22', color: '#bb8fce', border: '1px solid #bb8fce60' }}
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
              <div className="pane-header" style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.3rem', margin: 0 }}>Direct Disbursement Logs</h2>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>Audit trails of all Direct Benefit Transfer payouts cleared by the Finance department.</p>
              </div>

              {auditLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--panel-strong)', border: '1px solid var(--border)', borderRadius: '10px' }}>
                  <p style={{ color: 'var(--muted)' }}>No audit history records available yet.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', background: 'var(--panel-strong)', border: '1px solid var(--border)', borderRadius: '10px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                        <th style={{ padding: '1rem 1.2rem', fontSize: '0.85rem', color: 'var(--muted)' }}>Action</th>
                        <th style={{ padding: '1rem 1.2rem', fontSize: '0.85rem', color: 'var(--muted)' }}>Performed By</th>
                        <th style={{ padding: '1rem 1.2rem', fontSize: '0.85rem', color: 'var(--muted)' }}>Description</th>
                        <th style={{ padding: '1rem 1.2rem', fontSize: '0.85rem', color: 'var(--muted)' }}>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '1.2rem', fontWeight: 700, color: '#bb8fce' }}>
                            {log.action}
                          </td>
                          <td style={{ padding: '1.2rem', fontSize: '0.9rem' }}>{log.performedBy}</td>
                          <td style={{ padding: '1.2rem', color: 'var(--muted)', fontSize: '0.9rem' }}>{log.description}</td>
                          <td style={{ padding: '1.2rem', color: 'var(--muted)', fontSize: '0.9rem', fontFamily: 'monospace' }}>{log.timestamp}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
