import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getDb } from '../models/database';
import { authenticateToken, requireRole } from '../middleware/auth';
import { getAccessibleAdvertiserIds } from '../middleware/permission';
import { UserRole, Advertiser } from '@shared/types';

const router = Router();

const advertiserSchema = z.object({
  name: z.string().min(1, '广告主名称不能为空'),
  industry: z.string().min(1, '行业不能为空'),
  contact: z.string().min(1, '联系人不能为空'),
  phone: z.string().min(1, '联系电话不能为空')
});

const mapAdvertiser = (row: any): Advertiser => ({
  id: row.id,
  name: row.name,
  industry: row.industry,
  contact: row.contact,
  phone: row.phone,
  createdAt: row.created_at
});

router.get('/', authenticateToken, (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { industry, keyword } = req.query;

    const accessibleIds = getAccessibleAdvertiserIds(req.user!);

    let sql = 'SELECT * FROM advertisers WHERE 1=1';
    const params: any[] = [];

    if (accessibleIds && accessibleIds.length > 0) {
      const placeholders = accessibleIds.map(() => '?').join(',');
      sql += ` AND id IN (${placeholders})`;
      params.push(...accessibleIds);
    }

    if (industry) {
      sql += ' AND industry = ?';
      params.push(industry);
    }

    if (keyword) {
      sql += ' AND (name LIKE ? OR contact LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    sql += ' ORDER BY created_at DESC';

    const rows = db.prepare(sql).all(...params) as any[];
    const advertisers = rows.map(mapAdvertiser);

    res.json({
      success: true,
      data: advertisers
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/stats', authenticateToken, (req: Request, res: Response) => {
  try {
    const db = getDb();
    const accessibleIds = getAccessibleAdvertiserIds(req.user!);

    let sql = `
      SELECT 
        a.id,
        a.name,
        a.industry,
        COUNT(DISTINCT s.id) as schedule_count,
        SUM(ur.impressions) as total_impressions,
        SUM(ur.clicks) as total_clicks,
        SUM(ur.conversions) as total_conversions,
        SUM(ur.cost) as total_cost,
        SUM(ur.revenue) as total_revenue,
        AVG(ur.roi) as avg_roi
      FROM advertisers a
      LEFT JOIN ad_schedules s ON a.id = s.advertiser_id
      LEFT JOIN unified_records ur ON s.id = ur.schedule_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (accessibleIds && accessibleIds.length > 0) {
      const placeholders = accessibleIds.map(() => '?').join(',');
      sql += ` AND a.id IN (${placeholders})`;
      params.push(...accessibleIds);
    }

    sql += ' GROUP BY a.id ORDER BY total_cost DESC';

    const rows = db.prepare(sql).all(...params) as any[];

    const stats = rows.map(row => ({
      ...mapAdvertiser(row),
      scheduleCount: row.schedule_count || 0,
      totalImpressions: row.total_impressions || 0,
      totalClicks: row.total_clicks || 0,
      totalConversions: row.total_conversions || 0,
      totalCost: row.total_cost || 0,
      totalRevenue: row.total_revenue || 0,
      avgRoi: row.avg_roi || 0
    }));

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', authenticateToken, (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const accessibleIds = getAccessibleAdvertiserIds(req.user!);
    if (accessibleIds && !accessibleIds.includes(id)) {
      res.status(403).json({ success: false, message: '无权限访问该广告主数据' });
      return;
    }

    const advertiserRow = db.prepare('SELECT * FROM advertisers WHERE id = ?').get(id) as any;

    if (!advertiserRow) {
      res.status(404).json({ success: false, message: '广告主不存在' });
      return;
    }

    const creativeCount = db.prepare('SELECT COUNT(*) as count FROM ad_creatives WHERE advertiser_id = ?').get(id) as any;
    const scheduleCount = db.prepare('SELECT COUNT(*) as count FROM ad_schedules WHERE advertiser_id = ?').get(id) as any;

    res.json({
      success: true,
      data: {
        ...mapAdvertiser(advertiserRow),
        creativeCount: creativeCount.count,
        scheduleCount: scheduleCount.count
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', authenticateToken, requireRole(UserRole.ADMIN, UserRole.OPTIMIZER), (req: Request, res: Response) => {
  try {
    const db = getDb();
    const data = advertiserSchema.parse(req.body);

    const existingAdvertiser = db.prepare('SELECT id FROM advertisers WHERE name = ?').get(data.name) as any;

    if (existingAdvertiser) {
      res.status(400).json({ success: false, message: '广告主名称已存在' });
      return;
    }

    const id = `adv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO advertisers (id, name, industry, contact, phone, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, data.name, data.industry, data.contact, data.phone, createdAt);

    const advertiserRow = db.prepare('SELECT * FROM advertisers WHERE id = ?').get(id) as any;

    res.json({
      success: true,
      data: mapAdvertiser(advertiserRow),
      message: '广告主创建成功'
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: '参数验证失败',
        data: error.errors
      });
      return;
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id', authenticateToken, requireRole(UserRole.ADMIN, UserRole.OPTIMIZER), (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const data = advertiserSchema.partial().parse(req.body);

    const existingAdvertiser = db.prepare('SELECT * FROM advertisers WHERE id = ?').get(id) as any;

    if (!existingAdvertiser) {
      res.status(404).json({ success: false, message: '广告主不存在' });
      return;
    }

    if (data.name && data.name !== existingAdvertiser.name) {
      const nameExists = db.prepare('SELECT id FROM advertisers WHERE name = ? AND id != ?').get(data.name, id) as any;
      if (nameExists) {
        res.status(400).json({ success: false, message: '广告主名称已存在' });
        return;
      }
    }

    const updateFields: string[] = [];
    const updateParams: any[] = [];

    if (data.name !== undefined) {
      updateFields.push('name = ?');
      updateParams.push(data.name);
    }
    if (data.industry !== undefined) {
      updateFields.push('industry = ?');
      updateParams.push(data.industry);
    }
    if (data.contact !== undefined) {
      updateFields.push('contact = ?');
      updateParams.push(data.contact);
    }
    if (data.phone !== undefined) {
      updateFields.push('phone = ?');
      updateParams.push(data.phone);
    }

    updateParams.push(id);

    db.prepare(`UPDATE advertisers SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateParams);

    const updatedAdvertiser = db.prepare('SELECT * FROM advertisers WHERE id = ?').get(id) as any;

    res.json({
      success: true,
      data: mapAdvertiser(updatedAdvertiser),
      message: '广告主更新成功'
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: '参数验证失败',
        data: error.errors
      });
      return;
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', authenticateToken, requireRole(UserRole.ADMIN), (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const existingAdvertiser = db.prepare('SELECT * FROM advertisers WHERE id = ?').get(id) as any;

    if (!existingAdvertiser) {
      res.status(404).json({ success: false, message: '广告主不存在' });
      return;
    }

    const scheduleCount = db.prepare('SELECT COUNT(*) as count FROM ad_schedules WHERE advertiser_id = ?').get(id) as any;

    if (scheduleCount.count > 0) {
      res.status(400).json({ success: false, message: '该广告主下存在广告排期，无法删除' });
      return;
    }

    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM ad_creatives WHERE advertiser_id = ?').run(id);
      db.prepare('DELETE FROM advertisers WHERE id = ?').run(id);
    });

    transaction();

    res.json({
      success: true,
      message: '广告主删除成功'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id/creatives', authenticateToken, (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const accessibleIds = getAccessibleAdvertiserIds(req.user!);
    if (accessibleIds && !accessibleIds.includes(id)) {
      res.status(403).json({ success: false, message: '无权限访问该广告主数据' });
      return;
    }

    const advertiser = db.prepare('SELECT id FROM advertisers WHERE id = ?').get(id) as any;

    if (!advertiser) {
      res.status(404).json({ success: false, message: '广告主不存在' });
      return;
    }

    const rows = db.prepare('SELECT * FROM ad_creatives WHERE advertiser_id = ? ORDER BY created_at DESC').all(id) as any[];

    const creatives = rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      url: row.url,
      thumbnail: row.thumbnail || undefined,
      advertiserId: row.advertiser_id,
      createdAt: row.created_at,
      tags: row.tags ? JSON.parse(row.tags) : []
    }));

    res.json({
      success: true,
      data: creatives
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id/schedules', authenticateToken, (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { status } = req.query;

    const accessibleIds = getAccessibleAdvertiserIds(req.user!);
    if (accessibleIds && !accessibleIds.includes(id)) {
      res.status(403).json({ success: false, message: '无权限访问该广告主数据' });
      return;
    }

    const advertiser = db.prepare('SELECT id FROM advertisers WHERE id = ?').get(id) as any;

    if (!advertiser) {
      res.status(404).json({ success: false, message: '广告主不存在' });
      return;
    }

    let sql = 'SELECT * FROM ad_schedules WHERE advertiser_id = ?';
    const params: any[] = [id];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC';

    const rows = db.prepare(sql).all(...params) as any[];

    const schedules = rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      advertiserId: row.advertiser_id,
      channelId: row.channel_id,
      positionId: row.position_id,
      creativeId: row.creative_id,
      startDate: row.start_date,
      endDate: row.end_date,
      budget: row.budget,
      dailyBudget: row.daily_budget,
      bidPrice: row.bid_price,
      targetRegion: row.target_region ? JSON.parse(row.target_region) : [],
      targetAudience: row.target_audience ? JSON.parse(row.target_audience) : {},
      status: row.status,
      createdAt: row.created_at
    }));

    res.json({
      success: true,
      data: schedules
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
