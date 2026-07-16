'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { GoogleLogin } from '@react-oauth/google'
import { User, Stethoscope, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'

const empty = {
  email: '', password: '', nom: '', prenom: '', telephone: '',
  quartier: '', groupeSanguin: '', allergies: '', contactsUrgence: '',
  specialite: '', numeroOrdre: '',
}

export default function RegisterPage() {
  const [step, setStep] = useState(0)
  const [type, setType] = useState<string | null>(null)
  const [form, setForm] = useState<any>(empty)
  const [errors, setErrors] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const { register, loginWithGoogle } = useAuth()
  const toast = useToast()
  const router = useRouter()

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f: any) => ({ ...f, [key]: e.target.value }))

  const validateStep1 = () => {
    const e: Record<string, string> = {}
    if (!form.nom) e.nom = 'Requis'
    if (!form.prenom) e.prenom = 'Requis'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Email invalide'
    if (form.password.length < 6) e.password = '6 caractères minimum'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const next = () => {
    if (step === 1 && !validateStep1()) return
    setStep((s: number) => s + 1)
  }
  const back = () => setStep((s: number) => s - 1)

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const payload = type === 'patient'
        ? { email: form.email, password: form.password, type, nom: form.nom, prenom: form.prenom, telephone: form.telephone, quartier: form.quartier, groupeSanguin: form.groupeSanguin, allergies: form.allergies, contactsUrgence: form.contactsUrgence }
        : { email: form.email, password: form.password, type, nom: form.nom, prenom: form.prenom, specialite: form.specialite, numeroOrdre: form.numeroOrdre }
      await register(payload)
      toast.success('Compte créé avec succès ! Vous pouvez vous connecter.')
      router.push('/login')
    } catch (err: any) {
      if (err.response?.status === 422) toast.error('Vérifiez les champs : certaines informations sont invalides.')
      else toast.error('Erreur lors de la création du compte.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async (credentialResponse: any) => {
    setLoading(true)
    try {
      await loginWithGoogle(credentialResponse.credential)
      toast.success('Compte créé avec Google.')
      router.push('/')
    } catch {
      toast.error("L'inscription avec Google a échoué.")
    } finally {
      setLoading(false)
    }
  }

  const steps = ['Type de compte', 'Informations', 'Détails']

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-6 py-12 bg-gradient-to-br from-sable to-primary-50 dark:from-primary-900 dark:to-primary-700">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg bg-white/80 dark:bg-primary-700/50 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-2xl shadow-glass p-8"
      >
        <h1 className="font-display font-bold text-2xl text-primary-900 dark:text-sable text-center mb-1">Créer un compte</h1>
        <p className="text-sm text-primary-300 text-center mb-6">Rejoignez MediSecours+ en quelques étapes</p>

        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i <= step ? 'bg-mint-500 text-white' : 'bg-primary-100 dark:bg-primary-900 text-primary-300'}`}>
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              {i < steps.length - 1 && <div className={`w-8 h-0.5 ${i < step ? 'bg-mint-500' : 'bg-primary-100 dark:bg-primary-900'}`} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => { setType('patient'); setStep(1) }}
                  className="flex flex-col items-center gap-2 p-6 rounded-2xl border-2 border-primary-100 dark:border-white/10 hover:border-mint-500 hover:bg-mint-100/30 transition"
                >
                  <User className="w-8 h-8 text-primary-500" />
                  <span className="font-semibold text-primary-900 dark:text-sable">Patient</span>
                </button>
                <button
                  onClick={() => { setType('medecin'); setStep(1) }}
                  className="flex flex-col items-center gap-2 p-6 rounded-2xl border-2 border-primary-100 dark:border-white/10 hover:border-mint-500 hover:bg-mint-100/30 transition"
                >
                  <Stethoscope className="w-8 h-8 text-primary-500" />
                  <span className="font-semibold text-primary-900 dark:text-sable">Médecin</span>
                </button>
              </div>
              <div className="flex items-center gap-3 my-2">
                <div className="flex-1 h-px bg-primary-100 dark:bg-white/10" />
                <span className="text-xs text-primary-300">ou</span>
                <div className="flex-1 h-px bg-primary-100 dark:bg-white/10" />
              </div>
              <div className="flex justify-center">
                <GoogleLogin onSuccess={handleGoogle} onError={() => toast.error("L'inscription Google a échoué.")} text="signup_with" />
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input value={form.prenom} onChange={set('prenom')} placeholder="Prénom" className="w-full px-3 py-2.5 rounded-xl border border-primary-100 dark:border-white/10 bg-white/80 dark:bg-primary-900/40 focus:outline-none focus:ring-2 focus:ring-mint-500" />
                  {errors.prenom && <p className="text-xs text-urgence-500 mt-1">{errors.prenom}</p>}
                </div>
                <div>
                  <input value={form.nom} onChange={set('nom')} placeholder="Nom" className="w-full px-3 py-2.5 rounded-xl border border-primary-100 dark:border-white/10 bg-white/80 dark:bg-primary-900/40 focus:outline-none focus:ring-2 focus:ring-mint-500" />
                  {errors.nom && <p className="text-xs text-urgence-500 mt-1">{errors.nom}</p>}
                </div>
              </div>
              <div>
                <input type="email" value={form.email} onChange={set('email')} placeholder="Email" className="w-full px-3 py-2.5 rounded-xl border border-primary-100 dark:border-white/10 bg-white/80 dark:bg-primary-900/40 focus:outline-none focus:ring-2 focus:ring-mint-500" />
                {errors.email && <p className="text-xs text-urgence-500 mt-1">{errors.email}</p>}
              </div>
              <div>
                <input type="password" value={form.password} onChange={set('password')} placeholder="Mot de passe" className="w-full px-3 py-2.5 rounded-xl border border-primary-100 dark:border-white/10 bg-white/80 dark:bg-primary-900/40 focus:outline-none focus:ring-2 focus:ring-mint-500" />
                {errors.password && <p className="text-xs text-urgence-500 mt-1">{errors.password}</p>}
              </div>
              {type === 'patient' && (
                <input value={form.telephone} onChange={set('telephone')} placeholder="Téléphone (+229…)" className="w-full px-3 py-2.5 rounded-xl border border-primary-100 dark:border-white/10 bg-white/80 dark:bg-primary-900/40 focus:outline-none focus:ring-2 focus:ring-mint-500" />
              )}
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
              {type === 'patient' ? (
                <>
                  <input value={form.quartier} onChange={set('quartier')} placeholder="Quartier (ex : Bastos, Bonamoussadi)" className="w-full px-3 py-2.5 rounded-xl border border-primary-100 dark:border-white/10 bg-white/80 dark:bg-primary-900/40 focus:outline-none focus:ring-2 focus:ring-mint-500" />
                  <input value={form.groupeSanguin} onChange={set('groupeSanguin')} placeholder="Groupe sanguin (ex : O+)" className="w-full px-3 py-2.5 rounded-xl border border-primary-100 dark:border-white/10 bg-white/80 dark:bg-primary-900/40 focus:outline-none focus:ring-2 focus:ring-mint-500" />
                  <input value={form.allergies} onChange={set('allergies')} placeholder="Allergies connues" className="w-full px-3 py-2.5 rounded-xl border border-primary-100 dark:border-white/10 bg-white/80 dark:bg-primary-900/40 focus:outline-none focus:ring-2 focus:ring-mint-500" />
                  <input value={form.contactsUrgence} onChange={set('contactsUrgence')} placeholder="Contact d'urgence (ex : Mère: +229…)" className="w-full px-3 py-2.5 rounded-xl border border-primary-100 dark:border-white/10 bg-white/80 dark:bg-primary-900/40 focus:outline-none focus:ring-2 focus:ring-mint-500" />
                </>
              ) : (
                <>
                  <input value={form.specialite} onChange={set('specialite')} placeholder="Spécialité (ex : Cardiologie)" className="w-full px-3 py-2.5 rounded-xl border border-primary-100 dark:border-white/10 bg-white/80 dark:bg-primary-900/40 focus:outline-none focus:ring-2 focus:ring-mint-500" />
                  <input value={form.numeroOrdre} onChange={set('numeroOrdre')} placeholder="Numéro d'ordre (ex : MED-BJ-2024-001)" className="w-full px-3 py-2.5 rounded-xl border border-primary-100 dark:border-white/10 bg-white/80 dark:bg-primary-900/40 focus:outline-none focus:ring-2 focus:ring-mint-500" />
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {step > 0 && (
          <div className="flex items-center justify-between mt-6">
            <button onClick={back} className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-primary-700 dark:text-sable hover:bg-primary-100 dark:hover:bg-primary-900 text-sm font-medium">
              <ChevronLeft className="w-4 h-4" /> Retour
            </button>
            {step < 2 ? (
              <button onClick={next} className="inline-flex items-center gap-1 px-5 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-700 text-white text-sm font-semibold">
                Suivant <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading} className="px-5 py-2.5 rounded-xl bg-mint-500 hover:bg-mint-700 text-white text-sm font-semibold disabled:opacity-60">
                {loading ? 'Création…' : 'Créer mon compte'}
              </button>
            )}
          </div>
        )}

        <p className="text-center text-sm text-primary-300 mt-6">
          Déjà inscrit ? <Link href="/login" className="text-mint-500 font-semibold hover:text-mint-700">Se connecter</Link>
        </p>
      </motion.div>
    </div>
  )
}
