import { Router, Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { authenticateToken, requireRole } from '../middleware/auth';
import { getAccessibleAdvertiserIds } from '../middleware/permission';
import { getDb } from '../models/database';
import { v4 as uuidv4 } from 'uuid';
import { dataIngestionService } from '../services/DataIngestionService';
import { forecastService } from '../services/ForecastService';
import { UserRole } from '@shared/types';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const createScheduleSchema = z.object({
  name: z.string().min(1, '排期名称不能为空'),
  advertiserId: z.string().min(1, '广告主ID不能为空'),
  channelId: z.string().min(1, '渠道ID不能为空'),
  positionId: z.string().min(1, '广告位ID不能为空'),
  creativeId: z.string().min(1, '创意ID不能为空'),
  startDate: z.string().min(1, '开始日期不能为空'),
  endDate: z.string().min(1, '结束日期不能为空'),
  budget: z.coerce.number().min(0, '预算不能为负数'),
  dailyBudget: z.coerce.number().min(0, '日预算不能为负数'),
  bidPrice: z.coerce.number().min(0, '出价不能为负数'),
  targetRegion: z.array(z.string()).optional(),
  targetAudience: z.object({
    ageRange: z.array(z.number()).optional(),
    gender: z.enum(['male', 'female', 'all']).optional(),
    interests: z.array(z.string()).optional()
  }).optional(),
  status: z.enum(['active', 'paused', 'pending']).optional()
});

const updateScheduleSchema = z.object({
  name: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.coerce.number().min(0).optional(),
  dailyBudget: z.coerce.number().min(0).optional(),
  bidPrice: z.coerce.number().min(0).optional(),
  targetRegion: z.array(z.string()).optional(),
  targetAudience: z.object({
    ageRange: z.array(z.number()).optional(),
    gender: z.enum(['male', 'female', 'all']).optional(),
    interests: z.array(z.string()).optional()
  }).optional(),
  status: z.enum(['active', 'paused', 'pending', 'completed']).optional()
});

router.post('/', authenticateToken, requireRole(UserRole.OPTIMIZER, UserRole.ADMIN), async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const data = createScheduleSchema.parse(req.body);
    const id = uuidv4();

    db.prepare(`
      INSERT INTO ad_schedules 
      (id, name, advertiser_id, channel_id, position_id, creative_id, start_date, end_date,
       budget, daily_budget, bid_price, target_region, target_audience, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.name,
      data.advertiserId,
      data.channelId,
      data.positionId,
      data.creativeId,
      data.startDate,
      data.endDate,
      data.budget,
      data.dailyBudget,
      data.bidPrice,
      data.targetRegion ? JSON.stringify(data.targetRegion) : null,
      data.targetAudience ? JSON.stringify(data.targetAudience) : null,
      data.status || 'pending'
    );

    const schedule = db.prepare('SELECT * FROM ad_schedules WHERE id = ?').get(id) as any;

    res.json({
      success: true,
      data: mapSchedule(schedule),
      message: '广告排期已创建'
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

const scheduleFilterSchema = z.object({
  advertiserId: z.string().optional(),
  channelId: z.string().optional(),
  status: z.enum(['active', 'paused', 'pending', 'completed']).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional()
});

router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const filters = scheduleFilterSchema.parse(req.query);
    const advertiserIds = getAccessibleAdvertiserIds(req.user!);

    let sql = 'SELECT * FROM ad_schedules WHERE 1=1';
    const params: any[] = [];

    if (advertiserIds && advertiserIds.length > 0) {
      sql += ` AND advertiser_id IN (${advertiserIds.map(() => '?').join(',')})`;
      params.push(...advertiserIds);
    }

    if (filters.advertiserId) {
      sql += ' AND advertiser_id = ?';
      params.push(filters.advertiserId);
    }

    if (filters.channelId) {
      sql += ' AND channel_id = ?';
      params.push(filters.channelId);
    }

    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }

    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
    const total = (db.prepare(countSql).get(...params) as { count: number }).count;

    sql += ' ORDER BY created_at DESC';

    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters.offset) {
      sql += ' OFFSET ?';
      params.push(filters.offset);
    }

    const schedules = db.prepare(sql).all(...params).map(mapSchedule);

    res.json({
      success: true,
      data: { schedules, total }
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

router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const schedule = db.prepare('SELECT * FROM ad_schedules WHERE id = ?').get(id) as any;

    if (!schedule) {
      res.status(404).json({ success: false, message: '排期不存在' });
      return;
    }

    res.json({
      success: true,
      data: mapSchedule(schedule)
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id', authenticateToken, requireRole(UserRole.OPTIMIZER, UserRole.ADMIN), async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const data = updateScheduleSchema.parse(req.body);

    const existing = db.prepare('SELECT * FROM ad_schedules WHERE id = ?').get(id) as any;
    if (!existing) {
      res.status(404).json({ success: false, message: '排期不存在' });
      return;
    }

    const fields: string[] = [];
    const params: any[] = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      params.push(data.name);
    }
    if (data.startDate !== undefined) {
      fields.push('start_date = ?');
      params.push(data.startDate);
    }
    if (data.endDate !== undefined) {
      fields.push('end_date = ?');
      params.push(data.endDate);
    }
    if (data.budget !== undefined) {
      fields.push('budget = ?');
      params.push(data.budget);
    }
    if (data.dailyBudget !== undefined) {
      fields.push('daily_budget = ?');
      params.push(data.dailyBudget);
    }
    if (data.bidPrice !== undefined) {
      fields.push('bid_price = ?');
      params.push(data.bidPrice);
    }
    if (data.targetRegion !== undefined) {
      fields.push('target_region = ?');
      params.push(JSON.stringify(data.targetRegion));
    }
    if (data.targetAudience !== undefined) {
      fields.push('target_audience = ?');
      params.push(JSON.stringify(data.targetAudience));
    }
    if (data.status !== undefined) {
      fields.push('status = ?');
      params.push(data.status);
    }

    if (fields.length > 0) {
      params.push(id);
      db.prepare(`UPDATE ad_schedules SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    }

    const schedule = db.prepare('SELECT * FROM ad_schedules WHERE id = ?').get(id) as any;

    res.json({
      success: true,
      data: mapSchedule(schedule),
      message: '排期已更新'
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

router.delete('/:id', authenticateToken, requireRole(UserRole.ADMIN), async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const result = db.prepare('DELETE FROM ad_schedules WHERE id = ?').run(id);

    if (result.changes === 0) {
      res.status(404).json({ success: false, message: '排期不存在' });
      return;
    }

    res.json({
      success: true,
      message: '排期已删除'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/upload-excel', authenticateToken, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: '请上传Excel文件' });
      return;
    }

    const result = await dataIngestionService.processExcelFile(req.file.buffer);

    res.json({
      success: result.success,
      data: result,
      message: result.success ? `成功导入 ${result.count} 条数据` : '导入失败'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/simulate-push', authenticateToken, requireRole(UserRole.OPTIMIZER, UserRole.ADMIN), async (req: Request, res: Response) => {
  try {
    const count = parseInt(req.body.count) || 1;
    const rawDataList = dataIngestionService.simulateChannelPush(count);
    const results = [];

    for (const rawData of rawDataList) {
      const record = await dataIngestionService.ingestRawData(rawData);
      results.push(record);
    }

    res.json({
      success: true,
      data: results,
      message: `成功模拟 ${count} 条渠道数据推送`
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id/forecast', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const horizonHours = parseInt(req.query.horizonHours as string) || 72;

    const forecast = await forecastService.generateForecast(id, horizonHours);

    res.json({
      success: true,
      data: forecast
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id/forecast/history', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const history = await forecastService.getForecastHistory(id, limit);

    res.json({
      success: true,
      data: history
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id/forecast/latest', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const forecast = await forecastService.getLatestForecast(id);

    if (!forecast) {
      res.status(404).json({ success: false, message: '暂无预测数据' });
      return;
    }

    res.json({
      success: true,
      data: forecast
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

function mapSchedule(row: any) {
  return {
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
    targetRegion: row.target_region ? JSON.parse(row.target_region) : undefined,
    targetAudience: row.target_audience ? JSON.parse(row.target_audience) : undefined,
    status: row.status,
    createdAt: row.created_at
  };
}

export default router;
