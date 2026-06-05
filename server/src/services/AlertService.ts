import { getDb } from '../models/database';
import { v4 as uuidv4 } from 'uuid';
import { Alert, AlertLevel, AlertStatus, UnifiedAdRecord } from '@shared/types';
import { getIndustryAverage, checkCvrAlert, checkRoiAlert } from '@shared/utils';

export class AlertService {
  private get db() { return getDb(); }

  async checkAlerts(): Promise<Alert[]> {
    const now = new Date();
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);

    const triggeredAlerts: Alert[] = [];

    const schedules = this.db.prepare(`
      SELECT s.id, s.advertiser_id, s.channel_id, s.position_id, a.industry
      FROM ad_schedules s
      JOIN advertisers a ON s.advertiser_id = a.id
      WHERE s.status = ?
    `).all('active') as any[];

    for (const schedule of schedules) {
      const cvrAlert = await this.checkCvrAlertForSchedule(schedule, threeHoursAgo, sixHoursAgo);
      if (cvrAlert) {
        triggeredAlerts.push(cvrAlert);
      }

      const roiAlert = await this.checkRoiAlertForSchedule(schedule, threeHoursAgo, sixHoursAgo);
      if (roiAlert) {
        triggeredAlerts.push(roiAlert);
      }
    }

    return triggeredAlerts;
  }

  private async checkCvrAlertForSchedule(
    schedule: any,
    threeHoursAgo: Date,
    sixHoursAgo: Date
  ): Promise<Alert | null> {
    const industryAvg = getIndustryAverage(schedule.industry);
    const threshold = industryAvg.cvr * 0.7;

    const recentData = this.db.prepare(`
      SELECT date, hour, AVG(cvr) as avg_cvr
      FROM unified_ad_records
      WHERE schedule_id = ? AND date >= ? AND date <= ?
      GROUP BY date, hour
      ORDER BY date DESC, hour DESC
      LIMIT 6
    `).all(
      schedule.id,
      sixHoursAgo.toISOString().split('T')[0],
      new Date().toISOString().split('T')[0]
    ) as any[];

    if (recentData.length < 3) return null;

    const last3Hours = recentData.slice(0, 3);
    const avgCvr3h = last3Hours.reduce((sum, d) => sum + d.avg_cvr, 0) / last3Hours.length;

    const cvrCheck = checkCvrAlert(avgCvr3h, industryAvg.cvr);
    if (!cvrCheck.shouldAlert) {
      await this.resolveExistingAlert(schedule.id, 'cvr_low');
      return null;
    }

    const existingAlert = this.db.prepare(`
      SELECT * FROM alerts 
      WHERE schedule_id = ? AND type = ? AND status IN (?, ?, ?)
    `).get(
      schedule.id,
      'cvr_low',
      AlertStatus.PENDING,
      AlertStatus.ACKNOWLEDGED,
      AlertStatus.PROCESSING
    ) as any;

    let level = AlertLevel.LEVEL_1;
    let startTime = new Date().toISOString();

    if (existingAlert) {
      const alertStart = new Date(existingAlert.start_time);
      if (alertStart <= sixHoursAgo) {
        const last6Hours = recentData.slice(0, 6);
        const avgCvr6h = last6Hours.reduce((sum, d) => sum + d.avg_cvr, 0) / last6Hours.length;
        
        if (avgCvr6h < threshold) {
          level = AlertLevel.LEVEL_2;
          
          if (existingAlert.level !== AlertLevel.LEVEL_2) {
            this.db.prepare(`
              UPDATE alerts SET level = ?, message = ? WHERE id = ?
            `).run(
              AlertLevel.LEVEL_2,
              `转化率连续6小时低于行业均值70%，已升级为二级预警。当前CVR: ${(avgCvr6h * 100).toFixed(2)}%，阈值: ${(threshold * 100).toFixed(2)}%`,
              existingAlert.id
            );
          }
          return this.mapToAlert(existingAlert);
        }
      }
      return this.mapToAlert(existingAlert);
    }

    const alertId = uuidv4();
    const alert: Alert = {
      id: alertId,
      scheduleId: schedule.id,
      positionId: schedule.position_id,
      channelId: schedule.channel_id,
      advertiserId: schedule.advertiser_id,
      level: AlertLevel.LEVEL_1,
      type: 'cvr_low',
      metricName: 'CVR',
      currentValue: avgCvr3h,
      threshold,
      startTime,
      status: AlertStatus.PENDING,
      message: `转化率连续3小时低于行业均值70%，触发一级预警。当前CVR: ${(avgCvr3h * 100).toFixed(2)}%，阈值: ${(threshold * 100).toFixed(2)}%`
    };

    this.db.prepare(`
      INSERT INTO alerts 
      (id, schedule_id, position_id, channel_id, advertiser_id, level, type, metric_name, 
       current_value, threshold, start_time, status, message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      alert.id,
      alert.scheduleId,
      alert.positionId,
      alert.channelId,
      alert.advertiserId,
      alert.level,
      alert.type,
      alert.metricName,
      alert.currentValue,
      alert.threshold,
      alert.startTime,
      alert.status,
      alert.message
    );

    return alert;
  }

  private async checkRoiAlertForSchedule(
    schedule: any,
    threeHoursAgo: Date,
    sixHoursAgo: Date
  ): Promise<Alert | null> {
    const roiCheck = checkRoiAlert(0);
    const threshold = roiCheck.threshold;

    const recentData = this.db.prepare(`
      SELECT date, hour, AVG(roi) as avg_roi
      FROM unified_ad_records
      WHERE schedule_id = ? AND date >= ? AND date <= ?
      GROUP BY date, hour
      ORDER BY date DESC, hour DESC
      LIMIT 6
    `).all(
      schedule.id,
      sixHoursAgo.toISOString().split('T')[0],
      new Date().toISOString().split('T')[0]
    ) as any[];

    if (recentData.length < 3) return null;

    const last3Hours = recentData.slice(0, 3);
    const avgRoi3h = last3Hours.reduce((sum, d) => sum + d.avg_roi, 0) / last3Hours.length;

    if (avgRoi3h >= threshold) {
      await this.resolveExistingAlert(schedule.id, 'roi_low');
      return null;
    }

    const existingAlert = this.db.prepare(`
      SELECT * FROM alerts 
      WHERE schedule_id = ? AND type = ? AND status IN (?, ?, ?)
    `).get(
      schedule.id,
      'roi_low',
      AlertStatus.PENDING,
      AlertStatus.ACKNOWLEDGED,
      AlertStatus.PROCESSING
    ) as any;

    let level = AlertLevel.LEVEL_1;
    let startTime = new Date().toISOString();

    if (existingAlert) {
      const alertStart = new Date(existingAlert.start_time);
      if (alertStart <= sixHoursAgo) {
        const last6Hours = recentData.slice(0, 6);
        const avgRoi6h = last6Hours.reduce((sum, d) => sum + d.avg_roi, 0) / last6Hours.length;
        
        if (avgRoi6h < threshold) {
          level = AlertLevel.LEVEL_2;
          
          if (existingAlert.level !== AlertLevel.LEVEL_2) {
            this.db.prepare(`
              UPDATE alerts SET level = ?, message = ? WHERE id = ?
            `).run(
              AlertLevel.LEVEL_2,
              `ROI连续6小时低于1.5，已升级为二级预警。当前ROI: ${avgRoi6h.toFixed(2)}，阈值: ${threshold}`,
              existingAlert.id
            );
          }
          return this.mapToAlert(existingAlert);
        }
      }
      return this.mapToAlert(existingAlert);
    }

    const alertId = uuidv4();
    const alert: Alert = {
      id: alertId,
      scheduleId: schedule.id,
      positionId: schedule.position_id,
      channelId: schedule.channel_id,
      advertiserId: schedule.advertiser_id,
      level: AlertLevel.LEVEL_1,
      type: 'roi_low',
      metricName: 'ROI',
      currentValue: avgRoi3h,
      threshold,
      startTime,
      status: AlertStatus.PENDING,
      message: `ROI连续3小时低于1.5，触发一级预警。当前ROI: ${avgRoi3h.toFixed(2)}，阈值: ${threshold}`
    };

    this.db.prepare(`
      INSERT INTO alerts 
      (id, schedule_id, position_id, channel_id, advertiser_id, level, type, metric_name, 
       current_value, threshold, start_time, status, message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      alert.id,
      alert.scheduleId,
      alert.positionId,
      alert.channelId,
      alert.advertiserId,
      alert.level,
      alert.type,
      alert.metricName,
      alert.currentValue,
      alert.threshold,
      alert.startTime,
      alert.status,
      alert.message
    );

    return alert;
  }

  private async resolveExistingAlert(scheduleId: string, type: string): Promise<void> {
    this.db.prepare(`
      UPDATE alerts 
      SET status = ?, end_time = ? 
      WHERE schedule_id = ? AND type = ? AND status IN (?, ?, ?)
    `).run(
      AlertStatus.RESOLVED,
      new Date().toISOString(),
      scheduleId,
      type,
      AlertStatus.PENDING,
      AlertStatus.ACKNOWLEDGED,
      AlertStatus.PROCESSING
    );
  }

  async getAlerts(filters?: {
    status?: AlertStatus;
    level?: AlertLevel;
    advertiserId?: string;
    channelId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ alerts: Alert[]; total: number }> {
    let sql = 'SELECT * FROM alerts WHERE 1=1';
    const params: any[] = [];

    if (filters?.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters?.level) {
      sql += ' AND level = ?';
      params.push(filters.level);
    }

    if (filters?.advertiserId) {
      sql += ' AND advertiser_id = ?';
      params.push(filters.advertiserId);
    }

    if (filters?.channelId) {
      sql += ' AND channel_id = ?';
      params.push(filters.channelId);
    }

    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
    const total = (this.db.prepare(countSql).get(...params) as { count: number }).count;

    sql += ' ORDER BY created_at DESC';

    if (filters?.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters?.offset) {
      sql += ' OFFSET ?';
      params.push(filters.offset);
    }

    const rows = this.db.prepare(sql).all(...params) as any[];
    const alerts = rows.map(row => this.mapToAlert(row));

    return { alerts, total };
  }

  async getAlertById(id: string): Promise<Alert | null> {
    const row = this.db.prepare('SELECT * FROM alerts WHERE id = ?').get(id) as any;
    return row ? this.mapToAlert(row) : null;
  }

  async acknowledgeAlert(id: string, assignee?: string): Promise<Alert | null> {
    const alert = await this.getAlertById(id);
    if (!alert) return null;

    this.db.prepare(`
      UPDATE alerts SET status = ?, assignee = ? WHERE id = ?
    `).run(AlertStatus.ACKNOWLEDGED, assignee || null, id);

    return this.getAlertById(id);
  }

  async processAlert(id: string): Promise<Alert | null> {
    const alert = await this.getAlertById(id);
    if (!alert) return null;

    this.db.prepare(`
      UPDATE alerts SET status = ? WHERE id = ?
    `).run(AlertStatus.PROCESSING, id);

    return this.getAlertById(id);
  }

  async resolveAlert(id: string): Promise<Alert | null> {
    const alert = await this.getAlertById(id);
    if (!alert) return null;

    this.db.prepare(`
      UPDATE alerts SET status = ?, end_time = ? WHERE id = ?
    `).run(AlertStatus.RESOLVED, new Date().toISOString(), id);

    return this.getAlertById(id);
  }

  async escalateAlert(id: string): Promise<Alert | null> {
    const alert = await this.getAlertById(id);
    if (!alert) return null;

    const newLevel = alert.level === AlertLevel.LEVEL_1 ? AlertLevel.LEVEL_2 : alert.level;

    this.db.prepare(`
      UPDATE alerts SET status = ?, level = ? WHERE id = ?
    `).run(AlertStatus.ESCALATED, newLevel, id);

    return this.getAlertById(id);
  }

  async updateAlert(id: string, updates: Partial<Alert>): Promise<Alert | null> {
    const alert = await this.getAlertById(id);
    if (!alert) return null;

    const fields: string[] = [];
    const params: any[] = [];

    if (updates.status !== undefined) {
      fields.push('status = ?');
      params.push(updates.status);
    }
    if (updates.assignee !== undefined) {
      fields.push('assignee = ?');
      params.push(updates.assignee);
    }
    if (updates.message !== undefined) {
      fields.push('message = ?');
      params.push(updates.message);
    }

    if (fields.length === 0) return alert;

    params.push(id);
    this.db.prepare(`UPDATE alerts SET ${fields.join(', ')} WHERE id = ?`).run(...params);

    return this.getAlertById(id);
  }

  async deleteAlert(id: string): Promise<boolean> {
    const result = this.db.prepare('DELETE FROM alerts WHERE id = ?').run(id);
    return result.changes > 0;
  }

  async getAlertStats(advertiserIds?: string[]): Promise<{
    total: number;
    pending: number;
    acknowledged: number;
    processing: number;
    resolved: number;
    level1: number;
    level2: number;
  }> {
    let sql = 'SELECT status, level, COUNT(*) as count FROM alerts WHERE 1=1';
    const params: any[] = [];

    if (advertiserIds && advertiserIds.length > 0) {
      sql += ` AND advertiser_id IN (${advertiserIds.map(() => '?').join(',')})`;
      params.push(...advertiserIds);
    }

    sql += ' GROUP BY status, level';

    const rows = this.db.prepare(sql).all(...params) as any[];

    const stats = {
      total: 0,
      pending: 0,
      acknowledged: 0,
      processing: 0,
      resolved: 0,
      level1: 0,
      level2: 0
    };

    for (const row of rows) {
      stats.total += row.count;
      
      switch (row.status) {
        case AlertStatus.PENDING:
          stats.pending += row.count;
          break;
        case AlertStatus.ACKNOWLEDGED:
          stats.acknowledged += row.count;
          break;
        case AlertStatus.PROCESSING:
          stats.processing += row.count;
          break;
        case AlertStatus.RESOLVED:
          stats.resolved += row.count;
          break;
      }

      switch (row.level) {
        case AlertLevel.LEVEL_1:
          stats.level1 += row.count;
          break;
        case AlertLevel.LEVEL_2:
          stats.level2 += row.count;
          break;
      }
    }

    return stats;
  }

  private mapToAlert(row: any): Alert {
    return {
      id: row.id,
      scheduleId: row.schedule_id,
      positionId: row.position_id,
      channelId: row.channel_id,
      advertiserId: row.advertiser_id,
      level: row.level as AlertLevel,
      type: row.type as 'cvr_low' | 'roi_low',
      metricName: row.metric_name,
      currentValue: row.current_value,
      threshold: row.threshold,
      startTime: row.start_time,
      endTime: row.end_time,
      status: row.status as AlertStatus,
      message: row.message,
      assignee: row.assignee
    };
  }
}

export const alertService = new AlertService();
