import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getSchemes, checkEligibility } from '../data/schemes'
import ThemeToggle from '../components/ThemeToggle'

export default function Dashboard() {
  const navigate = useNavigate()
  const SCHEMES = getSchemes()
  
  // State variables
  const [profile, setProfile] = useState(() => {
    const stored = window.localStorage.getItem('gov-subsidy-profile')
    return stored ? JSON.parse(stored) : null
  })
  const [applications, setApplications] = useState(() => {
    const storedProfile = window.localStorage.getItem('gov-subsidy-profile')
    const profileObj = storedProfile ? JSON.parse(storedProfile) : null
    const localAppsStored = window.localStorage.getItem('gov-subsidy-applications')
    const localApps = localAppsStored ? JSON.parse(localAppsStored) : {}
    
    if (profileObj && profileObj.aadhaar) {
      const officerAppsStored = window.localStorage.getItem('gov-subsidy-officer-applications')
      const officerApps = officerAppsStored ? JSON.parse(officerAppsStored) : []
      
      const syncedApps = { ...localApps }
      let updated = false
      
      officerApps.forEach(app => {
        if (app.aadhaar === profileObj.aadhaar) {
          const prevApp = syncedApps[app.schemeId] || {}
          // Map status: Pending -> Applied
          const mappedStatus = app.status === 'Pending' ? 'Applied' : app.status
          if (prevApp.status !== mappedStatus || prevApp.remarks !== app.remarks) {
            syncedApps[app.schemeId] = {
              ...prevApp,
              status: mappedStatus,
              remarks: app.remarks,
              appliedDate: app.submittedDate || prevApp.appliedDate || new Date().toLocaleDateString()
            }
            updated = true
          }
        }
      })
      if (updated) {
        window.localStorage.setItem('gov-subsidy-applications', JSON.stringify(syncedApps))
      }
      return syncedApps
    }
    return localApps
  })
  const [activeTab, setActiveTab] = useState('schemes')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState(() => {
    const stored = window.localStorage.getItem('gov-subsidy-profile')
    return stored ? JSON.parse(stored) : {}
  })
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('')
  const [toast, setToast] = useState(null)

  // Redirect to login if the session is not authenticated
  useEffect(() => {
    if (!window.localStorage.getItem('gov-subsidy-auth')) {
      navigate('/login')
    }
  }, [navigate])

  // Toast handler
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Handle Logout
  const handleLogout = () => {
    window.localStorage.removeItem('gov-subsidy-auth')
    navigate('/')
  }

  // Save profile edits
  const handleSaveProfile = (e) => {
    e.preventDefault()

    // Validations
    if (!editForm.fullName || !editForm.email || !editForm.phone) {
      showToast('Please fill out all required fields', 'error')
      return
    }

    const cleanPhone = (editForm.phone || '').replace(/\D/g, '')
    if (cleanPhone.length !== 10) {
      showToast('Phone number must contain exactly 10 digits', 'error')
      return
    }

    if (editForm.aadhaar) {
      const cleanAadhaar = editForm.aadhaar.replace(/\D/g, '')
      if (cleanAadhaar.length !== 12) {
        showToast('Aadhaar number must contain exactly 12 digits', 'error')
        return
      }
    }

    window.localStorage.setItem('gov-subsidy-profile', JSON.stringify(editForm))
    setProfile(editForm)
    setIsEditing(false)
    showToast('Profile updated. Scheme eligibility recalculated!')
  }

  // Handle account deletion
  const handleDeleteAccount = () => {
    if (deleteConfirmInput.toLowerCase() !== 'delete') {
      showToast('Please type DELETE to confirm', 'error')
      return
    }

    window.localStorage.removeItem('gov-subsidy-auth')
    window.localStorage.removeItem('gov-subsidy-profile')
    window.localStorage.removeItem('gov-subsidy-applications')
    
    setShowDeleteModal(false)
    alert('Your Gov Subsidy account and all tracking details have been permanently deleted.')
    navigate('/')
  }

  if (!profile) return null

  // Filter schemes
  const filteredSchemes = SCHEMES.filter(scheme => {
    const matchesSearch = scheme.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          scheme.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || scheme.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Has any active/applied eligible schemes
  const appliedSchemeIds = Object.keys(applications)
  const hasApplications = appliedSchemeIds.length > 0

  const isProfileIncomplete = !profile.annualIncome || !profile.aadhaar || !profile.bankName

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
            <span>Portal Dashboard</span>
          </div>
        </div>

        <div className="topbar__user-info">
          <span className="user-badge">
            <span className="user-badge__dot"></span>
            {profile?.fullName || 'Beneficiary'} ({profile?.occupation || 'Citizen'})
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
            My Subsidy Tracking
            {hasApplications && <span className="tab-badge">{appliedSchemeIds.length}</span>}
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

        {/* Tab Content rendering */}
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

              {isProfileIncomplete && (
                <div className="eligibility-warning" style={{ background: 'rgba(217, 130, 43, 0.08)', border: '1px solid rgba(217, 130, 43, 0.25)', padding: '1.2rem', borderRadius: '16px', color: '#ffaa5e', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', textAlign: 'left' }}>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>⚠️ Eligibility Setup Required</h4>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-soft)', lineHeight: 1.5 }}>
                    Your subsidy profile is currently empty. You can set up your credentials (annual income, land ownership, Aadhaar, and bank account) in the <strong>Profile Management</strong> tab, or they will be automatically updated and saved when you fill out any scheme's application form.
                  </p>
                </div>
              )}

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
              <div className="schemes-grid">
                {filteredSchemes.length > 0 ? (
                  filteredSchemes.map(scheme => {
                    const app = applications[scheme.id]
                    const eligibility = checkEligibility(scheme, profile)
                    
                    return (
                      <motion.div 
                        className="scheme-card" 
                        key={scheme.id}
                        whileHover={{ y: -4 }}
                      >
                        <div className="scheme-card__header">
                          <span className={`scheme-card__category category--${scheme.category.toLowerCase()}`}>
                            {scheme.category}
                          </span>
                          
                          {/* Eligibility / Application Status Badge */}
                          {app ? (
                            <span className="badge-status badge-status--applied">Applied</span>
                          ) : isProfileIncomplete ? (
                            <span className="badge-status badge-status--incomplete" style={{ background: 'rgba(217, 130, 43, 0.12)', color: '#ffb66c' }}>Details Pending</span>
                          ) : eligibility.eligible ? (
                            <span className="badge-status badge-status--eligible">Eligible</span>
                          ) : (
                            <span className="badge-status badge-status--ineligible">Not Eligible</span>
                          )}
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

                        {!isProfileIncomplete && !eligibility.eligible && !app && (
                          <div className="eligibility-warning">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" />
                              <line x1="12" y1="8" x2="12" y2="12" />
                              <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            {eligibility.reasons[0]}
                          </div>
                        )}

                        <div className="scheme-card__actions">
                          <Link to={`/scheme/${scheme.id}`} className="btn-card-view btn-apply">
                            {app ? 'Track Application' : isProfileIncomplete ? 'Setup & Apply →' : 'View Scheme Details →'}
                          </Link>
                        </div>
                      </motion.div>
                    )
                  })
                ) : (
                  <div className="empty-state">
                    <h3>No schemes match your criteria</h3>
                    <p>Try refining your search terms or selecting another category filter.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 2: MY TRACKING (BENEFICIARY DETAILS) */}
          {activeTab === 'tracking' && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="pane-header">
                <h2>Beneficiary Tracking Center</h2>
                <p>Monitor your active subsidy applications, verification statuses, and historical Direct Benefit Transfers (DBTs).</p>
              </div>

              {/* Implement: "Don't show beneficiary details until they are eligible/applied for a scheme." */}
              {!hasApplications ? (
                <div className="tracking-empty-card">
                  <div className="tracking-empty-card__icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18M10 14l2 2 4-4" />
                    </svg>
                  </div>
                  <h3>No Active Beneficiary Profile Found</h3>
                  <p>
                    Beneficiary details and disbursement ledgers are hidden until you successfully apply 
                    or qualify for at least one government subsidy program.
                  </p>
                  <button onClick={() => setActiveTab('schemes')} className="button button--primary btn-apply" style={{ marginTop: '1.2rem' }}>
                    Browse Schemes to Apply
                  </button>
                </div>
              ) : (
                <div className="tracking-container">
                  {/* Beneficiary Card Summary */}
                  <div className="beneficiary-meta-card">
                    <div className="meta-card__item">
                      <span className="meta-card__label">Beneficiary ID</span>
                      <span className="meta-card__val font-mono">BEN-SHARMA-{profile.aadhaar.slice(-4)}</span>
                    </div>
                    <div className="meta-card__item">
                      <span className="meta-card__label">Bank Credited</span>
                      <span className="meta-card__val">{profile.bankName} (A/C ****{profile.accountNumber.slice(-4)})</span>
                    </div>
                    <div className="meta-card__item">
                      <span className="meta-card__label">Verification Status</span>
                      <span className="meta-card__val text-secondary flex-align">
                        <span className="badge-dot-green"></span> Active / Verified
                      </span>
                    </div>
                  </div>

                  {/* Active Scheme Trackers */}
                  <h3 className="section-title">Active Applications & Progress</h3>
                  <div className="tracking-list">
                    {appliedSchemeIds.map(schemeId => {
                      const scheme = SCHEMES.find(s => s.id === schemeId)
                      const app = applications[schemeId]
                      if (!scheme) return null

                      // Render timeline
                      const steps = [
                        { label: 'Application Submitted', status: 'completed', desc: `Submitted on ${app.appliedDate}` },
                        { label: 'Document Review', status: app.status === 'Applied' ? 'active' : 'completed', desc: 'Simulated quality scan passed.' },
                        { label: 'Field Inspection', status: app.status === 'Applied' ? 'pending' : 'completed', desc: 'Officer verification.' },
                        { label: 'Bank Verification', status: app.status === 'Applied' ? 'pending' : 'completed', desc: 'Account link validation.' },
                        { label: 'Disbursed', status: app.status === 'Disbursed' ? 'completed' : 'pending', desc: 'Direct benefit transfer.' }
                      ]

                      return (
                        <div className="tracking-card" key={schemeId}>
                          <div className="tracking-card__header">
                            <h4>{scheme.name}</h4>
                            <span className={`tracking-badge tracking-badge--${app.status.toLowerCase()}`}>
                              {app.status}
                            </span>
                          </div>

                          {/* Progress Tracker Timeline */}
                          <div className="timeline-horizontal">
                            {steps.map((step, idx) => (
                              <div className={`timeline-node ${step.status}`} key={idx}>
                                <div className="timeline-node__dot">
                                  {step.status === 'completed' && '✓'}
                                </div>
                                <div className="timeline-node__label">{step.label}</div>
                                <div className="timeline-node__desc">{step.desc}</div>
                              </div>
                            ))}
                          </div>

                          {/* Action to expedite or inspect */}
                          <div className="tracking-card__footer">
                            <Link to={`/scheme/${scheme.id}`} className="btn-track-action">
                              Inspect Scanning Logs & Details
                            </Link>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Direct Benefit Transfer (DBT) Ledger */}
                  <h3 className="section-title" style={{ marginTop: '2.5rem' }}>Direct Benefit Transfer (DBT) Ledger</h3>
                  <div className="dbt-ledger-wrap">
                    <table className="dbt-ledger">
                      <thead>
                        <tr>
                          <th>Transaction Date</th>
                          <th>Scheme Name</th>
                          <th>Disbursement Amount</th>
                          <th>Reference ID</th>
                          <th>Recipient Account</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {appliedSchemeIds.map((schemeId, index) => {
                          const scheme = SCHEMES.find(s => s.id === schemeId)
                          const app = applications[schemeId]
                          if (!scheme) return null
                          
                          // Mocking past transactions for demonstration if disbursed
                          const isDisbursed = app.status === 'Disbursed'

                          return (
                            <tr key={schemeId}>
                              <td>{app.appliedDate}</td>
                              <td>{scheme.name}</td>
                              <td className="amount font-mono">{scheme.amount.split(' ')[0]}</td>
                              <td className="font-mono text-soft">TXN-{91823908 + index}</td>
                              <td className="font-mono">{profile.bankName} (****{profile.accountNumber.slice(-4)})</td>
                              <td>
                                <span className={`txn-status txn-status--${isDisbursed ? 'success' : 'pending'}`}>
                                  {isDisbursed ? 'Successful' : 'Processing'}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 3: PROFILE MANAGEMENT (EDIT, DELETE ACCOUNT) */}
          {activeTab === 'profile' && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="pane-header">
                <h2>Profile Management</h2>
                <p>Manage your demographic records, occupation listings, and financial credentials to auto-calculate subsidy eligibility.</p>
              </div>

              <div className="profile-container">
                <div className="profile-sidebar">
                  <div className="profile-avatar-card">
                    <div className="avatar-circle">
                      {profile.fullName.charAt(0)}
                    </div>
                    <h3>{profile.fullName}</h3>
                    <p>{profile.email}</p>
                    <span className="profile-occup-badge">{profile.occupation}</span>
                  </div>

                  <div className="profile-actions-panel">
                    <button 
                      onClick={() => setShowDeleteModal(true)}
                      className="btn-danger-outline"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                      Delete Profile Account
                    </button>
                  </div>
                </div>

                <div className="profile-form-card">
                  <div className="card-title-bar">
                    <h3>Demographics & Subsidy Credentials</h3>
                    {!isEditing && (
                      <button onClick={() => setIsEditing(true)} className="btn-edit-toggle">
                        Edit Credentials
                      </button>
                    )}
                  </div>

                  <form onSubmit={handleSaveProfile} className="profile-form">
                    <div className="form-grid">
                      {/* Name */}
                      <div className="form-group">
                        <label>Full Name</label>
                        <input 
                          type="text" 
                          disabled={!isEditing} 
                          value={editForm.fullName || ''}
                          onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                        />
                      </div>

                      {/* Username (Locked) */}
                      <div className="form-group">
                        <label>Portal Username</label>
                        <input 
                          type="text" 
                          disabled 
                          value={editForm.username || ''}
                        />
                      </div>

                      {/* Email */}
                      <div className="form-group">
                        <label>Email Address</label>
                        <input 
                          type="email" 
                          disabled={!isEditing} 
                          value={editForm.email || ''}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        />
                      </div>

                      {/* Phone */}
                      <div className="form-group">
                        <label>Mobile Number (10 Digits)</label>
                        <input 
                          type="text"
                          maxLength={10} 
                          placeholder="10-digit mobile number"
                          disabled={!isEditing} 
                          value={editForm.phone || ''}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        />
                      </div>

                      {/* Occupation */}
                      <div className="form-group">
                        <label>Primary Occupation</label>
                        <select 
                          disabled={!isEditing}
                          value={editForm.occupation || 'Farmer'}
                          onChange={(e) => setEditForm({ ...editForm, occupation: e.target.value })}
                        >
                          <option value="Farmer">Farmer / Cultivator</option>
                          <option value="Student">Student / Academic</option>
                          <option value="Unemployed">Unemployed</option>
                          <option value="Salaried">Salaried Employee</option>
                        </select>
                      </div>

                      {/* Annual Income */}
                      <div className="form-group">
                        <label>Annual Family Income (₹)</label>
                        <input 
                          type="number" 
                          disabled={!isEditing} 
                          value={editForm.annualIncome || ''}
                          onChange={(e) => setEditForm({ ...editForm, annualIncome: e.target.value })}
                        />
                      </div>

                      {/* Land Holding */}
                      <div className="form-group">
                        <label>Agricultural Land Owned (Acres)</label>
                        <input 
                          type="number" 
                          step="0.1" 
                          disabled={!isEditing} 
                          value={editForm.landHolding || ''}
                          onChange={(e) => setEditForm({ ...editForm, landHolding: e.target.value })}
                        />
                      </div>

                      {/* State */}
                      <div className="form-group">
                        <label>State of Residence</label>
                        <input 
                          type="text" 
                          disabled={!isEditing} 
                          value={editForm.state || ''}
                          onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                        />
                      </div>

                      {/* Aadhaar */}
                      <div className="form-group">
                        <label>Aadhaar Identity Card Number (12 Digits)</label>
                        <input 
                          type="text" 
                          maxLength={12}
                          placeholder="12-digit Aadhaar number"
                          disabled={!isEditing} 
                          value={editForm.aadhaar || ''}
                          onChange={(e) => setEditForm({ ...editForm, aadhaar: e.target.value.replace(/\D/g, '').slice(0, 12) })}
                        />
                      </div>

                      {/* Bank Name */}
                      <div className="form-group">
                        <label>Direct Disbursement Bank Name</label>
                        <input 
                          type="text" 
                          disabled={!isEditing} 
                          value={editForm.bankName || ''}
                          onChange={(e) => setEditForm({ ...editForm, bankName: e.target.value })}
                        />
                      </div>

                      {/* Account Number */}
                      <div className="form-group">
                        <label>Bank Account Number</label>
                        <input 
                          type="text" 
                          disabled={!isEditing} 
                          value={editForm.accountNumber || ''}
                          onChange={(e) => setEditForm({ ...editForm, accountNumber: e.target.value })}
                        />
                      </div>

                      {/* IFSC Code */}
                      <div className="form-group">
                        <label>IFSC Code</label>
                        <input 
                          type="text" 
                          disabled={!isEditing} 
                          value={editForm.ifsc || ''}
                          onChange={(e) => setEditForm({ ...editForm, ifsc: e.target.value })}
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
                          Cancel Changes
                        </button>
                        <button type="submit" className="button button--primary">
                          Save Credentials
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
              <h3>⚠️ Permanently Delete Account?</h3>
              <p className="danger-text">
                Warning: This action is irreversible. All of your submitted applications, 
                verification history, scanning diagnostics, and disbursement records will be 
                purged from local storage.
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
