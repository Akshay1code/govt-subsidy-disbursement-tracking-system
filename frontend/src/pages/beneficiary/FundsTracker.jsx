import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  FaFileAlt,
  FaCheckCircle,
  FaMinusCircle,
  FaRegCircle,
  FaHeadset,
  FaChevronRight,
  FaUpload,
  FaExclamationTriangle,
  FaClock,
} from 'react-icons/fa'
import { getSchemes } from '../../services/schemeService'
import { getApplications } from '../../services/applicationService'
import { getCurrentBeneficiaryRecord, getDisbursementPlanByApplicationId, submitProof } from '../../services/fundsService'
import api from '../../services/api'
import '../../styles/Dashboard.css'
import '../../styles/FundsTracker.css'

function formatCurrency(value) {
  const amount = Number(value || 0)
  const hasDecimals = amount % 1 !== 0
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  })}`
}

function formatDate(value, prefix = '') {
  if (!value) return `${prefix}N/A`
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return `${prefix}N/A`
  return `${prefix}${date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
}

function getApplicationSchemeCode(app) {
  return app?.schemeCode || app?.schemeId || app?.scheme?.schemeCode || ''
}

function buildReference(applicationCode, milestone) {
  const appCode = String(applicationCode || 'APP').toUpperCase()
  const stage = String(milestone?.stageNumber || milestone?.milestoneId || '00').padStart(2, '0')
  return `${appCode}-${stage}`
}

export default function FundsTracker() {
  const navigate = useNavigate()
  const { schemeCode } = useParams()

  const [profile, setProfile] = useState(null)
  const [schemes, setSchemes] = useState([])
  const [applications, setApplications] = useState([])
  const [beneficiaryRecord, setBeneficiaryRecord] = useState(null)
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showFullHistory, setShowFullHistory] = useState(false)

  // Proof submission modal state
  const [proofModal, setProofModal] = useState(false)
  const [proofMilestoneId, setProofMilestoneId] = useState(null)
  const [proofFile, setProofFile] = useState(null)
  const [proofNotes, setProofNotes] = useState('')
  const [proofUploading, setProofUploading] = useState(false)
  const [proofError, setProofError] = useState('')
  const [proofSuccess, setProofSuccess] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError('')

        const [profileRes, schemesData, applicationsData, beneficiaryRes] = await Promise.all([
          api.get('/gov/auth/profile/get'),
          getSchemes(),
          getApplications(),
          getCurrentBeneficiaryRecord().catch(() => null),
        ])

        const profileData = profileRes.data?.data || profileRes.data || null
        const schemeList = Array.isArray(schemesData) ? schemesData : schemesData?.data || []
        const appList = Array.isArray(applicationsData) ? applicationsData : applicationsData?.data || []
        const beneficiaryData = beneficiaryRes?.data || beneficiaryRes || null

        setProfile(profileData)
        setSchemes(schemeList)
        setApplications(appList)
        setBeneficiaryRecord(beneficiaryData)

        const app = appList.find(item => {
          const code = getApplicationSchemeCode(item)
          return code === schemeCode || String(item.schemeId) === String(schemeCode) || String(item.id) === String(schemeCode) || String(item.applicationId) === String(schemeCode)
        })
        if (!app) {
          setError('We could not find an application for this scheme in your account.')
          return
        }

        try {
          const planData = await getDisbursementPlanByApplicationId(app.id || app.applicationId)
          setPlan(planData)
        } catch (planErr) {
          console.warn('Could not load disbursement plan for application:', planErr)
        }
      } catch (err) {
        setError(err.message || 'Failed to load funds tracker.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [schemeCode])

  const app = useMemo(() => applications.find(item => {
    const code = getApplicationSchemeCode(item)
    return code === schemeCode || String(item.schemeId) === String(schemeCode) || String(item.id) === String(schemeCode) || String(item.applicationId) === String(schemeCode)
  }), [applications, schemeCode])
  const scheme = useMemo(() => schemes.find(item => item.schemeCode === schemeCode || item.id === schemeCode), [schemes, schemeCode])

  const milestones = useMemo(() => {
    const list = Array.isArray(plan?.milestones) ? [...plan.milestones] : []
    return list.sort((a, b) => Number(a?.stageNumber || 0) - Number(b?.stageNumber || 0))
  }, [plan])

  // Derive the next milestone eligible for proof submission:
  // All prior stages must be RELEASED; current stage must be PENDING or PROOF_REJECTED.
  const activeProofMilestone = useMemo(() => {
    if (milestones.length === 0) return null
    for (let i = 0; i < milestones.length; i++) {
      const m = milestones[i]
      const st = String(m?.completionStatus || '').toUpperCase()
      if (st === 'PENDING' || st === 'PROOF_REJECTED') {
        const allPriorReleased = milestones.slice(0, i).every(
          prior => String(prior?.completionStatus || '').toUpperCase() === 'RELEASED'
        )
        if (allPriorReleased) return m
      }
    }
    return null
  }, [milestones])

  function openProofModal(milestoneId) {
    setProofMilestoneId(milestoneId)
    setProofFile(null)
    setProofNotes('')
    setProofError('')
    setProofSuccess('')
    setProofModal(true)
  }

  function closeProofModal() {
    setProofModal(false)
    setProofMilestoneId(null)
    setProofFile(null)
    setProofNotes('')
    setProofError('')
    setProofSuccess('')
  }

  async function handleSubmitProof(e) {
    e.preventDefault()
    if (!proofFile) {
      setProofError('Please select a file to upload.')
      return
    }
    setProofUploading(true)
    setProofError('')
    setProofSuccess('')
    try {
      const formData = new FormData()
      formData.append('file', proofFile)
      if (proofNotes.trim()) {
        formData.append('notes', proofNotes.trim())
      }

      await submitProof(proofMilestoneId, formData)

      setProofSuccess('Proof submitted successfully. The reviewing officer has been notified.')

      // Refresh plan data
      try {
        const appId = app?.id || app?.applicationId
        if (appId) {
          const refreshed = await getDisbursementPlanByApplicationId(appId)
          setPlan(refreshed)
        }
      } catch { /* non-fatal refresh failure */ }

      setTimeout(() => closeProofModal(), 2500)
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || err.message || 'Upload failed. Please try again.'
      setProofError(msg)
    } finally {
      setProofUploading(false)
    }
  }

  // Primary source of truth: the disbursement plan returned by the backend.
  // beneficiaryRecord.sanctionedAmount / disbursedAmount are also kept up-to-date by the backend.
  const totalAllocated = Number(
    plan?.totalAmount ??
    beneficiaryRecord?.sanctionedAmount ??
    app?.amount ??
    scheme?.allocatedFunds ??
    0
  )

  const totalDisbursed = milestones.reduce((sum, milestone) => {
    const status = String(milestone?.completionStatus || '').toUpperCase()
    if (status === 'RELEASED') {
      return sum + Number(milestone?.amountReleased || milestone?.amountToRelease || 0)
    }
    return sum
  }, 0)

  const remainingBalance = Math.max(0, totalAllocated - totalDisbursed)

  const recentTransactions = milestones
    .filter(milestone => {
      const status = String(milestone?.completionStatus || '').toUpperCase()
      return status === 'RELEASED' && Number(milestone?.amountReleased || 0) > 0
    })
    .slice()
    .sort((a, b) => {
      const aDate = new Date(a.releaseDate || a.completedDate || 0).getTime()
      const bDate = new Date(b.releaseDate || b.completedDate || 0).getTime()
      return bDate - aDate
    })

  const transactionRows = recentTransactions.map((milestone) => ({
    date: milestone.releaseDate || milestone.completedDate,
    refNumber: buildReference(app?.applicationCode, milestone),
    amount: Number(milestone.amountReleased || milestone.amountToRelease || 0),
    label: milestone.milestoneName,
  }))

  const visibleTransactions = showFullHistory ? transactionRows : transactionRows.slice(0, 3)

  if (loading) {
    return (
      <div className="dashboard-layout" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        Loading...
      </div>
    )
  }

  if (error || !app) {
    return (
      <div className="dashboard-layout" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <div className="funds-empty-card">
          <h2>Funds tracker unavailable</h2>
          <p>{error || 'No application record was found for this scheme.'}</p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link to="/dashboard" className="button button--primary">Back to Dashboard</Link>
            <button className="button button--ghost" onClick={() => navigate(`/tracking/${schemeCode}`)}>
              Open application details
            </button>
          </div>
        </div>
      </div>
    )
  }

  const milestoneView = milestones.map((milestone) => {
    const statusUpper = String(milestone?.completionStatus || '').toUpperCase()
    const isReleased = statusUpper === 'RELEASED'
    const isCompleted = statusUpper === 'COMPLETED'
    const isOverdue = statusUpper === 'OVERDUE'
    const isProofSubmitted = statusUpper === 'PROOF_SUBMITTED'
    const isProofRejected = statusUpper === 'PROOF_REJECTED'

    const badgeLabel = isReleased
      ? 'Released'
      : isCompleted
        ? 'Ready'
        : isOverdue
          ? 'Overdue'
          : isProofSubmitted
            ? 'Under Review'
            : isProofRejected
              ? 'Revision Required'
              : 'Pending'

    const statusClass = isReleased
      ? 'is-completed'
      : isCompleted
        ? 'is-in-progress'
        : isOverdue
          ? 'is-overdue'
          : isProofSubmitted
            ? 'is-proof-submitted'
            : isProofRejected
              ? 'is-proof-rejected'
              : 'is-pending'

    const statusIcon = isReleased
      ? <FaCheckCircle />
      : isCompleted
        ? <FaMinusCircle />
        : isOverdue
          ? <FaMinusCircle />
          : isProofSubmitted
            ? <FaClock />
            : isProofRejected
              ? <FaExclamationTriangle />
              : <FaRegCircle />

    const statusText = isReleased
      ? 'Released'
      : isCompleted
        ? 'Awaiting Release'
        : isOverdue
          ? 'Overdue'
          : isProofSubmitted
            ? 'Under Review'
            : isProofRejected
              ? 'Proof Rejected'
              : 'Pending'

    const dateText = isReleased
      ? formatDate(milestone.releaseDate || milestone.completedDate)
      : formatDate(milestone.dueDate, 'Due: ')

    // Amount display: only show released amount when actually RELEASED; otherwise show
    // the configured stage amount so PENDING stages don't look disbursed.
    const amountValue = isReleased
      ? Number(milestone?.amountReleased || milestone?.amountToRelease || 0)
      : Number(milestone?.amountToRelease || 0)
    const amountLabel = isReleased ? 'Released' : 'Configured for'

    // Is this the active milestone the beneficiary can act on?
    const isActiveProofTarget = activeProofMilestone?.milestoneId === milestone.milestoneId

    return {
      ...milestone,
      badgeLabel,
      statusClass,
      statusIcon,
      statusText,
      dateText,
      amountValue,
      amountLabel,
      isActiveProofTarget,
      isProofSubmitted,
      isProofRejected,
    }
  })

  return (
    <div className="dashboard-layout funds-layout">
      <header className="topbar funds-topbar">
        <div className="topbar__brand funds-topbar__brand">
          <div className="funds-topbar__brand-text">
            <strong>Funds &amp; Disbursement Tracker</strong>
            <span>Monitor your allocated subsidy funds, track upcoming milestones, and review payment history.</span>
          </div>
        </div>
        <div className="topbar__user-info funds-topbar__user-info">
          <span className="user-badge funds-user-badge">
            <span className="user-badge__dot"></span>
            {profile?.fullName || 'Beneficiary'}
          </span>
          <Link to="/dashboard" className="btn-logout funds-back-btn" style={{ textDecoration: 'none' }}>
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="dashboard-main funds-main">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="funds-hero"
        >
          <h1>Funds &amp; Disbursement Tracker</h1>
          <p>Monitor your allocated subsidy funds, track upcoming milestones, and review payment history.</p>
        </motion.div>

        <section className="funds-summary-grid">
          <div className="funds-summary-card">
            <div className="funds-summary-card__label"><FaFileAlt /> Total Allocated</div>
            <div className="funds-summary-card__amount">{formatCurrency(totalAllocated)}</div>
            <div className="funds-summary-card__caption">Initial Grant + Subsidies</div>
          </div>

          <div className="funds-summary-card">
            <div className="funds-summary-card__label"><FaCheckCircle /> Total Disbursed</div>
            <div className="funds-summary-card__amount funds-summary-card__amount--success">{formatCurrency(totalDisbursed)}</div>
            <div className="funds-summary-card__caption">Successfully transferred</div>
          </div>

          <div className="funds-summary-card funds-summary-card--accent">
            <div className="funds-summary-card__label"><FaMinusCircle /> Remaining Balance</div>
            <div className="funds-summary-card__amount funds-summary-card__amount--accent">{formatCurrency(remainingBalance)}</div>
            <div className="funds-summary-card__caption">Pending completion of milestones</div>
          </div>
        </section>

        <section className="funds-content-grid">
          <div className="funds-card funds-card--timeline">
            <div className="funds-card__header">
              <h2>Disbursement Milestones</h2>
            </div>

            <div className="funds-timeline">
              {milestoneView.length > 0 ? milestoneView.map((milestone) => (
                <div className={`funds-timeline-item ${milestone.statusClass}`} key={milestone.milestoneId || milestone.stageNumber}>
                  <div className="funds-timeline-item__icon">{milestone.statusIcon}</div>
                  <div className="funds-timeline-item__content">
                    <div className="funds-timeline-item__top">
                      <div className="funds-timeline-item__heading">
                        <h3>Stage {milestone.stageNumber}: {milestone.milestoneName}</h3>
                        <p>{milestone.completionStatus === 'RELEASED'
                          ? 'Funds have been released for this milestone.'
                          : milestone.completionStatus === 'COMPLETED'
                            ? 'Milestone proof approved and awaiting fund release.'
                            : milestone.completionStatus === 'PROOF_SUBMITTED'
                              ? 'Proof submitted. The reviewing officer will approve or request revision.'
                              : milestone.completionStatus === 'PROOF_REJECTED'
                                ? 'Your submitted proof requires revision. Please resubmit.'
                                : milestone.completionStatus === 'OVERDUE'
                                  ? 'This milestone is overdue and needs attention.'
                                  : 'Awaiting the next release window.'}
                        </p>

                        {/* Rejection feedback */}
                        {milestone.isProofRejected && milestone.resolvedReason && (
                          <div className="funds-proof-rejection-note">
                            <FaExclamationTriangle className="funds-proof-rejection-icon" />
                            <span><strong>Revision required:</strong> {milestone.resolvedReason}</span>
                          </div>
                        )}
                      </div>
                      <span className={`funds-status-badge ${milestone.statusClass}`}>{milestone.statusText}</span>
                    </div>

                    <div className="funds-timeline-item__meta">
                      <span className="funds-timeline-item__date">{milestone.dateText}</span>
                      <div className="funds-timeline-item__amount-wrap">
                        <strong className={`funds-timeline-item__amount ${milestone.statusClass}`}>{formatCurrency(milestone.amountValue)}</strong>
                        <span className="funds-timeline-item__amount-label">{milestone.amountLabel}</span>
                      </div>
                    </div>

                    {/* Submit / Resubmit proof action — only on the active eligible milestone */}
                    {milestone.isActiveProofTarget && (
                      <div className="funds-proof-action">
                        <button
                          type="button"
                          className={`button funds-proof-action-btn ${milestone.isProofRejected ? 'funds-proof-action-btn--resubmit' : 'funds-proof-action-btn--submit'}`}
                          onClick={() => openProofModal(milestone.milestoneId)}
                        >
                          <FaUpload style={{ marginRight: '0.4rem' }} />
                          {milestone.isProofRejected ? 'Resubmit Proof' : 'Submit Stage Proof'}
                        </button>
                        <p className="funds-proof-action-hint">
                          {milestone.isProofRejected
                            ? 'Upload revised compliance evidence for officer review.'
                            : 'Upload compliance evidence to trigger officer review for fund release.'}
                        </p>
                      </div>
                    )}

                    {/* Proof-submitted status info */}
                    {milestone.isProofSubmitted && (
                      <div className="funds-proof-submitted-note">
                        <FaClock className="funds-proof-submitted-icon" />
                        <span>Proof is under officer review. You will be notified when approved or if revision is needed.</span>
                      </div>
                    )}
                  </div>
                </div>
              )) : (
                <div className="funds-empty-inline">
                  No milestones have been configured for this application yet.
                </div>
              )}
            </div>
          </div>

          <div className="funds-sidebar">
            {/* Disbursement Progress */}
            {milestones.length > 0 && (
              <div className="funds-card funds-card--progress">
                <div className="funds-card__header">
                  <h2>Disbursement Progress</h2>
                </div>
                <div className="funds-progress-list">
                  {/* Finance Approved step — always shown once plan exists */}
                  <div className="funds-progress-item funds-progress-item--done">
                    <FaCheckCircle className="funds-progress-icon funds-progress-icon--success" />
                    <span className="funds-progress-label">Finance Approved</span>
                    <span className="funds-progress-badge funds-progress-badge--success">Done</span>
                  </div>

                  {milestones.map((m) => {
                    const st = String(m?.completionStatus || '').toUpperCase()
                    const isRel = st === 'RELEASED'
                    const isCom = st === 'COMPLETED'
                    const isOvd = st === 'OVERDUE'
                    const isProofSub = st === 'PROOF_SUBMITTED'
                    const isProofRej = st === 'PROOF_REJECTED'
                    const releasedIcon = <FaCheckCircle className="funds-progress-icon funds-progress-icon--success" />
                    const pendingIcon = <FaRegCircle className="funds-progress-icon funds-progress-icon--muted" />
                    const overdueIcon = <FaMinusCircle className="funds-progress-icon funds-progress-icon--danger" />
                    const reviewIcon = <FaClock className="funds-progress-icon funds-progress-icon--review" />
                    const rejectIcon = <FaExclamationTriangle className="funds-progress-icon funds-progress-icon--danger" />

                    return (
                      <div key={m.milestoneId || m.stageNumber} className="funds-progress-stage-group">
                        {/* Pending step (shown only for non-released stages) */}
                        {!isRel && (
                          <div className={`funds-progress-item ${isOvd ? 'funds-progress-item--overdue' : isProofRej ? 'funds-progress-item--overdue' : isProofSub ? 'funds-progress-item--review' : 'funds-progress-item--pending'}`}>
                            {isOvd ? overdueIcon : isProofRej ? rejectIcon : isProofSub ? reviewIcon : pendingIcon}
                            <span className="funds-progress-label">Stage {m.stageNumber} Pending</span>
                            {isOvd && <span className="funds-progress-badge funds-progress-badge--danger">Overdue</span>}
                            {isCom && <span className="funds-progress-badge funds-progress-badge--warning">Awaiting Release</span>}
                            {isProofSub && <span className="funds-progress-badge funds-progress-badge--review">Under Review</span>}
                            {isProofRej && <span className="funds-progress-badge funds-progress-badge--danger">Revision Required</span>}
                          </div>
                        )}
                        {/* Released step */}
                        <div className={`funds-progress-item funds-progress-item--released ${isRel ? 'is-active' : 'is-inactive'}`}>
                          {isRel ? releasedIcon : <FaRegCircle className="funds-progress-icon funds-progress-icon--muted" />}
                          <span className="funds-progress-label">Stage {m.stageNumber} Released</span>
                          {isRel && (
                            <span className="funds-progress-amount">
                              {formatCurrency(m.amountReleased || m.amountToRelease)}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {/* Fully Disbursed — shown only when every milestone is RELEASED */}
                  {milestones.length > 0 && milestones.every(m => String(m?.completionStatus || '').toUpperCase() === 'RELEASED') && (
                    <div className="funds-progress-item funds-progress-item--complete">
                      <FaCheckCircle className="funds-progress-icon funds-progress-icon--success" />
                      <span className="funds-progress-label funds-progress-label--bold">Fully Disbursed</span>
                      <span className="funds-progress-badge funds-progress-badge--success">Complete</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="funds-card funds-card--transactions">
              <div className="funds-card__header">
                <h2>Recent Transactions</h2>
              </div>

              {visibleTransactions.length > 0 ? (
                <>
                  {/* Desktop / Tablet Table View */}
                  <div className="funds-table-wrap funds-table-desktop">
                    <table className="funds-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Ref Number</th>
                          <th style={{ textAlign: 'right' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleTransactions.map((row) => (
                          <tr key={row.refNumber}>
                            <td>{formatDate(row.date)}</td>
                            <td className="font-mono funds-table__mono">{row.refNumber}</td>
                            <td style={{ textAlign: 'right', color: '#1a7f37', fontWeight: 800 }}>{formatCurrency(row.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards View */}
                  <div className="funds-tx-mobile-list">
                    {visibleTransactions.map((row) => (
                      <div className="funds-tx-card" key={row.refNumber}>
                        <div className="funds-tx-card__header">
                          <span className="funds-tx-card__label">{row.label || 'Stage Disbursement'}</span>
                          <span className="funds-tx-card__amount">{formatCurrency(row.amount)}</span>
                        </div>
                        <div className="funds-tx-card__meta">
                          <span className="funds-tx-card__date">{formatDate(row.date)}</span>
                          <span className="funds-tx-card__ref">{row.refNumber}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="button button--ghost funds-history-btn"
                    onClick={() => setShowFullHistory(prev => !prev)}
                    aria-expanded={showFullHistory}
                  >
                    {showFullHistory ? 'Hide Full History' : 'View Full History'} <FaChevronRight style={{ marginLeft: 8, transform: showFullHistory ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s' }} />
                  </button>

                  {showFullHistory && (
                    <div className="funds-full-history">
                      <h3>Full History ({transactionRows.length})</h3>
                      {transactionRows.length > 0 ? (
                        <div className="funds-full-history-list">
                          {transactionRows.map((row) => (
                            <div className="funds-history-row-card" key={`${row.refNumber}-history`}>
                              <div className="funds-history-row-card__top">
                                <span className="funds-history-row-card__label">{row.label || 'Stage Disbursement'}</span>
                                <strong className="funds-history-row-card__amount">{formatCurrency(row.amount)}</strong>
                              </div>
                              <div className="funds-history-row-card__meta">
                                <span>{formatDate(row.date)}</span>
                                <span className="funds-table__mono">{row.refNumber}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p>No completed transactions yet.</p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="funds-empty-inline">No disbursement transactions have been recorded yet.</div>
              )}
            </div>

            <div className="funds-assist-card">
              <div className="funds-assist-card__title">
                <FaHeadset />
                <h3>Need Assistance?</h3>
              </div>
              <p>If you notice any discrepancies in your disbursement schedule, contact your assigned case officer.</p>
              <a href="mailto:support@govsubsidy.gov.in?subject=Funds%20Tracker%20Assistance" className="funds-assist-btn">
                Contact Support
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* =====================================================================
          Proof Upload Modal
          ===================================================================== */}
      {proofModal && (
        <div className="funds-proof-modal-overlay" role="dialog" aria-modal="true" aria-label="Submit Stage Proof">
          <div className="funds-proof-modal">
            <div className="funds-proof-modal__header">
              <h2>
                <FaUpload style={{ marginRight: '0.5rem' }} />
                {milestones.find(m => m.milestoneId === proofMilestoneId)?.completionStatus === 'PROOF_REJECTED'
                  ? 'Resubmit Stage Proof'
                  : 'Submit Stage Proof'}
              </h2>
              <button
                type="button"
                className="funds-proof-modal__close"
                onClick={closeProofModal}
                aria-label="Close modal"
                disabled={proofUploading}
              >
                ✕
              </button>
            </div>

            {(() => {
              const activeMilestone = milestones.find(m => m.milestoneId === proofMilestoneId)
              return activeMilestone ? (
                <p className="funds-proof-modal__subtitle">
                  Stage {activeMilestone.stageNumber}: <strong>{activeMilestone.milestoneName}</strong>
                  {' · '}{formatCurrency(activeMilestone.amountToRelease)}
                </p>
              ) : null
            })()}

            {proofSuccess ? (
              <div className="funds-proof-modal__success">
                <FaCheckCircle style={{ marginRight: '0.5rem', color: '#1a7f37' }} />
                {proofSuccess}
              </div>
            ) : (
              <form onSubmit={handleSubmitProof} className="funds-proof-modal__form">
                <div className="funds-proof-modal__field">
                  <label htmlFor="proof-file" className="funds-proof-modal__label">
                    Compliance Evidence <span className="funds-proof-modal__required">*</span>
                  </label>
                  <div className="funds-proof-file-drop">
                    <input
                      id="proof-file"
                      type="file"
                      accept="image/*,application/pdf"
                      className="funds-proof-file-input"
                      onChange={e => setProofFile(e.target.files?.[0] || null)}
                      disabled={proofUploading}
                    />
                    {proofFile ? (
                      <p className="funds-proof-file-selected">
                        <FaCheckCircle style={{ color: '#1a7f37', marginRight: '0.35rem' }} />
                        {proofFile.name} ({(proofFile.size / 1024).toFixed(1)} KB)
                      </p>
                    ) : (
                      <p className="funds-proof-file-placeholder">
                        <FaUpload style={{ marginRight: '0.35rem' }} />
                        Choose a photo or PDF
                      </p>
                    )}
                  </div>
                </div>

                <div className="funds-proof-modal__field">
                  <label htmlFor="proof-notes" className="funds-proof-modal__label">Notes / Description (optional)</label>
                  <textarea
                    id="proof-notes"
                    className="funds-proof-modal__textarea"
                    rows={3}
                    placeholder="Briefly describe the work completed for this stage…"
                    value={proofNotes}
                    onChange={e => setProofNotes(e.target.value)}
                    disabled={proofUploading}
                    maxLength={400}
                  />
                  <span className="funds-proof-modal__char-count">{proofNotes.length}/400</span>
                </div>

                {proofError && (
                  <div className="funds-proof-modal__error">
                    <FaExclamationTriangle style={{ marginRight: '0.4rem' }} />
                    {proofError}
                  </div>
                )}

                <div className="funds-proof-modal__actions">
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={closeProofModal}
                    disabled={proofUploading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="button button--primary funds-proof-submit-btn"
                    disabled={proofUploading || !proofFile}
                  >
                    {proofUploading ? 'Uploading…' : 'Submit Proof'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
