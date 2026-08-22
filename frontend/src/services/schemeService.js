import api from './api'

function humanizeEnum(value) {
  if (!value) return ''
  return String(value)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatAmount(amount) {
  if (amount === null || amount === undefined || amount === '') return 'N/A'
  const numeric = Number(amount)
  if (Number.isNaN(numeric)) return String(amount)
  return `₹${numeric.toLocaleString('en-IN')}`
}

function inferInputType(fieldName) {
  switch (fieldName) {
    case 'ANNUAL_INCOME':
    case 'AGE':
    case 'MARKS_PERCENTAGE':
    case 'LAND_AREA':
    case 'FISHING_EXPERIENCE':
    case 'INVESTMENT_AMOUNT':
      return 'number'
    default:
      return 'text'
  }
}

function inferInputOptions(fieldName) {
  switch (fieldName) {
    case 'OCCUPATION':
      return ['Farmer', 'Student', 'Unemployed', 'Salaried']
    case 'CATEGORY':
      return ['General', 'OBC', 'SC', 'ST']
    case 'GENDER':
      return ['Male', 'Female', 'Other']
    default:
      return []
  }
}

function mapFieldToInput(field) {
  const fieldName = field?.fieldName
  const fieldLabel = humanizeEnum(fieldName)
  return {
    name: String(fieldName || '').toLowerCase(),
    label: fieldLabel,
    type: inferInputType(fieldName),
    required: field?.mandatory !== false,
    placeholder: `Enter ${fieldLabel || 'value'}`,
    options: inferInputOptions(fieldName),
  }
}

function mapScheme(scheme) {
  const rules = Array.isArray(scheme?.rules) ? scheme.rules : []
  const documents = Array.isArray(scheme?.documents) ? scheme.documents : []
  const fields = Array.isArray(scheme?.fields) ? scheme.fields : []

  return {
    id: scheme.schemeCode,
    schemeCode: scheme.schemeCode,
    schemeName: scheme.schemeName,
    name: scheme.schemeName,
    category: scheme.categoryName || 'General',
    description: scheme.description || '',
    benefit: scheme.benefit || '',
    allocatedFunds: scheme.allocatedFunds,
    amount: formatAmount(scheme.allocatedFunds),
    processingTime: scheme.active ? 'Open for applications' : 'Currently inactive',
    active: !!scheme.active,
    minimumEligibleScore: scheme.minimumEligibleScore,
    categoryDescription: scheme.categoryDescription || '',
    rules: rules.map((rule) => ({
      ...rule,
      partialPercentage: rule?.partialPercentage ?? 0,
    })),
    documents,
    fields,
    requiredDocs: documents.map((doc) => humanizeEnum(doc.documentType)).filter(Boolean),
    natureInputs: fields.map(mapFieldToInput),
    natureDetails: [
      { label: 'Scheme Code', value: scheme.schemeCode || 'N/A' },
      { label: 'Category', value: scheme.categoryName || 'General' },
      { label: 'Allocated Funds', value: formatAmount(scheme.allocatedFunds) },
      { label: 'Minimum Eligible Score', value: scheme.minimumEligibleScore ?? 'N/A' },
      { label: 'Status', value: scheme.active ? 'Active' : 'Inactive' },
    ],
    eligibilityText: rules.length
      ? rules
          .map((rule) => `${humanizeEnum(rule.fieldName)} ${humanizeEnum(rule.operator)} ${rule.expectedValue}`)
          .join('; ')
      : 'No eligibility rules configured for this scheme yet.',
    maxIncome: undefined,
    allowedOccupations: undefined,
    maxLandHolding: undefined,
  }
}

function getProfileValue(profile, fieldName) {
  switch (fieldName) {
    case 'AGE':
      return profile?.age ?? profile?.dobAge ?? profile?.yearsOld
    case 'ANNUAL_INCOME':
      return profile?.annualIncome
    case 'MONTHLY_INCOME':
      return profile?.monthlyIncome
    case 'GENDER':
      return profile?.gender
    case 'CASTE':
      return profile?.caste || profile?.category
    case 'EDUCATION':
      return profile?.marksPercentage || profile?.educationScore || profile?.cgpa
    case 'MARITAL_STATUS':
      return profile?.maritalStatus
    case 'EMPLOYMENT_STATUS':
      return profile?.employmentStatus || profile?.occupation
    case 'LAND_OWNED':
      return profile?.landHolding
    case 'FARMER':
    case 'STUDENT':
      return profile?.occupation
    case 'DISABILITY':
      return profile?.disabilityStatus
    default:
      return profile?.[String(fieldName || '').toLowerCase()]
  }
}

function evaluateRule(rule, profile) {
  const expectedRaw = rule?.expectedValue
  const actualRaw = getProfileValue(profile, rule?.fieldName)

  if (actualRaw === undefined || actualRaw === null || actualRaw === '') {
    return {
      passed: false,
      reason: `${humanizeEnum(rule?.fieldName)} is missing in your profile`,
    }
  }

  const numericOperators = new Set([
    'LESS_THAN',
    'LESS_THAN_EQUAL',
    'GREATER_THAN',
    'GREATER_THAN_EQUAL',
  ])

  if (numericOperators.has(rule?.operator)) {
    const actual = Number(actualRaw)
    const expected = Number(expectedRaw)
    if (Number.isNaN(actual) || Number.isNaN(expected)) {
      return {
        passed: false,
        reason: `${humanizeEnum(rule?.fieldName)} could not be evaluated`,
      }
    }

    switch (rule.operator) {
      case 'LESS_THAN':
        return { passed: actual < expected, reason: `${humanizeEnum(rule.fieldName)} must be less than ${expectedRaw}` }
      case 'LESS_THAN_EQUAL':
        return { passed: actual <= expected, reason: `${humanizeEnum(rule.fieldName)} must be less than or equal to ${expectedRaw}` }
      case 'GREATER_THAN':
        return { passed: actual > expected, reason: `${humanizeEnum(rule.fieldName)} must be greater than ${expectedRaw}` }
      case 'GREATER_THAN_EQUAL':
        return { passed: actual >= expected, reason: `${humanizeEnum(rule.fieldName)} must be greater than or equal to ${expectedRaw}` }
      default:
        break
    }
  }

  const actual = String(actualRaw).trim().toLowerCase()
  const expected = String(expectedRaw).trim().toLowerCase()

  switch (rule?.operator) {
    case 'EQUALS':
      return { passed: actual === expected, reason: `${humanizeEnum(rule.fieldName)} must match ${expectedRaw}` }
    case 'NOT_EQUALS':
      return { passed: actual !== expected, reason: `${humanizeEnum(rule.fieldName)} must not match ${expectedRaw}` }
    default:
      return { passed: actual === expected, reason: `${humanizeEnum(rule.fieldName)} must match ${expectedRaw}` }
  }
}

export async function getSchemes(categoryName = 'All') {
  const url =
    !categoryName || categoryName === 'All'
      ? '/gov/schemes/get'
      : `/gov/schemes/get-${String(categoryName).trim().toLowerCase()}`

  const response = await api.get(url)
  const payload = response.data
  const list = Array.isArray(payload) ? payload : payload?.data || []
  return list.map(mapScheme)
}

export async function getSchemesByCategory(categoryName) {
  return getSchemes(categoryName)
}

export async function addScheme(schemeData) {
  const response = await api.post('/gov/schemes/add', schemeData)
  return response.data
}

export async function updateScheme(schemeCode, schemeData) {
  const response = await api.patch(`/gov/schemes/${schemeCode}`, schemeData)
  return response.data
}

export async function addSchemeRules(schemeId, rules) {
  console.warn(`[FLAG] Backend endpoint for adding rules is missing. Tried to save rules for scheme ${schemeId}:`, rules)
  return { status: true, message: 'Rules processed (mocked)' }
}

export async function addSchemeDocuments(schemeId, documents) {
  console.warn(`[FLAG] Backend endpoint for adding documents is missing. Tried to save documents for scheme ${schemeId}:`, documents)
  return { status: true, message: 'Documents processed (mocked)' }
}

export async function addSchemeFields(schemeId, fields) {
  console.warn(`[FLAG] Backend endpoint for adding required fields is missing. Tried to save fields for scheme ${schemeId}:`, fields)
  return { status: true, message: 'Fields processed (mocked)' }
}

export function checkEligibility(scheme, userProfile) {
  if (!userProfile) return { eligible: false, reasons: ['Not logged in'] }

  const rules = Array.isArray(scheme?.rules) ? scheme.rules : []
  if (rules.length === 0) {
    return { eligible: true, reasons: [] }
  }

  const reasons = []
  for (const rule of rules) {
    const result = evaluateRule(rule, userProfile)
    if (!result.passed) {
      reasons.push(result.reason)
    }
  }

  return {
    eligible: reasons.length === 0,
    reasons,
  }
}
