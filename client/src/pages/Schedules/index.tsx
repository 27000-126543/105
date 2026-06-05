import React, { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Upload,
  Select,
  message,
  Drawer,
  Card,
  Descriptions,
  List,
  Empty
} from 'antd'
import {
  UploadOutlined,
  FileExcelOutlined,
  PictureOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  BulbOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import type { UploadFile, UploadProps } from 'antd/es/upload/interface'
import { AdSchedule, ForecastResult } from '@shared/types'
import { getSchedules, uploadScheduleExcel, uploadCreative, getForecast, updateScheduleStatus } from '@/api/schedules'
import { Line } from '@ant-design/charts'
import { formatNumber } from '@shared/utils'

const { Option } = Select

const Schedules: React.FC = () => {
  const [schedules, setSchedules] = useState<AdSchedule[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState<AdSchedule['status'] | undefined>()
  const [uploadModalVisible, setUploadModalVisible] = useState(false)
  const [creativeModalVisible, setCreativeModalVisible] = useState(false)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<AdSchedule | null>(null)
  const [forecast, setForecast] = useState<ForecastResult | null>(null)
  const [forecastLoading, setForecastLoading] = useState(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [creativeList, setCreativeList] = useState<UploadFile[]>([])

  useEffect(() => {
    loadSchedules()
  }, [statusFilter])

  const loadSchedules = async () => {
    setLoading(true)
    try {
      const res = await getSchedules({ status: statusFilter })
      setSchedules(res.schedules)
      setTotal(res.total)
    } finally {
      setLoading(false)
    }
  }

  const handleExcelUpload: UploadProps['beforeUpload'] = async (file) => {
    try {
      const result = await uploadScheduleExcel(file as File)
      message.success(`成功导入 ${result.count} 条排期记录`)
      setUploadModalVisible(false)
      setFileList([])
      loadSchedules()
    } catch (error) {
      message.error('导入失败，请检查文件格式')
    }
    return false
  }

  const handleCreativeUpload: UploadProps['beforeUpload'] = async (file) => {
    try {
      const result = await uploadCreative(file as File)
      message.success('创意素材上传成功')
      setCreativeList([...creativeList, {
        uid: Date.now().toString(),
        name: file.name,
        status: 'done',
        url: result.url
      }])
    } catch (error) {
      message.error('上传失败')
    }
    return false
  }

  const handleViewForecast = async (schedule: AdSchedule) => {
    setSelectedSchedule(schedule)
    setDrawerVisible(true)
    setForecastLoading(true)
    try {
      const res = await getForecast(schedule.id)
      setForecast(res)
    } catch (error) {
      message.error('获取预测数据失败')
    } finally {
      setForecastLoading(false)
    }
  }

  const handleToggleStatus = async (schedule: AdSchedule, newStatus: 'active' | 'paused') => {
    try {
      await updateScheduleStatus(schedule.id, newStatus)
      message.success(`已${newStatus === 'active' ? '启用' : '暂停'}排期`)
      loadSchedules()
    } catch (error) {
      message.error('操作失败')
    }
  }

  const statusColors: Record<AdSchedule['status'], string> = {
    active: 'success',
    paused: 'orange',
    completed: 'blue',
    pending: 'default'
  }

  const statusNames: Record<AdSchedule['status'], string> = {
    active: '投放中',
    paused: '已暂停',
    completed: '已完成',
    pending: '待开始'
  }

  const columns = [
    {
      title: '排期名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text: string) => <strong>{text}</strong>
    },
    {
      title: '广告主',
      dataIndex: 'advertiserId',
      key: 'advertiserId',
      render: (id: string) => {
        const names: Record<string, string> = {
          'adv1': '阿里巴巴',
          'adv2': '字节跳动',
          'adv3': '美团',
          'adv4': '京东',
          'adv5': '拼多多'
        }
        return names[id] || id
      }
    },
    {
      title: '媒体渠道',
      dataIndex: 'channelId',
      key: 'channelId',
      render: (id: string) => {
        const names: Record<string, string> = {
          'ch1': '微信广告',
          'ch2': '抖音广告',
          'ch3': '百度搜索',
          'ch4': '小红书',
          'ch5': '快手'
        }
        return names[id] || id
      }
    },
    {
      title: '投放周期',
      key: 'period',
      render: (_: any, record: AdSchedule) => (
        <span>
          {dayjs(record.startDate).format('YYYY-MM-DD')}
          {' ~ '}
          {dayjs(record.endDate).format('YYYY-MM-DD')}
        </span>
      )
    },
    {
      title: '总预算',
      dataIndex: 'budget',
      key: 'budget',
      render: (value: number) => `¥${formatNumber(value)}`
    },
    {
      title: '日预算',
      dataIndex: 'dailyBudget',
      key: 'dailyBudget',
      render: (value: number) => `¥${formatNumber(value)}`
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: AdSchedule['status']) => (
        <Tag color={statusColors[status]}>{statusNames[status]}</Tag>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 240,
      render: (_: any, record: AdSchedule) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewForecast(record)}
          >
            预测分析
          </Button>
          {record.status === 'active' && (
            <Button
              size="small"
              icon={<PauseCircleOutlined />}
              onClick={() => handleToggleStatus(record, 'paused')}
            >
              暂停
            </Button>
          )}
          {record.status === 'paused' && (
            <Button
              type="primary"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleToggleStatus(record, 'active')}
            >
              启用
            </Button>
          )}
        </Space>
      )
    }
  ]

  const forecastChartConfig = forecast ? {
    data: forecast.predictions.map(p => ({
      time: dayjs(p.time).format('MM-DD HH:mm'),
      预测点击量: p.predictedClicks,
      预测转化量: p.predictedConversions,
      置信度: p.confidence * 100
    })),
    xField: 'time',
    yField: ['预测点击量', '预测转化量'],
    color: ['#1890ff', '#52c41a'],
    smooth: true,
    tooltip: {
      showCrosshairs: true
    },
    legend: {
      position: 'top' as const
    }
  } : null

  const priorityColors: Record<string, string> = {
    high: '#ff4d4f',
    medium: '#faad14',
    low: '#52c41a'
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">广告排期</h1>
        <p className="page-subtitle">管理广告投放计划，上传排期表和创意素材</p>
      </div>

      <div className="filter-bar">
        <Space wrap size="middle">
          <Select
            placeholder="状态筛选"
            style={{ width: 160 }}
            value={statusFilter}
            onChange={setStatusFilter}
            allowClear
          >
            <Option value="active">投放中</Option>
            <Option value="paused">已暂停</Option>
            <Option value="completed">已完成</Option>
            <Option value="pending">待开始</Option>
          </Select>
          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={() => setUploadModalVisible(true)}
          >
            导入排期表
          </Button>
          <Button
            icon={<PictureOutlined />}
            onClick={() => setCreativeModalVisible(true)}
          >
            上传创意素材
          </Button>
        </Space>
      </div>

      <Card className="card-shadow">
        <Table
          columns={columns}
          dataSource={schedules}
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
        title="导入排期表"
        open={uploadModalVisible}
        onCancel={() => {
          setUploadModalVisible(false)
          setFileList([])
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setUploadModalVisible(false)
            setFileList([])
          }}>
            取消
          </Button>
        ]}
        width={520}
      >
        <Upload
          fileList={fileList}
          beforeUpload={handleExcelUpload}
          accept=".xlsx,.xls,.csv"
          maxCount={1}
          onChange={({ fileList: newFileList }) => setFileList(newFileList)}
        >
          <div className="upload-area">
            <FileExcelOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
            <p style={{ fontSize: 16, marginBottom: 8 }}>点击或拖拽文件到此处上传</p>
            <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>支持 .xlsx, .xls, .csv 格式</p>
          </div>
        </Upload>
        <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
          <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)', margin: 0 }}>
            <strong>Excel模板格式：</strong>排期名称、广告主、媒体渠道、广告位、开始日期、结束日期、总预算、日预算、出价
          </p>
        </div>
      </Modal>

      <Modal
        title="上传创意素材"
        open={creativeModalVisible}
        onCancel={() => {
          setCreativeModalVisible(false)
          setCreativeList([])
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setCreativeModalVisible(false)
            setCreativeList([])
          }}>
            完成
          </Button>
        ]}
        width={520}
      >
        <Upload
          fileList={creativeList}
          beforeUpload={handleCreativeUpload}
          accept="image/*,video/*"
          multiple
          listType="picture-card"
          onChange={({ fileList: newFileList }) => setCreativeList(newFileList)}
        >
          <div>
            <PictureOutlined style={{ fontSize: 24, color: '#1890ff' }} />
            <p style={{ marginTop: 8 }}>上传素材</p>
          </div>
        </Upload>
        <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginTop: 12 }}>
          支持图片（jpg、png、gif）和视频（mp4、mov）格式
        </p>
      </Modal>

      <Drawer
        title={`${selectedSchedule?.name || ''} - 72小时预测分析`}
        placement="right"
        width={900}
        open={drawerVisible}
        onClose={() => {
          setDrawerVisible(false)
          setSelectedSchedule(null)
          setForecast(null)
        }}
        loading={forecastLoading}
      >
        {selectedSchedule && (
          <div>
            <Descriptions
              column={2}
              bordered
              size="small"
              style={{ marginBottom: 24 }}
            >
              <Descriptions.Item label="排期名称">{selectedSchedule.name}</Descriptions.Item>
              <Descriptions.Item label="投放周期">
                {dayjs(selectedSchedule.startDate).format('YYYY-MM-DD')} ~ {dayjs(selectedSchedule.endDate).format('YYYY-MM-DD')}
              </Descriptions.Item>
              <Descriptions.Item label="总预算">¥{formatNumber(selectedSchedule.budget)}</Descriptions.Item>
              <Descriptions.Item label="日预算">¥{formatNumber(selectedSchedule.dailyBudget)}</Descriptions.Item>
              <Descriptions.Item label="出价">¥{selectedSchedule.bidPrice.toFixed(2)}</Descriptions.Item>
              <Descriptions.Item label="目标地域">
                {selectedSchedule.targetRegion.join('、')}
              </Descriptions.Item>
            </Descriptions>

            {forecast && (
              <>
                <Card
                  title="72小时效果预测"
                  className="card-shadow"
                  style={{ marginBottom: 24 }}
                >
                  <div className="forecast-chart">
                    {forecastChartConfig && <Line {...forecastChartConfig} />}
                  </div>
                </Card>

                <Card
                  title={
                    <Space>
                      <BulbOutlined style={{ color: '#1890ff' }} />
                      智能优化建议
                    </Space>
                  }
                  className="card-shadow"
                >
                  {forecast.recommendations.length > 0 ? (
                    <List
                      dataSource={forecast.recommendations}
                      renderItem={(item) => (
                        <div className="recommendation-item">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <Space>
                              <Tag color={priorityColors[item.priority]}>
                                {item.priority === 'high' ? '高优先级' : item.priority === 'medium' ? '中优先级' : '低优先级'}
                              </Tag>
                              <Tag color="blue">
                                {item.type === 'bid_adjustment' ? '出价调整' :
                                 item.type === 'creative_replace' ? '创意更换' : '预算分配'}
                              </Tag>
                            </Space>
                            <Space style={{ color: item.expectedImpact.changePercent >= 0 ? '#52c41a' : '#ff4d4f' }}>
                              {item.expectedImpact.changePercent >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                              {Math.abs(item.expectedImpact.changePercent)}%
                              <span style={{ color: 'rgba(0,0,0,0.45)', fontSize: 12 }}>
                                {item.expectedImpact.metric}
                              </span>
                            </Space>
                          </div>
                          <p style={{ margin: 0, color: 'rgba(0,0,0,0.85)' }}>{item.description}</p>
                        </div>
                      )}
                    />
                  ) : (
                    <Empty description="暂无优化建议" />
                  )}
                </Card>
              </>
            )}
          </div>
        )}
      </Drawer>
    </div>
  )
}

export default Schedules
