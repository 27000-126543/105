import { get, post, put, del } from './request'
import { Channel, AdPosition } from '@shared/types'

export const getChannels = (): Promise<Channel[]> => {
  return get<Channel[]>('/channels')
}

export const getChannelById = (id: string): Promise<Channel & { positions: AdPosition[] }> => {
  return get<Channel & { positions: AdPosition[] }>(`/channels/${id}`)
}

export const getChannelPositions = (channelId: string): Promise<AdPosition[]> => {
  return get<AdPosition[]>(`/channels/${channelId}/positions`)
}

export const createChannel = (data: Partial<Channel>): Promise<Channel> => {
  return post<Channel>('/channels', data)
}

export const updateChannel = (id: string, data: Partial<Channel>): Promise<Channel> => {
  return put<Channel>(`/channels/${id}`, data)
}

export const toggleChannelStatus = (id: string, enabled: boolean): Promise<void> => {
  return put<void>(`/channels/${id}`, { enabled })
}

export const deleteChannel = (id: string): Promise<void> => {
  return del<void>(`/channels/${id}`)
}
