export const SCHEMES = []
let currentSchemes = SCHEMES
let officerActionLogs = []

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
  return currentSchemes
}

export function saveSchemes(newSchemes) {
  currentSchemes = Array.isArray(newSchemes) ? newSchemes : []
  return currentSchemes
}

export function logOfficerAction(officerId, officerName, action, details, targetId) {
  const newLog = {
    id: 'ACT-' + Math.floor(100000 + Math.random() * 900000),
    timestamp: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    officerId,
    officerName,
    action,
    details,
    targetId
  }
  officerActionLogs.unshift(newLog)
  return newLog
}

