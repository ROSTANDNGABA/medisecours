'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import api from '../../../api/axios'
import LoadingSpinner from '../../../components/ui/LoadingSpinner'
import EmptyState from '../../../components/ui/EmptyState'

const PLACEHOLDER_IMG = '/images/placeholder-maladie.svg'

export default function MaladieDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [maladie, setMaladie] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let active = true
    api.get(`/api/maladies/${id}`)
      .then((res: any) => active && setMaladie(res.data))
      .catch((err: any) => {
        if (err.response?.status === 404) setNotFound(true)
      })
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [id])

  if (loading) return <LoadingSpinner label="Chargement du guide…" />
  if (notFound || !maladie) {
    return (
      <div className="pt-20 min-h-screen bg-[#f4f4f4] dark:bg-slate-900">
        <EmptyState
          title="Guide introuvable"
          description="Cet article n'existe pas ou a été retiré."
          action={<Link href="/maladies" className="text-gray-900 dark:text-white font-semibold text-sm underline">← Retour aux guides</Link>}
        />
      </div>
    )
  }

  const imgSrc = maladie.imageUrl || maladie.photo || PLACEHOLDER_IMG
  const premiersSoins: any[] = maladie.premiersSoins ?? []

  return (
    <div className="min-h-screen bg-[#f4f4f4] dark:bg-slate-900 py-12 px-6 transition-colors">
      <div className="max-w-2xl mx-auto">
        
        {/* Navigation retour */}
        <button 
          onClick={() => router.back()} 
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        {/* Grand Titre Éditorial */}
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight mb-8">
          Le Guide Ultime des Premiers Secours : {maladie.nom}
        </h1>

        {/* Image Panoramique */}
        <div className="relative w-full h-72 md:h-80 mb-10 overflow-hidden rounded-3xl shadow-sm">
          <Image
            src={imgSrc}
            alt={maladie.nom}
            fill
            sizes="(max-width: 768px) 100vw, 800px"
            className="object-cover"
            unoptimized
          />
        </div>

        {/* Corps de l'article */}
        <article className="space-y-10">
          
          {/* Description */}
          {maladie.description && (
            <section>
              <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-4">Vue d'ensemble</h2>
              <p className="text-gray-600 dark:text-slate-300 text-sm font-medium leading-relaxed whitespace-pre-line">
                {maladie.description}
              </p>
            </section>
          )}

          {/* Symptômes */}
          {maladie.symptomes && (
            <section>
              <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-4">Ce qu'il faut surveiller :</h2>
              <p className="text-gray-600 dark:text-slate-300 text-sm font-medium leading-relaxed whitespace-pre-line mb-3">
                Identifiez rapidement les signes caractéristiques pour réagir au plus vite.
              </p>
              <ul className="space-y-2">
                {maladie.symptomes.split(',').map((s: string, i: number) => (
                  <li key={i} className="text-gray-600 dark:text-slate-300 text-sm font-medium leading-relaxed flex items-start gap-2">
                    <span className="text-gray-400 dark:text-slate-500 mt-1">•</span>
                    <span>{s.trim()}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Gestes de Premiers Secours (Liste Ordonnée Discrète) */}
          {premiersSoins.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-4">Les Étapes Qui Sauvent :</h2>
              <div className="space-y-6">
                {premiersSoins.map((ps: any, i: number) => (
                  <div key={ps.id ?? i}>
                    <h3 className="text-gray-800 dark:text-slate-200 text-sm font-bold mb-1">
                      Étape {i + 1} : {ps.titre}
                    </h3>
                    <p className="text-gray-600 dark:text-slate-300 text-sm font-medium leading-relaxed whitespace-pre-line">
                      {ps.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Causes */}
          {maladie.causes && (
            <section>
              <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-4">Origines et Causes</h2>
              <p className="text-gray-600 dark:text-slate-300 text-sm font-medium leading-relaxed whitespace-pre-line">
                {maladie.causes}
              </p>
            </section>
          )}

          {/* Précautions */}
          {maladie.precautions && (
            <section>
              <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-4">Précautions à prendre</h2>
              <p className="text-gray-600 dark:text-slate-300 text-sm font-medium leading-relaxed whitespace-pre-line">
                {maladie.precautions}
              </p>
            </section>
          )}

          {/* Traitement */}
          {maladie.traitement && (
            <section>
              <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-4">Traitements médicaux</h2>
              <p className="text-gray-600 dark:text-slate-300 text-sm font-medium leading-relaxed whitespace-pre-line">
                {maladie.traitement}
              </p>
            </section>
          )}

        </article>

        <div className="mt-16 pt-8 border-t border-gray-200 dark:border-white/10">
          <p className="text-xs text-gray-400 dark:text-slate-500 text-center">
            À la fin de ce guide, vous disposez des éléments clairs pour réagir face à l'urgence. En cas de doute, consultez immédiatement un médecin.
          </p>
        </div>

      </div>
    </div>
  )
}
