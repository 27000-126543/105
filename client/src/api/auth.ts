import { post, get } from './request'
import { User } from '@shared/types'

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  user: User
}

export const login = (data: LoginRequest): Promise<LoginResponse> => {
  return post<LoginResponse>('/auth/login', data)
}

export const logout = (): Promise<void> => {
  return post<void>('/auth/logout')
}

export const getCurrentUser = (): Promise<User> => {
  return get<User>('/auth/me')
}
