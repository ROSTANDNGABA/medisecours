'use client'
import { useEffect, useState, useSyncExternalStore, Suspense, type ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { 
  Sun, Moon,
  MessageCircle, UserCircle, LogOut, 
  Home, Grid, Activity, MapPin, 
  ChevronDown, ArrowRight, FileText,
  Cross, Stethoscope, FolderOpen
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useUnreadCount } from '../../hooks/useUnreadCount'
import { resolveImgPath } from '../../lib/config'

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
    { to: '/premiers-soins', label: 'Premiers soins', icon: Cross },
    { to: '/maladies', label: 'Orientation', icon: Activity },
    { to: '/medecins', label: 'Médecins', icon: Stethoscope },
    { to: '/centres', label: 'Centres', icon: MapPin },
  ]

  const patientLinks: NavLink[] = [
    { to: '/', label: 'Accueil', icon: Home },
    { to: '/premiers-soins', label: 'Premiers soins', icon: Cross },
    { to: '/maladies', label: 'Orientation', icon: Activity },
    { to: '/medecins', label: 'Médecins', icon: Stethoscope },
    { to: '/patient/consultations', label: 'Consultations', icon: FileText, hasDropdown: true },
    { to: '/centres', label: 'Centres', icon: MapPin },
    { to: '/messages', label: 'Messagerie', icon: MessageCircle, badge: unreadCount },
  ]

  const activeLinks = isAuthenticated && !isAdmin ? patientLinks : publicLinks

  /* ─── Mobile bottom tab bar items ─── */
  const publicMobileNav: NavLink[] = [
    { to: '/', label: 'Accueil', icon: Home },
    { to: '/premiers-soins', label: 'Secours', icon: Cross },
    { to: '/maladies', label: 'Orientation', icon: Activity },
    { to: '/centres', label: 'Centres', icon: MapPin },
    { to: '/login', label: 'Connexion', icon: UserCircle },
  ]

  const patientMobileNav: NavLink[] = [
    { to: '/', label: 'Accueil', icon: Home },
    { to: '/premiers-soins', label: 'Secours', icon: Cross },
    { to: '/medecins', label: 'Médecins', icon: Stethoscope },
    { to: '/patient/consultations', label: 'Rendez-vous', icon: FileText },
    { to: '/centres', label: 'Centres', icon: MapPin },
    { to: '/messages', label: 'Messages', icon: MessageCircle, badge: unreadCount },
  ]

  const mobileNavItems: NavLink[] = isAuthenticated && !isAdmin ? patientMobileNav : publicMobileNav

  return (
    <>
      {/* ══════════════════════════════════════════════════════════════════
       *  DESKTOP Floating Navbar (hidden on mobile/tablet)
       * ══════════════════════════════════════════════════════════════════ */}
      <div className="hidden xl:flex fixed top-4 inset-x-0 z-50 justify-center px-4 pointer-events-none">
        <header className="relative isolate overflow-hidden w-full max-w-[1500px] min-w-0 h-16 pointer-events-auto rounded-full border border-white/80 dark:border-white/15 bg-[linear-gradient(135deg,rgba(255,255,255,0.74),rgba(255,255,255,0.38)_48%,rgba(224,231,255,0.48))] dark:bg-[linear-gradient(135deg,rgba(17,24,39,0.82),rgba(30,41,59,0.62)_52%,rgba(49,46,129,0.42))] backdrop-blur-[26px] backdrop-saturate-[1.85] shadow-[0_18px_48px_rgba(30,58,95,0.16),0_4px_14px_rgba(30,58,95,0.08),inset_0_1px_0_rgba(255,255,255,0.98),inset_0_-1px_0_rgba(99,102,241,0.12)] dark:shadow-[0_18px_48px_rgba(0,0,0,0.38),0_4px_14px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-1px_0_rgba(129,140,248,0.18)] px-3 flex items-center gap-2 transition-all duration-300 before:absolute before:inset-[1px] before:-z-10 before:rounded-[inherit] before:pointer-events-none before:bg-[radial-gradient(circle_at_12%_0%,rgba(255,255,255,0.86),transparent_30%),radial-gradient(circle_at_88%_110%,rgba(99,102,241,0.16),transparent_34%)] dark:before:bg-[radial-gradient(circle_at_12%_0%,rgba(255,255,255,0.16),transparent_30%),radial-gradient(circle_at_88%_110%,rgba(129,140,248,0.2),transparent_34%)] after:absolute after:top-px after:left-[8%] after:right-[8%] after:h-px after:-z-10 after:rounded-full after:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.98),transparent)]">
          
          {/* Logo */}
          <Link
            href="/"
            className="flex h-12 w-[132px] shrink-0 items-center justify-center overflow-hidden rounded-xl transition-colors dark:bg-white/90 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_4px_14px_rgba(0,0,0,0.16)] 2xl:h-[52px] 2xl:w-[148px]"
            aria-label="MediSecours - Accueil"
          >
            <Image
              src="/brand/medisecours-logo.png"
              alt="MediSecours"
              width={853}
              height={299}
              priority
              className="h-auto w-[129px] max-w-full object-contain 2xl:w-[145px]"
            />
          </Link>

          {/* Center: Navigation Links */}
          <nav className="flex min-w-0 flex-1 items-center justify-center gap-0.5 2xl:gap-1">
            {activeLinks.map((l) => {
              const active = isActive(l.to)
              const Icon = l.icon
              return (
                <Link
                  key={l.to}
                  href={l.to}
                  className={`relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 2xl:px-4 py-2.5 rounded-full text-[12px] 2xl:text-[13px] font-semibold transition-all duration-200 ${
                    active
                      ? 'border border-white/75 dark:border-white/10 bg-white/55 dark:bg-indigo-500/20 text-indigo-900 dark:text-indigo-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_4px_12px_rgba(79,70,229,0.1)]'
                      : 'border border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:border-white/60 dark:hover:border-white/10 hover:bg-white/40 dark:hover:bg-white/5'
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
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-indigo-600 dark:bg-indigo-400 rounded-full shadow-[0_0_8px_rgba(79,70,229,0.8)]" />
                  )}
                </Link>
              )
            })}
            
            {isAdmin && (
              <Link
                href="/admin"
                className={`relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 2xl:px-4 py-2.5 rounded-full text-[12px] 2xl:text-[13px] font-semibold transition-all ${
                  isActive('/admin')
                    ? 'bg-indigo-50/80 dark:bg-indigo-900/30 text-indigo-900'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Grid className="w-4 h-4" /> Admin
                {isActive('/admin') && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-indigo-600 rounded-full" />}
              </Link>
            )}
          </nav>

          {/* Right: Actions */}
          <div className="flex shrink-0 items-center gap-1.5 pr-1">
            <button
              onClick={toggleDark}
              className="flex items-center justify-center w-9 h-9 rounded-full border border-white/70 dark:border-white/10 bg-white/45 dark:bg-white/5 text-gray-500 dark:text-gray-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_4px_12px_rgba(30,58,95,0.08)] hover:bg-white/70 dark:hover:bg-white/10 hover:text-indigo-600 transition-colors"
              aria-label="Basculer le mode sombre"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/profil"
                  className="group relative flex items-center gap-2 pl-1 pr-3 py-1 border border-white/25 bg-[linear-gradient(135deg,rgba(37,99,235,0.92),rgba(79,70,229,0.84))] backdrop-blur-xl text-white rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_6px_18px_rgba(79,70,229,0.3)] transition-all duration-200 hover:brightness-105 hover:-translate-y-0.5"
                >
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-white/20 flex items-center justify-center text-[10px] font-bold">
                    {user?.photoProfil ? (
                      <img src={resolveImgPath(user.photoProfil)} alt="" className="w-full h-full object-cover" onError={(e) => { const img = e.target as HTMLImageElement; img.style.display = 'none'; const fb = img.nextSibling as HTMLElement | null; if (fb) fb.style.display = 'flex' }} />
                    ) : null}
                    <span style={user?.photoProfil ? { display: 'none' } : undefined} className="flex items-center justify-center w-full h-full">
                      {initials || <UserCircle className="w-4 h-4" />}
                    </span>
                  </div>
                  <span className="hidden 2xl:inline text-[13px] font-semibold">Mon Profil</span>
                  <ArrowRight className="hidden 2xl:block w-3.5 h-3.5 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                
                <button
                  onClick={() => { logout(); router.push('/') }}
                  className="flex items-center justify-center w-9 h-9 rounded-full border border-white/70 dark:border-white/10 bg-white/45 dark:bg-white/5 text-gray-500 dark:text-gray-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_4px_12px_rgba(30,58,95,0.08)] hover:bg-red-50/80 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors"
                  aria-label="Se déconnecter"
                  title="Déconnexion"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="group relative flex items-center gap-2 px-5 py-2 border border-white/25 bg-[linear-gradient(135deg,rgba(37,99,235,0.92),rgba(79,70,229,0.84))] backdrop-blur-xl text-white rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_6px_18px_rgba(79,70,229,0.3)] transition-all duration-200 hover:brightness-105 hover:-translate-y-0.5"
              >
                <span className="text-[13px] font-semibold">Connexion</span>
                <ArrowRight className="w-4 h-4 opacity-70 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}
          </div>
        </header>
      </div>

      {/* Desktop spacer */}
      {pathname !== '/' && <div className="hidden xl:block h-24" />}


      {/* ══════════════════════════════════════════════════════════════════
       *  MOBILE / TABLET — Minimal Top Bar (logo + theme toggle only)
       *  Wrapped in #app-topbar so it can be hidden on mobile when a
       *  conversation is open (body.chat-open) — the bottom tab bar stays.
      * ══════════════════════════════════════════════════════════════════ */}
      <div id="app-topbar">
      <div className="xl:hidden fixed top-2 inset-x-2 sm:inset-x-4 z-50 isolate overflow-hidden rounded-[22px] border border-white/80 dark:border-white/15 bg-[linear-gradient(135deg,rgba(255,255,255,0.76),rgba(255,255,255,0.42)_52%,rgba(224,231,255,0.5))] dark:bg-[linear-gradient(135deg,rgba(17,24,39,0.84),rgba(30,41,59,0.66)_52%,rgba(49,46,129,0.44))] backdrop-blur-[24px] backdrop-saturate-[1.8] shadow-[0_14px_36px_rgba(30,58,95,0.16),inset_0_1px_0_rgba(255,255,255,0.96)] dark:shadow-[0_14px_36px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.16)] before:absolute before:inset-px before:-z-10 before:rounded-[inherit] before:bg-[radial-gradient(circle_at_15%_0%,rgba(255,255,255,0.82),transparent_34%),radial-gradient(circle_at_90%_110%,rgba(99,102,241,0.16),transparent_36%)] dark:before:bg-[radial-gradient(circle_at_15%_0%,rgba(255,255,255,0.14),transparent_34%),radial-gradient(circle_at_90%_110%,rgba(129,140,248,0.2),transparent_36%)]">
        <div className="flex items-center justify-between px-4 py-3">
          <Link
            href="/"
            className="flex h-12 w-[142px] shrink-0 items-center justify-center overflow-hidden rounded-xl transition-colors dark:bg-white/90 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_3px_12px_rgba(0,0,0,0.14)]"
            aria-label="MediSecours - Accueil"
          >
            <Image
              src="/brand/medisecours-logo.png"
              alt="MediSecours"
              width={853}
              height={299}
              priority
              className="h-auto w-[138px] max-w-full object-contain"
            />
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleDark}
              className="flex items-center justify-center w-9 h-9 rounded-full border border-white/70 dark:border-white/10 bg-white/45 dark:bg-white/5 text-gray-500 dark:text-gray-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] hover:bg-white/70 dark:hover:bg-white/10 hover:text-indigo-600 transition-colors"
              aria-label="Basculer le mode sombre"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {isAuthenticated && (
              <>
                <Link
                  href="/profil"
                  className="flex items-center justify-center w-9 h-9 rounded-full overflow-hidden border border-white/70 dark:border-white/10 bg-white/45 dark:bg-white/5 text-gray-500 dark:text-gray-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] hover:bg-white/70 dark:hover:bg-white/10 hover:text-indigo-600 transition-colors"
                  aria-label="Profil"
                >
                  {user?.photoProfil ? (
                    <img src={resolveImgPath(user.photoProfil)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle className="w-5 h-5" />
                  )}
                </Link>
                <button
                  onClick={() => { logout(); router.push('/') }}
                  className="flex items-center justify-center w-9 h-9 rounded-full border border-white/70 dark:border-white/10 bg-white/45 dark:bg-white/5 text-gray-500 dark:text-gray-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] hover:text-red-500 hover:bg-red-50/80 dark:hover:bg-red-500/10 transition-colors"
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
      <div className="xl:hidden h-[76px]" />
      </div>


      {/* ══════════════════════════════════════════════════════════════════
       *  MOBILE / TABLET — Bottom Tab Bar (iOS/Android native feel)
       *  Hidden on mobile/tablet while a conversation is open (?conversation=)
       * ══════════════════════════════════════════════════════════════════ */}
      <Suspense fallback={null}>
        <ConversationAware>
          {(inConversation) => (
      <>
      <nav className={`xl:hidden fixed bottom-2 inset-x-2 sm:inset-x-4 z-50 ${inConversation ? 'hidden md:flex' : ''}`}>
        {/* Glassmorphism container with safe area padding */}
        <div className="relative isolate overflow-hidden w-full max-w-2xl mx-auto rounded-[26px] border border-white/80 dark:border-white/15 bg-[linear-gradient(135deg,rgba(255,255,255,0.76),rgba(255,255,255,0.4)_50%,rgba(224,231,255,0.48))] dark:bg-[linear-gradient(135deg,rgba(17,24,39,0.84),rgba(30,41,59,0.64)_52%,rgba(49,46,129,0.44))] backdrop-blur-[26px] backdrop-saturate-[1.85] shadow-[0_-4px_34px_rgba(30,58,95,0.1),0_16px_40px_rgba(30,58,95,0.16),inset_0_1px_0_rgba(255,255,255,0.96)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.16)] before:absolute before:inset-px before:-z-10 before:rounded-[inherit] before:bg-[radial-gradient(circle_at_12%_0%,rgba(255,255,255,0.84),transparent_34%),radial-gradient(circle_at_88%_110%,rgba(99,102,241,0.16),transparent_36%)] dark:before:bg-[radial-gradient(circle_at_12%_0%,rgba(255,255,255,0.14),transparent_34%),radial-gradient(circle_at_88%_110%,rgba(129,140,248,0.2),transparent_36%)]">
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
                      ? 'border border-white/75 dark:border-white/10 bg-white/60 dark:bg-indigo-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_4px_12px_rgba(79,70,229,0.12)]'
                      : 'border border-transparent group-active:border-white/60 group-active:bg-white/45 dark:group-active:bg-white/5'
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
      <div className={`xl:hidden h-[88px] ${inConversation ? 'hidden md:block' : ''}`} />
      </>
          )}
        </ConversationAware>
      </Suspense>
    </>
  )
}
