export const SCHEMES = []

export function checkEligibility(scheme, userProfile) {
  if (!userProfile) return { eligible: false, reasons: ['Not logged in'] }

  const income = parseFloat(userProfile.annualIncome || 0)
  const land = parseFloat(userProfile.landHolding || 0)
  const occupation = userProfile.occupation || ''

  const reasons = []

  // Check Income
  if (income > scheme.maxIncome) {
    reasons.push(`Annual family income of ₹${income.toLocaleString()} exceeds the scheme limit of ₹${scheme.maxIncome.toLocaleString()}`)
  }

  // Check Occupation
  if (scheme.allowedOccupations && !scheme.allowedOccupations.includes(occupation)) {
    reasons.push(`Occupation '${occupation}' is not eligible for this scheme. Eligible: [${scheme.allowedOccupations.join(', ')}]`)
  }

  // Check Land Holding (mainly for agriculture schemes)
  if (scheme.maxLandHolding && land > scheme.maxLandHolding) {
    reasons.push(`Land holding of ${land} acres exceeds the scheme limit of ${scheme.maxLandHolding} acres`)
  }

  return {
    eligible: reasons.length === 0,
    reasons
  }
}

export function getSchemes() {
  const stored = window.localStorage.getItem('gov-subsidy-schemes')
  if (!stored) {
    window.localStorage.setItem('gov-subsidy-schemes', JSON.stringify(SCHEMES))
    return SCHEMES
  }
  return JSON.parse(stored)
}

export function saveSchemes(newSchemes) {
  window.localStorage.setItem('gov-subsidy-schemes', JSON.stringify(newSchemes))
}

export function logOfficerAction(officerId, officerName, action, details, targetId) {
  const storedLogs = window.localStorage.getItem('gov-subsidy-officer-actions')
  const logs = storedLogs ? JSON.parse(storedLogs) : []
  const newLog = {
    id: 'ACT-' + Math.floor(100000 + Math.random() * 900000),
    timestamp: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    officerId,
    officerName,
    action,
    details,
    targetId
  }
  logs.unshift(newLog)
  window.localStorage.setItem('gov-subsidy-officer-actions', JSON.stringify(logs))
  return newLog
}

