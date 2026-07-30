// @ts-nocheck
'use client'

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  MédiSecours+ — Page d'accueil Patient / Visiteur
 *  Refactoring architectural complet : UI/UX de grade exécutif.
 *
 *  Sections :
 *   1. HERO CLINIQUE — Proposition de valeur + triage instantané
 *   2. BANDE DE CONFIANCE — Indicateurs de crédibilité clinique
 *   3. COMMENT ÇA MARCHE — Chronologie du workflow plateforme (3 étapes)
 *   4. CATALOGUE DE SERVICES — Grille interactive des fonctionnalités
 *   5. CENTRES DE PROXIMITÉ — Snippet géolocalisé (API live)
 *   6. URGENCES FRÉQUENTES — Cas d'urgence éducatifs
 *   7. CTA FINAL — Appel à l'action de clôture
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import {
  LifeBuoy, MapPin, Siren, ShieldCheck,
  MessageSquare, Phone, Clock, ChevronRight,
  Activity, Search, Zap, Globe2, BookOpen,
  Heart, ArrowRight, CheckCircle2, Wifi,
  FileText, Users, AlertTriangle, Stethoscope,
  Navigation, Star
} from 'lucide-react'
import api from '../api/axios'
import SearchBar from '../components/ui/SearchBar'
import CategoryCard from '../components/cards/CategoryCard'
import MaladieCard from '../components/cards/MaladieCard'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { useGeolocation } from '../hooks/useGeolocation'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../components/ui/Toast'

/* ── Utilitaire d'extraction Hydra/API Platform ── */
function extractArray(res: any) {
  const raw = res.data?.['hydra:member'] ?? res.data?.member ?? res.data
  return Array.isArray(raw) ? raw : []
}

/* ── Calcul distance Haversine ── */
function distanceKm(a: any, b: any) {
  if (!a || !b) return null
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

/* ── Variantes d'animation Framer Motion réutilisables ── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (i: number = 0) => ({
    opacity: 1, scale: 1,
    transition: { duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
}

/* ── Composant compteur animé ── */
function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView) return
    let start = 0
    const duration = 1800
    const increment = target / (duration / 16)
    const timer = setInterval(() => {
      start += increment
      if (start >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [inView, target])

  return <span ref={ref}>{count}{suffix}</span>
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  COMPOSANT PRINCIPAL — Page d'accueil
 * ═══════════════════════════════════════════════════════════════════════════ */
export default function Home() {
  const [query, setQuery] = useState('')
  const [categories, setCategories] = useState<any[]>([])
  const [urgences, setUrgences] = useState<any[]>([])
  const [centres, setCentres] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [centresLoading, setCentresLoading] = useState(true)

  const router = useRouter()
  const { position, locate, loading: locating } = useGeolocation()
  const { isAuthenticated } = useAuth()
  const toast = useToast()

  /* ── Chargement initial : catégories, maladies, centres de santé ── */
  useEffect(() => {
    let active = true
    Promise.all([
      api.get('/api/categories'),
      api.get('/api/maladies'),
      api.get('/api/centre_de_santes'),
    ])
      .then(([catRes, malRes, centreRes]) => {
        if (!active) return
        setCategories(extractArray(catRes).slice(0, 6))
        setUrgences(extractArray(malRes).filter((m) => m.urgence).slice(0, 4))
        setCentres(extractArray(centreRes))
      })
      .catch(() => toast.error('Impossible de charger les données.'))
      .finally(() => {
        if (active) { setLoading(false); setCentresLoading(false) }
      })
    return () => { active = false }
  }, [])

  /* ── Recherche de centres proches si géolocalisation disponible ── */
  useEffect(() => {
    if (!position) return
    api.get('/api/centres_de_santes/proches', {
      params: { lat: position.lat, lng: position.lng, rayon: 25, limit: 6 },
    })
      .then((res) => {
        const data = extractArray(res)
        if (data.length > 0) setCentres(data)
      })
      .catch(() => {})
  }, [position])

  /* ── Tri des centres par distance ── */
  const sortedCentres = useMemo(() => {
    if (!position) return centres.slice(0, 4)
    return [...centres]
      .sort((a, b) => {
        const da = distanceKm(position, { lat: a.latitude, lng: a.longitude })
        const db = distanceKm(position, { lat: b.latitude, lng: b.longitude })
        return (da ?? 9999) - (db ?? 9999)
      })
      .slice(0, 4)
  }, [centres, position])

  /* ── Gestion de la recherche symptômes ── */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) router.push(`/maladies?symptomes=${encodeURIComponent(query.trim())}`)
  }

  const handleLocate = () => {
    locate()
    router.push('/centres')
  }

  /* ── Refs pour les sections avec scroll ── */
  const firstAidRef = useRef<HTMLDivElement>(null)
  const scrollToFirstAid = () => {
    firstAidRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="overflow-x-hidden">

      {/* ══════════════════════════════════════════════════════════════════
       *  SECTION 1 — HERO CLINIQUE
       *  Proposition de valeur + barre de recherche + double CTA
       * ══════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden min-h-[100vh] flex items-center">
        {/* Couche 1 : Gradient de fond professionnel */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0C1A2C] via-[#152A45] to-[#1E3A5F]" />

        {/* Couche 2 : Image de fond (secourisme CPR) avec opacité contrôlée */}
        <div className="absolute inset-0 bg-[url('/images/hero_cpr_bg.jpg')] bg-cover bg-center opacity-25" />

        {/* Couche 3 : Overlay gradient pour lisibilité du texte */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0C1A2C]/90 via-[#0C1A2C]/40 to-transparent" />

        {/* Couche 4 : Effets lumineux décoratifs */}
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: 'radial-gradient(ellipse 600px 400px at 15% 30%, rgba(16,185,129,0.4) 0%, transparent 70%), radial-gradient(ellipse 500px 350px at 85% 70%, rgba(99,102,241,0.3) 0%, transparent 70%)'
        }} />

        {/* Grille décorative subtile */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />

        {/* Contenu principal du Hero */}
        <div className="relative w-full max-w-6xl mx-auto px-6 pt-36 pb-20 sm:pt-44 sm:pb-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* ── Colonne gauche : Texte & CTAs ── */}
            <div>
              {/* Badge de contexte */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.08] backdrop-blur-md border border-white/[0.12] mb-8"
              >
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-emerald-300/90 text-xs font-semibold tracking-wide uppercase">
                  Plateforme active · Cameroun
                </span>
              </motion.div>

              {/* Titre principal H1 */}
              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="font-display font-extrabold text-[2.5rem] sm:text-5xl lg:text-[3.5rem] text-white leading-[1.1] tracking-tight mb-6"
              >
                Assistance d&apos;urgence{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                  instantanée
                </span>
                <br />
                <span className="text-slate-300 text-[0.7em] font-bold">
                  & soins médicaux de proximité
                </span>
              </motion.h1>

              {/* Sous-titre descriptif */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.25 }}
                className="text-slate-400 text-base sm:text-lg leading-relaxed max-w-lg mb-10"
              >
                Identifiez les gestes de premiers soins, localisez le centre de santé
                le plus proche, et consultez un médecin en temps réel — le tout en quelques secondes.
              </motion.p>

              {/* ── Double CTA ── */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.35 }}
                className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-10"
              >
                {/* CTA 1 : Urgence — vers les consultations */}
                <Link
                  href={isAuthenticated ? '/patient/consultations' : '/login'}
                  className="group relative inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-sm shadow-[0_8px_30px_rgba(239,68,68,0.35)] hover:shadow-[0_12px_40px_rgba(239,68,68,0.45)] transition-all duration-300 hover:-translate-y-0.5"
                >
                  <Siren className="w-5 h-5 animate-pulse" />
                  Assistance immédiate
                  <ArrowRight className="w-4 h-4 opacity-70 group-hover:translate-x-1 transition-transform" />
                </Link>

                {/* CTA 2 : Consulter les premiers soins */}
                <button
                  onClick={scrollToFirstAid}
                  className="group inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.15] text-white font-semibold text-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5"
                >
                  <BookOpen className="w-5 h-5 text-emerald-400" />
                  Catalogue premiers soins
                  <ChevronRight className="w-4 h-4 opacity-50 group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.div>

              {/* Indicateurs de confiance en ligne */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="flex flex-wrap items-center gap-6 text-slate-500 text-xs"
              >
                {[
                  { icon: ShieldCheck, text: 'Protocoles vérifiés' },
                  { icon: Wifi, text: 'Connexion temps réel' },
                  { icon: Globe2, text: 'Couverture nationale' },
                ].map(({ icon: Icon, text }) => (
                  <span key={text} className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 text-emerald-500/70" />
                    {text}
                  </span>
                ))}
              </motion.div>
            </div>

            {/* ── Colonne droite : Barre de recherche symptômes (card premium) ── */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              {/* Glow effect derrière la carte */}
              <div className="absolute -inset-4 bg-gradient-to-br from-emerald-500/20 to-indigo-500/20 rounded-[2rem] blur-2xl opacity-60" />

              <div className="relative bg-white/[0.07] backdrop-blur-xl border border-white/[0.12] rounded-3xl p-8 sm:p-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                    <Search className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-base">Recherche rapide</h3>
                    <p className="text-slate-500 text-xs">Décrivez vos symptômes</p>
                  </div>
                </div>

                <form onSubmit={handleSearch} className="space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Ex : fièvre, douleur thoracique, brûlure…"
                      className="w-full rounded-xl bg-white/[0.08] border border-white/[0.12] px-5 py-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!query.trim()}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold text-sm shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Activity className="w-4 h-4" />
                    Trouver les gestes de premiers soins
                  </button>
                </form>

                {/* Suggestions rapides de symptômes */}
                <div className="mt-5 flex flex-wrap gap-2">
                  {['Brûlure', 'Évanouissement', 'Hémorragie', 'Fièvre'].map((s) => (
                    <button
                      key={s}
                      onClick={() => { setQuery(s); router.push(`/maladies?symptomes=${encodeURIComponent(s)}`) }}
                      className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-slate-400 hover:text-white text-xs font-medium transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          {/* ── Indicateur de scroll ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          >
            <span className="text-slate-500 text-[10px] uppercase tracking-[0.2em] font-medium">Découvrir</span>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              className="w-5 h-8 rounded-full border-2 border-slate-600 flex items-start justify-center pt-1.5"
            >
              <div className="w-1 h-1.5 bg-slate-500 rounded-full" />
            </motion.div>
          </motion.div>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════════════════
       *  SECTION 2 — BANDE DE CONFIANCE (Trust Strip)
       *  Indicateurs numériques de crédibilité
       * ══════════════════════════════════════════════════════════════════ */}
      <section className="relative -mt-1 bg-white dark:bg-primary-900 border-y border-slate-100 dark:border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {[
              { value: 500, suffix: '+', label: 'Protocoles médicaux', icon: ShieldCheck, color: 'text-emerald-600 dark:text-emerald-400' },
              { value: 150, suffix: '+', label: 'Centres référencés', icon: MapPin, color: 'text-blue-600 dark:text-blue-400' },
              { value: 50, suffix: '+', label: 'Médecins actifs', icon: Stethoscope, color: 'text-indigo-600 dark:text-indigo-400' },
              { value: 24, suffix: '/7', label: 'Disponibilité', icon: Clock, color: 'text-amber-600 dark:text-amber-400' },
            ].map(({ value, suffix, label, icon: Icon, color }, i) => (
              <motion.div
                key={label}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-50px' }}
                custom={i}
                className="flex items-center gap-4"
              >
                <div className={`w-12 h-12 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center shrink-0 ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    <AnimatedCounter target={value} suffix={suffix} />
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════════════════
       *  SECTION 3 — COMMENT ÇA MARCHE (Workflow Chronology)
       *  Architecture en 3 étapes pour le visiteur
       * ══════════════════════════════════════════════════════════════════ */}
      <section className="bg-slate-50 dark:bg-[#0F1B2D] py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-6 mb-16">
          {/* En-tête de section */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center"
          >
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-semibold mb-4">
              <Zap className="w-3 h-3" /> Processus simplifié
            </span>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-slate-900 dark:text-white tracking-tight mb-4">
              Comment ça marche ?
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-base max-w-xl mx-auto">
              De la description de vos symptômes à la prescription sécurisée, en trois étapes seulement.
            </p>
          </motion.div>
        </div>

        {/* Étapes (Sous-sections verticales 100% largeur) */}
        <div className="w-full flex flex-col">
          
          {/* Étape 1 */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="relative w-full min-h-[500px] sm:min-h-[600px] flex items-center overflow-hidden group"
          >
            {/* Background Image (vrai taille et pleine largeur) */}
            <img 
              src="/images/how-it-works-1.jpg" 
              alt="Étape 1" 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
            />
            
            {/* Gradient Overlay for Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-900/70 to-transparent dark:from-[#0F1B2D]/95 dark:via-[#0F1B2D]/70" />
            
            <div className="relative w-full max-w-6xl mx-auto px-6 py-16 z-10">
              {/* Large Background Number */}
              <span className="text-[8rem] sm:text-[14rem] font-extrabold text-white/[0.04] absolute top-1/2 -translate-y-1/2 left-0 leading-none select-none pointer-events-none hidden sm:block">
                01
              </span>
              
              <div className="relative max-w-2xl">

                
                <h3 className="font-display font-extrabold text-4xl sm:text-5xl text-white mb-6 tracking-tight">
                  Décrivez vos symptômes
                </h3>
                
                <p className="text-xl sm:text-2xl text-slate-300 leading-relaxed">
                  Soumettez votre demande en décrivant la situation. Notre système évalue automatiquement la gravité : <strong className="text-white font-semibold">Normale, Urgente ou Critique</strong>.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Étape 2 */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="relative w-full min-h-[500px] sm:min-h-[600px] flex items-center overflow-hidden group border-t border-slate-200/20 dark:border-white/5"
          >
            {/* Background Image (vrai taille et pleine largeur) */}
            <img 
              src="/images/how-it-works-2.jpg" 
              alt="Étape 2" 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
            />
            
            {/* Gradient Overlay for Text Readability (Inversé pour le texte à droite) */}
            <div className="absolute inset-0 bg-gradient-to-l from-slate-900/95 via-slate-900/70 to-transparent dark:from-[#0F1B2D]/95 dark:via-[#0F1B2D]/70" />
            
            <div className="relative w-full max-w-6xl mx-auto px-6 py-16 z-10 flex justify-end text-left lg:text-right">
              {/* Large Background Number */}
              <span className="text-[8rem] sm:text-[14rem] font-extrabold text-white/[0.04] absolute top-1/2 -translate-y-1/2 right-0 leading-none select-none pointer-events-none hidden sm:block">
                02
              </span>
              
              <div className="relative max-w-2xl lg:items-end flex flex-col">

                
                <h3 className="font-display font-extrabold text-4xl sm:text-5xl text-white mb-6 tracking-tight">
                  Connexion temps réel
                </h3>
                
                <p className="text-xl sm:text-2xl text-slate-300 leading-relaxed">
                  Un médecin de proximité est assigné à votre cas en temps réel. Discutez instantanément par messagerie sécurisée.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Étape 3 */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="relative w-full min-h-[500px] sm:min-h-[600px] flex items-center overflow-hidden group border-t border-slate-200/20 dark:border-white/5 rounded-b-[2.5rem]"
          >
            {/* Background Image (vrai taille et pleine largeur) */}
            <img 
              src="/images/how-it-works-3.jpg" 
              alt="Étape 3" 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
            />
            
            {/* Gradient Overlay for Text Readability (Alignement à gauche) */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-900/70 to-transparent dark:from-[#0F1B2D]/95 dark:via-[#0F1B2D]/70" />
            
            <div className="relative w-full max-w-6xl mx-auto px-6 py-16 z-10">
              {/* Large Background Number */}
              <span className="text-[8rem] sm:text-[14rem] font-extrabold text-white/[0.04] absolute top-1/2 -translate-y-1/2 left-0 leading-none select-none pointer-events-none hidden sm:block">
                03
              </span>
              
              <div className="relative max-w-2xl">

                
                <h3 className="font-display font-extrabold text-4xl sm:text-5xl text-white mb-6 tracking-tight">
                  Prescription & rapport
                </h3>
                
                <p className="text-xl sm:text-2xl text-slate-300 leading-relaxed">
                  Le médecin clôture la consultation avec une prescription officielle. Le rapport médical est envoyé par e-mail et téléchargeable en PDF.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════════════════
       *  SECTION 4 — CATALOGUE DE SERVICES (Feature Grid)
       *  Grille interactive des fonctionnalités avec hover transitions
       * ══════════════════════════════════════════════════════════════════ */}
      <section className="bg-white dark:bg-primary-900 py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-6">
          {/* En-tête */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-4">
              <Heart className="w-3 h-3" /> Écosystème complet
            </span>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-slate-900 dark:text-white tracking-tight mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-base max-w-xl mx-auto">
              Une plateforme complète alliant téléconsultation, cartographie médicale et base de connaissances d&apos;urgence.
            </p>
          </motion.div>

          {/* Grille des services */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: MessageSquare,
                title: 'Téléconsultation en direct',
                desc: 'Échangez en temps réel avec un médecin via messagerie sécurisée. Connexion instantanée et notifications en direct.',
                color: 'from-blue-500 to-indigo-600',
                bg: 'bg-blue-50 dark:bg-blue-500/10',
                link: isAuthenticated ? '/patient/consultations' : '/login',
                cta: 'Consulter maintenant',
              },
              {
                icon: MapPin,
                title: 'Cartographie de proximité',
                desc: 'Carte interactive qui géolocalise les cliniques, pharmacies et centres de santé ouverts autour de vous.',
                color: 'from-emerald-500 to-teal-600',
                bg: 'bg-emerald-50 dark:bg-emerald-500/10',
                link: '/centres',
                cta: 'Voir la carte',
              },
              {
                icon: BookOpen,
                title: 'Guide premiers soins',
                desc: 'Catalogue intelligent de gestes d\'urgence : brûlures thermiques, PLS, hémorragies, évanouissements — avec recherche par mots-clés.',
                color: 'from-violet-500 to-purple-600',
                bg: 'bg-violet-50 dark:bg-violet-500/10',
                link: '/maladies',
                cta: 'Explorer le guide',
              },
              {
                icon: Stethoscope,
                title: 'Médecins certifiés',
                desc: 'Réseau de professionnels de santé vérifiés et localisés dans votre zone géographique, prêts à intervenir.',
                color: 'from-sky-500 to-cyan-600',
                bg: 'bg-sky-50 dark:bg-sky-500/10',
                link: '/medecins',
                cta: 'Voir les médecins',
              },
              {
                icon: FileText,
                title: 'Prescriptions officielles',
                desc: 'Recevez une ordonnance officielle signée numériquement, envoyée par e-mail et téléchargeable en PDF sécurisé.',
                color: 'from-amber-500 to-orange-600',
                bg: 'bg-amber-50 dark:bg-amber-500/10',
                link: isAuthenticated ? '/patient/consultations' : '/login',
                cta: 'En savoir plus',
              },
              {
                icon: Users,
                title: 'Suivi patient complet',
                desc: 'Historique de vos consultations, prescriptions et échanges avec vos médecins, accessible à tout moment.',
                color: 'from-rose-500 to-pink-600',
                bg: 'bg-rose-50 dark:bg-rose-500/10',
                link: isAuthenticated ? '/profil' : '/login',
                cta: 'Mon espace',
              },
            ].map((service, i) => (
              <motion.div
                key={service.title}
                variants={scaleIn}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-30px' }}
                custom={i}
              >
                <Link
                  href={service.link}
                  className="group block h-full rounded-3xl bg-white dark:bg-[#162032] border border-slate-100 dark:border-white/[0.06] p-7 hover:border-slate-200 dark:hover:border-white/[0.12] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  {/* Icône du service */}
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${service.color} flex items-center justify-center shadow-lg mb-5`}>
                    <service.icon className="w-5 h-5 text-white" />
                  </div>

                  <h3 className="font-display font-bold text-base text-slate-900 dark:text-white mb-2">
                    {service.title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
                    {service.desc}
                  </p>

                  {/* CTA discret */}
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {service.cta}
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════════════════
       *  SECTION 5 — CENTRES DE SANTÉ DE PROXIMITÉ (Live API Data)
       *  Snippet géolocalisé avec données en direct
       * ══════════════════════════════════════════════════════════════════ */}
      <section className="bg-slate-50 dark:bg-[#0F1B2D] py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-6">
          {/* En-tête */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12"
          >
            <div>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-4">
                <Navigation className="w-3 h-3" /> Géolocalisation
              </span>
              <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-slate-900 dark:text-white tracking-tight mb-2">
                Centres de santé proches
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-base max-w-lg">
                Établissements médicaux référencés autour de votre position actuelle.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={locate}
                disabled={locating}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
              >
                <Navigation className="w-4 h-4" />
                {locating ? 'Localisation…' : 'Me localiser'}
              </button>
              <Link
                href="/centres"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
              >
                Voir tout
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>

          {/* Grille des centres */}
          {centresLoading ? (
            <LoadingSpinner label="Chargement des centres…" />
          ) : sortedCentres.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <MapPin className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Aucun centre disponible pour le moment</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {sortedCentres.map((c, i) => {
                const dist = position
                  ? distanceKm(position, { lat: c.latitude, lng: c.longitude })
                  : null
                return (
                  <motion.div
                    key={c.id}
                    variants={scaleIn}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    custom={i}
                    className="group rounded-3xl bg-white dark:bg-[#162032] border border-slate-100 dark:border-white/[0.06] p-6 hover:border-slate-200 dark:hover:border-white/[0.12] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  >
                    {/* Badge distance */}
                    <div className="flex items-start justify-between gap-2 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shrink-0">
                        <MapPin className="w-4 h-4 text-white" />
                      </div>
                      {dist !== null && (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold">
                          {dist.toFixed(1)} km
                        </span>
                      )}
                    </div>

                    {/* Nom du centre */}
                    <h4 className="font-display font-bold text-sm text-slate-900 dark:text-white mb-2 line-clamp-2">
                      {c.nom}
                    </h4>

                    {/* Adresse */}
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1.5 mb-2">
                      <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{c.adresse}</span>
                    </p>

                    {/* Horaires */}
                    {c.horaires && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-2">
                        <Clock className="w-3 h-3 shrink-0" />
                        {c.horaires}
                      </p>
                    )}

                    {/* Téléphone */}
                    {c.telephone && (
                      <a
                        href={`tel:${c.telephone}`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline mt-1"
                      >
                        <Phone className="w-3 h-3" />
                        {c.telephone}
                      </a>
                    )}
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════════════════
       *  SECTION 6 — CAS D'URGENCE FRÉQUENTS + CATÉGORIES
       *  Contenu éducatif et exploration
       * ══════════════════════════════════════════════════════════════════ */}
      <div ref={firstAidRef}>
        {/* Catégories médicales */}
        <section className="bg-white dark:bg-primary-900 py-20 sm:py-28">
          <div className="max-w-6xl mx-auto px-6">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12"
            >
              <div>
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-semibold mb-4">
                  <BookOpen className="w-3 h-3" /> Base de connaissances
                </span>
                <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-slate-900 dark:text-white tracking-tight mb-2">
                  Catégories médicales
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-base max-w-lg">
                  Explorez les domaines de santé couverts par MediSecours+ et apprenez les gestes qui sauvent.
                </p>
              </div>
              <Link
                href="/categories"
                className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors"
              >
                Voir toutes les catégories
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>

            {loading ? (
              <LoadingSpinner label="Chargement des catégories…" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {categories.map((c) => <CategoryCard key={c.id} category={c} />)}
              </div>
            )}
          </div>
        </section>

        {/* Cas d'urgence fréquents */}
        {(loading || urgences.length > 0) && (
          <section className="bg-white dark:bg-primary-900 py-20 sm:py-28">
            <div className="max-w-6xl mx-auto px-6">
              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12"
              >
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-semibold mb-4">
                    <Siren className="w-3 h-3" /> Situations critiques
                  </span>
                  <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-slate-900 dark:text-white tracking-tight mb-2">
                    Cas d&apos;urgence fréquents
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-base max-w-lg">
                    Les protocoles d&apos;urgence les plus courants, validés par des professionnels de santé.
                  </p>
                </div>
              </motion.div>

              {loading ? (
                <LoadingSpinner label="Chargement des urgences…" />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {urgences.map((m) => <MaladieCard key={m.id} maladie={m} />)}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
