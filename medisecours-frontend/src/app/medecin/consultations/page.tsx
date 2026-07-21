'use client'

import { useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ClipboardList, Clock, CheckCircle, MessageSquare, FileText, AlertTriangle,
  Activity, Phone, Mail, User, Trash2,
} from 'lucide-react'
import useSWR, { mutate as globalMutate } from 'swr'
import api from '../../../api/axios'
import { fetcher } from '../../../lib/fetcher'
import { useAuth } from '../../../hooks/useAuth'
import { useWebSocket } from '../../../hooks/useWebSocket'
import LoadingSpinner from '../../../components/ui/LoadingSpinner'
import EmptyState from '../../../components/ui/EmptyState'
import Avatar from '../../../components/ui/Avatar'
import { useToast } from '../../../components/ui/Toast'
import { API_BASE } from '../../../lib/config'
import PrescriptionModal from '../../../components/admin/PrescriptionModal'
import ConsultationDetailModal from '../../../components/consultations/ConsultationDetailModal'
import ConfirmModal from '../../../components/ui/ConfirmModal'

const STATUT_STYLES = {
  OUVERTE:  { badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200', pill: 'En attente' },
  EN_COURS: { badge: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200', pill: 'En cours' },
  TERMINEE: { badge: 'bg-green-50 text-green-700 ring-1 ring-green-200', pill: 'Terminée' },
  ANNULEE:  { badge: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200', pill: 'Annulée' },
}

const PRIORITE_UI = {
  NORMALE:  null,
  URGENTE:  { label: 'Urgent', class: 'text-amber-600 bg-amber-50 ring-1 ring-amber-200' },
  CRITIQUE: { label: 'Critique', class: 'text-red-600 bg-red-50 ring-1 ring-red-200' },
}

type TabKey = 'TOUTES' | 'OUVERTE' | 'EN_COURS' | 'TERMINEE'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'TOUTES', label: 'Toutes' },
  { key: 'OUVERTE', label: 'En attente' },
  { key: 'EN_COURS', label: 'En cours' },
  { key: 'TERMINEE', label: 'Terminées' },
]

function daysSince(dateString: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(dateString).getTime()) / 86400000))
}

function imgUrl(path: string | null | undefined): string | null {
  if (!path) return null
  return path.startsWith('http') ? path : `${API_BASE}${path}`
}

export default function MedecinConsultationsPage() {
  const { user, token } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState<TabKey>('TOUTES')
  const [prescriptionFor, setPrescriptionFor] = useState<any>(null)
  const [detailFor, setDetailFor] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)

  const { data, isLoading, error, mutate } = useSWR('/api/consultations', fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 15000,
  })

  useWebSocket(user?.id || '', token || '', {
    onConsultationCreated: useCallback((payload: any) => {
      mutate((current: any) => {
        const list = Array.isArray(current) ? current : []
        if (list.some((c: any) => c.id === payload.id)) return list
        toast.info('Nouvelle demande de consultation reçue.')
        return [{ ...payload }, ...list]
      }, { revalidate: false })
    }, [mutate, toast]),
    onConsultationAccepted: useCallback((payload: any) => {
      mutate((current: any) => {
        const list = Array.isArray(current) ? current : []
        return list.map((c: any) => c.id === payload.id ? { ...c, statut: 'EN_COURS', medecin: payload.medecin } : c)
      }, { revalidate: false })
    }, [mutate]),
    onConsultationClosed: useCallback((payload: any) => {
      mutate((current: any) => {
        const list = Array.isArray(current) ? current : []
        return list.map((c: any) => c.id === payload.id ? { ...c, statut: 'TERMINEE' } : c)
      }, { revalidate: false })
    }, [mutate]),
  })

  const consultations = useMemo(() => {
    const list = Array.isArray(data) ? data : []
    return list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [data])

  const counts = useMemo(() => ({
    TOUTES: consultations.length,
    OUVERTE: consultations.filter((c: any) => c.statut === 'OUVERTE').length,
    EN_COURS: consultations.filter((c: any) => c.statut === 'EN_COURS').length,
    TERMINEE: consultations.filter((c: any) => c.statut === 'TERMINEE').length,
  }), [consultations])

  const filtered = useMemo(() => {
    if (tab === 'TOUTES') return consultations
    return consultations.filter((c: any) => c.statut === tab)
  }, [consultations, tab])

  const updateStatut = async (id: number, statut: string) => {
    try {
      await api.patch(
        `/api/consultations/${id}`,
        { statut },
        { headers: { 'Content-Type': 'application/merge-patch+json' } }
      )
      const msg = statut === 'EN_COURS' ? 'Patient pris en charge avec succès.' : 'Consultation clôturée.'
      toast.success(msg)
      mutate()
      globalMutate('/api/consultations?statut=OUVERTE&itemsPerPage=1')
    } catch {
      toast.error('Échec de la mise à jour.')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/api/consultations/${id}`)
      mutate((current: any) => {
        const list = Array.isArray(current) ? current : []
        return list.filter((c: any) => c.id !== id)
      }, { revalidate: false })
      toast.success('Consultation supprimée.')
      setDeleteTarget(null)
      globalMutate('/api/consultations?statut=OUVERTE&itemsPerPage=1')
    } catch {
      toast.error('Échec de la suppression.')
    }
  }

  if (isLoading) return <LoadingSpinner label="Chargement des consultations…" />

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* En-tête */}
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-[#0F2C52]">Consultations</h1>
        <p className="text-sm text-[#6B7280] mt-1">
          {counts.OUVERTE > 0
            ? `${counts.OUVERTE} demande${counts.OUVERTE > 1 ? 's' : ''} en attente`
            : 'Aucune demande en attente'}
        </p>
      </div>

      {/* Cartes statistiques */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {[
          { label: 'Total', value: counts.TOUTES, icon: ClipboardList, color: 'bg-blue-500' },
          { label: 'En attente', value: counts.OUVERTE, icon: Clock, color: 'bg-amber-500' },
          { label: 'En cours', value: counts.EN_COURS, icon: Activity, color: 'bg-blue-500' },
          { label: 'Terminées', value: counts.TERMINEE, icon: CheckCircle, color: 'bg-green-500' },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-white border border-gray-100 p-4 flex items-center gap-3"
          >
            <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center shrink-0`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0F2C52]">{stat.value}</p>
              <p className="text-xs text-[#6B7280]">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${
              tab === t.key
                ? 'bg-[#3B6EF8] text-white shadow-md shadow-blue-500/25'
                : 'bg-white text-[#6B7280] border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {t.label}
            <span className="ml-1.5 opacity-70">({counts[t.key]})</span>
          </button>
        ))}
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={tab === 'OUVERTE' ? 'Aucune demande en attente' : 'Aucune consultation'}
          description={tab === 'OUVERTE' ? 'Les nouvelles demandes apparaîtront ici en temps réel.' : 'Aucune consultation ne correspond à ce filtre.'}
          action={tab !== 'TOUTES' ? (
            <button onClick={() => setTab('TOUTES')} className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#3B6EF8] text-white">
              Voir toutes les consultations
            </button>
          ) : undefined}
        />
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((c: any) => {
              const style = STATUT_STYLES[c.statut as keyof typeof STATUT_STYLES] || STATUT_STYLES.OUVERTE
              const priorite = PRIORITE_UI[c.priorite as keyof typeof PRIORITE_UI]
              return (
                <motion.div
                  key={c.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="rounded-2xl bg-white border border-gray-100 p-5 hover:border-gray-200 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Infos patient */}
                    <div className="flex items-center gap-4 lg:w-80 shrink-0">
                      <Avatar
                        name={`${c.patient?.prenom || ''} ${c.patient?.nom || ''}`}
                        size="lg"
                        src={imgUrl(c.patient?.photoProfil)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-bold text-[#0F2C52] truncate">
                          {c.patient?.prenom} {c.patient?.nom}
                        </p>
                        {c.patient?.telephone && (
                          <p className="text-sm text-[#6B7280] flex items-center gap-1.5 mt-0.5">
                            <Phone className="w-3.5 h-3.5 shrink-0" />
                            {c.patient.telephone}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Motif + statut */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <p className="text-sm font-medium text-[#374151] line-clamp-2">
                          {c.motif || 'Motif non précisé'}
                        </p>
                        {priorite && (
                          <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${priorite.class}`}>
                            {priorite.label}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${style.badge}`}>
                          {style.pill}
                        </span>
                        <span className="text-xs text-[#9CA3AF]">
                          {new Date(c.createdAt).toLocaleDateString('fr-FR', {
                            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                        <span className="text-xs text-[#9CA3AF]">
                          · Ouverte depuis {daysSince(c.createdAt)}j
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setDetailFor(c.id)}
                        className="p-2.5 rounded-xl border border-gray-200 text-[#6B7280] hover:bg-gray-50 transition"
                        title="Voir les détails"
                      >
                        <Activity className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(c.id)}
                        className="p-2.5 rounded-xl border border-red-200 text-red-400 hover:bg-red-50 transition"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {c.statut === 'OUVERTE' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateStatut(c.id, 'EN_COURS')}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#3B6EF8] hover:bg-[#2D5CD8] text-white transition active:scale-[0.97]"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Prendre en charge
                          </button>
                          <Link
                            href={`/medecin/messages?patient=${c.patient?.id}`}
                            className="p-2.5 rounded-xl border border-gray-200 text-[#6B7280] hover:bg-gray-50 transition"
                            title="Contacter le patient"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Link>
                        </div>
                      )}
                      {c.statut === 'EN_COURS' && (
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/medecin/messages?patient=${c.patient?.id}`}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#3B6EF8] hover:bg-[#2D5CD8] text-white transition active:scale-[0.97]"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            Discuter
                          </Link>
                          <button
                            onClick={() => setPrescriptionFor(c)}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition active:scale-[0.97]"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Prescrire
                          </button>
                          <button
                            onClick={() => updateStatut(c.id, 'TERMINEE')}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-red-500 hover:bg-red-600 text-white transition active:scale-[0.97]"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Terminer
                          </button>
                        </div>
                      )}
                      {c.statut === 'TERMINEE' && (
                        <span className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-gray-50 text-[#6B7280] border border-gray-200">
                          Terminée le {new Date(c.closedAt || c.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {prescriptionFor && (
        <PrescriptionModal
          consultation={prescriptionFor}
          onClose={() => setPrescriptionFor(null)}
          onSaved={() => { setPrescriptionFor(null); mutate() }}
        />
      )}
      {detailFor && (
        <ConsultationDetailModal
          consultationId={detailFor}
          onClose={() => setDetailFor(null)}
        />
      )}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => handleDelete(deleteTarget!)}
        title="Supprimer la consultation"
        message="Vous êtes sur le point de supprimer définitivement cette consultation. Toutes les données associées (messages, prescriptions) seront également supprimées. Cette action est irréversible."
        type="danger"
        confirmText="Oui, supprimer"
        cancelText="Annuler"
      />
    </div>
  )
}
