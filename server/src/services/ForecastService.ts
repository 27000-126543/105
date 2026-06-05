import { getDb } from '../models/database';
import { v4 as uuidv4 } from 'uuid';
import { ForecastResult, UnifiedAdRecord } from '@shared/types';
import { movingAverage, getIndustryAverage } from '@shared/utils';

export class ForecastService {
  private get db() { return getDb(); }

  async generateForecast(
    scheduleId: string,
    horizonHours: number = 72
  ): Promise<ForecastResult> {
    const schedule = this.db.prepare(`
      SELECT s.*, a.industry
      FROM ad_schedules s
      JOIN advertisers a ON s.advertiser_id = a.id
      WHERE s.id = ?
    `).get(scheduleId) as any;

    if (!schedule) {
      throw new Error('排期不存在');
    }

    const historicalData = await this.getHistoricalData(scheduleId, horizonHours);
    
    const predictions = this.generatePredictions(historicalData, horizonHours, schedule);
    const recommendations = this.generateRecommendations(predictions, schedule, horizonHours);

    const forecastId = uuidv4();
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO forecasts (id, schedule_id, timestamp, horizon_hours, predictions, recommendations)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      forecastId,
      scheduleId,
      now,
      horizonHours,
      JSON.stringify(predictions),
      JSON.stringify(recommendations)
    );

    return {
      scheduleId,
      timestamp: now,
      horizonHours,
      predictions,
      recommendations
    };
  }

  private async getHistoricalData(
    scheduleId: string,
    horizonHours: number
  ): Promise<UnifiedAdRecord[]> {
    const dataPoints = Math.max(horizonHours * 2, 168);
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - dataPoints * 60 * 60 * 1000);

    const rows = this.db.prepare(`
      SELECT * FROM unified_ad_records
      WHERE schedule_id = ? AND date >= ? AND date <= ?
      ORDER BY date, hour
    `).all(
      scheduleId,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    ) as any[];

    return rows.map(row => ({
      id: row.id,
      scheduleId: row.schedule_id,
      advertiserId: row.advertiser_id,
      channelId: row.channel_id,
      positionId: row.position_id,
      creativeId: row.creative_id,
      date: row.date,
      hour: row.hour,
      impressions: row.impressions,
      clicks: row.clicks,
      conversions: row.conversions,
      cost: row.cost,
      revenue: row.revenue,
      ctr: row.ctr,
      cvr: row.cvr,
      cpm: row.cpm,
      cpc: row.cpc,
      cpa: row.cpa,
      roi: row.roi,
      region: row.region,
      audienceAge: row.audience_age,
      audienceGender: row.audience_gender
    }));
  }

  private generatePredictions(
    historicalData: UnifiedAdRecord[],
    horizonHours: number,
    schedule: any
  ): ForecastResult['predictions'] {
    const predictions: ForecastResult['predictions'] = [];
    
    if (historicalData.length === 0) {
      return this.generateDefaultPredictions(horizonHours, schedule);
    }

    const hourlyData = this.aggregateByHour(historicalData);
    
    const impressionsSeries = hourlyData.map(d => d.impressions);
    const clicksSeries = hourlyData.map(d => d.clicks);
    const conversionsSeries = hourlyData.map(d => d.conversions);
    const costSeries = hourlyData.map(d => d.cost);

    const windowSize = Math.min(24, impressionsSeries.length);
    
    const maImpressions = movingAverage(impressionsSeries, windowSize);
    const maClicks = movingAverage(clicksSeries, windowSize);
    const maConversions = movingAverage(conversionsSeries, windowSize);
    const maCost = movingAverage(costSeries, windowSize);

    const { slope: slopeImpressions, intercept: interceptImpressions } = this.linearRegression(impressionsSeries);
    const { slope: slopeClicks, intercept: interceptClicks } = this.linearRegression(clicksSeries);
    const { slope: slopeConversions, intercept: interceptConversions } = this.linearRegression(conversionsSeries);
    const { slope: slopeCost, intercept: interceptCost } = this.linearRegression(costSeries);

    const now = new Date();

    for (let i = 0; i < horizonHours; i++) {
      const forecastTime = new Date(now.getTime() + i * 60 * 60 * 1000);
      
      const hourOfDay = forecastTime.getHours();
      const dayOfWeek = forecastTime.getDay();
      
      const hourFactor = this.getHourFactor(hourOfDay);
      const dayFactor = this.getDayFactor(dayOfWeek);

      const maIndex = Math.min(maImpressions.length - 1, Math.floor(i / 3));
      
      const maPredImpressions = maImpressions[maIndex] || maImpressions[maImpressions.length - 1] || 1000;
      const maPredClicks = maClicks[maIndex] || maClicks[maClicks.length - 1] || 50;
      const maPredConversions = maConversions[maIndex] || maConversions[maConversions.length - 1] || 5;
      const maPredCost = maCost[maIndex] || maCost[maCost.length - 1] || 100;

      const lrPredImpressions = Math.max(0, interceptImpressions + slopeImpressions * (impressionsSeries.length + i));
      const lrPredClicks = Math.max(0, interceptClicks + slopeClicks * (clicksSeries.length + i));
      const lrPredConversions = Math.max(0, interceptConversions + slopeConversions * (conversionsSeries.length + i));
      const lrPredCost = Math.max(0, interceptCost + slopeCost * (costSeries.length + i));

      const weightMA = 0.6;
      const weightLR = 0.4;

      const predictedImpressions = Math.max(0, Math.round(
        (weightMA * maPredImpressions + weightLR * lrPredImpressions) * hourFactor * dayFactor
      ));
      const predictedClicks = Math.max(0, Math.round(
        (weightMA * maPredClicks + weightLR * lrPredClicks) * hourFactor * dayFactor
      ));
      const predictedConversions = Math.max(0, Math.round(
        (weightMA * maPredConversions + weightLR * lrPredConversions) * hourFactor * dayFactor
      ));
      const predictedCost = Math.max(0, Math.round(
        (weightMA * maPredCost + weightLR * lrPredCost) * hourFactor * dayFactor * 100
      ) / 100);

      const baseConfidence = Math.max(0.3, 1 - (i / horizonHours) * 0.5);
      const dataSufficiencyConfidence = Math.min(1, historicalData.length / 168);
      const confidence = Math.round(baseConfidence * dataSufficiencyConfidence * 100) / 100;

      predictions.push({
        time: forecastTime.toISOString(),
        predictedImpressions,
        predictedClicks,
        predictedConversions,
        predictedCost,
        confidence
      });
    }

    return predictions;
  }

  private generateDefaultPredictions(
    horizonHours: number,
    schedule: any
  ): ForecastResult['predictions'] {
    const predictions: ForecastResult['predictions'] = [];
    const industryAvg = getIndustryAverage(schedule.industry);
    const now = new Date();

    const baseImpressions = 1000 + Math.random() * 5000;
    const baseClicks = baseImpressions * industryAvg.ctr;
    const baseConversions = baseClicks * industryAvg.cvr;
    const baseCost = baseClicks * schedule.bid_price;

    for (let i = 0; i < horizonHours; i++) {
      const forecastTime = new Date(now.getTime() + i * 60 * 60 * 1000);
      const hourOfDay = forecastTime.getHours();
      const hourFactor = this.getHourFactor(hourOfDay);
      const dayFactor = this.getDayFactor(forecastTime.getDay());

      const variation = 0.8 + Math.random() * 0.4;

      predictions.push({
        time: forecastTime.toISOString(),
        predictedImpressions: Math.round(baseImpressions * hourFactor * dayFactor * variation),
        predictedClicks: Math.round(baseClicks * hourFactor * dayFactor * variation),
        predictedConversions: Math.round(baseConversions * hourFactor * dayFactor * variation),
        predictedCost: Math.round(baseCost * hourFactor * dayFactor * variation * 100) / 100,
        confidence: 0.5
      });
    }

    return predictions;
  }

  private generateRecommendations(
    predictions: ForecastResult['predictions'],
    schedule: any,
    horizonHours: number
  ): ForecastResult['recommendations'] {
    const recommendations: ForecastResult['recommendations'] = [];
    
    const totalPredictedImpressions = predictions.reduce((sum, p) => sum + p.predictedImpressions, 0);
    const totalPredictedConversions = predictions.reduce((sum, p) => sum + p.predictedConversions, 0);
    const totalPredictedCost = predictions.reduce((sum, p) => sum + p.predictedCost, 0);
    const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;

    const industryAvg = getIndustryAverage(schedule.industry);
    const predictedCvr = totalPredictedImpressions > 0 ? totalPredictedConversions / totalPredictedImpressions : 0;
    const predictedRoi = totalPredictedCost > 0 ? (totalPredictedConversions * industryAvg.roi * schedule.bid_price) / totalPredictedCost : 0;

    if (avgConfidence < 0.6) {
      recommendations.push({
        type: 'bid_adjustment',
        priority: 'high',
        description: '预测置信度较低，建议降低出价10%-15%以控制风险，待数据积累后再优化',
        expectedImpact: {
          metric: 'cost_efficiency',
          changePercent: -10
        }
      });
    }

    if (predictedCvr < industryAvg.cvr * 0.7) {
      recommendations.push({
        type: 'creative_replace',
        priority: 'high',
        description: `预测转化率(${predictedCvr.toFixed(2)}%)远低于行业均值(${industryAvg.cvr.toFixed(2)}%)，建议立即更换创意素材，可考虑A/B测试多套方案`,
        expectedImpact: {
          metric: 'cvr',
          changePercent: 30
        }
      });
    }

    if (predictedRoi < 1.5) {
      recommendations.push({
        type: 'bid_adjustment',
        priority: 'high',
        description: `预测ROI(${predictedRoi.toFixed(2)})低于1.5，建议降低出价20%或暂停低效时段投放`,
        expectedImpact: {
          metric: 'roi',
          changePercent: 25
        }
      });
    }

    const lowConfidenceHours = predictions.filter(p => p.confidence < 0.4).length;
    if (lowConfidenceHours > horizonHours * 0.3) {
      recommendations.push({
        type: 'budget_allocation',
        priority: 'medium',
        description: `未来${lowConfidenceHours}小时预测置信度较低，建议将预算向高置信度时段倾斜`,
        expectedImpact: {
          metric: 'budget_efficiency',
          changePercent: 15
        }
      });
    }

    const peakHours = this.findPeakHours(predictions);
    if (peakHours.length > 0) {
      recommendations.push({
        type: 'bid_adjustment',
        priority: 'medium',
        description: `预测${peakHours.map(h => `${h.hour}时`).join('、')}为流量高峰，建议提高出价10%-20%抢占优质流量`,
        expectedImpact: {
          metric: 'impressions',
          changePercent: 20
        }
      });
    }

    if (totalPredictedImpressions < schedule.daily_budget * 10) {
      recommendations.push({
        type: 'creative_replace',
        priority: 'low',
        description: '预测展示量偏低，建议扩展定向范围或更换更吸引眼球的创意素材',
        expectedImpact: {
          metric: 'reach',
          changePercent: 40
        }
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  private findPeakHours(predictions: ForecastResult['predictions']): Array<{ hour: number; impressions: number }> {
    const hourlySums = new Map<number, number>();
    
    for (const p of predictions) {
      const hour = new Date(p.time).getHours();
      hourlySums.set(hour, (hourlySums.get(hour) || 0) + p.predictedImpressions);
    }

    const sortedHours = Array.from(hourlySums.entries())
      .map(([hour, impressions]) => ({ hour, impressions }))
      .sort((a, b) => b.impressions - a.impressions);

    const avgImpressions = sortedHours.reduce((sum, h) => sum + h.impressions, 0) / sortedHours.length;
    
    return sortedHours.filter(h => h.impressions > avgImpressions * 1.3).slice(0, 3);
  }

  private aggregateByHour(data: UnifiedAdRecord[]): Array<{ hour: number; impressions: number; clicks: number; conversions: number; cost: number }> {
    const hourlyMap = new Map<string, { impressions: number; clicks: number; conversions: number; cost: number }>();

    for (const record of data) {
      const key = `${record.date}-${record.hour}`;
      const existing = hourlyMap.get(key) || { impressions: 0, clicks: 0, conversions: 0, cost: 0 };
      
      existing.impressions += record.impressions;
      existing.clicks += record.clicks;
      existing.conversions += record.conversions;
      existing.cost += record.cost;
      
      hourlyMap.set(key, existing);
    }

    return Array.from(hourlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, values]) => ({
        hour: parseInt(key.split('-')[3]),
        ...values
      }));
  }

  private linearRegression(y: number[]): { slope: number; intercept: number } {
    const n = y.length;
    if (n === 0) return { slope: 0, intercept: 0 };

    const x = Array.from({ length: n }, (_, i) => i);
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope: isNaN(slope) ? 0 : slope, intercept: isNaN(intercept) ? 0 : intercept };
  }

  private getHourFactor(hour: number): number {
    const factors: Record<number, number> = {
      0: 0.3, 1: 0.2, 2: 0.15, 3: 0.1, 4: 0.1, 5: 0.15,
      6: 0.3, 7: 0.5, 8: 0.7, 9: 0.9, 10: 1.0, 11: 1.1,
      12: 1.2, 13: 1.1, 14: 1.0, 15: 1.0, 16: 1.1, 17: 1.2,
      18: 1.3, 19: 1.4, 20: 1.5, 21: 1.4, 22: 1.2, 23: 0.8
    };
    return factors[hour] || 1.0;
  }

  private getDayFactor(dayOfWeek: number): number {
    const factors: Record<number, number> = {
      0: 0.8, 1: 1.0, 2: 1.0, 3: 1.0, 4: 1.0, 5: 1.1, 6: 0.9
    };
    return factors[dayOfWeek] || 1.0;
  }

  async getForecastHistory(
    scheduleId: string,
    limit: number = 10
  ): Promise<ForecastResult[]> {
    const rows = this.db.prepare(`
      SELECT * FROM forecasts 
      WHERE schedule_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `).all(scheduleId, limit) as any[];

    return rows.map(row => ({
      scheduleId: row.schedule_id,
      timestamp: row.timestamp,
      horizonHours: row.horizon_hours,
      predictions: JSON.parse(row.predictions),
      recommendations: JSON.parse(row.recommendations)
    }));
  }

  async getLatestForecast(scheduleId: string): Promise<ForecastResult | null> {
    const row = this.db.prepare(`
      SELECT * FROM forecasts 
      WHERE schedule_id = ? 
      ORDER BY timestamp DESC 
      LIMIT 1
    `).get(scheduleId) as any;

    if (!row) return null;

    return {
      scheduleId: row.schedule_id,
      timestamp: row.timestamp,
      horizonHours: row.horizon_hours,
      predictions: JSON.parse(row.predictions),
      recommendations: JSON.parse(row.recommendations)
    };
  }
}

export const forecastService = new ForecastService();
