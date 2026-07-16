'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import api from '../../api/axios'
import CategoryCard from '../../components/cards/CategoryCard'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/Toast'
import { LayoutGrid } from 'lucide-react'

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  useEffect(() => {
    let active = true
    api.get('/api/categories')
      .then((res: any) => {
        if (!active) return
        const raw = res.data?.['hydra:member'] ?? res.data?.member ?? res.data
        setCategories(Array.isArray(raw) ? raw : [])
      })
      .catch(() => toast.error('Impossible de charger les categories.'))
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [toast])

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <div className="flex items-center gap-3 mb-3">
        <LayoutGrid className="w-8 h-8 text-mint-500" />
        <h1 className="font-display font-bold text-4xl text-primary-900 dark:text-sable">Categories medicales</h1>
      </div>
      <p className="text-primary-400 dark:text-primary-300 text-lg mb-12">Parcourez les domaines de sante couverts par MediSecours+.</p>
      {loading ? (
        <LoadingSpinner label="Chargement des categories..." />
      ) : categories.length === 0 ? (
        <EmptyState title="Aucune categorie disponible" description="Revenez plus tard." />
      ) : (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {categories.map((c: any) => (
            <motion.div
              key={c.id}
              variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}
            >
              <CategoryCard category={c} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
