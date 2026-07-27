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
import { UNREAD_MESSAGES_KEY } from '../lib/keys'

const MERGE_PATCH_HEADERS = { 'Content-Type': 'application/merge-patch+json' } as const

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

/** Extrait les messages non lus d'une réponse API (hydra:member ou tableau brut). */
function extractMsgs(data: any): any[] {
  return data?.['hydra:member'] ?? data?.member ?? (Array.isArray(data) ? data : [])
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { unreadCount } = useUnreadCount()
  const { consultationCount: openConsultationCount } = useConsultationCount()
  const router = useRouter()

  const token = typeof window !== 'undefined' ? localStorage.getItem('medisecours_token') : null

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

  // ── Conversations marquées comme lues (protège contre SWR overwrite) ────
  const [readConversationIds, setReadConversationIds] = useState<Set<string>>(new Set(loadSet('readConvs')))

  // ── Compteur local clearing pour le bouton ─────────────────────────────
  const [clearing, setClearing] = useState(false)
  useEffect(() => { saveSet('readConvs', readConversationIds) }, [readConversationIds])

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

  // ── WebSocket listener — injecte chaque message reçu dans le cache SWR ──
  // Après clearAllNotifications, le cache SWR est vidé/figé. Pour que les
  // nouveaux messages WS réapparaissent sans F5, on injecte le payload dans
  // hydra:member ET on force revalidate: true pour réouvrir le canal réseau.
  useWebSocket(user?.id || '', token || '', {
    onNewMessage: (payload: any) => {
      // 1. Handlers enregistrés (page messages temps réel)
      messageHandlers.current.forEach((h) => h(payload))

      if (!payload || rawId(payload.expediteur) === user?.id) return

      // 2. Injection optimiste + revalidation réseau sur /api/messages*
      //    revalidate:true force SWR à fetcher le serveur après l'inject,
      //    ce qui résout le blocage post-clearAllNotifications.
      globalMutate(
        (key: string) => typeof key === 'string' && key.startsWith('/api/messages'),
        (cache: any) => {
          if (!cache) return cache
          // fetcher unwrap → tableau brut
          if (Array.isArray(cache)) {
            if (cache.some((m: any) => String(m.id) === String(payload.id))) return cache
            return [payload, ...cache]
          }
          // rawFetcher → hydra:member
          if (cache?.['hydra:member']) {
            if (cache['hydra:member'].some((m: any) => String(m.id) === String(payload.id))) return cache
            return { ...cache, 'hydra:member': [payload, ...cache['hydra:member']] }
          }
          return cache
        },
        { revalidate: true }
      )

      // 3. Sidebar conversations (dernier message + preview)
      globalMutate('/api/conversations', undefined, { revalidate: true })

      const convId = String(rawId(payload.conversation))
      // 4. Si l'utilisateur lit cette conversation, ne PAS incrémenter le badge
      if (convId === activeConversationId) return

      // 5. Compteur unread
      globalMutate(UNREAD_MESSAGES_KEY, (data: any) => {
        if (!data) return { unreadCount: 1 }
        return { unreadCount: data.unreadCount + 1 }
      }, { revalidate: true })
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
          href: `/medecin/messages?id=${rawId(m.conversation)}`,
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
        await api.patch(`/api/messages/${entityId}`, { statut: 'LU' }, { headers: MERGE_PATCH_HEADERS })
      } catch { /* best effort */ }
    }
    if (href) router.push(href)
  }, [router])

  // ── Marquer une conversation comme lue (depuis la page messages) ────────
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

      globalMutate(UNREAD_MESSAGES_KEY, (data: any) => {
        if (!data) return { unreadCount: 0 }
        return { unreadCount: Math.max(0, data.unreadCount - toRemove.length) }
      }, { revalidate: false })

      for (const item of toRemove) {
        const entityId = item.id.replace('msg-', '')
        api.patch(`/api/messages/${entityId}`, { statut: 'LU' }, { headers: MERGE_PATCH_HEADERS }).catch(() => {})
      }
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
        items.push(msgToItem(m, rawId))
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
      await api.patch(`/api/messages/${entityId}`, { statut: 'LU' }, { headers: MERGE_PATCH_HEADERS })
    } catch { /* best effort */ }
    if (href) router.push(href)
  }, [router])

  // ── clearAllNotifications — Persist garanti + audit trail ────────────────
  // Résout le bug "Tout effacer" qui ne persistait pas en BDD (F5 = retour).
  // Protocol: fresh GET → Promise.allSettled (aucune abération) → SWR sync.
  const clearAllNotifications = useCallback(async () => {
    setClearing(true)

    // 1) Mutation optimiste instantanée (UX : badge → 0 au毫秒)
    setNotifications([])
    setMsgItems([])
    globalMutate(UNREAD_MESSAGES_KEY, { unreadCount: 0 }, false)

    try {
      // 2) GET de sécurité en direct vers la BDD (pas le state local stale)
      const res = await api.get('/api/messages', {
        params: { itemsPerPage: 200, order: { createdAt: 'desc' } }
      })
      const allMsgs = extractMsgs(res.data)
      const unreadMsgs = allMsgs.filter(
        (m) => m.statut !== 'LU' && rawId(m.expediteur) !== user?.id
      )

      if (unreadMsgs.length === 0) {
        globalMutate(UNREAD_MESSAGES_KEY)
        return
      }

      // 3) PATCH en masse — Promise.allSettled (aucune abération sur échec partiel)
      const results = await Promise.allSettled(
        unreadMsgs.map((m) => {
          const msgId = m.id ?? String(m['@id']?.split('/').pop())
          return api.patch(
            `/api/messages/${msgId}`,
            { statut: 'LU' },
            { headers: MERGE_PATCH_HEADERS }
          )
        })
      )

      // 4) Audit trail : log chaque échec pour diagnostiquer le 415/403/422
      const failed = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[]
      if (failed.length > 0) {
        console.error(
          `[clearAllNotifications] ${failed.length}/${unreadMsgs.length} PATCH échoués:`,
          failed.map((r) => r.reason?.message ?? r.reason)
        )
      }

      // 5) Revalidation SWR — APRÈS résolution de TOUTES les promesses
      // Compteur unread (badge cloche + sidebar)
      globalMutate(UNREAD_MESSAGES_KEY)
      // Liste messages (page messages, page notifications, dropdown header)
      globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/messages'))
    } catch (err) {
      console.error('[clearAllNotifications] Erreur fatale:', err)
      globalMutate(UNREAD_MESSAGES_KEY)
      globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/messages'))
    } finally {
      setClearing(false)
    }
  }, [user?.id, rawId])

  // ── DIRECTIVE 3 : notificationCount = SWR counter + consultations ──────
  // Plus de calcul depuis msgItems (source dédoublonnée, fiable).
  const notificationCount = unreadCount + pendingConsultationCount

  const msgDisplayCount = msgItems.length

  const ctxValue = useMemo(() => ({
    notifications, notifLoading, unreadCount,
    consultationCount: openConsultationCount, pendingConsultationCount, notificationCount,
    openNotif, dismissNotif, clearAllNotifications, closeNotif, notifOpen,
    msgNotifications: msgItems, msgLoading, msgOpen, openMsg, dismissMsg, markConversationAsRead, closeMsg, msgDisplayCount,
    activeConversationId, setActiveConversationId, subscribeToMessages, onlineUsers,
  }), [
    notifications, notifLoading, unreadCount,
    openConsultationCount, pendingConsultationCount, notificationCount,
    openNotif, dismissNotif, clearAllNotifications, closeNotif, notifOpen,
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
