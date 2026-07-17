// @ts-nocheck
'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardList, AlertTriangle, CheckCircle, Clock, MessageSquare, X, Plus } from 'lucide-react'
import useSWR from 'swr'
import api from '../../../api/axios'
import { fetcher } from '../../../lib/fetcher'
import { useAuth } from '../../../hooks/useAuth'
import { useWebSocket } from '../../../hooks/useWebSocket'
import LoadingSpinner from '../../../components/ui/LoadingSpinner'
import EmptyState from '../../../components/ui/EmptyState'
import { useToast } from '../../../components/ui/Toast'

const STATUT_BADGE = {
  OUVERTE:  'bg-amber-100 text-amber-700',
  EN_COURS: 'bg-blue-100 text-blue-700',
  TERMINEE: 'bg-green-100 text-green-600',
  ANNULEE:  'bg-gray-100 text-gray-500',
}
const STATUT_ICON = {
  OUVERTE:  Clock,
  EN_COURS: MessageSquare,
  TERMINEE: CheckCircle,
  ANNULEE:  X,
}
const STATUT_LABEL = {
  OUVERTE: 'En attente', EN_COURS: 'En cours', TERMINEE: 'Terminée', ANNULEE: 'Annulée',
}

export default function PatientConsultationsPage() {
  const { user, token } = useAuth()
  const router = useRouter()
  const toast = useToast()
  const [showForm, setShowForm] = useState(false)
  const [motif, setMotif] = useState('')
  const [priorite, setPriorite] = useState('NORMALE')
  const [submitting, setSubmitting] = useState(false)

  const { data, isLoading, error, mutate } = useSWR(
    user ? '/api/consultations' : null,
    fetcher,
    { revalidateOnFocus: false }
  )
  const consultations = useMemo(() => {
    const list = Array.isArray(data) ? data : []
    return [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [data])

  // WS for real-time status updates
  useWebSocket(user?.id || '', token || '', {
    onConsultationAccepted: useCallback((payload) => {
      mutate((current) => {
        const list = Array.isArray(current) ? current : []
        return list.map((c) => c.id === payload.id ? { ...c, statut: 'EN_COURS', medecin: payload.medecin } : c)
      }, { revalidate: false })
    }, [mutate]),
    onConsultationClosed: useCallback((payload) => {
      mutate((current) => {
        const list = Array.isArray(current) ? current : []
        return list.map((c) => c.id === payload.id ? { ...c, statut: 'TERMINEE' } : c)
      }, { revalidate: false })
    }, [mutate]),
  })

  useEffect(() => { if (error) toast.error('Impossible de charger vos consultations.') }, [error])

  const createConsultation = async (e) => {
    e.preventDefault()
    if (!motif.trim()) return
    setSubmitting(true)
    try {
      await api.post('/api/consultations', { motif: motif.trim(), priorite })
      setShowForm(false)
      setMotif('')
      setPriorite('NORMALE')
      mutate()
      toast.success('Votre demande a été envoyée. Un médecin vous prendra en charge.')
    } catch {
      toast.error('Échec de l\'envoi.')
    } finally {
      setSubmitting(false)
    }
  }

  const openChat = (consultation) => {
    if (consultation.statut !== 'EN_COURS') return
    router.push(`/messages?consultation=${consultation.id}`)
  }

  if (!user) return <LoadingSpinner label="Chargement..." />

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h2 className="font-display font-bold text-2xl text-primary-900 dark:text-sable">
            Mes Consultations
          </h2>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-100 text-primary-700">
            {consultations.length}
          </span>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-primary-500 hover:bg-primary-700 text-white"
        >
          <Plus className="w-4 h-4" /> Nouvelle consultation
        </button>
      </div>

      {/* Formulaire de création */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            onSubmit={createConsultation}
            className="rounded-2xl bg-white dark:bg-primary-800 border border-primary-100 dark:border-white/5 p-5 mb-6 space-y-4"
          >
            <h3 className="font-semibold text-primary-900 dark:text-sable">Décrivez vos symptômes</h3>
            <textarea
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Ex: Forte fièvre depuis 3 jours, maux de tête intenses..."
              rows={4}
              className="w-full rounded-xl border border-primary-100 dark:border-white/10 bg-white dark:bg-primary-900 px-4 py-3 text-sm text-primary-900 dark:text-sable placeholder:text-primary-300 resize-none"
              required
            />
            <div>
              <label className="block text-sm font-medium text-primary-700 dark:text-sable mb-1.5">Niveau de gravité</label>
              <div className="flex gap-2">
                {[
                  { value: 'NORMALE', label: 'Normal', color: 'bg-gray-100 text-gray-700' },
                  { value: 'URGENTE', label: 'Urgent', color: 'bg-amber-100 text-amber-700' },
                  { value: 'CRITIQUE', label: 'Critique', color: 'bg-red-100 text-red-700' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPriorite(opt.value)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                      priorite === opt.value ? 'ring-2 ring-primary-500 ' + opt.color : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={submitting || !motif.trim()}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary-500 hover:bg-primary-700 text-white disabled:opacity-50"
              >
                {submitting ? 'Envoi...' : 'Envoyer la demande'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-primary-100 dark:border-white/10 text-primary-700 dark:text-sable"
              >
                Annuler
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Liste */}
      {isLoading ? (
        <LoadingSpinner label="Chargement..." />
      ) : consultations.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Aucune consultation"
          description="Vous n'avez pas encore de consultation. Cliquez sur 'Nouvelle consultation' pour commencer."
        />
      ) : (
        <div className="space-y-3">
          {consultations.map((c) => {
            const Icon = STATUT_ICON[c.statut] || Clock
            return (
              <motion.div
                key={c.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-white dark:bg-primary-800 border border-primary-100 dark:border-white/5 p-5 flex items-center gap-4"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  c.statut === 'OUVERTE' ? 'bg-amber-100 text-amber-600' :
                  c.statut === 'EN_COURS' ? 'bg-blue-100 text-blue-600' :
                  c.statut === 'TERMINEE' ? 'bg-green-100 text-green-600' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary-900 dark:text-sable truncate">
                    {c.motif || 'Consultation'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUT_BADGE[c.statut] || ''}`}>
                      {STATUT_LABEL[c.statut] || c.statut}
                    </span>
                    {c.priorite !== 'NORMALE' && (
                      <span className="flex items-center gap-0.5 text-xs font-semibold text-red-500">
                        <AlertTriangle className="w-3 h-3" /> {c.priorite}
                      </span>
                    )}
                    {c.medecin && (
                      <span className="text-xs text-primary-300">
                        Dr {c.medecin.prenom} {c.medecin.nom}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {c.statut === 'OUVERTE' && (
                    <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 text-amber-600 animate-pulse">
                      En attente
                    </span>
                  )}
                  {c.statut === 'EN_COURS' && (
                    <button
                      onClick={() => openChat(c)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary-500 hover:bg-primary-700 text-white"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Chatter
                    </button>
                  )}
                  {c.statut === 'TERMINEE' && (
                    <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-green-50 text-green-600">
                      Terminée
                    </span>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
