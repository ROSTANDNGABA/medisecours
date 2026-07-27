'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  HeartPulse, LayoutDashboard, Users, CalendarClock, FileText, MessageCircle,
  BarChart3, Bell, Settings, Plus, LogOut,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import Avatar from '../ui/Avatar'
import { useNotification } from '../../contexts/NotificationContext'

const NAV = [
  { href: '/medecin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/medecin/patients', label: 'Mes Patients', icon: Users },
  { href: '/medecin/consultations', label: 'Consultations', icon: CalendarClock, badge: 'consultations' },
  { href: '/medecin/avis', label: 'Avis', icon: MessageCircle },
  { href: '/medecin/messages', label: 'Messages', icon: MessageCircle, badge: 'unread' },
]

const NAV_BOTTOM = [
  { href: '/medecin/rapports', label: 'Rapports', icon: BarChart3 },
  { href: '/medecin/notifications', label: 'Notifications', icon: Bell },
  { href: '/medecin/profil', label: 'Profil', icon: Settings },
]

export default function MedecinSidebar({ setMobileOpen }: { setMobileOpen: (open: boolean) => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const { unreadCount, pendingConsultationCount } = useNotification()

  const estSurLaPageMessages = pathname.startsWith('/medecin/messages')

  // NOTE (bug C5 corrigé) : on ne marque PLUS tous les messages comme lus à l'entrée
  // de la page Messages. Cela effaçait les messages urgents non ouverts, y compris
  // ceux des conversations non visualisées. Le marquage "lu" est désormais géré par
  // la page messages elle-même, uniquement pour la conversation réellement ouverte.

  // On cache juste le badge en local tant qu'on est sur la page (le compteur réel
  // est recalculé via le WebSocket / la navigation). Aucune mutation BDD ici.
  const displayUnread = estSurLaPageMessages ? 0 : unreadCount

  const isActive = (href: string, exact: boolean) => (exact ? pathname === href : pathname.startsWith(href))

  const renderBadge = (badgeType: string | undefined) => {
    if (badgeType === 'unread' && displayUnread > 0) {
      return (
        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
          {displayUnread > 99 ? '99+' : displayUnread}
        </span>
      )
    }
    if (badgeType === 'consultations' && pendingConsultationCount > 0) {
      return (
        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white shadow-sm">
          {pendingConsultationCount > 99 ? '99+' : pendingConsultationCount}
        </span>
      )
    }
    return null
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center gap-2.5 px-5 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1D4E89]">
          <HeartPulse className="h-5 w-5 text-white" />
        </div>
        <p className="font-display text-base font-extrabold text-[#1D4E89]">MediSecours+</p>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.map(({ href, label, icon: Icon, exact, badge }) => {
          const active = isActive(href, exact ?? false)
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen?.(false)}
              className={`flex items-center justify-between gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition ${
                active
                  ? 'bg-[#3B6EF8] text-white'
                  : 'text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#374151]'
              }`}
            >
              <span className="flex items-center gap-3">
                <Icon className={`h-4 w-4 ${active ? 'text-white' : ''}`} />
                {label}
              </span>
              {renderBadge(badge)}
            </Link>
          )
        })}

        <div className="my-3 border-t border-gray-200" />

        {NAV_BOTTOM.map(({ href, label, icon: Icon }) => {
          const active = isActive(href, false)
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen?.(false)}
              className={`flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition ${
                active
                  ? 'bg-[#3B6EF8] text-white'
                  : 'text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#374151]'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 pb-4">
        <div className="rounded-xl bg-[#EBF0FF] p-4">
          <p className="mb-3 text-xs font-medium leading-relaxed text-[#374151]">
            Gérer vos patients et dossiers médicaux
          </p>
          <Link
            href="/medecin/patients"
            onClick={() => setMobileOpen?.(false)}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#3B6EF8] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#2D5CD8]"
          >
            <Plus className="h-3.5 w-3.5" />
            Nouveau dossier
          </Link>
        </div>
      </div>

      <div className="border-t border-gray-100 px-4 py-4">
        <div className="mb-3 flex items-center gap-3">
          <Avatar name={`${user?.prenom || ''} ${user?.nom || ''}`} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#0F2C52]">
              Dr {user?.prenom} {user?.nom}
            </p>
            <p className="truncate text-xs text-[#6B7280]">Médecin</p>
          </div>
        </div>
        <button
          onClick={() => { logout(); router.push('/') }}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[#6B7280] transition hover:bg-red-50 hover:text-red-500"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </div>
    </div>
  )
}
