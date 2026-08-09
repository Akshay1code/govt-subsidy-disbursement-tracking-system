import api from './api'

// TODO: Wire additional officer-specific endpoints as they are built out
// e.g. GET /gov/officer/my-applications, POST /gov/officer/review/:id, etc.

/**
 * Fetches all applications assigned to the currently authenticated officer.
 * Placeholder — to be wired when backend officer endpoints are ready.
 */
export async function getMyApplications() {
  const response = await api.get('/gov/applications/my')
  return response.data
}

export async function getDisbursementPlan(applicationId) {
  const response = await api.get(`/api/v1/disbursement/plan/application/${applicationId}`)
  return response.data
}

export async function configureDisbursementPlan(planId, stages) {
  const response = await api.post(`/api/v1/disbursement/plan/${planId}/configure`, { stages })
  return response.data
}

export async function completeMilestone(milestoneId) {
  const response = await api.post(`/api/v1/disbursement/milestone/${milestoneId}/complete`)
  return response.data
}

export async function releaseMilestone(milestoneId) {
  const response = await api.post(`/api/v1/disbursement/release/${milestoneId}`)
  return response.data
}

export async function resolveMilestone(milestoneId, reason) {
  const response = await api.put(`/api/v1/disbursement/milestone/${milestoneId}/resolve`, { reason })
  return response.data
}

export async function getOverdueMilestones() {
  const response = await api.get('/api/v1/reports/overdue')
  return response.data
}

export async function getNotifications() {
  const response = await api.get('/api/v1/disbursement/notifications')
  return response.data
}

export async function triggerOverdueCheck() {
  const response = await api.post('/api/v1/test/run-overdue-check')
  return response.data
}

export async function triggerReminderCheck() {
  const response = await api.post('/api/v1/test/run-reminder-check')
  return response.data
}
