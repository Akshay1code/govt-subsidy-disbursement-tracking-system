import api from './api'

/**
 * Registers a new beneficiary on the backend.
 *
 * Maps the frontend registration form to the backend SignupRequest DTO:
 *   { fullName, role, mobileNo, region, district, state, username, password }
 *
 * @param {object} formData - Fields from the Register form
 * @returns {Promise<{ status: boolean, message: string }>}
 */
export async function register(formData) {
  const payload = {
    fullName: formData.fullName,
    role: 'BENEFICIARY',
    mobileNo: formData.mobileNo,
    region: formData.region,
    district: formData.district,
    state: formData.state,
    username: formData.username,
    password: formData.password,
  }

  const response = await api.post('/gov/auth/signup', payload)
  return response.data //{ status: boolean, message: string }
}

/**
 * Registers a new officer on the backend.
 *
 * @param {object} formData - Fields from the Officer Register form
 * @returns {Promise<{ status: boolean, message: string }>}
 */
export async function registerOfficer(formData) {
  const payload = {
    fullName: formData.fullName,
    role: 'OFFICER',
    officerId: formData.officerId,
    designation: formData.designation,
    department: formData.department,
    district: formData.district,
    email: formData.email,
    employeeCode: formData.employeeCode,
    password: formData.password,
  }

  const response = await api.post('/gov/auth/signup', payload)
  return response.data
}

/**
 * Logs a user in via the backend.
 *
 * The backend returns an HttpOnly "token" cookie on success — Axios
 * will automatically store and send it on subsequent requests because
 * the api instance has `withCredentials: true`.
 *
 * @param {object} credentials - { username, password }
 * @returns {Promise<{ status: boolean, message: string }>}
 */
export async function login(credentials) {
  const payload = {
    username: credentials.username,
    password: credentials.password,
  }
  const response = await api.post('/gov/auth/signin', payload)
  return response.data  // { status: boolean, message: string }
}
