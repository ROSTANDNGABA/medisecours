'use client'

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import {
  Archive,
  BookOpenCheck,
  ClipboardList,
  ExternalLink,
  Eye,
  History,
  Loader2,
  Search,
} from 'lucide-react'
import {
  createNextProtocolVersion,
  getAdminProtocols,
  getProtocolObservability,
  getProtocolVersions,
  updateProtocolStatus,
} from '@/api/admin'

type ProtocolStatus = 'BROUILLON' | 'EN_REVUE' | 'PUBLIE' | 'RETIRE'
type StatusFilter = 'TOUS' | ProtocolStatus

interface ProtocolStep {
  id: number
  position: number
  type: string
  titre?: string | null
  instruction: string
}

interface Protocol {
  id: number
  slug: string
  titre: string
  statut: ProtocolStatus
  niveauUrgence: string
  population: string
  version: string
  categorie?: string | null
  sourceClinique: string | null
  etapes: ProtocolStep[]
}

interface Observability {
  consultations: Array<{ slug: string; version: string; vues: number; dernier: string }>
  recherches: Array<{ jour: string; total: number; avecResultat: number; sansResultat: number }>
}

interface AdminProtocolResponse {
  items: Protocol[]
  pagination: {
    page: number
    itemsPerPage: number
    total: number
    totalPages: number
  }
  counts: {
    total: number
    visible: number
    draft: number
    retired: number
  }
}

const ADMIN_PAGE_SIZE = 12

const statusStyle: Record<ProtocolStatus, string> = {
  BROUILLON: 'bg-slate-100 text-slate-700',
  EN_REVUE: 'bg-blue-100 text-blue-800',
  PUBLIE: 'bg-emerald-100 text-emerald-800',
  RETIRE: 'bg-rose-100 text-rose-800',
}

const statusLabel: Record<ProtocolStatus, string> = {
  BROUILLON: 'Brouillon',
  EN_REVUE: 'À compléter',
  PUBLIE: 'Visible',
  RETIRE: 'Retiré',
}

export default function AdminProtocolsPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [filter, setFilter] = useState<StatusFilter>('TOUS')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [source, setSource] = useState('')
  const [page, setPage] = useState(1)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const { data, error, isLoading, mutate } = useSWR<AdminProtocolResponse>(
    ['admin-protocols', page, debouncedQuery, filter],
    async () => (
      await getAdminProtocols({
        page,
        itemsPerPage: ADMIN_PAGE_SIZE,
        q: debouncedQuery || undefined,
        status: filter === 'TOUS' ? undefined : filter,
      })
    ).data,
    { keepPreviousData: true },
  )

  const protocols = useMemo(() => data?.items ?? [], [data?.items])
  const selected = protocols.find((protocol) => protocol.id === selectedId) ?? protocols[0] ?? null

  const { data: versions = [], mutate: mutateVersions } = useSWR(
    selected ? ['protocol-versions', selected.slug] : null,
    async ([, slug]: [string, string]) => (await getProtocolVersions(slug)).data as Protocol[],
  )
  const { data: observability, mutate: mutateObservability } = useSWR<Observability>(
    'protocol-observability',
    async () => (await getProtocolObservability()).data as Observability,
  )

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    if (!selected) return
    const timer = window.setTimeout(() => {
      setSource(selected.sourceClinique ?? '')
      setFeedback(null)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [selected])

  const refresh = async () => {
    await Promise.all([mutate(), mutateVersions(), mutateObservability()])
  }

  const runAction = async (key: string, action: () => Promise<unknown>, successMessage: string) => {
    setBusyAction(key)
    setFeedback(null)
    try {
      await action()
      await refresh()
      setFeedback({ type: 'success', message: successMessage })
    } catch (requestError: unknown) {
      const message =
        typeof requestError === 'object' &&
        requestError !== null &&
        'response' in requestError
          ? ((requestError as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Action refusée.')
          : 'Action refusée.'
      setFeedback({ type: 'error', message })
    } finally {
      setBusyAction(null)
    }
  }

  const changeStatus = (status: ProtocolStatus) => {
    if (!selected) return
    const messages: Record<ProtocolStatus, string> = {
      BROUILLON: 'La fiche est enregistrée comme brouillon.',
      EN_REVUE: 'La fiche est marquée comme à compléter.',
      PUBLIE: 'La fiche est maintenant visible dans le catalogue.',
      RETIRE: 'La fiche a été retirée du catalogue public.',
    }
    void runAction(
      `status-${status}`,
      () => updateProtocolStatus(selected.id, { statut: status, sourceClinique: source }),
      messages[status],
    )
  }

  const createNextVersion = () => {
    if (!selected) return
    void runAction(
      'next-version',
      () => createNextProtocolVersion(selected.id),
      'Une nouvelle version a été créée en brouillon.',
    )
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center text-[#526052]">
        <Loader2 className="mr-3 h-5 w-5 animate-spin" />
        Chargement des protocoles
      </div>
    )
  }

  if (error) {
    return <div className="border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Impossible de charger les protocoles.</div>
  }

  const counts = data?.counts ?? { total: 0, visible: 0, draft: 0, retired: 0 }
  const totalPages = data?.pagination.totalPages ?? 1
  const effectivePage = data?.pagination.page ?? page

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-[#dfe5db] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase text-[#718071]">Gestion des contenus</p>
          <h1 className="mt-1 text-2xl font-bold text-[#172216]">Protocoles de premiers secours</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5f6d5f]">
            Organisez les fiches, leurs versions et leur visibilité dans le catalogue.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['Total', counts.total],
            ['Visibles', counts.visible],
            ['Brouillons', counts.draft],
            ['Retirés', counts.retired],
          ].map(([label, value]) => (
            <div key={label} className="min-w-[105px] border border-[#dde4da] bg-white px-3 py-2">
              <p className="text-[11px] font-medium text-[#778276]">{label}</p>
              <p className="text-lg font-bold text-[#172216]">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid min-h-[680px] gap-4 xl:grid-cols-[350px_minmax(0,1fr)]">
        <aside className="border border-[#dde4da] bg-white">
          <div className="border-b border-[#e5e9e2] p-3">
            <label className="flex items-center gap-2 border border-[#dfe5dc] bg-[#f8faf7] px-3">
              <Search className="h-4 w-4 text-[#778276]" />
              <span className="sr-only">Rechercher un protocole</span>
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setPage(1)
                }}
                placeholder="Rechercher un protocole"
                className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </label>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(['TOUS', 'BROUILLON', 'EN_REVUE', 'PUBLIE', 'RETIRE'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setFilter(value)
                    setPage(1)
                  }}
                  className={`px-2.5 py-1.5 text-xs font-semibold ${
                    filter === value ? 'bg-[#15271a] text-white' : 'bg-[#edf1eb] text-[#566356]'
                  }`}
                >
                  {value === 'TOUS' ? 'Tous' : statusLabel[value]}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[620px] overflow-y-auto">
            {protocols.map((protocol) => (
              <button
                key={protocol.id}
                type="button"
                onClick={() => setSelectedId(protocol.id)}
                className={`w-full border-b border-[#edf0eb] px-4 py-4 text-left transition ${
                  selected?.id === protocol.id ? 'bg-[#eef4ec]' : 'hover:bg-[#f8faf7]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#172216]">{protocol.titre}</p>
                    <p className="mt-1 text-xs text-[#7a8578]">v{protocol.version} · {protocol.niveauUrgence}</p>
                  </div>
                  {protocol.statut === 'RETIRE'
                    ? <Archive className="h-5 w-5 shrink-0 text-rose-600" />
                    : <Eye className="h-5 w-5 shrink-0 text-emerald-600" />}
                </div>
                <span className={`mt-3 inline-block px-2 py-1 text-[10px] font-bold ${statusStyle[protocol.statut]}`}>
                  {statusLabel[protocol.statut]}
                </span>
              </button>
            ))}
          </div>

          {totalPages > 1 && (
            <nav className="flex items-center justify-between gap-2 border-t border-[#e5e9e2] p-3" aria-label="Pagination">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={effectivePage <= 1}
                className="min-h-10 border border-[#d5ddd2] bg-white px-3 text-xs font-bold disabled:opacity-40"
              >
                Précédent
              </button>
              <span className="text-xs font-semibold text-[#667365]">{effectivePage} / {totalPages}</span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={effectivePage >= totalPages}
                className="min-h-10 border border-[#d5ddd2] bg-white px-3 text-xs font-bold disabled:opacity-40"
              >
                Suivant
              </button>
            </nav>
          )}
        </aside>

        {selected && (
          <div className="space-y-4">
            <section className="border border-[#dde4da] bg-white p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-[#416f49]" />
                    <h2 className="text-xl font-bold text-[#172216]">{selected.titre}</h2>
                  </div>
                  <p className="mt-1 text-xs text-[#778276]">
                    {selected.slug} · version {selected.version} · {selected.population}
                  </p>
                </div>
                <span className={`w-fit px-3 py-1.5 text-xs font-bold ${statusStyle[selected.statut]}`}>
                  {statusLabel[selected.statut]}
                </span>
              </div>

              <label className="mt-5 block text-sm font-semibold text-[#344134]">
                Références documentaires
                <textarea
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                  rows={4}
                  className="mt-2 w-full border border-[#d8e0d5] bg-[#fbfcfa] p-3 text-sm font-normal outline-none focus:border-[#4f7b56]"
                />
              </label>

              {feedback && (
                <div className={`mt-4 p-3 text-sm ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                  {feedback.message}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <ActionButton
                  icon={Eye}
                  label="Rendre visible"
                  busy={busyAction === 'status-PUBLIE'}
                  onClick={() => changeStatus('PUBLIE')}
                  tone="success"
                />
                <ActionButton
                  icon={ClipboardList}
                  label="Mettre en brouillon"
                  busy={busyAction === 'status-BROUILLON'}
                  onClick={() => changeStatus('BROUILLON')}
                />
                <ActionButton
                  icon={Archive}
                  label="Retirer"
                  busy={busyAction === 'status-RETIRE'}
                  onClick={() => changeStatus('RETIRE')}
                  tone="danger"
                />
                <ActionButton
                  icon={History}
                  label="Créer une version"
                  busy={busyAction === 'next-version'}
                  onClick={createNextVersion}
                />
              </div>
            </section>

            <section className="border border-[#dde4da] bg-white p-5">
              <div className="flex items-center gap-2">
                <BookOpenCheck className="h-5 w-5 text-[#416f49]" />
                <h3 className="font-bold text-[#172216]">Étapes de la fiche</h3>
              </div>
              <div className="mt-4 divide-y divide-[#e8ece5] border border-[#e0e6dd]">
                {selected.etapes.map((step) => (
                  <div key={step.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[110px_1fr]">
                    <span className="text-xs font-bold text-[#4e6d52]">{step.position}. {step.type}</span>
                    <div>
                      {step.titre && <p className="text-sm font-bold text-[#253225]">{step.titre}</p>}
                      <p className="text-sm leading-6 text-[#354235]">{step.instruction}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="border border-[#dde4da] bg-white p-5">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-[#416f49]" />
                <h3 className="font-bold text-[#172216]">Versions</h3>
              </div>
              <div className="mt-4 divide-y divide-[#e8ece5]">
                {versions.map((version) => (
                  <div key={`${version.id}-${version.version}`} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="text-sm font-semibold text-[#253225]">Version {version.version}</p>
                      <p className="mt-0.5 text-xs text-[#778276]">{statusLabel[version.statut]}</p>
                    </div>
                    <span className={`px-2 py-1 text-[10px] font-bold ${statusStyle[version.statut]}`}>
                      {version.version}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="border border-[#dde4da] bg-white p-5">
              <div className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5 text-[#416f49]" />
                <h3 className="font-bold text-[#172216]">Utilisation du catalogue</h3>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-bold uppercase text-[#778276]">Fiches consultées</p>
                  <div className="mt-2 space-y-2">
                    {(observability?.consultations ?? []).slice(0, 6).map((row) => (
                      <div key={`${row.slug}-${row.version}`} className="flex items-center justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate text-[#354235]">{row.slug}</span>
                        <span className="shrink-0 font-bold text-[#253225]">{row.vues} vues</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-[#778276]">Recherches</p>
                  <div className="mt-2 space-y-2">
                    {(observability?.recherches ?? []).slice(0, 6).map((row) => (
                      <div key={row.jour} className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-[#354235]">{new Date(row.jour).toLocaleDateString('fr-FR')}</span>
                        <span className="shrink-0 text-[#253225]">{row.total} requêtes</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  busy,
  tone = 'neutral',
}: {
  icon: typeof Eye
  label: string
  onClick: () => void
  busy: boolean
  tone?: 'neutral' | 'success' | 'danger'
}) {
  const tones = {
    neutral: 'border border-[#d5ddd2] bg-white text-[#344134] hover:bg-[#f1f5ef]',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700',
    danger: 'border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`inline-flex h-10 items-center gap-2 px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${tones[tone]}`}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {label}
    </button>
  )
}
