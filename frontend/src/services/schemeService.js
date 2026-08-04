import api from './api'

// TODO: wire up as backend scheme endpoints are built out

export async function getSchemes() {
  const response = await api.get('/gov/schemes')
  return response.data
}

export async function addScheme(schemeData) {
  const response = await api.post('/gov/schemes/add', schemeData)
  return response.data
}
