import { getDb } from '../models/database';
import { v4 as uuidv4 } from 'uuid';
import { ApprovalRequest, ApprovalStatus, ApprovalAction, UserRole, Alert } from '@shared/types';

export class ApprovalService {
  private get db() { return getDb(); }

  async createApprovalRequest(
    data: Omit<ApprovalRequest, 'id' | 'status' | 'createdAt'>,
    optimizerId: string
  ): Promise<ApprovalRequest> {
    const id = uuidv4();
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO approval_requests 
      (id, alert_id, schedule_id, action, action_details, reason, status, 
       optimizer_id, optimizer_time, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.alertId || null,
      data.scheduleId,
      data.action,
      data.actionDetails ? JSON.stringify(data.actionDetails) : null,
      data.reason,
      ApprovalStatus.PENDING,
      optimizerId,
      now,
      now
    );

    return this.getApprovalById(id) as Promise<ApprovalRequest>;
  }

  async getApprovals(filters?: {
    status?: ApprovalStatus;
    scheduleId?: string;
    alertId?: string;
    advertiserId?: string;
    userId?: string;
    userRole?: UserRole;
    limit?: number;
    offset?: number;
  }): Promise<{ approvals: ApprovalRequest[]; total: number }> {
    let sql = `
      SELECT ar.*, a.advertiser_id
      FROM approval_requests ar
      JOIN ad_schedules s ON ar.schedule_id = s.id
      JOIN advertisers a ON s.advertiser_id = a.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.status) {
      sql += ' AND ar.status = ?';
      params.push(filters.status);
    }

    if (filters?.scheduleId) {
      sql += ' AND ar.schedule_id = ?';
      params.push(filters.scheduleId);
    }

    if (filters?.alertId) {
      sql += ' AND ar.alert_id = ?';
      params.push(filters.alertId);
    }

    if (filters?.advertiserId) {
      sql += ' AND a.id = ?';
      params.push(filters.advertiserId);
    }

    if (filters?.userId && filters?.userRole) {
      switch (filters.userRole) {
        case UserRole.OPTIMIZER:
          sql += ' AND ar.optimizer_id = ?';
          params.push(filters.userId);
          break;
        case UserRole.MEDIA_SUPERVISOR:
          sql += ' AND ar.supervisor_id = ?';
          params.push(filters.userId);
          break;
        case UserRole.STRATEGY_DIRECTOR:
          sql += ' AND ar.director_id = ?';
          params.push(filters.userId);
          break;
      }
    }

    const countSql = sql.replace('SELECT ar.*, a.advertiser_id', 'SELECT COUNT(*) as count');
    const total = (this.db.prepare(countSql).get(...params) as { count: number }).count;

    sql += ' ORDER BY ar.created_at DESC';

    if (filters?.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters?.offset) {
      sql += ' OFFSET ?';
      params.push(filters.offset);
    }

    const rows = this.db.prepare(sql).all(...params) as any[];
    const approvals = rows.map(row => this.mapToApproval(row));

    return { approvals, total };
  }

  async getApprovalById(id: string): Promise<ApprovalRequest | null> {
    const row = this.db.prepare(`
      SELECT ar.*, a.advertiser_id
      FROM approval_requests ar
      JOIN ad_schedules s ON ar.schedule_id = s.id
      JOIN advertisers a ON s.advertiser_id = a.id
      WHERE ar.id = ?
    `).get(id) as any;

    return row ? this.mapToApproval(row) : null;
  }

  async approveByOptimizer(
    id: string,
    optimizerId: string,
    comment?: string
  ): Promise<ApprovalRequest | null> {
    const approval = await this.getApprovalById(id);
    if (!approval || approval.status !== ApprovalStatus.PENDING) {
      return null;
    }

    const now = new Date().toISOString();

    this.db.prepare(`
      UPDATE approval_requests 
      SET status = ?, optimizer_id = ?, optimizer_comment = ?, optimizer_time = ?
      WHERE id = ?
    `).run(
      ApprovalStatus.OPTIMIZER_APPROVED,
      optimizerId,
      comment || null,
      now,
      id
    );

    return this.getApprovalById(id);
  }

  async approveBySupervisor(
    id: string,
    supervisorId: string,
    comment?: string
  ): Promise<ApprovalRequest | null> {
    const approval = await this.getApprovalById(id);
    if (!approval || approval.status !== ApprovalStatus.OPTIMIZER_APPROVED) {
      return null;
    }

    const now = new Date().toISOString();

    this.db.prepare(`
      UPDATE approval_requests 
      SET status = ?, supervisor_id = ?, supervisor_comment = ?, supervisor_time = ?
      WHERE id = ?
    `).run(
      ApprovalStatus.SUPERVISOR_APPROVED,
      supervisorId,
      comment || null,
      now,
      id
    );

    return this.getApprovalById(id);
  }

  async approveByDirector(
    id: string,
    directorId: string,
    comment?: string
  ): Promise<ApprovalRequest | null> {
    const approval = await this.getApprovalById(id);
    if (!approval || approval.status !== ApprovalStatus.SUPERVISOR_APPROVED) {
      return null;
    }

    const now = new Date().toISOString();

    this.db.prepare(`
      UPDATE approval_requests 
      SET status = ?, director_id = ?, director_comment = ?, director_time = ?, completed_at = ?
      WHERE id = ?
    `).run(
      ApprovalStatus.DIRECTOR_APPROVED,
      directorId,
      comment || null,
      now,
      now,
      id
    );

    await this.executeApprovalAction(id);

    return this.getApprovalById(id);
  }

  async rejectApproval(
    id: string,
    userId: string,
    userRole: UserRole,
    comment: string
  ): Promise<ApprovalRequest | null> {
    const approval = await this.getApprovalById(id);
    if (!approval) return null;

    const now = new Date().toISOString();
    let sql = 'UPDATE approval_requests SET status = ?, completed_at = ?';
    const params: any[] = [ApprovalStatus.REJECTED, now];

    switch (userRole) {
      case UserRole.OPTIMIZER:
        sql += ', optimizer_id = ?, optimizer_comment = ?, optimizer_time = ?';
        params.push(userId, comment, now);
        break;
      case UserRole.MEDIA_SUPERVISOR:
        sql += ', supervisor_id = ?, supervisor_comment = ?, supervisor_time = ?';
        params.push(userId, comment, now);
        break;
      case UserRole.STRATEGY_DIRECTOR:
        sql += ', director_id = ?, director_comment = ?, director_time = ?';
        params.push(userId, comment, now);
        break;
      default:
        return null;
    }

    sql += ' WHERE id = ?';
    params.push(id);

    this.db.prepare(sql).run(...params);

    return this.getApprovalById(id);
  }

  private async executeApprovalAction(approvalId: string): Promise<void> {
    const approval = await this.getApprovalById(approvalId);
    if (!approval) return;

    const { scheduleId, action, actionDetails } = approval;

    switch (action) {
      case ApprovalAction.PAUSE:
        this.db.prepare(`
          UPDATE ad_schedules SET status = ? WHERE id = ?
        `).run('paused', scheduleId);
        break;

      case ApprovalAction.ADJUST_BID:
        if (actionDetails?.newBidPrice) {
          this.db.prepare(`
            UPDATE ad_schedules SET bid_price = ? WHERE id = ?
          `).run(actionDetails.newBidPrice, scheduleId);
        }
        break;

      case ApprovalAction.REPLACE_CREATIVE:
        if (actionDetails?.newCreativeId) {
          this.db.prepare(`
            UPDATE ad_schedules SET creative_id = ? WHERE id = ?
          `).run(actionDetails.newCreativeId, scheduleId);
        }
        break;

      case ApprovalAction.CHANGE_BUDGET:
        if (actionDetails?.newBudget || actionDetails?.newDailyBudget) {
          const updates: string[] = [];
          const params: any[] = [];

          if (actionDetails.newBudget) {
            updates.push('budget = ?');
            params.push(actionDetails.newBudget);
          }
          if (actionDetails.newDailyBudget) {
            updates.push('daily_budget = ?');
            params.push(actionDetails.newDailyBudget);
          }

          params.push(scheduleId);
          this.db.prepare(`
            UPDATE ad_schedules SET ${updates.join(', ')} WHERE id = ?
          `).run(...params);
        }
        break;
    }
  }

  async getPendingApprovalsForRole(userRole: UserRole): Promise<ApprovalRequest[]> {
    let status: ApprovalStatus;

    switch (userRole) {
      case UserRole.OPTIMIZER:
        status = ApprovalStatus.PENDING;
        break;
      case UserRole.MEDIA_SUPERVISOR:
        status = ApprovalStatus.OPTIMIZER_APPROVED;
        break;
      case UserRole.STRATEGY_DIRECTOR:
        status = ApprovalStatus.SUPERVISOR_APPROVED;
        break;
      default:
        return [];
    }

    const result = await this.getApprovals({ status });
    return result.approvals;
  }

  async getApprovalStats(advertiserIds?: string[]): Promise<{
    total: number;
    pending: number;
    optimizerApproved: number;
    supervisorApproved: number;
    directorApproved: number;
    rejected: number;
    completed: number;
  }> {
    let sql = 'SELECT status, COUNT(*) as count FROM approval_requests ar';
    const params: any[] = [];

    if (advertiserIds && advertiserIds.length > 0) {
      sql += `
        JOIN ad_schedules s ON ar.schedule_id = s.id
        WHERE s.advertiser_id IN (${advertiserIds.map(() => '?').join(',')})
      `;
      params.push(...advertiserIds);
    }

    sql += ' GROUP BY status';

    const rows = this.db.prepare(sql).all(...params) as any[];

    const stats = {
      total: 0,
      pending: 0,
      optimizerApproved: 0,
      supervisorApproved: 0,
      directorApproved: 0,
      rejected: 0,
      completed: 0
    };

    for (const row of rows) {
      stats.total += row.count;
      
      switch (row.status) {
        case ApprovalStatus.PENDING:
          stats.pending += row.count;
          break;
        case ApprovalStatus.OPTIMIZER_APPROVED:
          stats.optimizerApproved += row.count;
          break;
        case ApprovalStatus.SUPERVISOR_APPROVED:
          stats.supervisorApproved += row.count;
          break;
        case ApprovalStatus.DIRECTOR_APPROVED:
          stats.directorApproved += row.count;
          stats.completed += row.count;
          break;
        case ApprovalStatus.REJECTED:
          stats.rejected += row.count;
          stats.completed += row.count;
          break;
      }
    }

    return stats;
  }

  async canApprove(userRole: UserRole, approvalStatus: ApprovalStatus): Promise<boolean> {
    switch (userRole) {
      case UserRole.OPTIMIZER:
        return approvalStatus === ApprovalStatus.PENDING;
      case UserRole.MEDIA_SUPERVISOR:
        return approvalStatus === ApprovalStatus.OPTIMIZER_APPROVED;
      case UserRole.STRATEGY_DIRECTOR:
        return approvalStatus === ApprovalStatus.SUPERVISOR_APPROVED;
      default:
        return false;
    }
  }

  private mapToApproval(row: any): ApprovalRequest {
    return {
      id: row.id,
      alertId: row.alert_id,
      scheduleId: row.schedule_id,
      action: row.action as ApprovalAction,
      actionDetails: row.action_details ? JSON.parse(row.action_details) : {},
      reason: row.reason,
      status: row.status as ApprovalStatus,
      optimizerId: row.optimizer_id,
      optimizerComment: row.optimizer_comment,
      optimizerTime: row.optimizer_time,
      supervisorId: row.supervisor_id,
      supervisorComment: row.supervisor_comment,
      supervisorTime: row.supervisor_time,
      directorId: row.director_id,
      directorComment: row.director_comment,
      directorTime: row.director_time,
      createdAt: row.created_at,
      completedAt: row.completed_at
    };
  }
}

export const approvalService = new ApprovalService();
