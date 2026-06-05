import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, requireRole } from '../middleware/auth';
import { getAccessibleAdvertiserIds } from '../middleware/permission';
import { approvalService } from '../services/ApprovalService';
import { ApprovalStatus, ApprovalAction, UserRole } from '@shared/types';

const router = Router();

const createApprovalSchema = z.object({
  alertId: z.string().optional(),
  scheduleId: z.string().min(1, '排期ID不能为空'),
  action: z.nativeEnum(ApprovalAction),
  actionDetails: z.record(z.any()).default({}),
  reason: z.string().min(1, '原因不能为空')
});

router.post('/', authenticateToken, requireRole(UserRole.OPTIMIZER, UserRole.ADMIN), async (req: Request, res: Response) => {
  try {
    const data = createApprovalSchema.parse(req.body);
    const approval = await approvalService.createApprovalRequest(data, req.user!.id);

    res.json({
      success: true,
      data: approval,
      message: '审批请求已创建'
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

const approvalFilterSchema = z.object({
  status: z.nativeEnum(ApprovalStatus).optional(),
  scheduleId: z.string().optional(),
  alertId: z.string().optional(),
  advertiserId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional()
});

router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const filters = approvalFilterSchema.parse(req.query);
    const advertiserIds = getAccessibleAdvertiserIds(req.user!);

    let effectiveFilters: any = { ...filters };
    if (advertiserIds && advertiserIds.length > 0) {
      effectiveFilters.advertiserId = advertiserIds[0];
    }

    effectiveFilters.userId = req.user!.id;
    effectiveFilters.userRole = req.user!.role;

    const result = await approvalService.getApprovals(effectiveFilters);

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
    const stats = await approvalService.getApprovalStats(advertiserIds || undefined);

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/pending', authenticateToken, async (req: Request, res: Response) => {
  try {
    const approvals = await approvalService.getPendingApprovalsForRole(req.user!.role);

    res.json({
      success: true,
      data: approvals
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const approval = await approvalService.getApprovalById(id);

    if (!approval) {
      res.status(404).json({ success: false, message: '审批不存在' });
      return;
    }

    res.json({
      success: true,
      data: approval
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

const approveSchema = z.object({
  comment: z.string().optional()
});

router.post('/:id/approve-optimizer', authenticateToken, requireRole(UserRole.OPTIMIZER, UserRole.ADMIN), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { comment } = approveSchema.parse(req.body);

    const approval = await approvalService.approveByOptimizer(id, req.user!.id, comment);

    if (!approval) {
      res.status(400).json({ success: false, message: '审批不存在或状态不正确' });
      return;
    }

    res.json({
      success: true,
      data: approval,
      message: '优化师审批通过'
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

router.post('/:id/approve-supervisor', authenticateToken, requireRole(UserRole.MEDIA_SUPERVISOR, UserRole.ADMIN), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { comment } = approveSchema.parse(req.body);

    const approval = await approvalService.approveBySupervisor(id, req.user!.id, comment);

    if (!approval) {
      res.status(400).json({ success: false, message: '审批不存在或状态不正确' });
      return;
    }

    res.json({
      success: true,
      data: approval,
      message: '媒介主管审批通过'
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

router.post('/:id/approve-director', authenticateToken, requireRole(UserRole.STRATEGY_DIRECTOR, UserRole.ADMIN), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { comment } = approveSchema.parse(req.body);

    const approval = await approvalService.approveByDirector(id, req.user!.id, comment);

    if (!approval) {
      res.status(400).json({ success: false, message: '审批不存在或状态不正确' });
      return;
    }

    res.json({
      success: true,
      data: approval,
      message: '策略总监审批通过，已执行调整方案'
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

const rejectSchema = z.object({
  comment: z.string().min(1, '拒绝原因不能为空')
});

router.post('/:id/reject', authenticateToken, requireRole(UserRole.OPTIMIZER, UserRole.MEDIA_SUPERVISOR, UserRole.STRATEGY_DIRECTOR, UserRole.ADMIN), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { comment } = rejectSchema.parse(req.body);

    const approval = await approvalService.rejectApproval(id, req.user!.id, req.user!.role, comment);

    if (!approval) {
      res.status(400).json({ success: false, message: '审批不存在或权限不足' });
      return;
    }

    res.json({
      success: true,
      data: approval,
      message: '审批已拒绝'
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

router.get('/:id/can-approve', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const approval = await approvalService.getApprovalById(id);

    if (!approval) {
      res.status(404).json({ success: false, message: '审批不存在' });
      return;
    }

    const canApprove = await approvalService.canApprove(req.user!.role, approval.status);

    res.json({
      success: true,
      data: { canApprove }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
