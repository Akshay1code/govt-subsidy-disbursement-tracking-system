import { useState, useEffect } from 'react'
import api from '../services/api'

// Colors matching the C object token set defined in scheme-dashboard.jsx
const SCHEME_COLORS = [
  'var(--secondary)',       // teal
  'var(--accent-strong)',   // gold
  'var(--solar)',           // slate
  '#ef4444',               // brick
  '#8b5cf6',
  '#06b6d4',
]

const crore = (n) => parseFloat((n / 1e7).toFixed(2))

export function useDashboardAnalytics() {
  const [data, setData] = useState({
    // -- Status pie [{name, value, color}]
    statusData: [
      { name: 'Disbursed', value: 0, color: 'var(--secondary)' },
      { name: 'Approved',  value: 0, color: 'var(--solar)' },
      { name: 'Pending',   value: 0, color: 'var(--accent-strong)' },
      { name: 'Rejected',  value: 0, color: '#ef4444' },
    ],
    // -- Horizontal bar [{name, value}] — from /regions
    categoryApplications: [],
    // -- Vertical bar [{name, value}] — per scheme; value=0 until backend adds totalApplications
    schemeApplications: [],
    // -- Pie [{name, value, color}] — fund used per scheme
    schemeFundUsage: [],
    // -- Stacked bar [{name, sanctioned, disbursed, remaining}]
    // TODO: needs GET /api/v1/dashboard/categories (category-level fund breakdown)
    categoryAmounts: [],
    // -- Line chart [{m, applications, disbursements}]
    // TODO: needs GET /api/v1/dashboard/trends (monthly time-series)
    monthly: [],
    // -- Area chart [{d, approved, rejected}]
    // TODO: needs GET /api/v1/dashboard/sparkline (7-day daily counts)
    sparkline: [],
    // -- Horizontal bar [{name, value}]
    // TODO: needs GET /api/v1/dashboard/officer-queue
    officerQueue: [],
    // -- Progress bars [{reason, count}]
    // TODO: needs GET /api/v1/dashboard/flag-reasons
    flagReasons: [],
    // -- Progress bars [{reason, pct}]
    // TODO: needs GET /api/v1/dashboard/rejection-reasons
    rejectionReasons: [],
    // -- Register list [{name, category, apps, active}]
    schemeTable: [],
    // -- KPI cards
    kpis: [
      { no: '01', label: 'Total applications',      value: 0, prefix: '',  suffix: '' },
      { no: '02', label: 'Pending review',          value: 0, prefix: '',  suffix: '' },
      { no: '03', label: 'Approved',                value: 0, prefix: '',  suffix: '' },
      { no: '04', label: 'Rejected',                value: 0, prefix: '',  suffix: '' },
      { no: '05', label: 'Beneficiaries disbursed', value: 0, prefix: '',  suffix: '' }, // TODO: needs disbursed-beneficiary count endpoint
      { no: '06', label: 'Leftover budget',         value: 0, prefix: '₹', suffix: ' Cr' },
    ],
    // -- Fund utilisation summary [{label, value, tone}]
    fundSummary: [
      { label: 'Allocated funds',    value: '₹0 Cr', tone: 'var(--text)' },
      { label: 'Sanctioned amount',  value: '₹0 Cr', tone: 'var(--solar)' },        // TODO: no sanctioned field yet
      { label: 'Disbursed amount',   value: '₹0 Cr', tone: 'var(--secondary)' },
      { label: 'Leftover / unspent', value: '₹0 Cr', tone: 'var(--accent-strong)' },
    ],
    // -- Scalar extras used in panels
    disbursedPct:          0,  // for RegisterSeal and fund-utilisation bar
    approvalRate:          0,  // for approval-rate radial bar panel
    pendingCount:          0,  // queue stat panel
    awaitingDisbursement:  0,  // TODO: needs status=APPROVED count endpoint
    flaggedCount:          0,  // TODO: needs GET /api/v1/dashboard/flags count
    // -- Processing-time panels
    avgApprovalDays:       0,  // TODO: needs GET /api/v1/dashboard/avg-processing-time
    avgDisbursementDays:   0,  // TODO: needs GET /api/v1/dashboard/avg-processing-time
    missingDocsPct:        0,  // TODO: needs GET /api/v1/dashboard/document-issues
  })
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    let cancelled = false

    async function fetchAll() {
      setLoading(true)
      setError(null)
      try {
        // Three parallel calls — all available dashboard endpoints
        const [perfRes, schemesRes, regionsRes] = await Promise.all([
          api.get('/api/v1/dashboard/performance'),
          api.get('/api/v1/dashboard/schemes'),
          api.get('/api/v1/dashboard/regions'),
        ])

        if (cancelled) return

        // Normalise — backend may wrap in .data.data
        const perf    = perfRes.data?.data    ?? perfRes.data    ?? {}
        const schemes = schemesRes.data?.data ?? schemesRes.data ?? []
        const regions = regionsRes.data?.data ?? regionsRes.data ?? []

        /* ── statusData ────────────────────────────────────────── */
        // NOTE: 'Disbursed' count has no backend field yet.
        // TODO: add disbursed-status count to PerformanceDashboardResponse
        const statusData = [
          { name: 'Disbursed', value: 0,                                           color: 'var(--secondary)' },
          { name: 'Approved',  value: Number(perf.approvedApplications    ?? 0),   color: 'var(--solar)' },
          { name: 'Pending',   value: Number(perf.underReviewApplications ?? 0),   color: 'var(--accent-strong)' },
          { name: 'Rejected',  value: Number(perf.rejectedApplications    ?? 0),   color: '#ef4444' },
        ]

        /* ── categoryApplications ──────────────────────────────── */
        // GET /api/v1/dashboard/regions → [{region, totalApplications}]
        const categoryApplications = (regions ?? []).map(r => ({
          name:  r.region,
          value: Number(r.totalApplications ?? 0),
        }))

        /* ── schemeApplications ────────────────────────────────── */
        // TODO: SchemeDashboardResponse needs a totalApplications field
        // (currently only has allocatedFunds / budgetUsed / remainingFunds)
        const schemeApplications = (schemes ?? []).map(s => ({
          name:  s.schemeName,
          value: 0,
        }))

        /* ── schemeFundUsage ───────────────────────────────────── */
        const schemeFundUsage = (schemes ?? []).map((s, i) => ({
          name:  s.schemeName,
          value: Number(s.budgetUsed ?? 0),
          color: SCHEME_COLORS[i % SCHEME_COLORS.length],
        }))

        /* ── schemeTable ───────────────────────────────────────── */
        const schemeTable = (schemes ?? []).map(s => ({
          name:     s.schemeName,
          category: s.schemeCode,
          apps:     0,   // TODO: SchemeDashboardResponse.totalApplications needed
          active:   true,
        }))

        /* ── fund aggregates ───────────────────────────────────── */
        const totalAllocated = (schemes ?? []).reduce((s, x) => s + (x.allocatedFunds ?? 0), 0)
        const totalDisbursed = (schemes ?? []).reduce((s, x) => s + (x.budgetUsed     ?? 0), 0)
        const totalRemaining = (schemes ?? []).reduce((s, x) => s + (x.remainingFunds ?? 0), 0)
        const disbursedPct   = totalAllocated > 0 ? Math.round((totalDisbursed / totalAllocated) * 100) : 0

        const fundSummary = [
          { label: 'Allocated funds',    value: `₹${crore(totalAllocated)} Cr`, tone: 'var(--text)' },
          { label: 'Sanctioned amount',  value: '₹0 Cr',                        tone: 'var(--solar)' }, // TODO: no sanctioned field in backend
          { label: 'Disbursed amount',   value: `₹${crore(totalDisbursed)} Cr`, tone: 'var(--secondary)' },
          { label: 'Leftover / unspent', value: `₹${crore(totalRemaining)} Cr`, tone: 'var(--accent-strong)' },
        ]

        /* ── KPIs ──────────────────────────────────────────────── */
        const kpis = [
          { no: '01', label: 'Total applications',      value: Number(perf.totalApplications      ?? 0), prefix: '',  suffix: '' },
          { no: '02', label: 'Pending review',          value: Number(perf.underReviewApplications ?? 0), prefix: '',  suffix: '' },
          { no: '03', label: 'Approved',                value: Number(perf.approvedApplications    ?? 0), prefix: '',  suffix: '' },
          { no: '04', label: 'Rejected',                value: Number(perf.rejectedApplications    ?? 0), prefix: '',  suffix: '' },
          { no: '05', label: 'Beneficiaries disbursed', value: 0,                                         prefix: '',  suffix: '' }, // TODO: disbursed count endpoint
          { no: '06', label: 'Leftover budget',         value: crore(totalRemaining),                     prefix: '₹', suffix: ' Cr' },
        ]

        /* ── scalar extras ─────────────────────────────────────── */
        const approvalRate = perf.totalApplications > 0
          ? Math.round((perf.approvedApplications / perf.totalApplications) * 100)
          : 0

        const pendingCount = Number(perf.underReviewApplications ?? 0)

        // TODO: awaitingDisbursement, flaggedCount, avgApprovalDays, avgDisbursementDays, missingDocsPct
        // need dedicated endpoints (e.g. GET /api/v1/dashboard/queue, GET /api/v1/dashboard/flags)

        if (!cancelled) {
          setData(prev => ({
            ...prev,
            statusData,
            categoryApplications,
            schemeApplications,
            schemeFundUsage,
            schemeTable,
            fundSummary,
            kpis,
            disbursedPct,
            approvalRate,
            pendingCount,
            // categoryAmounts, monthly, sparkline, officerQueue, flagReasons,
            // rejectionReasons, awaitingDisbursement, flaggedCount remain as defaults (TODO)
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
