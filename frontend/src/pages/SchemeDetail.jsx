import '../styles/SchemeDetail.css';
import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getSchemes } from '../services/schemeService'
import { getApplications, submitApplicationBySchemeCode, cancelApplicationById, uploadApplicationDocuments } from '../services/applicationService'
import { runEligibilityEngine } from '../services/eligibilityService'
import api from '../services/api'

function normalizeRuleField(fieldName) {
  return String(fieldName || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
}

function getProfileSeedValue(profile, fieldName) {
  switch (normalizeRuleField(fieldName)) {
    case 'AGE':
      return profile?.age ?? profile?.dobAge ?? profile?.yearsOld ?? ''
    case 'INCOME':
      return profile?.annualIncome ?? profile?.monthlyIncome ?? ''
    case 'CGPA':
      return profile?.cgpa ?? profile?.educationScore ?? profile?.marksPercentage ?? ''
    case 'CASTE':
      return profile?.caste || profile?.category || ''
    case 'STATE':
      return profile?.state || ''
    case 'GENDER':
      return profile?.gender || ''
    default:
      return profile?.[String(fieldName || '').toLowerCase()] || ''
  }
}

function getApplicationStatus(application) {
  return String(application?.applicationStatus || application?.status || '').toUpperCase()
}

function isDraftStatus(status) {
  return status === 'DRAFT' || status === 'PENDING'
}

function humanizeEnum(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase())
}

function getDocumentDefinitions(scheme) {
  const configuredDocuments = Array.isArray(scheme?.documents) ? scheme.documents : []

  if (configuredDocuments.length === 0) {
    return [
      { key: 'AADHAAR', documentType: 'AADHAAR', label: 'Identity proof', hint: 'Aadhaar, voter ID, or equivalent', mandatory: true },
      { key: 'INCOME_CERTIFICATE', documentType: 'INCOME_CERTIFICATE', label: 'Income proof', hint: 'Certificate or salary slip', mandatory: true },
      { key: 'LAND_RECORD', documentType: 'LAND_RECORD', label: 'Supporting document', hint: 'Land record, category proof, or scheme-specific file', mandatory: true },
    ]
  }

  return configuredDocuments.map((doc, index) => {
    const documentType = String(doc.documentType || `DOCUMENT_${index + 1}`).trim().toUpperCase()
    return {
      key: documentType,
      documentType,
      label: humanizeEnum(documentType),
      hint: doc.mandatory === false ? 'Optional document' : 'Required document',
      mandatory: doc.mandatory !== false,
    }
  })
}

export default function SchemeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [schemes, setSchemes] = useState([])
  const [loadingSchemes, setLoadingSchemes] = useState(true)
  const scheme = schemes.find(s => s.schemeCode === id)
  const [profile, setProfile] = useState(null)
  const [applications, setApplications] = useState([])
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [loadingApplications, setLoadingApplications] = useState(true)
  
  // UI views: 'detail' | 'apply' | 'docs'
  const [viewState, setViewState] = useState('detail')
  
  // Terms agreement state
  const [agreed, setAgreed] = useState(false)
  
  // Application Form Inputs
  const [formInputs, setFormInputs] = useState({})
  const [eligibilityResult, setEligibilityResult] = useState(null)
  const [eligibilityError, setEligibilityError] = useState('')
  const [isCheckingScore, setIsCheckingScore] = useState(false)
  const [docsError, setDocsError] = useState('')
  const [isSubmittingDocs, setIsSubmittingDocs] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [docsFiles, setDocsFiles] = useState({})

  useEffect(() => {
    async function loadSchemes() {
      try {
        setLoadingSchemes(true)
        const data = await getSchemes()
        setSchemes(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Failed to load schemes:', error.message)
        setSchemes([])
      } finally {
        setLoadingSchemes(false)
      }
    }
    loadSchemes()
  }, [])

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoadingProfile(true)
        const res = await api.get('/gov/auth/profile/get')
        const profileData = res.data?.data || res.data || null
        setProfile(profileData)
      } catch {
        setProfile(null)
      } finally {
        setLoadingProfile(false)
      }
    }
    loadProfile()
  }, [])

  useEffect(() => {
    async function loadApplications() {
      try {
        setLoadingApplications(true)
        const data = await getApplications()
        const list = Array.isArray(data) ? data : data?.data || []
        setApplications(list)
      } catch {
        setApplications([])
      } finally {
        setLoadingApplications(false)
      }
    }
    loadApplications()
  }, [])

  const refreshApplications = async () => {
    try {
      setLoadingApplications(true)
      const data = await getApplications()
      const list = Array.isArray(data) ? data : data?.data || []
      setApplications(list)
      return list
    } catch {
      setApplications([])
      return []
    } finally {
      setLoadingApplications(false)
    }
  }

  useEffect(() => {
    if (!scheme?.natureInputs?.length) return
    const initial = {}
    scheme.natureInputs.forEach(input => {
      initial[input.name] = getProfileSeedValue(profile, input.name)
    })
    setFormInputs(initial)
  }, [scheme?.schemeCode, profile])

  useEffect(() => {
    if (viewState !== 'success') return

    const redirectTimer = setTimeout(() => {
      navigate('/dashboard', { replace: true })
    }, 1800)

    return () => clearTimeout(redirectTimer)
  }, [navigate, viewState])

  if (loadingSchemes || loadingProfile) return null
  if (!scheme) return null

  const requiredDocuments = getDocumentDefinitions(scheme)

  const matchingApplication = applications.find(app => {
    const appSchemeCode = app?.schemeCode || app?.schemeId || app?.scheme?.schemeCode
    return appSchemeCode === scheme.schemeCode
  })
  const currentApplicationStatus = getApplicationStatus(matchingApplication)
  const isDraftApplication = matchingApplication ? isDraftStatus(currentApplicationStatus) : false
  const hasProfile = !!profile
  const eligibilityPayload = {
    schemeCode: scheme.schemeCode,
    fields: Object.entries(formInputs)
      .filter(([, value]) => value !== '' && value !== null && value !== undefined)
      .map(([fieldName, value]) => ({
        fieldName: normalizeRuleField(fieldName),
        value: String(value),
      })),
  }
  const eligibilityScore = eligibilityResult?.score ?? 0
  const eligibilityThreshold = Number(scheme.minimumEligibleScore || 0)
  const eligibilityGap = eligibilityScore - eligibilityThreshold
  const eligibilityState = !eligibilityResult
    ? 'idle'
    : eligibilityResult.status
      ? 'pass'
      : 'fail'
  const scoreRingProgress = eligibilityThreshold > 0
    ? Math.max(0, Math.min(100, Math.round((eligibilityScore / eligibilityThreshold) * 100)))
    : 0
  const canProceedToDocs = Boolean(
    eligibilityResult &&
    eligibilityResult.status &&
    eligibilityScore >= eligibilityThreshold
  )
  const hasInitiatedScoring = Boolean(eligibilityResult || eligibilityError || isCheckingScore)

  // Handle Form Change
  const handleInputChange = (e) => {
    setFormInputs(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleCheckScore = async () => {
    if (!scheme?.rules?.length) {
      setEligibilityError('No eligibility rules are configured for this scheme yet.')
      setEligibilityResult(null)
      return
    }

    setIsCheckingScore(true)
    setEligibilityError('')
    setViewState('apply')

    try {
      const response = await runEligibilityEngine(eligibilityPayload)
      setEligibilityResult(response)
      await refreshApplications()
      if (response?.status === false) {
        setEligibilityError(response?.message || 'Eligibility engine marked the application as not eligible.')
      }
    } catch (error) {
      console.error('Failed to check score:', error.message)
      setEligibilityError(error.message || 'Eligibility engine request failed.')
    } finally {
      setIsCheckingScore(false)
    }
  }

  const handleGoForDocsSubmission = () => {
    if (!canProceedToDocs) return
    setDocsError('')
    setViewState('docs')
  }

  const handleCancelApplicationProcess = async () => {
    try {
      const applicationId = matchingApplication?.id || matchingApplication?.applicationId
      if (applicationId) {
        await cancelApplicationById(applicationId)
      }
      setDocsFiles({})
      setEligibilityResult(null)
      setEligibilityError('')
      setDocsError('')
      setAgreed(false)
      setShowCancelConfirm(false)
      setViewState('detail')
      navigate('/dashboard', { replace: true })
    } catch (error) {
      setDocsError(error.message || 'Failed to cancel the application process.')
    }
  }

  const handleDocFileChange = (e) => {
    const { name, files } = e.target
    setDocsFiles(prev => ({ ...prev, [name]: files?.[0] || null }))
  }

  const handleSubmitDocuments = async () => {
    if (!canProceedToDocs) return

    const missingDocs = requiredDocuments.filter(doc => doc.mandatory && !docsFiles[doc.key])

    if (missingDocs.length > 0) {
      setDocsError(`Please upload all required documents before submitting: ${missingDocs.map(doc => doc.label).join(', ')}.`)
      return
    }

    setDocsError('')
    setIsSubmittingDocs(true)

    try {
      const selectedDocs = requiredDocuments
        .map(doc => ({ ...doc, file: docsFiles[doc.key] }))
        .filter(doc => doc.file)

      if (selectedDocs.length > 0) {
        await uploadApplicationDocuments(
          scheme.schemeCode,
          selectedDocs.map(doc => doc.file),
          selectedDocs.map(doc => doc.documentType)
        )
      }

      await submitApplicationBySchemeCode(scheme.schemeCode)
      await refreshApplications()
      setViewState('success')
      setDocsFiles({})
    } catch (error) {
      setDocsError(error.message || 'Failed to upload documents and submit the application.')
    } finally {
      setIsSubmittingDocs(false)
    }
  }

  const openCancelConfirmation = () => {
    setShowCancelConfirm(true)
    setDocsError('')
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
              <span className={`scheme-card__category category--${String(scheme.category || '').toLowerCase()}`}>
                {scheme.category}
              </span>
              
              <h1 className="scheme-title">{scheme.name}</h1>
              <p className="scheme-desc-long">{scheme.description}</p>

              {scheme.benefit !== null && scheme.benefit !== undefined && scheme.benefit !== '' && (
                <div className="scheme-benefit-block">
                  <h3 className="section-subtitle-detail">Benefit Amount</h3>
                  <p className="scheme-desc-long">₹{Number(scheme.benefit).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              )}

              {/* Dynamic Nature-specific info details */}
              <h3 className="section-subtitle-detail">Scheme Specific Specifications</h3>
              <div className="nature-detail-grid">
                {(scheme.natureDetails || []).map((det, index) => (
                  <div className="nature-detail-card" key={index}>
                    <span className="nature-detail-label">{det.label}</span>
                    <span className="nature-detail-val">{det.value}</span>
                  </div>
                ))}
              </div>

              {/* Eligibility criteria block */}
              <div className="detail-section-block">
                <h3>Eligibility Requirements</h3>
                <p className="eligibility-desc">{scheme.eligibilityText}</p>
                <div className="eligibility-status-large">
                  <span className="elig-label">Review Mode:</span>
                  <span className="badge-status-large status-applied">Details only, no profile check on this page</span>
                </div>

                <div className="elig-reasons-box">
                  <p className="box-title">What happens next:</p>
                  <ul>
                    <li>You can read the scheme details and rules without any age or profile validation here.</li>
                    <li>Application-specific checks, if any, happen only when you submit the form.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Right side interactive application gateway */}
            <div className="scheme-action-panel">
              <div className="gate-card">
                <h3>Application Gateway</h3>
                
                {loadingApplications ? (
                  <div className="ineligible-gateway-info">
                    <p>Checking application status...</p>
                  </div>
                ) : hasProfile && matchingApplication ? (
                  <div className="applied-gateway-info">
                    <p>
                      {isDraftApplication
                        ? 'You have a saved draft application for this subsidy scheme.'
                        : 'You have already submitted an application for this subsidy scheme.'}
                    </p>
                    <div className="action-row">
                      <span className="label">Current Status:</span>
                      <span className={`val badge-status--${String(currentApplicationStatus || 'draft').toLowerCase()}`}>
                        {currentApplicationStatus || 'DRAFT'}
                      </span>
                    </div>

                    {isDraftApplication ? (
                      <button
                        type="button"
                        className="button button--primary btn-apply"
                        onClick={() => setViewState('apply')}
                        style={{ width: '100%', marginTop: '0.8rem' }}
                      >
                        Continue Application
                      </button>
                    ) : (
                      <Link to="/dashboard" className="button button--ghost" style={{ width: '100%', marginTop: '0.8rem', textAlign: 'center' }}>
                        Track Application
                      </Link>
                    )}
                  </div>
                ) : !hasProfile ? (
                  <div className="ineligible-gateway-info">
                    <p>You can view the scheme details right now.</p>
                    <p className="advice">Sign in to continue with the application flow.</p>
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

                    {hasProfile && (
                      <button 
                        onClick={() => setViewState('apply')}
                        disabled={!agreed}
                        className="button button--primary btn-apply"
                        style={{ width: '100%', marginTop: '1rem' }}
                      >
                        Proceed towards Application Form
                      </button>
                    )}
                  </div>
                )}
              </div>

            </div>
          </motion.div>
        ) : hasProfile ? (
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

            <form onSubmit={(e) => e.preventDefault()} className="application-form">
              <div className="form-flex-columns">
                
                {/* Admin-configured scheme fields */}
                <div className="form-column-inputs">
                  <h3>1. Scheme-Specific Information</h3>
                  <p className="helper-text">
                    Fill only the fields configured by the scheme administrator for this scheme.
                  </p>

                  <div className="scheme-dynamic-inputs">
                    {(scheme.natureInputs || []).length > 0 ? (
                      (scheme.natureInputs || []).map((input) => (
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
                      ))
                    ) : (
                      <div className="elig-reasons-box" style={{ marginTop: 0 }}>
                        <p className="box-title">No additional fields configured</p>
                        <p className="box-tip">This scheme does not currently require any admin-defined input fields.</p>
                      </div>
                    )}
                  </div>

                </div>

                <div className="form-column-actions">
                  <div className="form-action-navs" style={{ marginTop: '1.6rem', flexWrap: 'wrap', gap: '0.9rem' }}>
                    <button 
                      type="button" 
                      className="button button--ghost"
                      onClick={openCancelConfirmation}
                    >
                      Cancel Application Process
                    </button>

                    <button 
                      type="button" 
                      className="button button--primary btn-apply"
                      onClick={handleCheckScore}
                      disabled={isCheckingScore}
                    >
                      {isCheckingScore ? 'Checking Score...' : 'Check Score'}
                    </button>

                    {hasInitiatedScoring && canProceedToDocs && (
                      <button 
                        type="button" 
                        className="button button--ghost btn-apply"
                        onClick={handleGoForDocsSubmission}
                      >
                        Go for Docs Submission
                      </button>
                    )}
                  </div>

                  {(eligibilityResult || eligibilityError) && (
                    <motion.div
                      className="eligibility-console-card"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.28 }}
                    >
                      <div className="eligibility-console__header">
                        <div>
                          <p className="console-eyebrow">Eligibility Engine</p>
                          <h3>Live scoring result</h3>
                          <p className="eligibility-console__copy">
                            The engine evaluates your submitted profile against the scheme rules and streams back a score.
                          </p>
                        </div>
                        <span className="console-endpoint">ENGINE://RUNNING</span>
                      </div>

                      {eligibilityResult ? (
                        <>
                          <div className="eligibility-score-hero">
                            <div
                              className="eligibility-score-ring"
                              style={{
                                '--score-progress': `${scoreRingProgress}%`,
                                '--score-accent': eligibilityResult.status ? '#8ed66a' : '#ff6b76',
                              }}
                              aria-label={`Eligibility score ${Number(eligibilityScore || 0).toFixed(1)}`}
                            >
                              <div className="eligibility-score-ring__inner">
                                <div className="eligibility-score-value">
                                  {Number(eligibilityScore || 0).toFixed(1)}
                                </div>
                                <div className="eligibility-score-label">Score</div>
                              </div>
                            </div>

                            <div className="eligibility-score-meta">
                              <span className={`eligibility-state-badge is-${eligibilityState}`}>
                                {eligibilityState === 'idle'
                                  ? 'Pending'
                                  : eligibilityState === 'pass'
                                    ? 'Eligible'
                                    : 'Not eligible'}
                              </span>
                              <div className="eligibility-threshold">
                                Threshold: <strong>{Number(eligibilityThreshold || 0).toFixed(1)}</strong>
                              </div>
                              <div className="eligibility-gap">
                                Gap: <strong>{eligibilityGap >= 0 ? `+${eligibilityGap.toFixed(1)}` : eligibilityGap.toFixed(1)}</strong>
                              </div>
                              <div className="eligibility-result-banner">
                                <strong>{eligibilityResult.message}</strong>
                                <span>
                                  {canProceedToDocs
                                    ? 'Documents can now be submitted.'
                                    : 'The engine did not clear the threshold.'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="eligibility-field-stack">
                            <div className="eligibility-rule-row">
                              <span className="eligibility-rule-card__name">Computed score</span>
                              <strong>{Number(eligibilityScore || 0).toFixed(1)}</strong>
                            </div>
                            <div className="eligibility-rule-row">
                              <span className="eligibility-rule-card__name">Minimum required</span>
                              <strong>{eligibilityThreshold.toFixed ? eligibilityThreshold.toFixed(1) : eligibilityThreshold}</strong>
                            </div>
                            <div className="eligibility-rule-row">
                              <span className="eligibility-rule-card__name">Decision</span>
                              <strong>{eligibilityResult.status ? 'PASS' : 'FAIL'}</strong>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="eligibility-error-box">
                          {eligibilityError}
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>

              </div>
            </form>

            {viewState === 'docs' && (
              <motion.div
                className="docs-submission-panel"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="docs-submission-panel__header">
                  <div>
                    <p className="console-eyebrow">Document submission</p>
                    <h3>2. Supporting Documents</h3>
                  </div>
                  <span className="console-endpoint">Unlocked after eligibility check</span>
                </div>

                <p className="eligibility-console__copy">
                  Your score has cleared the threshold. Upload the supporting files required for this scheme.
                </p>

                <div className="docs-grid">
                  {requiredDocuments.map((doc) => (
                    <label className="doc-upload-card" key={doc.key}>
                      <span className="doc-upload-card__label">{doc.label}</span>
                      <span className="doc-upload-card__hint">{doc.hint}</span>
                      <input
                        type="file"
                        name={doc.key}
                        onChange={handleDocFileChange}
                      />
                      <span className="doc-upload-card__file">
                        {docsFiles[doc.key]?.name || 'No file selected'}
                      </span>
                    </label>
                  ))}
                </div>

                <div className="form-action-navs" style={{ marginTop: '1.25rem', flexWrap: 'wrap', gap: '0.9rem' }}>
                  <button 
                    type="button" 
                    className="button button--ghost"
                    onClick={openCancelConfirmation}
                  >
                    Cancel Application Process
                  </button>

                  <button 
                    type="button" 
                    className="button button--primary btn-apply"
                    onClick={handleSubmitDocuments}
                    disabled={!canProceedToDocs || isSubmittingDocs}
                  >
                    {isSubmittingDocs ? 'Submitting...' : 'Submit Documents'}
                  </button>
                </div>

                {docsError && (
                  <div className="eligibility-error-box" style={{ marginTop: '1rem' }}>
                    {docsError}
                  </div>
                )}
              </motion.div>
            )}

            {viewState === 'success' && (
              <motion.div
                className="docs-submission-panel"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="docs-submission-panel__header">
                  <div>
                    <p className="console-eyebrow">Application submitted</p>
                    <h3>Application submitted successfully</h3>
                  </div>
                  <span className="console-endpoint">Redirecting to dashboard</span>
                </div>

                <p className="eligibility-console__copy">
                  Your supporting documents have been recorded. You will be returned to the Dashboard shortly.
                </p>
              </motion.div>
            )}

            {showCancelConfirm && (
              <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="cancel-application-title">
                <motion.div
                  className="modal-panel modal-panel--danger"
                  initial={{ opacity: 0, scale: 0.96, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                >
                  <h3 id="cancel-application-title">Cancel application process?</h3>
                  <p className="danger-text">
                    If you continue, we will delete the saved application record, generated application code, form fields, and uploaded documents from the database.
                  </p>

                  <div className="modal-actions">
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={() => setShowCancelConfirm(false)}
                    >
                      Keep Application
                    </button>
                    <button
                      type="button"
                      className="btn-danger-confirm"
                      onClick={handleCancelApplicationProcess}
                    >
                      Yes, Cancel and Delete
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </motion.div>
        ) : null}
      </main>
    </div>
  )
}
