'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState, useMemo } from 'react'
import { LocateFixed, Phone, Clock, MapPin } from 'lucide-react'
import api from '../../api/axios'
import { useGeolocation } from '../../hooks/useGeolocation'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/Toast'

const CentresMap = dynamic(() => import('../../components/CentresMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center">
      <LoadingSpinner label="Chargement de la carte…" />
    </div>
  ),
})

function extractArray(res: any) {
  const raw = res.data?.['hydra:member'] ?? res.data?.member ?? res.data
  return Array.isArray(raw) ? raw : []
}

function distanceKm(a: any, b: any) {
  if (!a || !b) return null
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

export default function CentresPage() {
  const [centres,  setCentres]  = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const { position, error, loading: locating, locate } = useGeolocation()
  const toast = useToast()

  useEffect(() => {
    api.get('/api/centre_de_santes')
      .then((res: any) => setCentres(extractArray(res)))
      .catch(() => toast.error('Impossible de charger les centres de santé.'))
      .finally(() => setLoading(false))
  }, [toast])

  useEffect(() => {
    if (!position) return
    api.get('/api/centres_de_santes/proches', {
      params: { lat: position.lat, lng: position.lng, rayon: 25, limit: 20 },
    })
      .then((res: any) => {
        const data = extractArray(res)
        if (data.length > 0) setCentres(data)
      })
      .catch(() => toast.error('Impossible de récupérer les centres proches.'))
  }, [position, toast])

  const sorted = useMemo(() => {
    if (!position) return centres
    return [...centres].sort((a: any, b: any) => {
      const da = distanceKm(position, { lat: a.latitude, lng: a.longitude })
      const db = distanceKm(position, { lat: b.latitude, lng: b.longitude })
      return (da ?? 9999) - (db ?? 9999)
    })
  }, [centres, position])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display font-bold text-3xl text-primary-900 dark:text-sable">
            Centres de santé
          </h1>
          <p className="text-primary-300 text-sm mt-1">Localisez le centre le plus proche de vous.</p>
        </div>
        <button
          onClick={locate}
          disabled={locating}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-mint-500 hover:bg-mint-700 text-white font-semibold shadow-lg transition disabled:opacity-60"
        >
          <LocateFixed className="w-4 h-4" />
          {locating ? 'Localisation…' : 'Me localiser'}
        </button>
      </div>

      {error && <p className="text-sm text-urgence-500 mb-4">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 rounded-2xl overflow-hidden shadow-xl border border-white/50 dark:border-white/10 h-[420px] lg:h-[600px]">
          <CentresMap centres={sorted} position={position || undefined} onSelect={setSelected} />
        </div>

        <div className="lg:col-span-2 max-h-[600px] overflow-y-auto pr-1 space-y-3">
          {loading ? (
            <LoadingSpinner label="Chargement des centres…" />
          ) : sorted.length === 0 ? (
            <EmptyState
              title="Aucun centre disponible"
              description="Le réseau de centres de santé est en cours de mise à jour."
            />
          ) : (
            sorted.map((c: any) => {
              const dist = position
                ? distanceKm(position, { lat: c.latitude, lng: c.longitude })
                : null
              return (
                <div
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                  className={`rounded-2xl p-4 border cursor-pointer transition ${
                    selected === c.id
                      ? 'border-mint-500 bg-mint-100/30'
                      : 'border-primary-100 dark:border-white/10 bg-white/70 dark:bg-primary-700/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-primary-900 dark:text-sable">{c.nom}</h3>
                    {dist !== null && (
                      <span className="text-xs font-bold text-mint-700 bg-mint-100 px-2 py-0.5 rounded-full shrink-0">
                        {dist.toFixed(1)} km
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-primary-300 flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" /> {c.adresse}
                  </p>
                  {c.telephone && (
                    <a
                      href={`tel:${c.telephone}`}
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      className="text-xs text-mint-600 flex items-center gap-1 mt-1 hover:underline"
                    >
                      <Phone className="w-3 h-3" /> {c.telephone}
                    </a>
                  )}
                  {c.horaires && (
                    <p className="text-xs text-primary-300 flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" /> {c.horaires}
                    </p>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
