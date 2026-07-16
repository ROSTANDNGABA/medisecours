'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import api from '../../api/axios'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import MedecinSidebar from '../../components/medecin/MedecinSidebar'
import MedecinHeader from '../../components/medecin/MedecinHeader'

const PAGE_TITLES = {
  '/medecin': "Vue d'ensemble",
  '/medecin/patients': 'Mes Patients',
  '/medecin/consultations': 'Consultations',
  '/medecin/prescriptions': 'Prescriptions',
  '/medecin/pharmacy': 'Pharmacie',
  '/medecin/messages': 'Messages',
  '/medecin/rapports': 'Rapports',
  '/medecin/notifications': 'Notifications',
  '/medecin/parametres': 'Paramètres',
}

function SidebarWrapper({ setMobileOpen, unreadCount }: { setMobileOpen: (open: boolean) => void; unreadCount: number }) {
  return (
    <div className="hidden md:block">
      <div className="sticky top-0 h-screen w-[220px] shrink-0 overflow-y-auto">
        <MedecinSidebar setMobileOpen={setMobileOpen} unreadCount={unreadCount} />
      </div>
    </div>
  )
}

function MobileDrawer({ open, onClose, unreadCount }: { open: boolean; onClose: () => void; unreadCount: number }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/30 md:hidden"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: -220 }}
            animate={{ x: 0 }}
            exit={{ x: -220 }}
            transition={{ type: 'tween', duration: 0.2 }}
            className="fixed inset-y-0 left-0 z-50 w-[220px] md:hidden"
          >
            <MedecinSidebar setMobileOpen={onClose} unreadCount={unreadCount} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

export default function MedecinLayout({ children }: { children: React.ReactNode }) {
  const { user, isMedecin, mounted } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (mounted && !isMedecin) {
      router.replace('/login')
    }
  }, [mounted, isMedecin, router])

  useEffect(() => {
    if (!user?.id) return
    api.get('/api/messages')
      .then((res) => {
        const msgs = res.data?.['hydra:member'] ?? (Array.isArray(res.data) ? res.data : [])
        const unread = msgs.filter((m: any) => m.statut !== 'LU' && m.expediteur?.id !== user.id).length
        setUnreadCount(unread)
      })
      .catch(() => {})
  }, [user?.id])

  const prevPathname = useRef(pathname)
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname
      queueMicrotask(() => setMobileOpen(false))
    }
  }, [pathname])

  if (!mounted || !isMedecin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FD]">
        <LoadingSpinner label="Chargement de l'espace médecin…" />
      </div>
    )
  }

  const pageTitle = PAGE_TITLES[pathname as keyof typeof PAGE_TITLES] || 'Espace Médecin'

  return (
    <div className="flex min-h-screen bg-[#F8F9FD]">
      <SidebarWrapper setMobileOpen={setMobileOpen} unreadCount={unreadCount} />
      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} unreadCount={unreadCount} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#E5E7EB] bg-white px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <button
              className="flex items-center justify-center rounded-xl p-2 text-[#6B7280] hover:bg-[#F3F4F6] md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="font-display text-lg font-bold text-[#0F2C52]">{pageTitle}</h1>
          </div>
          <MedecinHeader unreadCount={unreadCount} />
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
