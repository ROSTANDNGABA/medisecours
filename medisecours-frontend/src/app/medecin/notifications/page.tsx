'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR, { mutate as globalMutate } from 'swr'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  Bell,
  CalendarClock,
  CheckCheck,
  Clock,
  MessageSquare,
  Stethoscope,
  Trash2,
} from 'lucide-react'
import api from '../../../api/axios'
import { fetcher } from '../../../lib/fetcher'
import { NOTIFICATIONS_KEY, UNREAD_NOTIFICATIONS_KEY } from '../../../lib/keys'
import { useAuth } from '../../../hooks/useAuth'
import LoadingSpinner from '../../../components/ui/LoadingSpinner'
import EmptyState from '../../../components/ui/EmptyState'
import { useToast } from '../../../components/ui/Toast'

interface NotificationRecord {
  id: number
  type: string
  title: string
  body?: string | null
  link?: string | null
  createdAt: string
  readAt?: string | null
}

const stagger = { animate: { transition: { staggerChildren: 0.05 } } }
const itemFade = {
  initial: { opacity: 0, y: 12, scale: 0.97 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, damping: 22, stiffness: 320, mass: 0.9 },
  },
}

const iconByType = {
  message_received: {
    icon: MessageSquare,
    color: '#3B6EF8',
    background: 'rgba(59,110,248,0.12)',
  },
  consultation_accepted: {
    icon: Stethoscope,
    color: '#059669',
    background: 'rgba(5,150,105,0.12)',
  },
  consultation_closed: {
    icon: CalendarClock,
    color: '#D97706',
    background: 'rgba(217,119,6,0.12)',
  },
}

function timeAgo(dateString: string): string {
  const timestamp = new Date(dateString).getTime()
  if (!Number.isFinite(timestamp)) return ''

  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000))
  if (minutes < 1) return "À l'instant"
  if (minutes < 60) return `Il y a ${minutes} min`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Il y a ${hours} h`

  const days = Math.floor(hours / 24)
  if (days < 30) return `Il y a ${days} j`

  return `Il y a ${Math.floor(days / 30)} mois`
}

function normalizeLink(link?: string | null): string {
  if (!link) return '/medecin/notifications'
  if (link.startsWith('/messages')) {
    return `/medecin/messages${link.slice('/messages'.length)}`
  }
  return link
}

export default function MedecinNotificationsPage() {
  const { user, mounted } = useAuth()
  const router = useRouter()
  const toast = useToast()
  const [markingAll, setMarkingAll] = useState(false)
  const [deletingAll, setDeletingAll] = useState(false)
  const [markingId, setMarkingId] = useState<number | null>(null)
  const { data, error, isLoading, mutate } = useSWR<NotificationRecord[]>(
    user ? NOTIFICATIONS_KEY : null,
    fetcher,
    { revalidateOnFocus: true },
  )

  const notifications = useMemo(
    () => (Array.isArray(data) ? data : []),
    [data],
  )
  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.readAt).length,
    [notifications],
  )

  const markAsRead = useCallback(async (notification: NotificationRecord) => {
    if (notification.readAt) return true

    setMarkingId(notification.id)
    const readAt = new Date().toISOString()
    try {
      await api.patch(
        `/api/notifications/${notification.id}`,
        { readAt },
        { headers: { 'Content-Type': 'application/merge-patch+json' } },
      )
      await mutate(
        (current) => current?.map((item) => (
          item.id === notification.id ? { ...item, readAt } : item
        )),
        { revalidate: false },
      )
      globalMutate(
        UNREAD_NOTIFICATIONS_KEY,
        (current: { unreadCount?: number } | undefined) => ({
          unreadCount: Math.max(0, (current?.unreadCount ?? unreadCount) - 1),
        }),
        { revalidate: false },
      )
      return true
    } catch {
      toast.error('Impossible de marquer cette notification comme lue.')
      return false
    } finally {
      setMarkingId(null)
    }
  }, [mutate, toast, unreadCount])

  const openNotification = useCallback(async (notification: NotificationRecord) => {
    await markAsRead(notification)
    router.push(normalizeLink(notification.link))
  }, [markAsRead, router])

  const markAllAsRead = useCallback(async () => {
    if (unreadCount === 0) return

    setMarkingAll(true)
    const readAt = new Date().toISOString()
    try {
      await api.patch('/api/notifications/mark-all-read')
      await mutate(
        (current) => current?.map((item) => (
          item.readAt ? item : { ...item, readAt }
        )),
        { revalidate: false },
      )
      globalMutate(UNREAD_NOTIFICATIONS_KEY, { unreadCount: 0 }, false)
      toast.success('Toutes les notifications ont été marquées comme lues.')
    } catch {
      toast.error('Impossible de marquer toutes les notifications comme lues.')
      await mutate()
      globalMutate(UNREAD_NOTIFICATIONS_KEY)
    } finally {
      setMarkingAll(false)
    }
  }, [mutate, toast, unreadCount])

  const deleteAllNotifications = useCallback(async () => {
    if (notifications.length === 0) return
    if (!window.confirm(
      "Effacer définitivement tout l'historique des notifications ? Cette action ne supprime ni les messages ni les consultations.",
    )) {
      return
    }

    setDeletingAll(true)
    try {
      await api.delete('/api/notifications')
      await mutate([], { revalidate: false })
      globalMutate(NOTIFICATIONS_KEY, [], false)
      globalMutate(UNREAD_NOTIFICATIONS_KEY, { unreadCount: 0 }, false)
      toast.success("L'historique des notifications a été effacé.")
    } catch {
      toast.error("Impossible d'effacer l'historique des notifications.")
      await mutate()
      globalMutate(UNREAD_NOTIFICATIONS_KEY)
    } finally {
      setDeletingAll(false)
    }
  }, [mutate, notifications.length, toast])

  if (!mounted || isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner label="Chargement des notifications..." />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-12 pt-6 sm:px-6 sm:pt-8">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="mb-8"
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#3B6EF8]/10">
            <Bell className="h-6 w-6 text-[#3B6EF8]" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-[#0F2C52]">
              Notifications
            </h1>
            <p className="mt-0.5 text-sm text-[#6B7280]">
              {unreadCount > 0
                ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}`
                : 'Tout est à jour'}
            </p>
          </div>
          {notifications.length > 0 && (
            <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  disabled={markingAll || deletingAll}
                  className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[#F0F4FF] px-4 py-2 text-sm font-semibold text-[#315FD6] transition hover:bg-[#E2EAFF] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                >
                  {markingAll ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#3B6EF8] border-t-transparent" />
                  ) : (
                    <CheckCheck className="h-4 w-4" />
                  )}
                  Tout marquer comme lu
                </button>
              )}
              <button
                type="button"
                onClick={deleteAllNotifications}
                disabled={deletingAll || markingAll}
                className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
              >
                {deletingAll ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Tout effacer
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-6 text-center">
          <p className="text-sm font-medium text-red-700">
            Impossible de charger les notifications.
          </p>
          <button
            type="button"
            onClick={() => mutate()}
            className="mt-3 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-sm"
          >
            Réessayer
          </button>
        </div>
      ) : notifications.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, type: 'spring', damping: 20, stiffness: 300 }}
        >
          <EmptyState
            icon={Bell}
            title="Aucune notification"
            description="Les nouveaux messages et événements liés à vos consultations apparaîtront ici."
          />
        </motion.div>
      ) : (
        <motion.div
          variants={stagger}
          initial="initial"
          animate="animate"
          className="space-y-1.5"
        >
          <AnimatePresence mode="popLayout">
            {notifications.map((notification) => {
              const unread = !notification.readAt
              const iconMeta = iconByType[
                notification.type as keyof typeof iconByType
              ] ?? {
                icon: Bell,
                color: '#6B7280',
                background: 'rgba(107,114,128,0.12)',
              }
              const Icon = iconMeta.icon

              return (
                <motion.div
                  key={notification.id}
                  layout
                  variants={itemFade}
                  exit={{ opacity: 0, scale: 0.95, y: -8, transition: { duration: 0.15 } }}
                >
                  <button
                    type="button"
                    onClick={() => openNotification(notification)}
                    disabled={markingId === notification.id}
                    className={`group relative flex w-full items-start gap-4 rounded-xl p-4 text-left transition active:scale-[0.98] disabled:cursor-wait ${
                      unread
                        ? 'bg-[#F0F4FF] shadow-sm shadow-blue-500/5'
                        : 'bg-white hover:bg-[#F9FAFB]'
                    }`}
                  >
                    {unread && (
                      <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[#3B6EF8]" />
                    )}
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: iconMeta.background }}
                    >
                      <Icon className="h-5 w-5" style={{ color: iconMeta.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm ${
                          unread
                            ? 'font-bold text-[#0F2C52]'
                            : 'font-semibold text-[#374151]'
                        }`}
                        >
                          {notification.title}
                        </p>
                        <span className="flex shrink-0 items-center gap-1 text-[11px] text-[#9CA3AF]">
                          <Clock className="h-3 w-3" />
                          {timeAgo(notification.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#6B7280]">
                        {notification.body || 'Une nouvelle information est disponible.'}
                      </p>
                    </div>
                    {markingId === notification.id ? (
                      <span className="mt-2 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#3B6EF8] border-t-transparent" />
                    ) : (
                      <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-[#D1D5DB] transition group-hover:translate-x-0.5 group-hover:text-[#3B6EF8]" />
                    )}
                  </button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}
