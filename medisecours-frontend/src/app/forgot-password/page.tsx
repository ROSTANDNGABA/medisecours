'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { HeartPulse, Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import api from '../../api/axios'

/**
 * Page de demande de réinitialisation de mot de passe.
 * Envoie un email avec un lien vers /reset-password?token=xxx
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Veuillez saisir une adresse email valide.')
      return
    }

    setLoading(true)
    try {
      await api.post('/api/auth/forgot-password', { email })
      setSent(true)
    } catch (err: any) {
      if (err.response?.status === 429) {
        setError('Trop de demandes. Veuillez patienter une heure avant de réessayer.')
      } else {
        setError('Une erreur est survenue. Veuillez réessayer.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-12 bg-linear-to-br from-sable to-primary-50 dark:from-primary-900 dark:to-primary-700">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white/80 dark:bg-primary-700/50 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-2xl shadow-glass p-8"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary-500 flex items-center justify-center mb-3">
            <HeartPulse className="w-6 h-6 text-white" />
          </div>
          {!sent ? (
            <>
              <h1 className="font-display font-bold text-2xl text-primary-900 dark:text-sable">
                Mot de passe oublié ?
              </h1>
              <p className="text-sm text-primary-300 text-center mt-1">
                Saisissez votre email. Si un compte existe, vous recevrez un lien de réinitialisation.
              </p>
            </>
          ) : (
            <>
              <CheckCircle className="w-12 h-12 text-mint-500 mb-2" />
              <h1 className="font-display font-bold text-2xl text-primary-900 dark:text-sable">
                Email envoyé
              </h1>
            </>
          )}
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="text-sm font-medium text-primary-700 dark:text-sable">
                Adresse email
              </label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-300" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-primary-100 dark:border-white/10 bg-white/80 dark:bg-primary-900/40 focus:outline-none focus:ring-2 focus:ring-mint-500"
                  autoFocus
                />
              </div>
              {error && <p className="text-xs text-urgence-500 mt-1">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-mint-500 hover:bg-mint-700 text-white font-semibold shadow-lg transition disabled:opacity-60"
            >
              {loading ? 'Envoi en cours…' : 'Envoyer le lien'}
            </button>
          </form>
        ) : (
          <div className="text-center space-y-3">
            <p className="text-primary-400 text-sm">
              Si l&apos;adresse <strong className="text-primary-700 dark:text-sable">{email}</strong> est
              associée à un compte MediSecours+, vous recevrez un email avec les instructions.
            </p>
            <p className="text-xs text-primary-300">
              Le lien est valable <strong>1 heure</strong>. Vérifiez également vos spams.
            </p>
            <button
              onClick={() => { setSent(false); setEmail('') }}
              className="text-sm text-mint-500 hover:text-mint-700 underline underline-offset-2"
            >
              Utiliser un autre email
            </button>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-primary-400 hover:text-primary-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à la connexion
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
