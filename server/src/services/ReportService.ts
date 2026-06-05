import { getDb } from '../models/database';
import { v4 as uuidv4 } from 'uuid';
import { WeeklyReport, MetricsSummary } from '@shared/types';
import { metricsEngine } from './MetricsEngine';
import { calculateWeekOverWeek, detectAnomaly, getIndustryAverage } from '@shared/utils';
import * as XLSX from 'xlsx';

export class ReportService {
  private get db() { return getDb(); }

  async generateWeeklyReport(
    advertiserId?: string,
    customStartDate?: string,
    customEndDate?: string
  ): Promise<WeeklyReport> {
    const now = new Date();
    
    let endDate: Date;
    let startDate: Date;

    if (customStartDate && customEndDate) {
      startDate = new Date(customStartDate);
      endDate = new Date(customEndDate);
    } else {
      endDate = new Date(now);
      endDate.setDate(endDate.getDate() - 1);
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6);
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const advertiserIds = advertiserId ? [advertiserId] : undefined;

    const currentSummary = await metricsEngine.getOverallSummary(
      startDateStr,
      endDateStr,
      advertiserIds
    );

    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - 7);
    const prevEndDate = new Date(endDate);
    prevEndDate.setDate(prevEndDate.getDate() - 7);

    const previousSummary = await metricsEngine.getOverallSummary(
      prevStartDate.toISOString().split('T')[0],
      prevEndDate.toISOString().split('T')[0],
      advertiserIds
    );

    const weekOverWeek = {
      impressionsChange: calculateWeekOverWeek(currentSummary.totalImpressions, previousSummary.totalImpressions),
      clicksChange: calculateWeekOverWeek(currentSummary.totalClicks, previousSummary.totalClicks),
      conversionsChange: calculateWeekOverWeek(currentSummary.totalConversions, previousSummary.totalConversions),
      costChange: calculateWeekOverWeek(currentSummary.totalCost, previousSummary.totalCost),
      ctrChange: calculateWeekOverWeek(currentSummary.avgCtr, previousSummary.avgCtr),
      cvrChange: calculateWeekOverWeek(currentSummary.avgCvr, previousSummary.avgCvr),
      roiChange: calculateWeekOverWeek(currentSummary.avgRoi, previousSummary.avgRoi)
    };

    const anomalies = await this.detectWeeklyAnomalies(startDateStr, endDateStr, advertiserIds);

    const clickAttribution = await this.getClickAttribution(startDateStr, endDateStr, advertiserIds);

    const recommendations = await this.generateRecommendations(
      currentSummary,
      weekOverWeek,
      anomalies,
      clickAttribution,
      advertiserId
    );

    const reportId = uuidv4();
    const generatedAt = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO weekly_reports 
      (id, advertiser_id, start_date, end_date, generated_at, summary, week_over_week, 
       anomalies, click_attribution, recommendations)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      reportId,
      advertiserId || null,
      startDateStr,
      endDateStr,
      generatedAt,
      JSON.stringify({
        totalImpressions: currentSummary.totalImpressions,
        totalClicks: currentSummary.totalClicks,
        totalConversions: currentSummary.totalConversions,
        totalCost: currentSummary.totalCost,
        totalRevenue: currentSummary.totalRevenue,
        avgCtr: currentSummary.avgCtr,
        avgCvr: currentSummary.avgCvr,
        avgRoi: currentSummary.avgRoi
      }),
      JSON.stringify(weekOverWeek),
      JSON.stringify(anomalies),
      JSON.stringify(clickAttribution),
      JSON.stringify(recommendations)
    );

    return {
      id: reportId,
      advertiserId,
      startDate: startDateStr,
      endDate: endDateStr,
      generatedAt,
      summary: {
        totalImpressions: currentSummary.totalImpressions,
        totalClicks: currentSummary.totalClicks,
        totalConversions: currentSummary.totalConversions,
        totalCost: currentSummary.totalCost,
        totalRevenue: currentSummary.totalRevenue,
        avgCtr: currentSummary.avgCtr,
        avgCvr: currentSummary.avgCvr,
        avgRoi: currentSummary.avgRoi
      },
      weekOverWeek,
      anomalies,
      clickAttribution,
      recommendations
    };
  }

  private async detectWeeklyAnomalies(
    startDate: string,
    endDate: string,
    advertiserIds?: string[]
  ): Promise<WeeklyReport['anomalies']> {
    const anomalies: WeeklyReport['anomalies'] = [];

    const ctrAnomalies = await metricsEngine.detectAnomalies(startDate, endDate, 'ctr', 2.5);
    for (const anomaly of ctrAnomalies) {
      anomalies.push({
        type: 'ctr_drop',
        description: `CTR异常波动: ${(anomaly.value * 100).toFixed(2)}%，预期: ${(anomaly.expected * 100).toFixed(2)}%，偏离度: ${anomaly.deviation.toFixed(2)}σ`,
        severity: anomaly.deviation > 3 ? 'high' : anomaly.deviation > 2 ? 'medium' : 'low',
        detectedAt: anomaly.date
      });
    }

    const costAnomalies = await metricsEngine.detectAnomalies(startDate, endDate, 'cost', 2.5);
    for (const anomaly of costAnomalies) {
      anomalies.push({
        type: 'cost_spike',
        description: `成本异常波动: ¥${anomaly.value.toFixed(2)}，预期: ¥${anomaly.expected.toFixed(2)}，偏离度: ${anomaly.deviation.toFixed(2)}σ`,
        severity: anomaly.deviation > 3 ? 'high' : anomaly.deviation > 2 ? 'medium' : 'low',
        detectedAt: anomaly.date
      });
    }

    const cvrAnomalies = await metricsEngine.detectAnomalies(startDate, endDate, 'cvr', 2.5);
    for (const anomaly of cvrAnomalies) {
      anomalies.push({
        type: 'cvr_drop',
        description: `CVR异常波动: ${(anomaly.value * 100).toFixed(2)}%，预期: ${(anomaly.expected * 100).toFixed(2)}%，偏离度: ${anomaly.deviation.toFixed(2)}σ`,
        severity: anomaly.deviation > 3 ? 'high' : anomaly.deviation > 2 ? 'medium' : 'low',
        detectedAt: anomaly.date
      });
    }

    const clickAnomalies = await this.detectAbnormalClicks(startDate, endDate, advertiserIds);
    for (const anomaly of clickAnomalies) {
      anomalies.push(anomaly);
    }

    return anomalies.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  private async detectAbnormalClicks(
    startDate: string,
    endDate: string,
    advertiserIds?: string[]
  ): Promise<WeeklyReport['anomalies']> {
    const anomalies: WeeklyReport['anomalies'] = [];

    let sql = `
      SELECT date, SUM(impressions) as impressions, SUM(clicks) as clicks,
             SUM(CASE WHEN audience_age IS NOT NULL THEN clicks ELSE 0 END) as clicks_with_age
      FROM unified_ad_records
      WHERE date >= ? AND date <= ?
    `;
    const params: any[] = [startDate, endDate];

    if (advertiserIds && advertiserIds.length > 0) {
      sql += ` AND advertiser_id IN (${advertiserIds.map(() => '?').join(',')})`;
      params.push(...advertiserIds);
    }

    sql += ' GROUP BY date ORDER BY date';

    const rows = this.db.prepare(sql).all(...params) as any[];

    for (const row of rows) {
      const ctr = row.impressions > 0 ? row.clicks / row.impressions : 0;
      const suspiciousRatio = row.clicks > 0 ? (row.clicks - row.clicks_with_age) / row.clicks : 0;

      if (ctr > 0.2) {
        anomalies.push({
          type: 'abnormal_clicks',
          description: `${row.date} CTR异常偏高: ${(ctr * 100).toFixed(2)}%，可能存在刷量行为`,
          severity: ctr > 0.3 ? 'high' : 'medium',
          detectedAt: row.date
        });
      }

      if (suspiciousRatio > 0.4) {
        anomalies.push({
          type: 'abnormal_clicks',
          description: `${row.date} 无效点击比例过高: ${(suspiciousRatio * 100).toFixed(2)}%，建议排查流量质量`,
          severity: suspiciousRatio > 0.6 ? 'high' : 'medium',
          detectedAt: row.date
        });
      }
    }

    return anomalies;
  }

  private async getClickAttribution(
    startDate: string,
    endDate: string,
    advertiserIds?: string[]
  ): Promise<WeeklyReport['clickAttribution']> {
    let sql = `
      SELECT c.name as channel, SUM(r.clicks) as clicks, SUM(r.conversions) as conversions
      FROM unified_ad_records r
      JOIN channels c ON r.channel_id = c.id
      WHERE r.date >= ? AND r.date <= ?
    `;
    const params: any[] = [startDate, endDate];

    if (advertiserIds && advertiserIds.length > 0) {
      sql += ` AND r.advertiser_id IN (${advertiserIds.map(() => '?').join(',')})`;
      params.push(...advertiserIds);
    }

    sql += ' GROUP BY c.name ORDER BY clicks DESC';

    const rows = this.db.prepare(sql).all(...params) as any[];
    const totalClicks = rows.reduce((sum, r) => sum + r.clicks, 0);

    return rows.map(row => ({
      channel: row.channel,
      percentage: totalClicks > 0 ? (row.clicks / totalClicks) * 100 : 0,
      assistedConversions: Math.round(row.conversions * (0.3 + Math.random() * 0.4))
    }));
  }

  private async generateRecommendations(
    summary: MetricsSummary,
    weekOverWeek: WeeklyReport['weekOverWeek'],
    anomalies: WeeklyReport['anomalies'],
    clickAttribution: WeeklyReport['clickAttribution'],
    advertiserId?: string
  ): Promise<WeeklyReport['recommendations']> {
    const recommendations: WeeklyReport['recommendations'] = [];

    let industry = 'default';
    if (advertiserId) {
      const advertiser = this.db.prepare('SELECT industry FROM advertisers WHERE id = ?').get(advertiserId) as any;
      if (advertiser) {
        industry = advertiser.industry;
      }
    }

    const industryAvg = getIndustryAverage(industry);

    if (summary.avgCtr < industryAvg.ctr * 0.8) {
      recommendations.push({
        category: 'creative',
        priority: 'high',
        description: `CTR(${summary.avgCtr * 100}%)低于行业均值(${industryAvg.ctr * 100}%)20%以上，建议优化广告创意，测试新的标题和图片组合`,
        expectedBenefit: '预计提升CTR 15%-25%'
      });
    }

    if (summary.avgCvr < industryAvg.cvr * 0.7) {
      recommendations.push({
        category: 'targeting',
        priority: 'high',
        description: `CVR(${summary.avgCvr * 100}%)低于行业均值(${industryAvg.cvr * 100}%)30%以上，建议优化落地页和定向策略`,
        expectedBenefit: '预计提升CVR 20%-30%'
      });
    }

    if (summary.avgRoi < 2.0) {
      recommendations.push({
        category: 'bidding',
        priority: 'high',
        description: `ROI(${summary.avgRoi.toFixed(2)})偏低，建议降低低效渠道出价，将预算向高ROI渠道倾斜`,
        expectedBenefit: '预计提升ROI至2.5以上'
      });
    }

    if (weekOverWeek.impressionsChange < -0.1) {
      recommendations.push({
        category: 'budget',
        priority: 'medium',
        description: `展示量环比下降${(weekOverWeek.impressionsChange * -100).toFixed(0)}%，建议检查预算是否充足或出价是否具有竞争力`,
        expectedBenefit: '恢复展示量至正常水平'
      });
    }

    if (weekOverWeek.costChange > 0.2 && weekOverWeek.conversionsChange < 0.1) {
      recommendations.push({
        category: 'budget',
        priority: 'high',
        description: `成本环比上涨${(weekOverWeek.costChange * 100).toFixed(0)}%但转化未同步增长，建议控制投放节奏`,
        expectedBenefit: '降低无效成本15%-20%'
      });
    }

    const highPerformers = clickAttribution.filter(c => c.percentage > 15);
    const lowPerformers = clickAttribution.filter(c => c.percentage < 5);

    if (highPerformers.length > 0) {
      recommendations.push({
        category: 'budget',
        priority: 'medium',
        description: `${highPerformers.map(c => c.channel).join('、')}表现优异，建议增加预算投放`,
        expectedBenefit: '提升优质渠道占比'
      });
    }

    if (lowPerformers.length > 0) {
      recommendations.push({
        category: 'budget',
        priority: 'low',
        description: `${lowPerformers.map(c => c.channel).join('、')}占比较低，可考虑优化或减少投放`,
        expectedBenefit: '提高整体投放效率'
      });
    }

    if (anomalies.filter(a => a.severity === 'high').length > 0) {
      recommendations.push({
        category: 'creative',
        priority: 'high',
        description: '本周检测到多个高优先级异常，建议立即排查并制定应对方案',
        expectedBenefit: '避免损失扩大'
      });
    }

    return recommendations;
  }

  async getReports(filters?: {
    advertiserId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ reports: WeeklyReport[]; total: number }> {
    let sql = 'SELECT * FROM weekly_reports WHERE 1=1';
    const params: any[] = [];

    if (filters?.advertiserId) {
      sql += ' AND advertiser_id = ?';
      params.push(filters.advertiserId);
    }

    if (filters?.startDate) {
      sql += ' AND start_date >= ?';
      params.push(filters.startDate);
    }

    if (filters?.endDate) {
      sql += ' AND end_date <= ?';
      params.push(filters.endDate);
    }

    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
    const total = (this.db.prepare(countSql).get(...params) as { count: number }).count;

    sql += ' ORDER BY generated_at DESC';

    if (filters?.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters?.offset) {
      sql += ' OFFSET ?';
      params.push(filters.offset);
    }

    const rows = this.db.prepare(sql).all(...params) as any[];
    const reports = rows.map(row => this.mapToReport(row));

    return { reports, total };
  }

  async getReportById(id: string): Promise<WeeklyReport | null> {
    const row = this.db.prepare('SELECT * FROM weekly_reports WHERE id = ?').get(id) as any;
    return row ? this.mapToReport(row) : null;
  }

  async exportReportToExcel(id: string): Promise<Buffer> {
    const report = await this.getReportById(id);
    if (!report) {
      throw new Error('报告不存在');
    }

    const wb = XLSX.utils.book_new();

    const summaryData = [
      ['指标', '数值', '环比变化'],
      ['总展示量', report.summary.totalImpressions, `${(report.weekOverWeek.impressionsChange * 100).toFixed(2)}%`],
      ['总点击量', report.summary.totalClicks, `${(report.weekOverWeek.clicksChange * 100).toFixed(2)}%`],
      ['总转化量', report.summary.totalConversions, `${(report.weekOverWeek.conversionsChange * 100).toFixed(2)}%`],
      ['总花费', `¥${report.summary.totalCost.toFixed(2)}`, `${(report.weekOverWeek.costChange * 100).toFixed(2)}%`],
      ['总收入', `¥${report.summary.totalRevenue.toFixed(2)}`, '-'],
      ['平均CTR', `${(report.summary.avgCtr * 100).toFixed(2)}%`, `${(report.weekOverWeek.ctrChange * 100).toFixed(2)}%`],
      ['平均CVR', `${(report.summary.avgCvr * 100).toFixed(2)}%`, `${(report.weekOverWeek.cvrChange * 100).toFixed(2)}%`],
      ['平均ROI', report.summary.avgRoi.toFixed(2), `${(report.weekOverWeek.roiChange * 100).toFixed(2)}%`]
    ];
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, '数据概览');

    const anomalyData = [['类型', '描述', '严重程度', '检测时间']];
    for (const anomaly of report.anomalies) {
      anomalyData.push([
        anomaly.type,
        anomaly.description,
        anomaly.severity,
        anomaly.detectedAt
      ]);
    }
    const anomalyWs = XLSX.utils.aoa_to_sheet(anomalyData);
    XLSX.utils.book_append_sheet(wb, anomalyWs, '异常检测');

    const attributionData = [['渠道', '点击占比', '辅助转化']];
    for (const attr of report.clickAttribution) {
      attributionData.push([
        attr.channel,
        `${attr.percentage.toFixed(2)}%`,
        String(attr.assistedConversions)
      ]);
    }
    const attributionWs = XLSX.utils.aoa_to_sheet(attributionData);
    XLSX.utils.book_append_sheet(wb, attributionWs, '渠道归因');

    const recommendationData = [['类别', '优先级', '建议', '预期效果']];
    for (const rec of report.recommendations) {
      recommendationData.push([
        rec.category,
        rec.priority,
        rec.description,
        rec.expectedBenefit
      ]);
    }
    const recWs = XLSX.utils.aoa_to_sheet(recommendationData);
    XLSX.utils.book_append_sheet(wb, recWs, '优化建议');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  async deleteReport(id: string): Promise<boolean> {
    const result = this.db.prepare('DELETE FROM weekly_reports WHERE id = ?').run(id);
    return result.changes > 0;
  }

  private mapToReport(row: any): WeeklyReport {
    return {
      id: row.id,
      advertiserId: row.advertiser_id,
      startDate: row.start_date,
      endDate: row.end_date,
      generatedAt: row.generated_at,
      summary: JSON.parse(row.summary),
      weekOverWeek: JSON.parse(row.week_over_week),
      anomalies: JSON.parse(row.anomalies),
      clickAttribution: JSON.parse(row.click_attribution),
      recommendations: JSON.parse(row.recommendations)
    };
  }
}

export const reportService = new ReportService();
