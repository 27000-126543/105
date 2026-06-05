import { UnifiedAdRecord, MetricsSummary, TrendDataPoint, INDUSTRY_AVERAGES } from './types';
export declare function generateId(): string;
export declare function formatNumber(num: number, decimals?: number): string;
export declare function formatPercent(num: number, decimals?: number): string;
export declare function formatCurrency(num: number, decimals?: number): string;
export declare function calculateMetrics(impressions: number, clicks: number, conversions: number, cost: number, revenue?: number): Omit<UnifiedAdRecord, 'id' | 'scheduleId' | 'advertiserId' | 'channelId' | 'positionId' | 'creativeId' | 'date' | 'hour' | 'region' | 'audienceAge' | 'audienceGender'>;
export declare function aggregateMetrics(records: UnifiedAdRecord[]): MetricsSummary;
export declare function getIndustryAverage(industry: string): typeof INDUSTRY_AVERAGES.default;
export declare function checkCvrAlert(currentCvr: number, industryCvr: number): {
    shouldAlert: boolean;
    percentage: number;
};
export declare function checkRoiAlert(currentRoi: number): {
    shouldAlert: boolean;
    threshold: number;
};
export declare function generateTimeSeries(startTime: Date, hours: number, intervalMinutes?: number): TrendDataPoint[];
export declare function movingAverage(data: number[], windowSize: number): number[];
export declare function detectAnomaly(data: number[], threshold?: number): number[];
export declare function calculateWeekOverWeek(current: number, previous: number): number;
export declare function formatDate(date: Date | string): string;
export declare function formatDateTime(date: Date | string): string;
export declare function getRelativeTime(date: Date | string): string;
//# sourceMappingURL=utils.d.ts.map