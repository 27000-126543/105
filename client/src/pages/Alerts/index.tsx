import React, { useState, useEffect } from 'react'
import { Tabs, Table, Button, Tag, Space, Modal, Form, Select, Input, message, Badge, Card } from 'antd'
import { AlertOutlined, CheckCircleOutlined, FormOutlined } from '@ant-design/icons'
import { AlertLevel, AlertStatus, ApprovalAction } from '@shared/types'
import { getAlerts, acknowledgeAlert, createApprovalFromAlert, updateAlertStatus } from '@/api/alerts'
import type { Alert } from '@shared/types'
const { TextArea } = Input
const { Option } = Select

const Alerts: React.FC = () => {
  const [activeKey, setActiveKey] = useState(AlertLevel.LEVEL_1)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    loadAlerts()
  }, [activeKey])

  const loadAlerts = async () => {
    setLoading(true)
    try {
      const res = await getAlerts({ level: activeKey as AlertLevel })
      setAlerts(res.list)
      setTotal(res.total)
    } finally {
      setLoading(false)
    }
  }

  const handleAcknowledge = async (alert: Alert) => {
    try {
      await acknowledgeAlert(alert.id)
      message.success('已确认预警')
      await updateAlertStatus(alert.id, AlertStatus.ACKNOWLEDGED)
      loadAlerts()
    } catch (error) {
      message.error('操作失败')
    }
  }

  const handleCreateApproval = (alert: Alert) => {
    setSelectedAlert(alert)
    form.setFieldsValue({
      action: ApprovalAction.ADJUST_BID,
      reason: alert.message
    })
    setModalVisible(true)
  }

  const handleSubmitApproval = async (values: {
    action: ApprovalAction
    oldValue: number
    newValue: number
    reason: string
  }) => {
    if (!selectedAlert) return

    try {
      await createApprovalFromAlert(selectedAlert.id, {
        action: values.action,
        actionDetails: {
          oldValue: values.oldValue,
          newValue: values.newValue
        },
        reason: values.reason
      })
      message.success('审批申请已提交')
      setModalVisible(false)
      setSelectedAlert(null)
      form.resetFields()
      loadAlerts()
    } catch (error) {
      message.error('提交失败')
    }
  }

  const statusColors: Record<AlertStatus, string> = {
    [AlertStatus.PENDING]: 'orange',
    [AlertStatus.ACKNOWLEDGED]: 'blue',
    [AlertStatus.PROCESSING]: 'processing',
    [AlertStatus.RESOLVED]: 'success',
    [AlertStatus.ESCALATED]: 'red'
  }

  const statusNames: Record<AlertStatus, string> = {
    [AlertStatus.PENDING]: '待处理',
    [AlertStatus.ACKNOWLEDGED]: '已确认',
    [AlertStatus.PROCESSING]: '处理中',
    [AlertStatus.RESOLVED]: '已解决',
    [AlertStatus.ESCALATED]: '已升级'
  }

  const columns = [
    {
      title: '广告位',
      dataIndex: 'positionId',
      key: 'positionId',
      render: (_: string, record: Alert) => record.message.split(' - ')[0]
    },
    {
      title: '问题类型',
      dataIndex: 'metricName',
      key: 'metricName',
      render: (text: string) => <Tag color="blue">{text}</Tag>
    },
    {
      title: '当前值',
      dataIndex: 'currentValue',
      key: 'currentValue',
      render: (value: number, record: Alert) => {
        if (record.type === 'cvr_low') {
          return `${(value * 100).toFixed(2)}%`
        }
        return value.toFixed(2)
      }
    },
    {
      title: '阈值',
      dataIndex: 'threshold',
      key: 'threshold',
      render: (value: number, record: Alert) => {
        if (record.type === 'cvr_low') {
          return `${(value * 100).toFixed(2)}%`
        }
        return value.toFixed(2)
      }
    },
    {
      title: '差值',
      key: 'diff',
      render: (_: any, record: Alert) => {
        const diff = ((record.currentValue - record.threshold) / record.threshold) * 100
        return (
          <Tag color={diff < 0 ? 'red' : 'green'}>
            {diff >= 0 ? '+' : ''}{diff.toFixed(2)}%
          </Tag>
        )
      }
    },
    {
      title: '持续时间',
      dataIndex: 'startTime',
      key: 'duration',
      render: (time: string) => {
        const diff = Date.now() - new Date(time).getTime()
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        return `${hours}小时${minutes}分钟`
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: AlertStatus) => (
        <Tag color={statusColors[status]}>{statusNames[status]}</Tag>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_: any, record: Alert) => (
        <Space>
          {record.status === AlertStatus.PENDING && (
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleAcknowledge(record)}
            >
              确认
            </Button>
          )}
          <Button
            size="small"
            icon={<FormOutlined />}
            onClick={() => handleCreateApproval(record)}
          >
            生成审批
          </Button>
        </Space>
      )
    }
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">预警管理</h1>
        <p className="page-subtitle">实时监控广告投放效果，及时发现并处理异常</p>
      </div>

      <Card className="card-shadow">
        <Tabs
          activeKey={activeKey}
          onChange={(key) => setActiveKey(key as AlertLevel)}
          items={[
            {
              key: AlertLevel.LEVEL_1,
              label: (
                <span>
                  <AlertOutlined style={{ color: '#ff4d4f' }} />
                  一级预警
                  <Badge count={activeKey === AlertLevel.LEVEL_1 ? total : 0} size="small" style={{ marginLeft: 8 }} />
                </span>
              )
            },
            {
              key: AlertLevel.LEVEL_2,
              label: (
                <span>
                  <AlertOutlined style={{ color: '#faad14' }} />
                  二级预警
                  <Badge count={activeKey === AlertLevel.LEVEL_2 ? total : 0} size="small" style={{ marginLeft: 8 }} />
                </span>
              )
            }
          ]}
        />
        <Table
          columns={columns}
          dataSource={alerts}
          rowKey="id"
          loading={loading}
          pagination={{
            total,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => `共 ${t} 条记录`
          }}
          rowClassName={(record) =>
            record.level === AlertLevel.LEVEL_1 ? 'alert-level-1' : 'alert-level-2'
          }
        />
      </Card>

      <Modal
        title="生成审批申请"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          setSelectedAlert(null)
          form.resetFields()
        }}
        footer={null}
        width={520}
        className="detail-modal"
      >
        {selectedAlert && (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmitApproval}
          >
            <div className="detail-section">
              <div className="detail-label">预警信息</div>
              <div className="detail-value">{selectedAlert.message}</div>
              <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
                当前值: {selectedAlert.type === 'cvr_low'
                  ? `${(selectedAlert.currentValue * 100).toFixed(2)}%`
                  : selectedAlert.currentValue.toFixed(2)}
                {' / '}
                阈值: {selectedAlert.type === 'cvr_low'
                  ? `${(selectedAlert.threshold * 100).toFixed(2)}%`
                  : selectedAlert.threshold.toFixed(2)}
              </div>
            </div>
            <Form.Item
              name="action"
              label="调整动作"
              rules={[{ required: true, message: '请选择调整动作' }]}
            >
              <Select placeholder="请选择调整动作">
                <Option value={ApprovalAction.PAUSE}>暂停投放</Option>
                <Option value={ApprovalAction.ADJUST_BID}>调整出价</Option>
                <Option value={ApprovalAction.REPLACE_CREATIVE}>更换创意</Option>
                <Option value={ApprovalAction.CHANGE_BUDGET}>调整预算</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="oldValue"
              label="原值"
              rules={[{ required: true, message: '请输入原值' }]}
            >
              <Input placeholder="请输入原值" type="number" step="0.01" />
            </Form.Item>
            <Form.Item
              name="newValue"
              label="调整后值"
              rules={[{ required: true, message: '请输入调整后值' }]}
            >
              <Input placeholder="请输入调整后值" type="number" step="0.01" />
            </Form.Item>
            <Form.Item
              name="reason"
              label="调整原因"
              rules={[{ required: true, message: '请输入调整原因' }]}
            >
              <TextArea rows={4} placeholder="请详细说明调整原因" />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => {
                  setModalVisible(false)
                  setSelectedAlert(null)
                  form.resetFields()
                }}>
                  取消
                </Button>
                <Button type="primary" htmlType="submit">
                  提交审批
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  )
}

export default Alerts
