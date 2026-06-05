import React, { useState } from 'react'
import { Form, Input, Button, Select, Card, message } from 'antd'
import { UserOutlined, LockOutlined, TeamOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { UserRole } from '@shared/types'

const roleOptions = [
  { value: UserRole.OPTIMIZER, label: '优化师' },
  { value: UserRole.MEDIA_SUPERVISOR, label: '媒介主管' },
  { value: UserRole.STRATEGY_DIRECTOR, label: '策略总监' },
  { value: UserRole.ADVERTISER, label: '广告主' },
  { value: UserRole.AGENCY, label: '代理' },
  { value: UserRole.MEDIA, label: '媒体' },
  { value: UserRole.ADMIN, label: '管理员' }
]

const Login: React.FC = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuthStore()

  const handleSubmit = async (values: {
    username: string
    password: string
    role: UserRole
  }) => {
    setLoading(true)
    try {
      await login(values.username, values.password)
      navigate('/dashboard')
    } catch (error) {
      console.error('Login error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = (role: UserRole) => {
    const roleNames: Record<UserRole, string> = {
      [UserRole.OPTIMIZER]: 'optimizer',
      [UserRole.MEDIA_SUPERVISOR]: 'supervisor',
      [UserRole.STRATEGY_DIRECTOR]: 'director',
      [UserRole.ADVERTISER]: 'advertiser',
      [UserRole.AGENCY]: 'agency',
      [UserRole.MEDIA]: 'media',
      [UserRole.ADMIN]: 'admin'
    }
    form.setFieldsValue({
      username: roleNames[role],
      password: '123456'
    })
  }

  return (
    <div className="login-container">
      <Card className="login-card" bordered={false}>
        <div className="login-header">
          <div className="login-logo">
            <TeamOutlined />
          </div>
          <h1 className="login-title">广告数据分析平台</h1>
          <p className="login-subtitle">全国性多渠道广告投放与效果归因智能分析</p>
        </div>
        <Form
          form={form}
          className="login-form"
          layout="vertical"
          initialValues={{
            username: 'optimizer',
            password: '123456',
            role: UserRole.OPTIMIZER
          }}
          onFinish={handleSubmit}
        >
          <Form.Item
            name="role"
            label="用户角色"
            rules={[{ required: true, message: '请选择用户角色' }]}
          >
            <Select
              placeholder="请选择用户角色"
              size="large"
              options={roleOptions}
              onChange={handleRoleChange}
            />
          </Form.Item>
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              size="large"
              prefix={<UserOutlined />}
              placeholder="请输入用户名"
            />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              size="large"
              prefix={<LockOutlined />}
              placeholder="请输入密码"
            />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              size="large"
              htmlType="submit"
              loading={loading}
              style={{ width: '100%', height: 44, fontSize: 16 }}
            >
              登 录
            </Button>
          </Form.Item>
          <div style={{
            textAlign: 'center',
            fontSize: 12,
            color: 'rgba(0, 0, 0, 0.45)',
            marginTop: 16
          }}>
            <p>提示：选择角色后会自动填充对应账号</p>
            <p>密码统一为：123456</p>
          </div>
        </Form>
      </Card>
    </div>
  )
}

export default Login
