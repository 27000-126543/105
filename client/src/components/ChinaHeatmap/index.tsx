import React, { useMemo, useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import * as echarts from 'echarts'
import { HeatmapData } from '@shared/types'
import { formatNumber } from '@shared/utils'
import chinaMap from '@/data/chinaMap.json'

interface ChinaHeatmapProps {
  data: HeatmapData[]
  metric: 'roi' | 'impressions' | 'conversions'
  onRegionClick?: (region: string) => void
}

const ChinaHeatmap: React.FC<ChinaHeatmapProps> = ({ data, metric, onRegionClick }) => {
  const [mapRegistered, setMapRegistered] = useState(false)

  useEffect(() => {
    echarts.registerMap('china', chinaMap as any)
    setMapRegistered(true)
  }, [])
  const metricConfig = {
    roi: {
      name: 'ROI',
      formatter: (v: number) => v.toFixed(2),
      min: 0,
      max: 6
    },
    impressions: {
      name: '展示量',
      formatter: (v: number) => formatNumber(v),
      min: 0,
      max: 500000
    },
    conversions: {
      name: '转化量',
      formatter: (v: number) => formatNumber(v),
      min: 0,
      max: 20000
    }
  }

  const config = metricConfig[metric]

  const option = useMemo(() => {
    const chartData = data.map(d => [d.region, d.value])

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          if (!params.data) {
            return `${params.name}<br/>${config.name}: ${config.formatter(params.value[1])}`
          }
          return `${params.name}<br/>${config.name}: ${config.formatter(params.value)}`
        }
      },
      visualMap: {
        min: config.min,
        max: config.max,
        left: 'left',
        top: 'bottom',
        text: ['高', '低'],
        calculable: true,
        inRange: {
          color: ['#e0f3ff', '#1890ff', '#0050b3', '#003a8c', '#002766']
        }
      },
      geo: {
        map: 'china',
        roam: true,
        zoom: 1.2,
        label: {
          show: true,
          fontSize: 10,
          color: '#333'
        },
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 1,
          areaColor: '#f5f5f5'
        },
        emphasis: {
          label: {
            color: '#fff',
            fontSize: 12,
            fontWeight: 'bold'
          },
          itemStyle: {
            areaColor: '#1890ff'
          }
        }
      },
      series: [
        {
          name: config.name,
          type: 'map',
          map: 'china',
          geoIndex: 0,
          data: chartData
        }
      ]
    }
  }, [data, config])

  const onEvents = useMemo(() => ({
    click: (params: any) => {
      if (onRegionClick && params.name) {
        onRegionClick(params.name)
      }
    }
  }), [onRegionClick])

  if (!mapRegistered) {
    return <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>地图加载中...</div>
  }

  return (
    <ReactECharts
      echarts={echarts}
      option={option}
      onEvents={onEvents}
      style={{ height: '100%', width: '100%' }}
    />
  )
}

export default ChinaHeatmap
