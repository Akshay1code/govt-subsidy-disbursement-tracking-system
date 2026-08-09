import { createContext, useContext, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const location = useLocation()
  const path = location.pathname.replace(/\/$/, '') || '/'
  const isExcluded = [
    '/',
    '/login',
    '/officer/login',
    '/admin/login',
    '/register',
    '/officer/register'
  ].includes(path)
  const isThemeEnabled = !isExcluded

  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    if (isThemeEnabled && theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
  }, [theme, isThemeEnabled])

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'))
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    // Fallback if rendered outside provider
    return { theme: 'dark', toggleTheme: () => {} }
  }
  return context
}
