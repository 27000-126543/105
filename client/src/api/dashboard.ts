import {
  MetricsSummary,
  HeatmapData,
  TrendDataPoint,
  AudienceProfile,
  Channel,
  Advertiser,
  CHINA_PROVINCES,
  ChannelType
} from '@shared/types'

export interface DashboardFilters {
  advertiserId?: string
  channelId?: string
  startDate: string
  endDate: string
}

export interface ChannelRankingItem {
  channelId: string
  channelName: string
  roi: number
  impressions: number
  conversions: number
  cost: number
}

export const getSummary = (filters: DashboardFilters): Promise<MetricsSummary> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        date: filters.endDate,
        advertiserId: filters.advertiserId,
        channelId: filters.channelId,
        totalImpressions: Math.floor(Math.random() * 5000000) + 1000000,
        totalClicks: Math.floor(Math.random() * 200000) + 50000,
        totalConversions: Math.floor(Math.random() * 20000) + 5000,
        totalCost: Math.floor(Math.random() * 500000) + 100000,
        totalRevenue: Math.floor(Math.random() * 1500000) + 300000,
        avgCtr: 0.03 + Math.random() * 0.05,
        avgCvr: 0.02 + Math.random() * 0.08,
        avgCpm: 20 + Math.random() * 60,
        avgRoi: 2 + Math.random() * 3
      })
    }, 300)
  })
}

export const getHeatmapData = (_filters: DashboardFilters, metric: 'roi' | 'impressions' | 'conversions'): Promise<HeatmapData[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const data: HeatmapData[] = CHINA_PROVINCES.map(region => ({
        region,
        value: metric === 'roi'
          ? 1 + Math.random() * 5
          : metric === 'impressions'
          ? Math.floor(Math.random() * 500000) + 10000
          : Math.floor(Math.random() * 20000) + 1000,
        metric
      }))
      resolve(data)
    }, 300)
  })
}

export const getChannelRanking = (_filters: DashboardFilters): Promise<ChannelRankingItem[]> => {
  const channels = [
    { id: 'ch1', name: '微信广告' },
    { id: 'ch2', name: '抖音广告' },
    { id: 'ch3', name: '百度搜索' },
    { id: 'ch4', name: '小红书' },
    { id: 'ch5', name: '快手' },
    { id: 'ch6', name: '微博' },
    { id: 'ch7', name: 'Bilibili' },
    { id: 'ch8', name: '知乎' }
  ]
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(channels.map(ch => ({
        channelId: ch.id,
        channelName: ch.name,
        roi: 1.5 + Math.random() * 4,
        impressions: Math.floor(Math.random() * 1000000) + 100000,
        conversions: Math.floor(Math.random() * 5000) + 1000,
        cost: Math.floor(Math.random() * 100000) + 20000
      })).sort((a, b) => b.roi - a.roi))
    }, 300)
  })
}

export const getPositionTrend = (_channelId: string, _positionId?: string): Promise<TrendDataPoint[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const data: TrendDataPoint[] = []
      const now = new Date()
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        data.push({
          time: date.toISOString().split('T')[0],
          value: Math.floor(Math.random() * 5000) + 1000,
          metric: 'clicks'
        })
      }
      resolve(data)
    }, 300)
  })
}

export const getAudienceProfile = (_channelId: string): Promise<AudienceProfile> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        ageDistribution: [
          { range: '18-24岁', percentage: 15 + Math.random() * 10 },
          { range: '25-34岁', percentage: 30 + Math.random() * 15 },
          { range: '35-44岁', percentage: 25 + Math.random() * 10 },
          { range: '45-54岁', percentage: 15 + Math.random() * 10 },
          { range: '55岁以上', percentage: 5 + Math.random() * 10 }
        ],
        genderDistribution: [
          { gender: '男性', percentage: 45 + Math.random() * 10 },
          { gender: '女性', percentage: 45 + Math.random() * 10 }
        ],
        interestDistribution: [
          { interest: '科技数码', percentage: 20 + Math.random() * 10 },
          { interest: '时尚美妆', percentage: 15 + Math.random() * 10 },
          { interest: '游戏娱乐', percentage: 18 + Math.random() * 10 },
          { interest: '美食旅游', percentage: 15 + Math.random() * 10 },
          { interest: '教育学习', percentage: 12 + Math.random() * 10 },
          { interest: '金融理财', percentage: 10 + Math.random() * 10 }
        ],
        regionDistribution: [
          { region: '华东', percentage: 28 + Math.random() * 10 },
          { region: '华北', percentage: 22 + Math.random() * 10 },
          { region: '华南', percentage: 20 + Math.random() * 10 },
          { region: '华中', percentage: 12 + Math.random() * 10 },
          { region: '西南', percentage: 10 + Math.random() * 10 },
          { region: '其他', percentage: 8 + Math.random() * 10 }
        ]
      })
    }, 300)
  })
}

export const getAdvertisers = (): Promise<Advertiser[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { id: 'adv1', name: '阿里巴巴', industry: '电商', contact: '张经理', phone: '13800138001', createdAt: '2024-01-01T00:00:00Z' },
        { id: 'adv2', name: '字节跳动', industry: '互联网', contact: '李经理', phone: '13800138002', createdAt: '2024-01-02T00:00:00Z' },
        { id: 'adv3', name: '美团', industry: '本地生活', contact: '王经理', phone: '13800138003', createdAt: '2024-01-03T00:00:00Z' },
        { id: 'adv4', name: '京东', industry: '电商', contact: '赵经理', phone: '13800138004', createdAt: '2024-01-04T00:00:00Z' },
        { id: 'adv5', name: '拼多多', industry: '电商', contact: '刘经理', phone: '13800138005', createdAt: '2024-01-05T00:00:00Z' }
      ])
    }, 200)
  })
}

export const getChannels = (): Promise<Channel[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { id: 'ch1', name: '微信广告', type: ChannelType.SOCIAL, enabled: true },
        { id: 'ch2', name: '抖音广告', type: ChannelType.VIDEO, enabled: true },
        { id: 'ch3', name: '百度搜索', type: ChannelType.SEARCH, enabled: true },
        { id: 'ch4', name: '小红书', type: ChannelType.SOCIAL, enabled: true },
        { id: 'ch5', name: '快手', type: ChannelType.VIDEO, enabled: true },
        { id: 'ch6', name: '微博', type: ChannelType.SOCIAL, enabled: true },
        { id: 'ch7', name: 'Bilibili', type: ChannelType.VIDEO, enabled: true },
        { id: 'ch8', name: '知乎', type: ChannelType.SOCIAL, enabled: true }
      ])
    }, 200)
  })
}
