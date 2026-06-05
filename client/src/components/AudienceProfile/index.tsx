import React from 'react'
import { Card, Row, Col } from 'antd'
import { Pie, Column } from '@ant-design/charts'
import { AudienceProfile as AudienceProfileType } from '@shared/types'

interface AudienceProfileProps {
  data: AudienceProfileType | null
  loading?: boolean
}

const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2']

const AudienceProfile: React.FC<AudienceProfileProps> = ({ data, loading }) => {
  if (!data) return null

  const ageConfig = {
    data: data.ageDistribution.map(d => ({ type: d.range, value: d.percentage })),
    xField: 'type',
    yField: 'value',
    color: '#1890ff',
    columnStyle: {
      radius: [4, 4, 0, 0]
    },
    label: {
      position: 'middle' as const,
      formatter: (d: any) => `${d.value.toFixed(1)}%`
    },
    xAxis: {
      label: {
        autoHide: true,
        autoRotate: false
      }
    },
    yAxis: {
      label: {
        formatter: (v: string) => `${v}%`
      }
    },
    tooltip: {
      formatter: (datum: any) => ({
        name: datum.type,
        value: `${datum.value.toFixed(2)}%`
      })
    }
  }

  const genderConfig = {
    data: data.genderDistribution.map(d => ({ type: d.gender, value: d.percentage })),
    angleField: 'value',
    colorField: 'type',
    radius: 0.9,
    innerRadius: 0.6,
    label: {
      type: 'outer' as const,
      formatter: (d: any) => `${d.type}: ${d.value.toFixed(1)}%`
    },
    color: ['#1890ff', '#f5222d'],
    tooltip: {
      formatter: (datum: any) => ({
        name: datum.type,
        value: `${datum.value.toFixed(2)}%`
      })
    },
    legend: {
      position: 'bottom' as const
    }
  }

  const interestConfig = {
    data: data.interestDistribution.map(d => ({ type: d.interest, value: d.percentage })),
    angleField: 'value',
    colorField: 'type',
    radius: 0.9,
    innerRadius: 0.6,
    label: {
      type: 'inner' as const,
      formatter: '{name}'
    },
    color: COLORS,
    tooltip: {
      formatter: (datum: any) => ({
        name: datum.type,
        value: `${datum.value.toFixed(2)}%`
      })
    },
    legend: {
      position: 'right' as const
    }
  }

  const regionConfig = {
    data: data.regionDistribution.map(d => ({ type: d.region, value: d.percentage })),
    xField: 'type',
    yField: 'value',
    color: '#52c41a',
    columnStyle: {
      radius: [4, 4, 0, 0]
    },
    label: {
      position: 'middle' as const,
      formatter: (d: any) => `${d.value.toFixed(1)}%`
    },
    xAxis: {
      label: {
        autoHide: true,
        autoRotate: false
      }
    },
    yAxis: {
      label: {
        formatter: (v: string) => `${v}%`
      }
    },
    tooltip: {
      formatter: (datum: any) => ({
        name: datum.type,
        value: `${datum.value.toFixed(2)}%`
      })
    }
  }

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} md={12}>
        <Card title="年龄分布" className="audience-card card-shadow" loading={loading}>
          <Column {...ageConfig} style={{ height: 220 }} />
        </Card>
      </Col>
      <Col xs={24} md={12}>
        <Card title="性别分布" className="audience-card card-shadow" loading={loading}>
          <Pie {...genderConfig} style={{ height: 220 }} />
        </Card>
      </Col>
      <Col xs={24} md={12}>
        <Card title="兴趣分布" className="audience-card card-shadow" loading={loading}>
          <Pie {...interestConfig} style={{ height: 220 }} />
        </Card>
      </Col>
      <Col xs={24} md={12}>
        <Card title="地域分布" className="audience-card card-shadow" loading={loading}>
          <Column {...regionConfig} style={{ height: 220 }} />
        </Card>
      </Col>
    </Row>
  )
}

export default AudienceProfile
