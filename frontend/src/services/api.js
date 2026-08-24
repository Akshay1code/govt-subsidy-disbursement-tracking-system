import axios from 'axios'
import { clearPortalSessionCaches } from './sessionCleanup'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
})

// A 401 from these endpoints means "bad credentials", not "session expired",
// so it must not trigger the redirect — the auth pages show their own message.
const AUTH_ENDPOINTS = ['/gov/auth/signin', '/gov/auth/signup']

// Guard so a burst of concurrent 401s (a dashboard firing several requests at
// once) only redirects a single time.
let redirectingToLogin = false

function isAuthEndpoint(url) {
  return typeof url === 'string' && AUTH_ENDPOINTS.some((path) => url.includes(path))
}

function onAuthPage() {
  if (typeof window === 'undefined') return false
  const path = window.location.pathname
  // Covers /login, /officer/login, /admin/login, /register, /officer/register
  return path.includes('login') || path.includes('register')
}

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status

    // Session expired or not authenticated (backend now returns 401 for this):
    // clear cached portal state and bounce the user to the login page. Skipped
    // for auth calls and when already on an auth page so a failed login keeps
    // showing its own error instead of reloading.
    if (status === 401 && !isAuthEndpoint(error.config?.url) && !onAuthPage()) {
      if (!redirectingToLogin) {
        redirectingToLogin = true
        clearPortalSessionCaches()
        if (typeof window !== 'undefined') {
          window.location.replace('/login')
        }
      }
    }

    const message =
      error.response?.data?.message ||
      error.response?.data ||
      error.message ||
      'An unexpected error occurred.'
    return Promise.reject(new Error(message))
  }
)

export default api
