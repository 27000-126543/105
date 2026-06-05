"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHINA_PROVINCES = exports.INDUSTRY_AVERAGES = exports.CHANNEL_DISPLAY_NAMES = exports.ApprovalAction = exports.ApprovalStatus = exports.AlertStatus = exports.AlertLevel = exports.UserRole = exports.ChannelType = void 0;
var ChannelType;
(function (ChannelType) {
    ChannelType["SEARCH"] = "search";
    ChannelType["SOCIAL"] = "social";
    ChannelType["VIDEO"] = "video";
    ChannelType["FEED"] = "feed";
    ChannelType["DISPLAY"] = "display";
})(ChannelType || (exports.ChannelType = ChannelType = {}));
var UserRole;
(function (UserRole) {
    UserRole["ADVERTISER"] = "advertiser";
    UserRole["AGENCY"] = "agency";
    UserRole["MEDIA"] = "media";
    UserRole["OPTIMIZER"] = "optimizer";
    UserRole["MEDIA_SUPERVISOR"] = "media_supervisor";
    UserRole["STRATEGY_DIRECTOR"] = "strategy_director";
    UserRole["ADMIN"] = "admin";
})(UserRole || (exports.UserRole = UserRole = {}));
var AlertLevel;
(function (AlertLevel) {
    AlertLevel["NONE"] = "none";
    AlertLevel["LEVEL_1"] = "level_1";
    AlertLevel["LEVEL_2"] = "level_2";
})(AlertLevel || (exports.AlertLevel = AlertLevel = {}));
var AlertStatus;
(function (AlertStatus) {
    AlertStatus["PENDING"] = "pending";
    AlertStatus["ACKNOWLEDGED"] = "acknowledged";
    AlertStatus["PROCESSING"] = "processing";
    AlertStatus["RESOLVED"] = "resolved";
    AlertStatus["ESCALATED"] = "escalated";
})(AlertStatus || (exports.AlertStatus = AlertStatus = {}));
var ApprovalStatus;
(function (ApprovalStatus) {
    ApprovalStatus["PENDING"] = "pending";
    ApprovalStatus["OPTIMIZER_APPROVED"] = "optimizer_approved";
    ApprovalStatus["SUPERVISOR_APPROVED"] = "supervisor_approved";
    ApprovalStatus["DIRECTOR_APPROVED"] = "director_approved";
    ApprovalStatus["REJECTED"] = "rejected";
    ApprovalStatus["COMPLETED"] = "completed";
})(ApprovalStatus || (exports.ApprovalStatus = ApprovalStatus = {}));
var ApprovalAction;
(function (ApprovalAction) {
    ApprovalAction["PAUSE"] = "pause";
    ApprovalAction["ADJUST_BID"] = "adjust_bid";
    ApprovalAction["REPLACE_CREATIVE"] = "replace_creative";
    ApprovalAction["CHANGE_BUDGET"] = "change_budget";
})(ApprovalAction || (exports.ApprovalAction = ApprovalAction = {}));
exports.CHANNEL_DISPLAY_NAMES = {
    [ChannelType.SEARCH]: '搜索',
    [ChannelType.SOCIAL]: '社交',
    [ChannelType.VIDEO]: '视频',
    [ChannelType.FEED]: '信息流',
    [ChannelType.DISPLAY]: '展示'
};
exports.INDUSTRY_AVERAGES = {
    'e-commerce': { ctr: 0.025, cvr: 0.035, cpm: 30, roi: 2.8 },
    education: { ctr: 0.018, cvr: 0.08, cpm: 45, roi: 3.2 },
    finance: { ctr: 0.012, cvr: 0.05, cpm: 80, roi: 4.0 },
    healthcare: { ctr: 0.015, cvr: 0.06, cpm: 55, roi: 3.5 },
    real_estate: { ctr: 0.008, cvr: 0.015, cpm: 120, roi: 5.0 },
    automotive: { ctr: 0.02, cvr: 0.02, cpm: 65, roi: 3.8 },
    food_beverage: { ctr: 0.03, cvr: 0.045, cpm: 25, roi: 2.5 },
    travel: { ctr: 0.022, cvr: 0.025, cpm: 40, roi: 3.0 },
    default: { ctr: 0.02, cvr: 0.03, cpm: 40, roi: 3.0 }
};
exports.CHINA_PROVINCES = [
    '北京', '上海', '广东', '江苏', '浙江', '山东', '四川', '湖北', '河南', '福建',
    '湖南', '安徽', '河北', '辽宁', '陕西', '重庆', '江西', '云南', '广西', '山西',
    '贵州', '黑龙江', '吉林', '甘肃', '内蒙古', '新疆', '海南', '宁夏', '青海', '西藏'
];
//# sourceMappingURL=types.js.map