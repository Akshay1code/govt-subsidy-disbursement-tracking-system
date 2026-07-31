import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getSchemes, saveSchemes } from '../data/schemes'
import ThemeToggle from '../components/ThemeToggle'

// Seed applications used by default if none in localStorage
const INITIAL_APPLICATIONS = [
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
    status: 'Pending',
    assignedOfficerId: 'OFF001',
    assignedOfficerName: 'Anil Verma',
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
    amount: 50000,
    annualIncome: '210000',
    submittedDate: '2025-01-15',
    status: 'Approved',
    assignedOfficerId: 'OFF002',
    assignedOfficerName: 'Dr. Sunita Sharma',
    remarks: 'All documents verified. Sanctioned.',
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
    amount: 250000,
    annualIncome: '540000',
    submittedDate: '2025-01-09',
    status: 'Rejected',
    assignedOfficerId: 'OFF001',
    assignedOfficerName: 'Anil Verma',
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
    amount: 6000,
    annualIncome: '150000',
    submittedDate: '2025-01-18',
    status: 'Pending',
    assignedOfficerId: 'OFF002',
    assignedOfficerName: 'Dr. Sunita Sharma',
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
    amount: 250000,
    annualIncome: '320000',
    submittedDate: '2025-01-20',
    status: 'Pending',
    assignedOfficerId: 'OFF001',
    assignedOfficerName: 'Anil Verma',
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
    amount: 50000,
    annualIncome: '260000',
    submittedDate: '2025-01-22',
    status: 'Approved',
    assignedOfficerId: 'OFF002',
    assignedOfficerName: 'Dr. Sunita Sharma',
    remarks: 'Scholarship sanctioned after document verification.',
    documents: [
      { name: 'Previous Year Marksheet', verified: true },
      { name: 'College Admission Fee Receipt', verified: true },
      { name: 'Aadhaar Card', verified: true },
      { name: 'Income Certificate', verified: true },
    ],
  },
]

const DEFAULT_OFFICERS = [
  {
    officerId: 'OFF001',
    fullName: 'Anil Verma',
    designation: 'District Officer',
    department: 'Agriculture & Farmers Welfare',
    district: 'North Delhi',
    email: 'anil.verma@gov.in'
  },
  {
    officerId: 'OFF002',
    fullName: 'Dr. Sunita Sharma',
    designation: 'Financial Officer',
    department: 'Education & Youth Welfare',
    district: 'Pune',
    email: 'sunita.sharma@gov.in'
  },
  {
    officerId: 'OFF003',
    fullName: 'Rajesh Gupta',
    designation: 'Field Officer',
    department: 'Housing & Urban Affairs',
    district: 'Lucknow',
    email: 'rajesh.gupta@gov.in'
  }
]

export default function AdminDashboard() {
  const navigate = useNavigate()

  // Auth guard: redirect to admin login if not authenticated
  useEffect(() => {
    if (!window.localStorage.getItem('gov-subsidy-admin-auth')) {
      navigate('/admin/login')
    }
  }, [navigate])

  const handleLogout = () => {
    window.localStorage.removeItem('gov-subsidy-admin-auth')
    window.localStorage.removeItem('gov-subsidy-admin-profile')
    navigate('/admin/login')
  }

  // Load schemes state
  const [schemes, setSchemes] = useState(() => getSchemes())
  const [actionLogs, setActionLogs] = useState([])
  const [showSchemeModal, setShowSchemeModal] = useState(false)
  const [editingScheme, setEditingScheme] = useState(null)
  
  // Scheme Form State
  const [schemeForm, setSchemeForm] = useState({
    id: '',
    name: '',
    category: 'Agriculture',
    amount: '',
    description: '',
    eligibilityText: '',
    maxIncome: 300000,
    allowedOccupations: 'Farmer',
    maxLandHolding: 5,
    processingTime: '15-20 Days',
    requiredDocs: 'Land Ownership Deed (7/12 Extract), Aadhaar Card, Bank Passbook Photo'
  })

  // Log filter State
  const [logSearch, setLogSearch] = useState('')
  const [logActionFilter, setLogActionFilter] = useState('All')
  const [logOfficerFilter, setLogOfficerFilter] = useState('All')

  // Load applications from localStorage or seed
  const [applications, setApplications] = useState(() => {
    const stored = window.localStorage.getItem('gov-subsidy-officer-applications')
    if (stored) return JSON.parse(stored)
    window.localStorage.setItem('gov-subsidy-officer-applications', JSON.stringify(INITIAL_APPLICATIONS))
    return INITIAL_APPLICATIONS
  })

  // Load registered officers + defaults
  const [officers, setOfficers] = useState(() => {
    const stored = window.localStorage.getItem('gov-subsidy-officers')
    const registered = stored ? JSON.parse(stored) : []
    
    // Combine defaults and registered uniquely by officerId
    const combined = [...DEFAULT_OFFICERS]
    registered.forEach(reg => {
      if (!combined.some(o => o.officerId.toUpperCase() === reg.officerId.toUpperCase())) {
        combined.push(reg)
      }
    })
    return combined
  })

  // Load Queries from landing page submission
  const [queries, setQueries] = useState(() => {
    const stored = window.localStorage.getItem('gov-subsidy-queries')
    if (stored) return JSON.parse(stored)
    const seedQueries = [
      {
        id: 'QRY-892103',
        name: 'Ramesh Patel',
        email: 'ramesh.p@example.com',
        phone: '9820192831',
        subject: 'PM-Kisan Installment Disbursement Status',
        message: 'I applied for PM-Kisan 3 weeks ago. When will the installment be credited to my bank account?',
        status: 'Open',
        submittedAt: '2025-01-20 14:32'
      },
      {
        id: 'QRY-441209',
        name: 'Ananya Roy',
        email: 'ananya.roy@example.com',
        phone: '9711823910',
        subject: 'National Vidya Scholarship Marksheet Resubmission',
        message: 'My mark sheet scan was requested again. I have re-uploaded a fresh scan. Please update application status.',
        status: 'In Progress',
        submittedAt: '2025-01-21 11:15'
      }
    ]
    window.localStorage.setItem('gov-subsidy-queries', JSON.stringify(seedQueries))
    return seedQueries
  })

  // View state
  const [activeTab, setActiveTab] = useState('analytics') // 'analytics' | 'history' | 'officers' | 'queries'
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [officerFilter, setOfficerFilter] = useState('All')
  const [selectedApp, setSelectedApp] = useState(null)
  const [selectedOfficer, setSelectedOfficer] = useState(null)
  const [selectedQuery, setSelectedQuery] = useState(null)
  const [queryReplyText, setQueryReplyText] = useState('')
  const [reassignApp, setReassignApp] = useState(null)
  const [targetOfficerId, setTargetOfficerId] = useState('')
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Load Action Logs when needed
  useEffect(() => {
    if (activeTab === 'action-logs') {
      const storedLogs = window.localStorage.getItem('gov-subsidy-officer-actions')
      setActionLogs(storedLogs ? JSON.parse(storedLogs) : [])
    }
  }, [activeTab])

  // Scheme CRUD Handlers
  function openCreateScheme() {
    setEditingScheme(null)
    setSchemeForm({
      id: '',
      name: '',
      category: 'Agriculture',
      amount: '',
      description: '',
      eligibilityText: '',
      maxIncome: 300000,
      allowedOccupations: 'Farmer',
      maxLandHolding: 5,
      processingTime: '15-20 Days',
      requiredDocs: 'Land Ownership Deed (7/12 Extract), Aadhaar Card, Bank Passbook Photo'
    })
    setShowSchemeModal(true)
  }

  function openEditScheme(scheme) {
    setEditingScheme(scheme)
    setSchemeForm({
      id: scheme.id,
      name: scheme.name,
      category: scheme.category,
      amount: scheme.amount,
      description: scheme.description,
      eligibilityText: scheme.eligibilityText,
      maxIncome: scheme.maxIncome || 300000,
      allowedOccupations: Array.isArray(scheme.allowedOccupations) ? scheme.allowedOccupations.join(', ') : scheme.allowedOccupations,
      maxLandHolding: scheme.maxLandHolding || 5,
      processingTime: scheme.processingTime || '15-20 Days',
      requiredDocs: Array.isArray(scheme.requiredDocs) ? scheme.requiredDocs.join(', ') : scheme.requiredDocs
    })
    setShowSchemeModal(true)
  }

  function handleSaveScheme(e) {
    e.preventDefault()
    if (!schemeForm.id || !schemeForm.name || !schemeForm.amount) {
      showToast('Please fill out Scheme ID, Name, and Amount', 'error')
      return
    }

    const processedScheme = {
      id: schemeForm.id.toLowerCase().replace(/\s+/g, '-'),
      name: schemeForm.name,
      category: schemeForm.category,
      amount: schemeForm.amount,
      description: schemeForm.description,
      eligibilityText: schemeForm.eligibilityText,
      maxIncome: Number(schemeForm.maxIncome),
      allowedOccupations: schemeForm.allowedOccupations.split(',').map(s => s.trim()).filter(Boolean),
      maxLandHolding: Number(schemeForm.maxLandHolding),
      processingTime: schemeForm.processingTime,
      requiredDocs: schemeForm.requiredDocs.split(',').map(s => s.trim()).filter(Boolean),
      natureDetails: [
        { label: 'Category Nodal Division', value: `${schemeForm.category} Department` },
        { label: 'SLA Duration', value: schemeForm.processingTime }
      ],
      natureInputs: [
        { name: 'detailsNotes', label: 'Additional Declaration Notes', type: 'text', placeholder: 'Any extra details', required: false }
      ]
    }

    let nextSchemes
    if (editingScheme) {
      nextSchemes = schemes.map(s => s.id === editingScheme.id ? processedScheme : s)
      showToast(`Scheme "${processedScheme.name}" updated successfully!`)
    } else {
      if (schemes.some(s => s.id === processedScheme.id)) {
        showToast(`Scheme ID "${processedScheme.id}" already exists!`, 'error')
        return
      }
      nextSchemes = [...schemes, processedScheme]
      showToast(`Scheme "${processedScheme.name}" created successfully!`)
    }

    setSchemes(nextSchemes)
    saveSchemes(nextSchemes)
    setShowSchemeModal(false)
  }

  function handleDeleteScheme(schemeId) {
    if (window.confirm('Are you sure you want to delete this scheme? This will prevent citizens from applying.')) {
      const nextSchemes = schemes.filter(s => s.id !== schemeId)
      setSchemes(nextSchemes)
      saveSchemes(nextSchemes)
      showToast('Scheme deleted successfully!')
    }
  }

  // Action Logs Filters
  const filteredLogs = actionLogs.filter(log => {
    const matchesSearch = log.details.toLowerCase().includes(logSearch.toLowerCase()) ||
                          log.id.toLowerCase().includes(logSearch.toLowerCase()) ||
                          log.targetId.toLowerCase().includes(logSearch.toLowerCase())
    const matchesAction = logActionFilter === 'All' || log.action === logActionFilter
    const matchesOfficer = logOfficerFilter === 'All' || log.officerId === logOfficerFilter
    return matchesSearch && matchesAction && matchesOfficer
  })

  // Calculate high-level analytics
  const totalApps = applications.length
  const pendingApps = applications.filter(a => a.status === 'Pending').length
  const approvedApps = applications.filter(a => a.status === 'Approved').length
  const rejectedApps = applications.filter(a => a.status === 'Rejected').length

  const totalFundsDisbursed = applications
    .filter(a => a.status === 'Approved')
    .reduce((sum, a) => {
      const scheme = schemes.find(s => s.id === a.schemeId)
      // Extract number from amount e.g. 6000 or 50000 or scheme monetary value
      return sum + (a.amount || (scheme ? parseInt(scheme.amount.replace(/[^0-9]/g, '')) || 10000 : 10000))
    }, 0)

  // Filtered applications for History tab
  const filteredApps = applications.filter(app => {
    const matchesSearch =
      app.applicant.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.aadhaar.includes(searchTerm)

    const matchesStatus = statusFilter === 'All' || app.status === statusFilter
    const matchesOfficer = officerFilter === 'All' || app.assignedOfficerId === officerFilter

    return matchesSearch && matchesStatus && matchesOfficer
  })

  // Handle reassigning application to another officer
  function handleReassignSubmit(e) {
    e.preventDefault()
    if (!targetOfficerId) {
      showToast('Please select a target officer', 'error')
      return
    }

    const newOfficerObj = officers.find(o => o.officerId === targetOfficerId)
    if (!newOfficerObj) return

    const updatedApps = applications.map(app => {
      if (app.id === reassignApp.id) {
        return {
          ...app,
          assignedOfficerId: newOfficerObj.officerId,
          assignedOfficerName: newOfficerObj.fullName
        }
      }
      return app
    })

    setApplications(updatedApps)
    window.localStorage.setItem('gov-subsidy-officer-applications', JSON.stringify(updatedApps))
    showToast(`Application ${reassignApp.id} reassigned to ${newOfficerObj.fullName}`)
    setReassignApp(null)
  }

  // Admin Quick Action: Approve / Reject application override
  function handleAdminStatusChange(appId, newStatus) {
    const updatedApps = applications.map(app => {
      if (app.id === appId) {
        return {
          ...app,
          status: newStatus,
          remarks: `[Admin Override]: Status changed to ${newStatus}`
        }
      }
      return app
    })

    setApplications(updatedApps)
    window.localStorage.setItem('gov-subsidy-officer-applications', JSON.stringify(updatedApps))
    showToast(`Application ${appId} marked as ${newStatus}`)
    if (selectedApp && selectedApp.id === appId) {
      setSelectedApp(prev => ({ ...prev, status: newStatus, remarks: `[Admin Override]: Status changed to ${newStatus}` }))
    }
  }

  return (
    <div className="dashboard-layout" style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className={`toast toast--${toast.type}`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ position: 'fixed', top: '1rem', right: '1.5rem', zIndex: 1100 }}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Admin Top Navigation Bar ── */}
      <header
        className="topbar"
        style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          padding: '1rem 2rem',
          background: 'var(--panel-strong)',
          borderBottom: '1px solid var(--border)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src="/logo.png" alt="GS Portal" style={{ height: '36px' }} />
            <div>
              <strong style={{ fontSize: '1.1rem', color: 'var(--text)', display: 'block' }}>GS Admin Command Center</strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>National Subsidy Tracking & Oversight</span>
            </div>
          </Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.05)', padding: '0.4rem 0.8rem', borderRadius: '20px', border: '1px solid var(--border)' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
            <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>System Administrator</span>
          </div>

          <ThemeToggle />

          <Link to="/" className="button button--ghost" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
            Back to Home
          </Link>
          <button
            onClick={handleLogout}
            className="button button--primary"
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', background: '#dc2626', border: 'none', cursor: 'pointer' }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* ── Main Content Container ── */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', flexWrap: 'wrap' }}>
          <button
            className={`button ${activeTab === 'analytics' ? 'button--primary' : 'button--ghost'}`}
            onClick={() => setActiveTab('analytics')}
            style={{ fontSize: '0.9rem', borderRadius: '8px' }}
          >
            📊 Analytics & Insights
          </button>
          <button
            className={`button ${activeTab === 'history' ? 'button--primary' : 'button--ghost'}`}
            onClick={() => setActiveTab('history')}
            style={{ fontSize: '0.9rem', borderRadius: '8px' }}
          >
            📜 Application History ({applications.length})
          </button>
          <button
            className={`button ${activeTab === 'officers' ? 'button--primary' : 'button--ghost'}`}
            onClick={() => setActiveTab('officers')}
            style={{ fontSize: '0.9rem', borderRadius: '8px' }}
          >
            👮 Officer Work Tracker ({officers.length})
          </button>
          <button
            className={`button ${activeTab === 'schemes' ? 'button--primary' : 'button--ghost'}`}
            onClick={() => setActiveTab('schemes')}
            style={{ fontSize: '0.9rem', borderRadius: '8px' }}
          >
            🛠️ Manage Schemes ({schemes.length})
          </button>
          <button
            className={`button ${activeTab === 'action-logs' ? 'button--primary' : 'button--ghost'}`}
            onClick={() => setActiveTab('action-logs')}
            style={{ fontSize: '0.9rem', borderRadius: '8px' }}
          >
            👮 Officer Actions History
          </button>
          <button
            className={`button ${activeTab === 'queries' ? 'button--primary' : 'button--ghost'}`}
            onClick={() => setActiveTab('queries')}
            style={{ fontSize: '0.9rem', borderRadius: '8px' }}
          >
            💬 Citizen Queries ({queries.length})
          </button>
        </div>

        {/* ── TAB 1: ANALYTICS & INSIGHTS ── */}
        {activeTab === 'analytics' && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            {/* High Level Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
              
              {/* Card 1: Total Applications */}
              <div className="admin-card" style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--panel-strong)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', fontSize: '0.84rem', marginBottom: '0.5rem' }}>
                  <span>Total Applications</span>
                  <span>📋</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)' }}>{totalApps}</div>
                <span style={{ fontSize: '0.78rem', color: '#82aeca' }}>Across all subsidy schemes</span>
              </div>

              {/* Card 2: Pending Applications */}
              <div className="admin-card" style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--panel-strong)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', fontSize: '0.84rem', marginBottom: '0.5rem' }}>
                  <span>Pending Action</span>
                  <span>⏳</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f59e0b' }}>{pendingApps}</div>
                <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Requires officer verification</span>
              </div>

              {/* Card 3: Approved */}
              <div className="admin-card" style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--panel-strong)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', fontSize: '0.84rem', marginBottom: '0.5rem' }}>
                  <span>Approved & Sanctioned</span>
                  <span>✅</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#22c55e' }}>{approvedApps}</div>
                <span style={{ fontSize: '0.78rem', color: '#8ed66a' }}>{((approvedApps / totalApps) * 100).toFixed(1)}% Approval rate</span>
              </div>

              {/* Card 4: Rejected */}
              <div className="admin-card" style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--panel-strong)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', fontSize: '0.84rem', marginBottom: '0.5rem' }}>
                  <span>Rejected Applications</span>
                  <span>❌</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ef4444' }}>{rejectedApps}</div>
                <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Ineligible / invalid documents</span>
              </div>

              {/* Card 5: Disbursed Funds */}
              <div className="admin-card" style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--panel-strong)', border: '1px solid var(--border)', gridColumn: 'span 2' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', fontSize: '0.84rem', marginBottom: '0.5rem' }}>
                  <span>Total Funds Disbursed</span>
                  <span>💰</span>
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#ffc76a' }}>
                  ₹ {totalFundsDisbursed.toLocaleString('en-IN')}
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Direct Benefit Transfer (DBT) confirmed into beneficiary bank accounts</span>
              </div>

            </div>

            {/* Visual Analytics & Number Representations */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', marginBottom: '2rem' }}>
              
              {/* Application Status Distribution */}
              <div className="admin-card" style={{ padding: '1.5rem', borderRadius: '12px', background: 'var(--panel-strong)', border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1.2rem', color: 'var(--text)' }}>Application Status Breakdown</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1.25rem', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.06)', border: '1px solid rgba(34, 197, 94, 0.15)' }}>
                    <span style={{ fontWeight: 600, color: '#22c55e', fontSize: '0.95rem' }}>Approved</span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#22c55e' }}>{approvedApps}</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>/ {totalApps} ({totalApps > 0 ? ((approvedApps / totalApps) * 100).toFixed(0) : 0}%)</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1.25rem', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
                    <span style={{ fontWeight: 600, color: '#f59e0b', fontSize: '0.95rem' }}>Pending</span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b' }}>{pendingApps}</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>/ {totalApps} ({totalApps > 0 ? ((pendingApps / totalApps) * 100).toFixed(0) : 0}%)</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1.25rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                    <span style={{ fontWeight: 600, color: '#ef4444', fontSize: '0.95rem' }}>Rejected</span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444' }}>{rejectedApps}</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>/ {totalApps} ({totalApps > 0 ? ((rejectedApps / totalApps) * 100).toFixed(0) : 0}%)</span>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </motion.div>
        )}

        {/* ── TAB 2: APPLICATION HISTORY & AUDIT ── */}
        {activeTab === 'history' && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            
            {/* Filters Row */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search applicant name, App ID, or Aadhaar..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ flex: 1, minWidth: '240px', padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--panel-strong)', color: 'var(--text)' }}
              />

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{ padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--panel-strong)', color: 'var(--text)' }}
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>

              <select
                value={officerFilter}
                onChange={e => setOfficerFilter(e.target.value)}
                style={{ padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--panel-strong)', color: 'var(--text)' }}
              >
                <option value="All">All Officers</option>
                {officers.map(off => (
                  <option key={off.officerId} value={off.officerId}>{off.fullName} ({off.officerId})</option>
                ))}
              </select>
            </div>

            {/* History Table */}
            <div className="table-card" style={{ background: 'var(--panel-strong)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>App ID</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Applicant Name</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Scheme</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Submitted</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Assigned Officer</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Status</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApps.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
                        No application records matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredApps.map(app => {
                      const scheme = schemes.find(s => s.id === app.schemeId)
                      const statusColor = app.status === 'Approved' ? '#22c55e' : app.status === 'Rejected' ? '#ef4444' : '#f59e0b'
                      return (
                        <tr key={app.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '0.9rem 1.2rem', fontWeight: 700, fontFamily: 'monospace' }}>{app.id}</td>
                          <td style={{ padding: '0.9rem 1.2rem' }}>
                            <div style={{ fontWeight: 600 }}>{app.applicant}</div>
                            <small style={{ color: 'var(--muted)' }}>Aadhaar: {app.aadhaar}</small>
                          </td>
                          <td style={{ padding: '0.9rem 1.2rem', fontSize: '0.88rem' }}>
                            {scheme ? (scheme.name || scheme.title) : app.schemeId}
                          </td>
                          <td style={{ padding: '0.9rem 1.2rem', fontSize: '0.84rem', color: 'var(--muted)' }}>
                            {app.submittedDate}
                          </td>
                          <td style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>
                            <span style={{ fontWeight: 600 }}>{app.assignedOfficerName || 'Anil Verma'}</span>
                            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>ID: {app.assignedOfficerId || 'OFF001'}</div>
                          </td>
                          <td style={{ padding: '0.9rem 1.2rem' }}>
                            <span style={{ padding: '0.3rem 0.7rem', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 700, background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}40` }}>
                              {app.status}
                            </span>
                          </td>
                          <td style={{ padding: '0.9rem 1.2rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <button
                                className="button button--ghost"
                                style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                                onClick={() => setSelectedApp(app)}
                              >
                                View Details
                              </button>
                              <button
                                className="button button--ghost"
                                style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', borderColor: 'rgba(217, 130, 43, 0.4)', color: '#ffc76a' }}
                                onClick={() => { setReassignApp(app); setTargetOfficerId('') }}
                              >
                                Reassign
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* ── TAB 3: OFFICER WORK PROGRESS TRACKER ── */}
        {activeTab === 'officers' && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', margin: 0, color: 'var(--text)' }}>Officer Work Progress & Performance Tracker</h2>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>Monitor officer review queues, turnaround efficiency, approval ratios, and audit histories.</p>
              </div>
              <Link to="/officer/register" className="button button--primary" style={{ fontSize: '0.85rem' }}>
                + Register New Officer
              </Link>
            </div>

            {/* Officer Performance Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
              {officers.map(officer => {
                // Applications assigned to this officer
                const officerApps = applications.filter(a => a.assignedOfficerId === officer.officerId || (!a.assignedOfficerId && officer.officerId === 'OFF001'))
                const assignedCount = officerApps.length
                const pendingCount = officerApps.filter(a => a.status === 'Pending').length
                const approvedCount = officerApps.filter(a => a.status === 'Approved').length
                const rejectedCount = officerApps.filter(a => a.status === 'Rejected').length
                const reviewedCount = approvedCount + rejectedCount
                const approvalRate = reviewedCount > 0 ? ((approvedCount / reviewedCount) * 100).toFixed(0) : 100

                const loadStatus = pendingCount >= 3 ? { text: 'High Workload', color: '#ef4444' } : pendingCount >= 1 ? { text: 'Optimal Load', color: '#f59e0b' } : { text: 'Available', color: '#22c55e' }

                return (
                  <div
                    key={officer.officerId}
                    className="officer-progress-card"
                    style={{
                      background: 'var(--panel-strong)',
                      borderRadius: '14px',
                      border: '1px solid var(--border)',
                      padding: '1.4rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem'
                    }}
                  >
                    {/* Card Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text)' }}>{officer.fullName}</h3>
                        <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>{officer.designation}</span>
                        <div style={{ fontSize: '0.76rem', color: '#82aeca', marginTop: '0.2rem' }}>{officer.department || 'Subsidy Dept'} • {officer.district || 'District Nodal'}</div>
                      </div>
                      <span style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem', borderRadius: '12px', fontWeight: 700, background: `${loadStatus.color}20`, color: loadStatus.color, border: `1px solid ${loadStatus.color}40` }}>
                        {loadStatus.text}
                      </span>
                    </div>

                    {/* ID & Email Badge */}
                    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--muted)' }}>
                      <span style={{ background: 'rgba(255, 255, 255, 0.06)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontFamily: 'monospace' }}>ID: {officer.officerId}</span>
                      <span style={{ background: 'rgba(255, 255, 255, 0.06)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{officer.email}</span>
                    </div>

                    {/* Progress & Stat Metrics */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.03)', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                      <div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>{assignedCount}</div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Assigned</span>
                      </div>
                      <div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f59e0b' }}>{pendingCount}</div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Pending</span>
                      </div>
                      <div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#22c55e' }}>{reviewedCount}</div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Reviewed</span>
                      </div>
                    </div>

                    {/* Approval Rate Meter */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.4rem', color: 'var(--muted)' }}>
                        <span>Approval Rate</span>
                        <strong style={{ color: 'var(--text)' }}>{approvalRate}% ({approvedCount} approved / {rejectedCount} rejected)</strong>
                      </div>
                      <div style={{ height: '8px', borderRadius: '999px', background: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${approvalRate}%`, background: 'linear-gradient(90deg, #16a34a, #22c55e)', borderRadius: '999px' }} />
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button
                        className="button button--ghost"
                        style={{ flex: 1, fontSize: '0.78rem', padding: '0.45rem' }}
                        onClick={() => setSelectedOfficer({ officer, apps: officerApps })}
                      >
                        Activity Audit Log
                      </button>
                    </div>

                  </div>
                )
              })}
            </div>

          </motion.div>
        )}

        {/* ── TAB 4: CITIZEN SUPPORT QUERIES ── */}
        {activeTab === 'queries' && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.3rem', margin: 0, color: 'var(--text)' }}>Citizen Support Queries & Assistance Tickets</h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>Review messages submitted through the portal support desk and send officer responses.</p>
            </div>

            <div className="table-card" style={{ background: 'var(--panel-strong)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Ticket ID</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Submitter Name</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Contact Info</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Subject</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Submitted At</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Status</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {queries.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
                        No support queries submitted yet.
                      </td>
                    </tr>
                  ) : (
                    queries.map(q => {
                      const statusColor = q.status === 'Resolved' ? '#22c55e' : q.status === 'In Progress' ? '#82aeca' : '#f59e0b'
                      return (
                        <tr key={q.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '0.9rem 1.2rem', fontWeight: 700, fontFamily: 'monospace', color: '#ffc76a' }}>{q.id}</td>
                          <td style={{ padding: '0.9rem 1.2rem', fontWeight: 600 }}>{q.name}</td>
                          <td style={{ padding: '0.9rem 1.2rem', fontSize: '0.82rem' }}>
                            <div>{q.email}</div>
                            <small style={{ color: 'var(--muted)' }}>{q.phone || 'N/A'}</small>
                          </td>
                          <td style={{ padding: '0.9rem 1.2rem', fontSize: '0.88rem' }}>{q.subject}</td>
                          <td style={{ padding: '0.9rem 1.2rem', fontSize: '0.82rem', color: 'var(--muted)' }}>{q.submittedAt}</td>
                          <td style={{ padding: '0.9rem 1.2rem' }}>
                            <span style={{ padding: '0.25rem 0.65rem', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 700, background: `${statusColor}20`, color: statusColor, border: `1px solid ${statusColor}40` }}>
                              {q.status}
                            </span>
                          </td>
                          <td style={{ padding: '0.9rem 1.2rem', textAlign: 'right' }}>
                            <button
                              className="button button--ghost"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                              onClick={() => { setSelectedQuery(q); setQueryReplyText(q.reply || '') }}
                            >
                              Review & Respond
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* ── TAB 5: MANAGE SCHEMES CRUD ── */}
        {activeTab === 'schemes' && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', margin: 0, color: 'var(--text)' }}>Manage Government Subsidy Schemes</h2>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>Create new subsidy campaigns, update criteria parameters, or deprecate schemes.</p>
              </div>
              <button onClick={openCreateScheme} className="button button--primary" style={{ fontSize: '0.85rem' }}>
                + Create New Scheme
              </button>
            </div>

            <div className="table-card" style={{ background: 'var(--panel-strong)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Scheme ID</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Scheme Name</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Category</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Sanction Amount</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Max Income Limit</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Processing Time</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {schemes.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
                        No schemes exist. Click "+ Create New Scheme" to get started.
                      </td>
                    </tr>
                  ) : (
                    schemes.map(s => (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.9rem 1.2rem', fontFamily: 'monospace', fontWeight: 700, color: '#82aeca' }}>{s.id}</td>
                        <td style={{ padding: '0.9rem 1.2rem', fontWeight: 600 }}>{s.name}</td>
                        <td style={{ padding: '0.9rem 1.2rem' }}>
                          <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', fontSize: '0.8rem' }}>
                            {s.category}
                          </span>
                        </td>
                        <td style={{ padding: '0.9rem 1.2rem', fontWeight: 700, color: '#ffc76a' }}>{s.amount}</td>
                        <td style={{ padding: '0.9rem 1.2rem' }}>₹{(s.maxIncome || 0).toLocaleString()}</td>
                        <td style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem', color: 'var(--muted)' }}>{s.processingTime || 'N/A'}</td>
                        <td style={{ padding: '0.9rem 1.2rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button
                              className="button button--ghost"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}
                              onClick={() => openEditScheme(s)}
                            >
                              Edit
                            </button>
                            <button
                              className="button button--ghost"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#ef4444' }}
                              onClick={() => handleDeleteScheme(s.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* ── TAB 6: OFFICER ACTION HISTORY LOGS ── */}
        {activeTab === 'action-logs' && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.3rem', margin: 0, color: 'var(--text)' }}>Officer Action & Event History Log</h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>Auditable trace of all verification activities, status decisions, and reassignments completed by regional officers.</p>
            </div>

            {/* Filters Row */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search log description, ticket ID, or log ID..."
                value={logSearch}
                onChange={e => setLogSearch(e.target.value)}
                style={{ flex: 1, minWidth: '240px', padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--panel-strong)', color: 'var(--text)' }}
              />

              <select
                value={logActionFilter}
                onChange={e => setLogActionFilter(e.target.value)}
                style={{ padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--panel-strong)', color: 'var(--text)' }}
              >
                <option value="All">All Actions</option>
                <option value="Verify Document">Verify Document</option>
                <option value="Unverify Document">Unverify Document</option>
                <option value="Approve Application">Approve Application</option>
                <option value="Reject Application">Reject Application</option>
              </select>

              <select
                value={logOfficerFilter}
                onChange={e => setLogOfficerFilter(e.target.value)}
                style={{ padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--panel-strong)', color: 'var(--text)' }}
              >
                <option value="All">All Officers</option>
                {officers.map(off => (
                  <option key={off.officerId} value={off.officerId}>{off.fullName} ({off.officerId})</option>
                ))}
              </select>
            </div>

            <div className="table-card" style={{ background: 'var(--panel-strong)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Log ID</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Timestamp</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Officer</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Action Type</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Description Details</th>
                    <th style={{ padding: '0.9rem 1.2rem', fontSize: '0.85rem' }}>Target ID</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
                        No audit action logs found. Actions are logged when officers approve, reject, or verify applications.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map(log => {
                      let actionColor = '#82aeca'
                      if (log.action.includes('Approve')) actionColor = '#22c55e'
                      if (log.action.includes('Reject')) actionColor = '#ef4444'
                      if (log.action.includes('Verify')) actionColor = '#22c55e'
                      if (log.action.includes('Unverify')) actionColor = '#f59e0b'
                      
                      return (
                        <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '0.9rem 1.2rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--muted)' }}>{log.id}</td>
                          <td style={{ padding: '0.9rem 1.2rem', fontSize: '0.82rem', color: 'var(--muted)' }}>{log.timestamp}</td>
                          <td style={{ padding: '0.9rem 1.2rem' }}>
                            <div style={{ fontWeight: 600 }}>{log.officerName}</div>
                            <small style={{ color: 'var(--muted)', fontFamily: 'monospace' }}>ID: {log.officerId}</small>
                          </td>
                          <td style={{ padding: '0.9rem 1.2rem' }}>
                            <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.76rem', fontWeight: 700, background: `${actionColor}18`, color: actionColor, border: `1px solid ${actionColor}30`, whiteSpace: 'nowrap' }}>
                              {log.action}
                            </span>
                          </td>
                          <td style={{ padding: '0.9rem 1.2rem', fontSize: '0.88rem' }}>{log.details}</td>
                          <td style={{ padding: '0.9rem 1.2rem', fontFamily: 'monospace', fontWeight: 700, color: '#ffc76a' }}>{log.targetId}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

      </div>

      {/* ── MODAL 1: APPLICATION DETAILS & ADMIN OVERRIDE ── */}
      <AnimatePresence>
        {selectedApp && (
          <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div
              className="modal-content"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ background: 'var(--panel-strong)', borderRadius: '16px', border: '1px solid var(--border)', maxWidth: '580px', width: '100%', padding: '1.75rem', maxHeight: '90vh', overflowY: 'auto' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text)' }}>Application Audit: {selectedApp.id}</h3>
                <button onClick={() => setSelectedApp(null)} style={{ background: 'none', border: 0, color: 'var(--muted)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', fontSize: '0.9rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: 'rgba(255, 255, 255, 0.03)', padding: '0.85rem', borderRadius: '8px' }}>
                  <div><span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Applicant Name</span><div style={{ fontWeight: 600 }}>{selectedApp.applicant}</div></div>
                  <div><span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Aadhaar Number</span><div style={{ fontWeight: 600 }}>{selectedApp.aadhaar}</div></div>
                  <div><span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Email / Phone</span><div>{selectedApp.email} | {selectedApp.phone}</div></div>
                  <div><span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Submitted On</span><div>{selectedApp.submittedDate}</div></div>
                  <div><span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Assigned Officer</span><div style={{ fontWeight: 600 }}>{selectedApp.assignedOfficerName || 'Anil Verma'}</div></div>
                  <div><span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Current Status</span><div style={{ fontWeight: 700, color: selectedApp.status === 'Approved' ? '#22c55e' : selectedApp.status === 'Rejected' ? '#ef4444' : '#f59e0b' }}>{selectedApp.status}</div></div>
                </div>

                <h4 style={{ margin: '0.5rem 0 0.25rem', fontSize: '0.95rem' }}>Submitted Documents Verification Audit</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selectedApp.documents?.map((doc, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.04)', fontSize: '0.84rem' }}>
                      <span>📄 {doc.name}</span>
                      <span style={{ fontWeight: 700, color: doc.verified ? '#22c55e' : '#f59e0b' }}>{doc.verified ? '✓ Verified' : '⏳ Pending'}</span>
                    </div>
                  ))}
                </div>

                {selectedApp.remarks && (
                  <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(255, 199, 106, 0.1)', border: '1px solid rgba(255, 199, 106, 0.3)', color: '#ffc76a', fontSize: '0.85rem' }}>
                    <strong>Officer Remarks:</strong> {selectedApp.remarks}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                  <button className="button button--primary btn-approve" style={{ flex: 1, background: '#16a34a' }} onClick={() => handleAdminStatusChange(selectedApp.id, 'Approved')}>
                    ✓ Admin Approve
                  </button>
                  <button className="button button--primary btn-reject" style={{ flex: 1, background: '#dc2626' }} onClick={() => handleAdminStatusChange(selectedApp.id, 'Rejected')}>
                    ✕ Admin Reject
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL 2: REASSIGN WORKLOAD ── */}
      <AnimatePresence>
        {reassignApp && (
          <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div
              className="modal-content"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ background: 'var(--panel-strong)', borderRadius: '16px', border: '1px solid var(--border)', maxWidth: '460px', width: '100%', padding: '1.75rem' }}
            >
              <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: 'var(--text)' }}>Reassign Application {reassignApp.id}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1.25rem' }}>Currently assigned to: <strong>{reassignApp.assignedOfficerName || 'Anil Verma'}</strong></p>

              <form onSubmit={handleReassignSubmit}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 600 }}>Select New Target Officer</label>
                <select
                  value={targetOfficerId}
                  onChange={e => setTargetOfficerId(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', marginBottom: '1.5rem' }}
                >
                  <option value="">-- Choose Officer --</option>
                  {officers.map(o => (
                    <option key={o.officerId} value={o.officerId}>
                      {o.fullName} ({o.officerId}) - {o.district || 'Jurisdiction'}
                    </option>
                  ))}
                </select>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="submit" className="button button--primary" style={{ flex: 1 }}>Confirm Reassignment</button>
                  <button type="button" className="button button--ghost" style={{ flex: 1 }} onClick={() => setReassignApp(null)}>Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL 3: OFFICER AUDIT DRAWER ── */}
      <AnimatePresence>
        {selectedOfficer && (
          <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div
              className="modal-content"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ background: 'var(--panel-strong)', borderRadius: '16px', border: '1px solid var(--border)', maxWidth: '580px', width: '100%', padding: '1.75rem', maxHeight: '85vh', overflowY: 'auto' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text)' }}>Activity Audit: {selectedOfficer.officer.fullName}</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Officer ID: {selectedOfficer.officer.officerId}</span>
                </div>
                <button onClick={() => setSelectedOfficer(null)} style={{ background: 'none', border: 0, color: 'var(--muted)', fontSize: '1.2rem', cursor: 'cursor' }}>✕</button>
              </div>

              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>Assigned Applications Workload ({selectedOfficer.apps.length})</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {selectedOfficer.apps.length === 0 ? (
                  <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No applications currently assigned to this officer.</p>
                ) : (
                  selectedOfficer.apps.map(app => (
                    <div key={app.id} style={{ padding: '0.85rem', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{app.id} - {app.applicant}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Submitted: {app.submittedDate}</div>
                        {app.remarks && <div style={{ fontSize: '0.76rem', color: '#ffc76a', marginTop: '0.2rem' }}>Remarks: {app.remarks}</div>}
                      </div>
                      <span style={{ padding: '0.3rem 0.6rem', borderRadius: '10px', fontSize: '0.76rem', fontWeight: 700, background: app.status === 'Approved' ? 'rgba(34, 197, 94, 0.15)' : app.status === 'Rejected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: app.status === 'Approved' ? '#22c55e' : app.status === 'Rejected' ? '#ef4444' : '#f59e0b' }}>
                        {app.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL 4: QUERY RESPONSE & STATUS UPDATE ── */}
      <AnimatePresence>
        {selectedQuery && (
          <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div
              className="modal-content"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ background: 'var(--panel-strong)', borderRadius: '16px', border: '1px solid var(--border)', maxWidth: '540px', width: '100%', padding: '1.75rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text)' }}>Query Ticket: {selectedQuery.id}</h3>
                <button onClick={() => setSelectedQuery(null)} style={{ background: 'none', border: 0, color: 'var(--muted)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.85rem', borderRadius: '8px', marginBottom: '1.2rem', fontSize: '0.86rem' }}>
                <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>{selectedQuery.name} ({selectedQuery.email})</div>
                <div style={{ color: '#ffc76a', fontWeight: 600, fontSize: '0.82rem', marginBottom: '0.5rem' }}>Subject: {selectedQuery.subject}</div>
                <div style={{ color: 'var(--text-soft)', fontStyle: 'italic', background: 'rgba(0,0,0,0.2)', padding: '0.6rem', borderRadius: '6px' }}>"{selectedQuery.message}"</div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 600 }}>Official Response Message</label>
                <textarea
                  rows="3"
                  placeholder="Type official response to citizen..."
                  value={queryReplyText}
                  onChange={e => setQueryReplyText(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  className="button button--primary"
                  style={{ flex: 1, background: '#16a34a' }}
                  onClick={() => {
                    const updated = queries.map(q => q.id === selectedQuery.id ? { ...q, status: 'Resolved', reply: queryReplyText } : q)
                    setQueries(updated)
                    localStorage.setItem('gov-subsidy-queries', JSON.stringify(updated))
                    showToast(`Query ${selectedQuery.id} marked as Resolved!`)
                    setSelectedQuery(null)
                  }}
                >
                  ✓ Send Response & Resolve
                </button>
                <button
                  className="button button--ghost"
                  style={{ flex: 1 }}
                  onClick={() => {
                    const updated = queries.map(q => q.id === selectedQuery.id ? { ...q, status: 'In Progress', reply: queryReplyText } : q)
                    setQueries(updated)
                    localStorage.setItem('gov-subsidy-queries', JSON.stringify(updated))
                    showToast(`Query ${selectedQuery.id} marked as In Progress`)
                    setSelectedQuery(null)
                  }}
                >
                  ⏳ Mark In Progress
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL 5: SCHEME CREATION / UPDATION ── */}
      <AnimatePresence>
        {showSchemeModal && (
          <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div
              className="modal-content"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ background: 'var(--panel-strong)', borderRadius: '16px', border: '1px solid var(--border)', maxWidth: '580px', width: '100%', padding: '1.75rem', maxHeight: '90vh', overflowY: 'auto' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text)' }}>
                  {editingScheme ? `Edit Scheme: ${editingScheme.name}` : 'Create New Subsidy Scheme'}
                </h3>
                <button onClick={() => setShowSchemeModal(false)} style={{ background: 'none', border: 0, color: 'var(--muted)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
              </div>

              <form onSubmit={handleSaveScheme} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.25rem', color: 'var(--text-soft)', fontWeight: 600 }}>Scheme ID (Slug)</label>
                    <input
                      type="text"
                      placeholder="e.g. pm-kisan-smart"
                      value={schemeForm.id}
                      onChange={e => setSchemeForm(prev => ({ ...prev, id: e.target.value }))}
                      disabled={!!editingScheme}
                      required
                      style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.88rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.25rem', color: 'var(--text-soft)', fontWeight: 600 }}>Category</label>
                    <select
                      value={schemeForm.category}
                      onChange={e => setSchemeForm(prev => ({ ...prev, category: e.target.value }))}
                      style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.88rem' }}
                    >
                      <option value="Agriculture">Agriculture</option>
                      <option value="Housing">Housing</option>
                      <option value="Education">Education</option>
                      <option value="Healthcare">Healthcare</option>
                      <option value="SME Welfare">SME Welfare</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.25rem', color: 'var(--text-soft)', fontWeight: 600 }}>Scheme Name</label>
                  <input
                    type="text"
                    placeholder="e.g. PM Kisan Samman Nidhi"
                    value={schemeForm.name}
                    onChange={e => setSchemeForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.88rem' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.25rem', color: 'var(--text-soft)', fontWeight: 600 }}>Sanction Amount (display)</label>
                    <input
                      type="text"
                      placeholder="e.g. ₹6,000 / Year"
                      value={schemeForm.amount}
                      onChange={e => setSchemeForm(prev => ({ ...prev, amount: e.target.value }))}
                      required
                      style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.88rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.25rem', color: 'var(--text-soft)', fontWeight: 600 }}>Processing Time SLA</label>
                    <input
                      type="text"
                      placeholder="e.g. 15-20 Days"
                      value={schemeForm.processingTime}
                      onChange={e => setSchemeForm(prev => ({ ...prev, processingTime: e.target.value }))}
                      required
                      style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.88rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.25rem', color: 'var(--text-soft)', fontWeight: 600 }}>Max Income Limit (₹ / year)</label>
                    <input
                      type="number"
                      placeholder="e.g. 300000"
                      value={schemeForm.maxIncome}
                      onChange={e => setSchemeForm(prev => ({ ...prev, maxIncome: e.target.value }))}
                      required
                      style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.88rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.25rem', color: 'var(--text-soft)', fontWeight: 600 }}>Max Land Limit (Acres)</label>
                    <input
                      type="number"
                      placeholder="e.g. 5"
                      value={schemeForm.maxLandHolding}
                      onChange={e => setSchemeForm(prev => ({ ...prev, maxLandHolding: e.target.value }))}
                      required
                      style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.88rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.25rem', color: 'var(--text-soft)', fontWeight: 600 }}>Allowed Occupations (comma-separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. Farmer, Student, Unemployed, Salaried"
                    value={schemeForm.allowedOccupations}
                    onChange={e => setSchemeForm(prev => ({ ...prev, allowedOccupations: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.25rem', color: 'var(--text-soft)', fontWeight: 600 }}>Required Verification Documents (comma-separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. Aadhaar Card, Income Certificate, Bank Passbook"
                    value={schemeForm.requiredDocs}
                    onChange={e => setSchemeForm(prev => ({ ...prev, requiredDocs: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.25rem', color: 'var(--text-soft)', fontWeight: 600 }}>Scheme Overview Description</label>
                  <textarea
                    rows="2"
                    placeholder="Enter short details of the scheme..."
                    value={schemeForm.description}
                    onChange={e => setSchemeForm(prev => ({ ...prev, description: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.25rem', color: 'var(--text-soft)', fontWeight: 600 }}>Eligibility Description Copy</label>
                  <textarea
                    rows="2"
                    placeholder="Describe eligibility conditions..."
                    value={schemeForm.eligibilityText}
                    onChange={e => setSchemeForm(prev => ({ ...prev, eligibilityText: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.88rem' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="submit" className="button button--primary" style={{ flex: 1 }}>
                    {editingScheme ? '✓ Save Changes' : '✓ Create Scheme'}
                  </button>
                  <button type="button" className="button button--ghost" style={{ flex: 1 }} onClick={() => setShowSchemeModal(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
