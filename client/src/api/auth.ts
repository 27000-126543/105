import { post } from './request'
import { User, UserRole } from '@shared/types'

export interface LoginRequest {
  username: string
  password: string
  role: UserRole
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
  return post<User>('/auth/me')
}
