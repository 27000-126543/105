import { AdSchedule, ForecastResult } from '@shared/types'

export interface ScheduleListParams {
  status?: AdSchedule['status']
  page?: number
  pageSize?: number
}

const generateMockSchedules = (): AdSchedule[] => {
  const statuses: AdSchedule['status'][] = ['active', 'paused', 'completed', 'pending']
  const channels = [
    { id: 'ch1', name: '微信广告' },
    { id: 'ch2', name: '抖音广告' },
    { id: 'ch3', name: '百度搜索' },
    { id: 'ch4', name: '小红书' },
    { id: 'ch5', name: '快手' }
  ]
  const positions = [
    { id: 'pos1', name: '朋友圈首屏' },
    { id: 'pos2', name: '信息流' },
    { id: 'pos3', name: '搜索首位' },
    { id: 'pos4', name: '发现页' },
    { id: 'pos5', name: '视频流' }
  ]

  return Array.from({ length: 20 }, (_, i) => ({
    id: `sch-${i + 1}`,
    name: `广告投放计划-${i + 1}`,
    advertiserId: `adv${(i % 5) + 1}`,
    channelId: channels[i % 5].id,
    positionId: positions[i % 5].id,
    creativeId: `cr-${i + 1}`,
    startDate: new Date(Date.now() + (i - 5) * 24 * 3600000).toISOString().split('T')[0],
    endDate: new Date(Date.now() + (i + 15) * 24 * 3600000).toISOString().split('T')[0],
    budget: (10 + i * 5) * 10000,
    dailyBudget: (1 + i * 0.5) * 1000,
    bidPrice: 0.5 + i * 0.1,
    targetRegion: ['北京', '上海', '广东', '浙江', '江苏'].slice(0, (i % 3) + 2),
    targetAudience: {
      ageRange: [18 + (i % 3) * 10, 40 + (i % 3) * 10] as [number, number],
      gender: i % 2 === 0 ? 'male' : 'female',
      interests: ['科技', '时尚', '游戏'].slice(0, (i % 3) + 1)
    },
    status: statuses[i % 4],
    createdAt: new Date(Date.now() - i * 24 * 3600000).toISOString()
  }))
}

export const getSchedules = (params: ScheduleListParams): Promise<{ list: AdSchedule[]; total: number }> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      let all = generateMockSchedules()
      if (params.status) {
        all = all.filter(s => s.status === params.status)
      }
      resolve({
        list: all,
        total: all.length
      })
    }, 300)
  })
}

export const getScheduleDetail = (_id: string): Promise<AdSchedule> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(generateMockSchedules()[0])
    }, 200)
  })
}

export const uploadScheduleExcel = (_file: File): Promise<{ success: boolean; count: number }> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        count: Math.floor(Math.random() * 10) + 5
      })
    }, 1000)
  })
}

export const uploadCreative = (_file: File): Promise<{ id: string; url: string }> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: 'cr-' + Date.now(),
        url: '/placeholder-creative.png'
      })
    }, 1000)
  })
}

export const getForecast = (scheduleId: string): Promise<ForecastResult> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const predictions = []
      const now = new Date()
      for (let i = 0; i < 72; i++) {
        const time = new Date(now.getTime() + i * 3600000)
        predictions.push({
          time: time.toISOString(),
          predictedImpressions: Math.floor(Math.random() * 50000) + 10000,
          predictedClicks: Math.floor(Math.random() * 5000) + 500,
          predictedConversions: Math.floor(Math.random() * 200) + 20,
          predictedCost: Math.floor(Math.random() * 50000) + 5000,
          confidence: 0.7 + Math.random() * 0.3
        })
      }

      resolve({
        scheduleId,
        timestamp: now.toISOString(),
        horizonHours: 72,
        predictions,
        recommendations: [
          {
            type: 'bid_adjustment',
            priority: 'high',
            description: '建议在18:00-22:00时段将出价提高15%，该时段转化率预计提升8%',
            expectedImpact: {
              metric: 'conversions',
              changePercent: 8
            }
          },
          {
            type: 'budget_allocation',
            priority: 'medium',
            description: '周末预算使用率预计比工作日高25%，建议增加周末预算分配',
            expectedImpact: {
              metric: 'impressions',
              changePercent: 12
            }
          },
          {
            type: 'creative_replace',
            priority: 'low',
            description: '当前创意CTR呈下降趋势，建议准备备选创意素材',
            expectedImpact: {
              metric: 'ctr',
              changePercent: 5
            }
          }
        ]
      })
    }, 500)
  })
}

export const createSchedule = (data: Partial<AdSchedule>): Promise<AdSchedule> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: 'sch-' + Date.now(),
        ...data,
        createdAt: new Date().toISOString()
      } as AdSchedule)
    }, 300)
  })
}

export const updateSchedule = (id: string, data: Partial<AdSchedule>): Promise<AdSchedule> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id,
        ...data
      } as AdSchedule)
    }, 300)
  })
}

export const updateScheduleStatus = (_id: string, _status: AdSchedule['status']): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, 200)
  })
}
