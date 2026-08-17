import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import { ThemeProvider } from './src/context/ThemeContext'
import Landing from './src/pages/Landing'
import Login from './src/pages/auth/Login'
import Register from './src/pages/auth/Register'
import Dashboard from './src/pages/beneficiary/Dashboard'
import ApplicationTracking from './src/pages/beneficiary/ApplicationTracking'
import FundsTracker from './src/pages/beneficiary/FundsTracker'
import SchemeDetail from './src/pages/SchemeDetail'
import OfficerDashboard from './src/pages/officers/OfficerDashboard'
import AdminDashboard from './src/pages/admins/AdminDashboard'
import FinanceDashboard from './src/pages/officers/FinanceDashboard'
import SchemeDashboard from './src/pages/scheme-dashboard'

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tracking/:schemeCode" element={<ApplicationTracking />} />
          <Route path="/funds/:schemeCode" element={<FundsTracker />} />
          <Route path="/scheme/:id" element={<SchemeDetail />} />
          <Route path="/officer/login" element={<Login />} />
          <Route path="/officer/register" element={<Register />} />
          <Route path="/officer/dashboard" element={<OfficerDashboard />} />
          {/* /admin/login now redirects to unified /login */}
          <Route path="/admin/login" element={<Navigate to="/login" replace />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/finance" element={<FinanceDashboard />} />
          <Route path="/analytics" element={<SchemeDashboard />} />
        </Routes>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
