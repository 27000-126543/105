import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { getAccessibleAdvertiserIds } from '../middleware/permission';
import { metricsEngine } from '../services/MetricsEngine';
import { alertService } from '../services/AlertService';
import { approvalService } from '../services/ApprovalService';

const router = Router();

router.get('/summary', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const now = new Date();
    const defaultEndDate = now.toISOString().split('T')[0];
    const defaultStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const effectiveStartDate = (startDate as string) || defaultStartDate;
    const effectiveEndDate = (endDate as string) || defaultEndDate;

    const advertiserIds = getAccessibleAdvertiserIds(req.user!);

    const summary = await metricsEngine.getOverallSummary(
      effectiveStartDate,
      effectiveEndDate,
      advertiserIds || undefined
    );

    const weekOverWeek = await metricsEngine.calculateWeekOverWeekMetrics(
      effectiveStartDate,
      effectiveEndDate
    );

    const alertStats = await alertService.getAlertStats(advertiserIds || undefined);
    const approvalStats = await approvalService.getApprovalStats(advertiserIds || undefined);

    res.json({
      success: true,
      data: {
        summary,
        weekOverWeek: weekOverWeek.changes,
        alertStats,
        approvalStats
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/trend', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, metric, groupBy } = req.query;

    const now = new Date();
    const defaultEndDate = now.toISOString().split('T')[0];
    const defaultStartDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const effectiveStartDate = (startDate as string) || defaultStartDate;
    const effectiveEndDate = (endDate as string) || defaultEndDate;
    const effectiveMetric = (metric as string) || 'impressions';
    const effectiveGroupBy = (groupBy as 'hour' | 'day') || 'day';

    const advertiserIds = getAccessibleAdvertiserIds(req.user!);

    const trendData = await metricsEngine.getTrendData(
      effectiveStartDate,
      effectiveEndDate,
      effectiveMetric,
      effectiveGroupBy,
      advertiserIds || undefined
    );

    res.json({
      success: true,
      data: trendData
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/heatmap', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, metric } = req.query;

    const now = new Date();
    const defaultEndDate = now.toISOString().split('T')[0];
    const defaultStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const effectiveStartDate = (startDate as string) || defaultStartDate;
    const effectiveEndDate = (endDate as string) || defaultEndDate;
    const effectiveMetric = (metric as 'roi' | 'impressions' | 'conversions') || 'roi';

    const advertiserIds = getAccessibleAdvertiserIds(req.user!);

    const heatmapData = await metricsEngine.getHeatmapData(
      effectiveStartDate,
      effectiveEndDate,
      effectiveMetric,
      advertiserIds || undefined
    );

    res.json({
      success: true,
      data: heatmapData
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/roi-ranking', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, limit } = req.query;

    const now = new Date();
    const defaultEndDate = now.toISOString().split('T')[0];
    const defaultStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const effectiveStartDate = (startDate as string) || defaultStartDate;
    const effectiveEndDate = (endDate as string) || defaultEndDate;
    const effectiveLimit = parseInt(limit as string) || 10;

    const advertiserIds = getAccessibleAdvertiserIds(req.user!);

    const ranking = await metricsEngine.getRoiRanking(
      effectiveStartDate,
      effectiveEndDate,
      effectiveLimit,
      advertiserIds || undefined
    );

    res.json({
      success: true,
      data: ranking
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/audience-profile', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const now = new Date();
    const defaultEndDate = now.toISOString().split('T')[0];
    const defaultStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const effectiveStartDate = (startDate as string) || defaultStartDate;
    const effectiveEndDate = (endDate as string) || defaultEndDate;

    const advertiserIds = getAccessibleAdvertiserIds(req.user!);

    const profile = await metricsEngine.getAudienceProfile(
      effectiveStartDate,
      effectiveEndDate,
      advertiserIds || undefined
    );

    res.json({
      success: true,
      data: profile
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/anomalies', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, metric, threshold } = req.query;

    const now = new Date();
    const defaultEndDate = now.toISOString().split('T')[0];
    const defaultStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const effectiveStartDate = (startDate as string) || defaultStartDate;
    const effectiveEndDate = (endDate as string) || defaultEndDate;
    const effectiveMetric = (metric as string) || 'ctr';
    const effectiveThreshold = parseFloat(threshold as string) || 2;

    const anomalies = await metricsEngine.detectAnomalies(
      effectiveStartDate,
      effectiveEndDate,
      effectiveMetric,
      effectiveThreshold
    );

    res.json({
      success: true,
      data: anomalies
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
