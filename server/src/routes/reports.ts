import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, requireRole } from '../middleware/auth';
import { getAccessibleAdvertiserIds } from '../middleware/permission';
import { reportService } from '../services/ReportService';
import { UserRole } from '@shared/types';

const router = Router();

const generateReportSchema = z.object({
  advertiserId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

router.post('/generate', authenticateToken, requireRole(UserRole.OPTIMIZER, UserRole.MEDIA_SUPERVISOR, UserRole.STRATEGY_DIRECTOR, UserRole.ADMIN), async (req: Request, res: Response) => {
  try {
    const { advertiserId, startDate, endDate } = generateReportSchema.parse(req.body);

    const report = await reportService.generateWeeklyReport(advertiserId, startDate, endDate);

    res.json({
      success: true,
      data: report,
      message: '报告生成成功'
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

const reportFilterSchema = z.object({
  advertiserId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional()
});

router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const filters = reportFilterSchema.parse(req.query);
    const advertiserIds = getAccessibleAdvertiserIds(req.user!);

    let effectiveFilters = { ...filters };
    if (advertiserIds && advertiserIds.length > 0) {
      effectiveFilters.advertiserId = advertiserIds[0];
    }

    const result = await reportService.getReports(effectiveFilters);

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

router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const report = await reportService.getReportById(id);

    if (!report) {
      res.status(404).json({ success: false, message: '报告不存在' });
      return;
    }

    res.json({
      success: true,
      data: report
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id/download', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const report = await reportService.getReportById(id);

    if (!report) {
      res.status(404).json({ success: false, message: '报告不存在' });
      return;
    }

    const buffer = await reportService.exportReportToExcel(id);
    const fileName = `投放报告_${report.startDate}_${report.endDate}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);

    res.send(buffer);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', authenticateToken, requireRole(UserRole.ADMIN), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await reportService.deleteReport(id);

    if (!deleted) {
      res.status(404).json({ success: false, message: '报告不存在' });
      return;
    }

    res.json({
      success: true,
      message: '报告已删除'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
