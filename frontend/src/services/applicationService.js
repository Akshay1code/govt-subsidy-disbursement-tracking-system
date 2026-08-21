


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

export async function allocateApplication(applicationId, officerId) {
  const response = await api.put('/gov/applications/allocation', {
    applicationId,
    officerId,
  })
  return response.data
}

export async function submitApplicationBySchemeCode(schemeCode) {
  const response = await api.post(`/gov/applications/submit/${schemeCode}`)
  return response.data
}

export async function uploadApplicationDocuments(schemeCode, files, types) {
  const formData = new FormData()

  files.forEach((file) => {
    formData.append('files', file)
  })

  types.forEach((type) => {
    formData.append('types', type)
  })

  const response = await api.post(`/gov/applications/upload-documents/${schemeCode}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.data
}

export async function cancelApplicationById(applicationId) {
  const response = await api.delete(`/gov/applications/${applicationId}`)
  return response.data
}

export async function getAvailableOfficersWorkload(stage) {
  const response = await api.get(`/api/v1/allocation/officers/available?stage=${stage}`)
  return response.data
}

export async function batchAllocateApplications(stage, count) {
  const response = await api.post('/api/v1/allocation/batch', { stage, count })
  return response.data
}
