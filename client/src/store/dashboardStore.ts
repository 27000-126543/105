import { create } from 'zustand'
import { MetricsSummary, HeatmapData, TrendDataPoint, AudienceProfile, Channel, Advertiser } from '@shared/types'

interface DashboardState {
  filters: {
    advertiserId: string | undefined
    channelId: string | undefined
    startDate: string
    endDate: string
  }
  selectedMediaId: string | null
  summary: MetricsSummary | null
  previousSummary: MetricsSummary | null
  heatmapData: HeatmapData[]
  heatmapMetric: 'roi' | 'impressions' | 'conversions'
  channelRanking: Array<{ channelId: string; channelName: string; roi: number; impressions: number }>
  positionTrend: TrendDataPoint[]
  audienceProfile: AudienceProfile | null
  advertisers: Advertiser[]
  channels: Channel[]
  loading: boolean
  error: string | null

  setFilters: (filters: Partial<DashboardState['filters']>) => void
  setSelectedMediaId: (id: string | null) => void
  setHeatmapMetric: (metric: 'roi' | 'impressions' | 'conversions') => void
  setSummary: (summary: MetricsSummary) => void
  setPreviousSummary: (summary: MetricsSummary) => void
  setHeatmapData: (data: HeatmapData[]) => void
  setChannelRanking: (data: DashboardState['channelRanking']) => void
  setPositionTrend: (data: TrendDataPoint[]) => void
  setAudienceProfile: (data: AudienceProfile) => void
  setAdvertisers: (data: Advertiser[]) => void
  setChannels: (data: Channel[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  resetFilters: () => void
}

const today = new Date()
const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
const formatDate = (date: Date) => date.toISOString().split('T')[0]

export const useDashboardStore = create<DashboardState>((set) => ({
  filters: {
    advertiserId: undefined,
    channelId: undefined,
    startDate: formatDate(lastWeek),
    endDate: formatDate(today)
  },
  selectedMediaId: null,
  summary: null,
  previousSummary: null,
  heatmapData: [],
  heatmapMetric: 'roi',
  channelRanking: [],
  positionTrend: [],
  audienceProfile: null,
  advertisers: [],
  channels: [],
  loading: false,
  error: null,

  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters }
  })),

  setSelectedMediaId: (id) => set({ selectedMediaId: id }),

  setHeatmapMetric: (metric) => set({ heatmapMetric: metric }),

  setSummary: (summary) => set({ summary }),

  setPreviousSummary: (summary) => set({ previousSummary: summary }),

  setHeatmapData: (data) => set({ heatmapData: data }),

  setChannelRanking: (data) => set({ channelRanking: data }),

  setPositionTrend: (data) => set({ positionTrend: data }),

  setAudienceProfile: (data) => set({ audienceProfile: data }),

  setAdvertisers: (data) => set({ advertisers: data }),

  setChannels: (data) => set({ channels: data }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  resetFilters: () => set({
    filters: {
      advertiserId: undefined,
      channelId: undefined,
      startDate: formatDate(lastWeek),
      endDate: formatDate(today)
    },
    selectedMediaId: null
  })
}))
