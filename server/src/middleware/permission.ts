import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@shared/types';

export function checkAdvertiserPermission(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: '未认证' });
    return;
  }

  const { advertiserId } = req.params;
  const { role, advertiserIds } = req.user;

  if (role === UserRole.ADMIN || 
      role === UserRole.OPTIMIZER || 
      role === UserRole.MEDIA_SUPERVISOR || 
      role === UserRole.STRATEGY_DIRECTOR ||
      role === UserRole.AGENCY) {
    next();
    return;
  }

  if (role === UserRole.ADVERTISER) {
    if (advertiserIds && advertiserIds.includes(advertiserId)) {
      next();
      return;
    }
    res.status(403).json({ success: false, message: '无权访问该广告主数据' });
    return;
  }

  if (role === UserRole.MEDIA) {
    next();
    return;
  }

  res.status(403).json({ success: false, message: '权限不足' });
}

export function checkChannelPermission(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: '未认证' });
    return;
  }

  const { role, mediaIds } = req.user;
  const { channelId } = req.params;

  if (role === UserRole.ADMIN || 
      role === UserRole.OPTIMIZER || 
      role === UserRole.MEDIA_SUPERVISOR || 
      role === UserRole.STRATEGY_DIRECTOR ||
      role === UserRole.AGENCY ||
      role === UserRole.ADVERTISER) {
    next();
    return;
  }

  if (role === UserRole.MEDIA) {
    if (mediaIds && mediaIds.includes(channelId)) {
      next();
      return;
    }
    res.status(403).json({ success: false, message: '无权访问该渠道数据' });
    return;
  }

  res.status(403).json({ success: false, message: '权限不足' });
}

export function getAccessibleAdvertiserIds(user: Express.User): string[] | null {
  if (!user) return null;
  
  const { role, advertiserIds } = user;
  
  if (role === UserRole.ADMIN || 
      role === UserRole.OPTIMIZER || 
      role === UserRole.MEDIA_SUPERVISOR || 
      role === UserRole.STRATEGY_DIRECTOR ||
      role === UserRole.AGENCY ||
      role === UserRole.MEDIA) {
    return null;
  }
  
  return advertiserIds || [];
}

export function getAccessibleChannelIds(user: Express.User): string[] | null {
  if (!user) return null;
  
  const { role, mediaIds } = user;
  
  if (role === UserRole.ADMIN || 
      role === UserRole.OPTIMIZER || 
      role === UserRole.MEDIA_SUPERVISOR || 
      role === UserRole.STRATEGY_DIRECTOR ||
      role === UserRole.AGENCY ||
      role === UserRole.ADVERTISER) {
    return null;
  }
  
  return mediaIds || [];
}
