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
