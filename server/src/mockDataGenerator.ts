import 'dotenv/config';
import { getDb, initDatabase, getAdvertisers, getChannels } from './models/database';
import { v4 as uuidv4 } from 'uuid';
import { calculateMetrics, getIndustryAverage } from '@shared/utils';
import { CHINA_PROVINCES } from '@shared/types';

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateMockData(days: number = 30): Promise<void> {
  console.log(`开始生成过去 ${days} 天的模拟数据...`);

  await initDatabase();
  const db = getDb();

  const advertisers = getAdvertisers();
  const channels = getChannels();

  const positions = db.prepare('SELECT * FROM ad_positions').all() as any[];

  const creatives: Array<{ id: string; advertiserId: string }> = [];
  
  console.log('生成广告创意数据...');
  for (const advertiser of advertisers) {
    for (let i = 1; i <= 5; i++) {
      const creativeId = uuidv4();
      const types = ['image', 'video', 'text'];
      const type = types[Math.floor(Math.random() * types.length)];
      const tags = JSON.stringify(['促销', '新品', '品牌', '活动'].slice(0, Math.floor(Math.random() * 3) + 1));

      db.prepare(`
        INSERT INTO ad_creatives (id, name, type, url, advertiser_id, tags)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        creativeId,
        `${advertiser.name}-创意${i}`,
        type,
        `https://example.com/creatives/${creativeId}.${type === 'video' ? 'mp4' : 'jpg'}`,
        advertiser.id,
        tags
      );

      creatives.push({ id: creativeId, advertiserId: advertiser.id });
    }
  }
  console.log(`已生成 ${creatives.length} 个广告创意`);

  console.log('生成广告排期数据...');
  const schedules: Array<{
    id: string;
    advertiserId: string;
    channelId: string;
    positionId: string;
    creativeId: string;
    industry: string;
    bidPrice: number;
  }> = [];

  for (const advertiser of advertisers) {
    const advertiserChannels = channels.filter(() => Math.random() > 0.3);
    for (const channel of advertiserChannels) {
      const channelPositions = positions.filter(p => p.channel_id === channel.id);
      const selectedPositions = channelPositions.slice(0, Math.floor(Math.random() * 3) + 2);
      
      for (const position of selectedPositions) {
        const advertiserCreatives = creatives.filter(c => c.advertiserId === advertiser.id);
        const creative = advertiserCreatives[Math.floor(Math.random() * advertiserCreatives.length)];
        
        const scheduleId = uuidv4();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);

        const basePrice = position.base_price;
        const bidPrice = Math.round(basePrice * (0.8 + Math.random() * 0.8) * 100) / 100;
        const budget = Math.round((5000 + Math.random() * 50000) * 100) / 100;
        const dailyBudget = Math.round(budget / 60 * 100) / 100;

        const regions = CHINA_PROVINCES.slice(0, Math.floor(Math.random() * 10) + 5);

        db.prepare(`
          INSERT INTO ad_schedules 
          (id, name, advertiser_id, channel_id, position_id, creative_id, start_date, end_date,
           budget, daily_budget, bid_price, target_region, target_audience, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          scheduleId,
          `${advertiser.name}-${channel.name}-${position.name}`,
          advertiser.id,
          channel.id,
          position.id,
          creative.id,
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0],
          budget,
          dailyBudget,
          bidPrice,
          JSON.stringify(regions),
          JSON.stringify({
            ageRange: [18, 55],
            gender: 'all',
            interests: ['数码科技', '时尚美妆', '运动健身', '美食烹饪'].slice(0, Math.floor(Math.random() * 3) + 1)
          }),
          'active'
        );

        schedules.push({
          id: scheduleId,
          advertiserId: advertiser.id,
          channelId: channel.id,
          positionId: position.id,
          creativeId: creative.id,
          industry: advertiser.industry,
          bidPrice
        });
      }
    }
  }
  console.log(`已生成 ${schedules.length} 个广告排期`);

  console.log('生成历史投放数据...');
  
  const insertRaw = db.prepare(`
    INSERT INTO raw_ad_data 
    (id, channel_id, position_id, schedule_id, advertiser_id, timestamp,
     impressions, clicks, conversions, cost, region, audience_age, audience_gender)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertUnified = db.prepare(`
    INSERT INTO unified_ad_records 
    (id, schedule_id, advertiser_id, channel_id, position_id, creative_id,
     date, hour, impressions, clicks, conversions, cost, revenue,
     ctr, cvr, cpm, cpc, cpa, roi, region, audience_age, audience_gender)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date();
  const startTime = new Date(now);
  startTime.setDate(startTime.getDate() - days);

  let totalRecords = 0;
  const genders: ('male' | 'female')[] = ['male', 'female'];

  for (let dayOffset = 0; dayOffset < days; dayOffset++) {
    const currentDate = new Date(startTime);
    currentDate.setDate(currentDate.getDate() + dayOffset);
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayOfWeek = currentDate.getDay();
    const dayFactor = dayOfWeek === 0 || dayOfWeek === 6 ? 1.2 : 1.0;

    const transaction = db.transaction(() => {
      for (const schedule of schedules) {
        const industryAvg = getIndustryAverage(schedule.industry);

        for (let hour = 0; hour < 24; hour++) {
          const hourFactor = getHourFactor(hour);
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const weekendFactor = isWeekend ? (hour >= 10 && hour <= 22 ? 1.3 : 0.8) : 1.0;

          const baseImpressions = Math.floor((500 + Math.random() * 2000) * hourFactor * dayFactor * weekendFactor);
          if (baseImpressions === 0) continue;

          const ctrVariation = 0.7 + Math.random() * 0.6;
          const ctr = Math.min(0.2, industryAvg.ctr * ctrVariation);
          const clicks = Math.floor(baseImpressions * ctr);

          const cvrVariation = 0.7 + Math.random() * 0.6;
          const cvr = Math.min(0.3, industryAvg.cvr * cvrVariation);
          const conversions = Math.floor(clicks * cvr);

          const cpc = schedule.bidPrice * (0.8 + Math.random() * 0.4);
          const cost = Math.round(clicks * cpc * 100) / 100;

          const roiVariation = 0.8 + Math.random() * 0.4;
          const revenue = Math.round(cost * industryAvg.roi * roiVariation * 100) / 100;

          const region = CHINA_PROVINCES[Math.floor(Math.random() * CHINA_PROVINCES.length)];
          const age = 18 + Math.floor(Math.random() * 50);
          const gender = genders[Math.floor(Math.random() * genders.length)];

          const rawId = uuidv4();
          const timestamp = new Date(currentDate);
          timestamp.setHours(hour, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));

          insertRaw.run(
            rawId,
            schedule.channelId,
            schedule.positionId,
            schedule.id,
            schedule.advertiserId,
            timestamp.toISOString(),
            baseImpressions,
            clicks,
            conversions,
            cost,
            region,
            age,
            gender
          );

          const metrics = calculateMetrics(baseImpressions, clicks, conversions, cost, revenue);

          const unifiedId = uuidv4();
          insertUnified.run(
            unifiedId,
            schedule.id,
            schedule.advertiserId,
            schedule.channelId,
            schedule.positionId,
            schedule.creativeId,
            dateStr,
            hour,
            metrics.impressions,
            metrics.clicks,
            metrics.conversions,
            metrics.cost,
            metrics.revenue,
            metrics.ctr,
            metrics.cvr,
            metrics.cpm,
            metrics.cpc,
            metrics.cpa,
            metrics.roi,
            region,
            age,
            gender
          );

          totalRecords++;
        }
      }
    });

    transaction();
    console.log(`已生成第 ${dayOffset + 1}/${days} 天数据 (${dateStr})，累计 ${totalRecords} 条记录`);

    await sleep(10);
  }

  console.log('\n数据生成完成！');
  console.log(`总计生成:
  - ${creatives.length} 个广告创意
  - ${schedules.length} 个广告排期
  - ${totalRecords} 条广告数据记录
  - 覆盖 ${days} 天历史数据`);
}

function getHourFactor(hour: number): number {
  const factors: Record<number, number> = {
    0: 0.2, 1: 0.1, 2: 0.05, 3: 0.03, 4: 0.03, 5: 0.05,
    6: 0.1, 7: 0.2, 8: 0.4, 9: 0.6, 10: 0.8, 11: 0.9,
    12: 1.0, 13: 0.9, 14: 0.8, 15: 0.8, 16: 0.9, 17: 1.0,
    18: 1.2, 19: 1.4, 20: 1.5, 21: 1.4, 22: 1.0, 23: 0.5
  };
  return factors[hour] || 0.5;
}

const days = parseInt(process.argv[2]) || 30;
generateMockData(days).catch(console.error);
