'use client'
import { useEffect, useState, useSyncExternalStore, Suspense, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { 
  HeartPulse, Sun, Moon, 
  MessageCircle, UserCircle, LogOut, 
  Home, Grid, Activity, MapPin, 
  ChevronDown, ArrowRight, FileText,
  Cross, Stethoscope, FolderOpen
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useUnreadCount } from '../../hooks/useUnreadCount'

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

function ConversationAware({ children }: { children: (inConversation: boolean) => ReactNode }) {
  const searchParams = useSearchParams()
  return children(Boolean(searchParams.get('conversation')))
}

export default function Navbar() {
  const dark = useSyncExternalStore(subscribeTheme, getThemeSnapshot, () => false)
  const { isAuthenticated, user, isAdmin, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const { unreadCount } = useUnreadCount()

  const estDansLaMessagerie = pathname.includes('/messages') || pathname.includes('/conversations') || pathname.includes('/medecin/messages')

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

  /* ─── Desktop links ─── */
  type NavLink = { to: string; label: string; icon: any; hasDropdown?: boolean; badge?: number }
  const publicLinks: NavLink[] = [
    { to: '/', label: 'Accueil', icon: Home },
    { to: '/categories', label: 'Catégories', icon: Grid, hasDropdown: true },
    { to: '/maladies', label: 'Maladies', icon: Activity },
    { to: '/centres', label: 'Centres', icon: MapPin },
  ]

  const patientLinks: NavLink[] = [
    { to: '/', label: 'Accueil', icon: Home },
    { to: '/categories', label: 'Catégories', icon: Grid },
    { to: '/maladies', label: 'Maladies', icon: Activity },
    { to: '/patient/consultations', label: 'Consultations', icon: FileText, hasDropdown: true },
    { to: '/centres', label: 'Centres', icon: MapPin },
    { to: '/messages', label: 'Messagerie', icon: MessageCircle, badge: unreadCount },
  ]

  const activeLinks = isAuthenticated && !isAdmin ? patientLinks : publicLinks

  /* ─── Mobile bottom tab bar items ─── */
  const publicMobileNav: NavLink[] = [
    { to: '/', label: 'Accueil', icon: Home },
    { to: '/categories', label: 'Catégories', icon: Grid },
    { to: '/maladies', label: 'Maladies', icon: Activity },
    { to: '/centres', label: 'Centres', icon: MapPin },
    { to: '/login', label: 'Connexion', icon: UserCircle },
  ]

  const patientMobileNav: NavLink[] = [
    { to: '/', label: 'Accueil', icon: Home },
    { to: '/categories', label: 'Catégories', icon: Grid },
    { to: '/maladies', label: 'Maladies', icon: Activity },
    { to: '/patient/consultations', label: 'Rendez-vous', icon: FileText },
    { to: '/centres', label: 'Centres', icon: Stethoscope },
    { to: '/messages', label: 'Messages', icon: MessageCircle, badge: unreadCount },
  ]

  const mobileNavItems: NavLink[] = isAuthenticated && !isAdmin ? patientMobileNav : publicMobileNav

  return (
    <>
      {/* ══════════════════════════════════════════════════════════════════
       *  DESKTOP Floating Navbar (hidden on mobile/tablet)
       * ══════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex fixed top-4 inset-x-0 z-50 justify-center px-4 pointer-events-none">
        <header className="w-full max-w-6xl pointer-events-auto bg-white/80 dark:bg-[#111827]/80 backdrop-blur-xl rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-gray-800 px-3 py-2.5 flex items-center justify-between transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 pl-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F46E5] to-[#818CF8] shadow-md">
              <HeartPulse className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-extrabold text-lg text-gray-900 dark:text-white tracking-tight">
              MediSecours
            </span>
          </Link>

          {/* Center: Navigation Links */}
          <nav className="flex items-center gap-1">
            {activeLinks.map((l) => {
              const active = isActive(l.to)
              const Icon = l.icon
              return (
                <Link
                  key={l.to}
                  href={l.to}
                  className={`relative flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[13px] font-semibold transition-all duration-200 ${
                    active
                      ? 'bg-indigo-50/80 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-100'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`} />
                  {l.label}
                  
                  {l.badge !== undefined && l.badge > 0 && !estDansLaMessagerie && (
                    <span className="ml-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold shadow-sm animate-pulse">
                      {l.badge > 99 ? '99+' : l.badge}
                    </span>
                  )}
                  
                  {l.hasDropdown && (
                    <ChevronDown className="w-3.5 h-3.5 ml-0.5 opacity-50" />
                  )}

                  {active && (
                    <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-indigo-600 dark:bg-indigo-400 rounded-full shadow-[0_0_8px_rgba(79,70,229,0.8)]" />
                  )}
                </Link>
              )
            })}
            
            {isAdmin && (
              <Link
                href="/admin"
                className={`relative flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[13px] font-semibold transition-all ${
                  isActive('/admin')
                    ? 'bg-indigo-50/80 dark:bg-indigo-900/30 text-indigo-900'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Grid className="w-4 h-4" /> Admin
                {isActive('/admin') && <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-indigo-600 rounded-full" />}
              </Link>
            )}
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 pr-1">
            <button
              onClick={toggleDark}
              className="flex items-center justify-center w-9 h-9 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Basculer le mode sombre"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/profil"
                  className="group relative flex items-center gap-2 pl-1 pr-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full shadow-[0_4px_14px_0_rgb(79,70,229,0.39)] transition-all duration-200 hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-0.5"
                >
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">
                    {initials || <UserCircle className="w-4 h-4" />}
                  </div>
                  <span className="text-[13px] font-semibold">Mon Profil</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                
                <button
                  onClick={() => { logout(); router.push('/') }}
                  className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
                  aria-label="Se déconnecter"
                  title="Déconnexion"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="group relative flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full shadow-[0_4px_14px_0_rgb(79,70,229,0.39)] transition-all duration-200 hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-0.5"
              >
                <span className="text-[13px] font-semibold">Connexion</span>
                <ArrowRight className="w-4 h-4 opacity-70 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}
          </div>
        </header>
      </div>

      {/* Desktop spacer */}
      {pathname !== '/' && <div className="hidden lg:block h-24" />}


      {/* ══════════════════════════════════════════════════════════════════
       *  MOBILE / TABLET — Minimal Top Bar (logo + theme toggle only)
       *  Wrapped in #app-topbar so it can be hidden on mobile when a
       *  conversation is open (body.chat-open) — the bottom tab bar stays.
       * ══════════════════════════════════════════════════════════════════ */}
      <div id="app-topbar">
      <div className="lg:hidden fixed top-0 inset-x-0 z-50 bg-white/90 dark:bg-[#111827]/90 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F46E5] to-[#818CF8] shadow-md">
              <HeartPulse className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-extrabold text-lg text-gray-900 dark:text-white tracking-tight">
              MediSecours
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleDark}
              className="flex items-center justify-center w-9 h-9 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Basculer le mode sombre"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {isAuthenticated && (
              <>
                <Link
                  href="/profil"
                  className="flex items-center justify-center w-9 h-9 rounded-full text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                  aria-label="Profil"
                >
                  <UserCircle className="w-5 h-5" />
                </Link>
                <button
                  onClick={() => { logout(); router.push('/') }}
                  className="flex items-center justify-center w-9 h-9 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  aria-label="Se déconnecter"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile top spacer */}
      <div className="lg:hidden h-[60px]" />
      </div>


      {/* ══════════════════════════════════════════════════════════════════
       *  MOBILE / TABLET — Bottom Tab Bar (iOS/Android native feel)
       *  Hidden on mobile/tablet while a conversation is open (?conversation=)
       * ══════════════════════════════════════════════════════════════════ */}
      <Suspense fallback={null}>
        <ConversationAware>
          {(inConversation) => (
      <>
      <nav className={`lg:hidden fixed bottom-0 inset-x-0 z-50 ${inConversation ? 'hidden md:flex' : ''}`}>
        {/* Glassmorphism container with safe area padding */}
        <div className="bg-white/80 dark:bg-[#111827]/80 backdrop-blur-2xl border-t border-gray-200/60 dark:border-gray-700/40 shadow-[0_-4px_30px_rgba(0,0,0,0.06)]">
          <div className="flex items-stretch justify-around px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
            {mobileNavItems.map((item) => {
              const active = isActive(item.to)
              const Icon = item.icon
              return (
                <Link
                  key={item.to}
                  href={item.to}
                  className="relative flex flex-col items-center justify-center min-w-[60px] py-1 gap-0.5 group"
                >
                  {/* Active pill background behind icon */}
                  <div className={`relative flex items-center justify-center w-12 h-8 rounded-2xl transition-all duration-300 ${
                    active 
                      ? 'bg-indigo-100 dark:bg-indigo-500/20' 
                      : 'group-active:bg-gray-100 dark:group-active:bg-gray-800'
                  }`}>
                    <Icon 
                      className={`w-[22px] h-[22px] transition-colors duration-200 ${
                        active 
                          ? 'text-indigo-600 dark:text-indigo-400' 
                          : 'text-gray-400 dark:text-gray-500'
                      }`}
                      strokeWidth={active ? 2.5 : 1.8}
                    />

                    {/* Notification badge */}
                    {item.badge !== undefined && item.badge > 0 && !estDansLaMessagerie && (
                      <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold shadow-md ring-2 ring-white dark:ring-[#111827]">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </div>

                  {/* Label */}
                  <span className={`text-[10px] font-semibold leading-tight transition-colors duration-200 ${
                    active 
                      ? 'text-indigo-600 dark:text-indigo-400' 
                      : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {item.label}
                  </span>

                  {/* Active bar indicator */}
                  {active && (
                    <span className="absolute -bottom-1 w-5 h-[3px] rounded-full bg-indigo-600 dark:bg-indigo-400 shadow-[0_0_10px_rgba(79,70,229,0.6)]" />
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Bottom spacer so page content doesn't hide behind the tab bar */}
      <div className={`lg:hidden h-[80px] ${inConversation ? 'hidden md:block' : ''}`} />
      </>
          )}
        </ConversationAware>
      </Suspense>
    </>
  )
}
