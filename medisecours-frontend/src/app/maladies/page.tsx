'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import api from '../../api/axios'
import SearchBar from '../../components/ui/SearchBar'
import MaladieCard from '../../components/cards/MaladieCard'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import { useDebounce } from '../../hooks/useDebounce'
import { useToast } from '../../components/ui/Toast'
import { SlidersHorizontal } from 'lucide-react'

const GRAVITES = ['LÉGÈRE', 'MODÉRÉE', 'SÉVÈRE', 'CRITIQUE', 'VARIABLE']
const PAGE_SIZE = 9

export default function MaladiesPage() {
  return (
    <Suspense fallback={<LoadingSpinner label="Chargement…" />}>
      <MaladiesContent />
    </Suspense>
  )
}

function MaladiesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('symptomes') || '')
  const [all, setAll] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<any>({ categorie: '', urgence: '', contagieux: '' })
  const debouncedQuery = useDebounce(query, 400)
  const toast = useToast()

  useEffect(() => {
    api.get('/api/categories')
      .then((res: any) => setCategories((res.data?.['hydra:member'] ?? res.data?.member ?? (Array.isArray(res.data) ? res.data : []))))
      .catch(() => {})
  }, [])

  useEffect(() => {
    let active = true
    const url = debouncedQuery
      ? `/api/maladies?symptomes=${encodeURIComponent(debouncedQuery)}`
      : '/api/maladies'
    api.get(url)
      .then((res: any) => {
        if (!active) return
        const raw  = res.data?.['hydra:member'] ?? res.data?.member ?? res.data
        const data = Array.isArray(raw) ? raw : []
        setAll(Array.isArray(data) ? data : [])
        setPage(1)
      })
      .catch(() => toast.error('Impossible de charger les maladies.'))
      .finally(() => active && setLoading(false))
    router.replace(debouncedQuery ? `/maladies?symptomes=${encodeURIComponent(debouncedQuery)}` : '/maladies', { scroll: false })
    return () => { active = false }
  }, [debouncedQuery, router, toast])

  const filtered = useMemo(() => {
    return all.filter((m: any) => {
      if (filters.categorie && String(m.categorie?.id) !== filters.categorie) return false
      if (filters.urgence === 'oui' && !m.urgence) return false
      if (filters.urgence === 'non' && m.urgence) return false
      if (filters.contagieux === 'oui' && !m.contagieux) return false
      if (filters.contagieux === 'non' && m.contagieux) return false
      return true
    })
  }, [all, filters])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="font-display font-bold text-3xl text-primary-900 dark:text-sable mb-2">Maladies & accidents</h1>
      <p className="text-primary-300 mb-6">Recherchez par symptôme et filtrez selon vos besoins.</p>

      <div className="mb-5">
        <SearchBar value={query} onChange={setQuery} />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-8">
        <SlidersHorizontal className="w-4 h-4 text-primary-300" />
        <select
          value={filters.categorie}
          onChange={(e) => setFilters((f: any) => ({ ...f, categorie: e.target.value }))}
          className="px-3 py-1.5 rounded-full text-xs font-semibold bg-primary-100 dark:bg-primary-700 text-primary-700 dark:text-sable border-none focus:outline-none focus:ring-2 focus:ring-mint-500"
        >
          <option value="">Toutes catégories</option>
          {categories.map((c: any) => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
        <select
          value={filters.urgence}
          onChange={(e) => setFilters((f: any) => ({ ...f, urgence: e.target.value }))}
          className="px-3 py-1.5 rounded-full text-xs font-semibold bg-primary-100 dark:bg-primary-700 text-primary-700 dark:text-sable border-none focus:outline-none focus:ring-2 focus:ring-mint-500"
        >
          <option value="">Urgence : indifférent</option>
          <option value="oui">Urgence uniquement</option>
          <option value="non">Sans urgence</option>
        </select>
        <select
          value={filters.contagieux}
          onChange={(e) => setFilters((f: any) => ({ ...f, contagieux: e.target.value }))}
          className="px-3 py-1.5 rounded-full text-xs font-semibold bg-primary-100 dark:bg-primary-700 text-primary-700 dark:text-sable border-none focus:outline-none focus:ring-2 focus:ring-mint-500"
        >
          <option value="">Contagieux : indifférent</option>
          <option value="oui">Contagieux uniquement</option>
          <option value="non">Non contagieux</option>
        </select>
      </div>

      {loading ? (
        <LoadingSpinner label="Recherche en cours…" />
      ) : pageItems.length === 0 ? (
        <EmptyState title="Aucun résultat" description="Essayez un autre symptôme ou modifiez les filtres." />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
            {pageItems.map((m: any) => <MaladieCard key={m.id} maladie={m} />)}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-xl text-sm font-semibold ${p === page ? 'bg-mint-500 text-white' : 'bg-primary-100 dark:bg-primary-700 text-primary-700 dark:text-sable'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
