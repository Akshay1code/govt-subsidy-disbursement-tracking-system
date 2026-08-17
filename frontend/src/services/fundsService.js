import api from './api'

export async function getDisbursementPlanByApplicationId(applicationId) {
  const response = await api.get(`/api/v1/disbursement/plan/application/${applicationId}`)
  return response.data?.data || response.data || null
}

export async function getCurrentBeneficiaryRecord() {
  const response = await api.get('/gov/beneficiary/me')
  return response.data?.data || response.data || null
}
