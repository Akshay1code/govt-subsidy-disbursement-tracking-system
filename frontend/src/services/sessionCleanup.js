const CACHE_KEYS = [
  'gov-subsidy-applications',
  'gov-subsidy-officer-applications',
  'gov-subsidy-finance-audit-logs',
  'gov-subsidy-auth',
]

export function clearPortalSessionCaches() {
  if (typeof window === 'undefined') {
    return
  }

  CACHE_KEYS.forEach((key) => {
    window.localStorage.removeItem(key)
    window.sessionStorage.removeItem(key)
  })
}
