import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Eye,
  FileCheck2,
  MapPin,
  PhoneCall,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { emergencyCallHref, EMERGENCY_NUMBER, EMERGENCY_NUMBER_LABEL } from '@/config/firstAid'
import type { FirstAidProtocol, FirstAidStep, FirstAidUrgency } from '@/types/firstAid'

const urgencyStyle: Record<FirstAidUrgency, string> = {
  CRITIQUE: 'border-red-300 bg-red-50 text-red-950 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100',
  ELEVE: 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100',
  MOYEN: 'border-blue-300 bg-blue-50 text-blue-950 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100',
  FAIBLE: 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100',
}

function stepPresentation(type: string) {
  const normalized = type.toUpperCase()
  if (normalized === 'RECONNAITRE') {
    return { Icon: Eye, label: 'Reconnaître', className: 'bg-violet-50 text-violet-800 dark:bg-violet-500/10 dark:text-violet-200' }
  }
  if (normalized === 'PROTEGER') {
    return { Icon: ShieldCheck, label: 'Protéger', className: 'bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-slate-200' }
  }
  if (normalized === 'EVITER') {
    return { Icon: Ban, label: 'À éviter', className: 'bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-200' }
  }
  if (normalized === 'APPELER' || normalized === 'ORIENTER') {
    return { Icon: PhoneCall, label: 'Orientation', className: 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200' }
  }
  if (normalized === 'SURVEILLER') {
    return { Icon: Eye, label: 'Surveiller', className: 'bg-blue-50 text-blue-800 dark:bg-blue-500/10 dark:text-blue-200' }
  }
  return { Icon: CheckCircle2, label: 'À faire', className: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200' }
}

function sourceUrl(source: string | null | undefined): string | null {
  return source?.match(/https:\/\/[^\s;]+/i)?.[0] ?? null
}

async function getProtocol(slug: string): Promise<FirstAidProtocol | null> {
  const baseUrl = (
    process.env.API_BASE_URL
    || process.env.NEXT_PUBLIC_API_BASE_URL
    || 'http://127.0.0.1:8000'
  ).replace(/\/$/, '')

  try {
    const response = await fetch(
      `${baseUrl}/api/public/first-aid-protocols/${encodeURIComponent(slug)}`,
      {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      },
    )

    if (!response.ok) return null
    return await response.json() as FirstAidProtocol
  } catch {
    return null
  }
}

export default async function FirstAidDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const protocol = await getProtocol(slug)

  if (!protocol) {
    notFound()
  }

  const url = sourceUrl(protocol.sourceClinique)

  return (
    <main className="mx-auto w-full min-w-0 max-w-5xl overflow-x-clip px-3 py-5 pb-28 sm:px-6 sm:py-8 lg:py-10 lg:pb-10">
      <Link href="/premiers-soins" className="inline-flex min-h-10 max-w-full items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Premiers soins
      </Link>

      <header className={`mt-3 min-w-0 border p-4 sm:mt-5 sm:p-6 ${urgencyStyle[protocol.niveauUrgence]}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase leading-5 opacity-70 sm:text-xs">Protocole de premiers gestes</p>
            <h1 className="mt-2 break-words font-display text-2xl font-bold leading-tight sm:text-3xl [overflow-wrap:anywhere]">{protocol.titre}</h1>
            <div className="mt-3 flex min-w-0 flex-wrap gap-x-2 gap-y-1 text-sm font-medium opacity-80">
              <span className="min-w-0 break-words [overflow-wrap:anywhere]">Population : {protocol.population}</span>
              <span aria-hidden="true">·</span>
              <span>Version {protocol.version}</span>
              {protocol.variantKey && protocol.variantKey !== 'STANDARD' && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Contexte : {protocol.variantKey.toLowerCase().replaceAll('_', ' ')}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col items-start gap-2">
            <span className="w-fit max-w-full break-words bg-white/80 px-3 py-2 text-xs font-black uppercase leading-5 text-slate-950 dark:bg-white/10 dark:text-white">
              Urgence {protocol.niveauUrgence}
            </span>
          </div>
        </div>

        <div className="mt-4 grid min-w-0 grid-cols-[20px_minmax(0,1fr)] gap-3 border-t border-current/15 pt-4 text-sm leading-6 sm:mt-5">
          <PhoneCall className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p className="min-w-0 break-words">
            En cas d&apos;aggravation, de perte de connaissance ou de difficulté respiratoire, contactez immédiatement{' '}
            <a
              href={emergencyCallHref()}
              className="font-black underline decoration-current underline-offset-2"
            >
              {EMERGENCY_NUMBER_LABEL} : {EMERGENCY_NUMBER}
            </a>{' '}
            ou le centre de santé le plus proche.
          </p>
        </div>
      </header>

      <div className="mt-5 grid min-w-0 gap-6 sm:mt-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,300px)]">
        <section className="min-w-0">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3 dark:border-white/10">
            <FileCheck2 className="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
            <h2 className="min-w-0 break-words text-base font-bold text-slate-950 sm:text-lg dark:text-white">Gestes à appliquer</h2>
          </div>
          {protocol.population !== 'TOUS' && (
            <div className="mt-4 grid min-w-0 grid-cols-[20px_minmax(0,1fr)] gap-3 border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-100">
              <Users className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <p className="min-w-0 break-words">
                <strong>Population concernée : {protocol.population.toLowerCase().replaceAll('_', ' ')}.</strong>{' '}
                N&apos;appliquez pas automatiquement les mêmes paramètres à une autre population. Suivez les consignes des secours et les adaptations indiquées dans cette fiche.
              </p>
            </div>
          )}
          <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Suivez les étapes dans l&apos;ordre. En cas de danger, utilisez le haut-parleur du téléphone afin de rester en contact avec les secours pendant les gestes.
          </p>
          <ol className="mt-4 space-y-3">
            {protocol.etapes.map((step: FirstAidStep) => {
              const presentation = stepPresentation(step.type)
              const Icon = presentation.Icon
              return (
                <li key={`${step.position}-${step.instruction}`} className="grid min-w-0 grid-cols-[34px_minmax(0,1fr)] gap-3 border border-slate-200 bg-white p-3 sm:grid-cols-[38px_minmax(0,1fr)] sm:p-4 dark:border-white/10 dark:bg-slate-900">
                  <span className="flex h-8 w-8 items-center justify-center bg-slate-950 text-sm font-black text-white sm:h-9 sm:w-9 dark:bg-white dark:text-slate-950">
                    {step.position}
                  </span>
                  <div className="min-w-0">
                    <span className={`inline-flex max-w-full items-center gap-1.5 px-2 py-1 text-[10px] font-black uppercase leading-4 ${presentation.className}`}>
                      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {presentation.label}
                    </span>
                    {step.titre && (
                      <h3 className="mt-2 min-w-0 break-words font-display text-base font-bold leading-6 text-slate-950 [overflow-wrap:anywhere] dark:text-white sm:text-lg">
                        {step.titre}
                      </h3>
                    )}
                    <p className={`${step.titre ? 'mt-1.5' : 'mt-2'} min-w-0 break-words text-sm leading-6 text-slate-700 [overflow-wrap:anywhere] dark:text-slate-200`}>
                      {step.instruction}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
        </section>

        <aside className="min-w-0 space-y-4">
          {protocol.restrictionsPopulations && (
            <section className="min-w-0 border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 shrink-0 text-slate-600 dark:text-slate-300" aria-hidden="true" />
                <h2 className="font-bold text-slate-950 dark:text-white">Populations spécifiques</h2>
              </div>
              <p className="mt-3 min-w-0 break-words text-sm leading-6 text-slate-700 [overflow-wrap:anywhere] dark:text-slate-200">
                {protocol.restrictionsPopulations}
              </p>
            </section>
          )}

          <section className="min-w-0 border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <Clock3 className="h-5 w-5 shrink-0 text-slate-600 dark:text-slate-300" aria-hidden="true" />
              <h2 className="font-bold text-slate-950 dark:text-white">Source clinique</h2>
            </div>
            <p className="mt-3 min-w-0 break-words text-xs leading-5 text-slate-600 [overflow-wrap:anywhere] dark:text-slate-300">{protocol.sourceClinique}</p>
            {url && (
              <a href={url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex max-w-full items-center gap-1.5 break-words text-xs font-bold text-emerald-700 hover:underline dark:text-emerald-300">
                Consulter la source
                <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              </a>
            )}
          </section>

          <div className="grid gap-2">
            <Link href="/maladies" className="inline-flex min-h-11 min-w-0 items-center justify-between gap-3 bg-slate-950 px-4 py-3 text-sm font-bold text-white dark:bg-emerald-600">
              <span className="min-w-0 break-words">Vérifier des symptômes</span>
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </Link>
            <Link href="/centres" className="inline-flex min-h-11 min-w-0 items-center justify-between gap-3 border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 dark:border-white/10 dark:bg-slate-900 dark:text-white">
              <span className="min-w-0 break-words">Trouver un centre</span>
              <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            </Link>
          </div>
        </aside>
      </div>

      <p className="mt-8 border-t border-slate-200 pt-5 text-xs leading-5 text-slate-500 dark:border-white/10 dark:text-slate-400">
        Ces gestes servent à orienter l&apos;action immédiate en attendant une prise en charge. Ils ne constituent pas un diagnostic et ne remplacent pas l&apos;avis d&apos;un professionnel de santé.
      </p>
    </main>
  )
}
