import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getSchemes as fetchSchemesFromAPI } from '../../services/schemeService'
import { getApplications } from '../../services/applicationService'
import logo from '../../assets/icons/logo.png'
import api from '../../services/api'
import '../../styles/Dashboard.css'
import '../../styles/SchemeDetail.css'

function getApplicationStatus(app) {
  return String(app?.applicationStatus || app?.status || '').toUpperCase()
}

function getWorkflowStage(app) {
  return String(app?.currentStage || app?.workflowStage || '').toUpperCase()
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

function formatApplicationDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getStatusLabel(status) {
  switch (String(status || '').toUpperCase()) {
    case 'DRAFT':
    case 'PENDING':
      return 'Application started'
    case 'SUBMITTED':
      return 'Submitted to Field Officer'
    case 'FIELD_OFFICER':
      return 'Field Officer review'
    case 'DISTRICT_OFFICER':
      return 'District Officer review'
    case 'FINANCE_OFFICER':
      return 'Finance Officer review'
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

function getStatusHint(status) {
  switch (String(status || '').toUpperCase()) {
    case 'DRAFT':
    case 'PENDING':
      return 'Your application is saved, but it has not been submitted yet.'
    case 'SUBMITTED':
      return 'The application has been submitted and is now with the Field Officer.'
    case 'FIELD_OFFICER':
      return 'The Field Officer is reviewing your application details.'
    case 'DISTRICT_OFFICER':
      return 'The District Officer is reviewing the field verification outcome.'
    case 'FINANCE_OFFICER':
      return 'The Finance Officer is completing the final sanction review.'
    case 'UNDER_REVIEW':
      return 'The officer team is checking your submission.'
    case 'APPROVED':
      return 'Your application has cleared review.'
    case 'REJECTED':
      return 'This application was rejected after review.'
    case 'DISBURSED':
      return 'Funds have been released for this application.'
    default:
      return 'Open the scheme details for the full application flow.'
  }
}

function getLocationForStatus(status) {
  switch (String(status || '').toUpperCase()) {
    case 'SUBMITTED':
    case 'FIELD_OFFICER':
      return 'Field Officer Review Desk'
    case 'UNDER_REVIEW':
      return 'Officer Review Cell'
    case 'DISTRICT_OFFICER':
      return 'District Review Cell'
    case 'FINANCE_OFFICER':
      return 'Finance Sanction Desk'
    case 'APPROVED':
      return 'Sanction & Approval Desk'
    case 'DISBURSED':
      return 'DBT Settlement Desk'
    case 'REJECTED':
      return 'Review Closed'
    default:
      return 'Application Intake Desk'
  }
}

function buildActivityLog(application) {
  const status = getApplicationStatus(application)
  const trackingKey = getTrackingKey(application)
  const submittedOn = formatApplicationDate(application?.submittedDate || application?.createdAt)
  const items = []

  if (application?.createdAt) {
    items.push({
      time: formatApplicationDate(application.createdAt),
      title: 'Draft Saved',
      note: 'Your application draft is available in the system.',
    })
  }

  if (status !== 'DRAFT' && status !== 'PENDING') {
    items.push({
      time: submittedOn,
      title: 'Application Submitted Successfully',
      note: 'Completed',
    })
  }

  if (trackingKey === 'FIELD_OFFICER' || trackingKey === 'DISTRICT_OFFICER' || trackingKey === 'FINANCE_OFFICER' || status === 'APPROVED' || status === 'DISBURSED') {
    items.push({
      time: 'Now',
      title: 'File forwarded to Field Officer',
      note: 'Completed',
    })
  }

  if (trackingKey === 'DISTRICT_OFFICER' || trackingKey === 'FINANCE_OFFICER' || status === 'APPROVED' || status === 'DISBURSED') {
    items.push({
      time: 'Now',
      title: 'File forwarded to District Officer',
      note: 'Completed',
    })
  }

  if (trackingKey === 'FINANCE_OFFICER' || status === 'APPROVED' || status === 'DISBURSED') {
    items.push({
      time: 'Now',
      title: 'File forwarded to Finance Officer',
      note: 'Completed',
    })
  }

  if (status === 'APPROVED' || status === 'DISBURSED') {
    items.push({
      time: 'Now',
      title: 'Application Approved',
      note: 'Completed',
    })
  }

  if (status === 'DISBURSED') {
    items.push({
      time: 'Now',
      title: 'Funds Disbursed',
      note: 'Completed',
    })
  }

  if (status === 'REJECTED') {
    items.push({
      time: 'Now',
      title: 'Application Rejected',
      note: 'Completed',
    })
  }

  return items.length > 0
    ? items
    : [{
        time: '-',
        title: 'No tracking events yet',
        note: 'Your application timeline will appear here after submission.',
      }]
}

function getStepTone(step, currentIndex) {
  const statusSteps = ['DRAFT', 'PENDING', 'SUBMITTED', 'FIELD_OFFICER', 'DISTRICT_OFFICER', 'FINANCE_OFFICER', 'APPROVED', 'DISBURSED', 'REJECTED']
  const stepIndex = statusSteps.indexOf(step)
  if (currentIndex > stepIndex) return 'done'
  if (currentIndex === stepIndex) return 'active'
  return 'pending'
}

function getTrackingKey(application) {
  const status = getApplicationStatus(application)
  const workflowStage = getWorkflowStage(application)

  if (workflowStage === 'FIELD_OFFICER' || workflowStage === 'DISTRICT_OFFICER' || workflowStage === 'FINANCE_OFFICER') {
    return workflowStage
  }

  if (status === 'APPROVED' || status === 'DISBURSED' || status === 'REJECTED') {
    return status
  }

  if (status === 'SUBMITTED') {
    return 'SUBMITTED'
  }

  if (status === 'UNDER_REVIEW') {
    return workflowStage || 'FIELD_OFFICER'
  }

  if (status === 'PENDING') {
    return 'PENDING'
  }

  return 'DRAFT'
}

export default function ApplicationTracking() {
  const navigate = useNavigate()
  const { schemeCode } = useParams()

  const [profile, setProfile] = useState(null)
  const [schemes, setSchemes] = useState([])
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadPage() {
      try {
        const [profileRes, schemesData, applicationsData] = await Promise.all([
          api.get('/gov/auth/profile/get'),
          fetchSchemesFromAPI('All'),
          getApplications(),
        ])

        const profileData = profileRes.data?.data || profileRes.data || null
        setProfile(profileData)
        setSchemes(Array.isArray(schemesData) ? schemesData : schemesData?.data || [])
        setApplications(Array.isArray(applicationsData) ? applicationsData : applicationsData?.data || [])
      } catch (error) {
        console.error('Failed to load tracking page:', error)
        navigate('/login')
      } finally {
        setLoading(false)
      }
    }

    loadPage()
  }, [navigate])

  const scheme = schemes.find(item => item.schemeCode === schemeCode || item.id === schemeCode)
  const application = getApplicationForScheme(applications, schemeCode)
  const applicationStatus = getApplicationStatus(application)
  const trackingKey = getTrackingKey(application)
  const hasTrackableApplication = Boolean(application && !isDraftStatus(applicationStatus))
  const activityLog = buildActivityLog(application)
  const currentLocation = getLocationForStatus(trackingKey)

  const statusSteps = ['DRAFT', 'PENDING', 'SUBMITTED', 'FIELD_OFFICER', 'DISTRICT_OFFICER', 'FINANCE_OFFICER', 'APPROVED', 'DISBURSED']
  const currentIndex = statusSteps.indexOf(trackingKey)
  const progressCards = useMemo(() => statusSteps.map((step) => ({
    key: step,
    label: step === 'FIELD_OFFICER'
      ? 'Field Officer'
      : step === 'DISTRICT_OFFICER'
        ? 'District Officer'
        : step === 'FINANCE_OFFICER'
          ? 'Finance Officer'
          : step.split('_').join(' '),
    tone: getStepTone(step, currentIndex),
  })), [currentIndex])

  if (loading) {
    return (
      <div className="dashboard-layout" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        Loading...
      </div>
    )
  }

  if (!scheme) {
    return (
      <div className="dashboard-layout" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <div className="tracking-card application-tracking-gate">
          <h2>Scheme not found</h2>
          <p>We could not load that scheme. Please go back and try again.</p>
          <Link to="/dashboard" className="button button--primary">Back to Dashboard</Link>
        </div>
      </div>
    )
  }

  if (!hasTrackableApplication) {
    return (
      <div className="scheme-detail-layout">
        <header className="topbar">
          <div className="topbar__brand">
            <img src={logo} alt="GS Gov Subsidy Logo" className="brand-logo" />
            <div>
              <strong>GS Gov Subsidy</strong>
              <span>Application Tracking</span>
            </div>
          </div>

          <div className="topbar__user-info">
            <span className="user-badge">
              <span className="user-badge__dot"></span>
              {profile?.fullName || 'Beneficiary'}
            </span>
            <Link to="/dashboard" className="btn-logout" style={{ textDecoration: 'none' }}>
              Back to Dashboard
            </Link>
          </div>
        </header>

        <main className="scheme-main application-tracking-main">
          <div className="application-tracking-hero">
            <div className="application-tracking-hero__copy">
              <div className="pane-header" style={{ marginBottom: '1rem' }}>
                <h2>Application Tracking</h2>
                <p>Monitor the progress of your active subsidy application.</p>
              </div>
              <div className="application-tracking-hero__summary">
                <div>
                  <span className="meta-label">Scheme</span>
                  <div className="meta-value">{scheme.name}</div>
                </div>
                <div>
                  <span className="meta-label">Applicant</span>
                  <div className="meta-value">{profile?.fullName || 'Beneficiary'}</div>
                </div>
                <div>
                  <span className="meta-label">Status</span>
                  <div className="meta-value">No submitted application</div>
                </div>
              </div>
            </div>
            <span className="tracking-badge tracking-badge--draft">Draft</span>
          </div>

          <div className="scheme-grid-detail application-tracking-grid">
            <div className="scheme-info-panel application-tracking-empty-panel">
              <span className={`scheme-card__category category--${String(scheme.category || '').toLowerCase()}`}>
                {scheme.category}
              </span>
              <h1 className="scheme-title">{scheme.name}</h1>
              <p className="scheme-desc-long">{scheme.description}</p>
              <div className="detail-section-block">
                <h3>What to do next</h3>
                <p className="eligibility-desc">
                  You do not have a submitted beneficiary record for this scheme yet. Open the scheme page to continue your application.
                </p>
                <Link to={`/scheme/${scheme.schemeCode}`} className="button button--primary btn-apply">
                  View Scheme Details
                </Link>
              </div>
            </div>

            <div className="scheme-action-panel">
              <div className="gate-card application-tracking-gate">
                <h3>Application Gateway</h3>
                <p className="eligibility-desc">Once your application is submitted, the full tracking timeline will appear here.</p>
                <Link to={`/scheme/${scheme.schemeCode}`} className="button button--primary btn-apply" style={{ width: '100%', textAlign: 'center' }}>
                  Continue Application
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="scheme-detail-layout application-tracking-layout">
      <header className="topbar">
        <div className="topbar__brand">
          <img src={logo} alt="GS Gov Subsidy Logo" className="brand-logo" />
          <div>
            <strong>GS Gov Subsidy</strong>
            <span>Application Tracking</span>
          </div>
        </div>

        <div className="topbar__user-info">
          <span className="user-badge">
            <span className="user-badge__dot"></span>
            {profile?.fullName || 'Beneficiary'}
          </span>
          <Link to="/dashboard" className="btn-logout" style={{ textDecoration: 'none' }}>
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="scheme-main application-tracking-main">
        <motion.div
          className="application-tracking-hero"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="application-tracking-hero__copy">
            <div className="pane-header" style={{ marginBottom: '1rem' }}>
              <h2>Application Tracking</h2>
              <p>Monitor the progress of your active subsidy application.</p>
            </div>
            <div className="application-tracking-hero__summary">
              <div>
                <span className="meta-label">Application</span>
                <div className="meta-value">{application.applicationCode || application.applicationId || '-'}</div>
              </div>
              <div>
                <span className="meta-label">Applicant</span>
                <div className="meta-value">{application.applicantName || application.applicant || profile?.fullName || 'Beneficiary'}</div>
              </div>
              <div>
                <span className="meta-label">Scheme</span>
                <div className="meta-value">{scheme.name}</div>
              </div>
            </div>
          </div>
          <span className={`tracking-badge tracking-badge--${trackingKey.toLowerCase()}`}>
            {getStatusLabel(trackingKey)}
          </span>
        </motion.div>

        <div className="application-tracking-grid">
          <div className="application-tracking-grid__left">
            <div className="tracking-card application-tracking-card">
              <div className="tracking-card__header application-tracking-card__header">
                <h4>Application Progress</h4>
                <span className={`tracking-badge tracking-badge--${trackingKey.toLowerCase()}`}>
                  {getStatusLabel(trackingKey)}
                </span>
              </div>

              <div className="application-tracking-progress">
                {progressCards.map((step, index) => (
                  <div key={step.key} className={`application-tracking-step is-${step.tone}`}>
                    <div className="application-tracking-step__icon">
                      {step.tone === 'done' ? '✓' : index + 1}
                    </div>
                    <div className="application-tracking-step__label">{step.label}</div>
                    <div className="application-tracking-step__desc">
                      {step.key === 'DRAFT' && 'Saved'}
                      {step.key === 'PENDING' && 'Eligible'}
                      {step.key === 'SUBMITTED' && 'Sent to Field Officer'}
                      {step.key === 'FIELD_OFFICER' && 'Field verification'}
                      {step.key === 'DISTRICT_OFFICER' && 'District review'}
                      {step.key === 'FINANCE_OFFICER' && 'Finance sanction'}
                      {step.key === 'APPROVED' && 'Approved'}
                      {step.key === 'DISBURSED' && 'Funds released'}
                      {step.key === 'REJECTED' && 'Rejected'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="tracking-card application-tracking-card">
              <div className="tracking-card__header application-tracking-card__header">
                <h4>Application Details</h4>
                <span className={`tracking-badge tracking-badge--${trackingKey.toLowerCase()}`}>
                  {getStatusLabel(trackingKey)}
                </span>
              </div>

              <div className="tracking-modal__grid application-tracking-details">
                <div>
                  <span className="meta-label">Application Code</span>
                  <div className="meta-value">{application.applicationCode || application.applicationId || '-'}</div>
                </div>
                <div>
                  <span className="meta-label">Scheme Name</span>
                  <div className="meta-value">{scheme.name}</div>
                </div>
                <div>
                  <span className="meta-label">Submitted On</span>
                  <div className="meta-value">{formatApplicationDate(application.submittedDate || application.createdAt)}</div>
                </div>
                <div>
                  <span className="meta-label">Phone</span>
                  <div className="meta-value">{application.phone || profile?.mobileNo || '-'}</div>
                </div>
              </div>

              {application.remarks && (
                <div className="application-tracking-notes">
                  <span className="meta-label">Officer remarks</span>
                  <p>{application.remarks}</p>
                </div>
              )}
            </div>
          </div>

          <div className="application-tracking-grid__right">
            <div className="tracking-card application-tracking-card">
              <div className="tracking-card__header application-tracking-card__header">
                <h4>Current Location</h4>
                <span className={`tracking-badge tracking-badge--${trackingKey.toLowerCase()}`}>
                  {getStatusLabel(trackingKey)}
                </span>
              </div>
              <div className="tracking-modal__status application-tracking-location">
                <div className="meta-value application-tracking-location__title">{currentLocation}</div>
                <p>{getStatusHint(applicationStatus)}</p>
              </div>
            </div>

            <div className="tracking-card application-tracking-card">
              <div className="tracking-card__header application-tracking-card__header">
                <h4>Activity Log</h4>
                <span className="tracking-card__cta">Live</span>
              </div>
              <div className="application-tracking-activity">
                {activityLog.map((item, index) => (
                  <div key={`${item.title}-${index}`} className="application-tracking-activity__item">
                    <span className={`application-tracking-activity__dot ${index === 0 ? 'is-live' : ''}`} />
                    <div>
                      <div className="application-tracking-activity__time">{item.time}</div>
                      <div className="application-tracking-activity__title">{item.title}</div>
                      <div className="application-tracking-activity__note">{item.note}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
