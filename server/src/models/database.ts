import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { ChannelType, UserRole } from '@shared/types';

let db: Database.Database | null = null;
let dbPath: string = '';

const ADVERTISERS = [
  { id: uuidv4(), name: '优品电商', industry: 'e-commerce', contact: '张经理', phone: '13800138001' },
  { id: uuidv4(), name: '智慧教育', industry: 'education', contact: '李老师', phone: '13800138002' },
  { id: uuidv4(), name: '稳健金融', industry: 'finance', contact: '王总监', phone: '13800138003' },
  { id: uuidv4(), name: '健康医疗', industry: 'healthcare', contact: '陈院长', phone: '13800138004' },
  { id: uuidv4(), name: '安居房产', industry: 'real_estate', contact: '刘经理', phone: '13800138005' },
  { id: uuidv4(), name: '极速汽车', industry: 'automotive', contact: '赵总', phone: '13800138006' },
  { id: uuidv4(), name: '美味餐饮', industry: 'food_beverage', contact: '孙店长', phone: '13800138007' },
  { id: uuidv4(), name: '畅游旅游', industry: 'travel', contact: '周导游', phone: '13800138008' }
];

const CHANNELS = [
  { id: uuidv4(), name: '百度搜索', type: ChannelType.SEARCH, enabled: true },
  { id: uuidv4(), name: '微信社交', type: ChannelType.SOCIAL, enabled: true },
  { id: uuidv4(), name: '抖音视频', type: ChannelType.VIDEO, enabled: true },
  { id: uuidv4(), name: '快手视频', type: ChannelType.VIDEO, enabled: true },
  { id: uuidv4(), name: '微博社交', type: ChannelType.SOCIAL, enabled: true },
  { id: uuidv4(), name: '小红书社交', type: ChannelType.SOCIAL, enabled: true },
  { id: uuidv4(), name: '360搜索', type: ChannelType.SEARCH, enabled: true },
  { id: uuidv4(), name: '神马搜索', type: ChannelType.SEARCH, enabled: true },
  { id: uuidv4(), name: 'B站视频', type: ChannelType.VIDEO, enabled: true },
  { id: uuidv4(), name: '优酷视频', type: ChannelType.VIDEO, enabled: true }
];

const AD_POSITION_TEMPLATES = [
  { name: '首页Banner', size: '728x90', location: '首页顶部', basePriceMultiplier: 2.0 },
  { name: '信息流广告', size: '640x360', location: '内容流中', basePriceMultiplier: 1.5 },
  { name: '侧边栏广告', size: '300x250', location: '页面侧边', basePriceMultiplier: 1.0 },
  { name: '开屏广告', size: '1080x1920', location: '应用启动', basePriceMultiplier: 3.0 },
  { name: '视频贴片', size: '640x360', location: '视频播放前', basePriceMultiplier: 2.5 }
];

function initDatabaseSync(): void {
  if (db) return;

  try {
    dbPath = process.env.DB_PATH || './data/ad_analytics.db';
    const dbDir = path.dirname(dbPath);

    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new Database(dbPath);

    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    initializeTables(db);
    initializeSeedData(db);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

export async function initDatabase(): Promise<void> {
  initDatabaseSync();
}

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

function initializeTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS advertisers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      industry TEXT NOT NULL,
      contact TEXT NOT NULL,
      phone TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      logo TEXT,
      enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ad_positions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      size TEXT,
      location TEXT,
      base_price REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ad_creatives (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      url TEXT NOT NULL,
      thumbnail TEXT,
      advertiser_id TEXT NOT NULL,
      tags TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ad_schedules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      advertiser_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      position_id TEXT NOT NULL,
      creative_id TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      budget REAL NOT NULL,
      daily_budget REAL NOT NULL,
      bid_price REAL NOT NULL,
      target_region TEXT,
      target_audience TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS raw_ad_data (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      position_id TEXT NOT NULL,
      schedule_id TEXT NOT NULL,
      advertiser_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      impressions INTEGER NOT NULL DEFAULT 0,
      clicks INTEGER NOT NULL DEFAULT 0,
      conversions INTEGER NOT NULL DEFAULT 0,
      cost REAL NOT NULL DEFAULT 0,
      region TEXT,
      audience_age INTEGER,
      audience_gender TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS unified_ad_records (
      id TEXT PRIMARY KEY,
      schedule_id TEXT NOT NULL,
      advertiser_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      position_id TEXT NOT NULL,
      creative_id TEXT NOT NULL,
      date TEXT NOT NULL,
      hour INTEGER NOT NULL,
      impressions INTEGER NOT NULL DEFAULT 0,
      clicks INTEGER NOT NULL DEFAULT 0,
      conversions INTEGER NOT NULL DEFAULT 0,
      cost REAL NOT NULL DEFAULT 0,
      revenue REAL NOT NULL DEFAULT 0,
      ctr REAL NOT NULL DEFAULT 0,
      cvr REAL NOT NULL DEFAULT 0,
      cpm REAL NOT NULL DEFAULT 0,
      cpc REAL NOT NULL DEFAULT 0,
      cpa REAL NOT NULL DEFAULT 0,
      roi REAL NOT NULL DEFAULT 0,
      region TEXT,
      audience_age INTEGER,
      audience_gender TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      advertiser_ids TEXT,
      agency_ids TEXT,
      media_ids TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_login TEXT
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      schedule_id TEXT NOT NULL,
      position_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      advertiser_id TEXT NOT NULL,
      level TEXT NOT NULL,
      type TEXT NOT NULL,
      metric_name TEXT NOT NULL,
      current_value REAL NOT NULL,
      threshold REAL NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      status TEXT NOT NULL,
      message TEXT NOT NULL,
      assignee TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS approval_requests (
      id TEXT PRIMARY KEY,
      alert_id TEXT,
      schedule_id TEXT NOT NULL,
      action TEXT NOT NULL,
      action_details TEXT,
      reason TEXT NOT NULL,
      status TEXT NOT NULL,
      optimizer_id TEXT,
      optimizer_comment TEXT,
      optimizer_time TEXT,
      supervisor_id TEXT,
      supervisor_comment TEXT,
      supervisor_time TEXT,
      director_id TEXT,
      director_comment TEXT,
      director_time TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS forecasts (
      id TEXT PRIMARY KEY,
      schedule_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      horizon_hours INTEGER NOT NULL,
      predictions TEXT NOT NULL,
      recommendations TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS weekly_reports (
      id TEXT PRIMARY KEY,
      advertiser_id TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      generated_at TEXT NOT NULL,
      summary TEXT NOT NULL,
      week_over_week TEXT NOT NULL,
      anomalies TEXT NOT NULL,
      click_attribution TEXT NOT NULL,
      recommendations TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS metrics_summaries (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      advertiser_id TEXT,
      channel_id TEXT,
      position_id TEXT,
      total_impressions INTEGER NOT NULL DEFAULT 0,
      total_clicks INTEGER NOT NULL DEFAULT 0,
      total_conversions INTEGER NOT NULL DEFAULT 0,
      total_cost REAL NOT NULL DEFAULT 0,
      total_revenue REAL NOT NULL DEFAULT 0,
      avg_ctr REAL NOT NULL DEFAULT 0,
      avg_cvr REAL NOT NULL DEFAULT 0,
      avg_cpm REAL NOT NULL DEFAULT 0,
      avg_roi REAL NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_unified_date_hour ON unified_ad_records(date, hour);
    CREATE INDEX IF NOT EXISTS idx_unified_advertiser ON unified_ad_records(advertiser_id);
    CREATE INDEX IF NOT EXISTS idx_unified_channel ON unified_ad_records(channel_id);
    CREATE INDEX IF NOT EXISTS idx_unified_position ON unified_ad_records(position_id);
    CREATE INDEX IF NOT EXISTS idx_unified_schedule ON unified_ad_records(schedule_id);
    CREATE INDEX IF NOT EXISTS idx_raw_timestamp ON raw_ad_data(timestamp);
    CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
    CREATE INDEX IF NOT EXISTS idx_alerts_level ON alerts(level);
    CREATE INDEX IF NOT EXISTS idx_approvals_status ON approval_requests(status);
  `);
}

function initializeSeedData(db: Database.Database): void {
  const advertiserCount = db.prepare('SELECT COUNT(*) as count FROM advertisers').get() as { count: number };
  if (advertiserCount.count === 0) {
    const insertAdvertiser = db.prepare(`
      INSERT INTO advertisers (id, name, industry, contact, phone)
      VALUES (?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      for (const advertiser of ADVERTISERS) {
        insertAdvertiser.run(advertiser.id, advertiser.name, advertiser.industry, advertiser.contact, advertiser.phone);
      }
    });
    transaction();
    console.log('已初始化 8 个广告主数据');
  }

  const channelCount = db.prepare('SELECT COUNT(*) as count FROM channels').get() as { count: number };
  if (channelCount.count === 0) {
    const insertChannel = db.prepare(`
      INSERT INTO channels (id, name, type, enabled)
      VALUES (?, ?, ?, ?)
    `);

    const insertPosition = db.prepare(`
      INSERT INTO ad_positions (id, name, channel_id, size, location, base_price)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      for (const channel of CHANNELS) {
        insertChannel.run(channel.id, channel.name, channel.type, 1);
        
        const basePrice = channel.type === ChannelType.SEARCH ? 1.5 : 
                          channel.type === ChannelType.VIDEO ? 2.0 : 1.0;
        
        for (const template of AD_POSITION_TEMPLATES) {
          const positionId = uuidv4();
          const positionPrice = basePrice * template.basePriceMultiplier;
          insertPosition.run(
            positionId,
            template.name,
            channel.id,
            template.size,
            template.location,
            positionPrice
          );
        }
      }
    });
    transaction();
    console.log('已初始化 10 个媒体渠道和 50 个广告位数据');
  }

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    const bcrypt = require('bcryptjs');
    const defaultPassword = bcrypt.hashSync('123456', 10);
    
    const advertiserIds = ADVERTISERS.map(a => a.id);
    const channelIds = CHANNELS.map(c => c.id);
    
    const insertUser = db.prepare(`
      INSERT INTO users (id, username, password_hash, name, role, email, phone, advertiser_ids, agency_ids, media_ids)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const defaultUsers = [
      { id: uuidv4(), username: 'admin', name: '系统管理员', role: UserRole.ADMIN, email: 'admin@example.com', phone: '13900139000', advertiserIds: null, agencyIds: null, mediaIds: null },
      { id: uuidv4(), username: 'optimizer', name: '优化师小王', role: UserRole.OPTIMIZER, email: 'optimizer@example.com', phone: '13900139001', advertiserIds: null, agencyIds: null, mediaIds: null },
      { id: uuidv4(), username: 'supervisor', name: '媒介主管老李', role: UserRole.MEDIA_SUPERVISOR, email: 'supervisor@example.com', phone: '13900139002', advertiserIds: null, agencyIds: null, mediaIds: null },
      { id: uuidv4(), username: 'director', name: '策略总监张总', role: UserRole.STRATEGY_DIRECTOR, email: 'director@example.com', phone: '13900139003', advertiserIds: null, agencyIds: null, mediaIds: null },
      { id: uuidv4(), username: 'advertiser', name: '电商客户刘总', role: UserRole.ADVERTISER, email: 'advertiser@example.com', phone: '13900139004', advertiserIds: JSON.stringify(advertiserIds.slice(0, 3)), agencyIds: null, mediaIds: null },
      { id: uuidv4(), username: 'agency', name: '代理公司小赵', role: UserRole.AGENCY, email: 'agency@example.com', phone: '13900139005', advertiserIds: JSON.stringify(advertiserIds.slice(0, 4)), agencyIds: JSON.stringify(['agency_1']), mediaIds: null },
      { id: uuidv4(), username: 'media', name: '媒体方老孙', role: UserRole.MEDIA, email: 'media@example.com', phone: '13900139006', advertiserIds: null, agencyIds: null, mediaIds: JSON.stringify(channelIds.slice(0, 3)) }
    ];

    const transaction = db.transaction(() => {
      for (const user of defaultUsers) {
        insertUser.run(user.id, user.username, defaultPassword, user.name, user.role, user.email, user.phone, user.advertiserIds, user.agencyIds, user.mediaIds);
      }
    });
    transaction();
    console.log('已初始化 7 个默认用户，密码均为 123456');
  }
}

export function getAdvertisers(): typeof ADVERTISERS {
  return ADVERTISERS;
}

export function getChannels(): typeof CHANNELS {
  return CHANNELS;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
