export enum ChannelType {
  SEARCH = 'search',
  SOCIAL = 'social',
  VIDEO = 'video',
  FEED = 'feed',
  DISPLAY = 'display'
}

export enum UserRole {
  ADVERTISER = 'advertiser',
  AGENCY = 'agency',
  MEDIA = 'media',
  OPTIMIZER = 'optimizer',
  MEDIA_SUPERVISOR = 'media_supervisor',
  STRATEGY_DIRECTOR = 'strategy_director',
  ADMIN = 'admin'
}

export enum AlertLevel {
  NONE = 'none',
  LEVEL_1 = 'level_1',
  LEVEL_2 = 'level_2'
}

export enum AlertStatus {
  PENDING = 'pending',
  ACKNOWLEDGED = 'acknowledged',
  PROCESSING = 'processing',
  RESOLVED = 'resolved',
  ESCALATED = 'escalated'
}

export enum ApprovalStatus {
  PENDING = 'pending',
  OPTIMIZER_APPROVED = 'optimizer_approved',
  SUPERVISOR_APPROVED = 'supervisor_approved',
  DIRECTOR_APPROVED = 'director_approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed'
}

export enum ApprovalAction {
  PAUSE = 'pause',
  ADJUST_BID = 'adjust_bid',
  REPLACE_CREATIVE = 'replace_creative',
  CHANGE_BUDGET = 'change_budget'
}

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  logo?: string;
  enabled: boolean;
}

export interface Advertiser {
  id: string;
  name: string;
  industry: string;
  contact: string;
  phone: string;
  createdAt: string;
}

export interface AdPosition {
  id: string;
  name: string;
  channelId: string;
  size?: string;
  location?: string;
  basePrice: number;
}

export interface AdCreative {
  id: string;
  name: string;
  type: 'image' | 'video' | 'text';
  url: string;
  thumbnail?: string;
  advertiserId: string;
  createdAt: string;
  tags: string[];
}

export interface AdSchedule {
  id: string;
  name: string;
  advertiserId: string;
  channelId: string;
  positionId: string;
  creativeId: string;
  startDate: string;
  endDate: string;
  budget: number;
  dailyBudget: number;
  bidPrice: number;
  targetRegion: string[];
  targetAudience: {
    ageRange?: [number, number];
    gender?: 'male' | 'female' | 'all';
    interests?: string[];
  };
  status: 'active' | 'paused' | 'completed' | 'pending';
  createdAt: string;
}

export interface RawAdData {
  id: string;
  channelId: string;
  positionId: string;
  scheduleId: string;
  advertiserId: string;
  timestamp: string;
  impressions: number;
  clicks: number;
  conversions: number;
  cost: number;
  region?: string;
  audienceAge?: number;
  audienceGender?: 'male' | 'female';
}

export interface UnifiedAdRecord {
  id: string;
  scheduleId: string;
  advertiserId: string;
  channelId: string;
  positionId: string;
  creativeId: string;
  date: string;
  hour: number;
  impressions: number;
  clicks: number;
  conversions: number;
  cost: number;
  revenue: number;
  ctr: number;
  cvr: number;
  cpm: number;
  cpc: number;
  cpa: number;
  roi: number;
  region?: string;
  audienceAge?: number;
  audienceGender?: 'male' | 'female';
}

export interface MetricsSummary {
  date: string;
  advertiserId?: string;
  channelId?: string;
  positionId?: string;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  totalCost: number;
  totalRevenue: number;
  avgCtr: number;
  avgCvr: number;
  avgCpm: number;
  avgRoi: number;
}

export interface Alert {
  id: string;
  scheduleId: string;
  positionId: string;
  channelId: string;
  advertiserId: string;
  level: AlertLevel;
  type: 'cvr_low' | 'roi_low';
  metricName: string;
  currentValue: number;
  threshold: number;
  startTime: string;
  endTime?: string;
  status: AlertStatus;
  message: string;
  assignee?: string;
}

export interface ApprovalRequest {
  id: string;
  alertId?: string;
  scheduleId: string;
  action: ApprovalAction;
  actionDetails: Record<string, any>;
  reason: string;
  status: ApprovalStatus;
  optimizerId?: string;
  optimizerComment?: string;
  optimizerTime?: string;
  supervisorId?: string;
  supervisorComment?: string;
  supervisorTime?: string;
  directorId?: string;
  directorComment?: string;
  directorTime?: string;
  createdAt: string;
  completedAt?: string;
}

export interface ForecastResult {
  scheduleId: string;
  timestamp: string;
  horizonHours: number;
  predictions: Array<{
    time: string;
    predictedImpressions: number;
    predictedClicks: number;
    predictedConversions: number;
    predictedCost: number;
    confidence: number;
  }>;
  recommendations: Array<{
    type: 'bid_adjustment' | 'creative_replace' | 'budget_allocation';
    priority: 'high' | 'medium' | 'low';
    description: string;
    expectedImpact: {
      metric: string;
      changePercent: number;
    };
  }>;
}

export interface WeeklyReport {
  id: string;
  advertiserId?: string;
  startDate: string;
  endDate: string;
  generatedAt: string;
  summary: {
    totalImpressions: number;
    totalClicks: number;
    totalConversions: number;
    totalCost: number;
    totalRevenue: number;
    avgCtr: number;
    avgCvr: number;
    avgRoi: number;
  };
  weekOverWeek: {
    impressionsChange: number;
    clicksChange: number;
    conversionsChange: number;
    costChange: number;
    ctrChange: number;
    cvrChange: number;
    roiChange: number;
  };
  anomalies: Array<{
    type: 'ctr_drop' | 'cost_spike' | 'abnormal_clicks' | 'cvr_drop';
    description: string;
    severity: 'high' | 'medium' | 'low';
    detectedAt: string;
  }>;
  clickAttribution: Array<{
    channel: string;
    percentage: number;
    assistedConversions: number;
  }>;
  recommendations: Array<{
    category: 'budget' | 'creative' | 'targeting' | 'bidding';
    priority: 'high' | 'medium' | 'low';
    description: string;
    expectedBenefit: string;
  }>;
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  email: string;
  phone?: string;
  advertiserIds?: string[];
  agencyIds?: string[];
  mediaIds?: string[];
  createdAt: string;
  lastLogin?: string;
}

export interface AuthContext {
  user: User;
  permissions: {
    canViewAdvertiser: (advertiserId: string) => boolean;
    canViewChannel: (channelId: string) => boolean;
    canEdit: () => boolean;
    canApproveLevel: (level: number) => boolean;
  };
}

export interface HeatmapData {
  region: string;
  value: number;
  metric: 'roi' | 'impressions' | 'conversions';
}

export interface TrendDataPoint {
  time: string;
  value: number;
  metric: string;
}

export interface AudienceProfile {
  ageDistribution: Array<{ range: string; percentage: number }>;
  genderDistribution: Array<{ gender: string; percentage: number }>;
  interestDistribution: Array<{ interest: string; percentage: number }>;
  regionDistribution: Array<{ region: string; percentage: number }>;
}

export const CHANNEL_DISPLAY_NAMES: Record<ChannelType, string> = {
  [ChannelType.SEARCH]: '搜索',
  [ChannelType.SOCIAL]: '社交',
  [ChannelType.VIDEO]: '视频',
  [ChannelType.FEED]: '信息流',
  [ChannelType.DISPLAY]: '展示'
};

export const INDUSTRY_AVERAGES: Record<string, { ctr: number; cvr: number; cpm: number; roi: number }> = {
  'e-commerce': { ctr: 0.025, cvr: 0.035, cpm: 30, roi: 2.8 },
  education: { ctr: 0.018, cvr: 0.08, cpm: 45, roi: 3.2 },
  finance: { ctr: 0.012, cvr: 0.05, cpm: 80, roi: 4.0 },
  healthcare: { ctr: 0.015, cvr: 0.06, cpm: 55, roi: 3.5 },
  real_estate: { ctr: 0.008, cvr: 0.015, cpm: 120, roi: 5.0 },
  automotive: { ctr: 0.02, cvr: 0.02, cpm: 65, roi: 3.8 },
  food_beverage: { ctr: 0.03, cvr: 0.045, cpm: 25, roi: 2.5 },
  travel: { ctr: 0.022, cvr: 0.025, cpm: 40, roi: 3.0 },
  default: { ctr: 0.02, cvr: 0.03, cpm: 40, roi: 3.0 }
};

export const CHINA_PROVINCES = [
  '北京', '上海', '广东', '江苏', '浙江', '山东', '四川', '湖北', '河南', '福建',
  '湖南', '安徽', '河北', '辽宁', '陕西', '重庆', '江西', '云南', '广西', '山西',
  '贵州', '黑龙江', '吉林', '甘肃', '内蒙古', '新疆', '海南', '宁夏', '青海', '西藏'
];
