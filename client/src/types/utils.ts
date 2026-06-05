import { UnifiedAdRecord, MetricsSummary, TrendDataPoint, INDUSTRY_AVERAGES } from './types';

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function formatNumber(num: number, decimals: number = 2): string {
  if (num >= 100000000) {
    return (num / 100000000).toFixed(decimals) + '亿';
  } else if (num >= 10000) {
    return (num / 10000).toFixed(decimals) + '万';
  }
  return num.toFixed(decimals);
}

export function formatPercent(num: number, decimals: number = 2): string {
  return (num * 100).toFixed(decimals) + '%';
}

export function formatCurrency(num: number, decimals: number = 2): string {
  return '¥' + num.toFixed(decimals);
}

export function calculateMetrics(
  impressions: number,
  clicks: number,
  conversions: number,
  cost: number,
  revenue: number = 0
): Omit<UnifiedAdRecord, 'id' | 'scheduleId' | 'advertiserId' | 'channelId' | 'positionId' | 'creativeId' | 'date' | 'hour' | 'region' | 'audienceAge' | 'audienceGender'> {
  const ctr = impressions > 0 ? clicks / impressions : 0;
  const cvr = clicks > 0 ? conversions / clicks : 0;
  const cpm = impressions > 0 ? (cost / impressions) * 1000 : 0;
  const cpc = clicks > 0 ? cost / clicks : 0;
  const cpa = conversions > 0 ? cost / conversions : 0;
  const roi = cost > 0 ? revenue / cost : 0;

  return {
    impressions,
    clicks,
    conversions,
    cost,
    revenue,
    ctr,
    cvr,
    cpm,
    cpc,
    cpa,
    roi
  };
}

export function aggregateMetrics(records: UnifiedAdRecord[]): MetricsSummary {
  if (records.length === 0) {
    return {
      date: new Date().toISOString().split('T')[0],
      totalImpressions: 0,
      totalClicks: 0,
      totalConversions: 0,
      totalCost: 0,
      totalRevenue: 0,
      avgCtr: 0,
      avgCvr: 0,
      avgCpm: 0,
      avgRoi: 0
    };
  }

  const totals = records.reduce((acc, r) => ({
    impressions: acc.impressions + r.impressions,
    clicks: acc.clicks + r.clicks,
    conversions: acc.conversions + r.conversions,
    cost: acc.cost + r.cost,
    revenue: acc.revenue + r.revenue
  }), { impressions: 0, clicks: 0, conversions: 0, cost: 0, revenue: 0 });

  const metrics = calculateMetrics(
    totals.impressions,
    totals.clicks,
    totals.conversions,
    totals.cost,
    totals.revenue
  );

  return {
    date: records[0].date,
    advertiserId: records[0].advertiserId,
    channelId: records[0].channelId,
    positionId: records[0].positionId,
    totalImpressions: totals.impressions,
    totalClicks: totals.clicks,
    totalConversions: totals.conversions,
    totalCost: totals.cost,
    totalRevenue: totals.revenue,
    avgCtr: metrics.ctr,
    avgCvr: metrics.cvr,
    avgCpm: metrics.cpm,
    avgRoi: metrics.roi
  };
}

export function getIndustryAverage(industry: string): typeof INDUSTRY_AVERAGES.default {
  return INDUSTRY_AVERAGES[industry] || INDUSTRY_AVERAGES.default;
}

export function checkCvrAlert(currentCvr: number, industryCvr: number): { shouldAlert: boolean; percentage: number } {
  const threshold = industryCvr * 0.7;
  const percentage = (currentCvr / industryCvr) * 100;
  return {
    shouldAlert: currentCvr < threshold,
    percentage
  };
}

export function checkRoiAlert(currentRoi: number): { shouldAlert: boolean; threshold: number } {
  const threshold = 1.5;
  return {
    shouldAlert: currentRoi < threshold,
    threshold
  };
}

export function generateTimeSeries(startTime: Date, hours: number, intervalMinutes: number = 60): TrendDataPoint[] {
  const points: TrendDataPoint[] = [];
  const interval = intervalMinutes * 60 * 1000;
  const count = Math.floor((hours * 60 * 60 * 1000) / interval);

  for (let i = 0; i < count; i++) {
    const time = new Date(startTime.getTime() + i * interval);
    points.push({
      time: time.toISOString(),
      value: Math.random() * 100,
      metric: 'default'
    });
  }

  return points;
}

export function movingAverage(data: number[], windowSize: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = data.slice(start, i + 1);
    const avg = window.reduce((a, b) => a + b, 0) / window.length;
    result.push(avg);
  }
  return result;
}

export function detectAnomaly(data: number[], threshold: number = 2): number[] {
  if (data.length < 3) return [];

  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const std = Math.sqrt(data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / data.length);

  return data
    .map((value, index) => ({ value, index }))
    .filter(item => Math.abs(item.value - mean) > threshold * std)
    .map(item => item.index);
}

export function calculateWeekOverWeek(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 1 : 0;
  return (current - previous) / previous;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function getRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  return formatDate(d);
}
