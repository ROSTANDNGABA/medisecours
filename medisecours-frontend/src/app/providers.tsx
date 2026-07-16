'use client'

import { memo } from 'react'
import { usePathname } from 'next/navigation'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider } from '../contexts/AuthContext'
import { ToastProvider } from '../components/ui/Toast'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'

const GOOGLE_CLIENT_ID = '868093104410-go2kft69vu9rbrq4nm3j7295dflgbp97.apps.googleusercontent.com'

const StableGoogleProvider = memo(function StableGoogleProvider({ children }: { children: React.ReactNode }) {
  return <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{children}</GoogleOAuthProvider>
})

export default function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdminRoute = pathname?.startsWith('/admin')
  const isMedecinRoute = pathname?.startsWith('/medecin')
  const hideShell = isAdminRoute || isMedecinRoute

  return (
    <StableGoogleProvider>
      <AuthProvider>
        <ToastProvider>
          {hideShell ? (
            children
          ) : (
            <>
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
            </>
          )}
        </ToastProvider>
      </AuthProvider>
    </StableGoogleProvider>
  )
}
