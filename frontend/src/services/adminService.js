import api from './api'

/**
 * Fetches all pending officer registration requests.
 * Admin reviews these to approve or reject new officer accounts.
 * Calls: GET /gov/auth/officer/get-request
 */
export async function getOfficerRequests() {
  const response = await api.get('/gov/auth/officer/get-request')
  return response.data
}

/**
 * Approves or rejects an officer (or user) registration request.
 * Only admins are authorized to call this.
 * Calls: PATCH /gov/auth/approval/{uniqueId}/{status}
 *
 * @param {string} uniqueId - The unique ID of the user/officer to update
 * @param {string} status   - e.g. "APPROVED" or "REJECTED"
 */
export async function updateApprovalStatus(uniqueId, status) {
  const response = await api.patch(`/gov/auth/approval/${uniqueId}/${status}`)
  return response.data
}

/**
 * Fetches all user profiles by role.
 * Calls: GET /gov/auth/profile/{role}
 *
 * @param {string} role - e.g. "FARMER", "FIELD_OFFICER", "ADMIN"
 */
export async function getProfilesByRole(role) {
  const response = await api.get(`/gov/auth/profile/${role}`)
  return response.data
}

/**
 * Deletes the currently authenticated admin's profile.
 * Calls: DELETE /gov/auth/delete
 */
export async function deleteAdminProfile() {
  const response = await api.delete('/gov/auth/delete')
  return response.data
}

export async function getAllocationSummary() {
  const response = await api.get('/gov/applications/allocation/summary')
  return response.data?.data || response.data || []
}

export async function getOfficersForAllocation(stage) {
  const response = await api.get(`/gov/applications/allocation/officers?stage=${stage}`)
  return response.data?.data || response.data || []
}

export async function bulkAllocateApplications(officerId, stage, count) {
  const response = await api.post('/gov/applications/allocation/bulk', { officerId, stage, count })
  return response.data
}

export async function updateOfficerAllocationLimit(officerId, limit) {
  const response = await api.put(`/gov/applications/allocation/officers/${officerId}/limit`, { limit })
  return response.data
}
