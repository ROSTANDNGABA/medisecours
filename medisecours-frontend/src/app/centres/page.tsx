'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LocateFixed, Phone, Clock, MapPin,
  Car, Footprints, Navigation, Route,
  Loader2, AlertCircle, X, Eye,
} from 'lucide-react'
import api from '../../api/axios'
import { useGeolocation } from '../../hooks/useGeolocation'
import { useWayfinding } from '../../hooks/useWayfinding'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/Toast'
import Modal from '../../components/ui/Modal'
import { imgUrl } from '../../lib/config'

const CentresMap = dynamic(() => import('../../components/CentresMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center">
      <LoadingSpinner label="Chargement de la carte…" />
    </div>
  ),
})

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractArray(res: any) {
  const raw = res.data?.['hydra:member'] ?? res.data?.member ?? res.data
  return Array.isArray(raw) ? raw : []
}

function distanceKm(a: {lat: number, lng: number}, b: {lat: number, lng: number}) {
  if (!a || !b) return null
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

function formatDuration(seconds: number | null) {
  if (!seconds) return '–'
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}min`
  return `${m} min`
}

// ─── Types ──────────────────────────────────────────────────────────────────

type TravelMode = 'driving' | 'walking'

interface Destination {
  lat: number
  lng: number
  nom: string
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function CentresPage() {
  const [centres, setCentres] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [mode, setMode] = useState<TravelMode>('driving')
  const [destination, setDestination] = useState<Destination | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [previewCentre, setPreviewCentre] = useState<any>(null)
  const [mobileMapInteractive, setMobileMapInteractive] = useState(false)

  const { position, error, loading: locating, locate, watch, stopWatch, isWatching } = useGeolocation()
  const toast = useToast()
  
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isTracking) {
      watch()
    } else {
      stopWatch()
    }
  }, [isTracking, watch, stopWatch])

  const {
    route,
    distance,
    duration,
    loading: routeLoading,
    error: routeError,
    isFallback,
    clear: clearRoute,
  } = useWayfinding({
    patientPosition: position,
    destination,
    mode,
  })

  // ─── Abortable fetches with useCallback ──────────────────────────────────
  const fetchAllCentres = useCallback(() => {
    const controller = new AbortController()
    setLoading(true)
    api.get('/api/centre_de_santes', { signal: controller.signal })
      .then((res: any) => setCentres(extractArray(res)))
      .catch((err) => {
        if (err.name !== 'CanceledError' && err.message !== 'canceled') {
          toast.error('Impossible de charger les centres de santé.')
        }
      })
      .finally(() => setLoading(false))
    return controller
  }, [toast])

  const fetchNearbyCentres = useCallback((pos: {lat: number, lng: number}) => {
    const controller = new AbortController()
    api.get('/api/centres_de_santes/proches', {
      params: { lat: pos.lat, lng: pos.lng, rayon: 25, limit: 20 },
      signal: controller.signal
    })
      .then((res: any) => {
        const data = extractArray(res)
        if (data.length > 0) setCentres(data)
      })
      .catch((err) => {
        if (err.name !== 'CanceledError' && err.message !== 'canceled') {
          toast.error('Impossible de récupérer les centres proches.')
        }
      })
    return controller
  }, [toast])

  // Initial load
  useEffect(() => {
    const controller = fetchAllCentres()
    return () => controller.abort()
  }, [fetchAllCentres])

  const hasFetchedNearbyRef = useRef(false)

  // Load nearby when position is available (only once automatically)
  useEffect(() => {
    if (!position) return
    if (destination) return
    if (hasFetchedNearbyRef.current) return

    hasFetchedNearbyRef.current = true
    const controller = fetchNearbyCentres(position)
    return () => controller.abort()
  }, [position, fetchNearbyCentres, destination])

  // ─── Precalculate distances to avoid recalculating on every render ──────
  const distancesMap = useMemo(() => {
    const map = new Map<number, number | null>()
    if (!position) return map
    centres.forEach(c => {
      map.set(c.id, distanceKm(position, { lat: c.latitude, lng: c.longitude }))
    })
    return map
  }, [centres, position])

  // ─── Sort centres by precalculated distance ─────────────────────────────
  const sorted = useMemo(() => {
    if (!position) return centres
    return [...centres].sort((a: any, b: any) => {
      const da = distancesMap.get(a.id) ?? 9999
      const db = distancesMap.get(b.id) ?? 9999
      return da - db
    })
  }, [centres, position, distancesMap])

  const handleSelectCentre = useCallback((centreId: number) => {
    if (selected === centreId) {
      // Deselect: clear everything and restore ALL centres
      setSelected(null)
      setDestination(null)
      clearRoute()
      setIsTracking(false)
      fetchAllCentres()
    } else {
      setSelected(centreId)
      const c = sorted.find((x: any) => x.id === centreId)
      if (c && c.latitude != null && c.longitude != null) {
        setDestination({ lat: c.latitude, lng: c.longitude, nom: c.nom })
      }
    }
  }, [selected, sorted, clearRoute, position, fetchAllCentres])

  const clearAll = useCallback(() => {
    setSelected(null)
    setDestination(null)
    clearRoute()
    setIsTracking(false)
    fetchAllCentres() // Restore ALL centres on the map
  }, [clearRoute, fetchAllCentres])
  
  // ─── Scroll to selected centre in the list ──────────────────────────────
  useEffect(() => {
    if (selected && listRef.current) {
      const el = listRef.current.querySelector(`[data-id="${selected}"]`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }
  }, [selected])

  const handleLocate = () => {
    if (selected) {
      setIsTracking(true)
    } else {
      if (position) {
        // Force refetch nearby centers if clicking while already localized
        fetchNearbyCentres(position)
      }
      locate()
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display font-bold text-3xl text-primary-900 dark:text-sable">
            Centres de santé
          </h1>
          <p className="text-primary-300 text-sm mt-1">Localisez le centre le plus proche de vous.</p>
        </div>
        <button
          onClick={handleLocate}
          disabled={locating}
          aria-busy={locating}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-mint-500 hover:bg-mint-700 text-white font-semibold shadow-lg transition disabled:opacity-60"
        >
          <LocateFixed className={`w-4 h-4 ${locating ? 'animate-spin' : ''}`} />
          {locating ? 'Localisation…' : (isWatching ? 'Suivi GPS en cours' : 'Me localiser')}
        </button>
      </div>

      {error && <p className="text-sm text-urgence-500 mb-4">{error}</p>}

      {/* ═══ Mode selector + Route info panel ═══ */}
      <div className="space-y-3 mb-4">
        {/* Travel mode selector (visible only when position available AND a centre is selected) */}
        {position && selected && (
          <div className="flex gap-2 items-center">
            <span className="text-xs text-primary-300 font-medium">Mode :</span>
            {(['driving', 'walking'] as TravelMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                  border transition-colors ${
                  mode === m
                    ? 'bg-primary-500 text-white border-primary-500'
                    : 'bg-white dark:bg-primary-800 text-primary-300 border-primary-100 dark:border-white/10 hover:border-primary-300 dark:hover:border-white/30'
                }`}
              >
                {m === 'driving'
                  ? <><Car className="w-3.5 h-3.5" /> En voiture</>
                  : <><Footprints className="w-3.5 h-3.5" /> À pied</>
                }
              </button>
            ))}
          </div>
        )}

        {/* Route info banner */}
        <AnimatePresence>
          {destination && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div
                className="flex flex-wrap items-center gap-4 px-4 py-3 rounded-xl
                           border border-primary-200 dark:border-primary-700
                           bg-primary-50 dark:bg-primary-800/40"
                aria-label={`Itinéraire vers ${destination.nom}`}
              >
                {routeLoading ? (
                  <div className="flex items-center gap-2 text-sm text-primary-300">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Calcul de l&apos;itinéraire vers {destination.nom}…
                  </div>
                ) : routeError && !route ? (
                  <div className="flex items-center gap-2 text-sm text-urgence-500">
                    <AlertCircle className="w-4 h-4" />
                    {routeError}
                  </div>
                ) : route ? (
                  <>
                    <div className="flex items-center gap-2 text-sm font-semibold text-primary-700 dark:text-sable">
                      <Navigation className="w-4 h-4 text-primary-500 dark:text-mint-500" />
                      {destination.nom}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-primary-500 dark:text-primary-300">
                      <span className="flex items-center gap-1">
                        <Route className="w-4 h-4" />
                        {distance ? (distance / 1000).toFixed(1) : '–'} km
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatDuration(duration)}
                      </span>
                      {isFallback && (
                        <span className="text-xs text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                          Itinéraire approximatif
                        </span>
                      )}
                    </div>
                    <button
                      onClick={clearAll}
                      className="ml-auto flex items-center gap-1 text-xs text-primary-300 hover:text-urgence-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" /> Effacer
                    </button>
                  </>
                ) : null}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Map */}
        <div className="isolate z-0 lg:col-span-3 relative h-[340px] overflow-hidden rounded-2xl border border-white/50 shadow-xl sm:h-[420px] lg:h-[600px] dark:border-white/10">
          <CentresMap
            centres={sorted}
            position={position || undefined}
            onSelect={handleSelectCentre}
            route={route}
            isFallback={isFallback}
            destination={destination}
          />

          {!mobileMapInteractive && (
            <div className="absolute inset-0 z-[600] flex touch-pan-y items-end justify-center bg-gradient-to-t from-slate-950/45 via-transparent to-transparent p-4 lg:hidden">
              <div className="w-full max-w-sm rounded-xl border border-white/70 bg-white/95 p-3 text-center shadow-xl backdrop-blur-md dark:border-white/15 dark:bg-slate-950/95">
                <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">
                  Faites glisser votre doigt pour parcourir la page et la liste des centres.
                </p>
                <button
                  type="button"
                  onClick={() => setMobileMapInteractive(true)}
                  className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-bold text-white transition hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-500/25"
                >
                  <MapPin className="h-4 w-4" />
                  Explorer la carte
                </button>
              </div>
            </div>
          )}

          {mobileMapInteractive && (
            <button
              type="button"
              onClick={() => setMobileMapInteractive(false)}
              className="absolute right-3 top-3 z-[600] inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/80 bg-white/95 px-3 text-xs font-bold text-slate-800 shadow-lg backdrop-blur-md dark:border-white/15 dark:bg-slate-950/95 dark:text-white lg:hidden"
            >
              <X className="h-4 w-4" />
              Reprendre le défilement
            </button>
          )}
          
          {/* Contrôle au-dessus de la carte, limité à son contexte d'empilement. */}
          {position && (
            <div className={`absolute bottom-6 left-1/2 z-20 -translate-x-1/2 ${mobileMapInteractive ? '' : 'hidden lg:block'}`}>
              <button
                onClick={() => setIsTracking(!isTracking)}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-white shadow-xl transition-all ${
                  isTracking 
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                    : 'bg-primary-600 hover:bg-primary-700'
                }`}
              >
                {isTracking ? '🛑 Arrêter le suivi' : '🚀 Se déplacer / Démarrer'}
              </button>
            </div>
          )}
        </div>

        {/* Centre cards list */}
        <div ref={listRef} className="space-y-3 pr-1 lg:col-span-2 lg:max-h-[600px] lg:overflow-y-auto">
          {loading ? (
            <LoadingSpinner label="Chargement des centres…" />
          ) : sorted.length === 0 ? (
            <EmptyState
              title="Aucun centre disponible"
              description="Le réseau de centres de santé est en cours de mise à jour."
            />
          ) : (
            sorted.map((c: any) => {
              const dist = distancesMap.get(c.id)
              const isSelected = selected === c.id
              const hasCoords = c.latitude != null && c.longitude != null

              return (
                <div
                  key={c.id}
                  data-id={c.id}
                  onClick={() => handleSelectCentre(c.id)}
                  className={`rounded-2xl p-4 border cursor-pointer transition ${
                    isSelected
                      ? 'border-mint-500 bg-mint-100/30 dark:bg-mint-500/10'
                      : 'border-primary-100 dark:border-white/10 bg-white/70 dark:bg-primary-700/40'
                  }`}
                >
                  {/* Photo du centre (conditionnelle) */}
                  {(() => {
                    const photoSrc = c.photo || c.imageUrl || (Array.isArray(c.photos) && c.photos[0]) || null;
                    if (!photoSrc) return null;
                    return (
                      <div className="w-full h-32 rounded-xl overflow-hidden mb-3">
                        <img
                          src={imgUrl(typeof photoSrc === 'string' ? photoSrc : String(photoSrc)) || String(photoSrc)}
                          alt={c.nom}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                        />
                      </div>
                    );
                  })()}

                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-primary-900 dark:text-sable">{c.nom}</h3>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setPreviewCentre(c); }}
                        className="p-1.5 rounded-full bg-white dark:bg-primary-800 text-primary-400 hover:text-primary-600 dark:hover:text-primary-200 border border-primary-100 dark:border-white/10 shadow-sm transition-colors"
                        title="Voir les détails"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {dist != null && (
                        <span className="text-xs font-bold text-mint-700 dark:text-mint-500 bg-mint-100 dark:bg-mint-500/10 px-2 py-0.5 rounded-full shrink-0">
                          {dist.toFixed(1)} km
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-primary-300 flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" /> {c.adresse}
                  </p>
                  {c.telephone && (
                    <a
                      href={`tel:${c.telephone}`}
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      className="text-xs text-mint-600 dark:text-mint-500 flex items-center gap-1 mt-1 hover:underline"
                    >
                      <Phone className="w-3 h-3" /> {c.telephone}
                    </a>
                  )}
                  {c.horaires && (
                    <p className="text-xs text-primary-300 flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" /> {c.horaires}
                    </p>
                  )}

                  {/* ═══ Directions button ═══ */}
                  {position && hasCoords && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectCentre(c.id)
                      }}
                      className={`mt-3 w-full flex items-center justify-center gap-1.5
                        py-2 rounded-lg text-xs font-semibold transition-colors border ${
                        isSelected
                          ? 'bg-mint-500 text-white border-mint-500 hover:bg-mint-700'
                          : 'bg-white dark:bg-primary-800 text-primary-500 dark:text-primary-200 border-primary-100 dark:border-white/10 hover:bg-primary-50 dark:hover:bg-primary-700'
                      }`}
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      {isSelected ? 'Itinéraire actif' : "Voir l'itinéraire"}
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ═══ Details Modal ═══ */}
      <Modal
        isOpen={!!previewCentre}
        onClose={() => setPreviewCentre(null)}
        title="Détails du centre"
      >
        {previewCentre && (
          <div className="space-y-4">
            {/* Photo principale du centre */}
            {(() => {
              const photoSrc = previewCentre.photo || previewCentre.imageUrl || (Array.isArray(previewCentre.photos) && previewCentre.photos[0]) || null;
              if (!photoSrc) return null;
              return (
                <div className="w-full h-48 rounded-xl overflow-hidden">
                  <img
                    src={imgUrl(typeof photoSrc === 'string' ? photoSrc : String(photoSrc)) || String(photoSrc)}
                    alt={previewCentre.nom}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                  />
                </div>
              );
            })()}

            <div>
              <h3 className="font-display font-bold text-xl text-primary-900 dark:text-sable">
                {previewCentre.nom}
              </h3>
              <p className="text-sm font-medium text-primary-500 mt-1">
                {previewCentre.type_centre || 'Centre de santé'}
              </p>
            </div>
            
            <div className="space-y-3 bg-primary-50 dark:bg-primary-900/30 p-4 rounded-xl border border-primary-100 dark:border-white/5">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary-400 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-primary-800 dark:text-primary-100">Adresse</p>
                  <p className="text-sm text-primary-600 dark:text-primary-300">
                    {previewCentre.adresse}
                    <br />
                    {previewCentre.ville ? `${previewCentre.ville}, ` : ''}{previewCentre.region || ''}
                  </p>
                </div>
              </div>
              
              {previewCentre.telephone && (
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-primary-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-primary-800 dark:text-primary-100">Téléphone</p>
                    <a href={`tel:${previewCentre.telephone}`} className="text-sm text-mint-600 dark:text-mint-500 hover:underline">
                      {previewCentre.telephone}
                    </a>
                  </div>
                </div>
              )}
              
              {previewCentre.horaires && (
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-primary-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-primary-800 dark:text-primary-100">Horaires</p>
                    <p className="text-sm text-primary-600 dark:text-primary-300">{previewCentre.horaires}</p>
                  </div>
                </div>
              )}
            </div>

            {previewCentre.capacite_lits && (
              <div className="flex justify-between items-center bg-white dark:bg-primary-800 p-3 rounded-lg border border-primary-100 dark:border-white/10">
                <span className="text-sm text-primary-500">Capacité en lits</span>
                <span className="font-bold text-primary-900 dark:text-sable">{previewCentre.capacite_lits}</span>
              </div>
            )}
            
            {previewCentre.services && (
              <div>
                <p className="text-sm font-semibold text-primary-800 dark:text-primary-100 mb-2">Services disponibles</p>
                <div className="flex flex-wrap gap-2">
                  {(Array.isArray(previewCentre.services) 
                    ? previewCentre.services 
                    : String(previewCentre.services).split(',')
                  ).map((srv: string, i: number) => (
                    <span key={i} className="text-xs bg-primary-100 dark:bg-primary-700/50 text-primary-700 dark:text-primary-200 px-2.5 py-1 rounded-full">
                      {String(srv).trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 📸 Photos Gallery */}
            {(() => {
              const photosData = previewCentre.photos || previewCentre.images || previewCentre.imageUrl || previewCentre.photo;
              if (!photosData) return null;
              
              const photosArray = Array.isArray(photosData) 
                ? photosData 
                : typeof photosData === 'string' 
                  ? photosData.split(',') 
                  : [photosData];

              const validPhotos = photosArray.filter(p => typeof p === 'string' && p.trim().length > 0);
              
              if (validPhotos.length === 0) return null;

              return (
                <div className="mt-4">
                  <p className="text-sm font-semibold text-primary-800 dark:text-primary-100 mb-2">Photos du centre</p>
                  <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
                    {validPhotos.map((photoUrl: string, idx: number) => (
                      <div key={idx} className="shrink-0 snap-start">
                        <img 
                          src={imgUrl(photoUrl.trim()) || photoUrl.trim()} 
                          alt={`Photo de ${previewCentre.nom}`} 
                          className="w-48 h-32 object-cover rounded-xl border border-primary-100 dark:border-white/10 shadow-sm"
                          onError={(e) => {
                            // Hide broken images gracefully
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </Modal>
    </div>
  )
}
