'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { GoogleLogin } from '@react-oauth/google'
import { HeartPulse, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const { login, loginWithGoogle, user, isAuthenticated, mounted } = useAuth()
  const toast = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from') || '/'

  const validate = () => {
    const e: Record<string, string> = {}
    if (!/^\S+@\S+\.\S+$/.test(email)) e.email = 'Email invalide.'
    if (password.length < 6) e.password = '6 caractères minimum.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const loggedUser = await login(email, password)
      toast.success('Connexion réussie. Bienvenue !')
      if (loggedUser.roles?.includes('ROLE_ADMIN')) {
        router.push('/admin')
      } else if (loggedUser.roles?.includes('ROLE_MEDECIN')) {
        router.push('/medecin')
      } else {
        router.push(from === '/admin' || from === '/medecin' ? '/' : from)
      }
    } catch (err: any) {
      const status = err.response?.status
      const serverMsg = err.response?.data?.error || err.response?.data?.message
      if (status === 401) {
        toast.error('Email ou mot de passe incorrect.')
      } else if (status === 403) {
        toast.error(serverMsg || 'Accès refusé. Contactez l\'administrateur.')
      } else {
        toast.error('Erreur de connexion au serveur.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async (credentialResponse: any) => {
    setLoading(true)
    try {
      const loggedUser = await loginWithGoogle(credentialResponse.credential)
      toast.success('Connexion Google réussie.')
      if (loggedUser.roles?.includes('ROLE_ADMIN')) {
        router.push('/admin')
      } else if (loggedUser.roles?.includes('ROLE_MEDECIN')) {
        router.push('/medecin')
      } else {
        router.push(from === '/admin' || from === '/medecin' ? '/' : from)
      }
    } catch (err: any) {
      const status  = err.response?.status
      const msg     = err.response?.data?.error || err.response?.data?.message
      if (status === 403) {
        toast.error(msg || 'Votre compte a été désactivé. Contactez l\'administrateur.')
      } else {
        toast.error('La connexion avec Google a échoué.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-12 bg-gradient-to-br from-sable to-primary-50 dark:from-primary-900 dark:to-primary-700">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white/80 dark:bg-primary-700/50 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-2xl shadow-glass p-8"
      >
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary-500 flex items-center justify-center mb-3">
            <HeartPulse className="w-6 h-6 text-white" />
          </div>
          <h1 className="font-display font-bold text-2xl text-primary-900 dark:text-sable">Bon retour</h1>
          <p className="text-sm text-primary-300">Connectez-vous à votre compte MediSecours+</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="text-sm font-medium text-primary-700 dark:text-sable">Email</label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-300" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-primary-100 dark:border-white/10 bg-white/80 dark:bg-primary-900/40 focus:outline-none focus:ring-2 focus:ring-mint-500"
                placeholder="vous@exemple.com"
              />
            </div>
            {errors.email && <p className="text-xs text-urgence-500 mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-primary-700 dark:text-sable">Mot de passe</label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-300" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-primary-100 dark:border-white/10 bg-white/80 dark:bg-primary-900/40 focus:outline-none focus:ring-2 focus:ring-mint-500"
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShowPassword((s: boolean) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-300">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-urgence-500 mt-1">{errors.password}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-mint-500 hover:bg-mint-700 text-white font-semibold shadow-lg transition disabled:opacity-60"
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-primary-100 dark:bg-white/10" />
          <span className="text-xs text-primary-300">ou</span>
          <div className="flex-1 h-px bg-primary-100 dark:bg-white/10" />
        </div>

        <div className="flex justify-center">
          <GoogleLogin onSuccess={handleGoogle} onError={() => toast.error('La connexion Google a échoué.')} />
        </div>

        <p className="text-center text-sm text-primary-300 mt-6">
          Pas encore de compte ?{' '}
          <Link href="/register" className="text-mint-500 font-semibold hover:text-mint-700">{"S'inscrire"}</Link>
        </p>
      </motion.div>
    </div>
  )
}
