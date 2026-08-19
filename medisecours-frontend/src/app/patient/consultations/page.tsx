'use client'

import { useMemo, useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ClipboardList, AlertTriangle, CheckCircle, Clock, MessageSquare, X, Plus,
  Activity, Inbox, Search, Trash2, Pill,
} from 'lucide-react'
import useSWR from 'swr'
import api from '../../../api/axios'
import { fetcher } from '../../../lib/fetcher'
import { useAuth } from '../../../hooks/useAuth'
import { useWebSocket } from '../../../hooks/useWebSocket'
import LoadingSpinner from '../../../components/ui/LoadingSpinner'
import EmptyState from '../../../components/ui/EmptyState'
import { useToast } from '../../../components/ui/Toast'
import ConsultationDetailModal from '../../../components/consultations/ConsultationDetailModal'
import PrescriptionsModal from '../../../components/consultations/PrescriptionsModal'
import PrescriptionDetailModal from '../../../components/admin/PrescriptionDetailModal'
import ConfirmModal from '../../../components/ui/ConfirmModal'
import type { Prescription } from '../../../types/api'

const STATUT_STYLES = {
  OUVERTE:  { badge: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-500/30', icon: 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400', labelKey: 'consultations.pending' },
  EN_COURS: { badge: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-500/30', icon: 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400', labelKey: 'consultations.inProgress' },
  TERMINEE: { badge: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 ring-1 ring-green-200 dark:ring-green-500/30', icon: 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400', labelKey: 'consultations.finished' },
  ANNULEE:  { badge: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 ring-1 ring-gray-200 dark:ring-gray-700', icon: 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500', labelKey: 'consultations.cancelled' },
}

const STATUT_ICON = {
  OUVERTE: Clock, EN_COURS: MessageSquare, TERMINEE: CheckCircle, ANNULEE: X,
}

const PRIORITE_CONFIG = {
  NORMALE:  { labelKey: 'consultations.priorityNormal',  class: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 ring-gray-400 dark:ring-gray-500' },
  URGENTE:  { labelKey: 'consultations.priorityUrgent',  class: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 ring-amber-400 dark:ring-amber-500' },
  CRITIQUE: { labelKey: 'consultations.priorityCritical', class: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 ring-red-400 dark:ring-red-500' },
}

type FilterTab = 'TOUTES' | 'OUVERTE' | 'EN_COURS' | 'TERMINEE'

const FILTER_TABS: { key: FilterTab; labelKey: string }[] = [
  { key: 'TOUTES', labelKey: 'consultations.tab_all' },
  { key: 'OUVERTE', labelKey: 'consultations.tab_pending' },
  { key: 'EN_COURS', labelKey: 'consultations.tab_inProgress' },
  { key: 'TERMINEE', labelKey: 'consultations.tab_finished' },
]

export default function PatientConsultationsPage() {
  const { user, token } = useAuth()
  const router = useRouter()
  const toast = useToast()
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'en' ? 'en-GB' : 'fr-FR'
  const [showForm, setShowForm] = useState(false)
  const [detailFor, setDetailFor] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)
  const [motif, setMotif] = useState('')
  const [priorite, setPriorite] = useState('NORMALE')
  const [submitting, setSubmitting] = useState(false)
  const [filter, setFilter] = useState<FilterTab>('TOUTES')
  const [showPrescriptions, setShowPrescriptions] = useState(false)
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('new') !== '1') return

    const timer = window.setTimeout(() => {
      setShowForm(true)
      router.replace('/patient/consultations', { scroll: false })
    }, 0)

    return () => window.clearTimeout(timer)
  }, [router])

  const { data, isLoading, error, mutate } = useSWR(
    user ? '/api/consultations' : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  const consultations = useMemo(() => {
    const list = Array.isArray(data) ? data : []
    return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [data])

  const filtered = useMemo(() => {
    if (filter === 'TOUTES') return consultations
    return consultations.filter((c) => c.statut === filter)
  }, [consultations, filter])

  const stats = useMemo(() => ({
    total: consultations.length,
    enAttente: consultations.filter((c) => c.statut === 'OUVERTE').length,
    enCours: consultations.filter((c) => c.statut === 'EN_COURS').length,
    terminees: consultations.filter((c) => c.statut === 'TERMINEE').length,
  }), [consultations])

  useWebSocket(user?.id || '', token || '', {
    onConsultationAccepted: useCallback((payload) => {
      mutate((current) => {
        const list = Array.isArray(current) ? current : []
        return list.map((c) => c.id === payload.id ? { ...c, statut: 'EN_COURS', medecin: payload.medecin } : c)
      }, { revalidate: false })
      const medecin = payload.medecin
      if (medecin) {
        toast.success(t('patient.consultations.acceptedToast', { medecin: `${medecin.prenom} ${medecin.nom}` }))
      }
    }, [mutate, toast, t]),
    onConsultationClosed: useCallback((payload) => {
      mutate((current) => {
        const list = Array.isArray(current) ? current : []
        return list.map((c) => c.id === payload.id ? { ...c, statut: 'TERMINEE' } : c)
      }, { revalidate: false })
      toast.success(t('patient.consultations.closedToast'))
    }, [mutate, toast, t]),
  })

  const createConsultation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!motif.trim()) return
    setSubmitting(true)
    try {
      await api.post('/api/consultations', { motif: motif.trim(), priorite })
      setShowForm(false)
      setMotif('')
      setPriorite('NORMALE')
      mutate()
      toast.success(t('patient.consultations.sentToast'))
    } catch {
      toast.error(t('patient.consultations.sendError'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/api/consultations/${id}`)
      mutate((current: any) => {
        const list = Array.isArray(current) ? current : []
        return list.filter((c: any) => c.id !== id)
      }, { revalidate: false })
      toast.success(t('consultations.deleted'))
    } catch {
      toast.error(t('consultations.deleteError'))
    }
  }

  const openChat = (consultation: any) => {
    if (consultation.statut !== 'EN_COURS') return
    router.push(`/messages?consultation=${consultation.id}`)
  }

  if (!user) return <LoadingSpinner label={t('common.loading')} />

  return (
    <div className="min-h-screen bg-sable dark:bg-primary-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* En-tête de page */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary-900 dark:text-sable">
              {t('patient.consultations.title')}
            </h1>
            <p className="text-sm text-primary-300 mt-1">
              {t('patient.consultations.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPrescriptions(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-primary-100 dark:border-white/10 text-primary-700 dark:text-sable hover:bg-white/60 dark:hover:bg-primary-700 transition-all active:scale-[0.97]"
            >
              <Pill className="w-4 h-4" />
              {t('visitor.nav.prescriptions')}
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-mint-500 hover:bg-mint-700 text-white shadow-lg shadow-mint-500/25 transition-all active:scale-[0.97]"
            >
              <Plus className="w-4 h-4" />
              {t('patient.consultations.new')}
            </button>
          </div>
        </div>

        {/* Cartes statistiques */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {[
            { labelKey: 'consultations.total', value: stats.total, icon: ClipboardList, color: 'bg-primary-500' },
            { labelKey: 'consultations.pending', value: stats.enAttente, icon: Clock, color: 'bg-amber-500' },
            { labelKey: 'consultations.inProgress', value: stats.enCours, icon: Activity, color: 'bg-blue-500' },
            { labelKey: 'consultations.finished', value: stats.terminees, icon: CheckCircle, color: 'bg-green-500' },
          ].map((stat) => (
            <motion.div
              key={stat.labelKey}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-white dark:bg-primary-800 border border-primary-100 dark:border-white/5 p-4 flex items-center gap-3"
            >
              <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center shrink-0`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary-900 dark:text-sable">{stat.value}</p>
                <p className="text-xs text-primary-300">{t(stat.labelKey)}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Filtres */}
        <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${
                filter === tab.key
                  ? 'bg-primary-500 text-white shadow-md shadow-primary-500/25'
                  : 'bg-white dark:bg-primary-800 text-primary-300 dark:text-sable/70 border border-primary-100 dark:border-white/10 hover:bg-primary-50 dark:hover:bg-primary-700'
              }`}
            >
              {t(tab.labelKey)}
              {tab.key !== 'TOUTES' && (
                <span className="ml-1.5 opacity-70">
                  ({stats[tab.key === 'OUVERTE' ? 'enAttente' : tab.key === 'EN_COURS' ? 'enCours' : 'terminees']})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Formulaire de création */}
        <AnimatePresence>
          {showForm && (
            <motion.form
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              onSubmit={createConsultation}
              className="rounded-2xl bg-white dark:bg-primary-800 border border-primary-100 dark:border-white/5 p-5 sm:p-6 mb-8 space-y-5"
            >
              <div>
                <h3 className="font-semibold text-primary-900 dark:text-sable mb-1">{t('patient.consultations.formTitle')}</h3>
                <p className="text-sm text-primary-300">{t('patient.consultations.formSubtitle')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary-700 dark:text-sable/80 mb-1.5">
                  {t('patient.consultations.symptomsLabel')}
                </label>
                <textarea
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  placeholder={t('patient.consultations.symptomsPlaceholder')}
                  rows={4}
                  className="w-full rounded-xl border border-primary-100 dark:border-white/10 bg-white dark:bg-primary-900 px-4 py-3 text-sm text-primary-900 dark:text-sable placeholder:text-primary-300 resize-none focus:outline-none focus:ring-2 focus:ring-mint-500/30"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary-700 dark:text-sable/80 mb-2">
                  {t('patient.consultations.severityLabel')}
                </label>
                <div className="flex gap-2">
                  {(Object.keys(PRIORITE_CONFIG) as Array<keyof typeof PRIORITE_CONFIG>).map((value) => {
                    const config = PRIORITE_CONFIG[value]
                    return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPriorite(value)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                        priorite === value
                          ? 'ring-2 ' + config.class
                          : 'bg-gray-50 dark:bg-primary-900 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-700'
                      }`}
                    >
                      {t(config.labelKey)}
                    </button>
                  )
                })}
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={submitting || !motif.trim()}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-mint-500 hover:bg-mint-700 text-white disabled:opacity-50 transition"
                >
                  {submitting ? t('patient.consultations.sending') : t('patient.consultations.send')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold border border-primary-100 dark:border-white/10 text-primary-700 dark:text-sable hover:bg-primary-50 dark:hover:bg-primary-700 transition"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Liste des consultations */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-lg text-primary-900 dark:text-sable">
              {t('patient.consultations.history')}
            </h2>
            <span className="text-xs text-primary-300">
              {t('patient.consultations.count', { count: filtered.length })}
            </span>
          </div>

          {isLoading ? (
            <LoadingSpinner label={t('patient.consultations.loading')} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={filter === 'TOUTES' ? ClipboardList : Inbox}
              title={
                filter === 'TOUTES'
                  ? t('consultations.noConsultationTitle')
                  : t('patient.consultations.emptyFilteredTitle', {
                      filter: t(FILTER_TABS.find((tab) => tab.key === filter)?.labelKey || '').toLowerCase(),
                    })
              }
              description={
                filter === 'TOUTES'
                  ? t('patient.consultations.emptyAllDesc')
                  : t('patient.consultations.emptyFilteredDesc')
              }
            />
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filtered.map((c) => {
                  const Icon = STATUT_ICON[c.statut as keyof typeof STATUT_ICON] || Clock
                  const style = STATUT_STYLES[c.statut as keyof typeof STATUT_STYLES] || STATUT_STYLES.OUVERTE
                  return (
                    <motion.div
                      key={c.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="rounded-2xl bg-white dark:bg-primary-800 border border-primary-100 dark:border-white/5 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:border-primary-200 dark:hover:border-white/20 transition-colors"
                    >
                      <div className="flex items-start gap-4 w-full sm:w-auto flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${style.icon}`}>
                          <Icon className="w-5 h-5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                            <p className="text-sm font-semibold text-primary-900 dark:text-sable truncate">
                              {c.motif || t('patient.consultations.fallbackTitle')}
                            </p>
                            {c.priorite !== 'NORMALE' && (
                              <span className="flex items-center gap-1 text-xs font-semibold text-red-500 shrink-0">
                                <AlertTriangle className="w-3 h-3" />
                                {c.priorite === 'CRITIQUE' ? t('patient.consultations.urgencyCritical') : t('patient.consultations.urgencyUrgent')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${style.badge}`}>
                              {t(style.labelKey)}
                            </span>
                            <span className="text-xs text-primary-300">
                              {new Date(c.createdAt).toLocaleDateString(locale, {
                                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                              })}
                            </span>
                            {c.medecin && (
                              <>
                                <span className="text-primary-200 dark:text-white/10 hidden sm:inline">·</span>
                                <span className="text-xs text-primary-300">
                  Dr {c.medecin.prenom} {c.medecin.nom}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end w-full sm:w-auto gap-2 shrink-0 border-t sm:border-t-0 border-primary-100 dark:border-white/10 pt-3 sm:pt-0">
                        <button
                          onClick={() => setDetailFor(c.id)}
                          className="p-2 rounded-xl border border-primary-100 dark:border-white/10 text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-700 transition"
                          title={t('patient.consultations.viewDetails')}
                        >
                          <Activity className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(c.id)}
                          className="p-2 rounded-xl border border-red-200 text-red-400 hover:bg-red-50 transition"
                          title={t('common.delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {c.statut === 'OUVERTE' && (
                          <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 animate-pulse">
                            {t('consultations.pending')}
                          </span>
                        )}
                        {c.statut === 'EN_COURS' && (
                          <button
                            onClick={() => openChat(c)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-mint-500 hover:bg-mint-700 text-white transition active:scale-[0.97]"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            {t('consultations.discuss')}
                          </button>
                        )}
                        {c.statut === 'TERMINEE' && (
                          <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                            {t('consultations.finished')}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </section>
      </div>

      {detailFor && (
        <ConsultationDetailModal
          consultationId={detailFor}
          onClose={() => setDetailFor(null)}
        />
      )}
      {showPrescriptions && (
        <PrescriptionsModal
          onClose={() => setShowPrescriptions(false)}
          onSelect={(p) => { setShowPrescriptions(false); setSelectedPrescription(p) }}
        />
      )}
      {selectedPrescription && (
        <PrescriptionDetailModal
          prescription={selectedPrescription}
          onClose={() => setSelectedPrescription(null)}
        />
      )}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => handleDelete(deleteTarget!)}
        title={t('consultations.deleteTitle')}
        message={t('consultations.deleteMessage')}
        type="danger"
        confirmText={t('consultations.deleteConfirm')}
        cancelText={t('common.cancel')}
      />
    </div>
  )
}
