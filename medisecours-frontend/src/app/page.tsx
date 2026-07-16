'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { LifeBuoy, MapPin, Siren, ShieldCheck } from 'lucide-react'
import api from '../api/axios'
import SearchBar from '../components/ui/SearchBar'
import CategoryCard from '../components/cards/CategoryCard'
import MaladieCard from '../components/cards/MaladieCard'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { useGeolocation } from '../hooks/useGeolocation'
import { useToast } from '../components/ui/Toast'

function extractArray(res: any) {
  const raw = res.data?.['hydra:member'] ?? res.data?.member ?? res.data
  return Array.isArray(raw) ? raw : []
}

export default function Home() {
  const [query,      setQuery]      = useState('')
  const [categories, setCategories] = useState<any[]>([])
  const [urgences,   setUrgences]   = useState<any[]>([])
  const [loading,    setLoading]    = useState(true)
  const router = useRouter()
  const { locate, loading: locating } = useGeolocation()
  const toast = useToast()

  useEffect(() => {
    let active = true
    Promise.all([
      api.get('/api/categories'),
      api.get('/api/maladies'),
    ])
      .then(([catRes, malRes]) => {
        if (!active) return
        const cats = extractArray(catRes)
        const mals = extractArray(malRes)
        setCategories(cats.slice(0, 6))
        setUrgences(mals.filter((m) => m.urgence).slice(0, 4))
      })
      .catch(() => toast.error('Impossible de charger les données. Vérifiez la connexion au serveur.'))
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) router.push(`/maladies?symptomes=${encodeURIComponent(query.trim())}`)
  }

  const handleLocate = () => {
    locate()
    router.push('/centres')
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-linear-to-br from-primary-500 via-primary-700 to-primary-900">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, #10B981 0%, transparent 35%), radial-gradient(circle at 80% 60%, #EF4444 0%, transparent 30%)' }} />
        <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-24 sm:pt-28 sm:pb-32 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-mint-100 text-xs font-semibold mb-6"
          >
            <Siren className="w-3.5 h-3.5 text-urgence-500" /> Plateforme médicale d&apos;urgence — Cameroun
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display font-extrabold text-4xl sm:text-6xl text-white leading-tight mb-5"
          >
            Les premiers gestes <span className="text-mint-500">qui sauvent</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-primary-100 text-base sm:text-lg max-w-xl mx-auto mb-8"
          >
            Trouvez instantanément les gestes de premiers soins, le centre de santé le plus proche, et un médecin disponible.
          </motion.p>

          <motion.form
            onSubmit={handleSearch}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="max-w-lg mx-auto mb-6"
          >
            <SearchBar value={query} onChange={setQuery} size="lg" placeholder="Ex : fièvre, douleur thoracique, brûlure…" />
          </motion.form>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-3"
          >
            <Link href="/maladies" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-mint-500 hover:bg-mint-700 text-white font-semibold shadow-xl transition">
              <LifeBuoy className="w-5 h-5" /> Commencer
            </Link>
            <button
              onClick={handleLocate}
              disabled={locating}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold backdrop-blur-md transition disabled:opacity-60"
            >
              <MapPin className="w-5 h-5" /> {locating ? 'Localisation…' : 'Centres de santé proches'}
            </button>
          </motion.div>
        </div>
      </section>

      {/* Catégories */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-primary-900 dark:text-sable">Catégories médicales</h2>
            <p className="text-primary-300 text-sm mt-1">Explorez les domaines de santé couverts par MediSecours+</p>
          </div>
          <Link href="/categories" className="hidden sm:inline text-sm font-semibold text-mint-500 hover:text-mint-700">
            Voir tout →
          </Link>
        </div>
        {loading ? <LoadingSpinner label="Chargement des catégories…" /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {categories.map((c) => <CategoryCard key={c.id} category={c} />)}
          </div>
        )}
      </section>

      {/* Urgences */}
      {(loading || urgences.length > 0) && (
        <section className="bg-urgence-100/40 dark:bg-urgence-900/10 py-16">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-center gap-2 mb-8">
              <Siren className="w-6 h-6 text-urgence-500" />
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-primary-900 dark:text-sable">Cas d&apos;urgence fréquents</h2>
            </div>
            {loading ? <LoadingSpinner /> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {urgences.map((m) => <MaladieCard key={m.id} maladie={m} />)}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Trust strip */}
      <section className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { icon: ShieldCheck, title: 'Gestes vérifiés',      desc: 'Protocoles validés par des médecins.' },
          { icon: MapPin,      title: 'Centres géolocalisés', desc: 'Le centre de santé le plus proche, en un clic.' },
          { icon: LifeBuoy,    title: 'Médecins disponibles', desc: 'Messagerie directe avec des professionnels.' },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-2xl p-6 bg-white/70 dark:bg-primary-700/40 border border-white/50 dark:border-white/10 shadow-lg">
            <Icon className="w-7 h-7 text-mint-500 mb-3" />
            <h3 className="font-display font-semibold text-primary-900 dark:text-sable mb-1">{title}</h3>
            <p className="text-sm text-primary-300">{desc}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
