export const SCHEMES = [
  {
    id: 'pm-kisan',
    name: 'PM Kisan Samman Nidhi',
    category: 'Agriculture',
    amount: '₹6,000 / Year',
    description: 'An initiative by the Government of India that provides up to ₹6,000 per year in three equal installments to all small and marginal farmers. The funds are directly transferred into the bank accounts of the beneficiaries, ensuring transparency and efficiency.',
    eligibilityText: 'Small and marginal farmers holding cultivable land up to 5 acres, with family annual income not exceeding ₹3,00,000. Professional/institutional landholders, government employees, and income taxpayers are excluded.',
    maxIncome: 300000,
    allowedOccupations: ['Farmer'],
    maxLandHolding: 5,
    processingTime: '15-20 Days',
    requiredDocs: ['Land Ownership Deed (7/12 Extract)', 'Aadhaar Card', 'Bank Passbook Photo'],
    natureDetails: [
      { label: 'Land Holding Limit', value: 'Up to 5 Acres' },
      { label: 'Cultivable Crop Types', value: 'Rabi, Kharif, and Zaid Crops' },
      { label: 'Soil Health Verification', value: 'Recommended for sanction' }
    ],
    natureInputs: [
      { name: 'landArea', label: 'Land Area Owned (in Acres)', type: 'number', placeholder: 'e.g., 2.5', required: true },
      { name: 'surveyNumber', label: 'Land Survey / Khasra Number', type: 'text', placeholder: 'e.g., 142/A/2', required: true },
      { name: 'cropType', label: 'Primary Crop Cultivated', type: 'select', options: ['Rice', 'Wheat', 'Sugarcane', 'Cotton', 'Pulses', 'Vegetables'], required: true }
    ]
  },
  {
    id: 'pm-awas',
    name: 'Pradhan Mantri Awas Yojana (PMAY-G)',
    category: 'Housing',
    amount: '₹1,20,000 Assistance',
    description: 'A social welfare program to provide housing for the rural and urban poor in India. The scheme provides financial assistance of up to ₹1,20,000 for constructing a permanent (Pucca) house with basic amenities like toilet, electricity, and clean water.',
    eligibilityText: 'Families residing in temporary (Kutcha) houses or roofless homes, with family annual income under ₹6,00,000. Beneficiaries must not own any permanent (Pucca) house in any part of the country.',
    maxIncome: 600000,
    allowedOccupations: ['Farmer', 'Student', 'Unemployed', 'Salaried'], // Open but subject to housing condition
    maxLandHolding: 999, // No strict limit on agricultural land, but no Pucca house
    processingTime: '30-45 Days',
    requiredDocs: ['Income Certificate', 'Affidavit of No Pucca House', 'Aadhaar Card', 'Site Photo of Current Kutcha House'],
    natureDetails: [
      { label: 'Construction Grant', value: '₹1,20,000 (Plain) / ₹1,30,000 (Hilly)' },
      { label: 'Minimum House Carpet Area', value: '25 sq.mt including kitchen space' },
      { label: 'Mandatory Toilet Linkage', value: 'Swachh Bharat Mission support integration' }
    ],
    natureInputs: [
      { name: 'currentHouseType', label: 'Current Housing Structure', type: 'select', options: ['Kutcha House (Mud/Thatch)', 'Semi-Pucca (Tiled/Tin Roof)', 'Homeless / Roofless'], required: true },
      { name: 'familySize', label: 'Number of Dependent Family Members', type: 'number', placeholder: 'e.g., 5', required: true },
      { name: 'panchayatName', label: 'Gram Panchayat / Ward Name', type: 'text', placeholder: 'e.g., Rampur Gram Panchayat', required: true }
    ]
  },
  {
    id: 'national-vidya',
    name: 'National Vidya Education Subsidy',
    category: 'Education',
    amount: '₹50,000 / Year',
    description: 'A scholarship and tuition fee subsidy scheme designed to support talented students from economically weaker sections pursuing higher education. It covers tuition fees, exam fees, and study material allowances up to ₹50,000 per academic year.',
    eligibilityText: 'Active students enrolled in recognized universities/colleges, with family annual income under ₹4,50,000. The student must have scored a minimum of 60% or equivalent CGPA in their previous academic year.',
    maxIncome: 450000,
    allowedOccupations: ['Student'],
    maxLandHolding: 999,
    processingTime: '10-15 Days',
    requiredDocs: ['Previous Year Marksheet', 'College Admission Fee Receipt', 'Aadhaar Card', 'Income Certificate'],
    natureDetails: [
      { label: 'Maximum Annual Coverage', value: '₹50,000' },
      { label: 'Minimum Previous Grade', value: '60% or 6.0 CGPA' },
      { label: 'Approved Courses', value: 'Undergraduate, Postgraduate, Diploma' }
    ],
    natureInputs: [
      { name: 'collegeName', label: 'College / University Name', type: 'text', placeholder: 'e.g., Indian Institute of Technology', required: true },
      { name: 'currentCourse', label: 'Course of Study & Year', type: 'text', placeholder: 'e.g., B.Sc Physics, 2nd Year', required: true },
      { name: 'previousPercentage', label: 'Previous Academic Percentage (%)', type: 'number', placeholder: 'e.g., 78.5', required: true }
    ]
  },
  {
    id: 'ayushman-bharat',
    name: 'Ayushman Bharat Digital Health Subsidy',
    category: 'Healthcare',
    amount: '₹5,00,000 Insurance Cover',
    description: 'The national health protection scheme providing health cover of up to ₹5,00,000 per family per year for secondary and tertiary care hospitalization across public and empaneled private hospitals in India.',
    eligibilityText: 'Families listed in the SECC (Socio-Economic Caste Census) database or families with annual household income not exceeding ₹2,50,000. Individuals must not be government employees.',
    maxIncome: 250000,
    allowedOccupations: ['Farmer', 'Student', 'Unemployed', 'Salaried'],
    maxLandHolding: 999,
    processingTime: '7-10 Days',
    requiredDocs: ['Aadhaar Card', 'Ration Card / SECC Data Copy', 'Income Certificate'],
    natureDetails: [
      { label: 'Annual Cover Limit', value: '₹5,00,000 per Family' },
      { label: 'Empaneled Hospital Care', value: 'Cashless and paperless service at point of delivery' },
      { label: 'Pre-existing Diseases', value: 'Covered from Day 1' }
    ],
    natureInputs: [
      { name: 'familyMembersCount', label: 'Total Family Members to Enroll', type: 'number', placeholder: 'e.g., 4', required: true },
      { name: 'rationCardNo', label: 'Ration Card / SECC Number', type: 'text', placeholder: 'e.g., RC98129381A', required: true },
      { name: 'existingConditions', label: 'Any Chronic Pre-existing Illnesses', type: 'text', placeholder: 'e.g., None, Diabetes, Hypertension', required: false }
    ]
  }
]

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

