import { WeeklyReport } from '@shared/types'

export interface ReportListParams {
  advertiserId?: string
  page?: number
  pageSize?: number
}

const generateMockReports = (): WeeklyReport[] => {
  return Array.from({ length: 10 }, (_, i) => {
    const endDate = new Date(Date.now() - i * 7 * 24 * 3600000)
    const startDate = new Date(endDate.getTime() - 6 * 24 * 3600000)

    return {
      id: `report-${i + 1}`,
      advertiserId: `adv${(i % 5) + 1}`,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      generatedAt: new Date(endDate.getTime() + 2 * 3600000).toISOString(),
      summary: {
        totalImpressions: Math.floor(Math.random() * 10000000) + 1000000,
        totalClicks: Math.floor(Math.random() * 500000) + 50000,
        totalConversions: Math.floor(Math.random() * 50000) + 5000,
        totalCost: Math.floor(Math.random() * 1000000) + 100000,
        totalRevenue: Math.floor(Math.random() * 3000000) + 300000,
        avgCtr: 0.03 + Math.random() * 0.05,
        avgCvr: 0.02 + Math.random() * 0.08,
        avgRoi: 2 + Math.random() * 3
      },
      weekOverWeek: {
        impressionsChange: (Math.random() - 0.5) * 0.4,
        clicksChange: (Math.random() - 0.5) * 0.4,
        conversionsChange: (Math.random() - 0.5) * 0.4,
        costChange: (Math.random() - 0.5) * 0.3,
        ctrChange: (Math.random() - 0.5) * 0.2,
        cvrChange: (Math.random() - 0.5) * 0.2,
        roiChange: (Math.random() - 0.5) * 0.3
      },
      anomalies: [
        {
          type: 'ctr_drop',
          description: '周三CTR出现明显下降，较周二下降25%',
          severity: 'high',
          detectedAt: new Date(startDate.getTime() + 3 * 24 * 3600000).toISOString()
        },
        {
          type: 'cost_spike',
          description: '周五晚高峰时段CPC成本异常升高',
          severity: 'medium',
          detectedAt: new Date(startDate.getTime() + 5 * 24 * 3600000).toISOString()
        },
        {
          type: 'cvr_drop',
          description: '微信渠道转化率持续低于预期',
          severity: i % 2 === 0 ? 'high' : 'low',
          detectedAt: new Date(startDate.getTime() + 2 * 24 * 3600000).toISOString()
        }
      ],
      clickAttribution: [
        { channel: '微信', percentage: 35 + Math.random() * 10, assistedConversions: Math.floor(Math.random() * 500) + 200 },
        { channel: '抖音', percentage: 25 + Math.random() * 10, assistedConversions: Math.floor(Math.random() * 400) + 150 },
        { channel: '百度', percentage: 15 + Math.random() * 10, assistedConversions: Math.floor(Math.random() * 300) + 100 },
        { channel: '小红书', percentage: 12 + Math.random() * 8, assistedConversions: Math.floor(Math.random() * 200) + 80 },
        { channel: '其他', percentage: 8 + Math.random() * 5, assistedConversions: Math.floor(Math.random() * 150) + 50 }
      ],
      recommendations: [
        {
          category: 'budget',
          priority: 'high',
          description: '建议将抖音渠道预算增加20%，该渠道ROI表现持续优秀',
          expectedBenefit: '预计整体ROI提升10-15%'
        },
        {
          category: 'creative',
          priority: 'medium',
          description: '微信渠道素材点击率下降明显，建议更换3-5组新素材进行测试',
          expectedBenefit: '预计CTR回升至4%以上'
        },
        {
          category: 'targeting',
          priority: 'medium',
          description: '25-34岁女性受众转化率最高，建议增加该人群定向投放',
          expectedBenefit: '预计整体CVR提升5-8%'
        },
        {
          category: 'bidding',
          priority: 'low',
          description: '建议在非高峰时段降低出价，优化投放成本',
          expectedBenefit: '预计CPC降低8-10%'
        }
      ]
    }
  })
}

export const getReports = (params: ReportListParams): Promise<{ list: WeeklyReport[]; total: number }> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      let all = generateMockReports()
      if (params.advertiserId) {
        all = all.filter(r => r.advertiserId === params.advertiserId)
      }
      resolve({
        list: all,
        total: all.length
      })
    }, 300)
  })
}

export const getReportDetail = (_id: string): Promise<WeeklyReport> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(generateMockReports()[0])
    }, 300)
  })
}

export const generateReport = (params: {
  advertiserId?: string
  startDate: string
  endDate: string
}): Promise<WeeklyReport> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: 'report-' + Date.now(),
        ...params,
        generatedAt: new Date().toISOString(),
        summary: {
          totalImpressions: 5000000,
          totalClicks: 200000,
          totalConversions: 20000,
          totalCost: 500000,
          totalRevenue: 1500000,
          avgCtr: 0.04,
          avgCvr: 0.1,
          avgRoi: 3.0
        },
        weekOverWeek: {
          impressionsChange: 0.1,
          clicksChange: 0.15,
          conversionsChange: 0.2,
          costChange: 0.05,
          ctrChange: 0.05,
          cvrChange: 0.08,
          roiChange: 0.12
        },
        anomalies: [],
        clickAttribution: [],
        recommendations: []
      })
    }, 1000)
  })
}

export const exportReport = (_id: string): Promise<Blob> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const csvContent = '数据导出内容'
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      resolve(blob)
    }, 500)
  })
}
