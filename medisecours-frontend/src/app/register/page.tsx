'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { GoogleLogin } from '@react-oauth/google'
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Check,
  Circle,
  Eye,
  EyeOff,
  HeartPulse,
  LoaderCircle,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Stethoscope,
  User,
} from 'lucide-react'
import AuthLayout from '../../components/auth/AuthLayout'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'

type AccountType = 'patient' | 'medecin'

type RegisterForm = {
  email: string
  password: string
  confirmPassword: string
  nom: string
  prenom: string
  telephone: string
  quartier: string
  groupeSanguin: string
  allergies: string
  contactsUrgence: string
  specialite: string
  numeroOrdre: string
}

type FieldErrors = Partial<Record<keyof RegisterForm | 'terms' | 'type', string>>

const emptyForm: RegisterForm = {
  email: '',
  password: '',
  confirmPassword: '',
  nom: '',
  prenom: '',
  telephone: '',
  quartier: '',
  groupeSanguin: '',
  allergies: '',
  contactsUrgence: '',
  specialite: '',
  numeroOrdre: '',
}

const steps = ['Profil', 'Identité', 'Détails']
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/
const inputClass =
  'min-h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 aria-invalid:border-red-500 aria-invalid:ring-4 aria-invalid:ring-red-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-blue-400 dark:aria-invalid:border-red-400'

function isValidPhone(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return true

  const compact = trimmed.replace(/[\s().-]/g, '')
  if (compact.startsWith('+')) return /^\+[1-9]\d{7,14}$/.test(compact)

  return /^(?:237)?[26]\d{8}$/.test(compact)
}

function isValidOrderNumber(value: string) {
  return /^[A-Za-z0-9][A-Za-z0-9 ./_-]{3,49}$/.test(value.trim())
}

export default function RegisterPage() {
  const [step, setStep] = useState(0)
  const [type, setType] = useState<AccountType | null>(null)
  const [form, setForm] = useState<RegisterForm>(emptyForm)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { register, loginWithGoogle } = useAuth()
  const toast = useToast()
  const router = useRouter()

  const setField = (key: keyof RegisterForm) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [key]: event.target.value }))
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }))
  }

  const validateField = (key: keyof RegisterForm) => {
    let error: string | undefined
    const value = form[key].trim()

    if (key === 'prenom' && value.length < 2) error = 'Saisissez votre prénom complet.'
    if (key === 'nom' && value.length < 2) error = 'Saisissez votre nom complet.'
    if (key === 'email' && !/^\S+@\S+\.\S+$/.test(value)) error = 'Exemple attendu : nom@domaine.com.'
    if (key === 'password' && !passwordPattern.test(form.password)) {
      error = 'Le mot de passe ne respecte pas encore tous les critères.'
    }
    if (key === 'confirmPassword' && form.confirmPassword !== form.password) {
      error = 'La confirmation doit être identique au mot de passe.'
    }
    if (key === 'telephone' && !isValidPhone(value)) {
      error = 'Utilisez 9 chiffres au Cameroun ou le format international, par exemple +237 6 99 00 00 00.'
    }
    if (key === 'groupeSanguin' && value && !/^(A|B|AB|O)[+-]$/i.test(value)) {
      error = 'Utilisez un groupe valide, par exemple O+, A- ou AB+.'
    }
    if (key === 'specialite' && type === 'medecin' && value.length < 2) {
      error = 'Indiquez la spécialité figurant sur vos documents professionnels.'
    }
    if (key === 'numeroOrdre' && type === 'medecin' && !isValidOrderNumber(value)) {
      error = 'Recopiez le numéro officiel, avec ses lettres, chiffres et tirets.'
    }

    setErrors((current) => ({ ...current, [key]: error }))
    return !error
  }

  const passwordChecks = [
    { label: '8 caractères minimum', valid: form.password.length >= 8 },
    { label: 'Une lettre majuscule', valid: /[A-Z]/.test(form.password) },
    { label: 'Une lettre minuscule', valid: /[a-z]/.test(form.password) },
    { label: 'Un chiffre', valid: /\d/.test(form.password) },
    { label: 'Un symbole, par exemple ! @ # ?', valid: /[\W_]/.test(form.password) },
  ]

  const validateIdentity = () => {
    const nextErrors: FieldErrors = {}

    if (form.prenom.trim().length < 2) nextErrors.prenom = 'Saisissez votre prénom complet.'
    if (form.nom.trim().length < 2) nextErrors.nom = 'Saisissez votre nom complet.'
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) nextErrors.email = 'Exemple attendu : nom@domaine.com.'
    if (!passwordPattern.test(form.password)) {
      nextErrors.password = 'Le mot de passe ne respecte pas encore tous les critères.'
    }
    if (form.confirmPassword !== form.password) {
      nextErrors.confirmPassword = 'La confirmation doit être identique au mot de passe.'
    }
    if (!acceptedTerms) nextErrors.terms = 'Vous devez accepter les conditions pour continuer.'

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const validateDetails = () => {
    const nextErrors: FieldErrors = {}

    if (type === 'medecin') {
      if (form.specialite.trim().length < 2) {
        nextErrors.specialite = 'Indiquez la spécialité figurant sur vos documents professionnels.'
      }
      if (!isValidOrderNumber(form.numeroOrdre)) {
        nextErrors.numeroOrdre = 'Recopiez le numéro officiel, avec ses lettres, chiffres et tirets.'
      }
    }

    if (!isValidPhone(form.telephone)) {
      nextErrors.telephone = 'Utilisez 9 chiffres au Cameroun ou le format international, par exemple +237 6 99 00 00 00.'
    }

    if (form.groupeSanguin.trim() && !/^(A|B|AB|O)[+-]$/i.test(form.groupeSanguin.trim())) {
      nextErrors.groupeSanguin = 'Format attendu : A+, A-, B+, B-, AB+, AB-, O+ ou O-.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const chooseType = (accountType: AccountType) => {
    setType(accountType)
    setErrors({})
    setStep(1)
  }

  const next = () => {
    if (step === 1 && !validateIdentity()) return
    setErrors({})
    setStep((current) => Math.min(current + 1, 2))
  }

  const back = () => {
    setErrors({})
    setStep((current) => Math.max(current - 1, 0))
  }

  const handleSubmit = async () => {
    if (!type || !validateDetails()) return

    setLoading(true)
    try {
      const common = {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        type,
        nom: form.nom.trim(),
        prenom: form.prenom.trim(),
      }

      const payload =
        type === 'patient'
          ? {
              ...common,
              telephone: form.telephone.trim(),
              quartier: form.quartier.trim(),
              groupeSanguin: form.groupeSanguin.trim().toUpperCase(),
              allergies: form.allergies.trim(),
              contactsUrgence: form.contactsUrgence.trim(),
            }
          : {
              ...common,
              telephone: form.telephone.trim(),
              specialite: form.specialite.trim(),
              numeroOrdre: form.numeroOrdre.trim(),
            }

      await register(payload)
      toast.success(
        type === 'medecin'
          ? 'Compte créé. Votre profil médecin doit maintenant être validé.'
          : 'Compte créé. Un e-mail de confirmation vous a été envoyé.',
      )
      router.push('/login?registered=1')
    } catch (error: any) {
      const status = error.response?.status
      const serverMessage = error.response?.data?.error || error.response?.data?.message

      if (status === 409) {
        toast.error(serverMessage || 'Un compte existe déjà avec cette adresse e-mail.')
      } else if (status === 422) {
        toast.error(serverMessage || 'Certaines informations sont invalides.')
      } else if (status === 429) {
        toast.error(serverMessage || 'Trop de créations de compte. Réessayez plus tard.')
      } else {
        toast.error(serverMessage || 'Le service d’inscription est temporairement indisponible.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) {
      toast.error('Google n’a pas transmis de jeton de connexion.')
      return
    }

    setLoading(true)
    try {
      await loginWithGoogle(credentialResponse.credential)
      toast.success('Votre compte patient Google est prêt.')
      router.push('/')
    } catch (error: any) {
      const message = error.response?.data?.error || error.response?.data?.message
      toast.error(message || 'L’inscription avec Google a échoué.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Créer votre espace"
      title="Créer un compte"
      description="Choisissez votre profil puis renseignez uniquement les informations nécessaires à votre prise en charge."
    >
      <div className="mb-7 flex items-start">
        {steps.map((label, index) => {
          const completed = index < step
          const active = index === step

          return (
            <div key={label} className="flex min-w-0 flex-1 items-start last:flex-none">
              <div className="flex min-w-[58px] flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
                    completed || active
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900'
                  }`}
                >
                  {completed ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                <span
                  className={`mt-1.5 text-[10px] font-semibold sm:text-xs ${
                    active ? 'text-blue-700 dark:text-blue-400' : 'text-slate-400'
                  }`}
                >
                  {label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`mt-4 h-px min-w-4 flex-1 ${completed ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-800'}`} />
              )}
            </div>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -18 }}
            className="space-y-5"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => chooseType('patient')}
                className="group min-h-[150px] rounded-lg border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-blue-500 hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-400 dark:hover:bg-blue-950/30"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700 group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-950 dark:text-blue-300">
                  <User className="h-5 w-5" />
                </div>
                <span className="block font-display text-base font-bold text-slate-950 dark:text-white">Patient</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Premiers soins, centres, consultations et messagerie.
                </span>
              </button>

              <button
                type="button"
                onClick={() => chooseType('medecin')}
                className="group min-h-[150px] rounded-lg border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-blue-500 hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-400 dark:hover:bg-blue-950/30"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700 group-hover:bg-cyan-600 group-hover:text-white dark:bg-cyan-950 dark:text-cyan-300">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <span className="block font-display text-base font-bold text-slate-950 dark:text-white">Médecin</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Profil professionnel soumis à la validation d’un administrateur.
                </span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              <span className="text-xs font-medium text-slate-400">ou</span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </div>

            <div className={`flex flex-col items-center gap-2 ${loading ? 'pointer-events-none opacity-60' : ''}`}>
              <GoogleLogin
                onSuccess={handleGoogle}
                onError={() => toast.error('L’inscription Google a échoué.')}
                text="signup_with"
                shape="rectangular"
              />
              <p className="text-center text-[11px] text-slate-400">
                L’inscription Google crée uniquement un compte patient.
              </p>
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="identity"
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -18 }}
            className="space-y-4"
          >
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Les champs marqués d’un <span className="font-bold text-red-500">*</span> sont obligatoires.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Prénom" error={errors.prenom} hint="Tel qu’il figure sur vos documents." required>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={form.prenom}
                    onChange={setField('prenom')}
                    onBlur={() => validateField('prenom')}
                    autoComplete="given-name"
                    aria-invalid={Boolean(errors.prenom)}
                    className={`${inputClass} pl-10`}
                    placeholder="Votre prénom"
                  />
                </div>
              </Field>
              <Field label="Nom" error={errors.nom} hint="Votre nom de famille complet." required>
                <input
                  value={form.nom}
                  onChange={setField('nom')}
                  onBlur={() => validateField('nom')}
                  autoComplete="family-name"
                  aria-invalid={Boolean(errors.nom)}
                  className={inputClass}
                  placeholder="Votre nom"
                />
              </Field>
            </div>

            <Field
              label="Adresse e-mail"
              error={errors.email}
              hint="Elle servira à la connexion et à la confirmation du compte."
              required
            >
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={form.email}
                  onChange={setField('email')}
                  onBlur={() => validateField('email')}
                  autoComplete="email"
                  inputMode="email"
                  aria-invalid={Boolean(errors.email)}
                  className={`${inputClass} pl-10`}
                  placeholder="vous@exemple.com"
                />
              </div>
            </Field>

            <Field label="Mot de passe" error={errors.password} required>
              <>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={setField('password')}
                    onBlur={() => validateField('password')}
                    autoComplete="new-password"
                    aria-invalid={Boolean(errors.password)}
                    className={`${inputClass} pl-10 pr-12`}
                    placeholder="Créez un mot de passe robuste"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="mt-2 grid gap-x-3 gap-y-1 sm:grid-cols-2" aria-label="Critères du mot de passe">
                  {passwordChecks.map((check) => (
                    <div
                      key={check.label}
                      className={`flex items-center gap-1.5 text-[11px] ${
                        check.valid ? 'font-medium text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                      }`}
                    >
                      {check.valid ? <Check className="h-3.5 w-3.5 shrink-0" /> : <Circle className="h-3 w-3 shrink-0" />}
                      <span>{check.label}</span>
                    </div>
                  ))}
                </div>
              </>
            </Field>

            <Field
              label="Confirmer le mot de passe"
              error={errors.confirmPassword}
              hint="Recopiez exactement le mot de passe choisi."
              required
            >
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={setField('confirmPassword')}
                onBlur={() => validateField('confirmPassword')}
                autoComplete="new-password"
                aria-invalid={Boolean(errors.confirmPassword)}
                className={inputClass}
                placeholder="Saisissez-le une seconde fois"
              />
            </Field>

            <label className="flex cursor-pointer items-start gap-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => {
                  setAcceptedTerms(event.target.checked)
                  if (errors.terms) setErrors((current) => ({ ...current, terms: undefined }))
                }}
                className="mt-0.5 h-4 w-4 shrink-0 accent-blue-600"
              />
              <span>
                J’accepte la politique de confidentialité et les conditions d’utilisation de MediSecours.
              </span>
            </label>
            {errors.terms && <p className="text-xs font-medium text-red-600 dark:text-red-400">{errors.terms}</p>}
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="details"
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -18 }}
            className="space-y-4"
          >
            {type === 'patient' ? (
              <>
                <div className="flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
                  <HeartPulse className="mt-0.5 h-4 w-4 shrink-0" />
                  Ces informations sont facultatives et servent à améliorer votre prise en charge.
                </div>
                <Field
                  label="Téléphone (facultatif)"
                  error={errors.telephone}
                  hint="Cameroun : 6 99 00 00 00. International : +237 6 99 00 00 00."
                >
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={form.telephone}
                      onChange={setField('telephone')}
                      onBlur={() => validateField('telephone')}
                      autoComplete="tel"
                      inputMode="tel"
                      aria-invalid={Boolean(errors.telephone)}
                      className={`${inputClass} pl-10`}
                      placeholder="+237 6 99 00 00 00"
                    />
                  </div>
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Quartier (facultatif)" hint="Indiquez votre quartier ou votre zone de résidence habituelle.">
                    <input
                      value={form.quartier}
                      onChange={setField('quartier')}
                      autoComplete="address-level3"
                      className={inputClass}
                      placeholder="Ex. Bonamoussadi"
                    />
                  </Field>
                  <Field label="Groupe sanguin (facultatif)" error={errors.groupeSanguin} hint="Exemples : O+, A-, AB+.">
                    <input
                      value={form.groupeSanguin}
                      onChange={setField('groupeSanguin')}
                      onBlur={() => validateField('groupeSanguin')}
                      aria-invalid={Boolean(errors.groupeSanguin)}
                      className={inputClass}
                      placeholder="Ex. O+"
                    />
                  </Field>
                </div>
                <Field
                  label="Allergies connues (facultatif)"
                  hint="Séparez plusieurs allergies par des virgules. Laissez vide si vous n’en connaissez aucune."
                >
                  <input
                    value={form.allergies}
                    onChange={setField('allergies')}
                    className={inputClass}
                    placeholder="Séparez les allergies par des virgules"
                  />
                </Field>
                <Field
                  label="Contact d’urgence (facultatif)"
                  hint="Indiquez le nom, le lien avec vous et un numéro joignable."
                >
                  <input
                    value={form.contactsUrgence}
                    onChange={setField('contactsUrgence')}
                    className={inputClass}
                    placeholder="Nom et numéro de téléphone"
                  />
                </Field>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  Le compte restera en attente jusqu’à la vérification de vos informations par un administrateur.
                </div>
                <Field
                  label="Spécialité médicale"
                  error={errors.specialite}
                  hint="Utilisez l’intitulé figurant sur votre justificatif professionnel."
                  required
                >
                  <div className="relative">
                    <Stethoscope className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={form.specialite}
                      onChange={setField('specialite')}
                      onBlur={() => validateField('specialite')}
                      aria-invalid={Boolean(errors.specialite)}
                      className={`${inputClass} pl-10`}
                      placeholder="Ex. Cardiologie"
                    />
                  </div>
                </Field>
                <Field
                  label="Téléphone professionnel (facultatif)"
                  error={errors.telephone}
                  hint="Utilisez un numéro joignable par la clinique ou l’administrateur."
                >
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={form.telephone}
                      onChange={setField('telephone')}
                      onBlur={() => validateField('telephone')}
                      autoComplete="tel"
                      inputMode="tel"
                      aria-invalid={Boolean(errors.telephone)}
                      className={`${inputClass} pl-10`}
                      placeholder="+237 6 99 00 00 00"
                    />
                  </div>
                </Field>
                <Field
                  label="Numéro d’ordre professionnel"
                  error={errors.numeroOrdre}
                  hint="Recopiez-le exactement comme sur votre carte ou attestation d’inscription à l’ordre."
                  required
                >
                  <input
                    value={form.numeroOrdre}
                    onChange={setField('numeroOrdre')}
                    onBlur={() => validateField('numeroOrdre')}
                    aria-invalid={Boolean(errors.numeroOrdre)}
                    className={inputClass}
                    placeholder="Ex. ONMC-2026-0001"
                  />
                </Field>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {step > 0 && (
        <div className="mt-7 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={back}
            disabled={loading}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
          {step < 2 ? (
            <button
              type="button"
              onClick={next}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
            >
              Continuer
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {loading ? 'Création…' : 'Créer mon compte'}
            </button>
          )}
        </div>
      )}

      <p className="mt-7 text-center text-sm text-slate-500 dark:text-slate-400">
        Déjà inscrit ?{' '}
        <Link href="/login" className="font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400">
          Se connecter
        </Link>
      </p>
    </AuthLayout>
  )
}

function Field({
  label,
  error,
  hint,
  required = false,
  children,
}: {
  label: string
  error?: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
        {required && (
          <>
            <span className="ml-1 text-red-500" aria-hidden="true">*</span>
            <span className="sr-only"> obligatoire</span>
          </>
        )}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-red-600 dark:text-red-400" role="alert">
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : (
        hint && <p className="mt-1.5 text-[11px] leading-4 text-slate-400 dark:text-slate-500">{hint}</p>
      )}
    </div>
  )
}
