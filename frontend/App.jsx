import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './src/context/ThemeContext'
import Landing from './src/pages/Landing'
import Login from './src/pages/auth/Login'
import Register from './src/pages/auth/Register'
import Dashboard from './src/pages/beneficiary/Dashboard'
import SchemeDetail from './src/pages/SchemeDetail'
import OfficerDashboard from './src/pages/officers/OfficerDashboard'
import AdminLogin from './src/pages/admins/AdminLogin'
import AdminDashboard from './src/pages/admins/AdminDashboard'
import FinanceDashboard from './src/pages/officers/FinanceDashboard'

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/scheme/:id" element={<SchemeDetail />} />
          <Route path="/officer/login" element={<Login />} />
          <Route path="/officer/register" element={<Register />} />
          <Route path="/officer/dashboard" element={<OfficerDashboard />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/finance/dashboard" element={<FinanceDashboard />} />
          <Route path="/finance" element={<FinanceDashboard />} />
        </Routes>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
