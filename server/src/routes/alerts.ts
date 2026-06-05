import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, requireRole } from '../middleware/auth';
import { getAccessibleAdvertiserIds } from '../middleware/permission';
import { alertService } from '../services/AlertService';
import { AlertLevel, AlertStatus, UserRole } from '@shared/types';

const router = Router();

const alertFilterSchema = z.object({
  status: z.nativeEnum(AlertStatus).optional(),
  level: z.nativeEnum(AlertLevel).optional(),
  advertiserId: z.string().optional(),
  channelId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional()
});

router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const filters = alertFilterSchema.parse(req.query);
    const advertiserIds = getAccessibleAdvertiserIds(req.user!);

    let effectiveFilters = { ...filters };
    if (advertiserIds && advertiserIds.length > 0) {
      effectiveFilters.advertiserId = advertiserIds[0];
    }

    const result = await alertService.getAlerts(effectiveFilters);

    res.json({
      success: true,
      data: result
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

router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const advertiserIds = getAccessibleAdvertiserIds(req.user!);
    const stats = await alertService.getAlertStats(advertiserIds || undefined);

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const alert = await alertService.getAlertById(id);

    if (!alert) {
      res.status(404).json({ success: false, message: '预警不存在' });
      return;
    }

    res.json({
      success: true,
      data: alert
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

const acknowledgeSchema = z.object({
  assignee: z.string().optional()
});

router.post('/:id/acknowledge', authenticateToken, requireRole(UserRole.OPTIMIZER, UserRole.MEDIA_SUPERVISOR, UserRole.STRATEGY_DIRECTOR, UserRole.ADMIN), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { assignee } = acknowledgeSchema.parse(req.body);

    const alert = await alertService.acknowledgeAlert(id, assignee || req.user!.name);

    if (!alert) {
      res.status(404).json({ success: false, message: '预警不存在' });
      return;
    }

    res.json({
      success: true,
      data: alert,
      message: '预警已确认'
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

router.post('/:id/process', authenticateToken, requireRole(UserRole.OPTIMIZER, UserRole.MEDIA_SUPERVISOR, UserRole.STRATEGY_DIRECTOR, UserRole.ADMIN), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const alert = await alertService.processAlert(id);

    if (!alert) {
      res.status(404).json({ success: false, message: '预警不存在' });
      return;
    }

    res.json({
      success: true,
      data: alert,
      message: '预警处理中'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/resolve', authenticateToken, requireRole(UserRole.OPTIMIZER, UserRole.MEDIA_SUPERVISOR, UserRole.STRATEGY_DIRECTOR, UserRole.ADMIN), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const alert = await alertService.resolveAlert(id);

    if (!alert) {
      res.status(404).json({ success: false, message: '预警不存在' });
      return;
    }

    res.json({
      success: true,
      data: alert,
      message: '预警已解决'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/escalate', authenticateToken, requireRole(UserRole.MEDIA_SUPERVISOR, UserRole.STRATEGY_DIRECTOR, UserRole.ADMIN), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const alert = await alertService.escalateAlert(id);

    if (!alert) {
      res.status(404).json({ success: false, message: '预警不存在' });
      return;
    }

    res.json({
      success: true,
      data: alert,
      message: '预警已升级'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

const updateAlertSchema = z.object({
  status: z.nativeEnum(AlertStatus).optional(),
  assignee: z.string().optional(),
  message: z.string().optional()
});

router.put('/:id', authenticateToken, requireRole(UserRole.OPTIMIZER, UserRole.MEDIA_SUPERVISOR, UserRole.STRATEGY_DIRECTOR, UserRole.ADMIN), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = updateAlertSchema.parse(req.body);

    const alert = await alertService.updateAlert(id, updates);

    if (!alert) {
      res.status(404).json({ success: false, message: '预警不存在' });
      return;
    }

    res.json({
      success: true,
      data: alert,
      message: '预警已更新'
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
    const { id } = req.params;
    const deleted = await alertService.deleteAlert(id);

    if (!deleted) {
      res.status(404).json({ success: false, message: '预警不存在' });
      return;
    }

    res.json({
      success: true,
      message: '预警已删除'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/check', authenticateToken, requireRole(UserRole.ADMIN, UserRole.STRATEGY_DIRECTOR), async (req: Request, res: Response) => {
  try {
    const alerts = await alertService.checkAlerts();

    res.json({
      success: true,
      data: alerts,
      message: `检测完成，共发现 ${alerts.length} 个预警`
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
