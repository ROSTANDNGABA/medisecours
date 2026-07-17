// @ts-nocheck
'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { ClipboardList, Phone, Mail, MessageSquare, FileText } from 'lucide-react'
import useSWR from 'swr'
import api from '../../../api/axios'
import { fetcher } from '../../../lib/fetcher'
import { useAuth } from '../../../hooks/useAuth'
import { useWebSocket } from '../../../hooks/useWebSocket'
import LoadingSpinner from '../../../components/ui/LoadingSpinner'
import EmptyState from '../../../components/ui/EmptyState'
import Avatar from '../../../components/ui/Avatar'
import { useToast } from '../../../components/ui/Toast'
import PrescriptionModal from '../../../components/admin/PrescriptionModal'

const STATUT_BADGE = {
  OUVERTE:  'bg-amber-100 text-amber-700',
  EN_COURS: 'bg-blue-100 text-blue-700',
  TERMINEE: 'bg-green-100 text-green-600',
  ANNULEE:  'bg-gray-100 text-gray-500',
}
const STATUT_LABEL = {
  OUVERTE: 'En attente', EN_COURS: 'En cours', TERMINEE: 'Terminée', ANNULEE: 'Annulée',
}
const TABS = [
  { key: 'TOUTES',   label: 'Toutes' },
  { key: 'OUVERTE',  label: 'En attente' },
  { key: 'EN_COURS', label: 'En cours' },
  { key: 'TERMINEE', label: 'Terminées' },
  { key: 'ANNULEE',  label: 'Annulées' },
]

function daysSince(dateString) {
  return Math.max(0, Math.floor((Date.now() - new Date(dateString).getTime()) / 86400000))
}

export default function ConsultationsPage() {
  const { user, token } = useAuth()
  const [tab, setTab] = useState('TOUTES')
  const toast = useToast()
  const [prescriptionFor, setPrescriptionFor] = useState(null)

  const { data, isLoading, error, mutate } = useSWR('/api/consultations', fetcher, { revalidateOnFocus: false })

  // Real-time WS updates
  useWebSocket(user?.id || '', token || '', {
    onConsultationCreated: useCallback((payload) => {
      mutate((current) => {
        const list = Array.isArray(current) ? current : []
        if (list.some((c) => c.id === payload.id)) return list
        return [{ ...payload, patient: payload.patient, medecin: payload.medecin }, ...list]
      }, { revalidate: false })
      toast.info('Nouvelle consultation disponible.')
    }, [mutate, toast]),
  })

  const consultations = useMemo(() => {
    const list = Array.isArray(data) ? data : []
    return [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [data])

  useEffect(() => {
    if (error) toast.error('Impossible de charger les consultations.')
  }, [error, toast])

  const counts = useMemo(() => {
    const list = Array.isArray(consultations) ? consultations : []
    return {
      TOUTES:   list.length,
      OUVERTE:  list.filter((c) => c.statut === 'OUVERTE').length,
      EN_COURS: list.filter((c) => c.statut === 'EN_COURS').length,
      TERMINEE: list.filter((c) => c.statut === 'TERMINEE').length,
      ANNULEE:  list.filter((c) => c.statut === 'ANNULEE').length,
    }
  }, [consultations])

  const filtered = useMemo(() => {
    const list = Array.isArray(consultations) ? consultations : []
    const base = tab === 'TOUTES' ? list : list.filter((c) => c.statut === tab)
    return [...base].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [consultations, tab])

  const updateStatut = async (id, statut) => {
    try {
      await api.patch(
        `/api/consultations/${id}`,
        { statut },
        { headers: { 'Content-Type': 'application/merge-patch+json' } }
      )
      mutate(
        (current) => {
          const list = Array.isArray(current) ? current : []
          return list.map((c) => (c.id === id ? { ...c, statut } : c))
        },
        { revalidate: false }
      )
      toast.success(statut === 'EN_COURS' ? 'Consultation démarrée.' : 'Consultation clôturée.')
    } catch {
      toast.error('Échec de la mise à jour.')
    }
  }

  if (isLoading) return <LoadingSpinner label="Chargement des consultations…" />

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-2 mb-6">
        <h2 className="font-display font-bold text-2xl text-primary-900 dark:text-sable">
          Consultations
        </h2>
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-100 text-primary-700">
          {counts.TOUTES}
        </span>
      </div>

      {/* Onglets */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition ${
              tab === t.key
                ? 'bg-primary-500 text-white'
                : 'bg-white dark:bg-primary-800 text-primary-700 dark:text-sable border border-primary-100 dark:border-white/5 hover:bg-primary-100 dark:hover:bg-primary-700'
            }`}
          >
            {t.label} ({counts[t.key] ?? 0})
          </button>
        ))}
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Aucune consultation"
          description="Aucune consultation ne correspond à ce filtre."
        />
      ) : (
        <AnimatePresence>
          <div className="space-y-3">
            {filtered.map((c) => (
              <motion.div
                key={c.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="rounded-2xl bg-white dark:bg-primary-800 border border-primary-100 dark:border-white/5 p-5 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                {/* Patient */}
                <div className="flex items-center gap-3 sm:w-64 shrink-0">
                  <Avatar name={`${c.patient?.prenom || ''} ${c.patient?.nom || ''}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-primary-900 dark:text-sable truncate">
                      {c.patient?.prenom} {c.patient?.nom}
                    </p>
                    {c.patient?.telephone && (
                      <p className="text-xs text-primary-300 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {c.patient.telephone}
                      </p>
                    )}
                    {c.patient?.email && (
                      <p className="text-xs text-primary-300 flex items-center gap-1 truncate">
                        <Mail className="w-3 h-3" /> {c.patient.email}
                      </p>
                    )}
                  </div>
                </div>

                {/* Motif + statut */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-primary-700 dark:text-sable truncate">
                    {c.motif ? c.motif.slice(0, 80) : 'Motif non précisé'}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUT_BADGE[c.statut] || ''}`}>
                      {STATUT_LABEL[c.statut] || c.statut}
                    </span>
                    {c.priorite !== 'NORMALE' && (
                      <span className="text-xs font-semibold text-red-500 flex items-center gap-0.5">
                        {c.priorite}
                      </span>
                    )}
                    <span className="text-xs text-primary-300">
                      Ouverte depuis {daysSince(c.createdAt)} j
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {c.statut === 'OUVERTE' && (
                    <button
                      onClick={() => updateStatut(c.id, 'EN_COURS')}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary-500 hover:bg-primary-700 text-white"
                    >
                      Prendre en charge
                    </button>
                  )}
                  {(c.statut === 'OUVERTE' || c.statut === 'EN_COURS') && (
                    <Link
                      href={`/medecin/messages?patient=${c.patient?.id}`}
                      className="p-2 rounded-xl border border-primary-100 dark:border-white/10 text-primary-500 dark:text-sable hover:bg-primary-100 dark:hover:bg-primary-700"
                      title="Envoyer un message"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </Link>
                  )}
                  {c.statut === 'EN_COURS' && (
                    <>
                      <button
                        onClick={() => setPrescriptionFor(c)}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-mint-500 hover:bg-mint-700 text-white"
                        title="Prescrire"
                      >
                        <FileText className="w-3.5 h-3.5" /> Prescrire
                      </button>
                      <button
                        onClick={() => updateStatut(c.id, 'TERMINEE')}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-red-500 hover:bg-red-700 text-white"
                      >
                        Terminer
                      </button>
                    </>
                  )}
                  {c.statut === 'TERMINEE' && (
                    <span className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-primary-100 dark:border-white/10 text-primary-500 dark:text-sable">
                      Terminée
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Modal de prescription */}
      {prescriptionFor && (
        <PrescriptionModal
          consultation={prescriptionFor}
          onClose={() => setPrescriptionFor(null)}
          onSaved={() => { setPrescriptionFor(null); mutate() }}
        />
      )}
    </div>
  )
}
