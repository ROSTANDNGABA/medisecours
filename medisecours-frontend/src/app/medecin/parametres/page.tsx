'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '../../../components/ui/LoadingSpinner'

export default function ParametresPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/medecin/profil')
  }, [router])

  return <LoadingSpinner label="Redirection…" />
}
