import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import cron from 'node-cron';
import { Server as SocketIOServer } from 'socket.io';

import { getDb, initDatabase, closeDb } from './models/database';
import { authenticateToken } from './middleware/auth';
import { alertService } from './services/AlertService';
import { reportService } from './services/ReportService';
import { dataIngestionService } from './services/DataIngestionService';

import authRouter from './routes/auth';
import dashboardRouter from './routes/dashboard';
import alertsRouter from './routes/alerts';
import approvalsRouter from './routes/approvals';
import schedulesRouter from './routes/schedules';
import reportsRouter from './routes/reports';
import channelsRouter from './routes/channels';
import advertisersRouter from './routes/advertisers';
import usersRouter from './routes/users';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  }
});

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: NODE_ENV
    }
  });
});

app.get('/api/health', authenticateToken, (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      user: req.user
    }
  });
});

app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/approvals', approvalsRouter);
app.use('/api/schedules', schedulesRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/channels', channelsRouter);
app.use('/api/advertisers', advertisersRouter);
app.use('/api/users', usersRouter);

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: '接口不存在'
  });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || '服务器内部错误'
  });
});

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });

  socket.on('subscribe:alerts', () => {
    socket.join('alerts');
    console.log(`Client ${socket.id} subscribed to alerts`);
  });

  socket.on('unsubscribe:alerts', () => {
    socket.leave('alerts');
    console.log(`Client ${socket.id} unsubscribed from alerts`);
  });

  socket.on('subscribe:dashboard', () => {
    socket.join('dashboard');
    console.log(`Client ${socket.id} subscribed to dashboard`);
  });

  socket.on('unsubscribe:dashboard', () => {
    socket.leave('dashboard');
    console.log(`Client ${socket.id} unsubscribed from dashboard`);
  });
});

const broadcastAlert = (alert: any) => {
  io.to('alerts').emit('alert:new', alert);
};

const broadcastDashboardUpdate = (data: any) => {
  io.to('dashboard').emit('dashboard:update', data);
};

const logDatabaseStats = () => {
  try {
    const db = getDb();
    console.log('Database initialized successfully');

    const advertiserCount = db.prepare('SELECT COUNT(*) as count FROM advertisers').get() as any;
    const channelCount = db.prepare('SELECT COUNT(*) as count FROM channels').get() as any;
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;

    console.log(`Initial data: ${advertiserCount.count} advertisers, ${channelCount.count} channels, ${userCount.count} users`);
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
};

const initCronJobs = () => {
  console.log('Initializing cron jobs...');

  const hourlyAlertCheck = cron.schedule('0 * * * *', async () => {
    console.log(`${new Date().toISOString()} - Running hourly alert check...`);
    try {
      const alerts = await alertService.checkAlerts();
      console.log(`Hourly alert check completed: ${alerts.length} alerts found`);

      alerts.forEach(alert => {
        broadcastAlert(alert);
      });

      if (alerts.length > 0) {
        broadcastDashboardUpdate({ type: 'alerts', count: alerts.length });
      }
    } catch (error) {
      console.error('Error in hourly alert check:', error);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Shanghai'
  });

  const weeklyReportGeneration = cron.schedule('0 2 * * 1', async () => {
    console.log(`${new Date().toISOString()} - Running weekly report generation...`);
    try {
      const db = getDb();
      const advertisers = db.prepare('SELECT id FROM advertisers').all() as any[];

      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

      let totalReports = 0;

      for (const advertiser of advertisers) {
        try {
          const report = await reportService.generateWeeklyReport(
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0],
            advertiser.id
          );
          totalReports++;
          console.log(`Generated report for advertiser ${advertiser.id}: ${report.id}`);
        } catch (err) {
          console.error(`Failed to generate report for advertiser ${advertiser.id}:`, err);
        }
      }

      console.log(`Weekly report generation completed: ${totalReports} reports generated`);

      broadcastDashboardUpdate({
        type: 'reports',
        count: totalReports,
        message: '周报告已生成'
      });
    } catch (error) {
      console.error('Error in weekly report generation:', error);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Shanghai'
  });

  const dailyDataSimulation = cron.schedule('*/5 * * * *', async () => {
    if (NODE_ENV !== 'production') {
      console.log(`${new Date().toISOString()} - Running data simulation...`);
      try {
        const db = getDb();
        const activeSchedules = db.prepare("SELECT id FROM ad_schedules WHERE status = 'active'").all() as any[];

        if (activeSchedules.length > 0) {
          const count = Math.min(5, activeSchedules.length);
          const data = await dataIngestionService.simulateChannelPush(count);
          console.log(`Data simulation completed: ${data.length} records ingested`);

          broadcastDashboardUpdate({
            type: 'data',
            count: data.length,
            message: '实时数据已更新'
          });
        }
      } catch (error) {
        console.error('Error in data simulation:', error);
      }
    }
  }, {
    scheduled: NODE_ENV !== 'production',
    timezone: 'Asia/Shanghai'
  });

  console.log('Cron jobs initialized:');
  console.log('  - Hourly alert check: every hour at minute 0');
  console.log('  - Weekly report generation: every Monday at 02:00');
  if (NODE_ENV !== 'production') {
    console.log('  - Data simulation: every 5 minutes (development only)');
  }

  return {
    hourlyAlertCheck,
    weeklyReportGeneration,
    dailyDataSimulation
  };
};

const startServer = () => {
  server.listen(PORT, () => {
    console.log(`\n🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📊 API base URL: http://localhost:${PORT}/api`);
    console.log(`🔌 Socket.IO: ws://localhost:${PORT}`);
    console.log(`🔧 Environment: ${NODE_ENV}`);
    console.log(`⏰ Timezone: Asia/Shanghai\n`);

    console.log('📋 Default accounts:');
    console.log('   - admin / admin123 (管理员)');
    console.log('   - optimizer / optimizer123 (优化师)');
    console.log('   - supervisor / supervisor123 (媒介主管)');
    console.log('   - director / director123 (策略总监)');
    console.log('   - advertiser / advertiser123 (广告主)');
    console.log('   - agency / agency123 (代理商)');
    console.log('   - media / media123 (媒体)\n');

    console.log('🔧 Available scripts:');
    console.log('   - npm run dev - 开发模式');
    console.log('   - npm run build - 生产构建');
    console.log('   - npm start - 生产启动');
    console.log('   - npm run generate-mock - 生成30天历史数据\n');
  });
};

const gracefulShutdown = (signal: string) => {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

  server.close(() => {
    console.log('HTTP server closed');

    const db = getDb();
    db.close();
    console.log('Database connection closed');

    process.exit(0);
  });

  setTimeout(() => {
    console.error('Forced shutdown after 10 seconds');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const main = async () => {
  try {
    console.log('========================================');
    console.log('  广告投放智能分析平台 - 后端服务');
    console.log('  Ad Analytics Platform Backend');
    console.log('========================================\n');

    console.log('Initializing database...');
    await initDatabase();
    logDatabaseStats();

    initCronJobs();

    startServer();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

main();

export { app, server, io, broadcastAlert, broadcastDashboardUpdate };
