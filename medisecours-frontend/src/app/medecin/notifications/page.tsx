// @ts-nocheck
'use client'

import { useEffect, useMemo, useRef } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, MessageSquare, Star, ArrowRight, Clock } from 'lucide-react'
import { fetcher } from '../../../lib/fetcher'
import { useAuth } from '../../../hooks/useAuth'
import LoadingSpinner from '../../../components/ui/LoadingSpinner'
import EmptyState from '../../../components/ui/EmptyState'
import Avatar from '../../../components/ui/Avatar'
import { useToast } from '../../../components/ui/Toast'
import { idStrFromRelation } from '../../../types/api'

const easeOut = { type: 'spring', damping: 20, stiffness: 300 }
const stagger = { animate: { transition: { staggerChildren: 0.05 } } }
const itemFade = {
  initial: { opacity: 0, y: 12, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', damping: 22, stiffness: 320, mass: 0.9 } },
}

/** Clé SWR paginée : on ne charge QUE les 20 derniers messages (C2 corrigé). */
const RECENT_MESSAGES_KEY = '/api/messages?itemsPerPage=20&order[createdAt]=desc'

function timeAgo(dateString) {
  const diff = Date.now() - new Date(dateString).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "À l'instant"
  if (minutes < 60) return `Il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Il y a ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `Il y a ${days}j`
  return `Il y a ${Math.floor(days / 30)}mois`
}

const ICON_MAP = {
  message: { icon: MessageSquare, color: '#3B6EF8', bg: 'rgba(59,110,248,0.12)' },
  avis: { icon: Star, color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  signalement: { icon: Bell, color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
}

export default function MedecinNotificationsPage() {
  const { user } = useAuth()
  const toast = useToast()
  // C2 corrigé : pagination stricte (20 derniers) au lieu de charger tous les messages.
  const { data: msgData, isLoading: msgLoading } = useSWR(RECENT_MESSAGES_KEY, fetcher, { revalidateOnFocus: false })
  const { data: avisData, isLoading: avisLoading } = useSWR(user?.id ? `/api/avis?medecin=${user.id}` : null, fetcher, { revalidateOnFocus: false })
  const prevCount = useRef(0)

  const messages = useMemo(() => (Array.isArray(msgData) ? msgData : []), [msgData])
  const avis = useMemo(() => (Array.isArray(avisData) ? avisData : []), [avisData])

  useEffect(() => {
    if (!msgData && !msgLoading) toast.error('Impossible de charger les notifications.')
  }, [msgData, msgLoading, toast])

  const notifications = useMemo(() => {
    const items = []
    for (const m of messages) {
      if (idStrFromRelation(m.expediteur) === user?.id) continue
      items.push({
        id: `msg-${m.id}`,
        type: 'message',
        title: 'Nouveau message',
        description: m.contenu?.slice(0, 100) || 'Message reçu',
        time: m.createdAt,
        unread: m.statut !== 'LU',
        link: '/medecin/messages',
        sender: m.expediteur,
      })
    }
    for (const a of avis) {
      items.push({
        id: `avis-${a.id}`,
        type: 'avis',
        title: 'Nouvel avis',
        description: `Note: ${a.note}/5${a.commentaire ? ` — ${a.commentaire.slice(0, 80)}` : ''}`,
        time: a.createdAt,
        unread: false,
        link: '/medecin/avis',
        sender: a.patient,
      })
      if (a.signale) {
        items.push({
          id: `signale-${a.id}`,
          type: 'signalement',
          title: 'Avis signalé',
          description: a.raisonSignalement || 'Un avis a été signalé pour modération',
          time: a.createdAt,
          unread: false,
          link: '/medecin/avis',
          sender: a.patient,
        })
      }
    }
    items.sort((a, b) => new Date(b.time) - new Date(a.time))
    return items
  }, [messages, avis, user?.id])

  const unreadCount = useMemo(() => notifications.filter(n => n.unread).length, [notifications])

  useEffect(() => {
    prevCount.current = unreadCount
  }, [unreadCount])

  if (msgLoading || avisLoading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <LoadingSpinner label="Chargement des notifications…" />
    </div>
  )

  return (
    <div className="mx-auto max-w-3xl px-4 pb-12 pt-6 sm:px-6 sm:pt-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={easeOut} className="mb-8">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3B6EF8]/10">
            <Bell className="h-6 w-6 text-[#3B6EF8]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0F2C52]">Notifications</h1>
            <p className="mt-0.5 text-sm text-[#6B7280]">
              {unreadCount > 0
                ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}`
                : 'Tout est à jour'}
            </p>
          </div>
        </div>
      </motion.div>

      {notifications.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, ...easeOut }}>
          <EmptyState
            icon={Bell}
            title="Aucune notification"
            description="Vous serez notifié des nouveaux messages, avis et alertes ici."
          />
        </motion.div>
      ) : (
        <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-1.5">
          <AnimatePresence mode="popLayout">
            {notifications.map((n, i) => {
              const meta = ICON_MAP[n.type] || ICON_MAP.message
              return (
                <motion.div
                  key={n.id}
                  layout
                  variants={itemFade}
                  exit={{ opacity: 0, scale: 0.95, y: -8, transition: { duration: 0.15 } }}
                >
                  <Link
                    href={n.link}
                    className={`group relative flex items-start gap-4 rounded-2xl p-4 transition-all active:scale-[0.98] ${
                      n.unread
                        ? 'bg-[#F0F4FF] shadow-sm shadow-blue-500/5'
                        : 'bg-white hover:bg-[#F9FAFB]'
                    }`}
                    style={{ transition: 'transform 0.1s ease-out, background 0.2s ease-out' }}
                  >
                    {n.unread && (
                      <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[#3B6EF8]" />
                    )}
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl backdrop-blur-sm"
                      style={{ backgroundColor: meta.bg }}
                    >
                      <meta.icon className="h-5 w-5" style={{ color: meta.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm ${n.unread ? 'font-bold text-[#0F2C52]' : 'font-semibold text-[#374151]'}`}>
                          {n.title}
                        </p>
                        <span className="flex shrink-0 items-center gap-1 text-[11px] text-[#9CA3AF]">
                          <Clock className="h-3 w-3" />
                          {timeAgo(n.time)}
                        </span>
                      </div>
                      {n.sender && (
                        <div className="mt-1.5 flex items-center gap-2">
                          <Avatar
                            name={`${n.sender?.prenom || ''} ${n.sender?.nom || ''}`}
                            size="sm"
                          />
                          <span className="text-xs font-medium text-[#6B7280]">
                            {n.sender?.prenom} {n.sender?.nom}
                          </span>
                        </div>
                      )}
                      <p className="mt-1 text-xs leading-relaxed text-[#9CA3AF] line-clamp-2">{n.description}</p>
                    </div>
                    <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-[#D1D5DB] transition group-hover:text-[#3B6EF8] group-hover:translate-x-0.5" style={{ transition: 'color 0.2s, transform 0.2s' }} />
                  </Link>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}
