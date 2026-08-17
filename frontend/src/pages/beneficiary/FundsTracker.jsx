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
} from 'react-icons/fa'
import { getSchemes } from '../../services/schemeService'
import { getApplications } from '../../services/applicationService'
import { getCurrentBeneficiaryRecord, getDisbursementPlanByApplicationId } from '../../services/fundsService'
import api from '../../services/api'
import '../../styles/Dashboard.css'
import '../../styles/FundsTracker.css'

function formatCurrency(value) {
  const amount = Number(value || 0)
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
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

function isCompletedMilestone(milestone) {
  const status = String(milestone?.completionStatus || '').toUpperCase()
  return status === 'COMPLETED' || status === 'RELEASED' || Number(milestone?.amountReleased || 0) > 0
}

function isInProgressMilestone(milestone) {
  if (isCompletedMilestone(milestone)) return false
  const status = String(milestone?.completionStatus || '').toUpperCase()
  return status === 'OVERDUE' || status === 'PENDING'
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

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError('')

        const [profileRes, schemesData, applicationsData, beneficiaryRes] = await Promise.all([
          api.get('/gov/auth/profile/get'),
          getSchemes(),
          getApplications(),
          getCurrentBeneficiaryRecord(),
        ])

        const profileData = profileRes.data?.data || profileRes.data || null
        const schemeList = Array.isArray(schemesData) ? schemesData : schemesData?.data || []
        const appList = Array.isArray(applicationsData) ? applicationsData : applicationsData?.data || []
        const beneficiaryData = beneficiaryRes?.data || beneficiaryRes || null

        setProfile(profileData)
        setSchemes(schemeList)
        setApplications(appList)
        setBeneficiaryRecord(beneficiaryData)

        const app = appList.find(item => getApplicationSchemeCode(item) === schemeCode)
        if (!app) {
          setError('We could not find an application for this scheme in your account.')
          return
        }

        const planData = await getDisbursementPlanByApplicationId(app.id || app.applicationId)
        setPlan(planData)
      } catch (err) {
        setError(err.message || 'Failed to load funds tracker.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [schemeCode])

  const app = useMemo(() => applications.find(item => getApplicationSchemeCode(item) === schemeCode), [applications, schemeCode])
  const scheme = useMemo(() => schemes.find(item => item.schemeCode === schemeCode), [schemes, schemeCode])

  const milestones = useMemo(() => {
    const list = Array.isArray(plan?.milestones) ? [...plan.milestones] : []
    return list.sort((a, b) => Number(a?.stageNumber || 0) - Number(b?.stageNumber || 0))
  }, [plan])

  const totalAllocated = Number(
    beneficiaryRecord?.sanctionedAmount ??
    plan?.totalAmount ??
    scheme?.allocatedFunds ??
    0
  )
  const totalDisbursed = Number(
    beneficiaryRecord?.disbursedAmount ??
    milestones.reduce((sum, milestone) => {
      return sum + Number(milestone?.amountReleased || (isCompletedMilestone(milestone) ? milestone?.amountToRelease : 0) || 0)
    }, 0)
  )
  const remainingBalance = Math.max(0, totalAllocated - totalDisbursed)

  const recentTransactions = milestones
    .filter(milestone => Number(milestone?.amountReleased || 0) > 0 || milestone?.releaseDate || milestone?.completedDate)
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
    const completed = isCompletedMilestone(milestone)
    const inProgress = isInProgressMilestone(milestone)
    const badgeLabel = completed ? 'Completed' : inProgress ? 'In Progress' : 'Pending'
    const statusClass = completed ? 'is-completed' : inProgress ? 'is-in-progress' : 'is-pending'
    const statusIcon = completed ? <FaCheckCircle /> : inProgress ? <FaMinusCircle /> : <FaRegCircle />
    const statusText = completed ? 'Completed' : inProgress ? 'In Progress' : 'Pending'
    const dateText = completed
      ? formatDate(milestone.releaseDate || milestone.completedDate)
      : formatDate(milestone.dueDate, 'Est. ')

    return {
      ...milestone,
      badgeLabel,
      statusClass,
      statusIcon,
      statusText,
      dateText,
    }
  })

  return (
    <div className="dashboard-layout funds-layout">
      <header className="topbar">
        <div className="topbar__brand">
          <div>
            <strong>Funds &amp; Disbursement Tracker</strong>
            <span>Monitor your allocated subsidy funds, track upcoming milestones, and review payment history.</span>
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
                      <div>
                        <h3>{milestone.milestoneName}</h3>
                        <p>{milestone.completionStatus === 'RELEASED'
                          ? 'Funds have been released for this milestone.'
                          : milestone.completionStatus === 'COMPLETED'
                            ? 'Milestone completed and ready for disbursement.'
                            : milestone.completionStatus === 'OVERDUE'
                              ? 'This milestone is overdue and needs attention.'
                              : 'Awaiting the next release window.'}
                        </p>
                      </div>
                      <span className={`funds-status-badge ${milestone.statusClass}`}>{milestone.statusText}</span>
                    </div>

                    <div className="funds-timeline-item__meta">
                      <span>{milestone.dateText}</span>
                      <strong className={milestone.statusClass}>{formatCurrency(milestone.amountReleased || milestone.amountToRelease || 0)}</strong>
                    </div>
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
            <div className="funds-card">
              <div className="funds-card__header">
                <h2>Recent Transactions</h2>
              </div>

              {visibleTransactions.length > 0 ? (
                <>
                  <div className="funds-table-wrap">
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

                  <button
                    type="button"
                    className="button button--ghost funds-history-btn"
                    onClick={() => setShowFullHistory(prev => !prev)}
                  >
                    {showFullHistory ? 'Hide Full History' : 'View Full History'} <FaChevronRight style={{ marginLeft: 8 }} />
                  </button>

                  {showFullHistory && (
                    <div className="funds-full-history">
                      <h3>Full history</h3>
                      {transactionRows.length > 0 ? transactionRows.map((row) => (
                        <div className="funds-history-row" key={`${row.refNumber}-history`}>
                          <span>{formatDate(row.date)}</span>
                          <span className="funds-table__mono">{row.refNumber}</span>
                          <strong>{formatCurrency(row.amount)}</strong>
                        </div>
                      )) : (
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
              <a href="mailto:support@govsubsidy.gov.in?subject=Funds%20Tracker%20Assistance">Contact Support</a>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
