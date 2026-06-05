import { Alert, AlertLevel, AlertStatus } from '@shared/types'

export interface AlertListParams {
  level?: AlertLevel
  status?: AlertStatus
  page?: number
  pageSize?: number
}

export const generateMockAlerts = (level: AlertLevel): Alert[] => {
  const positions = [
    { id: 'pos1', name: '微信朋友圈-首屏' },
    { id: 'pos2', name: '抖音-信息流' },
    { id: 'pos3', name: '百度搜索-首位' },
    { id: 'pos4', name: '小红书-发现页' },
    { id: 'pos5', name: '快手-视频流' },
    { id: 'pos6', name: '微博-热搜位' }
  ]

  const types = [
    { type: 'cvr_low' as const, message: '转化率持续低于行业均值' },
    { type: 'roi_low' as const, message: 'ROI低于预期阈值' }
  ]

  return positions.map((pos, idx) => ({
    id: `alert-${level}-${idx + 1}`,
    scheduleId: `sch-${idx + 1}`,
    positionId: pos.id,
    channelId: `ch${idx + 1}`,
    advertiserId: `adv${(idx % 5) + 1}`,
    level,
    type: types[idx % 2].type,
    metricName: types[idx % 2].type === 'cvr_low' ? '转化率' : 'ROI',
    currentValue: types[idx % 2].type === 'cvr_low' ? 0.015 : 1.2,
    threshold: types[idx % 2].type === 'cvr_low' ? 0.03 : 1.5,
    startTime: new Date(Date.now() - (idx + 1) * 3600000).toISOString(),
    status: idx % 3 === 0 ? AlertStatus.PENDING : idx % 3 === 1 ? AlertStatus.PROCESSING : AlertStatus.ACKNOWLEDGED,
    message: `${pos.name} - ${types[idx % 2].message}`,
    assignee: idx % 2 === 0 ? 'optimizer1' : 'optimizer2'
  }))
}

export const getAlerts = (params: AlertListParams): Promise<{ list: Alert[]; total: number }> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const level = params.level || AlertLevel.LEVEL_1
      const list = generateMockAlerts(level)
      resolve({
        list,
        total: list.length
      })
    }, 300)
  })
}

export const acknowledgeAlert = (_alertId: string): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, 300)
  })
}

export const createApprovalFromAlert = (_alertId: string, _data: {
  action: string
  actionDetails: Record<string, any>
  reason: string
}): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, 300)
  })
}

export const updateAlertStatus = (_alertId: string, _status: AlertStatus): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, 300)
  })
}
