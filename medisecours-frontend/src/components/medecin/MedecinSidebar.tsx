'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  HeartPulse, LayoutDashboard, Users, CalendarClock, FileText, Pill, MessageCircle,
  BarChart3, Bell, Settings, Plus, LogOut,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import Avatar from '../ui/Avatar'

const NAV = [
  { href: '/medecin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/medecin/patients', label: 'Mes Patients', icon: Users },
  { href: '/medecin/consultations', label: 'Consultations', icon: CalendarClock },
  { href: '/medecin/prescriptions', label: 'Prescriptions', icon: FileText },
  { href: '/medecin/pharmacy', label: 'Pharmacie', icon: Pill },
  { href: '/medecin/avis', label: 'Avis', icon: MessageCircle },
  { href: '/medecin/messages', label: 'Messages', icon: MessageCircle, badge: 'unread' },
]

const NAV_BOTTOM = [
  { href: '/medecin/rapports', label: 'Rapports', icon: BarChart3 },
  { href: '/medecin/notifications', label: 'Notifications', icon: Bell },
  { href: '/medecin/profil', label: 'Profil', icon: Settings },
  { href: '/medecin/parametres', label: 'Paramètres', icon: Settings },
]

export default function MedecinSidebar({ setMobileOpen, unreadCount = 0 }: { setMobileOpen: (open: boolean) => void; unreadCount?: number }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()

  const isActive = (href: string, exact: boolean) => (exact ? pathname === href : pathname.startsWith(href))

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
              {badge === 'unread' && unreadCount > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
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
