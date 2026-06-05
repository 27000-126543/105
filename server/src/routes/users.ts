import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getDb } from '../models/database';
import { authenticateToken, requireRole } from '../middleware/auth';
import { UserRole, User } from '@shared/types';

const router = Router();

const userSchema = z.object({
  username: z.string().min(3, '用户名至少3个字符').max(50, '用户名最多50个字符'),
  name: z.string().min(1, '姓名不能为空'),
  role: z.enum([
    UserRole.ADMIN,
    UserRole.OPTIMIZER,
    UserRole.MEDIA_SUPERVISOR,
    UserRole.STRATEGY_DIRECTOR,
    UserRole.ADVERTISER,
    UserRole.AGENCY,
    UserRole.MEDIA
  ]),
  email: z.string().email('邮箱格式不正确'),
  phone: z.string().optional(),
  password: z.string().min(6, '密码至少6个字符'),
  advertiserIds: z.array(z.string()).optional(),
  agencyIds: z.array(z.string()).optional(),
  mediaIds: z.array(z.string()).optional()
});

const updateUserSchema = userSchema.partial().omit({ password: true }).extend({
  password: z.string().min(6, '密码至少6个字符').optional()
});

const mapUser = (row: any): User => ({
  id: row.id,
  username: row.username,
  name: row.name,
  role: row.role as UserRole,
  email: row.email,
  phone: row.phone || undefined,
  advertiserIds: row.advertiser_ids ? JSON.parse(row.advertiser_ids) : undefined,
  agencyIds: row.agency_ids ? JSON.parse(row.agency_ids) : undefined,
  mediaIds: row.media_ids ? JSON.parse(row.media_ids) : undefined,
  createdAt: row.created_at,
  lastLogin: row.last_login || undefined
});

router.get('/', authenticateToken, requireRole(UserRole.ADMIN), (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { role, keyword } = req.query;

    let sql = 'SELECT * FROM users WHERE 1=1';
    const params: any[] = [];

    if (role) {
      sql += ' AND role = ?';
      params.push(role);
    }

    if (keyword) {
      sql += ' AND (name LIKE ? OR username LIKE ? OR email LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    sql += ' ORDER BY created_at DESC';

    const rows = db.prepare(sql).all(...params) as any[];
    const users = rows.map(mapUser);

    res.json({
      success: true,
      data: users
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/roles', authenticateToken, (req: Request, res: Response) => {
  try {
    const roles = [
      { value: UserRole.ADMIN, label: '管理员', description: '系统管理员，拥有所有权限' },
      { value: UserRole.OPTIMIZER, label: '优化师', description: '负责广告优化和调整方案' },
      { value: UserRole.MEDIA_SUPERVISOR, label: '媒介主管', description: '负责媒介投放和审核' },
      { value: UserRole.STRATEGY_DIRECTOR, label: '策略总监', description: '负责策略审批和决策' },
      { value: UserRole.ADVERTISER, label: '广告主', description: '广告主，查看自己的投放数据' },
      { value: UserRole.AGENCY, label: '代理商', description: '代理商，管理多个广告主' },
      { value: UserRole.MEDIA, label: '媒体', description: '媒体方，查看渠道数据' }
    ];

    res.json({
      success: true,
      data: roles
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', authenticateToken, (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { id } = req.params;

    if (req.user!.role !== UserRole.ADMIN && req.user!.id !== id) {
      res.status(403).json({ success: false, message: '无权限查看该用户信息' });
      return;
    }

    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;

    if (!userRow) {
      res.status(404).json({ success: false, message: '用户不存在' });
      return;
    }

    res.json({
      success: true,
      data: mapUser(userRow)
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', authenticateToken, requireRole(UserRole.ADMIN), async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const data = userSchema.parse(req.body);

    const existingUsername = db.prepare('SELECT id FROM users WHERE username = ?').get(data.username) as any;

    if (existingUsername) {
      res.status(400).json({ success: false, message: '用户名已存在' });
      return;
    }

    const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(data.email) as any;

    if (existingEmail) {
      res.status(400).json({ success: false, message: '邮箱已被使用' });
      return;
    }

    const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const passwordHash = await bcrypt.hash(data.password, 10);
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (
        id, username, name, role, email, phone, password_hash,
        advertiser_ids, agency_ids, media_ids, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.username,
      data.name,
      data.role,
      data.email,
      data.phone || null,
      passwordHash,
      data.advertiserIds ? JSON.stringify(data.advertiserIds) : null,
      data.agencyIds ? JSON.stringify(data.agencyIds) : null,
      data.mediaIds ? JSON.stringify(data.mediaIds) : null,
      createdAt
    );

    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;

    res.json({
      success: true,
      data: mapUser(userRow),
      message: '用户创建成功'
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

router.put('/:id', authenticateToken, requireRole(UserRole.ADMIN), async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const data = updateUserSchema.parse(req.body);

    const existingUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;

    if (!existingUser) {
      res.status(404).json({ success: false, message: '用户不存在' });
      return;
    }

    if (data.username && data.username !== existingUser.username) {
      const usernameExists = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(data.username, id) as any;
      if (usernameExists) {
        res.status(400).json({ success: false, message: '用户名已存在' });
        return;
      }
    }

    if (data.email && data.email !== existingUser.email) {
      const emailExists = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(data.email, id) as any;
      if (emailExists) {
        res.status(400).json({ success: false, message: '邮箱已被使用' });
        return;
      }
    }

    const updateFields: string[] = [];
    const updateParams: any[] = [];

    if (data.username !== undefined) {
      updateFields.push('username = ?');
      updateParams.push(data.username);
    }
    if (data.name !== undefined) {
      updateFields.push('name = ?');
      updateParams.push(data.name);
    }
    if (data.role !== undefined) {
      updateFields.push('role = ?');
      updateParams.push(data.role);
    }
    if (data.email !== undefined) {
      updateFields.push('email = ?');
      updateParams.push(data.email);
    }
    if (data.phone !== undefined) {
      updateFields.push('phone = ?');
      updateParams.push(data.phone || null);
    }
    if (data.password !== undefined) {
      const passwordHash = await bcrypt.hash(data.password, 10);
      updateFields.push('password_hash = ?');
      updateParams.push(passwordHash);
    }
    if (data.advertiserIds !== undefined) {
      updateFields.push('advertiser_ids = ?');
      updateParams.push(data.advertiserIds.length > 0 ? JSON.stringify(data.advertiserIds) : null);
    }
    if (data.agencyIds !== undefined) {
      updateFields.push('agency_ids = ?');
      updateParams.push(data.agencyIds.length > 0 ? JSON.stringify(data.agencyIds) : null);
    }
    if (data.mediaIds !== undefined) {
      updateFields.push('media_ids = ?');
      updateParams.push(data.mediaIds.length > 0 ? JSON.stringify(data.mediaIds) : null);
    }

    updateParams.push(id);

    db.prepare(`UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateParams);

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;

    res.json({
      success: true,
      data: mapUser(updatedUser),
      message: '用户更新成功'
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

    if (id === req.user!.id) {
      res.status(400).json({ success: false, message: '不能删除自己的账户' });
      return;
    }

    const existingUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;

    if (!existingUser) {
      res.status(404).json({ success: false, message: '用户不存在' });
      return;
    }

    const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get() as any;

    if (existingUser.role === UserRole.ADMIN && adminCount.count <= 1) {
      res.status(400).json({ success: false, message: '至少需要保留一个管理员账户' });
      return;
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);

    res.json({
      success: true,
      message: '用户删除成功'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id/permissions', authenticateToken, (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { id } = req.params;

    if (req.user!.role !== UserRole.ADMIN && req.user!.id !== id) {
      res.status(403).json({ success: false, message: '无权限查看' });
      return;
    }

    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;

    if (!userRow) {
      res.status(404).json({ success: false, message: '用户不存在' });
      return;
    }

    const user = mapUser(userRow);

    const permissions = {
      canViewAllAdvertisers: user.role === UserRole.ADMIN || user.role === UserRole.OPTIMIZER || user.role === UserRole.MEDIA_SUPERVISOR || user.role === UserRole.STRATEGY_DIRECTOR,
      canViewAllChannels: user.role === UserRole.ADMIN || user.role === UserRole.OPTIMIZER || user.role === UserRole.MEDIA_SUPERVISOR || user.role === UserRole.STRATEGY_DIRECTOR,
      canEditSchedules: user.role === UserRole.ADMIN || user.role === UserRole.OPTIMIZER,
      canApproveLevel1: user.role === UserRole.ADMIN || user.role === UserRole.OPTIMIZER,
      canApproveLevel2: user.role === UserRole.ADMIN || user.role === UserRole.MEDIA_SUPERVISOR,
      canApproveLevel3: user.role === UserRole.ADMIN || user.role === UserRole.STRATEGY_DIRECTOR,
      canManageUsers: user.role === UserRole.ADMIN,
      canManageChannels: user.role === UserRole.ADMIN,
      canManageAdvertisers: user.role === UserRole.ADMIN || user.role === UserRole.OPTIMIZER,
      canGenerateReports: user.role === UserRole.ADMIN || user.role === UserRole.OPTIMIZER || user.role === UserRole.MEDIA_SUPERVISOR || user.role === UserRole.STRATEGY_DIRECTOR,
      canViewAlerts: user.role === UserRole.ADMIN || user.role === UserRole.OPTIMIZER || user.role === UserRole.MEDIA_SUPERVISOR || user.role === UserRole.STRATEGY_DIRECTOR,
      canProcessAlerts: user.role === UserRole.ADMIN || user.role === UserRole.OPTIMIZER
    };

    res.json({
      success: true,
      data: {
        user,
        permissions
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
