import { Routes, Route, Navigate } from 'react-router-dom'
import { UserRole } from '@shared/types'
import { useAuthStore } from '@/store/authStore'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Alerts from '@/pages/Alerts'
import Approvals from '@/pages/Approvals'
import Schedules from '@/pages/Schedules'
import Reports from '@/pages/Reports'
import ReportDetail from '@/pages/Reports/ReportDetail'
import Layout from '@/components/Layout'
import PermissionGuard from '@/components/PermissionGuard'

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/dashboard"
          element={
            <PermissionGuard>
              <Dashboard />
            </PermissionGuard>
          }
        />
        <Route
          path="/alerts"
          element={
            <PermissionGuard allowedRoles={[UserRole.OPTIMIZER, UserRole.MEDIA_SUPERVISOR, UserRole.STRATEGY_DIRECTOR]}>
              <Alerts />
            </PermissionGuard>
          }
        />
        <Route
          path="/approvals"
          element={
            <PermissionGuard allowedRoles={[UserRole.OPTIMIZER, UserRole.MEDIA_SUPERVISOR, UserRole.STRATEGY_DIRECTOR]}>
              <Approvals />
            </PermissionGuard>
          }
        />
        <Route
          path="/schedules"
          element={
            <PermissionGuard allowedRoles={[UserRole.OPTIMIZER, UserRole.MEDIA_SUPERVISOR, UserRole.ADVERTISER, UserRole.AGENCY]}>
              <Schedules />
            </PermissionGuard>
          }
        />
        <Route
          path="/reports"
          element={
            <PermissionGuard>
              <Reports />
            </PermissionGuard>
          }
        />
        <Route
          path="/reports/:id"
          element={
            <PermissionGuard>
              <ReportDetail />
            </PermissionGuard>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
