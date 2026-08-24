import '../../styles/Dashboard.css';
import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getSchemes as fetchSchemesFromAPI } from '../../services/schemeService'
import { getApplications } from '../../services/applicationService'
import { getCurrentBeneficiaryRecord } from '../../services/fundsService'
import { clearPortalSessionCaches } from '../../services/sessionCleanup'
import ProfilePanel from '../../components/ProfilePanel'
import logo from '../../assets/icons/logo.png'
import api from '../../services/api'

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
  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function Dashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const landingResolvedRef = useRef(false)

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

  // Toast handler
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Auth guard + fetch profile on mount
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

  // Fetch schemes from backend, using the selected category endpoint
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

  // Fetch applications from backend
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

  useEffect(() => {
    if (!location.state?.fromLogin) return
    if (landingResolvedRef.current) return
    if (!profile || applications.length === 0 || !beneficiaryLoaded) return

    if (!beneficiaryLoaded) {
      return
    }

    const hasAllocatedFunds = Number(beneficiaryRecord?.sanctionedAmount || 0) > 0
    const sanctionedApplicationId = beneficiaryRecord?.applicationId
    const sanctionedApplication = applications.find(app => (app.id || app.applicationId) === sanctionedApplicationId)

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

  if (loadingProfile) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--muted)' }}>
        Loading...
      </div>
    )
  }

  if (!profile) return null

  const filteredSchemes = schemes.filter(scheme => {
    const matchesSearch = scheme.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scheme.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || scheme.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const appliedSchemes = getUniqueAppliedSchemes(applications, schemes)
  const hasApplications = appliedSchemes.length > 0
  const fundedApplication = applications.find(app => {
    const appId = app.id || app.applicationId
    const isBeneficiaryMatch = beneficiaryRecord?.applicationId && appId === beneficiaryRecord.applicationId
    const isApprovedWithAmount = Number(app.amount || 0) > 0 && ['APPROVED', 'DISBURSED'].includes(String(app.status || '').toUpperCase())
    return isBeneficiaryMatch || isApprovedWithAmount
  })
  const fundedSchemeCode = fundedApplication ? getApplicationSchemeCode(fundedApplication) : ''
  const hasFundsAllocation = Number(beneficiaryRecord?.sanctionedAmount || 0) > 0 || Number(fundedApplication?.amount || 0) > 0
  const currentAllocated = Number(fundedApplication?.amount || beneficiaryRecord?.sanctionedAmount || 0)
  const currentDisbursed = Number(beneficiaryRecord?.disbursedAmount || 0)
  const currentRemaining = Math.max(0, currentAllocated - currentDisbursed)

  const getStatusLabel = (status) => {
    switch (String(status || '').toUpperCase()) {
      case 'DRAFT':
      case 'PENDING':
        return 'Application started'
      case 'SUBMITTED':
        return 'Application submitted'
      case 'UNDER_REVIEW':
        return 'Under review'
      case 'APPROVED':
        return 'Approved'
      case 'REJECTED':
        return 'Rejected'
      case 'DISBURSED':
        return 'Disbursed'
      default:
        return 'Status unavailable'
    }
  }

  const getStatusHint = (status) => {
    switch (String(status || '').toUpperCase()) {
      case 'DRAFT':
      case 'PENDING':
        return 'Your application is saved but not yet final submitted.'
      case 'SUBMITTED':
        return 'The application has been finalized and sent for review.'
      case 'UNDER_REVIEW':
        return 'The officer team is checking your submission.'
      case 'APPROVED':
        return 'The application has cleared review.'
      case 'REJECTED':
        return 'The application was rejected after review.'
      case 'DISBURSED':
        return 'Funds have been released for this application.'
      default:
        return 'Please open the details panel for more information.'
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
            <span>Portal Dashboard</span>
          </div>
        </div>

        <div className="topbar__user-info">
          <span className="user-badge">
            <span className="user-badge__dot"></span>
            {profile?.fullName || 'Beneficiary'}
          </span>
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
            className={`dashboard-tab ${activeTab === 'schemes' ? 'active' : ''}`}
            onClick={() => setActiveTab('schemes')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            Available Schemes
          </button>
          <button
            className={`dashboard-tab ${activeTab === 'tracking' ? 'active' : ''}`}
            onClick={() => setActiveTab('tracking')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
            My Schemes
            {hasApplications && <span className="tab-badge">{appliedSchemes.length}</span>}
          </button>
          <button
            className={`dashboard-tab ${activeTab === 'funds' ? 'active' : ''}`}
            onClick={() => setActiveTab('funds')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            Funds Tracker
            {hasFundsAllocation && <span className="tab-badge">1</span>}
          </button>
          <button
            className={`dashboard-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Profile Management
          </button>
        </div>

        <div className="tab-pane">
          {/* TAB 1: SCHEMES LIST */}
          {activeTab === 'schemes' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="pane-header">
                <h2>Browse Government Schemes</h2>
                <p>View eligibility requirements and submit online applications for subsidies directly processed through DBTs.</p>
              </div>

              {/* Filters & Search */}
              <div className="filter-bar">
                <div className="search-box">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search schemes by name or keywords..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="category-chips">
                  {['All', 'Agriculture', 'Housing', 'Education', 'Healthcare'].map(cat => (
                    <button
                      key={cat}
                      className={`cat-chip ${selectedCategory === cat ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Schemes Grid */}
              {loadingSchemes ? (
                <div className="empty-state"><p>Loading schemes...</p></div>
              ) : filteredSchemes.length > 0 ? (
                <div className="schemes-grid">
                  {filteredSchemes.map(scheme => (
                    <motion.div
                      className="scheme-card"
                      key={scheme.schemeCode}
                      whileHover={{ y: -4 }}
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

                          if (!appForScheme) {
                            return (
                              <Link to={`/scheme/${scheme.schemeCode}`} className="btn-card-view btn-apply">
                                View Scheme Details →
                              </Link>
                            )
                          }

                          if (isDraftStatus(appStatus)) {
                            return (
                              <Link to={`/scheme/${scheme.schemeCode}`} className="btn-card-view btn-apply">
                                Continue Application
                              </Link>
                            )
                          }

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

          {/* TAB 2: MY APPLICATIONS */}
          {activeTab === 'tracking' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="pane-header">
                <h2>My Schemes</h2>
                <p>Review the schemes you have applied for and open any one to see the latest application details.</p>
              </div>

              {!hasApplications ? (
                <div className="tracking-empty-state">
                  <div className="tracking-empty-card">
                    <div className="tracking-empty-card__icon">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <path d="M16 2v4M8 2v4M3 10h18M10 14l2 2 4-4" />
                      </svg>
                    </div>
                    <h3>No Schemes Yet</h3>
                    <p>Once you apply for a scheme, it will appear here with the current application status and details.</p>
                    <button onClick={() => setActiveTab('schemes')} className="button button--primary btn-apply" style={{ marginTop: '1.2rem' }}>
                      Browse Schemes
                    </button>
                  </div>

                  <div className="section__heading section__heading--compact" style={{ marginTop: '1.75rem' }}>
                    <h3 style={{ margin: 0 }}>Available schemes you can apply for</h3>
                    <p style={{ marginTop: '0.35rem' }}>Open any scheme to review eligibility and submit your application.</p>
                  </div>

                  <div className="schemes-grid" style={{ marginTop: '1rem' }}>
                    {schemes.slice(0, 4).map(scheme => (
                      <motion.div
                        className="scheme-card"
                        key={scheme.schemeCode}
                        whileHover={{ y: -4 }}
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
                        <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: '0.65rem' }}>
                          Remarks: {app.remarks}
                        </p>
                      )}
                    </div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 3: FUNDS TRACKER */}
          {activeTab === 'funds' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="pane-header">
                <h2>Funds Tracker</h2>
                <p>See your current funds utilization and jump into the detailed disbursement timeline.</p>
              </div>

              {!hasFundsAllocation || !fundedSchemeCode ? (
                <div className="tracking-empty-state">
                  <div className="tracking-empty-card">
                    <div className="tracking-empty-card__icon">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                    </div>
                    <h3>No allocated funds yet</h3>
                    <p>You can browse schemes and apply first. Once a beneficiary record is created, this tracker will show your funds here.</p>
                    <button onClick={() => setActiveTab('schemes')} className="button button--primary btn-apply" style={{ marginTop: '1.2rem' }}>
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
                <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
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

          {/* TAB 3: PROFILE MANAGEMENT */}
          {activeTab === 'profile' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
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
        </div>
      </main>

      {/* Account Deletion Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="modal-overlay">
            <motion.div
              className="modal-panel modal-panel--danger"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <h3>Permanently Delete Account?</h3>
              <p className="danger-text">
                This action is irreversible. Your account and all associated data will be permanently deleted from the system.
              </p>

              <div className="delete-confirm-box">
                <label>To confirm, type <strong>DELETE</strong> in the box below:</label>
                <input
                  type="text"
                  placeholder="Type DELETE"
                  value={deleteConfirmInput}
                  onChange={(e) => setDeleteConfirmInput(e.target.value)}
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

