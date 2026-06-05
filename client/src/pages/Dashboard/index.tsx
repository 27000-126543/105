import React, { useEffect, useState } from 'react'
import { Row, Col, Card, Select, DatePicker, Space, Button, Segmented, Drawer, Empty } from 'antd'
import {
  EyeOutlined,
  ArrowUpOutlined,
  ShoppingCartOutlined,
  MoneyCollectOutlined,
  PercentageOutlined,
  RiseOutlined,
  ReloadOutlined,
  CloseOutlined
} from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { Column } from '@ant-design/charts'
import { useDashboardStore } from '@/store/dashboardStore'
import {
  getSummary,
  getHeatmapData,
  getChannelRanking,
  getPositionTrend,
  getAudienceProfile,
  getAdvertisers,
  getChannels
} from '@/api/dashboard'
import MetricCard from '@/components/MetricCard'
import ChinaHeatmap from '@/components/ChinaHeatmap'
import TrendChart from '@/components/TrendChart'
import AudienceProfile from '@/components/AudienceProfile'
import { formatNumber } from '@shared/utils'


const { RangePicker } = DatePicker
const { Option } = Select

const Dashboard: React.FC = () => {
  const {
    filters,
    selectedMediaId,
    summary,
    previousSummary,
    heatmapData,
    heatmapMetric,
    channelRanking,
    positionTrend,
    audienceProfile,
    advertisers,
    channels,
    loading,
    weekOverWeek,
    setFilters,
    setSelectedMediaId,
    setHeatmapMetric,
    setSummary,
    setPreviousSummary,
    setHeatmapData,
    setChannelRanking,
    setPositionTrend,
    setAudienceProfile,
    setAdvertisers,
    setChannels,
    setLoading,
    setWeekOverWeek
  } = useDashboardStore()

  const [drawerVisible, setDrawerVisible] = useState(false)

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (selectedMediaId) {
      loadMediaDetail(selectedMediaId)
    }
  }, [selectedMediaId])

  const loadInitialData = async () => {
    setLoading(true)
    try {
      const [advRes, chRes] = await Promise.all([
        getAdvertisers(),
        getChannels()
      ])
      setAdvertisers(advRes)
      setChannels(chRes)
      await loadDashboardData()
    } finally {
      setLoading(false)
    }
  }

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const [summaryRes, heatmapRes, rankingRes] = await Promise.all([
        getSummary(filters),
        getHeatmapData(filters, heatmapMetric),
        getChannelRanking(filters)
      ])

      setSummary(summaryRes.summary)
      setWeekOverWeek(summaryRes.weekOverWeek)

      const prevFilters = {
        ...filters,
        startDate: dayjs(filters.startDate).subtract(7, 'day').format('YYYY-MM-DD'),
        endDate: dayjs(filters.endDate).subtract(7, 'day').format('YYYY-MM-DD')
      }
      const prevSummaryRes = await getSummary(prevFilters)
      setPreviousSummary(prevSummaryRes.summary)

      setHeatmapData(heatmapRes)
      setChannelRanking(rankingRes)
    } finally {
      setLoading(false)
    }
  }

  const loadMediaDetail = async (channelId: string) => {
    setLoading(true)
    try {
      const [trendRes, audienceRes] = await Promise.all([
        getPositionTrend(channelId),
        getAudienceProfile(channelId)
      ])
      setPositionTrend(trendRes)
      setAudienceProfile(audienceRes)
      setDrawerVisible(true)
    } finally {
      setLoading(false)
    }
  }

  const handleDateChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      setFilters({
        startDate: dates[0].format('YYYY-MM-DD'),
        endDate: dates[1].format('YYYY-MM-DD')
      })
      setTimeout(loadDashboardData, 100)
    }
  }

  const handleMediaClick = (channelId: string) => {
    setSelectedMediaId(channelId)
  }

  const rankingConfig = {
    data: channelRanking.map(r => ({
      channel: r.channelName,
      roi: r.roi,
      impressions: r.impressions
    })),
    xField: 'channel',
    yField: 'roi',
    colorField: 'roi',
    color: ({ roi }: { roi: number }) => {
      if (roi >= 4) return '#52c41a'
      if (roi >= 2.5) return '#1890ff'
      if (roi >= 1.5) return '#faad14'
      return '#ff4d4f'
    },
    columnStyle: {
      radius: [4, 4, 0, 0]
    },
    label: {
      position: 'top' as const,
      formatter: (d: any) => `${d.roi.toFixed(2)}`
    },
    xAxis: {
      label: {
        autoHide: true,
        autoRotate: true,
        rotate: 0
      }
    },
    yAxis: {
      label: {
        formatter: (v: string) => `${v}`
      }
    },
    tooltip: {
      formatter: (datum: any) => ({
        name: datum.channel,
        value: `ROI: ${datum.roi.toFixed(2)}，展示量: ${formatNumber(datum.impressions)}`
      })
    },
    onReady: (plot: any) => {
      plot.on('element:click', (evt: any) => {
        const data = evt.data.data
        const channel = channelRanking.find(c => c.channelName === data.channel)
        if (channel) {
          handleMediaClick(channel.channelId)
        }
      })
    }
  }

  const metricCards = summary && weekOverWeek ? [
    {
      title: '总展示',
      value: summary.totalImpressions,
      valueType: 'number' as const,
      change: weekOverWeek.impressionsChange,
      icon: <EyeOutlined />
    },
    {
      title: '总点击',
      value: summary.totalClicks,
      valueType: 'number' as const,
      change: weekOverWeek.clicksChange,
      icon: <ArrowUpOutlined />
    },
    {
      title: '总转化',
      value: summary.totalConversions,
      valueType: 'number' as const,
      change: weekOverWeek.conversionsChange,
      icon: <ShoppingCartOutlined />
    },
    {
      title: '总花费',
      value: summary.totalCost,
      valueType: 'currency' as const,
      change: weekOverWeek.costChange,
      icon: <MoneyCollectOutlined />
    },
    {
      title: '平均CTR',
      value: summary.avgCtr,
      valueType: 'percent' as const,
      change: weekOverWeek.ctrChange,
      icon: <PercentageOutlined />
    },
    {
      title: '平均CVR',
      value: summary.avgCvr,
      valueType: 'percent' as const,
      change: weekOverWeek.cvrChange,
      icon: <PercentageOutlined />
    },
    {
      title: '平均ROI',
      value: summary.avgRoi,
      valueType: 'number' as const,
      change: weekOverWeek.roiChange,
      icon: <RiseOutlined />
    }
  ] : []

  const selectedChannel = channels.find(c => c.id === selectedMediaId)

  return (
    <div className="page-container">
      <div className="filter-bar">
        <Space wrap size="middle">
          <Select
            placeholder="选择广告主"
            style={{ width: 200 }}
            value={filters.advertiserId}
            onChange={(v) => {
              setFilters({ advertiserId: v ?? undefined })
              setTimeout(loadDashboardData, 100)
            }}
            allowClear
            showSearch
            optionFilterProp="children"
          >
            {advertisers.map(adv => (
              <Option key={adv.id} value={adv.id}>{adv.name}</Option>
            ))}
          </Select>
          <Select
            placeholder="选择媒体"
            style={{ width: 200 }}
            value={filters.channelId}
            onChange={(v) => {
              setFilters({ channelId: v ?? undefined })
              setTimeout(loadDashboardData, 100)
            }}
            allowClear
            showSearch
            optionFilterProp="children"
          >
            {channels.map(ch => (
              <Option key={ch.id} value={ch.id}>{ch.name}</Option>
            ))}
          </Select>
          <RangePicker
            value={[dayjs(filters.startDate), dayjs(filters.endDate)]}
            onChange={handleDateChange}
          />
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={loadDashboardData}
            loading={loading}
          >
            刷新数据
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {metricCards.map((card, idx) => (
          <Col xs={24} sm={12} md={8} lg={6} xl={6} key={idx}>
            <MetricCard
              title={card.title}
              value={card.value}
              valueType={card.valueType}
              change={card.change}
              icon={card.icon}
              loading={loading}
            />
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card
            className="card-shadow"
            title="全国媒体广告效果热力图"
            extra={
              <Segmented
                value={heatmapMetric}
                onChange={(v) => {
                  setHeatmapMetric(v as 'roi' | 'impressions' | 'conversions')
                  setTimeout(() => {
                    getHeatmapData(filters, v as 'roi' | 'impressions' | 'conversions').then(setHeatmapData)
                  }, 100)
                }}
                options={[
                  { label: 'ROI', value: 'roi' },
                  { label: '展示量', value: 'impressions' },
                  { label: '转化量', value: 'conversions' }
                ]}
              />
            }
          >
            <div className="heatmap-container">
              <ChinaHeatmap
              data={heatmapData}
              metric={heatmapMetric}
            />
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card
            className="card-shadow"
            title="各媒体ROI排名"
            extra={<span style={{ color: 'rgba(0,0,0,0.45)' }}>点击柱状图查看详情</span>}
          >
            <div style={{ height: 500 }}>
              {channelRanking.length > 0 ? (
                <Column {...rankingConfig} style={{ height: '100%' }} />
              ) : (
                <Empty description="暂无数据" />
              )}
            </div>
          </Card>
        </Col>
      </Row>

      <Drawer
        title={`${selectedChannel?.name || ''} - 详细分析`}
        placement="right"
        width={900}
        open={drawerVisible}
        onClose={() => {
          setDrawerVisible(false)
          setSelectedMediaId(null)
        }}
        extra={
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={() => {
              setDrawerVisible(false)
              setSelectedMediaId(null)
            }}
          />
        }
      >
        <div className="detail-section">
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>近7天点击趋势</h3>
          <div className="trend-chart-container">
            <TrendChart
              data={positionTrend}
              color="#1890ff"
              loading={loading}
            />
          </div>
        </div>
        <div className="detail-section" style={{ marginTop: 32 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>受众画像分布</h3>
          <AudienceProfile
            data={audienceProfile}
            loading={loading}
          />
        </div>
      </Drawer>
    </div>
  )
}

export default Dashboard
