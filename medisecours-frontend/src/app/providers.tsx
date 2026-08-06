'use client'

import { memo } from 'react'
import { usePathname } from 'next/navigation'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider } from '../contexts/AuthContext'
import { NotificationProvider } from '../contexts/NotificationContext'
import { ToastProvider } from '../components/ui/Toast'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''

const StableGoogleProvider = memo(function StableGoogleProvider({ children }: { children: React.ReactNode }) {
  return <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{children}</GoogleOAuthProvider>
})

export default function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdminRoute = pathname?.startsWith('/admin')
  const isMedecinRoute = pathname === '/medecin' || pathname?.startsWith('/medecin/')
  const isFocusedAuthRoute = pathname === '/login' || pathname === '/register'
  const hideShell = isAdminRoute || isMedecinRoute || isFocusedAuthRoute
  const isMessagingRoute = pathname === '/messages' || pathname?.startsWith('/patient/messages')

  return (
    <StableGoogleProvider>
      <AuthProvider>
        <ToastProvider>
          {hideShell ? (
            children
          ) : (
            <NotificationProvider>
              <Navbar />
              <main className="flex-1 flex flex-col min-h-0">{children}</main>
              {!isMessagingRoute && <Footer />}
            </NotificationProvider>
          )}
        </ToastProvider>
      </AuthProvider>
    </StableGoogleProvider>
  )
}
