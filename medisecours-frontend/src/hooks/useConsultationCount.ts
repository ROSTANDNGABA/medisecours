import useSWR from 'swr'
import api from '../api/axios'
import { useWebSocket } from './useWebSocket'
import { useAuth } from './useAuth'

// Raw fetcher that returns the FULL API response (with hydra:totalItems)
const rawFetcher = async (url: string) => {
  const res = await api.get(url)
  return res.data
}

export function useConsultationCount() {
  const { user, isMedecin } = useAuth()
  
  const { data, mutate } = useSWR(
    (user && isMedecin) ? '/api/consultations?statut=OUVERTE&itemsPerPage=1' : null,
    rawFetcher,
    { refreshInterval: 15000, revalidateOnFocus: true }
  )

  const token = typeof window !== 'undefined' ? localStorage.getItem('medisecours_token') : null

  useWebSocket(user?.id || '', token || '', {
    onConsultationCreated: () => mutate(),
    onConsultationAccepted: () => mutate(),
    onConsultationClosed: () => mutate(),
  })

  const consultationCount = data?.['hydra:totalItems'] ?? data?.totalItems ?? 0

  return { consultationCount, mutate }
}
