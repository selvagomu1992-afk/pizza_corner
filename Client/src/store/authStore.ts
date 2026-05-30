import { create } from 'zustand'
import api, { setUseDeliveryToken } from '../api/client'
import type { User } from '../types'

interface AuthState {
  user: User | null
  token: string | null
  isAdmin: boolean
  isDelivery: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  deliveryLogin: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>
  logout: () => void
  loadUser: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
}

const STORAGE_KEY_TOKEN = 'token'
const STORAGE_KEY_USER = 'user'
const STORAGE_KEY_DELIVERY_TOKEN = 'delivery_token'
const STORAGE_KEY_DELIVERY_USER = 'delivery_user'

const deliveryToken = localStorage.getItem(STORAGE_KEY_DELIVERY_TOKEN)
const deliveryUserStr = localStorage.getItem(STORAGE_KEY_DELIVERY_USER)

// Sync interceptor token preference on init
// If both tokens exist, prefer the regular token (stale delivery token edge case)
setUseDeliveryToken(!!deliveryToken && !localStorage.getItem(STORAGE_KEY_TOKEN))

export const useAuthStore = create<AuthState>((set, get) => ({
  user: deliveryToken
    ? (JSON.parse(deliveryUserStr || 'null'))
    : JSON.parse(localStorage.getItem(STORAGE_KEY_USER) || 'null'),
  token: deliveryToken || localStorage.getItem(STORAGE_KEY_TOKEN),
  isAdmin: deliveryToken ? false : (JSON.parse(localStorage.getItem(STORAGE_KEY_USER) || '{}')?.isAdmin || false),
  isDelivery: !!deliveryToken,
  loading: false,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    if (!data.success) throw new Error(data.message)
    localStorage.removeItem(STORAGE_KEY_DELIVERY_TOKEN)
    localStorage.removeItem(STORAGE_KEY_DELIVERY_USER)
    localStorage.setItem(STORAGE_KEY_TOKEN, data.token)
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user))
    setUseDeliveryToken(false)
    set({ user: data.user, token: data.token, isAdmin: data.user.isAdmin, isDelivery: false })
  },

  deliveryLogin: async (email, password) => {
    const { data } = await api.post('/auth/delivery/login', { email, password })
    if (!data.success) throw new Error(data.message)
    localStorage.removeItem(STORAGE_KEY_TOKEN)
    localStorage.removeItem(STORAGE_KEY_USER)
    localStorage.setItem(STORAGE_KEY_DELIVERY_TOKEN, data.token)
    localStorage.setItem(STORAGE_KEY_DELIVERY_USER, JSON.stringify(data.partner))
    setUseDeliveryToken(true)
    set({ user: data.partner, token: data.token, isAdmin: false, isDelivery: true })
  },

  register: async (name, email, password, phone) => {
    const { data } = await api.post('/auth/register', { name, email, password, phone })
    if (!data.success) throw new Error(data.message)
    localStorage.removeItem(STORAGE_KEY_DELIVERY_TOKEN)
    localStorage.removeItem(STORAGE_KEY_DELIVERY_USER)
    localStorage.setItem(STORAGE_KEY_TOKEN, data.token)
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user))
    setUseDeliveryToken(false)
    set({ user: data.user, token: data.token, isAdmin: false, isDelivery: false })
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY_TOKEN)
    localStorage.removeItem(STORAGE_KEY_USER)
    localStorage.removeItem(STORAGE_KEY_DELIVERY_TOKEN)
    localStorage.removeItem(STORAGE_KEY_DELIVERY_USER)
    setUseDeliveryToken(false)
    set({ user: null, token: null, isAdmin: false, isDelivery: false })
  },

  loadUser: async () => {
    const token = get().token
    if (!token) return
    set({ loading: true })
    try {
      const { data } = await api.get('/auth/profile')
      if (data.success) {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user))
        set({ user: data.user, isAdmin: data.user.isAdmin, loading: false })
      }
    } catch {
      set({ loading: false })
    }
  },

  updateProfile: async (profileData) => {
    const { data } = await api.patch('/auth/profile', profileData)
    if (!data.success) throw new Error(data.message)
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user))
    set({ user: data.user })
  },
}))
