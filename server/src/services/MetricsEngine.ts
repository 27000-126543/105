import { getDb } from '../models/database';
import { v4 as uuidv4 } from 'uuid';
import { MetricsSummary, TrendDataPoint, HeatmapData, AudienceProfile, UnifiedAdRecord } from '@shared/types';
import { aggregateMetrics, calculateWeekOverWeek, getIndustryAverage, detectAnomaly } from '@shared/utils';

export class MetricsEngine {
  private get db() { return getDb(); }

  async calculateHourlyMetrics(date: string, hour: number): Promise<MetricsSummary[]> {
    const records = this.db.prepare(`
      SELECT * FROM unified_ad_records 
      WHERE date = ? AND hour = ?
    `).all(date, hour) as any[];

    if (records.length === 0) return [];

    return this.aggregateRecords(records);
  }

  async calculateDailyMetrics(date: string): Promise<MetricsSummary[]> {
    const records = this.db.prepare(`
      SELECT * FROM unified_ad_records WHERE date = ?
    `).all(date) as any[];

    if (records.length === 0) return [];

    return this.aggregateRecords(records);
  }

  async calculateDateRangeMetrics(startDate: string, endDate: string): Promise<MetricsSummary[]> {
    const records = this.db.prepare(`
      SELECT * FROM unified_ad_records 
      WHERE date >= ? AND date <= ?
      ORDER BY date, hour
    `).all(startDate, endDate) as any[];

    if (records.length === 0) return [];

    return this.aggregateRecords(records);
  }

  private aggregateRecords(records: any[]): MetricsSummary[] {
    const groupedByAdvertiser = new Map<string, any[]>();
    const groupedByChannel = new Map<string, any[]>();
    const groupedByPosition = new Map<string, any[]>();

    for (const record of records) {
      const unifiedRecord: UnifiedAdRecord = {
        id: record.id,
        scheduleId: record.schedule_id,
        advertiserId: record.advertiser_id,
        channelId: record.channel_id,
        positionId: record.position_id,
        creativeId: record.creative_id,
        date: record.date,
        hour: record.hour,
        impressions: record.impressions,
        clicks: record.clicks,
        conversions: record.conversions,
        cost: record.cost,
        revenue: record.revenue,
        ctr: record.ctr,
        cvr: record.cvr,
        cpm: record.cpm,
        cpc: record.cpc,
        cpa: record.cpa,
        roi: record.roi,
        region: record.region,
        audienceAge: record.audience_age,
        audienceGender: record.audience_gender
      };

      if (!groupedByAdvertiser.has(record.advertiser_id)) {
        groupedByAdvertiser.set(record.advertiser_id, []);
      }
      groupedByAdvertiser.get(record.advertiser_id)!.push(unifiedRecord);

      if (!groupedByChannel.has(record.channel_id)) {
        groupedByChannel.set(record.channel_id, []);
      }
      groupedByChannel.get(record.channel_id)!.push(unifiedRecord);

      if (!groupedByPosition.has(record.position_id)) {
        groupedByPosition.set(record.position_id, []);
      }
      groupedByPosition.get(record.position_id)!.push(unifiedRecord);
    }

    const results: MetricsSummary[] = [];

    for (const [advertiserId, recs] of groupedByAdvertiser) {
      const summary = aggregateMetrics(recs);
      summary.advertiserId = advertiserId;
      results.push(summary);
    }

    for (const [channelId, recs] of groupedByChannel) {
      const summary = aggregateMetrics(recs);
      summary.channelId = channelId;
      results.push(summary);
    }

    for (const [positionId, recs] of groupedByPosition) {
      const summary = aggregateMetrics(recs);
      summary.positionId = positionId;
      results.push(summary);
    }

    return results;
  }

  async getOverallSummary(startDate: string, endDate: string, advertiserIds?: string[], channelIds?: string[]): Promise<MetricsSummary> {
    let sql = 'SELECT * FROM unified_ad_records WHERE date >= ? AND date <= ?';
    const params: any[] = [startDate, endDate];

    if (advertiserIds && advertiserIds.length > 0) {
      sql += ` AND advertiser_id IN (${advertiserIds.map(() => '?').join(',')})`;
      params.push(...advertiserIds);
    }

    if (channelIds && channelIds.length > 0) {
      sql += ` AND channel_id IN (${channelIds.map(() => '?').join(',')})`;
      params.push(...channelIds);
    }

    const records = this.db.prepare(sql).all(...params) as any[];

    const unifiedRecords: UnifiedAdRecord[] = records.map(r => ({
      id: r.id,
      scheduleId: r.schedule_id,
      advertiserId: r.advertiser_id,
      channelId: r.channel_id,
      positionId: r.position_id,
      creativeId: r.creative_id,
      date: r.date,
      hour: r.hour,
      impressions: r.impressions,
      clicks: r.clicks,
      conversions: r.conversions,
      cost: r.cost,
      revenue: r.revenue,
      ctr: r.ctr,
      cvr: r.cvr,
      cpm: r.cpm,
      cpc: r.cpc,
      cpa: r.cpa,
      roi: r.roi,
      region: r.region,
      audienceAge: r.audience_age,
      audienceGender: r.audience_gender
    }));

    return aggregateMetrics(unifiedRecords);
  }

  async getTrendData(startDate: string, endDate: string, metric: string, groupBy: 'hour' | 'day' = 'day', advertiserIds?: string[], channelIds?: string[]): Promise<TrendDataPoint[]> {
    let sql: string;
    if (groupBy === 'hour') {
      sql = `
        SELECT date, hour, SUM(impressions) as impressions, SUM(clicks) as clicks, 
               SUM(conversions) as conversions, SUM(cost) as cost, SUM(revenue) as revenue
        FROM unified_ad_records 
        WHERE date >= ? AND date <= ?
      `;
    } else {
      sql = `
        SELECT date, SUM(impressions) as impressions, SUM(clicks) as clicks, 
               SUM(conversions) as conversions, SUM(cost) as cost, SUM(revenue) as revenue
        FROM unified_ad_records 
        WHERE date >= ? AND date <= ?
      `;
    }

    const params: any[] = [startDate, endDate];

    if (advertiserIds && advertiserIds.length > 0) {
      sql += ` AND advertiser_id IN (${advertiserIds.map(() => '?').join(',')})`;
      params.push(...advertiserIds);
    }

    if (channelIds && channelIds.length > 0) {
      sql += ` AND channel_id IN (${channelIds.map(() => '?').join(',')})`;
      params.push(...channelIds);
    }

    if (groupBy === 'hour') {
      sql += ' GROUP BY date, hour ORDER BY date, hour';
    } else {
      sql += ' GROUP BY date ORDER BY date';
    }

    const rows = this.db.prepare(sql).all(...params) as any[];

    return rows.map(row => {
      let time: string;
      if (groupBy === 'hour') {
        time = `${row.date} ${String(row.hour).padStart(2, '0')}:00:00`;
      } else {
        time = row.date;
      }

      let value: number;
      switch (metric) {
        case 'impressions':
          value = row.impressions;
          break;
        case 'clicks':
          value = row.clicks;
          break;
        case 'conversions':
          value = row.conversions;
          break;
        case 'cost':
          value = row.cost;
          break;
        case 'revenue':
          value = row.revenue;
          break;
        case 'ctr':
          value = row.impressions > 0 ? row.clicks / row.impressions : 0;
          break;
        case 'cvr':
          value = row.clicks > 0 ? row.conversions / row.clicks : 0;
          break;
        case 'roi':
          value = row.cost > 0 ? row.revenue / row.cost : 0;
          break;
        case 'cpm':
          value = row.impressions > 0 ? (row.cost / row.impressions) * 1000 : 0;
          break;
        case 'cpc':
          value = row.clicks > 0 ? row.cost / row.clicks : 0;
          break;
        case 'cpa':
          value = row.conversions > 0 ? row.cost / row.conversions : 0;
          break;
        default:
          value = 0;
      }

      return { time, value, metric };
    });
  }

  async getHeatmapData(startDate: string, endDate: string, metric: 'roi' | 'impressions' | 'conversions', advertiserIds?: string[]): Promise<HeatmapData[]> {
    let sql = `
      SELECT region, SUM(impressions) as impressions, SUM(conversions) as conversions, 
             SUM(cost) as cost, SUM(revenue) as revenue
      FROM unified_ad_records 
      WHERE date >= ? AND date <= ? AND region IS NOT NULL
    `;

    const params: any[] = [startDate, endDate];

    if (advertiserIds && advertiserIds.length > 0) {
      sql += ` AND advertiser_id IN (${advertiserIds.map(() => '?').join(',')})`;
      params.push(...advertiserIds);
    }

    sql += ' GROUP BY region';

    const rows = this.db.prepare(sql).all(...params) as any[];

    return rows.map(row => {
      let value: number;
      switch (metric) {
        case 'roi':
          value = row.cost > 0 ? row.revenue / row.cost : 0;
          break;
        case 'impressions':
          value = row.impressions;
          break;
        case 'conversions':
          value = row.conversions;
          break;
      }

      return { region: row.region, value, metric };
    });
  }

  async getAudienceProfile(startDate: string, endDate: string, advertiserIds?: string[]): Promise<AudienceProfile> {
    let sql = `
      SELECT audience_age, audience_gender, SUM(impressions) as impressions, SUM(conversions) as conversions
      FROM unified_ad_records 
      WHERE date >= ? AND date <= ? AND audience_age IS NOT NULL AND audience_gender IS NOT NULL
    `;

    const params: any[] = [startDate, endDate];

    if (advertiserIds && advertiserIds.length > 0) {
      sql += ` AND advertiser_id IN (${advertiserIds.map(() => '?').join(',')})`;
      params.push(...advertiserIds);
    }

    sql += ' GROUP BY audience_age, audience_gender';

    const rows = this.db.prepare(sql).all(...params) as any[];

    const ageRanges = [
      { range: '18-24', min: 18, max: 24, count: 0 },
      { range: '25-34', min: 25, max: 34, count: 0 },
      { range: '35-44', min: 35, max: 44, count: 0 },
      { range: '45-54', min: 45, max: 54, count: 0 },
      { range: '55+', min: 55, max: 120, count: 0 }
    ];

    const genderCounts = { male: 0, female: 0 };
    let total = 0;

    for (const row of rows) {
      const count = row.conversions;
      total += count;

      for (const ageRange of ageRanges) {
        if (row.audience_age >= ageRange.min && row.audience_age <= ageRange.max) {
          ageRange.count += count;
          break;
        }
      }

      if (row.audience_gender === 'male') {
        genderCounts.male += count;
      } else if (row.audience_gender === 'female') {
        genderCounts.female += count;
      }
    }

    const interests = ['数码科技', '时尚美妆', '运动健身', '美食烹饪', '旅游出行', '金融理财', '教育学习', '游戏娱乐'];
    const interestDistribution = interests.map(interest => ({
      interest,
      percentage: (0.05 + Math.random() * 0.15) * 100
    }));

    const regionSql = `
      SELECT region, SUM(conversions) as conversions
      FROM unified_ad_records 
      WHERE date >= ? AND date <= ? AND region IS NOT NULL
    `;

    const regionRows = this.db.prepare(regionSql).all(startDate, endDate) as any[];
    const regionTotal = regionRows.reduce((sum, r) => sum + r.conversions, 0);
    const regionDistribution = regionRows.map(r => ({
      region: r.region,
      percentage: (r.conversions / regionTotal) * 100
    })).sort((a, b) => b.percentage - a.percentage);

    return {
      ageDistribution: ageRanges.map(r => ({
        range: r.range,
        percentage: total > 0 ? (r.count / total) * 100 : 0
      })),
      genderDistribution: [
        { gender: '男性', percentage: total > 0 ? (genderCounts.male / total) * 100 : 0 },
        { gender: '女性', percentage: total > 0 ? (genderCounts.female / total) * 100 : 0 }
      ],
      interestDistribution,
      regionDistribution
    };
  }

  async getRoiRanking(startDate: string, endDate: string, limit: number = 10, advertiserIds?: string[]): Promise<Array<{ id: string; name: string; type: 'advertiser' | 'channel' | 'position'; roi: number; totalRevenue: number; totalCost: number }>> {
    const results: Array<{ id: string; name: string; type: 'advertiser' | 'channel' | 'position'; roi: number; totalRevenue: number; totalCost: number }> = [];

    let advertiserSql = `
      SELECT a.id, a.name, SUM(r.revenue) as revenue, SUM(r.cost) as cost
      FROM unified_ad_records r
      JOIN advertisers a ON r.advertiser_id = a.id
      WHERE r.date >= ? AND r.date <= ?
    `;
    const params: any[] = [startDate, endDate];

    if (advertiserIds && advertiserIds.length > 0) {
      advertiserSql += ` AND r.advertiser_id IN (${advertiserIds.map(() => '?').join(',')})`;
      params.push(...advertiserIds);
    }

    advertiserSql += ' GROUP BY a.id, a.name ORDER BY revenue / cost DESC LIMIT ?';

    const advertiserRows = this.db.prepare(advertiserSql).all(...params, limit) as any[];
    
    for (const row of advertiserRows) {
      results.push({
        id: row.id,
        name: row.name,
        type: 'advertiser',
        roi: row.cost > 0 ? row.revenue / row.cost : 0,
        totalRevenue: row.revenue,
        totalCost: row.cost
      });
    }

    let channelSql = `
      SELECT c.id, c.name, SUM(r.revenue) as revenue, SUM(r.cost) as cost
      FROM unified_ad_records r
      JOIN channels c ON r.channel_id = c.id
      WHERE r.date >= ? AND r.date <= ?
    `;
    const channelParams: any[] = [startDate, endDate];

    if (advertiserIds && advertiserIds.length > 0) {
      channelSql += ` AND r.advertiser_id IN (${advertiserIds.map(() => '?').join(',')})`;
      channelParams.push(...advertiserIds);
    }

    channelSql += ' GROUP BY c.id, c.name ORDER BY revenue / cost DESC LIMIT ?';

    const channelRows = this.db.prepare(channelSql).all(...channelParams, limit) as any[];
    
    for (const row of channelRows) {
      results.push({
        id: row.id,
        name: row.name,
        type: 'channel',
        roi: row.cost > 0 ? row.revenue / row.cost : 0,
        totalRevenue: row.revenue,
        totalCost: row.cost
      });
    }

    return results.sort((a, b) => b.roi - a.roi).slice(0, limit);
  }

  async detectAnomalies(startDate: string, endDate: string, metric: string, threshold: number = 2): Promise<Array<{ date: string; value: number; expected: number; deviation: number }>> {
    const trendData = await this.getTrendData(startDate, endDate, metric, 'day');
    const values = trendData.map(d => d.value);
    const anomalyIndices = detectAnomaly(values, threshold);

    if (anomalyIndices.length === 0) return [];

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length);

    return anomalyIndices.map(index => ({
      date: trendData[index].time,
      value: values[index],
      expected: mean,
      deviation: Math.abs(values[index] - mean) / std
    }));
  }

  async saveMetricsSummary(summary: MetricsSummary): Promise<void> {
    const id = uuidv4();
    this.db.prepare(`
      INSERT INTO metrics_summaries 
      (id, date, advertiser_id, channel_id, position_id, total_impressions, total_clicks, 
       total_conversions, total_cost, total_revenue, avg_ctr, avg_cvr, avg_cpm, avg_roi)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      summary.date,
      summary.advertiserId || null,
      summary.channelId || null,
      summary.positionId || null,
      summary.totalImpressions,
      summary.totalClicks,
      summary.totalConversions,
      summary.totalCost,
      summary.totalRevenue,
      summary.avgCtr,
      summary.avgCvr,
      summary.avgCpm,
      summary.avgRoi
    );
  }

  async calculateWeekOverWeekMetrics(currentWeekStart: string, currentWeekEnd: string): Promise<any> {
    const current = await this.getOverallSummary(currentWeekStart, currentWeekEnd);
    
    const currentStartDate = new Date(currentWeekStart);
    const prevWeekStart = new Date(currentStartDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const prevWeekEnd = new Date(currentStartDate.getTime() - 24 * 60 * 60 * 1000);
    
    const previous = await this.getOverallSummary(
      prevWeekStart.toISOString().split('T')[0],
      prevWeekEnd.toISOString().split('T')[0]
    );

    return {
      current,
      previous,
      changes: {
        impressionsChange: calculateWeekOverWeek(current.totalImpressions, previous.totalImpressions),
        clicksChange: calculateWeekOverWeek(current.totalClicks, previous.totalClicks),
        conversionsChange: calculateWeekOverWeek(current.totalConversions, previous.totalConversions),
        costChange: calculateWeekOverWeek(current.totalCost, previous.totalCost),
        ctrChange: calculateWeekOverWeek(current.avgCtr, previous.avgCtr),
        cvrChange: calculateWeekOverWeek(current.avgCvr, previous.avgCvr),
        roiChange: calculateWeekOverWeek(current.avgRoi, previous.avgRoi)
      }
    };
  }
}

export const metricsEngine = new MetricsEngine();
