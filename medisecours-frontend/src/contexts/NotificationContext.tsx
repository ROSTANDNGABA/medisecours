'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../hooks/useAuth'
import { useUnreadCount } from '../hooks/useUnreadCount'
import { useConsultationCount } from '../hooks/useConsultationCount'
import { useWebSocket } from '../hooks/useWebSocket'
import useSWR, { mutate as globalMutate } from 'swr'
import api from '../api/axios'

const rawFetcher = async (url: string) => {
  const res = await api.get(url)
  return res.data
}

export interface NotifItem {
  id: string
  type: 'message' | 'consultation_open' | 'consultation_closed'
  title: string
  description: string
  time: string
  unread: boolean
  href: string
  sender?: any
}

interface NotificationContextValue {
  notifications: NotifItem[]
  notifLoading: boolean
  unreadCount: number
  consultationCount: number
  pendingConsultationCount: number
  notificationCount: number
  openNotif: () => Promise<void>
  dismissNotif: (id: string, href?: string) => Promise<void>
  closeNotif: () => void
  notifOpen: boolean
  msgNotifications: NotifItem[]
  msgLoading: boolean
  msgOpen: boolean
  openMsg: () => Promise<void>
  dismissMsg: (id: string, href?: string) => Promise<void>
  markConversationAsRead: (convId: string) => void
  closeMsg: () => void
  msgDisplayCount: number
  activeConversationId: string | null
  setActiveConversationId: (id: string | null) => void
  subscribeToMessages: (handler: (msg: any) => void) => () => void
  onlineUsers: Set<string>
}

const NotificationCtx = createContext<NotificationContextValue>(null!)

function loadSet(key: string): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveSet(key: string, set: Set<string>) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(key, JSON.stringify([...set])) } catch { /* ignore */ }
}

function msgToItem(m: any, rawId: (v: any) => any): NotifItem {
  return {
    id: `msg-${m.id}`,
    type: 'message' as const,
    title: m.contenu?.slice(0, 80) || 'Message',
    description: m.contenu?.slice(0, 80) || 'Message',
    time: m.createdAt,
    unread: true,
    href: `/medecin/messages?id=${rawId(m.conversation)}`,
    sender: typeof m.expediteur === 'object' ? m.expediteur : null,
  }
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { unreadCount } = useUnreadCount()
  const { consultationCount: openConsultationCount } = useConsultationCount()
  const router = useRouter()

  const token = typeof window !== 'undefined' ? localStorage.getItem('medisecours_token') : null

  // Consultations for sidebar badge: fetch all and filter client-side by 'En attente'
  const { data: consData } = useSWR(
    user ? '/api/consultations?itemsPerPage=200&order[createdAt]=desc' : null,
    rawFetcher,
    { refreshInterval: 15000, revalidateOnFocus: true }
  )
  const allCons = consData?.['hydra:member'] ?? consData?.member ?? (Array.isArray(consData) ? consData : [])
  const pendingConsultationCount = allCons.filter((c: any) => c.statut === 'En attente').length

  // Dismissed IDs for notification bell (persisted)
  const [dismissedNotifIds, setDismissedNotifIds] = useState<Set<string>>(new Set(loadSet('notifDismissed')))
  useEffect(() => { saveSet('notifDismissed', dismissedNotifIds) }, [dismissedNotifIds])

  // Conversations whose messages have been read (immune to SWR overwrite)
  const [readConversationIds, setReadConversationIds] = useState<Set<string>>(new Set(loadSet('readConvs')))
  useEffect(() => { saveSet('readConvs', readConversationIds) }, [readConversationIds])

  // Dropdown open state
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifLoading, setNotifLoading] = useState(false)
  const [notifications, setNotifications] = useState<NotifItem[]>([])

  const [msgOpen, setMsgOpen] = useState(false)
  const [msgLoading, setMsgLoading] = useState(false)
  const [msgItems, setMsgItems] = useState<NotifItem[]>([])

  // Global Event Bus state for messaging
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const messageHandlers = React.useRef<((msg: any) => void)[]>([])

  const subscribeToMessages = useCallback((handler: (msg: any) => void) => {
    messageHandlers.current.push(handler)
    return () => {
      messageHandlers.current = messageHandlers.current.filter((h) => h !== handler)
    }
  }, [])

  const rawId = useCallback((val: any) => {
    if (!val) return null
    if (typeof val === 'object') return val.id
    return val.split('/').pop()
  }, [])

  // Polling fallback refresh (marche même sans WebSocket)
  const { data: msgsData } = useSWR(
    user?.id ? '/api/messages?itemsPerPage=50&order[createdAt]=desc' : null,
    rawFetcher,
    { refreshInterval: 15000, revalidateOnFocus: true }
  )

  useEffect(() => {
    if (!msgsData) return
    const raw = msgsData?.['hydra:member'] ?? msgsData?.member ?? (Array.isArray(msgsData) ? msgsData : [])
    const items: NotifItem[] = []
    for (const m of raw) {
      if (rawId(m.expediteur) === user?.id) continue
      if (m.statut === 'LU') continue
      const convId = rawId(m.conversation)
      if (convId && readConversationIds.has(convId)) continue
      items.push(msgToItem(m, rawId))
    }
    items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    setMsgItems(items)
  }, [msgsData, user?.id, rawId, readConversationIds])

  // WebSocket: central connection for the whole app
  useWebSocket(user?.id || '', token || '', {
    onNewMessage: (payload: any) => {
      // 1. Trigger all registered handlers (page.tsx)
      messageHandlers.current.forEach((h) => h(payload))

      if (!payload || rawId(payload.expediteur) === user?.id) return
      
      const convId = String(rawId(payload.conversation))
      // 2. If the user is actively viewing this conversation, DO NOT increment unread counts or show bell notification
      if (convId === activeConversationId) return
      
      const newItem = msgToItem(payload, rawId)
      
      setMsgItems((prev) => {
        if (prev.some((x) => x.id === newItem.id)) return prev
        return [newItem, ...prev]
      })

      setNotifications((prev) => {
        if (prev.some((x) => x.id === newItem.id)) return prev
        return [newItem, ...prev].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      })

      globalMutate('/api/messages/unread-count', (data: any) => {
        if (!data) return { unreadCount: 1 }
        return { unreadCount: data.unreadCount + 1 }
      }, { revalidate: false })
    },
    onMessageRead: (payload: any) => {
      messageHandlers.current.forEach((h) => h({ _type: 'message_read', ...payload }))
      globalMutate('/api/messages/unread-count')
    },
    onUserOnline: (payload: any) => {
      if (payload?.userId) {
        setOnlineUsers(prev => {
          const next = new Set(prev)
          next.add(String(payload.userId))
          return next
        })
      }
    },
    onUserOffline: (payload: any) => {
      if (payload?.userId) {
        setOnlineUsers(prev => {
          const next = new Set(prev)
          next.delete(String(payload.userId))
          return next
        })
      }
    }
  })

  // Open notification dropdown — fetch messages + consultations
  const openNotif = useCallback(async () => {
    if (notifOpen) { setNotifOpen(false); return }
    setNotifLoading(true)
    setNotifOpen(true)
    try {
      const [msgsRes, consRes] = await Promise.all([
        api.get('/api/messages?itemsPerPage=20&order[createdAt]=desc'),
        api.get('/api/consultations?itemsPerPage=10&order[createdAt]=desc'),
      ])
      const items: NotifItem[] = []
      const msgs = msgsRes.data?.['hydra:member'] ?? msgsRes.data?.member ?? (Array.isArray(msgsRes.data) ? msgsRes.data : [])
      for (const m of msgs) {
        if (rawId(m.expediteur) === user?.id) continue
        items.push({
          id: `msg-${m.id}`,
          type: 'message',
          title: 'Nouveau message',
          description: m.contenu?.slice(0, 100) || 'Message reçu',
          time: m.createdAt,
          unread: m.statut !== 'LU',
          href: `/medecin/messages?id=${rawId(m.conversation)}`,
          sender: typeof m.expediteur === 'object' ? m.expediteur : null,
        })
      }
      const cons = consRes.data?.['hydra:member'] ?? consRes.data?.member ?? (Array.isArray(consRes.data) ? consRes.data : [])
      for (const c of cons) {
        if (c.statut === 'OUVERTE') {
          items.push({
            id: `cons-${c.id}`,
            type: 'consultation_open',
            title: 'Nouvelle demande',
            description: `${c.patient?.prenom || ''} ${c.patient?.nom || ''}${c.motif ? ' : ' + c.motif?.slice(0, 80) : ''}`,
            time: c.createdAt,
            unread: true,
            href: `/medecin/consultations?id=${c.id}`,
            sender: c.patient,
          })
        }
        if (c.statut === 'TERMINEE') {
          items.push({
            id: `cons-closed-${c.id}`,
            type: 'consultation_closed',
            title: 'Consultation terminée',
            description: `${c.patient?.prenom || ''} ${c.patient?.nom || ''} — Clôturée`,
            time: c.closedAt || c.createdAt,
            unread: false,
            href: `/medecin/consultations?id=${c.id}`,
            sender: c.patient,
          })
        }
      }
      items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      setNotifications(items.filter(item => !dismissedNotifIds.has(item.id)))
    } catch { /* ignore */ }
    setNotifLoading(false)
  }, [notifOpen, user, rawId, dismissedNotifIds])

  const closeNotif = useCallback(() => setNotifOpen(false), [])

  const dismissNotif = useCallback(async (id: string, href?: string) => {
    const isMsg = id.startsWith('msg-')
    const entityId = id.replace(/^(msg|cons)-/, '')
    setDismissedNotifIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      try { localStorage.setItem('notifDismissed', JSON.stringify([...next])) } catch { /* ignore */ }
      return next
    })
    setNotifications((prev) => prev.filter((x) => x.id !== id))
    setNotifOpen(false)
    if (isMsg) {
      // Decrease SWR unread count so sidebar updates
      globalMutate('/api/messages/unread-count', (data: any) => {
        if (!data || data.unreadCount <= 0) return { unreadCount: 0 }
        return { unreadCount: data.unreadCount - 1 }
      }, { revalidate: false })
      
      try {
        await api.patch(`/api/messages/${entityId}`, { statut: 'LU' }, { headers: { 'Content-Type': 'application/merge-patch+json' } })
      } catch { /* best effort */ }
    }
    if (href) router.push(href)
  }, [router])

  const markConversationAsRead = useCallback((convId: string) => {
    setReadConversationIds((prev) => {
      if (prev.has(convId)) return prev
      const next = new Set(prev)
      next.add(convId)
      return next
    })

    setMsgItems((prev) => {
      const toRemove = prev.filter((m) => {
        const id = m.href.split('id=')[1]?.split('&')[0]
        return id === convId
      })
      if (toRemove.length === 0) return prev

      const removeIds = new Set(toRemove.map((m) => m.id))

      globalMutate('/api/messages/unread-count', (data: any) => {
        if (!data) return { unreadCount: 0 }
        return { unreadCount: Math.max(0, data.unreadCount - toRemove.length) }
      }, { revalidate: false })

      for (const item of toRemove) {
        const entityId = item.id.replace('msg-', '')
        api.patch(`/api/messages/${entityId}`, { statut: 'LU' }, { headers: { 'Content-Type': 'application/merge-patch+json' } }).catch(() => {})
      }

      return prev.filter((m) => !removeIds.has(m.id))
    })

    setNotifications((prev) => prev.filter((m) => {
      if (!m.id.startsWith('msg-')) return true
      const id = m.href.split('id=')[1]?.split('&')[0]
      return id !== convId
    }))
  }, [])

  // Open message dropdown — fetch unread messages only
  const openMsg = useCallback(async () => {
    if (msgOpen) { setMsgOpen(false); return }
    setMsgLoading(true)
    setMsgOpen(true)
    try {
      const res = await api.get('/api/messages?itemsPerPage=20&order[createdAt]=desc')
      const raw = res.data?.['hydra:member'] ?? res.data?.member ?? (Array.isArray(res.data) ? res.data : [])
      const items: NotifItem[] = []
      for (const m of raw) {
        if (rawId(m.expediteur) === user?.id) continue
        if (m.statut === 'LU') continue
        items.push(msgToItem(m, rawId))
      }
      items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      setMsgItems(items)
    } catch { /* ignore */ }
    setMsgLoading(false)
  }, [msgOpen, user, rawId])

  const closeMsg = useCallback(() => setMsgOpen(false), [])

  const dismissMsg = useCallback(async (id: string, href?: string) => {
    // 1. FORCE LA MISE À JOUR DU STATE EN PREMIER (mise à jour locale instantanée)
    const entityId = id.replace('msg-', '')
    setMsgItems((prev) => prev.filter((m) => m.id !== id))
    setMsgOpen(false)

    // On décrémente aussi le compteur global unreadCount optimiste pour que les 2 soient synchronisés
    globalMutate('/api/messages/unread-count', (data: any) => {
      if (!data || data.unreadCount <= 0) return { unreadCount: 0 }
      return { unreadCount: data.unreadCount - 1 }
    }, { revalidate: false })

    // 2. REQUÊTE PATCH SÉCURISÉE vers API Platform
    try {
      await api.patch(
        `/api/messages/${entityId}`, 
        { statut: 'LU' }, 
        { headers: { 'Content-Type': 'application/merge-patch+json' } }
      )
    } catch { 
      /* best effort */ 
    }
    
    if (href) router.push(href)
  }, [router])

  // Derived counts
  const activeConsIds = allCons.filter((c: any) => c.statut === 'En attente' || c.statut === 'OUVERTE').map((c: any) => `cons-${c.id}`)
  const activeMsgIds = msgItems.map((m) => m.id)
  const allActiveIds = [...activeConsIds, ...activeMsgIds]
  const notificationCount = allActiveIds.filter((id) => !dismissedNotifIds.has(id)).length
  
  const msgDisplayCount = msgItems.length

  const ctxValue = useMemo(() => ({
    notifications, notifLoading, unreadCount,
    consultationCount: openConsultationCount, pendingConsultationCount, notificationCount,
    openNotif, dismissNotif, closeNotif, notifOpen,
    msgNotifications: msgItems, msgLoading, msgOpen, openMsg, dismissMsg, markConversationAsRead, closeMsg, msgDisplayCount,
    activeConversationId, setActiveConversationId, subscribeToMessages, onlineUsers,
  }), [
    notifications, notifLoading, unreadCount,
    openConsultationCount, pendingConsultationCount, notificationCount,
    openNotif, dismissNotif, closeNotif, notifOpen,
    msgItems, msgLoading, msgOpen, openMsg, dismissMsg, markConversationAsRead, closeMsg, msgDisplayCount,
    activeConversationId, setActiveConversationId, subscribeToMessages, onlineUsers,
  ])

  return (
    <NotificationCtx.Provider value={ctxValue}>
      {children}
    </NotificationCtx.Provider>
  )
}

export function useNotification() {
  return useContext(NotificationCtx)
}
