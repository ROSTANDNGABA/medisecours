'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MapPin, ChevronDown, ShieldAlert, Stethoscope, FlaskConical, AlertOctagon } from 'lucide-react'
import { CategoryIcon } from '../../../components/ui/CategoryIcon'
import api from '../../../api/axios'
import GravityBadge from '../../../components/ui/GravityBadge'
import UrgencyBadge from '../../../components/ui/UrgencyBadge'
import LoadingSpinner from '../../../components/ui/LoadingSpinner'
import EmptyState from '../../../components/ui/EmptyState'
import { useToast } from '../../../components/ui/Toast'

const SECTIONS = [
  { key: 'description', label: 'Description', icon: Stethoscope },
  { key: 'symptomes', label: 'Symptômes', icon: AlertOctagon },
  { key: 'causes', label: 'Causes', icon: FlaskConical },
  { key: 'precautions', label: 'Précautions', icon: ShieldAlert },
  { key: 'traitement', label: 'Traitement', icon: Stethoscope },
]

export default function MaladieDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [maladie, setMaladie] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [openSection, setOpenSection] = useState('description')
  const toast = useToast()
  const router = useRouter()

  useEffect(() => {
    let active = true
    api.get(`/api/maladies/${id}`)
      .then((res: any) => active && setMaladie(res.data))
      .catch((err: any) => {
        if (err.response?.status === 404) setNotFound(true)
        else toast.error('Impossible de charger cette fiche.')
      })
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [id, toast])

  if (loading) return <LoadingSpinner label="Chargement de la fiche…" />
  if (notFound || !maladie) {
    return (
      <EmptyState
        title="Fiche introuvable"
        description="Cette maladie n'existe pas ou a été supprimée."
        action={<Link href="/maladies" className="text-mint-500 font-semibold text-sm">← Retour aux maladies</Link>}
      />
    )
  }

  return (
    <div>
      <div className="py-10 px-6" style={{ backgroundColor: `${maladie.categorie?.couleur || '#1E3A5F'}14` }}>
        <div className="max-w-4xl mx-auto">
          <button onClick={() => router.back()} className="inline-flex items-center gap-1 text-sm text-primary-300 hover:text-mint-500 mb-4">
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {maladie.categorie && (
              <span
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: `${maladie.categorie.couleur || '#1E3A5F'}22`, color: maladie.categorie.couleur || '#1E3A5F' }}
              >
                <CategoryIcon iconName={maladie.categorie.icone} categoryName={maladie.categorie.nom} size="sm" />
                {maladie.categorie.nom}
              </span>
            )}
            <GravityBadge level={maladie.niveauGravite} />
            {maladie.urgence && <UrgencyBadge>Urgence</UrgencyBadge>}
            {maladie.contagieux && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">Contagieux</span>
            )}
          </div>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-primary-900 dark:text-sable">{maladie.nom}</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-3">
          {SECTIONS.filter((s) => maladie[s.key]).map(({ key, label, icon: Icon }) => (
            <div key={key} className="rounded-2xl border border-primary-100 dark:border-white/10 bg-white/70 dark:bg-primary-700/40 overflow-hidden">
              <button
                onClick={() => setOpenSection(openSection === key ? '' : key)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
              >
                <span className="flex items-center gap-2 font-semibold text-primary-900 dark:text-sable">
                  <Icon className="w-4 h-4 text-mint-500" /> {label}
                </span>
                <ChevronDown className={`w-4 h-4 text-primary-300 transition-transform ${openSection === key ? 'rotate-180' : ''}`} />
              </button>
              {openSection === key && (
                <div className="px-5 pb-4 text-sm text-primary-300 leading-relaxed">{maladie[key]}</div>
              )}
            </div>
          ))}
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-2xl border-2 border-mint-500/30 bg-mint-100/30 dark:bg-mint-500/10 p-5 sticky top-20">
            <h2 className="font-display font-bold text-lg text-primary-900 dark:text-sable mb-4 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-mint-700" /> Premiers soins
            </h2>
            {maladie.premiersSoins?.length > 0 ? (
              <ol className="space-y-4 mb-5">
                {maladie.premiersSoins.map((ps: any, i: number) => (
                  <li key={ps.id} className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-mint-500 text-white text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                    <div>
                      <p className="font-semibold text-sm text-primary-900 dark:text-sable">{ps.titre}</p>
                      <p className="text-xs text-primary-300 mt-0.5">{ps.description}</p>
                      {ps.niveauUrgence && (
                        <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wide text-mint-700">{ps.niveauUrgence}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-primary-300 mb-5">Aucun geste de premiers soins renseigné pour cette fiche.</p>
            )}

            <Link
              href="/centres"
              className="inline-flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-urgence-500 hover:bg-urgence-700 text-white font-semibold shadow-lg transition"
            >
              <MapPin className="w-4 h-4" /> Trouver un centre de santé proche
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
