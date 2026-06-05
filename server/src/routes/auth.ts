import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { getDb } from '../models/database';
import { authenticateToken } from '../middleware/auth';
import { User, UserRole } from '@shared/types';

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空')
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { username, password } = loginSchema.parse(req.body);

    const userRow = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;

    if (!userRow) {
      res.status(401).json({ success: false, message: '用户名或密码错误' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, userRow.password_hash);

    if (!isPasswordValid) {
      res.status(401).json({ success: false, message: '用户名或密码错误' });
      return;
    }

    const token = jwt.sign(
      { userId: userRow.id },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' } as any
    );

    db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(
      new Date().toISOString(),
      userRow.id
    );

    const user: User = {
      id: userRow.id,
      username: userRow.username,
      name: userRow.name,
      role: userRow.role as UserRole,
      email: userRow.email,
      phone: userRow.phone,
      advertiserIds: userRow.advertiser_ids ? JSON.parse(userRow.advertiser_ids) : undefined,
      agencyIds: userRow.agency_ids ? JSON.parse(userRow.agency_ids) : undefined,
      mediaIds: userRow.media_ids ? JSON.parse(userRow.media_ids) : undefined,
      createdAt: userRow.created_at,
      lastLogin: userRow.last_login
    };

    res.json({
      success: true,
      data: {
        token,
        user
      },
      message: '登录成功'
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

router.post('/logout', authenticateToken, (req: Request, res: Response) => {
  res.json({ success: true, message: '登出成功' });
});

router.get('/me', authenticateToken, (req: Request, res: Response) => {
  res.json({
    success: true,
    data: req.user
  });
});

router.post('/change-password', authenticateToken, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      res.status(400).json({ success: false, message: '旧密码和新密码不能为空' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ success: false, message: '新密码长度不能少于6位' });
      return;
    }

    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as any;

    const isPasswordValid = await bcrypt.compare(oldPassword, userRow.password_hash);
    if (!isPasswordValid) {
      res.status(400).json({ success: false, message: '旧密码错误' });
      return;
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(
      newPasswordHash,
      req.user!.id
    );

    res.json({ success: true, message: '密码修改成功' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
