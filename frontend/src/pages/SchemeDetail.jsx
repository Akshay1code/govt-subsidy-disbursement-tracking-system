import '../styles/SchemeDetail.css';
import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getSchemes, checkEligibility } from '../data/schemes'
import ThemeToggle from '../components/ThemeToggle'

// Sample base64 mock documents to represent scanned images
const MOCK_DOCS = {
  clear: {
    name: 'Aadhaar_Card_Clear.jpg',
    url: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=500&auto=format&fit=crop&q=60', // Representative doc image
    diagnostics: {
      resolution: { value: '3264 x 2448 px', status: 'pass', label: 'Resolution (300 DPI)' },
      blur: { value: '0.04 variance (Excellent)', status: 'pass', label: 'Blur / Sharpness Check' },
      contrast: { value: '88% Dynamic Range', status: 'pass', label: 'Lighting / Exposure' },
      ocr: { value: '96% Match Confidence', status: 'pass', label: 'OCR Readability' },
      bounds: { value: '98% Alignment', status: 'pass', label: 'Edge Detection' }
    },
    message: 'Document quality is optimal. Ready for instant digital processing.',
    color: '#5f8f4a'
  },
  blurry: {
    name: 'Aadhaar_Card_Blurry.jpg',
    url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=500&auto=format&fit=crop&q=60', // Blurry/dark tech image
    diagnostics: {
      resolution: { value: '640 x 480 px (Low)', status: 'warning', label: 'Resolution (300 DPI)' },
      blur: { value: '0.64 variance (High Blur)', status: 'fail', label: 'Blur / Sharpness Check' },
      contrast: { value: '42% Dynamic Range (Too Dark)', status: 'warning', label: 'Lighting / Exposure' },
      ocr: { value: '31% Match (Unreadable)', status: 'fail', label: 'OCR Readability' },
      bounds: { value: '61% Alignment', status: 'warning', label: 'Edge Detection' }
    },
    message: 'High blur & low resolution detected. Please re-upload a stable, well-lit scan to avoid officer rejection.',
    color: '#d9822b'
  },
  contrast: {
    name: 'Aadhaar_Card_Glare.jpg',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60', // Glare tech image
    diagnostics: {
      resolution: { value: '1920 x 1080 px', status: 'pass', label: 'Resolution (300 DPI)' },
      blur: { value: '0.11 variance (Acceptable)', status: 'pass', label: 'Blur / Sharpness Check' },
      contrast: { value: '95% Glare/Reflectance (Poor)', status: 'fail', label: 'Lighting / Exposure' },
      ocr: { value: '72% Match (Aadhaar number obscured)', status: 'warning', label: 'OCR Readability' },
      bounds: { value: '92% Alignment', status: 'pass', label: 'Edge Detection' }
    },
    message: 'Severe glare/contrast blowout detected. Please disable flash and scan from a top-down angle.',
    color: '#d9822b'
  }
}

export default function SchemeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const SCHEMES = getSchemes()
  // Scheme is derived directly from the route param
  const scheme = SCHEMES.find(s => s.id === id)

  const [profile] = useState(() => {
    const stored = window.localStorage.getItem('gov-subsidy-profile')
    return stored ? JSON.parse(stored) : null
  })
  const [applications, setApplications] = useState(() => {
    const stored = window.localStorage.getItem('gov-subsidy-applications')
    return stored ? JSON.parse(stored) : {}
  })
  
  // UI views: 'detail' | 'apply'
  const [viewState, setViewState] = useState('detail')
  
  // Terms agreement state
  const [agreed, setAgreed] = useState(false)
  
  // Application Form Inputs
  const [formInputs, setFormInputs] = useState(() => {
    const initial = {}
    const currentScheme = SCHEMES.find(s => s.id === id)
    if (currentScheme) {
      currentScheme.natureInputs.forEach(input => {
        initial[input.name] = ''
      })
    }
    return initial
  })

  // Eligibility inputs asked during application
  const [eligibilityInputs, setEligibilityInputs] = useState(() => {
    const stored = window.localStorage.getItem('gov-subsidy-profile')
    const parsed = stored ? JSON.parse(stored) : {}
    return {
      aadhaar: parsed.aadhaar || '',
      annualIncome: parsed.annualIncome || '',
      bankName: parsed.bankName || '',
      accountNumber: parsed.accountNumber || '',
      ifsc: parsed.ifsc || ''
    }
  })
  
  // Scanner / Document Upload State
  const [selectedDocType, setSelectedDocType] = useState('clear')
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [scannedImage, setScannedImage] = useState(null)
  
  // Loading submit
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitPhase, setSubmitPhase] = useState('')

  // Redirect if not authenticated or the scheme id is invalid
  useEffect(() => {
    if (!window.localStorage.getItem('gov-subsidy-auth')) {
      navigate('/login')
      return
    }
    if (!SCHEMES.find(s => s.id === id)) {
      navigate('/dashboard')
    }
  }, [id, navigate])

  if (!scheme || !profile) return null

  const eligibility = checkEligibility(scheme, profile)
  const isApplied = !!applications[scheme.id]
  const appDetails = applications[scheme.id]

  // Trigger simulated scanning animation
  const handleSimulateScan = () => {
    setIsScanning(true)
    setScanResult(null)
    setScannedImage(null)
    
    setTimeout(() => {
      setIsScanning(false)
      const data = MOCK_DOCS[selectedDocType]
      setScanResult(data.diagnostics)
      setScannedImage(data)
    }, 1800)
  }

  // Handle Form Change
  const handleInputChange = (e) => {
    setFormInputs(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleEligInputChange = (e) => {
    const { name, value } = e.target
    if (name === 'aadhaar') {
      const cleaned = value.replace(/\D/g, '').slice(0, 12)
      setEligibilityInputs(prev => ({ ...prev, [name]: cleaned }))
    } else {
      setEligibilityInputs(prev => ({ ...prev, [name]: value }))
    }
  }

  // Handle application submission
  const handleSubmitApplication = async (e) => {
    e.preventDefault()

    // Check if dynamic fields are filled
    for (let input of scheme.natureInputs) {
      if (input.required && !formInputs[input.name]) {
        alert(`Please fill out: ${input.label}`)
        return
      }
    }

    // Verify eligibility fields are filled
    if (!eligibilityInputs.aadhaar || !eligibilityInputs.annualIncome || !eligibilityInputs.bankName || !eligibilityInputs.accountNumber || !eligibilityInputs.ifsc) {
      alert('Please fill out all Aadhaar Identity and Direct Disbursement Bank credentials.')
      return
    }

    // Aadhaar 12-digit validation
    const cleanAadhaar = eligibilityInputs.aadhaar.replace(/\D/g, '')
    if (cleanAadhaar.length !== 12) {
      alert('Aadhaar UID must consist of exactly 12 digits.')
      return
    }

    if (!scannedImage) {
      alert('Please upload and scan your Aadhaar Identity Card photo first.')
      return
    }

    if (selectedDocType !== 'clear') {
      alert('Cannot submit application with failing document scanner quality check. Please re-upload a clear scan.')
      return
    }

    setIsSubmitting(true)
    
    const phases = [
      'Establishing connection to UIDAI Gateway...',
      'Running anti-fraud cross-referencing...',
      'Uploading scanned documents to DigiLocker servers...',
      'Generating District Beneficiary Ledger node...',
      'Submitting to local field officer queue...'
    ]

    for (let phase of phases) {
      setSubmitPhase(phase)
      await new Promise(r => setTimeout(r, 600))
    }

    // Update active profile in local storage with credentials filled during application
    const updatedProfile = {
      ...profile,
      aadhaar: eligibilityInputs.aadhaar,
      annualIncome: eligibilityInputs.annualIncome,
      bankName: eligibilityInputs.bankName,
      accountNumber: eligibilityInputs.accountNumber,
      ifsc: eligibilityInputs.ifsc,
      // If Kisan, update landHolding from dynamic inputs
      landHolding: formInputs.landArea ? formInputs.landArea : profile.landHolding
    }
    window.localStorage.setItem('gov-subsidy-profile', JSON.stringify(updatedProfile))

    // Update profile in users registry
    const storedUsers = window.localStorage.getItem('gov-subsidy-users')
    if (storedUsers) {
      const usersList = JSON.parse(storedUsers)
      const userIndex = usersList.findIndex(u => u.username === profile.username)
      if (userIndex !== -1) {
        usersList[userIndex] = updatedProfile
        window.localStorage.setItem('gov-subsidy-users', JSON.stringify(usersList))
      }
    }

    const updatedApps = {
      ...applications,
      [scheme.id]: {
        status: 'Applied',
        appliedDate: new Date().toLocaleDateString(),
        details: formInputs,
        documentChecked: scannedImage.name
      }
    }

    // Generate unique APP ID for global officer queue
    const appId = 'APP-' + Math.floor(1000 + Math.random() * 9000)
    const officerApps = JSON.parse(window.localStorage.getItem('gov-subsidy-officer-applications') || '[]')
    
    // Parse scheme amount safely
    let numericAmount = 5000
    if (scheme.amount) {
      const match = scheme.amount.replace(/[^0-9]/g, '')
      if (match) numericAmount = parseInt(match)
    }

    const newOfficerApp = {
      id: appId,
      applicant: updatedProfile.fullName || 'Citizen',
      email: updatedProfile.email || '',
      phone: updatedProfile.phone || '',
      aadhaar: eligibilityInputs.aadhaar,
      schemeId: scheme.id,
      amount: numericAmount,
      annualIncome: eligibilityInputs.annualIncome,
      submittedDate: new Date().toISOString().split('T')[0],
      status: 'Pending',
      assignedOfficerId: 'OFF001',
      assignedOfficerName: 'Anil Verma',
      remarks: '',
      documents: scheme.requiredDocs.map(docName => ({
        name: docName,
        verified: docName.toLowerCase().includes('aadhaar') // auto-verify Aadhaar since scanned
      })),
      details: formInputs
    }
    
    officerApps.unshift(newOfficerApp)
    window.localStorage.setItem('gov-subsidy-officer-applications', JSON.stringify(officerApps))
    window.localStorage.setItem('gov-subsidy-applications', JSON.stringify(updatedApps))
    setIsSubmitting(false)
    navigate('/dashboard')
  }

  // Simulate field officer processing application (DBT)
  const handleSimulateOfficerDisbursement = () => {
    const updatedApps = {
      ...applications,
      [scheme.id]: {
        ...appDetails,
        status: 'Disbursed'
      }
    }
    window.localStorage.setItem('gov-subsidy-applications', JSON.stringify(updatedApps))
    setApplications(updatedApps)
  }

  return (
    <div className="scheme-detail-layout">
      {/* Sticky Header */}
      <header className="topbar">
        <div className="topbar__brand">
          <Link to="/dashboard" className="brand-back-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to Dashboard
          </Link>
        </div>

        <div className="topbar__user-info">
          <span className="user-badge">
            <span className="user-badge__dot"></span>
            {profile?.fullName || 'Beneficiary'}
          </span>
          <ThemeToggle />
        </div>
      </header>

      <main className="scheme-main">
        {viewState === 'detail' ? (
          /* ========================================= */
          /* VIEW 1: SCHEME DETAILS & TERMS AGREEMENT  */
          /* ========================================= */
          <motion.div 
            className="scheme-grid-detail"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Left side details */}
            <div className="scheme-info-panel">
              <span className={`scheme-card__category category--${scheme.category.toLowerCase()}`}>
                {scheme.category}
              </span>
              
              <h1 className="scheme-title">{scheme.name}</h1>
              <p className="scheme-desc-long">{scheme.description}</p>

              {/* Dynamic Nature-specific info details */}
              <h3 className="section-subtitle-detail">Scheme Specific Specifications</h3>
              <div className="nature-detail-grid">
                {scheme.natureDetails.map((det, index) => (
                  <div className="nature-detail-card" key={index}>
                    <span className="nature-detail-label">{det.label}</span>
                    <span className="nature-detail-val">{det.value}</span>
                  </div>
                ))}
              </div>

              {/* Eligibility block */}
              <div className="detail-section-block">
                <h3>Eligibility Requirements</h3>
                <p className="eligibility-desc">{scheme.eligibilityText}</p>
                <div className="eligibility-status-large">
                  <span className="elig-label">Your Evaluated Status:</span>
                  {isApplied ? (
                    <span className="badge-status-large status-applied">Applied / Active Tracker</span>
                  ) : eligibility.eligible ? (
                    <span className="badge-status-large status-eligible">✓ Eligible to Apply</span>
                  ) : (
                    <span className="badge-status-large status-ineligible">✕ Currently Ineligible</span>
                  )}
                </div>

                {!eligibility.eligible && !isApplied && (
                  <div className="elig-reasons-box">
                    <p className="box-title">Why you are currently ineligible:</p>
                    <ul>
                      {eligibility.reasons.map((r, idx) => <li key={idx}>{r}</li>)}
                    </ul>
                    <p className="box-tip">Tip: You can edit your parameters under the **Profile Management** tab in the dashboard if there was a typo in your income, land holdings, or occupation fields.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right side interactive application gateway */}
            <div className="scheme-action-panel">
              <div className="gate-card">
                <h3>Application Gateway</h3>
                
                {isApplied ? (
                  <div className="applied-gateway-info">
                    <p>You have already submitted an application for this subsidy scheme.</p>
                    <div className="action-row">
                      <span className="label">Current Status:</span>
                      <span className={`val badge-status--${appDetails.status.toLowerCase()}`}>
                        {appDetails.status}
                      </span>
                    </div>
                    
                    {appDetails.status === 'Applied' && (
                      <button 
                        onClick={handleSimulateOfficerDisbursement}
                        className="button button--secondary btn-apply"
                        style={{ width: '100%', marginTop: '1.2rem' }}
                      >
                        Simulate Officer Inspection & Disbursement
                      </button>
                    )}

                    <Link to="/dashboard" className="button button--ghost" style={{ width: '100%', marginTop: '0.8rem', textAlign: 'center' }}>
                      Go to Tracking Dashboard
                    </Link>
                  </div>
                ) : !eligibility.eligible ? (
                  <div className="ineligible-gateway-info">
                    <p>This scheme is locked because you do not meet the minimum eligibility requirements listed on the left.</p>
                    <p className="advice">Please update your demographic metrics in the Profile tab to align with the criteria if applicable.</p>
                    <button disabled className="button button--primary btn-apply" style={{ width: '100%', opacity: 0.5, cursor: 'not-allowed' }}>
                      Locked
                    </button>
                  </div>
                ) : (
                  <div className="terms-agreement-gate">
                    <p className="notice">To apply, please review and accept the official government terms and conditions below.</p>
                    
                    {/* Terms Scroll Area */}
                    <div className="terms-scroll-area">
                      <h4>Subsidy Sanction Agreement (Form-4A)</h4>
                      <p>1. <strong>Direct Benefit Transfer (DBT)</strong>: I understand that funds under this program are disbursed exclusively through Aadhaar Enabled Payment Systems (AEPS) linked directly to the bank account specified in my profile.</p>
                      <p>2. <strong>Verification Right</strong>: I authorize the Ministry of Finance and Agriculture to cross-reference my Aadhaar identity card and land records registry to audit eligibility parameters.</p>
                      <p>3. <strong>Field Inspection Approval</strong>: I agree to facilitate inspection of assets (e.g., cultivable land, building site) by designated government field officers upon request.</p>
                      <p>4. <strong>Falsification Penalty</strong>: I declare that all information submitted is accurate. Falsification of documents will result in cancellation of status and recovery of disbursed amounts under the Civil Penalties Act.</p>
                    </div>

                    <label className="terms-checkbox-wrap">
                      <input 
                        type="checkbox" 
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                      />
                      <span>I agree to the terms, conditions, and DBT auditing regulations.</span>
                    </label>

                    <button 
                      onClick={() => setViewState('apply')}
                      disabled={!agreed}
                      className="button button--primary btn-apply"
                      style={{ width: '100%', marginTop: '1rem' }}
                    >
                      Proceed towards Application Form
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          /* ========================================= */
          /* VIEW 2: DETAILED QUALITY PHOTO FORM       */
          /* ========================================= */
          <motion.div 
            className="scheme-form-layout"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="form-header-bar">
              <h2>Official Application Form</h2>
              <p>Scheme: {scheme.name}</p>
            </div>

            <form onSubmit={handleSubmitApplication} className="application-form">
              <div className="form-flex-columns">
                
                {/* Left Form Column (Text Details) */}
                <div className="form-column-inputs">
                  <h3>1. Verify Demographic Details</h3>
                  <p className="helper-text">These fields are pre-filled from your profile credentials.</p>
                  
                   <div className="form-group-row">
                    <div className="form-group">
                      <label>Applicant Name</label>
                      <input type="text" disabled value={profile.fullName} />
                    </div>
                    <div className="form-group">
                      <label>Aadhaar UID (12 Digits) <span className="req">*</span></label>
                      <input 
                        type="text" 
                        name="aadhaar"
                        maxLength={12}
                        placeholder="12-digit Aadhaar UID" 
                        value={eligibilityInputs.aadhaar} 
                        onChange={handleEligInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group-row">
                    <div className="form-group">
                      <label>Annual Family Income (₹) <span className="req">*</span></label>
                      <input 
                        type="number" 
                        name="annualIncome"
                        placeholder="e.g. 240000" 
                        value={eligibilityInputs.annualIncome} 
                        onChange={handleEligInputChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Disbursement Bank Name <span className="req">*</span></label>
                      <input 
                        type="text" 
                        name="bankName"
                        placeholder="e.g. State Bank of India" 
                        value={eligibilityInputs.bankName} 
                        onChange={handleEligInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group-row">
                    <div className="form-group">
                      <label>Bank Account Number <span className="req">*</span></label>
                      <input 
                        type="text" 
                        name="accountNumber"
                        placeholder="e.g. 38920192831" 
                        value={eligibilityInputs.accountNumber} 
                        onChange={handleEligInputChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>IFSC Code <span className="req">*</span></label>
                      <input 
                        type="text" 
                        name="ifsc"
                        placeholder="e.g. SBIN0004829" 
                        value={eligibilityInputs.ifsc} 
                        onChange={handleEligInputChange}
                        required
                      />
                    </div>
                  </div>

                  <h3 style={{ marginTop: '2rem' }}>2. Scheme-Specific Information</h3>
                  <p className="helper-text">Please input exact specifications required for the {scheme.category} ministry database.</p>
                  
                  <div className="scheme-dynamic-inputs">
                    {scheme.natureInputs.map((input) => (
                      <div className="form-group" key={input.name}>
                        <label>{input.label} {input.required && <span className="req">*</span>}</label>
                        {input.type === 'select' ? (
                          <select 
                            name={input.name}
                            value={formInputs[input.name] || ''}
                            onChange={handleInputChange}
                            required={input.required}
                          >
                            <option value="">-- Select option --</option>
                            {input.options.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <input 
                            type={input.type}
                            name={input.name}
                            placeholder={input.placeholder}
                            value={formInputs[input.name] || ''}
                            onChange={handleInputChange}
                            required={input.required}
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="form-action-navs" style={{ marginTop: '2.5rem' }}>
                    <button 
                      type="button" 
                      className="button button--ghost"
                      onClick={() => {
                        setViewState('detail')
                        setAgreed(false)
                      }}
                    >
                      Back to Terms
                    </button>
                    
                    <button 
                      type="submit" 
                      className="button button--primary btn-apply"
                      disabled={!scannedImage || selectedDocType !== 'clear'}
                    >
                      Submit Subsidy Application
                    </button>
                  </div>
                </div>

                {/* Right Form Column (Photo Quality Verification Scanner) */}
                <div className="form-column-scanner">
                  <h3>3. Identity Document Scan & Photo Quality Check</h3>
                  <p className="helper-text">
                    Government regulations require an automated high-fidelity quality check on the 
                    Aadhaar card scan. Low-resolution or blurry uploads are flagged to prevent approval delays.
                  </p>

                  <div className="scanner-control-card">
                    <div className="quality-simulation-selector">
                      <label>Select Scan Template to Simulate:</label>
                      <select 
                        value={selectedDocType}
                        onChange={(e) => {
                          setSelectedDocType(e.target.value)
                          setScanResult(null)
                          setScannedImage(null)
                        }}
                      >
                        <option value="clear">Aadhaar_Card_Clear.jpg (Passing Quality)</option>
                        <option value="blurry">Aadhaar_Card_Blurry.jpg (Fails: High Blur)</option>
                        <option value="contrast">Aadhaar_Card_Glare.jpg (Fails: High Glare)</option>
                      </select>
                    </div>

                    <div className="scan-button-wrapper">
                      <button 
                        type="button" 
                        onClick={handleSimulateScan}
                        className="btn-trigger-scan"
                        disabled={isScanning}
                      >
                        {isScanning ? 'Running Diagnostic Scan...' : 'Trigger Document Scanner Audit'}
                      </button>
                    </div>

                    {/* Scanner Display Frame */}
                    <div className="scanner-frame">
                      {isScanning ? (
                        <div className="scanner-screen scanning">
                          <div className="scanner-laser-line"></div>
                          <span className="scanner-status-text">Analyzing pixels...</span>
                        </div>
                      ) : scannedImage ? (
                        <div className="scanner-screen preview">
                          <img src={scannedImage.url} alt="Document preview" className="scanned-image" />
                          
                          {/* Simulated diagnostic overlays if clear scan */}
                          {selectedDocType === 'clear' && (
                            <div className="scanner-overlays">
                              <div className="bounding-box-aadhaar" style={{ top: '15%', left: '15%', width: '70%', height: '10%' }}>
                                <span className="box-tag">GOVERNMENT OF INDIA</span>
                              </div>
                              <div className="bounding-box-aadhaar" style={{ top: '40%', left: '55%', width: '35%', height: '45%' }}>
                                <span className="box-tag">FACE DETECTED</span>
                              </div>
                              <div className="bounding-box-aadhaar" style={{ top: '65%', left: '15%', width: '38%', height: '20%' }}>
                                <span className="box-tag font-mono">12-DIGIT UID PASSED</span>
                              </div>
                            </div>
                          )}

                          <span className="scanner-filename-tag">{scannedImage.name}</span>
                        </div>
                      ) : (
                        <div className="scanner-screen empty">
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <path d="M12 8v8M8 12h8" />
                          </svg>
                          <span>Scan pending. Click the button above to test.</span>
                        </div>
                      )}
                    </div>

                    {/* Diagnostic Metrics Display */}
                    {scanResult && (
                      <motion.div 
                        className="diagnostic-results-panel"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <h4>Quality Metric Diagnostics</h4>
                        
                        <div className="metrics-grid">
                          {Object.keys(scanResult).map((key) => {
                            const metric = scanResult[key]
                            return (
                              <div className={`metric-row metric--${metric.status}`} key={key}>
                                <div className="metric-header">
                                  <span className="metric-dot"></span>
                                  <span className="metric-label">{metric.label}</span>
                                </div>
                                <span className="metric-value font-mono">{metric.value}</span>
                              </div>
                            )
                          })}
                        </div>

                        <div className="diagnostic-summary-footer" style={{ borderLeftColor: scannedImage.color }}>
                          <p>{scannedImage.message}</p>
                          <span className={`status-badge-overall tag--${selectedDocType}`}>
                            Overall Check: {selectedDocType === 'clear' ? 'PASSED' : 'REJECTED'}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>

              </div>
            </form>
          </motion.div>
        )}
      </main>

      {/* Submitting Loading overlay */}
      <AnimatePresence>
        {isSubmitting && (
          <div className="modal-overlay">
            <motion.div 
              className="modal-panel submit-loading"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
            >
              <div className="loading-spinner-circle"></div>
              <h3>Submitting Digital Application</h3>
              <p className="pulse-text">{submitPhase}</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
