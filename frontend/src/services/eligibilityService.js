import api from './api'

export async function runEligibilityEngine(payload) {
  const response = await api.post('/gov/applications/save-fields', payload)
  return response.data
}
