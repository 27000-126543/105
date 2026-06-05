import { Channel, AdPosition, ChannelType } from '@shared/types'

export const getChannels = (): Promise<Channel[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { id: 'ch1', name: '微信广告', type: ChannelType.SOCIAL, enabled: true },
        { id: 'ch2', name: '抖音广告', type: ChannelType.VIDEO, enabled: true },
        { id: 'ch3', name: '百度搜索', type: ChannelType.SEARCH, enabled: true },
        { id: 'ch4', name: '小红书', type: ChannelType.SOCIAL, enabled: true },
        { id: 'ch5', name: '快手', type: ChannelType.VIDEO, enabled: true },
        { id: 'ch6', name: '微博', type: ChannelType.SOCIAL, enabled: true },
        { id: 'ch7', name: 'Bilibili', type: ChannelType.VIDEO, enabled: true },
        { id: 'ch8', name: '知乎', type: ChannelType.SOCIAL, enabled: true }
      ])
    }, 200)
  })
}

export const getChannelById = (id: string): Promise<Channel> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id,
        name: '渠道名称',
        type: ChannelType.SOCIAL,
        enabled: true
      })
    }, 200)
  })
}

export const getChannelPositions = (channelId: string): Promise<AdPosition[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { id: `${channelId}-pos1`, name: '首屏广告', channelId, size: '1080x1920', location: '首页', basePrice: 100 },
        { id: `${channelId}-pos2`, name: '信息流广告', channelId, size: '1080x1080', location: '信息流', basePrice: 50 },
        { id: `${channelId}-pos3`, name: '搜索首位', channelId, size: '640x100', location: '搜索结果', basePrice: 200 },
        { id: `${channelId}-pos4`, name: '视频前贴片', channelId, size: '1920x1080', location: '视频播放', basePrice: 150 }
      ])
    }, 200)
  })
}

export const createChannel = (data: Partial<Channel>): Promise<Channel> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: 'ch-' + Date.now(),
        ...data,
        enabled: true
      } as Channel)
    }, 300)
  })
}

export const updateChannel = (id: string, data: Partial<Channel>): Promise<Channel> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id,
        ...data
      } as Channel)
    }, 300)
  })
}

export const toggleChannelStatus = (_id: string, _enabled: boolean): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, 200)
  })
}
