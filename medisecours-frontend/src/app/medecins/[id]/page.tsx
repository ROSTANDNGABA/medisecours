// @ts-nocheck
'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Stethoscope, Star, Clock, MessageSquare,
  ArrowLeft, User, CheckCircle
} from 'lucide-react'
import api from '../../../api/axios'
import LoadingSpinner from '../../../components/ui/LoadingSpinner'
import { useAuth } from '../../../hooks/useAuth'
import { useToast } from '../../../components/ui/Toast'

/**
 * Profil public d'un médecin avec ses avis.
 * Accessible sans authentification.
 */
export default function MedecinDetailPage({ params }) {
  // Next.js 16 — params est une Promise
  const { id } = use(params)
  const { user, mounted } = useAuth()
  const toast = useToast()

  const [medecin, setMedecin] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Formulaire avis
  const [avisNote, setAvisNote] = useState(0)
  const [avisHover, setAvisHover] = useState(0)
  const [avisCommentaire, setAvisCommentaire] = useState('')
  const [avisLoading, setAvisLoading] = useState(false)
  const [avisEnvoye, setAvisEnvoye] = useState(false)

  useEffect(() => {
    api.get(`/api/medecins-publics/${id}`)
      .then((res) => setMedecin(res.data))
      .catch((err) => {
        if (err.response?.status === 404) setNotFound(true)
        else toast.error('Impossible de charger le profil.')
      })
      .finally(() => setLoading(false))
  }, [id, toast])

  const handleAvis = async (e) => {
    e.preventDefault()
    if (!avisNote) { toast.error('Veuillez choisir une note.'); return }

    setAvisLoading(true)
    try {
      await api.post('/api/avis', {
        medecin: `/api/users/${id}`,
        note: avisNote,
        commentaire: avisCommentaire.trim() || null,
      }, { headers: { 'Content-Type': 'application/ld+json' } })
      toast.success('Votre avis a été publié.')
      setAvisEnvoye(true)
      // Recharger le profil pour afficher le nouvel avis
      const res = await api.get(`/api/medecins-publics/${id}`)
      setMedecin(res.data)
    } catch (err) {
      if (err.response?.status === 422) {
        toast.error('Vous avez déjà laissé un avis sur ce médecin.')
      } else {
        toast.error("Erreur lors de l'envoi de l'avis.")
      }
    } finally {
      setAvisLoading(false)
    }
  }

  if (loading) return <LoadingSpinner label="Chargement du profil…" />

  if (notFound) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <Stethoscope className="w-12 h-12 text-primary-300 mx-auto mb-4" />
        <h1 className="font-display font-bold text-2xl text-primary-900 dark:text-sable mb-2">Médecin introuvable</h1>
        <p className="text-primary-400 mb-6">Ce profil n&apos;existe pas ou n&apos;est plus disponible.</p>
        <Link href="/medecins" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-700 text-white font-semibold text-sm">
          <ArrowLeft className="w-4 h-4" /> Voir tous les médecins
        </Link>
      </div>
    )
  }

  const note = medecin?.noteMoyenne ?? 0
  const avis = medecin?.avis ?? []
  const initiales = `${medecin?.prenom?.[0] || ''}${medecin?.nom?.[0] || ''}`.toUpperCase()
  const isPatient = mounted && user?.roles?.includes('ROLE_PATIENT')

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      {/* Retour */}
      <Link href="/medecins" className="inline-flex items-center gap-1.5 text-sm text-primary-400 hover:text-primary-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Tous les médecins
      </Link>

      {/* En-tête profil */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-white/80 dark:bg-primary-700/40 border border-white/50 dark:border-white/10 shadow-lg p-6 mb-6"
      >
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold text-lg shrink-0 overflow-hidden">
            {medecin?.photoProfil
              ? <img src={medecin.photoProfil} alt="" className="w-full h-full object-cover" />
              : initiales
            }
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display font-bold text-2xl text-primary-900 dark:text-sable">
                Dr {medecin?.prenom} {medecin?.nom}
              </h1>
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-mint-100 text-mint-700">
                <CheckCircle className="w-3.5 h-3.5" /> Vérifié
              </span>
            </div>
            <p className="text-primary-400 mt-0.5">{medecin?.specialite || 'Médecin généraliste'}</p>

            {/* Note globale */}
            <div className="flex items-center gap-2 mt-2">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} className={`w-4 h-4 ${n <= Math.round(note) ? 'text-amber-400 fill-amber-400' : 'text-primary-200'}`} />
                ))}
              </div>
              <span className="text-sm font-semibold text-primary-700 dark:text-sable">
                {note > 0 ? note.toFixed(1) : '—'}
              </span>
              <span className="text-xs text-primary-400">
                ({avis.length} avis)
              </span>
            </div>

            {/* Disponibilités */}
            {medecin?.disponibilites && (
              <div className="flex items-center gap-1.5 mt-2 text-sm text-primary-400">
                <Clock className="w-4 h-4 shrink-0" />
                {medecin.disponibilites}
              </div>
            )}
          </div>
        </div>

        {/* Bouton contacter */}
        <div className="mt-5 pt-5 border-t border-primary-100 dark:border-white/10">
          <Link
            href={`/messages?medecin=${id}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-mint-500 hover:bg-mint-700 text-white font-semibold text-sm transition"
          >
            <MessageSquare className="w-4 h-4" />
            Contacter ce médecin
          </Link>
        </div>
      </motion.div>

      {/* Section avis */}
      <div className="space-y-4">
        <h2 className="font-display font-bold text-xl text-primary-900 dark:text-sable">
          Avis des patients ({avis.length})
        </h2>

        {/* Formulaire laisser un avis */}
        {isPatient && !avisEnvoye && (
          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onSubmit={handleAvis}
            className="rounded-2xl bg-white/80 dark:bg-primary-700/40 border border-white/50 dark:border-white/10 p-5 space-y-3"
          >
            <p className="font-semibold text-sm text-primary-700 dark:text-sable">
              Laisser un avis
            </p>

            {/* Étoiles interactives */}
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onMouseEnter={() => setAvisHover(n)}
                  onMouseLeave={() => setAvisHover(0)}
                  onClick={() => setAvisNote(n)}
                  className="focus:outline-none"
                  aria-label={`Note ${n}`}
                >
                  <Star
                    className={`w-6 h-6 transition ${
                      n <= (avisHover || avisNote)
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-primary-200'
                    }`}
                  />
                </button>
              ))}
              {avisNote > 0 && (
                <span className="text-sm text-primary-400 ml-2 self-center">
                  {['', 'Mauvais', 'Passable', 'Bien', 'Très bien', 'Excellent'][avisNote]}
                </span>
              )}
            </div>

            <textarea
              value={avisCommentaire}
              onChange={(e) => setAvisCommentaire(e.target.value)}
              placeholder="Partagez votre expérience (optionnel, 10 caractères minimum si renseigné)…"
              rows={3}
              maxLength={2000}
              className="w-full px-3 py-2.5 rounded-xl border border-primary-100 dark:border-white/10 bg-white dark:bg-primary-900/40 focus:outline-none focus:ring-2 focus:ring-mint-500 text-sm resize-none"
            />

            <button
              type="submit"
              disabled={avisLoading || !avisNote}
              className="px-5 py-2 rounded-xl bg-mint-500 hover:bg-mint-700 text-white text-sm font-semibold disabled:opacity-50 transition"
            >
              {avisLoading ? 'Publication…' : 'Publier mon avis'}
            </button>
          </motion.form>
        )}

        {/* Liste des avis */}
        {avis.length === 0 ? (
          <div className="rounded-2xl bg-white/60 dark:bg-primary-700/30 border border-white/50 dark:border-white/10 p-6 text-center">
            <p className="text-primary-400 text-sm">Aucun avis pour ce médecin pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {avis.map((a) => (
              <AvisCard key={a.id} avis={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AvisCard({ avis }) {
  const auteur = avis.patient
    ? `${avis.patient.prenom || ''} ${avis.patient.nom || ''}`.trim() || 'Patient anonyme'
    : 'Patient anonyme'

  const date = avis.createdAt
    ? new Intl.DateTimeFormat('fr-CM', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(avis.createdAt))
    : ''

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white/80 dark:bg-primary-700/40 border border-white/50 dark:border-white/10 p-4"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-primary-200 dark:bg-primary-800 flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-primary-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="font-semibold text-sm text-primary-900 dark:text-sable">{auteur}</p>
            <span className="text-xs text-primary-300">{date}</span>
          </div>
          <div className="flex gap-0.5 mt-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} className={`w-3.5 h-3.5 ${n <= avis.note ? 'text-amber-400 fill-amber-400' : 'text-primary-200'}`} />
            ))}
          </div>
          {avis.commentaire && (
            <p className="text-sm text-primary-600 dark:text-primary-200 mt-1.5">{avis.commentaire}</p>
          )}
        </div>
      </div>
    </motion.div>
  )
}
