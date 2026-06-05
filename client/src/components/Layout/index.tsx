import React, { useState } from 'react'
import { Layout as AntLayout, Menu, Avatar, Dropdown, Badge } from 'antd'
import {
  DashboardOutlined,
  BellOutlined,
  CheckCircleOutlined,
  CalendarOutlined,
  FileTextOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { UserRole } from '@shared/types'

const { Header, Sider, Content } = AntLayout

interface LayoutProps {
  children: React.ReactNode
}

const roleMenuConfig: Record<UserRole, Array<{ key: string; label: string; icon: React.ReactNode }>> = {
  [UserRole.OPTIMIZER]: [
    { key: '/dashboard', label: '数据看板', icon: <DashboardOutlined /> },
    { key: '/alerts', label: '预警管理', icon: <BellOutlined /> },
    { key: '/approvals', label: '审批中心', icon: <CheckCircleOutlined /> },
    { key: '/schedules', label: '广告排期', icon: <CalendarOutlined /> },
    { key: '/reports', label: '诊断报告', icon: <FileTextOutlined /> }
  ],
  [UserRole.MEDIA_SUPERVISOR]: [
    { key: '/dashboard', label: '数据看板', icon: <DashboardOutlined /> },
    { key: '/alerts', label: '预警管理', icon: <BellOutlined /> },
    { key: '/approvals', label: '审批中心', icon: <CheckCircleOutlined /> },
    { key: '/schedules', label: '广告排期', icon: <CalendarOutlined /> },
    { key: '/reports', label: '诊断报告', icon: <FileTextOutlined /> }
  ],
  [UserRole.STRATEGY_DIRECTOR]: [
    { key: '/dashboard', label: '数据看板', icon: <DashboardOutlined /> },
    { key: '/alerts', label: '预警管理', icon: <BellOutlined /> },
    { key: '/approvals', label: '审批中心', icon: <CheckCircleOutlined /> },
    { key: '/schedules', label: '广告排期', icon: <CalendarOutlined /> },
    { key: '/reports', label: '诊断报告', icon: <FileTextOutlined /> }
  ],
  [UserRole.ADVERTISER]: [
    { key: '/dashboard', label: '数据看板', icon: <DashboardOutlined /> },
    { key: '/schedules', label: '广告排期', icon: <CalendarOutlined /> },
    { key: '/reports', label: '诊断报告', icon: <FileTextOutlined /> }
  ],
  [UserRole.AGENCY]: [
    { key: '/dashboard', label: '数据看板', icon: <DashboardOutlined /> },
    { key: '/schedules', label: '广告排期', icon: <CalendarOutlined /> },
    { key: '/reports', label: '诊断报告', icon: <FileTextOutlined /> }
  ],
  [UserRole.MEDIA]: [
    { key: '/dashboard', label: '数据看板', icon: <DashboardOutlined /> },
    { key: '/reports', label: '诊断报告', icon: <FileTextOutlined /> }
  ],
  [UserRole.ADMIN]: [
    { key: '/dashboard', label: '数据看板', icon: <DashboardOutlined /> },
    { key: '/alerts', label: '预警管理', icon: <BellOutlined /> },
    { key: '/approvals', label: '审批中心', icon: <CheckCircleOutlined /> },
    { key: '/schedules', label: '广告排期', icon: <CalendarOutlined /> },
    { key: '/reports', label: '诊断报告', icon: <FileTextOutlined /> }
  ]
}

const roleNames: Record<UserRole, string> = {
  [UserRole.OPTIMIZER]: '优化师',
  [UserRole.MEDIA_SUPERVISOR]: '媒介主管',
  [UserRole.STRATEGY_DIRECTOR]: '策略总监',
  [UserRole.ADVERTISER]: '广告主',
  [UserRole.AGENCY]: '代理',
  [UserRole.MEDIA]: '媒体',
  [UserRole.ADMIN]: '管理员'
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()

  if (!user) return null

  const menuItems = roleMenuConfig[user.role] || roleMenuConfig[UserRole.OPTIMIZER]

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息'
    },
    {
      type: 'divider' as const
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => {
        logout()
        navigate('/login')
      }
    }
  ]

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="dark">
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: collapsed ? 20 : 18,
          fontWeight: 'bold',
          background: 'rgba(255, 255, 255, 0.1)'
        }}>
          {collapsed ? 'AD' : '广告分析平台'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <AntLayout>
        <Header style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          background: '#001529'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {collapsed
              ? <MenuUnfoldOutlined style={{ color: '#fff', fontSize: 20, cursor: 'pointer' }} onClick={() => setCollapsed(false)} />
              : <MenuFoldOutlined style={{ color: '#fff', fontSize: 20, cursor: 'pointer' }} onClick={() => setCollapsed(true)} />
            }
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <Badge count={3} size="small">
              <BellOutlined style={{ color: '#fff', fontSize: 18, cursor: 'pointer' }} />
            </Badge>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                <Avatar size={32} icon={<UserOutlined />} style={{ background: '#1890ff' }} />
                <div style={{ color: '#fff', lineHeight: 1.2 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{user.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>{roleNames[user.role]}</div>
                </div>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content style={{
          margin: 0,
          minHeight: 'calc(100vh - 64px)',
          background: '#f0f2f5'
        }}>
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  )
}

export default Layout
