import React, { useState, useEffect } from 'react'
import {
  Card,
  Row,
  Col,
  Button,
  Space,
  Tag,
  Descriptions,
  List,
  Empty,
  Breadcrumb,
  message
} from 'antd'
import {
  ArrowLeftOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  WarningOutlined,
  BulbOutlined,
  DownloadOutlined,
  BarChartOutlined
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { Pie, Column } from '@ant-design/charts'
import { getReportDetail, exportReport } from '@/api/reports'
import { WeeklyReport } from '@shared/types'
import { formatNumber, formatPercent, formatCurrency } from '@shared/utils'

const ReportDetail: React.FC = () => {
  const [report, setReport] = useState<WeeklyReport | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  useEffect(() => {
    if (id) {
      loadReportDetail(id)
    }
  }, [id])

  const loadReportDetail = async (reportId: string) => {
    setLoading(true)
    try {
      const res = await getReportDetail(reportId)
      setReport(res)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    if (!report) return
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

  const getAnomalySeverityStyle = (severity: string) => {
    switch (severity) {
      case 'high': return 'high'
      case 'medium': return 'medium'
      case 'low': return 'low'
      default: return 'low'
    }
  }

  const getAnomalyTypeName = (type: string) => {
    switch (type) {
      case 'ctr_drop': return 'CTR下降'
      case 'cost_spike': return '成本突增'
      case 'abnormal_clicks': return '异常点击'
      case 'cvr_drop': return 'CVR下降'
      default: return type
    }
  }

  const getRecommendationCategoryName = (category: string) => {
    switch (category) {
      case 'budget': return '预算优化'
      case 'creative': return '创意优化'
      case 'targeting': return '定向优化'
      case 'bidding': return '出价优化'
      default: return category
    }
  }

  const wowConfig = report ? [
    {
      label: '展示量',
      value: formatNumber(report.summary.totalImpressions),
      change: report.weekOverWeek.impressionsChange,
      valueType: 'number'
    },
    {
      label: '点击量',
      value: formatNumber(report.summary.totalClicks),
      change: report.weekOverWeek.clicksChange,
      valueType: 'number'
    },
    {
      label: '转化量',
      value: formatNumber(report.summary.totalConversions),
      change: report.weekOverWeek.conversionsChange,
      valueType: 'number'
    },
    {
      label: '总花费',
      value: formatCurrency(report.summary.totalCost),
      change: report.weekOverWeek.costChange,
      valueType: 'currency'
    },
    {
      label: '平均CTR',
      value: formatPercent(report.summary.avgCtr),
      change: report.weekOverWeek.ctrChange,
      valueType: 'percent'
    },
    {
      label: '平均CVR',
      value: formatPercent(report.summary.avgCvr),
      change: report.weekOverWeek.cvrChange,
      valueType: 'percent'
    },
    {
      label: '平均ROI',
      value: report.summary.avgRoi.toFixed(2),
      change: report.weekOverWeek.roiChange,
      valueType: 'number'
    }
  ] : []

  const attributionConfig = report ? {
    data: report.clickAttribution.map(a => ({
      channel: a.channel,
      percentage: a.percentage,
      assistedConversions: a.assistedConversions
    })),
    angleField: 'percentage',
    colorField: 'channel',
    radius: 0.9,
    innerRadius: 0.6,
    label: {
      type: 'outer' as const,
      formatter: (d: any) => `${d.channel}: ${d.percentage.toFixed(1)}%`
    },
    color: ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1'],
    tooltip: {
      formatter: (datum: any) => ({
        name: datum.channel,
        value: `占比: ${datum.percentage.toFixed(2)}%, 辅助转化: ${datum.assistedConversions}次`
      })
    },
    legend: {
      position: 'bottom' as const
    }
  } : null

  const anomalyTypeChartConfig = report && report.anomalies.length > 0 ? {
    data: [
      { type: 'CTR下降', count: report.anomalies.filter(a => a.type === 'ctr_drop').length },
      { type: '成本突增', count: report.anomalies.filter(a => a.type === 'cost_spike').length },
      { type: '异常点击', count: report.anomalies.filter(a => a.type === 'abnormal_clicks').length },
      { type: 'CVR下降', count: report.anomalies.filter(a => a.type === 'cvr_drop').length }
    ].filter(d => d.count > 0),
    xField: 'type',
    yField: 'count',
    color: ({ type }: { type: string }) => {
      if (type === 'CTR下降') return '#ff4d4f'
      if (type === '成本突增') return '#faad14'
      if (type === '异常点击') return '#722ed1'
      return '#f5222d'
    },
    columnStyle: {
      radius: [4, 4, 0, 0]
    },
    label: {
      position: 'top' as const
    }
  } : null

  const recommendationPriorityColors: Record<string, string> = {
    high: '#ff4d4f',
    medium: '#faad14',
    low: '#52c41a'
  }

  return (
    <div className="page-container">
      <div style={{ marginBottom: 24 }}>
        <Breadcrumb style={{ marginBottom: 16 }}>
          <Breadcrumb.Item onClick={() => navigate('/reports')}>
            <span style={{ cursor: 'pointer' }}>诊断报告</span>
          </Breadcrumb.Item>
          <Breadcrumb.Item>报告详情</Breadcrumb.Item>
        </Breadcrumb>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>
              诊断报告详情
            </h1>
            <p className="page-subtitle" style={{ marginTop: 8 }}>
              {report && `${dayjs(report.startDate).format('YYYY年MM月DD日')} - ${dayjs(report.endDate).format('YYYY年MM月DD日')}`}
            </p>
          </div>
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/reports')}
            >
              返回列表
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
            >
              导出报告
            </Button>
          </Space>
        </div>
      </div>

      <Card
        className="card-shadow"
        loading={loading}
      >
        {report && (
          <>
            <div className="report-section">
              <h2 className="report-section-title">周度概览</h2>
              <Row gutter={[16, 16]}>
                {wowConfig.map((item, idx) => (
                  <Col xs={24} sm={12} md={8} lg={6} xl={3} key={idx}>
                    <Card size="small" style={{ textAlign: 'center' }}>
                      <div style={{ color: 'rgba(0,0,0,0.45)', fontSize: 12, marginBottom: 8 }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 600, color: 'rgba(0,0,0,0.85)', marginBottom: 8 }}>
                        {item.value}
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        color: item.change >= 0 ? '#52c41a' : '#ff4d4f',
                        fontSize: 12
                      }}>
                        {item.change >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                        {Math.abs(item.change * 100).toFixed(2)}%
                        <span style={{ color: 'rgba(0,0,0,0.45)' }}>环比</span>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>

            <div className="report-section">
              <h2 className="report-section-title">环比数据对比</h2>
              <Card size="small">
                <Descriptions bordered column={2} size="small">
                  <Descriptions.Item label="展示量环比">
                    <span style={{ color: report.weekOverWeek.impressionsChange >= 0 ? '#52c41a' : '#ff4d4f' }}>
                      {report.weekOverWeek.impressionsChange >= 0 ? '+' : ''}
                      {(report.weekOverWeek.impressionsChange * 100).toFixed(2)}%
                    </span>
                  </Descriptions.Item>
                  <Descriptions.Item label="点击量环比">
                    <span style={{ color: report.weekOverWeek.clicksChange >= 0 ? '#52c41a' : '#ff4d4f' }}>
                      {report.weekOverWeek.clicksChange >= 0 ? '+' : ''}
                      {(report.weekOverWeek.clicksChange * 100).toFixed(2)}%
                    </span>
                  </Descriptions.Item>
                  <Descriptions.Item label="转化量环比">
                    <span style={{ color: report.weekOverWeek.conversionsChange >= 0 ? '#52c41a' : '#ff4d4f' }}>
                      {report.weekOverWeek.conversionsChange >= 0 ? '+' : ''}
                      {(report.weekOverWeek.conversionsChange * 100).toFixed(2)}%
                    </span>
                  </Descriptions.Item>
                  <Descriptions.Item label="花费环比">
                    <span style={{ color: report.weekOverWeek.costChange <= 0 ? '#52c41a' : '#ff4d4f' }}>
                      {report.weekOverWeek.costChange >= 0 ? '+' : ''}
                      {(report.weekOverWeek.costChange * 100).toFixed(2)}%
                    </span>
                  </Descriptions.Item>
                  <Descriptions.Item label="CTR环比">
                    <span style={{ color: report.weekOverWeek.ctrChange >= 0 ? '#52c41a' : '#ff4d4f' }}>
                      {report.weekOverWeek.ctrChange >= 0 ? '+' : ''}
                      {(report.weekOverWeek.ctrChange * 100).toFixed(2)}%
                    </span>
                  </Descriptions.Item>
                  <Descriptions.Item label="ROI环比">
                    <span style={{ color: report.weekOverWeek.roiChange >= 0 ? '#52c41a' : '#ff4d4f' }}>
                      {report.weekOverWeek.roiChange >= 0 ? '+' : ''}
                      {(report.weekOverWeek.roiChange * 100).toFixed(2)}%
                    </span>
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </div>

            <div className="report-section">
              <h2 className="report-section-title">异常检测</h2>
              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Card size="small" title="异常类型分布" style={{ height: '100%' }}>
                    {anomalyTypeChartConfig ? (
                      <Column {...anomalyTypeChartConfig} style={{ height: 280 }} />
                    ) : (
                      <Empty description="无异常数据" style={{ marginTop: 80 }} />
                    )}
                  </Card>
                </Col>
                <Col xs={24} md={16}>
                  <Card size="small" title="异常详情" style={{ height: '100%' }}>
                    {report.anomalies.length > 0 ? (
                      <List
                        dataSource={report.anomalies}
                        renderItem={(item) => (
                          <div className={`anomaly-item ${getAnomalySeverityStyle(item.severity)}`}>
                            <WarningOutlined style={{ fontSize: 20 }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <Space>
                                  <Tag color={item.severity === 'high' ? 'red' : item.severity === 'medium' ? 'orange' : 'blue'}>
                                    {getAnomalyTypeName(item.type)}
                                  </Tag>
                                  <Tag color={item.severity === 'high' ? 'red' : item.severity === 'medium' ? 'orange' : 'blue'}>
                                    {item.severity === 'high' ? '高' : item.severity === 'medium' ? '中' : '低'}
                                  </Tag>
                                </Space>
                                <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
                                  {dayjs(item.detectedAt).format('YYYY-MM-DD HH:mm')}
                                </span>
                              </div>
                              <div style={{ color: 'rgba(0,0,0,0.85)' }}>{item.description}</div>
                            </div>
                          </div>
                        )}
                      />
                    ) : (
                      <Empty description="本周无异常检测" style={{ marginTop: 80 }} />
                    )}
                  </Card>
                </Col>
              </Row>
            </div>

            <div className="report-section">
              <h2 className="report-section-title">点击归因分析</h2>
              <Row gutter={16}>
                <Col xs={24} md={10}>
                  <Card size="small" title="渠道贡献占比" style={{ height: '100%' }}>
                    {attributionConfig ? (
                      <Pie {...attributionConfig} style={{ height: 320 }} />
                    ) : (
                      <Empty description="暂无数据" style={{ marginTop: 100 }} />
                    )}
                  </Card>
                </Col>
                <Col xs={24} md={14}>
                  <Card size="small" title="渠道贡献详情" style={{ height: '100%' }}>
                    <List
                      dataSource={report.clickAttribution}
                      renderItem={(item) => (
                        <List.Item>
                          <List.Item.Meta
                            title={item.channel}
                            description={`辅助转化: ${item.assistedConversions}次`}
                          />
                          <Space direction="vertical" align="end" size={4}>
                            <span style={{ fontWeight: 600 }}>{item.percentage.toFixed(2)}%</span>
                            <div style={{ width: 150, height: 6, background: '#f0f0f0', borderRadius: 3 }}>
                              <div
                                style={{
                                  width: `${item.percentage}%`,
                                  height: '100%',
                                  background: '#1890ff',
                                  borderRadius: 3
                                }}
                              />
                            </div>
                          </Space>
                        </List.Item>
                      )}
                    />
                  </Card>
                </Col>
              </Row>
            </div>

            <div className="report-section">
              <h2 className="report-section-title">优化建议</h2>
              <Card size="small">
                {report.recommendations.length > 0 ? (
                  <List
                    dataSource={report.recommendations}
                    renderItem={(item) => (
                      <div className="recommendation-item">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                          <Space>
                            <BulbOutlined style={{ color: recommendationPriorityColors[item.priority], fontSize: 18 }} />
                            <Tag color={item.priority === 'high' ? 'red' : item.priority === 'medium' ? 'orange' : 'green'}>
                              {item.priority === 'high' ? '高优先级' : item.priority === 'medium' ? '中优先级' : '低优先级'}
                            </Tag>
                            <Tag color="blue">{getRecommendationCategoryName(item.category)}</Tag>
                          </Space>
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 500, color: 'rgba(0,0,0,0.85)', marginBottom: 8 }}>
                          {item.description}
                        </div>
                        <div style={{ fontSize: 13, color: '#52c41a' }}>
                          <BarChartOutlined style={{ marginRight: 4 }} />
                          预期收益: {item.expectedBenefit}
                        </div>
                      </div>
                    )}
                  />
                ) : (
                  <Empty description="暂无优化建议" />
                )}
              </Card>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

export default ReportDetail
