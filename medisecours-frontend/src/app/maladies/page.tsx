'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import api from '../../api/axios'
import SearchBar from '../../components/ui/SearchBar'
import MaladieCard from '../../components/cards/MaladieCard'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import { useDebounce } from '../../hooks/useDebounce'
import { useToast } from '../../components/ui/Toast'
import { SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react'

const ITEMS_PER_PAGE = 8

const fetcher = (url: string) => api.get(url).then(res => res.data)

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
  const [categories, setCategories] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<any>({ 
    categorie: searchParams.get('categorie') || '', 
    urgence: '', 
    contagieux: '' 
  })
  
  const toast = useToast()

  // Synchro du filtre catégorie avec les paramètres d'URL (ex: depuis la page catégories)
  useEffect(() => {
    const cat = searchParams.get('categorie')
    if (cat !== null) {
      setFilters((prev: any) => ({ ...prev, categorie: cat }))
    }
  }, [searchParams])
  
  const debouncedQuery = useDebounce(query, 400)

  // Chargement des catégories pour le filtre Select
  useEffect(() => {
    let active = true
    api.get('/api/categories')
      .then((res: any) => {
        if (active) {
          setCategories(res.data?.['hydra:member'] ?? res.data?.member ?? (Array.isArray(res.data) ? res.data : []))
        }
      })
      .catch(() => {})
    return () => { active = false }
  }, [])

  // Construction de l'URL SWR dynamique avec pagination et filtres serveur
  let swrKey = `/api/maladies?page=${page}&itemsPerPage=${ITEMS_PER_PAGE}`
  if (debouncedQuery) swrKey += `&symptomes=${encodeURIComponent(debouncedQuery)}`
  if (filters.categorie) swrKey += `&categorie=${filters.categorie}`
  if (filters.urgence === 'oui') swrKey += `&urgence=true`
  if (filters.urgence === 'non') swrKey += `&urgence=false`
  if (filters.contagieux === 'oui') swrKey += `&contagieux=true`
  if (filters.contagieux === 'non') swrKey += `&contagieux=false`

  // Fetch asynchrone avec SWR (délégation complète à PostgreSQL / API Platform)
  const { data, isLoading, error } = useSWR(swrKey, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false
  })

  useEffect(() => {
    if (error) toast.error('Impossible de charger les maladies.')
  }, [error, toast])

  // Mise à jour de l'URL pour garder le partage de liens
  useEffect(() => {
    const newParams = new URLSearchParams()
    if (debouncedQuery) newParams.set('symptomes', debouncedQuery)
    if (filters.categorie) newParams.set('categorie', filters.categorie)
    
    const queryString = newParams.toString()
    router.replace(`/maladies${queryString ? `?${queryString}` : ''}`, { scroll: false })
  }, [debouncedQuery, filters.categorie, router])

  // Remise à la page 1 si on modifie un filtre ou la recherche
  useEffect(() => {
    setPage(1)
  }, [debouncedQuery, filters])

  // Extraction standard Hydra API Platform 4 (avec fallback)
  const maladies = data?.['hydra:member'] ?? data?.member ?? (Array.isArray(data) ? data : [])
  const totalItems = data?.['hydra:totalItems'] ?? data?.totalItems ?? 0
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE))

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

      {isLoading && maladies.length === 0 ? (
        <LoadingSpinner label="Recherche en cours…" />
      ) : maladies.length === 0 ? (
        <EmptyState title="Aucun résultat" description="Essayez un autre symptôme ou modifiez les filtres." />
      ) : (
        <>
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8 transition-opacity duration-200 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
            {maladies.map((m: any) => <MaladieCard key={m.id} maladie={m} />)}
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100 dark:border-white/[0.06]">
              <div>
                {page > 1 && (
                  <button
                    onClick={() => setPage(p => p - 1)}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Précédent
                  </button>
                )}
              </div>

              <span className="text-sm font-medium text-slate-400 dark:text-slate-500">
                Page {page} sur {totalPages}
              </span>

              <div>
                {page < totalPages && (
                  <button
                    onClick={() => setPage(p => p + 1)}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
                  >
                    Suivant <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
