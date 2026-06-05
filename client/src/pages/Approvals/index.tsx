import React, { useState, useEffect } from 'react'
import { Tabs, Table, Button, Tag, Space, Modal, Form, Input, message, Steps, Timeline, Divider, Card } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, FormOutlined, UserOutlined, ClockCircleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { ApprovalStatus, ApprovalAction, UserRole, User } from '@shared/types'
import { getApprovals, getApprovalDetail, approveApproval, rejectApproval } from '@/api/approvals'
import { useAuthStore } from '@/store/authStore'
import type { ApprovalRequest } from '@shared/types'
const { Step } = Steps
const { TextArea } = Input

const Approvals: React.FC = () => {
  const [activeKey, setActiveKey] = useState<'pending' | 'initiated' | 'completed'>('pending')
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [approvalModalVisible, setApprovalModalVisible] = useState(false)
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null)
  const [form] = Form.useForm()
  const { user, permissions } = useAuthStore()

  useEffect(() => {
    loadApprovals()
  }, [activeKey])

  const loadApprovals = async () => {
    setLoading(true)
    try {
      const res = await getApprovals({ tab: activeKey })
      setApprovals(res.list)
      setTotal(res.total)
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetail = async (approval: ApprovalRequest) => {
    const detail = await getApprovalDetail(approval.id)
    setSelectedApproval(detail)
    setDetailModalVisible(true)
  }

  const handleApprove = (approval: ApprovalRequest) => {
    setSelectedApproval(approval)
    setApprovalModalVisible(true)
    form.resetFields()
  }

  const handleReject = (approval: ApprovalRequest) => {
    setSelectedApproval(approval)
    setApprovalModalVisible(true)
    form.resetFields()
  }

  const handleSubmitApproval = async (values: { comment: string }, isApprove: boolean) => {
    if (!selectedApproval || !user) return

    let level = 1
    if (user.role === UserRole.MEDIA_SUPERVISOR) level = 2
    if (user.role === UserRole.STRATEGY_DIRECTOR) level = 3

    try {
      if (isApprove) {
        await approveApproval(selectedApproval.id, level, values.comment)
        message.success('审批通过')
      } else {
        await rejectApproval(selectedApproval.id, level, values.comment)
        message.success('已驳回')
      }
      setApprovalModalVisible(false)
      setSelectedApproval(null)
      form.resetFields()
      loadApprovals()
    } catch (error) {
      message.error('操作失败')
    }
  }

  const getCurrentStep = (status: ApprovalStatus): number => {
    switch (status) {
      case ApprovalStatus.PENDING:
        return 0
      case ApprovalStatus.OPTIMIZER_APPROVED:
        return 1
      case ApprovalStatus.SUPERVISOR_APPROVED:
        return 2
      case ApprovalStatus.DIRECTOR_APPROVED:
        return 3
      case ApprovalStatus.COMPLETED:
        return 3
      case ApprovalStatus.REJECTED:
        return -1
      default:
        return 0
    }
  }

  const getApprovalLevel = (user: User): number => {
    if (user.role === UserRole.OPTIMIZER) return 1
    if (user.role === UserRole.MEDIA_SUPERVISOR) return 2
    if (user.role === UserRole.STRATEGY_DIRECTOR) return 3
    return 0
  }

  const canApprove = (approval: ApprovalRequest): boolean => {
    if (!permissions || !user) return false
    const level = getApprovalLevel(user)
    const currentStep = getCurrentStep(approval.status)
    return level === currentStep + 1 && approval.status !== ApprovalStatus.REJECTED && approval.status !== ApprovalStatus.COMPLETED
  }

  const actionNames: Record<ApprovalAction, string> = {
    [ApprovalAction.PAUSE]: '暂停投放',
    [ApprovalAction.ADJUST_BID]: '调整出价',
    [ApprovalAction.REPLACE_CREATIVE]: '更换创意',
    [ApprovalAction.CHANGE_BUDGET]: '调整预算'
  }

  const statusColors: Record<ApprovalStatus, string> = {
    [ApprovalStatus.PENDING]: 'orange',
    [ApprovalStatus.OPTIMIZER_APPROVED]: 'blue',
    [ApprovalStatus.SUPERVISOR_APPROVED]: 'cyan',
    [ApprovalStatus.DIRECTOR_APPROVED]: 'green',
    [ApprovalStatus.COMPLETED]: 'success',
    [ApprovalStatus.REJECTED]: 'red'
  }

  const statusNames: Record<ApprovalStatus, string> = {
    [ApprovalStatus.PENDING]: '待优化师审批',
    [ApprovalStatus.OPTIMIZER_APPROVED]: '待主管复核',
    [ApprovalStatus.SUPERVISOR_APPROVED]: '待总监批准',
    [ApprovalStatus.DIRECTOR_APPROVED]: '待执行',
    [ApprovalStatus.COMPLETED]: '已完成',
    [ApprovalStatus.REJECTED]: '已驳回'
  }

  const columns = [
    {
      title: '申请编号',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      render: (text: string) => text.slice(0, 12)
    },
    {
      title: '调整动作',
      dataIndex: 'action',
      key: 'action',
      render: (action: ApprovalAction) => <Tag color="blue">{actionNames[action]}</Tag>
    },
    {
      title: '调整内容',
      dataIndex: 'actionDetails',
      key: 'actionDetails',
      render: (details: Record<string, any>) => (
        <span>
          {details.oldValue} → {details.newValue}
        </span>
      )
    },
    {
      title: '申请原因',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
      width: 250
    },
    {
      title: '当前节点',
      dataIndex: 'status',
      key: 'status',
      render: (status: ApprovalStatus) => (
        <Tag color={statusColors[status]}>{statusNames[status]}</Tag>
      )
    },
    {
      title: '申请时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_: any, record: ApprovalRequest) => (
        <Space>
          <Button
            size="small"
            icon={<FormOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          {canApprove(record) && (
            <>
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleApprove(record)}
              >
                通过
              </Button>
              <Button
                danger
                size="small"
                icon={<CloseCircleOutlined />}
                onClick={() => handleReject(record)}
              >
                驳回
              </Button>
            </>
          )}
        </Space>
      )
    }
  ]

  const getHistoryItems = (approval: ApprovalRequest) => {
    const items: Array<{ user: string; action: string; time: string; comment: string }> = []

    items.push({
      user: '优化师',
      action: '发起审批申请',
      time: approval.createdAt,
      comment: approval.reason
    })

    if (approval.optimizerTime && approval.optimizerComment) {
      items.push({
        user: '优化师',
        action: approval.status === ApprovalStatus.REJECTED && !approval.supervisorTime ? '驳回' : '审批通过',
        time: approval.optimizerTime,
        comment: approval.optimizerComment
      })
    }

    if (approval.supervisorTime && approval.supervisorComment) {
      items.push({
        user: '媒介主管',
        action: approval.status === ApprovalStatus.REJECTED && !approval.directorTime ? '驳回' : '复核通过',
        time: approval.supervisorTime,
        comment: approval.supervisorComment
      })
    }

    if (approval.directorTime && approval.directorComment) {
      items.push({
        user: '策略总监',
        action: approval.status === ApprovalStatus.REJECTED ? '驳回' : '批准执行',
        time: approval.directorTime,
        comment: approval.directorComment
      })
    }

    if (approval.completedAt) {
      items.push({
        user: '系统',
        action: approval.status === ApprovalStatus.COMPLETED ? '执行完成' : '已驳回结束',
        time: approval.completedAt,
        comment: approval.status === ApprovalStatus.COMPLETED ? '调整方案已执行' : '审批流程结束'
      })
    }

    return items
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">审批中心</h1>
        <p className="page-subtitle">三级审批流程，确保广告投放策略的合理性</p>
      </div>

      <Card className="card-shadow">
        <Tabs
          activeKey={activeKey}
          onChange={(k) => setActiveKey(k as 'pending' | 'initiated' | 'completed')}
          items={[
            { key: 'pending', label: '待我审批' },
            { key: 'initiated', label: '我发起的' },
            { key: 'completed', label: '已完成' }
          ]}
        />
        <Table
          columns={columns}
          dataSource={approvals}
          rowKey="id"
          loading={loading}
          pagination={{
            total,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => `共 ${t} 条记录`
          }}
        />
      </Card>

      <Modal
        title="审批详情"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false)
          setSelectedApproval(null)
        }}
        footer={[
          <Button key="close" onClick={() => {
            setDetailModalVisible(false)
            setSelectedApproval(null)
          }}>
            关闭
          </Button>
        ]}
        width={800}
        className="detail-modal"
      >
        {selectedApproval && (
          <div>
            <div className="approval-steps">
              <Steps
                current={getCurrentStep(selectedApproval.status)}
                status={selectedApproval.status === ApprovalStatus.REJECTED ? 'error' : 'process'}
                size="small"
              >
                <Step title="发起申请" icon={<UserOutlined />} />
                <Step title="优化师审批" icon={<UserOutlined />} />
                <Step title="主管复核" icon={<UserOutlined />} />
                <Step title="总监批准" icon={<UserOutlined />} />
              </Steps>
            </div>

            <div className="detail-section">
              <div className="detail-label">调整动作</div>
              <div className="detail-value">
                <Tag color="blue">{actionNames[selectedApproval.action]}</Tag>
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-label">调整内容</div>
              <div className="detail-value">
                原值: <strong>{selectedApproval.actionDetails.oldValue}</strong>
                {' → '}
                新值: <strong>{selectedApproval.actionDetails.newValue}</strong>
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-label">申请原因</div>
              <div className="detail-value">{selectedApproval.reason}</div>
            </div>

            <Divider orientation="left">审批历史</Divider>

            <Timeline
              mode="left"
              items={getHistoryItems(selectedApproval).map((item, _idx) => ({
                dot: <ClockCircleOutlined />,
                children: (
                  <div className="timeline-item">
                    <div className="timeline-header">
                      <span className="timeline-user">{item.user}</span>
                      <span className="timeline-time">{dayjs(item.time).format('YYYY-MM-DD HH:mm:ss')}</span>
                    </div>
                    <div className="timeline-action">{item.action}</div>
                    <div className="timeline-comment">{item.comment}</div>
                  </div>
                )
              }))}
            />
          </div>
        )}
      </Modal>

      <Modal
        title={selectedApproval?.status === ApprovalStatus.REJECTED ? '驳回审批' : '审批通过'}
        open={approvalModalVisible}
        onCancel={() => {
          setApprovalModalVisible(false)
          setSelectedApproval(null)
          form.resetFields()
        }}
        footer={null}
        width={480}
        className="detail-modal"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => handleSubmitApproval(values, true)}
        >
          <Form.Item
            name="comment"
            label="审批意见"
            rules={[{ required: true, message: '请输入审批意见' }]}
          >
            <TextArea rows={4} placeholder="请输入审批意见" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setApprovalModalVisible(false)
                setSelectedApproval(null)
                form.resetFields()
              }}>
                取消
              </Button>
              <Button
                danger
                onClick={() => form.validateFields().then((values) => handleSubmitApproval(values, false))}
              >
                驳回
              </Button>
              <Button type="primary" htmlType="submit">
                通过
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Approvals
