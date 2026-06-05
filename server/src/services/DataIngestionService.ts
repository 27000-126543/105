import { getDb } from '../models/database';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';
import { RawAdData, UnifiedAdRecord } from '@shared/types';
import { calculateMetrics } from '@shared/utils';

export class DataIngestionService {
  private get db() { return getDb(); }

  async ingestRawData(data: Omit<RawAdData, 'id'>): Promise<UnifiedAdRecord> {
    const rawId = uuidv4();
    const timestamp = new Date(data.timestamp);
    const date = timestamp.toISOString().split('T')[0];
    const hour = timestamp.getHours();

    const insertRaw = this.db.prepare(`
      INSERT INTO raw_ad_data (id, channel_id, position_id, schedule_id, advertiser_id, timestamp, impressions, clicks, conversions, cost, region, audience_age, audience_gender)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertRaw.run(
      rawId,
      data.channelId,
      data.positionId,
      data.scheduleId,
      data.advertiserId,
      data.timestamp,
      data.impressions,
      data.clicks,
      data.conversions,
      data.cost,
      data.region,
      data.audienceAge,
      data.audienceGender
    );

    return this.mergeToUnifiedRecord(data, date, hour);
  }

  private mergeToUnifiedRecord(
    data: Omit<RawAdData, 'id'>,
    date: string,
    hour: number
  ): UnifiedAdRecord {
    const schedule = this.db.prepare(`
      SELECT s.*, a.industry
      FROM ad_schedules s
      JOIN advertisers a ON s.advertiser_id = a.id
      WHERE s.id = ?
    `).get(data.scheduleId) as any;

    if (!schedule) {
      throw new Error('排期不存在');
    }

    const industryAverages: Record<string, { roi: number }> = {
      'e-commerce': { roi: 2.8 },
      'education': { roi: 3.2 },
      'finance': { roi: 4.0 },
      'healthcare': { roi: 3.5 },
      'real_estate': { roi: 5.0 },
      'automotive': { roi: 3.8 },
      'food_beverage': { roi: 2.5 },
      'travel': { roi: 3.0 },
      'default': { roi: 3.0 }
    };

    const avgRoi = (industryAverages[schedule.industry] || industryAverages.default).roi;
    const revenue = data.cost * avgRoi * (0.8 + Math.random() * 0.4);

    const metrics = calculateMetrics(
      data.impressions,
      data.clicks,
      data.conversions,
      data.cost,
      revenue
    );

    const existingRecord = this.db.prepare(`
      SELECT * FROM unified_ad_records 
      WHERE schedule_id = ? AND date = ? AND hour = ? 
      AND region IS ? AND audience_age IS ? AND audience_gender IS ?
    `).get(
      data.scheduleId,
      date,
      hour,
      data.region || null,
      data.audienceAge || null,
      data.audienceGender || null
    ) as any;

    if (existingRecord) {
      const updatedImpressions = existingRecord.impressions + data.impressions;
      const updatedClicks = existingRecord.clicks + data.clicks;
      const updatedConversions = existingRecord.conversions + data.conversions;
      const updatedCost = existingRecord.cost + data.cost;
      const updatedRevenue = existingRecord.revenue + revenue;

      const updatedMetrics = calculateMetrics(
        updatedImpressions,
        updatedClicks,
        updatedConversions,
        updatedCost,
        updatedRevenue
      );

      this.db.prepare(`
        UPDATE unified_ad_records SET
          impressions = ?, clicks = ?, conversions = ?, cost = ?, revenue = ?,
          ctr = ?, cvr = ?, cpm = ?, cpc = ?, cpa = ?, roi = ?
        WHERE id = ?
      `).run(
        updatedImpressions,
        updatedClicks,
        updatedConversions,
        updatedCost,
        updatedRevenue,
        updatedMetrics.ctr,
        updatedMetrics.cvr,
        updatedMetrics.cpm,
        updatedMetrics.cpc,
        updatedMetrics.cpa,
        updatedMetrics.roi,
        existingRecord.id
      );

      return {
        ...existingRecord,
        ...updatedMetrics,
        impressions: updatedImpressions,
        clicks: updatedClicks,
        conversions: updatedConversions,
        cost: updatedCost,
        revenue: updatedRevenue
      };
    } else {
      const recordId = uuidv4();
      const unifiedRecord: UnifiedAdRecord = {
        id: recordId,
        scheduleId: data.scheduleId,
        advertiserId: data.advertiserId,
        channelId: data.channelId,
        positionId: data.positionId,
        creativeId: schedule.creative_id,
        date,
        hour,
        ...metrics,
        region: data.region,
        audienceAge: data.audienceAge,
        audienceGender: data.audienceGender
      };

      this.db.prepare(`
        INSERT INTO unified_ad_records 
        (id, schedule_id, advertiser_id, channel_id, position_id, creative_id, date, hour,
         impressions, clicks, conversions, cost, revenue, ctr, cvr, cpm, cpc, cpa, roi,
         region, audience_age, audience_gender)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        recordId,
        unifiedRecord.scheduleId,
        unifiedRecord.advertiserId,
        unifiedRecord.channelId,
        unifiedRecord.positionId,
        unifiedRecord.creativeId,
        unifiedRecord.date,
        unifiedRecord.hour,
        unifiedRecord.impressions,
        unifiedRecord.clicks,
        unifiedRecord.conversions,
        unifiedRecord.cost,
        unifiedRecord.revenue,
        unifiedRecord.ctr,
        unifiedRecord.cvr,
        unifiedRecord.cpm,
        unifiedRecord.cpc,
        unifiedRecord.cpa,
        unifiedRecord.roi,
        unifiedRecord.region || null,
        unifiedRecord.audienceAge || null,
        unifiedRecord.audienceGender || null
      );

      return unifiedRecord;
    }
  }

  async ingestBatchData(dataArray: Array<Omit<RawAdData, 'id'>>): Promise<UnifiedAdRecord[]> {
    const results: UnifiedAdRecord[] = [];
    
    for (const data of dataArray) {
      const result = await this.ingestRawData(data);
      results.push(result);
    }
    
    return results;
  }

  async processExcelFile(buffer: Buffer): Promise<{ success: boolean; count: number; errors: string[] }> {
    const errors: string[] = [];
    let count = 0;

    try {
      const workbook = XLSX.read(buffer);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      const records: Array<Omit<RawAdData, 'id'>> = [];

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        try {
          const record = this.validateExcelRow(row, i + 1);
          if (record) {
            records.push(record);
          }
        } catch (e: any) {
          errors.push(`第 ${i + 1} 行: ${e.message}`);
        }
      }

      if (records.length > 0) {
        await this.ingestBatchData(records);
        count = records.length;
      }

      return { success: errors.length === 0, count, errors };
    } catch (e: any) {
      return { success: false, count: 0, errors: [`Excel解析失败: ${e.message}`] };
    }
  }

  private validateExcelRow(row: any, rowNum: number): Omit<RawAdData, 'id'> | null {
    const requiredFields = ['channelId', 'positionId', 'scheduleId', 'advertiserId', 'timestamp', 'impressions', 'clicks', 'conversions', 'cost'];
    
    for (const field of requiredFields) {
      if (row[field] === undefined || row[field] === null) {
        throw new Error(`缺少必填字段: ${field}`);
      }
    }

    const timestamp = row.timestamp instanceof Date 
      ? row.timestamp.toISOString() 
      : new Date(row.timestamp).toISOString();

    if (isNaN(new Date(timestamp).getTime())) {
      throw new Error(`时间格式无效: ${row.timestamp}`);
    }

    return {
      channelId: String(row.channelId),
      positionId: String(row.positionId),
      scheduleId: String(row.scheduleId),
      advertiserId: String(row.advertiserId),
      timestamp,
      impressions: Math.max(0, parseInt(row.impressions) || 0),
      clicks: Math.max(0, parseInt(row.clicks) || 0),
      conversions: Math.max(0, parseInt(row.conversions) || 0),
      cost: Math.max(0, parseFloat(row.cost) || 0),
      region: row.region || undefined,
      audienceAge: row.audienceAge ? parseInt(row.audienceAge) : undefined,
      audienceGender: row.audienceGender || undefined
    };
  }

  simulateChannelPush(count: number = 1): Array<Omit<RawAdData, 'id'>> {
    const schedules = this.db.prepare('SELECT id, advertiser_id, channel_id, position_id FROM ad_schedules WHERE status = ?').all('active') as any[];

    if (schedules.length === 0) {
      throw new Error('没有活跃的广告排期');
    }

    const regions = ['北京', '上海', '广东', '江苏', '浙江', '四川', '湖北', '山东'];
    const genders: ('male' | 'female')[] = ['male', 'female'];
    const results: Array<Omit<RawAdData, 'id'>> = [];

    for (let i = 0; i < count; i++) {
      const schedule = schedules[Math.floor(Math.random() * schedules.length)];

      const impressions = Math.floor(Math.random() * 10000) + 100;
      const ctr = 0.01 + Math.random() * 0.05;
      const clicks = Math.floor(impressions * ctr);
      const cvr = 0.02 + Math.random() * 0.08;
      const conversions = Math.floor(clicks * cvr);
      const cost = clicks * (0.5 + Math.random() * 2);

      results.push({
        channelId: schedule.channel_id,
        positionId: schedule.position_id,
        scheduleId: schedule.id,
        advertiserId: schedule.advertiser_id,
        timestamp: new Date().toISOString(),
        impressions,
        clicks,
        conversions,
        cost: Math.round(cost * 100) / 100,
        region: regions[Math.floor(Math.random() * regions.length)],
        audienceAge: 18 + Math.floor(Math.random() * 50),
        audienceGender: genders[Math.floor(Math.random() * genders.length)]
      });
    }

    return results;
  }
}

export const dataIngestionService = new DataIngestionService();
