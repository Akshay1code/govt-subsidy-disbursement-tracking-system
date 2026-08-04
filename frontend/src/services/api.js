import axios from 'axios'

// Central Axios instance wired to the Spring Boot backend.
// withCredentials: true ensures the HttpOnly JWT cookie is
// automatically sent with every request (needed for /gov/auth/signin).
const api = axios.create({
  baseURL: 'http://localhost:8080',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
})

// Response interceptor — normalize errors so every service
// can just `throw` a plain string message.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data ||
      error.message ||
      'An unexpected error occurred.'
    return Promise.reject(new Error(message))
  }
)

export default api
