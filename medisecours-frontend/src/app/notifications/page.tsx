// @ts-nocheck
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, MessageSquare, ArrowRight, Clock } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import Avatar from '../../components/ui/Avatar'
import api from '../../api/axios'

function idFromIri(value) {
  if (!value) return null
  if (typeof value === 'object') return value.id
  return value.split('/').pop()
}

function timeAgo(dateString) {
  if (!dateString) return ''
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

const stagger = { animate: { transition: { staggerChildren: 0.05 } } }
const itemFade = {
  initial: { opacity: 0, y: 12, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', damping: 22, stiffness: 320, mass: 0.9 } },
}

export default function NotificationsPage() {
  const { user, mounted } = useAuth()
  const router = useRouter()
  const toast = useToast()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!mounted || !user) return
    api.get('/api/messages').then(r => {
      const raw = r.data?.['hydra:member'] ?? r.data?.member ?? r.data
      setMessages(Array.isArray(raw) ? raw : [])
    }).catch(() => toast.error('Impossible de charger les notifications.'))
    .finally(() => setLoading(false))
  }, [mounted, user, toast])

  const notifications = useMemo(() => {
    const items = []
    for (const m of messages) {
      if (idFromIri(m.expediteur) === user?.id) continue
      const sender = typeof m.expediteur === 'object' ? m.expediteur : null
      items.push({
        id: `msg-${m.id}`,
        title: 'Nouveau message',
        description: m.contenu?.slice(0, 100) || 'Message reçu',
        time: m.createdAt,
        unread: m.statut !== 'LU',
        link: '/messages',
        sender,
      })
    }
    items.sort((a, b) => new Date(b.time) - new Date(a.time))
    return items
  }, [messages, user?.id])

  const unreadCount = useMemo(() => notifications.filter(n => n.unread).length, [notifications])

  if (!mounted || loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <LoadingSpinner label="Chargement des notifications…" />
    </div>
  )

  return (
    <div className="mx-auto max-w-3xl px-4 pb-12 pt-6 sm:px-6 sm:pt-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', damping: 20, stiffness: 300 }} className="mb-8">
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
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, type: 'spring', damping: 20, stiffness: 300 }}>
          <EmptyState icon={Bell} title="Aucune notification" description="Vous serez notifié des nouveaux messages de vos médecins ici." />
        </motion.div>
      ) : (
        <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-1.5">
          <AnimatePresence mode="popLayout">
            {notifications.map(n => (
              <motion.div key={n.id} layout variants={itemFade} exit={{ opacity: 0, scale: 0.95, y: -8, transition: { duration: 0.15 } }}>
                <button
                  onClick={() => router.push(n.link)}
                  className={`group relative flex w-full items-start gap-4 rounded-2xl p-4 text-left transition-all active:scale-[0.98] ${
                    n.unread ? 'bg-[#F0F4FF] shadow-sm shadow-blue-500/5' : 'bg-white hover:bg-[#F9FAFB]'
                  }`}
                  style={{ transition: 'transform 0.1s ease-out, background 0.2s ease-out' }}
                >
                  {n.unread && <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[#3B6EF8]" />}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(59,110,248,0.12)] backdrop-blur-sm">
                    <MessageSquare className="h-5 w-5 text-[#3B6EF8]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm ${n.unread ? 'font-bold text-[#0F2C52]' : 'font-semibold text-[#374151]'}`}>{n.title}</p>
                      <span className="flex shrink-0 items-center gap-1 text-[11px] text-[#9CA3AF]">
                        <Clock className="h-3 w-3" />
                        {timeAgo(n.time)}
                      </span>
                    </div>
                    {n.sender && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <Avatar name={`${n.sender?.prenom || ''} ${n.sender?.nom || ''}`} size="sm" />
                        <span className="text-xs font-medium text-[#6B7280]">Dr. {n.sender?.prenom} {n.sender?.nom}</span>
                      </div>
                    )}
                    <p className="mt-1 text-xs leading-relaxed text-[#9CA3AF] line-clamp-2">{n.description || 'Message reçu'}</p>
                  </div>
                  <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-[#D1D5DB] transition group-hover:text-[#3B6EF8] group-hover:translate-x-0.5" style={{ transition: 'color 0.2s, transform 0.2s' }} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}
