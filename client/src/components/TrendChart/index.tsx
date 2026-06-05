import React from 'react'
import { Line } from '@ant-design/charts'
import { TrendDataPoint } from '@shared/types'
import dayjs from 'dayjs'

interface TrendChartProps {
  data: TrendDataPoint[]
  title?: string
  color?: string
  loading?: boolean
  smooth?: boolean
}

const TrendChart: React.FC<TrendChartProps> = ({
  data,
  title,
  color = '#1890ff',
  loading,
  smooth = true
}) => {
  const config = {
    data: data.map(d => ({
      time: dayjs(d.time).format('MM-DD'),
      value: d.value,
      metric: d.metric
    })),
    xField: 'time',
    yField: 'value',
    smooth,
    color,
    lineStyle: {
      lineWidth: 3
    },
    point: {
      size: 5,
      shape: 'circle',
      style: {
        fill: color,
        stroke: '#fff',
        lineWidth: 2
      }
    },
    areaStyle: {
      fill: `l(270) 0:${color}20 1:${color}00`
    },
    xAxis: {
      label: {
        autoHide: true,
        autoRotate: false
      },
      grid: {
        align: 'label'
      }
    },
    yAxis: {
      label: {
        formatter: (v: string) => {
          const num = parseInt(v)
          if (num >= 10000) {
            return (num / 10000) + '万'
          }
          return v
        }
      }
    },
    tooltip: {
      showCrosshairs: true,
      formatter: (datum: any) => ({
        name: datum.metric,
        value: datum.value.toLocaleString()
      })
    },
    loading,
    animation: true
  }

  return (
    <div style={{ height: '100%' }}>
      {title && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: 'rgba(0,0,0,0.85)' }}>{title}</h3>
        </div>
      )}
      <Line {...config} />
    </div>
  )
}

export default TrendChart
