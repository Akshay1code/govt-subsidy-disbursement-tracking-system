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
