import React, { useState, useEffect } from 'react'
import { Table, Button, Tag, Space, Card, Select, DatePicker, message } from 'antd'
import { EyeOutlined, DownloadOutlined, CalendarOutlined, BarChartOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs, { Dayjs } from 'dayjs'
import { WeeklyReport } from '@shared/types'
import { getReports, exportReport } from '@/api/reports'
import { formatNumber } from '@shared/utils'

const { Option } = Select
const { RangePicker } = DatePicker

const Reports: React.FC = () => {
  const [reports, setReports] = useState<WeeklyReport[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [advertiserFilter, setAdvertiserFilter] = useState<string | undefined>()
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadReports()
  }, [advertiserFilter])

  const loadReports = async () => {
    setLoading(true)
    try {
      const res = await getReports({ advertiserId: advertiserFilter })
      setReports(res.list)
      setTotal(res.total)
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetail = (id: string) => {
    navigate(`/reports/${id}`)
  }

  const handleExport = async (report: WeeklyReport) => {
    try {
      const blob = await exportReport(report.id)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report-${report.startDate}-${report.endDate}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      message.success('导出成功')
    } catch (error) {
      message.error('导出失败')
    }
  }

  const getAnomalySeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'red'
      case 'medium': return 'orange'
      case 'low': return 'blue'
      default: return 'default'
    }
  }

  const columns = [
    {
      title: '报告周期',
      key: 'period',
      width: 200,
      render: (_: any, record: WeeklyReport) => (
        <Space direction="vertical" size={4}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarOutlined style={{ color: '#1890ff' }} />
            <span style={{ fontWeight: 500 }}>
              {dayjs(record.startDate).format('YYYY/MM/DD')} - {dayjs(record.endDate).format('YYYY/MM/DD')}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
            生成时间: {dayjs(record.generatedAt).format('YYYY-MM-DD HH:mm')}
          </div>
        </Space>
      )
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
      title: '核心指标',
      key: 'metrics',
      width: 300,
      render: (_: any, record: WeeklyReport) => (
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <span style={{ color: 'rgba(0,0,0,0.45)' }}>展示量:</span>
            <span style={{ fontWeight: 500 }}>{formatNumber(record.summary.totalImpressions)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <span style={{ color: 'rgba(0,0,0,0.45)' }}>点击量:</span>
            <span style={{ fontWeight: 500 }}>{formatNumber(record.summary.totalClicks)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <span style={{ color: 'rgba(0,0,0,0.45)' }}>ROI:</span>
            <span style={{ fontWeight: 500, color: record.summary.avgRoi >= 3 ? '#52c41a' : '#ff4d4f' }}>
              {record.summary.avgRoi.toFixed(2)}
            </span>
          </div>
        </Space>
      )
    },
    {
      title: '环比变化',
      key: 'wow',
      width: 180,
      render: (_: any, record: WeeklyReport) => (
        <Space direction="vertical" size={4}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'rgba(0,0,0,0.45)', fontSize: 12 }}>展示:</span>
            <span style={{
              color: record.weekOverWeek.impressionsChange >= 0 ? '#52c41a' : '#ff4d4f',
              fontWeight: 500
            }}>
              {record.weekOverWeek.impressionsChange >= 0 ? '+' : ''}
              {(record.weekOverWeek.impressionsChange * 100).toFixed(2)}%
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'rgba(0,0,0,0.45)', fontSize: 12 }}>ROI:</span>
            <span style={{
              color: record.weekOverWeek.roiChange >= 0 ? '#52c41a' : '#ff4d4f',
              fontWeight: 500
            }}>
              {record.weekOverWeek.roiChange >= 0 ? '+' : ''}
              {(record.weekOverWeek.roiChange * 100).toFixed(2)}%
            </span>
          </div>
        </Space>
      )
    },
    {
      title: '异常检测',
      key: 'anomalies',
      render: (_: any, record: WeeklyReport) => {
        if (record.anomalies.length === 0) {
          return <Tag color="success">正常</Tag>
        }
        return (
          <Space wrap>
            {record.anomalies.slice(0, 2).map((a, idx) => (
              <Tag key={idx} color={getAnomalySeverityColor(a.severity)}>
                {a.type === 'ctr_drop' ? 'CTR下降' :
                 a.type === 'cost_spike' ? '成本突增' :
                 a.type === 'abnormal_clicks' ? '异常点击' : 'CVR下降'}
              </Tag>
            ))}
            {record.anomalies.length > 2 && (
              <Tag color="default">+{record.anomalies.length - 2} 更多</Tag>
            )}
          </Space>
        )
      }
    },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      fixed: 'right' as const,
      render: (_: any, record: WeeklyReport) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record.id)}
          >
            详情
          </Button>
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => handleExport(record)}
          >
            导出
          </Button>
        </Space>
      )
    }
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">诊断报告</h1>
        <p className="page-subtitle">每周自动生成广告投放效果诊断报告，提供数据洞察和优化建议</p>
      </div>

      <div className="filter-bar">
        <Space wrap size="middle">
          <Select
            placeholder="选择广告主"
            style={{ width: 200 }}
            value={advertiserFilter}
            onChange={setAdvertiserFilter}
            allowClear
            showSearch
            optionFilterProp="children"
          >
            <Option value="adv1">阿里巴巴</Option>
            <Option value="adv2">字节跳动</Option>
            <Option value="adv3">美团</Option>
            <Option value="adv4">京东</Option>
            <Option value="adv5">拼多多</Option>
          </Select>
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
          />
          <Button
            type="primary"
            icon={<BarChartOutlined />}
            onClick={loadReports}
          >
            生成报告
          </Button>
        </Space>
      </div>

      <Card className="card-shadow">
        <Table
          columns={columns}
          dataSource={reports}
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
    </div>
  )
}

export default Reports
