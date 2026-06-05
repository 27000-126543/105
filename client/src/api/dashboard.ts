import { get } from './request'
import {
  MetricsSummary,
  HeatmapData,
  TrendDataPoint,
  AudienceProfile,
  Channel,
  Advertiser
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

export interface PositionTrendItem {
  positionId: string
  positionName: string
  data: TrendDataPoint[]
}

export interface SummaryResponse {
  summary: MetricsSummary
  weekOverWeek: {
    impressionsChange: number
    clicksChange: number
    conversionsChange: number
    costChange: number
    ctrChange: number
    cvrChange: number
    roiChange: number
  }
  alertStats: any
  approvalStats: any
}

export const getSummary = (filters: DashboardFilters): Promise<SummaryResponse> => {
  const params: any = {}
  if (filters.startDate) params.startDate = filters.startDate
  if (filters.endDate) params.endDate = filters.endDate
  if (filters.advertiserId) params.advertiserId = filters.advertiserId
  if (filters.channelId) params.channelId = filters.channelId

  return get<SummaryResponse>('/dashboard/summary', { params })
}

export const getHeatmapData = (_filters: DashboardFilters, metric: 'roi' | 'impressions' | 'conversions'): Promise<HeatmapData[]> => {
  return get<HeatmapData[]>('/dashboard/heatmap', {
    params: {
      startDate: _filters.startDate,
      endDate: _filters.endDate,
      metric
    }
  })
}

export const getChannelRanking = (filters: DashboardFilters): Promise<ChannelRankingItem[]> => {
  const params: any = {
    startDate: filters.startDate,
    endDate: filters.endDate,
    limit: 20
  }
  if (filters.advertiserId) params.advertiserId = filters.advertiserId
  if (filters.channelId) params.channelId = filters.channelId

  return get<ChannelRankingItem[]>('/dashboard/roi-ranking', { params })
}

export const getPositionTrend = (channelId: string, _positionId?: string): Promise<PositionTrendItem[]> => {
  return get<PositionTrendItem[]>('/dashboard/position-trend', {
    params: {
      channelId,
      metric: 'clicks'
    }
  })
}

export const getAudienceProfile = (channelId?: string): Promise<AudienceProfile> => {
  const params: any = {}
  if (channelId) params.channelId = channelId

  return get<AudienceProfile>('/dashboard/audience-profile', { params })
}

export const getAdvertisers = (): Promise<Advertiser[]> => {
  return get<Advertiser[]>('/advertisers')
}

export const getChannels = (): Promise<Channel[]> => {
  return get<Channel[]>('/channels')
}
