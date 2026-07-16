'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Stethoscope, Search, Star, MessageSquare, Clock } from 'lucide-react'
import useSWR from 'swr'
import Image from 'next/image'
import { fetcher } from '../../lib/fetcher'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import { useDebounce } from '../../hooks/useDebounce'

const SPECIALITES = [
  'Toutes', 'Médecine générale', 'Pédiatrie', 'Cardiologie',
  'Gynécologie', 'Chirurgie', 'Dermatologie', 'Ophtalmologie',
  'Psychiatrie', 'Neurologie',
]

const LIMIT = 12

function MedecinCard({ medecin, index }: { medecin: any; index: number }) {
  const initiales = `${medecin.prenom?.[0] || ''}${medecin.nom?.[0] || ''}`.toUpperCase()
  const note = medecin.noteMoyenne ?? 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-2xl bg-white/80 dark:bg-primary-700/40 border border-white/50 dark:border-white/10 shadow-lg p-5 flex flex-col gap-3 hover:shadow-xl transition"
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
          {medecin.photoProfil
            ? <Image src={medecin.photoProfil} alt="" width={48} height={48} className="w-full h-full object-cover" />
            : initiales
          }
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-primary-900 dark:text-sable truncate">
            Dr {medecin.prenom} {medecin.nom}
          </p>
          <p className="text-xs text-primary-400 truncate">{medecin.specialite || 'Médecin'}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} className={`w-3.5 h-3.5 ${n <= Math.round(note) ? 'text-amber-400 fill-amber-400' : 'text-primary-200'}`} />
        ))}
        <span className="text-xs text-primary-400 ml-1">{note > 0 ? note.toFixed(1) : 'Aucun avis'}</span>
      </div>

      {medecin.disponibilitesTexte && (
        <div className="flex items-center gap-1.5 text-xs text-primary-400">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{medecin.disponibilitesTexte}</span>
        </div>
      )}

      <div className="flex gap-2 mt-auto pt-1">
        <Link href={`/medecins/${medecin.id}`}
          className="flex-1 text-center py-2 rounded-xl border border-primary-100 dark:border-white/10 text-xs font-semibold text-primary-700 dark:text-sable hover:bg-primary-100 dark:hover:bg-primary-900 transition">
          Voir le profil
        </Link>
        <Link href={`/messages?medecin=${medecin.id}`}
          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-mint-500 hover:bg-mint-700 text-white text-xs font-semibold transition">
          <MessageSquare className="w-3.5 h-3.5" /> Contacter
        </Link>
      </div>
    </motion.div>
  )
}

export default function MedecinsPage() {
  const [search,     setSearch]     = useState('')
  const [specialite, setSpecialite] = useState('Toutes')
  const [page,       setPage]       = useState(1)

  const debouncedSearch = useDebounce(search, 400)

  const swrKey = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) })
    if (specialite !== 'Toutes') params.set('specialite', specialite)
    return `/api/medecins-publics?${params.toString()}`
  }, [page, specialite])

  const { data, isLoading } = useSWR(swrKey, fetcher, { keepPreviousData: true })

  const rawList = useMemo(() => {
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.['hydra:member'])) return data['hydra:member']
    if (Array.isArray(data?.medecins)) return data.medecins
    return []
  }, [data])

  const total = data?.['hydra:totalItems'] ?? rawList.length

  const medecins = useMemo(() => {
    if (!debouncedSearch) return rawList
    const q = debouncedSearch.toLowerCase()
    return rawList.filter((m: any) =>
      m.nom?.toLowerCase().includes(q) ||
      m.prenom?.toLowerCase().includes(q) ||
      m.specialite?.toLowerCase().includes(q)
    )
  }, [rawList, debouncedSearch])

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  const handleSpecialite = (val: string) => { setSpecialite(val); setPage(1) }
  const handleSearch     = (val: string) => { setSearch(val);     setPage(1) }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl text-primary-900 dark:text-sable mb-1">
          Nos médecins
        </h1>
        <p className="text-primary-300">
          Consultez les profils de nos professionnels de santé vérifiés et contactez-les directement.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-300" />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Rechercher par nom ou spécialité…"
            className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-primary-100 dark:border-white/10 bg-white/80 dark:bg-primary-900/40 focus:outline-none focus:ring-2 focus:ring-mint-500"
          />
        </div>
        <select
          value={specialite}
          onChange={(e) => handleSpecialite(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-primary-100 dark:border-white/10 bg-white/80 dark:bg-primary-900/40 focus:outline-none focus:ring-2 focus:ring-mint-500 text-sm text-primary-700 dark:text-sable"
        >
          {SPECIALITES.map((s: string) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Chargement des médecins…" />
      ) : medecins.length === 0 ? (
        <EmptyState icon={Stethoscope} title="Aucun médecin trouvé" description="Modifiez vos critères de recherche." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {medecins.map((med: any, i: number) => <MedecinCard key={med.id} medecin={med} index={i} />)}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPage((p: number) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-xl border border-primary-100 dark:border-white/10 text-sm disabled:opacity-40 hover:bg-primary-100 dark:hover:bg-primary-900 transition"
          >
            Précédent
          </button>
          <span className="text-sm text-primary-400">Page {page} / {totalPages}</span>
          <button
            onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-xl border border-primary-100 dark:border-white/10 text-sm disabled:opacity-40 hover:bg-primary-100 dark:hover:bg-primary-900 transition"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  )
}
