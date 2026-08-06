'use client'

/**
 * NotificationContext — MediSecours+
 *
 * Architecture "Optimistic Update + Persist" :
 * - Le compteur SWR (/api/messages/unread-count) est la SOURCE DE VÉRITÉ pour le badge cloche + sidebar.
 * - Le WebSocket NE met à jour QUE le compteur SWR (optimiste, sans revalidation).
 * - Les dropdowns (notifications, messages) fetchent leurs données ON DEMAND au clic.
 * - Aucun double-write entre WebSocket et SWR → plus de désynchronisation.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../hooks/useAuth'
import { useUnreadCount } from '../hooks/useUnreadCount'
import { useConsultationCount } from '../hooks/useConsultationCount'
import { useWebSocket } from '../hooks/useWebSocket'
import useSWR, { mutate as globalMutate } from 'swr'
import api from '../api/axios'
import { UNREAD_MESSAGES_KEY, CONVERSATIONS_KEY } from '../lib/keys'

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
  clearAllNotifications: () => Promise<void>
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
  subscribeToProfileChanges: (handler: (data: any) => void) => () => void
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

function msgHref(convId: string | number, user: any): string {
  const base = user?.roles?.includes('ROLE_MEDECIN') ? '/medecin' : '/patient'
  return `${base}/messages?id=${convId}`
}

function msgToItem(m: any, rawId: (v: any) => any, user?: any): NotifItem {
  return {
    id: `msg-${m.id}`,
    type: 'message' as const,
    title: m.contenu?.slice(0, 80) || 'Message',
    description: m.contenu?.slice(0, 80) || 'Message',
    time: m.createdAt,
    unread: true,
    href: msgHref(rawId(m.conversation), user),
    sender: typeof m.expediteur === 'object' ? m.expediteur : null,
  }
}

/** Extrait les messages non lus d'une réponse API (hydra:member ou tableau brut). */
function extractMsgs(data: any): any[] {
  return data?.['hydra:member'] ?? data?.member ?? (Array.isArray(data) ? data : [])
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth()
  const { unreadCount } = useUnreadCount()
  const { consultationCount: openConsultationCount } = useConsultationCount()
  const router = useRouter()

  // ── Consultations en attente (badge sidebar amber) ──────────────────────
  const { data: consData } = useSWR(
    user ? '/api/consultations?itemsPerPage=200&order[createdAt]=desc' : null,
    rawFetcher,
    { refreshInterval: 15000, revalidateOnFocus: true }
  )
  const allCons = consData?.['hydra:member'] ?? consData?.member ?? (Array.isArray(consData) ? consData : [])
  const pendingConsultationCount = allCons.filter((c: any) => c.statut === 'En attente').length

  // ── IDs ignorées (dismissed) — persistées en localStorage ───────────────
  const [dismissedNotifIds, setDismissedNotifIds] = useState<Set<string>>(new Set(loadSet('notifDismissed')))
  useEffect(() => { saveSet('notifDismissed', dismissedNotifIds) }, [dismissedNotifIds])

  // ── États dropdown ─────────────────────────────────────────────────────
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifLoading, setNotifLoading] = useState(false)
  const [notifications, setNotifications] = useState<NotifItem[]>([])

  const [msgOpen, setMsgOpen] = useState(false)
  const [msgLoading, setMsgLoading] = useState(false)
  const [msgItems, setMsgItems] = useState<NotifItem[]>([])

  // ── Event Bus WebSocket ────────────────────────────────────────────────
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const messageHandlers = React.useRef<((msg: any) => void)[]>([])
  const profileChangeHandlers = React.useRef<((data: any) => void)[]>([])
  const receivedMessageIds = React.useRef<Set<string>>(new Set())

  const subscribeToMessages = useCallback((handler: (msg: any) => void) => {
    messageHandlers.current.push(handler)
    return () => {
      messageHandlers.current = messageHandlers.current.filter((h) => h !== handler)
    }
  }, [])

  const subscribeToProfileChanges = useCallback((handler: (data: any) => void) => {
    profileChangeHandlers.current.push(handler)
    return () => {
      profileChangeHandlers.current = profileChangeHandlers.current.filter((h) => h !== handler)
    }
  }, [])

  const rawId = useCallback((val: any) => {
    if (!val) return null
    if (typeof val === 'object') return val.id
    return val.split('/').pop()
  }, [])

  // ── WebSocket listener — injecte chaque message reçu dans le cache SWR ──
  // L'injection utilise revalidate:false pour ne PAS écraser l'état optimiste
  // de la page chat (allLoadedMsgs géré par subscribeToMessages).
  // Le compteur unread est mis à jour immédiatement par l'événement WebSocket.
  useWebSocket(user?.id || '', token || '', {
    onNewMessage: (payload: any) => {
      const messageId = String(payload?.id ?? payload?.['@id'] ?? '')
      if (messageId && receivedMessageIds.current.has(messageId)) return
      if (messageId) {
        receivedMessageIds.current.add(messageId)
        if (receivedMessageIds.current.size > 500) {
          const oldest = receivedMessageIds.current.values().next().value
          if (oldest) receivedMessageIds.current.delete(oldest)
        }
      }

      // 1. Handlers enregistrés (page messages → ajout instantané dans allLoadedMsgs)
      messageHandlers.current.forEach((h) => h(payload))

      if (!payload || rawId(payload.expediteur) === user?.id) return

      // 2. Injection optimiste dans les caches SWR /api/messages* (sans re-fetch)
      //    revalidate:false → le message reste dans le cache même après clearAll
      //    EXCLUT les clés "conversation=" (gérées par la page chat via subscribeToMessages)
      //    pour éviter que le useEffect msgData ne surcharge allLoadedMsgs (race condition).
      globalMutate(
        (key: string) => typeof key === 'string' && key.startsWith('/api/messages') && key !== UNREAD_MESSAGES_KEY && !key.includes('conversation='),
        (cache: any) => {
          if (!cache) return cache
          if (Array.isArray(cache)) {
            if (cache.some((m: any) => String(m.id) === String(payload.id))) return cache
            return [payload, ...cache]
          }
          if (cache?.['hydra:member']) {
            if (cache['hydra:member'].some((m: any) => String(m.id) === String(payload.id))) return cache
            return { ...cache, 'hydra:member': [payload, ...cache['hydra:member']] }
          }
          return cache
        },
        { revalidate: false }
      )

      // 3. Sidebar conversations — revalide pour afficher le dernier message
      const convId = String(rawId(payload.conversation))
      globalMutate('/api/conversations', (cache: any) => {
        if (!cache || !convId) return cache
        const conversations = Array.isArray(cache) ? cache : cache?.['hydra:member'] || []
        const next = conversations.map((conversation: any) =>
          String(conversation.id) === convId
            ? { ...conversation, dernierMessage: payload, updatedAt: payload.createdAt }
            : conversation
        )
        next.sort((a: any, b: any) =>
          String(b.dernierMessage?.createdAt || b.updatedAt || '')
            .localeCompare(String(a.dernierMessage?.createdAt || a.updatedAt || ''))
        )
        return Array.isArray(cache) ? next : { ...cache, 'hydra:member': next }
      }, { revalidate: false })

      // 4. Si l'utilisateur lit cette conversation, ne PAS incrémenter le badge
      if (convId === activeConversationId) return

      // 5. Compteur unread — revalidate:true pour sync serveur
      globalMutate(UNREAD_MESSAGES_KEY, (data: any) => {
        if (!data) return { unreadCount: 1 }
        return { unreadCount: data.unreadCount + 1 }
      }, { revalidate: false })
    },
    onMessageDelivered: (payload: any) => {
      messageHandlers.current.forEach((h) => h({ _type: 'message_delivered', ...payload }))
    },
    onMessageRead: (payload: any) => {
      messageHandlers.current.forEach((h) => h({ _type: 'message_read', ...payload }))
      // Revalide le compteur pour récupérer la vraie valeur serveur
      globalMutate(UNREAD_MESSAGES_KEY)
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
    },
    onProfilePhotoChanged: (payload: any) => {
      // Dispatch aux abonnés (pages messages pour mettre à jour allUsers)
      profileChangeHandlers.current.forEach((h) => h(payload))
      // Revalide les conversations SWR pour récupérer le nouveau photoProfil
      globalMutate(CONVERSATIONS_KEY)
    }
  })

  // ── Dropdown notifications : fetch ON DEMAND au clic ───────────────────
  const openNotif = useCallback(async () => {
    if (notifOpen) { setNotifOpen(false); return }
    setNotifLoading(true)
    setNotifOpen(true)
    try {
      const [msgsRes, consRes] = await Promise.all([
        api.get('/api/messages?itemsPerPage=50&order[createdAt]=desc'),
        api.get('/api/consultations?itemsPerPage=10&order[createdAt]=desc'),
      ])
      const items: NotifItem[] = []
      const msgs = extractMsgs(msgsRes.data)
      for (const m of msgs) {
        if (rawId(m.expediteur) === user?.id) continue
        if (m.statut === 'LU') continue
        items.push({
          id: `msg-${m.id}`,
          type: 'message',
          title: 'Nouveau message',
          description: m.contenu?.slice(0, 100) || 'Message reçu',
          time: m.createdAt,
          unread: true,
          href: msgHref(rawId(m.conversation), user),
          sender: typeof m.expediteur === 'object' ? m.expediteur : null,
        })
      }
      const cons = extractMsgs(consRes.data)
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
      globalMutate(UNREAD_MESSAGES_KEY, (data: any) => {
        if (!data || data.unreadCount <= 0) return { unreadCount: 0 }
        return { unreadCount: data.unreadCount - 1 }
      }, { revalidate: false })
      try {
        await api.patch(`/api/messages/${entityId}/read`)
      } catch { /* best effort */ }
    }
    if (href) router.push(href)
  }, [router])

  // ── Marquer une conversation comme lue (depuis la page messages) ────────
  const markConversationAsRead = useCallback((convId: string) => {
    api.patch(`/api/conversations/${convId}/read`)
      .then(() => globalMutate(UNREAD_MESSAGES_KEY))
      .catch(() => globalMutate(UNREAD_MESSAGES_KEY))

    setMsgItems((prev) => {
      const toRemove = prev.filter((m) => {
        const id = m.href.split('id=')[1]?.split('&')[0]
        return id === convId
      })
      if (toRemove.length === 0) return prev
      const removeIds = new Set(toRemove.map((m) => m.id))

      globalMutate(UNREAD_MESSAGES_KEY, (data: any) => {
        if (!data) return { unreadCount: 0 }
        return { unreadCount: Math.max(0, data.unreadCount - toRemove.length) }
      }, { revalidate: false })

      return prev.filter((m) => !removeIds.has(m.id))
    })

    setNotifications((prev) => prev.filter((m) => {
      if (!m.id.startsWith('msg-')) return true
      const id = m.href.split('id=')[1]?.split('&')[0]
      return id !== convId
    }))
  }, [])

  // ── Dropdown messages : fetch ON DEMAND au clic ─────────────────────────
  const openMsg = useCallback(async () => {
    if (msgOpen) { setMsgOpen(false); return }
    setMsgLoading(true)
    setMsgOpen(true)
    try {
      const res = await api.get('/api/messages?itemsPerPage=50&order[createdAt]=desc')
      const raw = extractMsgs(res.data)
      const items: NotifItem[] = []
      for (const m of raw) {
        if (rawId(m.expediteur) === user?.id) continue
        if (m.statut === 'LU') continue
        items.push(msgToItem(m, rawId, user))
      }
      items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      setMsgItems(items)
    } catch { /* ignore */ }
    setMsgLoading(false)
  }, [msgOpen, user, rawId])

  const closeMsg = useCallback(() => setMsgOpen(false), [])

  const dismissMsg = useCallback(async (id: string, href?: string) => {
    const entityId = id.replace('msg-', '')
    setMsgItems((prev) => prev.filter((m) => m.id !== id))
    setMsgOpen(false)
    globalMutate(UNREAD_MESSAGES_KEY, (data: any) => {
      if (!data || data.unreadCount <= 0) return { unreadCount: 0 }
      return { unreadCount: data.unreadCount - 1 }
    }, { revalidate: false })
    try {
      await api.patch(`/api/messages/${entityId}/read`)
    } catch { /* best effort */ }
    if (href) router.push(href)
  }, [router])

  // Persiste la lecture globale, puis resynchronise les caches.
  const clearAllNotifications = useCallback(async () => {
    setNotifications([])
    setMsgItems([])
    globalMutate(UNREAD_MESSAGES_KEY, { unreadCount: 0 }, false)

    try {
      await api.patch('/api/messages/mark-all-read')
      globalMutate(UNREAD_MESSAGES_KEY)
      globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/messages'))
    } catch (err) {
      console.error('[clearAllNotifications] Erreur fatale:', err)
      globalMutate(UNREAD_MESSAGES_KEY)
      globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/messages'))
    }
  }, [])

  // ── DIRECTIVE 3 : notificationCount = SWR counter + consultations ──────
  // Plus de calcul depuis msgItems (source dédoublonnée, fiable).
  const notificationCount = unreadCount + pendingConsultationCount

  const msgDisplayCount = msgItems.length

  const ctxValue = useMemo(() => ({
    notifications, notifLoading, unreadCount,
    consultationCount: openConsultationCount, pendingConsultationCount, notificationCount,
    openNotif, dismissNotif, clearAllNotifications, closeNotif, notifOpen,
    msgNotifications: msgItems, msgLoading, msgOpen, openMsg, dismissMsg, markConversationAsRead, closeMsg, msgDisplayCount,
    activeConversationId, setActiveConversationId, subscribeToMessages, subscribeToProfileChanges, onlineUsers,
  }), [
    notifications, notifLoading, unreadCount,
    openConsultationCount, pendingConsultationCount, notificationCount,
    openNotif, dismissNotif, clearAllNotifications, closeNotif, notifOpen,
    msgItems, msgLoading, msgOpen, openMsg, dismissMsg, markConversationAsRead, closeMsg, msgDisplayCount,
    activeConversationId, setActiveConversationId, subscribeToMessages, subscribeToProfileChanges, onlineUsers,
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
