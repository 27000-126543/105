import { ApprovalRequest, ApprovalStatus, ApprovalAction } from '@shared/types'

export interface ApprovalListParams {
  tab: 'pending' | 'initiated' | 'completed'
  page?: number
  pageSize?: number
}

const mockUsers = [
  { id: '1', name: '张优化', role: 'optimizer' },
  { id: '2', name: '李主管', role: 'media_supervisor' },
  { id: '3', name: '王总监', role: 'strategy_director' }
]

const generateMockApprovals = (): ApprovalRequest[] => {
  const actions: ApprovalAction[] = [
    ApprovalAction.PAUSE,
    ApprovalAction.ADJUST_BID,
    ApprovalAction.REPLACE_CREATIVE,
    ApprovalAction.CHANGE_BUDGET
  ]

  const statuses: ApprovalStatus[] = [
    ApprovalStatus.PENDING,
    ApprovalStatus.OPTIMIZER_APPROVED,
    ApprovalStatus.SUPERVISOR_APPROVED,
    ApprovalStatus.DIRECTOR_APPROVED,
    ApprovalStatus.COMPLETED,
    ApprovalStatus.REJECTED
  ]

  const positions = [
    '微信朋友圈-首屏',
    '抖音-信息流',
    '百度搜索-首位',
    '小红书-发现页',
    '快手-视频流'
  ]

  return Array.from({ length: 15 }, (_, i) => {
    const status = statuses[i % statuses.length]
    return {
      id: `app-${i + 1}`,
      alertId: `alert-${i + 1}`,
      scheduleId: `sch-${i + 1}`,
      action: actions[i % actions.length],
      actionDetails: {
        oldValue: 0.5,
        newValue: 0.8
      },
      reason: `检测到${positions[i % positions.length]}${i % 2 === 0 ? '转化率持续走低' : 'ROI低于预期'}，建议${
        actions[i % actions.length] === ApprovalAction.PAUSE ? '暂停投放' :
        actions[i % actions.length] === ApprovalAction.ADJUST_BID ? '调整出价' :
        actions[i % actions.length] === ApprovalAction.REPLACE_CREATIVE ? '更换创意素材' : '调整预算'
      }`,
      status,
      optimizerId: mockUsers[0].id,
      optimizerComment: '经过分析，确有必要进行调整，建议批准',
      optimizerTime: status !== ApprovalStatus.PENDING ? new Date(Date.now() - (i + 5) * 3600000).toISOString() : undefined,
      supervisorId: [ApprovalStatus.SUPERVISOR_APPROVED, ApprovalStatus.DIRECTOR_APPROVED, ApprovalStatus.COMPLETED].includes(status) ? mockUsers[1].id : undefined,
      supervisorComment: [ApprovalStatus.SUPERVISOR_APPROVED, ApprovalStatus.DIRECTOR_APPROVED, ApprovalStatus.COMPLETED].includes(status) ? '复核通过，数据异常确实存在，同意调整方案' : undefined,
      supervisorTime: [ApprovalStatus.SUPERVISOR_APPROVED, ApprovalStatus.DIRECTOR_APPROVED, ApprovalStatus.COMPLETED].includes(status) ? new Date(Date.now() - (i + 3) * 3600000).toISOString() : undefined,
      directorId: [ApprovalStatus.DIRECTOR_APPROVED, ApprovalStatus.COMPLETED].includes(status) ? mockUsers[2].id : status === ApprovalStatus.REJECTED ? mockUsers[2].id : undefined,
      directorComment: status === ApprovalStatus.REJECTED ? '调整幅度过大，建议重新评估' : [ApprovalStatus.DIRECTOR_APPROVED, ApprovalStatus.COMPLETED].includes(status) ? '批准执行，密切关注效果变化' : undefined,
      directorTime: [ApprovalStatus.DIRECTOR_APPROVED, ApprovalStatus.COMPLETED, ApprovalStatus.REJECTED].includes(status) ? new Date(Date.now() - (i + 1) * 3600000).toISOString() : undefined,
      createdAt: new Date(Date.now() - (i + 10) * 3600000).toISOString(),
      completedAt: [ApprovalStatus.COMPLETED, ApprovalStatus.REJECTED].includes(status) ? new Date(Date.now() - i * 3600000).toISOString() : undefined
    }
  })
}

export const getApprovals = (params: ApprovalListParams): Promise<{ list: ApprovalRequest[]; total: number }> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const all = generateMockApprovals()
      let filtered = all
      if (params.tab === 'pending') {
        filtered = all.filter(a =>
          [ApprovalStatus.PENDING, ApprovalStatus.OPTIMIZER_APPROVED, ApprovalStatus.SUPERVISOR_APPROVED].includes(a.status)
        )
      } else if (params.tab === 'initiated') {
        filtered = all.filter(a => a.optimizerId === '1')
      } else {
        filtered = all.filter(a =>
          [ApprovalStatus.DIRECTOR_APPROVED, ApprovalStatus.COMPLETED, ApprovalStatus.REJECTED].includes(a.status)
        )
      }
      resolve({
        list: filtered,
        total: filtered.length
      })
    }, 300)
  })
}

export const getApprovalDetail = (_id: string): Promise<ApprovalRequest> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const all = generateMockApprovals()
      resolve(all[0])
    }, 200)
  })
}

export const submitApproval = (data: Partial<ApprovalRequest>): Promise<ApprovalRequest> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: 'app-new',
        alertId: data.alertId || '',
        scheduleId: data.scheduleId || '',
        action: data.action || ApprovalAction.ADJUST_BID,
        actionDetails: data.actionDetails || {},
        reason: data.reason || '',
        status: ApprovalStatus.PENDING,
        createdAt: new Date().toISOString()
      })
    }, 300)
  })
}

export const approveApproval = (_id: string, _level: number, _comment: string): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, 300)
  })
}

export const rejectApproval = (_id: string, _level: number, _comment: string): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, 300)
  })
}
