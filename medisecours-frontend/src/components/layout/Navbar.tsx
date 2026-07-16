'use client'
import { useEffect, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { HeartPulse, Menu, X, Sun, Moon, MessageCircle, UserCircle, LogOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const THEME_EVENT = 'medisecours-theme-change'

function subscribeTheme(onChange: () => void) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('storage', onChange)
  window.addEventListener(THEME_EVENT, onChange)
  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener(THEME_EVENT, onChange)
  }
}

function getThemeSnapshot() {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('medisecours_theme') === 'dark'
}

const links = [
  { to: '/', label: 'Accueil' },
  { to: '/categories', label: 'Catégories' },
  { to: '/maladies', label: 'Maladies' },
  { to: '/centres', label: 'Centres de santé' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const dark = useSyncExternalStore(subscribeTheme, getThemeSnapshot, () => false)
  const { isAuthenticated, user, isAdmin, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  const toggleDark = () => {
    const next = !dark
    localStorage.setItem('medisecours_theme', next ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', next)
    window.dispatchEvent(new Event(THEME_EVENT))
  }

  const initials = user ? `${user.prenom?.[0] || ''}${user.nom?.[0] || ''}`.toUpperCase() : ''
  const isActive = (to: string) => (to === '/' ? pathname === '/' : pathname.startsWith(to))

  return (
    <header className="sticky top-0 z-50 bg-white/70 dark:bg-primary-900/70 backdrop-blur-lg border-b border-white/40 dark:border-white/5">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-display font-extrabold text-lg text-primary-500 dark:text-mint-500">
          <HeartPulse className="w-6 h-6 text-urgence-500" />
          MediSecours<span className="text-mint-500">+</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              href={l.to}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition ${
                isActive(l.to)
                  ? 'bg-primary-500 text-white'
                  : 'text-primary-700 dark:text-sable hover:bg-primary-100 dark:hover:bg-primary-700'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleDark}
            className="p-2 rounded-xl hover:bg-primary-100 dark:hover:bg-primary-700 text-primary-500 dark:text-sable"
            aria-label="Basculer le mode sombre"
          >
            {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {isAuthenticated ? (
            <div className="hidden sm:flex items-center gap-1">
              <Link href="/messages" className="p-2 rounded-xl hover:bg-primary-100 dark:hover:bg-primary-700 text-primary-500 dark:text-sable" aria-label="Messages">
                <MessageCircle className="w-5 h-5" />
              </Link>
              {isAdmin && (
                <Link href="/admin" className="px-3 py-2 rounded-xl text-sm font-medium text-primary-700 dark:text-sable hover:bg-primary-100 dark:hover:bg-primary-700">
                  Admin
                </Link>
              )}
              <Link
                href="/profil"
                className="w-9 h-9 rounded-full bg-primary-500 text-white flex items-center justify-center text-xs font-bold"
                title={`${user?.prenom} ${user?.nom}`}
              >
                {initials || <UserCircle className="w-5 h-5" />}
              </Link>
              <button
                onClick={() => { logout(); router.push('/') }}
                className="p-2 rounded-xl hover:bg-urgence-100 text-primary-500 hover:text-urgence-700 dark:text-sable"
                aria-label="Se déconnecter"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden sm:inline-flex px-4 py-2 rounded-xl bg-mint-500 hover:bg-mint-700 text-white text-sm font-semibold shadow-lg transition"
            >
              Connexion
            </Link>
          )}

          <button className="md:hidden p-2 text-primary-500 dark:text-sable" onClick={() => setOpen((o) => !o)} aria-label="Menu">
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="md:hidden border-t border-white/40 dark:border-white/5 px-4 py-3 flex flex-col gap-1 bg-white/90 dark:bg-primary-900/90">
          {links.map((l) => (
            <Link
              key={l.to}
              href={l.to}
              onClick={() => setOpen(false)}
              className={`px-3 py-2.5 rounded-xl text-sm font-medium ${
                isActive(l.to) ? 'bg-primary-500 text-white' : 'text-primary-700 dark:text-sable'
              }`}
            >
              {l.label}
            </Link>
          ))}
          {isAuthenticated ? (
            <>
              <Link onClick={() => setOpen(false)} href="/messages" className="px-3 py-2.5 rounded-xl text-sm font-medium text-primary-700 dark:text-sable">Messagerie</Link>
              <Link onClick={() => setOpen(false)} href="/profil" className="px-3 py-2.5 rounded-xl text-sm font-medium text-primary-700 dark:text-sable">Profil</Link>
              {isAdmin && <Link onClick={() => setOpen(false)} href="/admin" className="px-3 py-2.5 rounded-xl text-sm font-medium text-primary-700 dark:text-sable">Admin</Link>}
              <button onClick={() => { logout(); setOpen(false); router.push('/') }} className="text-left px-3 py-2.5 rounded-xl text-sm font-medium text-urgence-700">Déconnexion</button>
            </>
          ) : (
            <Link onClick={() => setOpen(false)} href="/login" className="px-3 py-2.5 rounded-xl text-sm font-semibold bg-mint-500 text-white text-center">Connexion</Link>
          )}
        </nav>
      )}
    </header>
  )
}
