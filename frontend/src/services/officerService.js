import api from './api'

/**
 * Fetches all applications assigned to the currently authenticated officer.
 */
export async function getMyApplications() {
  const response = await api.get('/gov/applications/my')
  return response.data?.data || response.data || []
}

/**
 * Fetches the disbursement plan for a given application ID.
 */
export async function getDisbursementPlan(applicationId) {
  const response = await api.get(`/api/v1/disbursement/plan/application/${applicationId}`)
  return response.data?.data || response.data
}

/**
 * Saves the stage configuration for a disbursement plan.
 */
export async function configureDisbursementPlan(planId, stages) {
  const response = await api.post(`/api/v1/disbursement/plan/${planId}/configure`, { stages })
  return response.data?.data || response.data
}

/**
 * Marks a milestone as completed by the beneficiary.
 */
export async function completeMilestone(milestoneId) {
  const response = await api.post(`/api/v1/disbursement/milestone/${milestoneId}/complete`)
  return response.data?.data || response.data
}

/**
 * Rejects submitted milestone proof and requests beneficiary resubmission.
 */
export async function rejectProof(milestoneId, reason) {
  const response = await api.post(`/api/v1/disbursement/milestone/${milestoneId}/reject-proof`, { reason })
  return response.data?.data || response.data
}

/**
 * Releases funds for a completed milestone.
 */
export async function releaseMilestone(milestoneId) {
  const response = await api.post(`/api/v1/disbursement/release/${milestoneId}`)
  return response.data?.data || response.data
}

/**
 * Resolves an overdue milestone using administrative override.
 */
export async function resolveMilestone(milestoneId, reason) {
  const response = await api.put(`/api/v1/disbursement/milestone/${milestoneId}/resolve`, { reason })
  return response.data?.data || response.data
}

/**
 * Fetches the list of all overdue milestones.
 */
export async function getOverdueMilestones() {
  const response = await api.get('/api/v1/reports/overdue')
  return response.data?.data || response.data || []
}

/**
 * Fetches all milestone upcoming alerts and reminders log.
 */
export async function getNotifications() {
  const response = await api.get('/api/v1/disbursement/notifications')
  return response.data?.data || response.data || []
}

/**
 * Processes application workflow approval or rejection action.
 * Maps result to a standardized success envelope expected by components.
 */
export async function updateApprovalStatus(appId, status, remarks = '') {
  const action = status.toUpperCase() === 'APPROVED' || status.toUpperCase() === 'APPROVE' ? 'APPROVE' : 'REJECT'
  const response = await api.post(`/gov/workflow/${appId}/action`, {
    action,
    remarks: remarks || (action === 'APPROVE' ? 'Approved by officer' : 'Rejected by officer')
  })
  const data = response.data?.data || response.data
  return {
    status: true,
    message: data?.message || 'Action processed successfully',
    data
  }
}

/**
 * Trigger testing helper to check overdue milestones on demand.
 */
export async function triggerOverdueCheck() {
  const response = await api.post('/api/v1/test/run-overdue-check')
  return response.data?.data || response.data
}

/**
 * Trigger testing helper to check upcoming reminders on demand.
 */
export async function triggerReminderCheck() {
  const response = await api.post('/api/v1/test/run-reminder-check')
  return response.data?.data || response.data
}

/**
 * Fetches beneficiary context and any pre-existing inspection data for the modal pre-fill.
 * GET /api/officer/applications/{applicationId}/inspection
 */
export async function getInspectionContext(applicationId) {
  const response = await api.get(`/api/officer/applications/${applicationId}/inspection`)
  return response.data?.data || response.data
}

/**
 * Submits the completed field inspection report.
 * POST /api/officer/inspections/submit
 * @param {Object} payload - { applicationId, addressVerified, businessActivityConfirmed, assetsInspected, notes, evidenceMediaIds }
 */
export async function submitInspectionReport(payload) {
  const response = await api.post('/api/officer/inspections/submit', payload)
  return response.data?.data || response.data
}

/**
 * Uploads a single image file for site evidence and returns the assigned media ID.
 * POST /api/media/upload
 * @param {File} file - The image File object from an <input type="file"> element.
 */
export async function uploadInspectionMedia(file) {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post('/api/media/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return response.data?.data || response.data
}
