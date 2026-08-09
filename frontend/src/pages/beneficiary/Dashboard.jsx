import '../../styles/Dashboard.css';
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getSchemes as fetchSchemesFromAPI } from '../../services/schemeService'
import { getApplications } from '../../services/applicationService'
import ThemeToggle from '../../components/ThemeToggle'
import logo from '../../assets/icons/logo.png'
import api from '../../services/api'

function getApplicationStatus(app) {
  return String(app?.applicationStatus || app?.status || '').toUpperCase()
}

function isDraftStatus(status) {
  return status === 'DRAFT' || status === 'PENDING'
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

  const [profile, setProfile] = useState(null)
  const [schemes, setSchemes] = useState([])
  const [applications, setApplications] = useState([])
  const [activeTab, setActiveTab] = useState('schemes')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('')
  const [selectedApplication, setSelectedApplication] = useState(null)
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
        const res = await api.get('/gov/auth/profile/get')
        if (res.data && res.data.status !== false) {
          const profileData = res.data.data || res.data
          setProfile(profileData)
          setEditForm(profileData)
        } else {
          navigate('/login')
        }
      } catch {
        navigate('/login')
      } finally {
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

  const handleLogout = async () => {
    try {
      await api.post('/gov/auth/signout')
    } catch { /* silently ignore */ }
    navigate('/')
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    try {
      const res = await api.put('/gov/auth/profile/update', editForm)
      if (res.data.status) {
        setProfile(editForm)
        setIsEditing(false)
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

  const hasApplications = applications.length > 0
  const statusSteps = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED']

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

  const openTrackingDetails = (app) => {
    setSelectedApplication(app)
  }

  const closeTrackingDetails = () => {
    setSelectedApplication(null)
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
            My Applications
            {hasApplications && <span className="tab-badge">{applications.length}</span>}
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
                        <Link to={`/scheme/${scheme.schemeCode}`} className="btn-card-view btn-apply">
                          {(() => {
                            const appForScheme = applications.find(app => {
                              const appSchemeCode = app?.schemeCode || app?.schemeId || app?.scheme?.schemeCode
                              return appSchemeCode === scheme.schemeCode
                            })
                            const appStatus = getApplicationStatus(appForScheme)

                            if (!appForScheme) {
                              return 'View Scheme Details →'
                            }

                            return isDraftStatus(appStatus)
                              ? 'Continue Application'
                              : 'Track Application'
                          })()}
                        </Link>
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
                <h2>My Applications</h2>
                <p>Track the status of your submitted subsidy applications.</p>
              </div>

              {!hasApplications ? (
                <div className="tracking-empty-card">
                  <div className="tracking-empty-card__icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18M10 14l2 2 4-4" />
                    </svg>
                  </div>
                  <h3>No Applications Yet</h3>
                  <p>Browse the available schemes and submit an application to track it here.</p>
                  <button onClick={() => setActiveTab('schemes')} className="button button--primary btn-apply" style={{ marginTop: '1.2rem' }}>
                    Browse Schemes to Apply
                  </button>
                </div>
              ) : (
                <div className="tracking-list">
                  {applications.map(app => {
                    const appStatus = getApplicationStatus(app)

                    return (
                    <div
                      className="tracking-card tracking-card--clickable"
                      key={app.id || app.applicationId}
                      onClick={() => openTrackingDetails(app)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          openTrackingDetails(app)
                        }
                      }}
                    >
                      <div className="tracking-card__header">
                        <h4>{app.schemeName || app.schemeId}</h4>
                        <span className={`tracking-badge tracking-badge--${String(getApplicationStatus(app)).toLowerCase()}`}>
                          {getApplicationStatus(app) || 'DRAFT'}
                        </span>
                      </div>
                      <p className="tracking-card__summary">
                        {getStatusLabel(appStatus)}
                      </p>
                      <div className="tracking-card__meta">
                        <div>
                          <span className="meta-label">Submitted</span>
                          <span className="meta-value">{formatApplicationDate(app.submittedDate || app.createdAt)}</span>
                        </div>
                        <div>
                          <span className="meta-label">Application Code</span>
                          <span className="meta-value">{app.applicationCode || app.applicationId || '—'}</span>
                        </div>
                      </div>
                      <div className="tracking-card__footer">
                        <span>{getStatusHint(appStatus)}</span>
                        <span className="tracking-card__cta">View tracking status</span>
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

          {/* TAB 3: PROFILE MANAGEMENT */}
          {activeTab === 'profile' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="pane-header">
                <h2>Profile Management</h2>
                <p>Manage your demographic records and financial credentials.</p>
              </div>

              <div className="profile-container">
                <div className="profile-sidebar">
                  <div className="profile-avatar-card">
                    <div className="avatar-circle">
                      {profile.fullName?.charAt(0) || '?'}
                    </div>
                    <h3>{profile.fullName}</h3>
                    <p>{profile.email}</p>
                  </div>

                  <div className="profile-actions-panel">
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="btn-danger-outline"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      Delete Account
                    </button>
                  </div>
                </div>

                <div className="profile-form-card">
                  <div className="card-title-bar">
                    <h3>Profile Information</h3>
                    {!isEditing && (
                      <button onClick={() => setIsEditing(true)} className="btn-edit-toggle">
                        Edit Profile
                      </button>
                    )}
                  </div>

                  <form onSubmit={handleSaveProfile} className="profile-form">
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Full Name</label>
                        <input
                          type="text"
                          disabled={!isEditing}
                          value={editForm.fullName || ''}
                          onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                        />
                      </div>

                      <div className="form-group">
                        <label>Username</label>
                        <input
                          type="text"
                          disabled
                          value={editForm.username || ''}
                        />
                      </div>

                      <div className="form-group">
                        <label>Unique Code</label>
                        <input
                          type="text"
                          disabled
                          value={editForm.uniqueID || editForm.uniqueId || ''}
                        />
                      </div>

                      <div className="form-group">
                        <label>Mobile Number</label>
                        <input
                          type="text"
                          disabled={!isEditing}
                          value={editForm.mobileNo || ''}
                          onChange={(e) => setEditForm({ ...editForm, mobileNo: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        />
                      </div>

                      <div className="form-group">
                        <label>Region / Address</label>
                        <input
                          type="text"
                          disabled={!isEditing}
                          value={editForm.region || ''}
                          onChange={(e) => setEditForm({ ...editForm, region: e.target.value })}
                        />
                      </div>

                      <div className="form-group">
                        <label>District</label>
                        <input
                          type="text"
                          disabled={!isEditing}
                          value={editForm.district || ''}
                          onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
                        />
                      </div>

                      <div className="form-group">
                        <label>State</label>
                        <input
                          type="text"
                          disabled={!isEditing}
                          value={editForm.state || ''}
                          onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                        />
                      </div>
                    </div>

                    {isEditing && (
                      <div className="form-actions">
                        <button
                          type="button"
                          className="button button--ghost"
                          onClick={() => {
                            setEditForm(profile)
                            setIsEditing(false)
                          }}
                        >
                          Cancel
                        </button>
                        <button type="submit" className="button button--primary">
                          Save Changes
                        </button>
                      </div>
                    )}
                  </form>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {selectedApplication && (
          <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="tracking-details-title" onClick={closeTrackingDetails}>
            <motion.div
              className="modal-panel tracking-modal"
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="tracking-modal__header">
                <div>
                  <p className="console-eyebrow">Application tracking</p>
                  <h3 id="tracking-details-title">{selectedApplication.schemeName || selectedApplication.schemeId}</h3>
                </div>
                <button type="button" className="modal-close-btn" onClick={closeTrackingDetails} aria-label="Close tracking details">
                  ×
                </button>
              </div>

              <div className="tracking-modal__status">
                <span className={`tracking-badge tracking-badge--${String(getApplicationStatus(selectedApplication)).toLowerCase()}`}>
                  {getApplicationStatus(selectedApplication) || 'DRAFT'}
                </span>
                <p>{getStatusHint(getApplicationStatus(selectedApplication))}</p>
              </div>

              <div className="tracking-modal__grid">
                <div>
                  <span className="meta-label">Application Code</span>
                  <div className="meta-value">{selectedApplication.applicationCode || selectedApplication.applicationId || '—'}</div>
                </div>
                <div>
                  <span className="meta-label">Applicant</span>
                  <div className="meta-value">{selectedApplication.applicantName || selectedApplication.applicant || profile?.fullName || 'Beneficiary'}</div>
                </div>
                <div>
                  <span className="meta-label">Submitted On</span>
                  <div className="meta-value">{formatApplicationDate(selectedApplication.submittedDate || selectedApplication.createdAt)}</div>
                </div>
                <div>
                  <span className="meta-label">Phone</span>
                  <div className="meta-value">{selectedApplication.phone || profile?.mobileNo || '—'}</div>
                </div>
                <div>
                  <span className="meta-label">Aadhaar</span>
                  <div className="meta-value">{selectedApplication.aadhaar || '—'}</div>
                </div>
                <div>
                  <span className="meta-label">Annual Income</span>
                  <div className="meta-value">{selectedApplication.annualIncome || '—'}</div>
                </div>
              </div>

              <div className="tracking-timeline">
                {statusSteps.map((step) => {
                  const current = String(getApplicationStatus(selectedApplication)).toUpperCase()
                  const stepRank = statusSteps.indexOf(step)
                  const currentRank = statusSteps.indexOf(current)
                  const isCurrentOrPassed = currentRank >= stepRank
                  return (
                    <div className={`tracking-timeline__step ${isCurrentOrPassed ? 'is-active' : ''}`} key={step}>
                      <span className="tracking-timeline__dot" />
                      <div>
                        <strong>{step}</strong>
                        <p>
                          {step === 'DRAFT' && 'Saved application'}
                          {step === 'SUBMITTED' && 'Final submit completed'}
                          {step === 'UNDER_REVIEW' && 'Officer review'}
                          {step === 'APPROVED' && 'Approved for disbursement'}
                        </p>
                      </div>
                    </div>
                  )
                })}
                {String(getApplicationStatus(selectedApplication)).toUpperCase() === 'REJECTED' && (
                  <div className="tracking-timeline__rejected">
                    <strong>REJECTED</strong>
                    <p>This application was rejected during review.</p>
                  </div>
                )}
              </div>

              {selectedApplication.remarks && (
                <div className="tracking-modal__remarks">
                  <span className="meta-label">Officer remarks</span>
                  <p>{selectedApplication.remarks}</p>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="button button--ghost" onClick={closeTrackingDetails}>
                  Close
                </button>
                <button
                  type="button"
                  className="button button--primary"
                  onClick={() => {
                    closeTrackingDetails()
                    setActiveTab('schemes')
                  }}
                >
                  Browse Schemes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              <h3>âš ï¸ Permanently Delete Account?</h3>
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

