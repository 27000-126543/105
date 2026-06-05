"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateId = generateId;
exports.formatNumber = formatNumber;
exports.formatPercent = formatPercent;
exports.formatCurrency = formatCurrency;
exports.calculateMetrics = calculateMetrics;
exports.aggregateMetrics = aggregateMetrics;
exports.getIndustryAverage = getIndustryAverage;
exports.checkCvrAlert = checkCvrAlert;
exports.checkRoiAlert = checkRoiAlert;
exports.generateTimeSeries = generateTimeSeries;
exports.movingAverage = movingAverage;
exports.detectAnomaly = detectAnomaly;
exports.calculateWeekOverWeek = calculateWeekOverWeek;
exports.formatDate = formatDate;
exports.formatDateTime = formatDateTime;
exports.getRelativeTime = getRelativeTime;
const types_1 = require("./types");
function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function formatNumber(num, decimals = 2) {
    if (num >= 100000000) {
        return (num / 100000000).toFixed(decimals) + '亿';
    }
    else if (num >= 10000) {
        return (num / 10000).toFixed(decimals) + '万';
    }
    return num.toFixed(decimals);
}
function formatPercent(num, decimals = 2) {
    return (num * 100).toFixed(decimals) + '%';
}
function formatCurrency(num, decimals = 2) {
    return '¥' + num.toFixed(decimals);
}
function calculateMetrics(impressions, clicks, conversions, cost, revenue = 0) {
    const ctr = impressions > 0 ? clicks / impressions : 0;
    const cvr = clicks > 0 ? conversions / clicks : 0;
    const cpm = impressions > 0 ? (cost / impressions) * 1000 : 0;
    const cpc = clicks > 0 ? cost / clicks : 0;
    const cpa = conversions > 0 ? cost / conversions : 0;
    const roi = cost > 0 ? revenue / cost : 0;
    return {
        impressions,
        clicks,
        conversions,
        cost,
        revenue,
        ctr,
        cvr,
        cpm,
        cpc,
        cpa,
        roi
    };
}
function aggregateMetrics(records) {
    if (records.length === 0) {
        return {
            date: new Date().toISOString().split('T')[0],
            totalImpressions: 0,
            totalClicks: 0,
            totalConversions: 0,
            totalCost: 0,
            totalRevenue: 0,
            avgCtr: 0,
            avgCvr: 0,
            avgCpm: 0,
            avgRoi: 0
        };
    }
    const totals = records.reduce((acc, r) => ({
        impressions: acc.impressions + r.impressions,
        clicks: acc.clicks + r.clicks,
        conversions: acc.conversions + r.conversions,
        cost: acc.cost + r.cost,
        revenue: acc.revenue + r.revenue
    }), { impressions: 0, clicks: 0, conversions: 0, cost: 0, revenue: 0 });
    const metrics = calculateMetrics(totals.impressions, totals.clicks, totals.conversions, totals.cost, totals.revenue);
    return {
        date: records[0].date,
        advertiserId: records[0].advertiserId,
        channelId: records[0].channelId,
        positionId: records[0].positionId,
        totalImpressions: totals.impressions,
        totalClicks: totals.clicks,
        totalConversions: totals.conversions,
        totalCost: totals.cost,
        totalRevenue: totals.revenue,
        avgCtr: metrics.ctr,
        avgCvr: metrics.cvr,
        avgCpm: metrics.cpm,
        avgRoi: metrics.roi
    };
}
function getIndustryAverage(industry) {
    return types_1.INDUSTRY_AVERAGES[industry] || types_1.INDUSTRY_AVERAGES.default;
}
function checkCvrAlert(currentCvr, industryCvr) {
    const threshold = industryCvr * 0.7;
    const percentage = (currentCvr / industryCvr) * 100;
    return {
        shouldAlert: currentCvr < threshold,
        percentage
    };
}
function checkRoiAlert(currentRoi) {
    const threshold = 1.5;
    return {
        shouldAlert: currentRoi < threshold,
        threshold
    };
}
function generateTimeSeries(startTime, hours, intervalMinutes = 60) {
    const points = [];
    const interval = intervalMinutes * 60 * 1000;
    const count = Math.floor((hours * 60 * 60 * 1000) / interval);
    for (let i = 0; i < count; i++) {
        const time = new Date(startTime.getTime() + i * interval);
        points.push({
            time: time.toISOString(),
            value: Math.random() * 100,
            metric: 'default'
        });
    }
    return points;
}
function movingAverage(data, windowSize) {
    const result = [];
    for (let i = 0; i < data.length; i++) {
        const start = Math.max(0, i - windowSize + 1);
        const window = data.slice(start, i + 1);
        const avg = window.reduce((a, b) => a + b, 0) / window.length;
        result.push(avg);
    }
    return result;
}
function detectAnomaly(data, threshold = 2) {
    if (data.length < 3)
        return [];
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const std = Math.sqrt(data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / data.length);
    return data
        .map((value, index) => ({ value, index }))
        .filter(item => Math.abs(item.value - mean) > threshold * std)
        .map(item => item.index);
}
function calculateWeekOverWeek(current, previous) {
    if (previous === 0)
        return current > 0 ? 1 : 0;
    return (current - previous) / previous;
}
function formatDate(date) {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}
function formatDateTime(date) {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}
function getRelativeTime(date) {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1)
        return '刚刚';
    if (diffMins < 60)
        return `${diffMins}分钟前`;
    if (diffHours < 24)
        return `${diffHours}小时前`;
    if (diffDays < 7)
        return `${diffDays}天前`;
    return formatDate(d);
}
//# sourceMappingURL=utils.js.map