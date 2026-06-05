export declare enum ChannelType {
    SEARCH = "search",
    SOCIAL = "social",
    VIDEO = "video",
    FEED = "feed",
    DISPLAY = "display"
}
export declare enum UserRole {
    ADVERTISER = "advertiser",
    AGENCY = "agency",
    MEDIA = "media",
    OPTIMIZER = "optimizer",
    MEDIA_SUPERVISOR = "media_supervisor",
    STRATEGY_DIRECTOR = "strategy_director",
    ADMIN = "admin"
}
export declare enum AlertLevel {
    NONE = "none",
    LEVEL_1 = "level_1",
    LEVEL_2 = "level_2"
}
export declare enum AlertStatus {
    PENDING = "pending",
    ACKNOWLEDGED = "acknowledged",
    PROCESSING = "processing",
    RESOLVED = "resolved",
    ESCALATED = "escalated"
}
export declare enum ApprovalStatus {
    PENDING = "pending",
    OPTIMIZER_APPROVED = "optimizer_approved",
    SUPERVISOR_APPROVED = "supervisor_approved",
    DIRECTOR_APPROVED = "director_approved",
    REJECTED = "rejected",
    COMPLETED = "completed"
}
export declare enum ApprovalAction {
    PAUSE = "pause",
    ADJUST_BID = "adjust_bid",
    REPLACE_CREATIVE = "replace_creative",
    CHANGE_BUDGET = "change_budget"
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
    ageDistribution: Array<{
        range: string;
        percentage: number;
    }>;
    genderDistribution: Array<{
        gender: string;
        percentage: number;
    }>;
    interestDistribution: Array<{
        interest: string;
        percentage: number;
    }>;
    regionDistribution: Array<{
        region: string;
        percentage: number;
    }>;
}
export declare const CHANNEL_DISPLAY_NAMES: Record<ChannelType, string>;
export declare const INDUSTRY_AVERAGES: Record<string, {
    ctr: number;
    cvr: number;
    cpm: number;
    roi: number;
}>;
export declare const CHINA_PROVINCES: string[];
//# sourceMappingURL=types.d.ts.map