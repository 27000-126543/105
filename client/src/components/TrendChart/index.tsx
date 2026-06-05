import React from 'react'
import { Line } from '@ant-design/charts'
import { TrendDataPoint } from '@shared/types'
import dayjs from 'dayjs'

interface TrendChartProps {
  data: TrendDataPoint[] | Array<{ positionId: string; positionName: string; data: TrendDataPoint[] }>
  title?: string
  color?: string
  loading?: boolean
  smooth?: boolean
}

const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16']

const TrendChart: React.FC<TrendChartProps> = ({
  data,
  title,
  color = '#1890ff',
  loading,
  smooth = true
}) => {
  const isMultiSeries = Array.isArray(data) && data.length > 0 && 'positionId' in data[0]

  let chartData: any[] = []
  let config: any

  if (isMultiSeries) {
    const multiData = data as Array<{ positionId: string; positionName: string; data: TrendDataPoint[] }>
    chartData = multiData.flatMap((series, idx) =>
      series.data.map(d => ({
        time: dayjs(d.time).format('MM-DD'),
        value: d.value,
        series: series.positionName,
        color: COLORS[idx % COLORS.length]
      }))
    )

    config = {
      data: chartData,
      xField: 'time',
      yField: 'value',
      seriesField: 'series',
      smooth,
      color: COLORS,
      lineStyle: {
        lineWidth: 3
      },
      point: {
        size: 4,
        shape: 'circle'
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
          name: datum.series,
          value: datum.value.toLocaleString()
        })
      },
      legend: {
        position: 'top' as const
      },
      loading,
      animation: true
    }
  } else {
    const singleData = data as TrendDataPoint[]
    chartData = singleData.map(d => ({
      time: dayjs(d.time).format('MM-DD'),
      value: d.value,
      metric: d.metric
    }))

    config = {
      data: chartData,
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
          name: datum.metric || '点击量',
          value: datum.value.toLocaleString()
        })
      },
      loading,
      animation: true
    }
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
