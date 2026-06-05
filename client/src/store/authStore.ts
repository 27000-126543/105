import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, UserRole, AuthContext } from '@shared/types'
import { login as loginApi } from '@/api/auth'
import { message } from 'antd'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  permissions: AuthContext['permissions'] | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  setUser: (user: User) => void
}

const createPermissions = (user: User): AuthContext['permissions'] => {
  return {
    canViewAdvertiser: (advertiserId: string) => {
      if (user.role === UserRole.ADMIN || user.role === UserRole.STRATEGY_DIRECTOR ||
          user.role === UserRole.MEDIA_SUPERVISOR || user.role === UserRole.OPTIMIZER) {
        return true
      }
      if (user.role === UserRole.ADVERTISER && user.advertiserIds) {
        return user.advertiserIds.includes(advertiserId)
      }
      if (user.role === UserRole.AGENCY && user.agencyIds) {
        return true
      }
      return true
    },
    canViewChannel: (channelId: string) => {
      if (user.role === UserRole.ADMIN || user.role === UserRole.STRATEGY_DIRECTOR ||
          user.role === UserRole.MEDIA_SUPERVISOR || user.role === UserRole.OPTIMIZER) {
        return true
      }
      if (user.role === UserRole.MEDIA && user.mediaIds) {
        return user.mediaIds.includes(channelId)
      }
      return true
    },
    canEdit: () => {
      return user.role === UserRole.ADMIN || user.role === UserRole.OPTIMIZER || user.role === UserRole.MEDIA_SUPERVISOR || user.role === UserRole.STRATEGY_DIRECTOR
    },
    canApproveLevel: (level: number) => {
      if (level === 1) return user.role === UserRole.OPTIMIZER || user.role === UserRole.MEDIA_SUPERVISOR || user.role === UserRole.STRATEGY_DIRECTOR || user.role === UserRole.ADMIN
      if (level === 2) return user.role === UserRole.MEDIA_SUPERVISOR || user.role === UserRole.STRATEGY_DIRECTOR || user.role === UserRole.ADMIN
      if (level === 3) return user.role === UserRole.STRATEGY_DIRECTOR || user.role === UserRole.ADMIN
      return false
    }
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      permissions: null,

      login: async (username: string, password: string) => {
        try {
          const result = await loginApi({ username, password })
          const { token, user } = result

          const permissions = createPermissions(user)

          set({
            user,
            token,
            isAuthenticated: true,
            permissions
          })

          message.success(`欢迎回来，${user.name}`)
        } catch (error: any) {
          message.error(error.message || '登录失败，请检查用户名和密码')
          throw error
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          permissions: null
        })
        message.success('已退出登录')
      },

      setUser: (user: User) => {
        const permissions = createPermissions(user)
        set({ user, permissions })
      }
    }),
    {
      name: 'auth-storage'
    }
  )
)
