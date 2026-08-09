import api from './api'

// TODO: wire up as backend application endpoints are built out

export async function submitApplication(applicationData) {
  const response = await api.post('/gov/applications', applicationData)
  return response.data
}

export async function getApplications() {
  const response = await api.get('/gov/applications')
  return response.data
}

export async function submitApplicationBySchemeCode(schemeCode) {
  const response = await api.post(`/gov/applications/submit/${schemeCode}`)
  return response.data
}

export async function cancelApplicationById(applicationId) {
  const response = await api.delete(`/gov/applications/${applicationId}`)
  return response.data
}
