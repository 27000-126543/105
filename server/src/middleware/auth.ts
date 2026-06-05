import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getDb } from '../models/database';
import { User, UserRole } from '@shared/types';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ success: false, message: '未提供认证令牌' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as { userId: string };
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.userId) as any;

    if (!user) {
      res.status(401).json({ success: false, message: '用户不存在' });
      return;
    }

    req.user = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role as UserRole,
      email: user.email,
      phone: user.phone,
      advertiserIds: user.advertiser_ids ? JSON.parse(user.advertiser_ids) : undefined,
      agencyIds: user.agency_ids ? JSON.parse(user.agency_ids) : undefined,
      mediaIds: user.media_ids ? JSON.parse(user.media_ids) : undefined,
      createdAt: user.created_at,
      lastLogin: user.last_login
    };

    next();
  } catch (error) {
    res.status(403).json({ success: false, message: '无效的认证令牌' });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: '未认证' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: '权限不足' });
      return;
    }

    next();
  };
}
