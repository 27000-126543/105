import { get, post, put } from './request'
import { AdSchedule, ForecastResult } from '@shared/types'

export interface ScheduleListParams {
  status?: AdSchedule['status']
  page?: number
  pageSize?: number
}

export interface ScheduleListResponse {
  schedules: AdSchedule[]
  total: number
}

export const getSchedules = (params: ScheduleListParams): Promise<ScheduleListResponse> => {
  const queryParams: any = {}
  if (params.status) queryParams.status = params.status
  if (params.page) queryParams.offset = (params.page - 1) * (params.pageSize || 10)
  if (params.pageSize) queryParams.limit = params.pageSize

  return get<ScheduleListResponse>('/schedules', { params: queryParams })
}

export const getScheduleDetail = (id: string): Promise<AdSchedule> => {
  return get<AdSchedule>(`/schedules/${id}`)
}

export const uploadScheduleExcel = (file: File): Promise<{ success: boolean; count: number }> => {
  const formData = new FormData()
  formData.append('file', file)

  return post<{ success: boolean; count: number }>('/schedules/upload-excel', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

export const uploadCreative = (file: File): Promise<{ id: string; url: string }> => {
  const formData = new FormData()
  formData.append('file', file)

  return post<{ id: string; url: string }>('/creatives/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

export const getForecast = (scheduleId: string): Promise<ForecastResult> => {
  return get<ForecastResult>(`/schedules/${scheduleId}/forecast`)
}

export const createSchedule = (data: Partial<AdSchedule>): Promise<AdSchedule> => {
  return post<AdSchedule>('/schedules', data)
}

export const updateSchedule = (id: string, data: Partial<AdSchedule>): Promise<AdSchedule> => {
  return put<AdSchedule>(`/schedules/${id}`, data)
}

export const updateScheduleStatus = (id: string, status: AdSchedule['status']): Promise<void> => {
  return put<void>(`/schedules/${id}`, { status })
}
