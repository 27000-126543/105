import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, UserRole, AuthContext } from '@shared/types'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  permissions: AuthContext['permissions'] | null
  login: (username: string, password: string, role: UserRole) => Promise<void>
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
      return [UserRole.ADMIN, UserRole.OPTIMIZER, UserRole.MEDIA_SUPERVISOR, UserRole.STRATEGY_DIRECTOR].includes(user.role)
    },
    canApproveLevel: (level: number) => {
      if (level === 1) return [UserRole.OPTIMIZER, UserRole.MEDIA_SUPERVISOR, UserRole.STRATEGY_DIRECTOR, UserRole.ADMIN].includes(user.role)
      if (level === 2) return [UserRole.MEDIA_SUPERVISOR, UserRole.STRATEGY_DIRECTOR, UserRole.ADMIN].includes(user.role)
      if (level === 3) return [UserRole.STRATEGY_DIRECTOR, UserRole.ADMIN].includes(user.role)
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

      login: async (_username: string, _password: string, role: UserRole) => {
        await new Promise(resolve => setTimeout(resolve, 500))

        const mockUsers: Record<UserRole, User> = {
          [UserRole.OPTIMIZER]: {
            id: '1',
            username: 'optimizer',
            name: '张优化',
            role: UserRole.OPTIMIZER,
            email: 'optimizer@example.com',
            phone: '13800138001',
            createdAt: '2024-01-01T00:00:00Z',
            lastLogin: new Date().toISOString()
          },
          [UserRole.MEDIA_SUPERVISOR]: {
            id: '2',
            username: 'supervisor',
            name: '李主管',
            role: UserRole.MEDIA_SUPERVISOR,
            email: 'supervisor@example.com',
            phone: '13800138002',
            createdAt: '2024-01-01T00:00:00Z',
            lastLogin: new Date().toISOString()
          },
          [UserRole.STRATEGY_DIRECTOR]: {
            id: '3',
            username: 'director',
            name: '王总监',
            role: UserRole.STRATEGY_DIRECTOR,
            email: 'director@example.com',
            phone: '13800138003',
            createdAt: '2024-01-01T00:00:00Z',
            lastLogin: new Date().toISOString()
          },
          [UserRole.ADVERTISER]: {
            id: '4',
            username: 'advertiser',
            name: '陈广告主',
            role: UserRole.ADVERTISER,
            email: 'advertiser@example.com',
            phone: '13800138004',
            advertiserIds: ['adv1', 'adv2'],
            createdAt: '2024-01-01T00:00:00Z',
            lastLogin: new Date().toISOString()
          },
          [UserRole.AGENCY]: {
            id: '5',
            username: 'agency',
            name: '刘代理',
            role: UserRole.AGENCY,
            email: 'agency@example.com',
            phone: '13800138005',
            agencyIds: ['ag1'],
            createdAt: '2024-01-01T00:00:00Z',
            lastLogin: new Date().toISOString()
          },
          [UserRole.MEDIA]: {
            id: '6',
            username: 'media',
            name: '赵媒体',
            role: UserRole.MEDIA,
            email: 'media@example.com',
            phone: '13800138006',
            mediaIds: ['ch1', 'ch2'],
            createdAt: '2024-01-01T00:00:00Z',
            lastLogin: new Date().toISOString()
          },
          [UserRole.ADMIN]: {
            id: '0',
            username: 'admin',
            name: '管理员',
            role: UserRole.ADMIN,
            email: 'admin@example.com',
            phone: '13800138000',
            createdAt: '2024-01-01T00:00:00Z',
            lastLogin: new Date().toISOString()
          }
        }

        const user = mockUsers[role]
        const permissions = createPermissions(user)

        set({
          user,
          token: 'mock-token-' + Date.now(),
          isAuthenticated: true,
          permissions
        })
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          permissions: null
        })
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
