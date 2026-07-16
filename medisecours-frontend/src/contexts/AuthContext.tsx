'use client'

import { createContext, useContext, useCallback, useSyncExternalStore, type ReactNode } from 'react'
import api from '../api/axios'
import { setAuthCookie, clearAuthCookie } from '../lib/cookies'

const AUTH_EVENT = 'medisecours-auth-change'

function subscribeAuth(onStoreChange: () => void) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('storage', onStoreChange)
  window.addEventListener(AUTH_EVENT, onStoreChange)
  return () => {
    window.removeEventListener('storage', onStoreChange)
    window.removeEventListener(AUTH_EVENT, onStoreChange)
  }
}

function getTokenSnapshot() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('medisecours_token')
}

let cachedUserRaw: string | undefined = undefined
let cachedUser: any = null

function getUserSnapshot() {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem('medisecours_user')
  if (raw === cachedUserRaw) return cachedUser
  cachedUserRaw = raw ?? undefined
  if (!raw) {
    cachedUser = null
    return null
  }
  try {
    cachedUser = JSON.parse(raw)
  } catch {
    cachedUser = null
  }
  return cachedUser
}

function notifyAuthChange() {
  cachedUserRaw = undefined
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_EVENT))
  }
}

const AuthContext = createContext<any>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const token = useSyncExternalStore(subscribeAuth, getTokenSnapshot, () => null)
  const user = useSyncExternalStore(subscribeAuth, getUserSnapshot, () => null)
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)

  const persist = useCallback((newToken: string, newUser: any) => {
    localStorage.setItem('medisecours_token', newToken)
    localStorage.setItem('medisecours_user', JSON.stringify(newUser))
    setAuthCookie(newToken)
    notifyAuthChange()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/api/auth/login', { email, password })
    persist(data.token, data.user)
    return data.user
  }, [persist])

  const loginWithGoogle = useCallback(async (googleIdToken: string) => {
    const { data } = await api.post('/api/auth/google', { googleIdToken })
    persist(data.token, data.user)
    return data.user
  }, [persist])

  const register = useCallback(async (payload: any) => {
    const { data } = await api.post('/api/auth/register', payload)
    return data
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('medisecours_token')
    localStorage.removeItem('medisecours_user')
    clearAuthCookie()
    notifyAuthChange()
  }, [])

  const updateUser = useCallback((newUser: any) => {
    localStorage.setItem('medisecours_user', JSON.stringify(newUser))
    notifyAuthChange()
  }, [])

  const isAuthenticated = Boolean(token)
  const isAdmin = Boolean(user?.roles?.includes('ROLE_ADMIN'))
  const isMedecin = Boolean(user?.roles?.includes('ROLE_MEDECIN'))

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated, isAdmin, isMedecin, mounted, login, loginWithGoogle, register, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext doit être utilisé dans un AuthProvider')
  return ctx
}
