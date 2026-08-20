import { useState, useEffect } from 'react'
import api from '../services/api'

const SCHEME_COLORS = [
  'var(--secondary)',
  'var(--accent-strong)',
  'var(--solar)',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
]

const crore = (n) => parseFloat((n / 1e7).toFixed(2))

export function useDashboardAnalytics() {
  const [data, setData] = useState({
    statusData: [
      { name: 'Disbursed', value: 0, color: 'var(--secondary)' },
      { name: 'Approved',  value: 0, color: 'var(--solar)' },
      { name: 'Pending',   value: 0, color: 'var(--accent-strong)' },
      { name: 'Rejected',  value: 0, color: '#ef4444' },
    ],
    categoryApplications: [],
    schemeApplications: [],
    schemeFundUsage: [],
    categoryAmounts: [],
    monthly: [],
    sparkline: [],
    officerQueue: [],
    flagReasons: [],
    rejectionReasons: [],
    schemeTable: [],
    kpis: [
      { no: '01', label: 'Total applications',      value: 0, prefix: '',  suffix: '' },
      { no: '02', label: 'Pending review',          value: 0, prefix: '',  suffix: '' },
      { no: '03', label: 'Approved',                value: 0, prefix: '',  suffix: '' },
      { no: '04', label: 'Rejected',                value: 0, prefix: '',  suffix: '' },
      { no: '05', label: 'Beneficiaries disbursed', value: 0, prefix: '',  suffix: '' },
      { no: '06', label: 'Leftover budget',         value: 0, prefix: '₹', suffix: ' Cr' },
    ],
    fundSummary: [
      { label: 'Allocated funds',    value: '₹0 Cr', tone: 'var(--text)' },
      { label: 'Sanctioned amount',  value: '₹0 Cr', tone: 'var(--solar)' },
      { label: 'Disbursed amount',   value: '₹0 Cr', tone: 'var(--secondary)' },
      { label: 'Leftover / unspent', value: '₹0 Cr', tone: 'var(--accent-strong)' },
    ],
    disbursedPct:          0,
    approvalRate:          0,
    pendingCount:          0,
    awaitingDisbursement:  0,
    flaggedCount:          0,
    avgApprovalDays:       0,
    avgDisbursementDays:   0,
    missingDocsPct:        0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    let cancelled = false

    async function fetchAll() {
      setLoading(true)
      setError(null)
      try {
        const [
          perfRes, schemesRes, regionsRes,
          categoriesRes, trendsRes, sparklineRes,
          officerQueueRes, flagReasonsRes, rejectionReasonsRes,
        ] = await Promise.all([
          api.get('/api/v1/dashboard/performance'),
          api.get('/api/v1/dashboard/schemes'),
          api.get('/api/v1/dashboard/regions'),
          api.get('/api/v1/dashboard/categories'),
          api.get('/api/v1/dashboard/trends'),
          api.get('/api/v1/dashboard/sparkline'),
          api.get('/api/v1/dashboard/officer-queue'),
          api.get('/api/v1/dashboard/flag-reasons'),
          api.get('/api/v1/dashboard/rejection-reasons'),
        ])

        if (cancelled) return

        const unwrap = (res, fallback) => res.data?.data ?? res.data ?? fallback

        const perf              = unwrap(perfRes, {})
        const schemes           = unwrap(schemesRes, [])
        const regions           = unwrap(regionsRes, [])
        const categories        = unwrap(categoriesRes, [])
        const trends            = unwrap(trendsRes, [])
        const sparklineRows     = unwrap(sparklineRes, [])
        const officerQueueRows  = unwrap(officerQueueRes, [])
        const flagReasonRows    = unwrap(flagReasonsRes, [])
        const rejectionRows     = unwrap(rejectionReasonsRes, [])

        /* ── statusData ────────────────────────────────────────── */
        const statusData = [
          { name: 'Disbursed', value: Number(perf.disbursedApplications  ?? 0), color: 'var(--secondary)' },
          { name: 'Approved',  value: Number(perf.approvedApplications   ?? 0), color: 'var(--solar)' },
          { name: 'Pending',   value: Number(perf.underReviewApplications ?? 0), color: 'var(--accent-strong)' },
          { name: 'Rejected',  value: Number(perf.rejectedApplications   ?? 0), color: '#ef4444' },
        ]

        /* ── categoryApplications (region chart, unchanged) ────── */
        const categoryApplications = (regions ?? []).map(r => ({
          name:  r.region,
          value: Number(r.totalApplications ?? 0),
        }))

        /* ── schemeApplications / schemeTable — now real counts ─ */
        const schemeApplications = (schemes ?? []).map(s => ({
          name:  s.schemeName,
          value: Number(s.totalApplications ?? 0),
        }))

        const schemeFundUsage = (schemes ?? []).map((s, i) => ({
          name:  s.schemeName,
          value: Number(s.budgetUsed ?? 0),
          color: SCHEME_COLORS[i % SCHEME_COLORS.length],
        }))

        const schemeTable = (schemes ?? []).map(s => ({
          name:     s.schemeName,
          category: s.schemeCode,
          apps:     Number(s.totalApplications ?? 0),
          active:   true,
        }))

        /* ── categoryAmounts (stacked bar) ──────────────────────── */
        const categoryAmounts = (categories ?? []).map(c => ({
          name:       c.category,
          sanctioned: crore(c.sanctioned ?? 0),
          disbursed:  crore(c.disbursed ?? 0),
          remaining:  crore(c.remaining ?? 0),
        }))

        /* ── monthly (line chart) ───────────────────────────────── */
        const monthly = (trends ?? []).map(t => ({
          m: t.month,
          applications: Number(t.applications ?? 0),
          disbursements: Number(t.disbursements ?? 0),
        }))

        /* ── sparkline (7-day area chart) ───────────────────────── */
        const sparkline = (sparklineRows ?? []).map(s => ({
          d: s.date,
          approved: Number(s.approved ?? 0),
          rejected: Number(s.rejected ?? 0),
        }))

        /* ── officerQueue ────────────────────────────────────────── */
        const officerQueue = (officerQueueRows ?? []).map(o => ({
          name:  o.officerName,
          value: Number(o.pendingCount ?? 0),
        }))

        /* ── flagReasons ─────────────────────────────────────────── */
        const flagReasons = (flagReasonRows ?? []).map(f => ({
          reason: f.reason,
          count:  Number(f.count ?? 0),
        }))

        /* ── rejectionReasons ────────────────────────────────────── */
        const rejectionReasons = (rejectionRows ?? []).map(r => ({
          reason: r.reason,
          pct:    Number(r.percentage ?? 0),
        }))

        /* ── fund aggregates ─────────────────────────────────────── */
        const totalAllocated = (schemes ?? []).reduce((s, x) => s + (x.allocatedFunds ?? 0), 0)
        const totalDisbursed = (schemes ?? []).reduce((s, x) => s + (x.budgetUsed     ?? 0), 0)
        const totalRemaining = (schemes ?? []).reduce((s, x) => s + (x.remainingFunds ?? 0), 0)
        const disbursedPct   = totalAllocated > 0 ? Math.round((totalDisbursed / totalAllocated) * 100) : 0

        const fundSummary = [
          { label: 'Allocated funds',    value: `₹${crore(totalAllocated)} Cr`, tone: 'var(--text)' },
          { label: 'Sanctioned amount',  value: `₹${crore(totalAllocated)} Cr`, tone: 'var(--solar)' },
          { label: 'Disbursed amount',   value: `₹${crore(totalDisbursed)} Cr`, tone: 'var(--secondary)' },
          { label: 'Leftover / unspent', value: `₹${crore(totalRemaining)} Cr`, tone: 'var(--accent-strong)' },
        ]

        /* ── KPIs ─────────────────────────────────────────────────── */
        const kpis = [
          { no: '01', label: 'Total applications',      value: Number(perf.totalApplications      ?? 0), prefix: '',  suffix: '' },
          { no: '02', label: 'Pending review',          value: Number(perf.underReviewApplications ?? 0), prefix: '',  suffix: '' },
          { no: '03', label: 'Approved',                value: Number(perf.approvedApplications    ?? 0), prefix: '',  suffix: '' },
          { no: '04', label: 'Rejected',                value: Number(perf.rejectedApplications    ?? 0), prefix: '',  suffix: '' },
          { no: '05', label: 'Beneficiaries disbursed', value: Number(perf.disbursedApplications   ?? 0), prefix: '',  suffix: '' },
          { no: '06', label: 'Leftover budget',         value: crore(totalRemaining),                     prefix: '₹', suffix: ' Cr' },
        ]

        /* ── scalar extras ───────────────────────────────────────── */
        const approvalRate = perf.totalApplications > 0
          ? Math.round((perf.approvedApplications / perf.totalApplications) * 100)
          : 0

        const pendingCount = Number(perf.underReviewApplications ?? 0)

        if (!cancelled) {
          setData(prev => ({
            ...prev,
            statusData,
            categoryApplications,
            schemeApplications,
            schemeFundUsage,
            categoryAmounts,
            monthly,
            sparkline,
            officerQueue,
            flagReasons,
            rejectionReasons,
            schemeTable,
            fundSummary,
            kpis,
            disbursedPct,
            approvalRate,
            pendingCount,
            awaitingDisbursement: Number(perf.awaitingDisbursementApplications ?? 0),
            flaggedCount:         Number(perf.flaggedMilestones ?? 0),
            avgApprovalDays:      Number(perf.avgApprovalDays ?? 0),
            avgDisbursementDays:  Number(perf.avgDisbursementDays ?? 0),
            missingDocsPct:       Number(perf.missingDocsPct ?? 0),
          }))
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[useDashboardAnalytics]', err)
          setError(err?.response?.data?.message ?? err.message ?? 'Failed to load dashboard data.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchAll()
    return () => { cancelled = true }
  }, [])

  return { data, loading, error }
}
