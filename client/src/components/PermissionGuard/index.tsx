import React from 'react'
import { Navigate } from 'react-router-dom'
import { Result, Button } from 'antd'
import { useAuthStore } from '@/store/authStore'
import { UserRole } from '@shared/types'

interface PermissionGuardProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <Result
        status="403"
        title="403"
        subTitle="抱歉，您没有权限访问此页面"
        extra={
          <Button type="primary" onClick={() => window.history.back()}>
            返回上一页
          </Button>
        }
      />
    )
  }

  return <>{children}</>
}

export default PermissionGuard
