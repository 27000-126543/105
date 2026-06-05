import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getDb } from '../models/database';
import { authenticateToken, requireRole } from '../middleware/auth';
import { getAccessibleChannelIds } from '../middleware/permission';
import { UserRole, Channel, AdPosition, ChannelType } from '@shared/types';

const router = Router();

const channelSchema = z.object({
  name: z.string().min(1, '渠道名称不能为空'),
  type: z.enum([ChannelType.SEARCH, ChannelType.SOCIAL, ChannelType.VIDEO, ChannelType.FEED, ChannelType.DISPLAY]),
  logo: z.string().optional(),
  enabled: z.boolean().default(true)
});

const positionSchema = z.object({
  name: z.string().min(1, '广告位名称不能为空'),
  channelId: z.string().min(1, '渠道ID不能为空'),
  size: z.string().optional(),
  location: z.string().optional(),
  basePrice: z.number().min(0, '基础价格不能为负数')
});

const mapChannel = (row: any): Channel => ({
  id: row.id,
  name: row.name,
  type: row.type as ChannelType,
  logo: row.logo || undefined,
  enabled: row.enabled === 1
});

const mapPosition = (row: any): AdPosition => ({
  id: row.id,
  name: row.name,
  channelId: row.channel_id,
  size: row.size || undefined,
  location: row.location || undefined,
  basePrice: row.base_price
});

router.get('/', authenticateToken, (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { type, enabled } = req.query;

    const accessibleChannelIds = getAccessibleChannelIds(req.user!);
    
    let sql = 'SELECT * FROM channels WHERE 1=1';
    const params: any[] = [];

    if (accessibleChannelIds) {
      sql += ` AND id IN (${accessibleChannelIds.map(() => '?').join(', ')})`;
      params.push(...accessibleChannelIds);
    }

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    if (enabled !== undefined) {
      sql += ' AND enabled = ?';
      params.push(enabled === 'true' ? 1 : 0);
    }

    sql += ' ORDER BY name ASC';

    const rows = db.prepare(sql).all(...params) as any[];
    const channels = rows.map(mapChannel);

    res.json({
      success: true,
      data: channels
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', authenticateToken, (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const channelRow = db.prepare('SELECT * FROM channels WHERE id = ?').get(id) as any;

    if (!channelRow) {
      res.status(404).json({ success: false, message: '渠道不存在' });
      return;
    }

    const positionRows = db.prepare('SELECT * FROM ad_positions WHERE channel_id = ? ORDER BY name ASC').all(id) as any[];
    const positions = positionRows.map(mapPosition);

    res.json({
      success: true,
      data: {
        ...mapChannel(channelRow),
        positions
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', authenticateToken, requireRole(UserRole.ADMIN), (req: Request, res: Response) => {
  try {
    const db = getDb();
    const data = channelSchema.parse(req.body);

    const existingChannel = db.prepare('SELECT id FROM channels WHERE name = ?').get(data.name) as any;

    if (existingChannel) {
      res.status(400).json({ success: false, message: '渠道名称已存在' });
      return;
    }

    const id = `channel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    db.prepare(`
      INSERT INTO channels (id, name, type, logo, enabled)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, data.name, data.type, data.logo || null, data.enabled ? 1 : 0);

    const channelRow = db.prepare('SELECT * FROM channels WHERE id = ?').get(id) as any;

    res.json({
      success: true,
      data: mapChannel(channelRow),
      message: '渠道创建成功'
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

router.put('/:id', authenticateToken, requireRole(UserRole.ADMIN), (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const data = channelSchema.partial().parse(req.body);

    const existingChannel = db.prepare('SELECT * FROM channels WHERE id = ?').get(id) as any;

    if (!existingChannel) {
      res.status(404).json({ success: false, message: '渠道不存在' });
      return;
    }

    if (data.name && data.name !== existingChannel.name) {
      const nameExists = db.prepare('SELECT id FROM channels WHERE name = ? AND id != ?').get(data.name, id) as any;
      if (nameExists) {
        res.status(400).json({ success: false, message: '渠道名称已存在' });
        return;
      }
    }

    const updateFields: string[] = [];
    const updateParams: any[] = [];

    if (data.name !== undefined) {
      updateFields.push('name = ?');
      updateParams.push(data.name);
    }
    if (data.type !== undefined) {
      updateFields.push('type = ?');
      updateParams.push(data.type);
    }
    if (data.logo !== undefined) {
      updateFields.push('logo = ?');
      updateParams.push(data.logo || null);
    }
    if (data.enabled !== undefined) {
      updateFields.push('enabled = ?');
      updateParams.push(data.enabled ? 1 : 0);
    }

    updateParams.push(id);

    db.prepare(`UPDATE channels SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateParams);

    const updatedChannel = db.prepare('SELECT * FROM channels WHERE id = ?').get(id) as any;

    res.json({
      success: true,
      data: mapChannel(updatedChannel),
      message: '渠道更新成功'
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

    const existingChannel = db.prepare('SELECT * FROM channels WHERE id = ?').get(id) as any;

    if (!existingChannel) {
      res.status(404).json({ success: false, message: '渠道不存在' });
      return;
    }

    const scheduleCount = db.prepare('SELECT COUNT(*) as count FROM ad_schedules WHERE channel_id = ?').get(id) as any;

    if (scheduleCount.count > 0) {
      res.status(400).json({ success: false, message: '该渠道下存在广告排期，无法删除' });
      return;
    }

    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM ad_positions WHERE channel_id = ?').run(id);
      db.prepare('DELETE FROM channels WHERE id = ?').run(id);
    });

    transaction();

    res.json({
      success: true,
      message: '渠道删除成功'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:channelId/positions', authenticateToken, (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { channelId } = req.params;

    const channel = db.prepare('SELECT id FROM channels WHERE id = ?').get(channelId) as any;

    if (!channel) {
      res.status(404).json({ success: false, message: '渠道不存在' });
      return;
    }

    const rows = db.prepare('SELECT * FROM ad_positions WHERE channel_id = ? ORDER BY name ASC').all(channelId) as any[];
    const positions = rows.map(mapPosition);

    res.json({
      success: true,
      data: positions
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:channelId/positions', authenticateToken, requireRole(UserRole.ADMIN), (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { channelId } = req.params;
    const data = positionSchema.parse(req.body);

    const channel = db.prepare('SELECT id FROM channels WHERE id = ?').get(channelId) as any;

    if (!channel) {
      res.status(404).json({ success: false, message: '渠道不存在' });
      return;
    }

    const id = `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    db.prepare(`
      INSERT INTO ad_positions (id, name, channel_id, size, location, base_price)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, data.name, channelId, data.size || null, data.location || null, data.basePrice);

    const positionRow = db.prepare('SELECT * FROM ad_positions WHERE id = ?').get(id) as any;

    res.json({
      success: true,
      data: mapPosition(positionRow),
      message: '广告位创建成功'
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

router.put('/:channelId/positions/:positionId', authenticateToken, requireRole(UserRole.ADMIN), (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { positionId } = req.params;
    const data = positionSchema.partial().parse(req.body);

    const existingPosition = db.prepare('SELECT * FROM ad_positions WHERE id = ?').get(positionId) as any;

    if (!existingPosition) {
      res.status(404).json({ success: false, message: '广告位不存在' });
      return;
    }

    const updateFields: string[] = [];
    const updateParams: any[] = [];

    if (data.name !== undefined) {
      updateFields.push('name = ?');
      updateParams.push(data.name);
    }
    if (data.size !== undefined) {
      updateFields.push('size = ?');
      updateParams.push(data.size || null);
    }
    if (data.location !== undefined) {
      updateFields.push('location = ?');
      updateParams.push(data.location || null);
    }
    if (data.basePrice !== undefined) {
      updateFields.push('base_price = ?');
      updateParams.push(data.basePrice);
    }

    updateParams.push(positionId);

    db.prepare(`UPDATE ad_positions SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateParams);

    const updatedPosition = db.prepare('SELECT * FROM ad_positions WHERE id = ?').get(positionId) as any;

    res.json({
      success: true,
      data: mapPosition(updatedPosition),
      message: '广告位更新成功'
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

router.delete('/:channelId/positions/:positionId', authenticateToken, requireRole(UserRole.ADMIN), (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { positionId } = req.params;

    const existingPosition = db.prepare('SELECT * FROM ad_positions WHERE id = ?').get(positionId) as any;

    if (!existingPosition) {
      res.status(404).json({ success: false, message: '广告位不存在' });
      return;
    }

    const scheduleCount = db.prepare('SELECT COUNT(*) as count FROM ad_schedules WHERE position_id = ?').get(positionId) as any;

    if (scheduleCount.count > 0) {
      res.status(400).json({ success: false, message: '该广告位下存在广告排期，无法删除' });
      return;
    }

    db.prepare('DELETE FROM ad_positions WHERE id = ?').run(positionId);

    res.json({
      success: true,
      message: '广告位删除成功'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
