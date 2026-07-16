// @ts-nocheck
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CheckCircle2, XCircle, Eye, Mail, Phone, Shield,
  Stethoscope, Users, Clock, AlertCircle, X, Upload,
} from 'lucide-react'
import Link from 'next/link'
import api from '../../../api/axios'
import LoadingSpinner from '../../../components/ui/LoadingSpinner'
import EmptyState from '../../../components/ui/EmptyState'
import Avatar from '../../../components/ui/Avatar'
import { useToast } from '../../../components/ui/Toast'

// ── Onglets ──────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'tous',       label: 'Tous les médecins',  icon: Users },
  { key: 'valides',    label: 'Validés',             icon: CheckCircle2 },
  { key: 'en_attente', label: 'En attente',          icon: Clock },
]

export default function MedecinsPage() {
  const [medecins,     setMedecins]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [tab,          setTab]          = useState('tous')
  const [viewModal,    setViewModal]    = useState(null)
  const [rejectModal,  setRejectModal]  = useState(null)   // { medecin }
  const [motif,        setMotif]        = useState('')
  const [actionId,     setActionId]     = useState(null)   // id en cours de traitement
  const toast = useToast()

  // ── Chargement ──────────────────────────────────────────────────────────────
  const load = useCallback(() => {
    api.get('/api/admin/medecins')
      .then((res) => {
        const data = res.data?.medecins ?? []
        setMedecins(Array.isArray(data) ? data : [])
      })
      .catch(() => toast.error('Impossible de charger les médecins.'))
      .finally(() => setLoading(false))
  }, [toast])

  useEffect(() => { load() }, [load])

  // ── Dérivés ─────────────────────────────────────────────────────────────────
  const valides    = useMemo(() => medecins.filter((m) =>  m.estValide), [medecins])
  const enAttente  = useMemo(() => medecins.filter((m) => !m.estValide), [medecins])

  const displayed = useMemo(() => {
    if (tab === 'valides')    return valides
    if (tab === 'en_attente') return enAttente
    return medecins
  }, [tab, medecins, valides, enAttente])

  // ── Validation ──────────────────────────────────────────────────────────────
  const handleValidate = async (med) => {
    setActionId(med.id)
    try {
      await api.patch(
        `/api/admin/medecins/${med.id}/validation`,
        { estValide: true },
        { headers: { 'Content-Type': 'application/json' } }
      )
      setMedecins((prev) => prev.map((m) => m.id === med.id ? { ...m, estValide: true } : m))
      setViewModal((prev) => prev?.id === med.id ? { ...prev, estValide: true } : prev)
      toast.success(`Dr ${med.prenom} ${med.nom} validé. Email envoyé.`)
    } catch {
      toast.error('Échec de la validation.')
    } finally {
      setActionId(null)
    }
  }

  // ── Ouverture modal de refus ────────────────────────────────────────────────
  const openRejectModal = (med) => {
    setMotif('')
    setRejectModal(med)
  }

  // ── Envoi refus avec motif ──────────────────────────────────────────────────
  const handleReject = async () => {
    if (!rejectModal) return
    if (!motif.trim()) {
      toast.error('Veuillez saisir un motif de refus.')
      return
    }
    const med = rejectModal
    setActionId(med.id)
    try {
      await api.patch(
        `/api/admin/medecins/${med.id}/validation`,
        { estValide: false, motif: motif.trim() },
        { headers: { 'Content-Type': 'application/json' } }
      )
      setMedecins((prev) => prev.map((m) => m.id === med.id ? { ...m, estValide: false } : m))
      setViewModal((prev) => prev?.id === med.id ? { ...prev, estValide: false } : prev)
      toast.success(`Dr ${med.prenom} ${med.nom} non-validé. Email avec motif envoyé.`)
      setRejectModal(null)
      setMotif('')
    } catch {
      toast.error('Échec du refus.')
    } finally {
      setActionId(null)
    }
  }

  if (loading) return <LoadingSpinner label="Chargement des médecins…" />

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Header stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total" value={medecins.length}   color="#1E3A5F" icon={Users} />
        <StatCard label="Validés" value={valides.length}  color="#10B981" icon={CheckCircle2} />
        <StatCard label="En attente" value={enAttente.length} color="#F59E0B" icon={Clock} badge={enAttente.length > 0} />
      </div>

      {/* Bouton import */}
      <div className="flex justify-end">
        <Link
          href="/admin/medecins/import"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-700 text-white text-sm font-semibold shadow-sm transition"
        >
          <Upload className="w-4 h-4" /> Importer CSV / Excel
        </Link>
      </div>

      {/* Onglets */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              tab === key
                ? 'bg-primary-500 text-white shadow-lg'
                : 'bg-white dark:bg-primary-800 text-primary-700 dark:text-sable border border-primary-100 dark:border-white/10 hover:border-mint-500'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              tab === key ? 'bg-white/20 text-white' : 'bg-primary-100 dark:bg-primary-700 text-primary-500'
            }`}>
              {key === 'tous' ? medecins.length : key === 'valides' ? valides.length : enAttente.length}
            </span>
          </button>
        ))}
      </div>

      {/* Liste */}
      {displayed.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title="Aucun médecin dans cet onglet"
          description="Les médecins apparaîtront ici après inscription."
        />
      ) : (
        <div className="rounded-2xl bg-white dark:bg-primary-800 border border-primary-100 dark:border-white/5 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-primary-50 dark:bg-primary-900/40 text-primary-700 dark:text-sable">
                <tr>
                  <th className="text-left px-6 py-4 font-semibold">Médecin</th>
                  <th className="text-left px-6 py-4 font-semibold">Spécialité</th>
                  <th className="text-left px-6 py-4 font-semibold">N° Ordre</th>
                  <th className="text-left px-6 py-4 font-semibold">Contact</th>
                  <th className="text-left px-6 py-4 font-semibold">Statut</th>
                  <th className="px-6 py-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {displayed.map((med, i) => (
                    <motion.tr
                      key={med.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-t border-primary-100 dark:border-white/5 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={`${med.prenom || ''} ${med.nom || ''}`} size="sm" />
                          <div>
                            <p className="font-semibold text-primary-900 dark:text-sable">
                              Dr {med.prenom} {med.nom}
                            </p>
                            <p className="text-xs text-primary-300">{med.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-primary-700 dark:text-primary-300">
                        {med.specialite || '—'}
                      </td>
                      <td className="px-6 py-4 text-primary-700 dark:text-primary-300 font-mono text-xs">
                        {med.numeroOrdre || '—'}
                      </td>
                      <td className="px-6 py-4 text-primary-700 dark:text-primary-300">
                        {med.telephone || '—'}
                      </td>
                      <td className="px-6 py-4">
                        {med.estValide ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-mint-100 text-mint-700">
                            <CheckCircle2 className="w-3 h-3" /> Validé
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                            <Clock className="w-3 h-3" /> En attente
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {/* Voir détails */}
                          <button
                            onClick={() => setViewModal(med)}
                            className="p-2 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-700 text-primary-500 transition"
                            title="Voir le profil"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {/* Valider */}
                          {!med.estValide && (
                            <button
                              onClick={() => handleValidate(med)}
                              disabled={actionId === med.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-mint-500 hover:bg-mint-700 text-white text-xs font-semibold disabled:opacity-60 transition"
                              title="Valider ce médecin"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {actionId === med.id ? 'En cours…' : 'Valider'}
                            </button>
                          )}
                          {/* Invalider */}
                          {med.estValide ? (
                            <button
                              onClick={() => openRejectModal(med)}
                              disabled={actionId === med.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-urgence-500/10 hover:bg-urgence-500/20 text-urgence-500 text-xs font-semibold disabled:opacity-60 transition"
                              title="Invalider ce médecin"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Invalider
                            </button>
                          ) : (
                            <button
                              onClick={() => openRejectModal(med)}
                              disabled={actionId === med.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-urgence-200 text-urgence-500 text-xs font-semibold hover:bg-urgence-50 disabled:opacity-60 transition"
                              title="Refuser ce médecin"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Refuser
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal — Profil médecin */}
      <AnimatePresence>
        {viewModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setViewModal(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-primary-800 shadow-2xl z-50 overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-display font-bold text-xl text-primary-900 dark:text-sable">
                    Profil médecin
                  </h3>
                  <button onClick={() => setViewModal(null)} className="text-primary-300 hover:text-primary-700">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Avatar + statut */}
                <div className="flex flex-col items-center mb-6">
                  <Avatar name={`${viewModal.prenom || ''} ${viewModal.nom || ''}`} size="lg" />
                  <h4 className="font-display font-semibold text-lg text-primary-900 dark:text-sable mt-3">
                    Dr {viewModal.prenom} {viewModal.nom}
                  </h4>
                  <p className="text-sm text-primary-300 mb-2">{viewModal.email}</p>
                  {viewModal.estValide ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-mint-100 text-mint-700">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Compte validé
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                      <AlertCircle className="w-3.5 h-3.5" /> En attente de validation
                    </span>
                  )}
                </div>

                {/* Infos */}
                <div className="space-y-3">
                  {[
                    { icon: Stethoscope, label: 'Spécialité',    value: viewModal.specialite },
                    { icon: Shield,      label: 'N° Ordre',      value: viewModal.numeroOrdre },
                    { icon: Mail,        label: 'Email',         value: viewModal.email },
                    { icon: Phone,       label: 'Téléphone',     value: viewModal.telephone },
                  ].filter((f) => f.value).map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-start gap-3 p-3 rounded-xl bg-primary-50 dark:bg-primary-900/40">
                      <Icon className="w-4 h-4 text-primary-300 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-semibold text-primary-300 uppercase tracking-wide">{label}</p>
                        <p className="text-sm text-primary-900 dark:text-sable">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions dans le modal */}
                <div className="flex gap-2 mt-6">
                  {!viewModal.estValide && (
                    <button
                      onClick={() => { handleValidate(viewModal); setViewModal(null) }}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-mint-500 hover:bg-mint-700 text-white font-semibold transition"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Valider
                    </button>
                  )}
                  <button
                    onClick={() => { openRejectModal(viewModal); setViewModal(null) }}
                    className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition ${
                      viewModal.estValide
                        ? 'bg-urgence-500 hover:bg-urgence-700 text-white'
                        : 'border border-urgence-200 text-urgence-500 hover:bg-urgence-50'
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    {viewModal.estValide ? 'Invalider' : 'Refuser'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modal — Motif de refus/invalidation */}
      <AnimatePresence>
        {rejectModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setRejectModal(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="fixed inset-0 z-50 flex items-center justify-center p-6"
            >
              <div className="w-full max-w-md bg-white dark:bg-primary-800 rounded-2xl shadow-glass p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-urgence-100 flex items-center justify-center">
                      <XCircle className="w-5 h-5 text-urgence-500" />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-primary-900 dark:text-sable">
                        {rejectModal.estValide ? 'Invalider' : 'Refuser'} ce médecin
                      </h4>
                      <p className="text-xs text-primary-300">
                        Dr {rejectModal.prenom} {rejectModal.nom}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setRejectModal(null)} className="text-primary-300 hover:text-primary-700">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-5">
                  <label className="text-sm font-semibold text-primary-700 dark:text-sable block mb-2">
                    Motif <span className="text-urgence-500">*</span>
                  </label>
                  <textarea
                    value={motif}
                    onChange={(e) => setMotif(e.target.value)}
                    placeholder="Ex : Numéro d'ordre introuvable dans le registre de l'Ordre des Médecins du Cameroun…"
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-primary-100 dark:border-white/10 bg-white/80 dark:bg-primary-900/40 focus:outline-none focus:ring-2 focus:ring-urgence-500 text-sm resize-none"
                  />
                  <p className="text-xs text-primary-300 mt-1">
                    Ce motif sera envoyé par email au médecin.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setRejectModal(null); setMotif('') }}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-primary-100 dark:border-white/10 text-primary-700 dark:text-sable font-semibold hover:bg-primary-50 transition text-sm"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={!motif.trim() || actionId === rejectModal.id}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-urgence-500 hover:bg-urgence-700 text-white font-semibold disabled:opacity-60 transition text-sm"
                  >
                    <Mail className="w-4 h-4" />
                    {actionId === rejectModal.id ? 'Envoi…' : 'Envoyer le refus'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Sous-composants ──────────────────────────────────────────────────────────

function StatCard({ label, value, color, icon: Icon, badge }) {
  return (
    <div className="relative rounded-2xl bg-white dark:bg-primary-800 border border-primary-100 dark:border-white/5 p-5 shadow-sm">
      {badge && value > 0 && (
        <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: color }} />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: color }} />
        </span>
      )}
      <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${color}1A` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <p className="text-xs text-primary-300 mb-1">{label}</p>
      <p className="font-display font-bold text-3xl text-primary-900 dark:text-sable">{value}</p>
    </div>
  )
}
