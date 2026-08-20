import api from './api'

export async function getDisbursementPlanByApplicationId(applicationId) {
  const response = await api.get(`/api/v1/disbursement/plan/application/${applicationId}`)
  return response.data?.data || response.data || null
}

export async function getCurrentBeneficiaryRecord() {
  const response = await api.get('/gov/beneficiary/me')
  return response.data?.data || response.data || null
}

export async function suggestStages(planId) {
  const response = await api.get(`/api/v1/disbursement/plan/${planId}/suggest-stages`)
  return response.data?.data || response.data || null
}

export async function configurePlan(planId, stages) {
  const response = await api.post(`/api/v1/disbursement/plan/${planId}/configure`, { stages })
  return response.data?.data || response.data || null
}

export async function releaseMilestone(milestoneId) {
  const response = await api.post(`/api/v1/disbursement/release/${milestoneId}`)
  return response.data?.data || response.data || null
}

export async function completeMilestone(milestoneId) {
  const response = await api.post(`/api/v1/disbursement/milestone/${milestoneId}/complete`)
  return response.data?.data || response.data || null
}

export async function getMilestoneContext(milestoneId) {
  const response = await api.get(`/api/v1/disbursement/milestone/${milestoneId}/context`)
  return response.data?.data || response.data || null
}

export async function approveWithInstallments(applicationId, approvedAmount, numberOfInstallments, remarks = '') {
  const response = await api.post(`/gov/workflow/${applicationId}/action`, {
    action: 'APPROVE',
    approvedAmount,
    numberOfInstallments,
    remarks,
  })
  return response.data?.data || response.data || null
}

export async function getNotifications() {
  const response = await api.get('/gov/notifications')
  return response.data?.data || response.data || []
}

export async function markNotificationRead(notificationId) {
  const response = await api.patch(`/gov/notifications/${notificationId}/read`)
  return response.data?.data || response.data || null
}
