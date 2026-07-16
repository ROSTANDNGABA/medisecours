'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import {
  AlertCircle,
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Flag,
  Search,
  Star,
  Trash2,
  X,
} from 'lucide-react'
import api from '../../../api/axios'
import { fetcher } from '../../../lib/fetcher'
import LoadingSpinner from '../../../components/ui/LoadingSpinner'
import EmptyState from '../../../components/ui/EmptyState'
import Avatar from '../../../components/ui/Avatar'
import Modal from '../../../components/ui/Modal'
import ConfirmModal from '../../../components/ui/ConfirmModal'
import { useToast } from '../../../components/ui/Toast'

const CHART_COLORS = ['#f87171', '#fb923c', '#facc15', '#4ade80', '#22c55e']

export default function AdminAvisPage() {
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterNote, setFilterNote] = useState('')
  const [filterSignale, setFilterSignale] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [sort, setSort] = useState('createdAt')
  const [order, setOrder] = useState('DESC')
  const [selected, setSelected] = useState(new Set())
  const [detailModal, setDetailModal] = useState({ isOpen: false, item: null })
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; avis: any; action: string | null }>({ isOpen: false, avis: null, action: null })
  const [confirmBulkModal, setConfirmBulkModal] = useState<{ isOpen: boolean; action: string | null }>({ isOpen: false, action: null })
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
      setSelected(new Set())
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const handleFilterNoteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterNote(e.target.value)
    setPage(1)
    setSelected(new Set())
  }

  const handleFilterSignaleChange = (value: string) => {
    setFilterSignale(value)
    setPage(1)
    setSelected(new Set())
  }

  const queryParams = new URLSearchParams()
  if (debouncedSearch) queryParams.set('search', debouncedSearch)
  if (filterNote) queryParams.set('note', filterNote)
  if (filterSignale) queryParams.set('signale', filterSignale)
  queryParams.set('page', String(page))
  queryParams.set('limit', String(pageSize))
  queryParams.set('sort', sort)
  queryParams.set('order', order)

  const { data: statsData, error: statsError } = useSWR('/api/admin/avis/stats', fetcher, {
    revalidateOnFocus: true,
  })

  const { data: listData, error: listError, mutate: mutateList } = useSWR(
    `/api/admin/avis/search?${queryParams.toString()}`,
    fetcher,
    { revalidateOnFocus: true }
  )

  const stats = useMemo(() => statsData || {
    total: 0, signales: 0, nonSignales: 0, noteMoyenne: 0,
    tauxSignalement: 0, distribution: [], recentActivity: [],
  }, [statsData])

  const list = useMemo(() => listData || { items: [], total: 0, page: 1, pages: 0 }, [listData])

  const toggleSort = (field: string) => {
    if (sort === field) {
      setOrder((o) => (o === 'DESC' ? 'ASC' : 'DESC'))
    } else {
      setSort(field)
      setOrder('DESC')
    }
  }

  const toggleSelect = (id: any) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === list.items.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(list.items.map((i: any) => i.id)))
    }
  }

  const handleBulkDismiss = async () => {
    setActionLoading(true)
    try {
      const ids = Array.from(selected)
      await Promise.all(
        ids.map((id) =>
          api.patch(
            `/api/avis/${id}`,
            { signale: false, raisonSignalement: null },
            { headers: { 'Content-Type': 'application/merge-patch+json' } }
          )
        )
      )
      toast.success(`${ids.length} signalement(s) levé(s).`)
      setSelected(new Set())
      mutateList()
    } catch {
      toast.error('Échec de l\'opération.')
    } finally {
      setActionLoading(false)
      setConfirmBulkModal({ isOpen: false, action: null })
    }
  }

  const handleBulkDelete = async () => {
    setActionLoading(true)
    try {
      const ids = Array.from(selected)
      await Promise.all(ids.map((id) => api.delete(`/api/avis/${id}`)))
      toast.success(`${ids.length} avis supprimé(s).`)
      setSelected(new Set())
      mutateList()
    } catch {
      toast.error('Échec de l\'opération.')
    } finally {
      setActionLoading(false)
      setConfirmBulkModal({ isOpen: false, action: null })
    }
  }

  const handleAction = async () => {
    const { avis: item, action } = confirmModal
    if (!item || !action) return

    setActionLoading(true)
    try {
      if (action === 'dismiss') {
        await api.patch(
          `/api/avis/${item.id}`,
          { signale: false, raisonSignalement: null },
          { headers: { 'Content-Type': 'application/merge-patch+json' } }
        )
        toast.success('Signalement levé.')
      } else if (action === 'delete') {
        await api.delete(`/api/avis/${item.id}`)
        toast.success('Avis supprimé.')
      }
      mutateList()
    } catch {
      toast.error('Échec de l\'action.')
    } finally {
      setActionLoading(false)
      setConfirmModal({ isOpen: false, avis: null, action: null })
    }
  }

  const exportCsv = useCallback(() => {
    if (!list.items.length) return

    const rows = [
      ['ID', 'Patient', 'Patient Email', 'Médecin', 'Note', 'Commentaire', 'Signalé', 'Raison', 'Date'],
      ...list.items.map((a: any) => [
        a.id,
        `${a.patient?.prenom || ''} ${a.patient?.nom || ''}`,
        a.patient?.email || '',
        `Dr ${a.medecin?.prenom || ''} ${a.medecin?.nom || ''}`,
        a.note,
        `"${(a.commentaire || '').replace(/"/g, '""')}"`,
        a.signale ? 'Oui' : 'Non',
        `"${(a.raisonSignalement || '').replace(/"/g, '""')}"`,
        a.createdAt ? new Date(a.createdAt).toLocaleDateString('fr-FR') : '',
      ]),
    ]

    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `avis-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
    toast.success('Export CSV téléchargé.')
  }, [list.items, toast])

  const renderSortIcon = (field: string) => (
    <ArrowUpDown className={`h-3.5 w-3.5 ml-1 transition ${sort === field ? 'text-[#0f2418]' : 'text-[#bcc5b8]'}`} />
  )

  if (statsError && !statsData) {
    return <div className="p-6 text-red-600">Erreur de chargement des statistiques.</div>
  }

  return (
    <div className="space-y-6">
      {/* Confirm modals */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, avis: null, action: null })}
        onConfirm={handleAction}
        isLoading={actionLoading}
        type={confirmModal.action === 'delete' ? 'danger' : 'success'}
        title={confirmModal.action === 'dismiss' ? 'Lever le signalement ?' : 'Supprimer cet avis ?'}
        message={confirmModal.action === 'dismiss' ? 'Voulez-vous lever le signalement sur cet avis ?' : 'Voulez-vous supprimer définitivement cet avis ?'}
        confirmText={confirmModal.action === 'dismiss' ? 'Lever le signalement' : 'Supprimer'}
      />

      <ConfirmModal
        isOpen={confirmBulkModal.isOpen}
        onClose={() => setConfirmBulkModal({ isOpen: false, action: null })}
        onConfirm={confirmBulkModal.action === 'dismiss' ? handleBulkDismiss : handleBulkDelete}
        isLoading={actionLoading}
        type={confirmBulkModal.action === 'delete' ? 'danger' : 'success'}
        title={confirmBulkModal.action === 'dismiss' ? 'Lever les signalements ?' : 'Supprimer les avis sélectionnés ?'}
        message={`${selected.size} élément(s) sélectionné(s). Cette action est irréversible pour la suppression.`}
        confirmText={confirmBulkModal.action === 'dismiss' ? 'Tout lever' : 'Tout supprimer'}
      />

      {/* Detail modal */}
      <Modal
        isOpen={detailModal.isOpen}
        onClose={() => setDetailModal({ isOpen: false, item: null })}
        title="Détail de l'avis"
        size="lg"
      >
        {detailModal.item && <AvisDetailContent item={detailModal.item} />}
      </Modal>

      {/* Hero + Stats */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-[28px] bg-[linear-gradient(135deg,#09170f_0%,#0f2418_60%,#183626_100%)] p-6 text-white shadow-[0_18px_45px_rgba(15,36,24,0.16)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Moderation</p>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight">Avis & signalements</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/72">
            Supervise la qualité des retours patients, traite les signalements et garde la confiance sur la plateforme.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
          <MetricCard label="Note moyenne" value={stats.noteMoyenne.toFixed(1)} tone="neutral" suffix="/5" />
          <MetricCard label="Signalement" value={`${stats.tauxSignalement}%`} tone={stats.tauxSignalement > 5 ? 'red' : 'amber'} />
          <MetricCard label="Total avis" value={stats.total} tone="neutral" />
          <MetricCard label="À modérer" value={stats.signales} tone={stats.signales > 0 ? 'red' : 'neutral'} />
        </div>
      </section>

      {/* Distribution chart */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr]">
        <div className="rounded-[28px] border border-[#e3e7df] bg-white p-5 shadow-[0_18px_45px_rgba(15,36,24,0.05)] sm:p-6">
          <p className="text-lg font-bold text-[#152116]">Distribution des notes</p>
          {stats.distribution.length > 0 ? (
            <div className="mt-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.distribution} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#edf2ea" />
                  <XAxis dataKey="note" tick={{ fontSize: 13, fill: '#5f6c5d' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#5f6c5d' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 16, border: '1px solid #e2e7de',
                      boxShadow: '0 10px 30px rgba(15,36,24,0.08)',
                    }}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={60}>
                    {stats.distribution.map((_: any, idx: number) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState icon={Star} title="Aucune donnée" description="Pas encore d'avis sur la plateforme." />
            </div>
          )}
        </div>

        {/* Recent flags */}
        <div className="rounded-[28px] border border-[#e3e7df] bg-white p-5 shadow-[0_18px_45px_rgba(15,36,24,0.05)] sm:p-6">
          <p className="text-lg font-bold text-[#152116]">Derniers signalements</p>
          <div className="mt-4 space-y-3">
            {stats.recentActivity?.filter((a: any) => a.signale).slice(0, 4).length > 0 ? (
              stats.recentActivity.filter((a: any) => a.signale).slice(0, 4).map((a: any) => (
                <div key={a.id} className="flex items-center gap-3 rounded-[20px] border border-[#fde8e8] bg-[#fffafa] p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600">
                    <Flag className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#152116] truncate">
                      {a.patientPrenom} {a.patientNom}
                    </p>
                    <p className="text-xs text-[#768172]">Note: {a.note}/5</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-[#768172]">Aucun signalement récent.</p>
            )}
          </div>
        </div>
      </section>

      {/* Filters + Actions */}
      <section className="rounded-[28px] border border-[#e3e7df] bg-white shadow-[0_18px_45px_rgba(15,36,24,0.05)]">
        <div className="flex flex-wrap items-center gap-3 p-5 pb-0 sm:p-6 sm:pb-0">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#768172]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher patient, médecin, commentaire..."
              className="w-full rounded-full border border-[#dfe5db] bg-[#f8faf6] py-2 pl-9 pr-4 text-sm text-[#152116] placeholder:text-[#768172] focus:outline-none focus:ring-2 focus:ring-[#2f6b45]"
            />
          </div>

          {/* Note filter */}
          <select
            value={filterNote}
            onChange={handleFilterNoteChange}
            className="rounded-full border border-[#dfe5db] bg-white px-4 py-2 text-sm font-medium text-[#2b382b] focus:outline-none focus:ring-2 focus:ring-[#2f6b45]"
          >
            <option value="">Toutes les notes</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>{n} étoile{n > 1 ? 's' : ''}</option>
            ))}
          </select>

          {/* Status filter */}
          <div className="flex rounded-full border border-[#dfe5db] bg-[#f8faf6] p-1">
            {[
              { value: '', label: 'Tous' },
              { value: 'true', label: 'Signalés' },
              { value: 'false', label: 'OK' },
            ].map((opt: { value: string; label: string }) => (
              <button
                key={opt.value}
                onClick={() => handleFilterSignaleChange(opt.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  filterSignale === opt.value
                    ? 'bg-[#0f2418] text-white'
                    : 'text-[#677266] hover:bg-[#edf2ea]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Export */}
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-full border border-[#dfe5db] bg-white px-4 py-2 text-sm font-semibold text-[#2b382b] transition hover:bg-[#edf2ea]"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>

        {/* Bulk actions */}
        {selected.size > 0 && (
          <div className="mx-5 sm:mx-6 mt-4 flex items-center gap-3 rounded-[20px] bg-[#f4f6f1] p-3">
            <span className="text-sm font-semibold text-[#152116]">{selected.size} sélectionné(s)</span>
            <button
              onClick={() => setConfirmBulkModal({ isOpen: true, action: 'dismiss' })}
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-200"
            >
              <Check className="h-3.5 w-3.5" /> Lever signalement
            </button>
            <button
              onClick={() => setConfirmBulkModal({ isOpen: true, action: 'delete' })}
              className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-200"
            >
              <Trash2 className="h-3.5 w-3.5" /> Supprimer
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="ml-auto text-sm text-[#768172] hover:text-[#152116]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto px-5 sm:px-6 pb-5 sm:pb-6 mt-4">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e3e7df] text-left text-xs font-semibold uppercase tracking-[0.12em] text-[#7c8778]">
                <th className="py-3 pr-2 w-10">
                  <input
                    type="checkbox"
                    checked={list.items.length > 0 && selected.size === list.items.length}
                    onChange={toggleSelectAll}
                    className="rounded border-[#bfc9bb] text-[#0f2418] focus:ring-[#2f6b45]"
                  />
                </th>
                <th className="py-3 pr-4">Patient</th>
                <th className="py-3 pr-4">Médecin</th>
                <th className="py-3 pr-4 cursor-pointer select-none" onClick={() => toggleSort('note')}>
                  <span className="inline-flex items-center">Note {renderSortIcon('note')}</span>
                </th>
                <th className="py-3 pr-4 hidden md:table-cell">Commentaire</th>
                <th className="py-3 pr-4 hidden lg:table-cell">Statut</th>
                <th className="py-3 pr-4 cursor-pointer select-none hidden sm:table-cell" onClick={() => toggleSort('createdAt')}>
                  <span className="inline-flex items-center">Date {renderSortIcon('createdAt')}</span>
                </th>
                <th className="py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12">
                    <EmptyState icon={Star} title="Aucun avis trouvé" description="Essayez de modifier vos filtres de recherche." />
                  </td>
                </tr>
              ) : (
                list.items.map((item: any) => (
                  <tr key={item.id} className="border-b border-[#edf2ea] hover:bg-[#f8faf6] transition">
                    <td className="py-3 pr-2">
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="rounded border-[#bfc9bb] text-[#0f2418] focus:ring-[#2f6b45]"
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <Avatar name={`${item.patient?.prenom || ''} ${item.patient?.nom || ''}`} size="sm" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#152116] truncate">
                            {item.patient?.prenom} {item.patient?.nom}
                          </p>
                          <p className="text-xs text-[#768172] truncate">{item.patient?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="text-sm font-medium text-[#152116]">
                        Dr {item.medecin?.prenom} {item.medecin?.nom}
                      </p>
                      <p className="text-xs text-[#768172]">{item.medecin?.specialite || ''}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${i <= item.note ? 'text-[#f2b84b]' : 'text-[#d9ddd5]'}`}
                            fill="currentColor"
                          />
                        ))}
                      </div>
                    </td>
                    <td className="py-3 pr-4 hidden md:table-cell">
                      <p className="text-sm text-[#3a493a] truncate max-w-[220px]">
                        {item.commentaire || <span className="italic text-[#768172]">Aucun commentaire</span>}
                      </p>
                    </td>
                    <td className="py-3 pr-4 hidden lg:table-cell">
                      {item.signale ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#fde8e8] px-2.5 py-1 text-xs font-semibold text-[#b44949]">
                          <Flag className="h-3 w-3" /> Signalé
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#e7f5ea] px-2.5 py-1 text-xs font-semibold text-[#2f6b45]">
                          <Check className="h-3 w-3" /> OK
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 hidden sm:table-cell">
                      <p className="text-sm text-[#3a493a]">
                        {new Date(item.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </p>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setDetailModal({ isOpen: true, item })}
                          className="rounded-full p-1.5 text-[#2f6b45] hover:bg-[#edf2ea] transition"
                          title="Détail"
                        >
                          <Search className="h-4 w-4" />
                        </button>
                        {item.signale && (
                          <button
                            onClick={() => setConfirmModal({ isOpen: true, avis: item, action: 'dismiss' })}
                            className="rounded-full p-1.5 text-amber-600 hover:bg-amber-50 transition"
                            title="Lever le signalement"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmModal({ isOpen: true, avis: item, action: 'delete' })}
                          className="rounded-full p-1.5 text-red-500 hover:bg-red-50 transition"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {list.pages > 1 && (
          <div className="flex items-center justify-between border-t border-[#e3e7df] px-5 sm:px-6 py-4">
            <p className="text-sm text-[#768172]">
              {list.total} résultat(s) — Page {list.page}/{list.pages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-full border border-[#dfe5db] p-2 text-[#2b382b] hover:bg-[#edf2ea] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(list.pages, 5) }, (_, i) => {
                const start = Math.max(1, list.page - 2)
                const end = Math.min(list.pages, start + 4)
                const pages = []
                for (let p = start; p <= end; p++) pages.push(p)
                return pages
              }).flat().map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                    p === page ? 'bg-[#0f2418] text-white' : 'text-[#677266] hover:bg-[#edf2ea]'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(list.pages, p + 1))}
                disabled={page >= list.pages}
                className="rounded-full border border-[#dfe5db] p-2 text-[#2b382b] hover:bg-[#edf2ea] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function MetricCard({ label, value, tone = 'neutral', suffix = '' }: { label: string; value: any; tone?: string; suffix?: string }) {
  const tones = {
    neutral: 'bg-white text-[#152116]',
    amber: 'bg-[#fff8e8] text-[#9b6b17]',
    red: 'bg-[#fff1f1] text-[#b44949]',
  }

  return (
    <div className={`rounded-[24px] border border-[#e3e7df] p-5 shadow-[0_18px_45px_rgba(15,36,24,0.05)] ${tones[tone as keyof typeof tones] || tones.neutral}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7c8778]">{label}</p>
      <p className="mt-3 font-display text-3xl font-extrabold tracking-tight">
        {value}<span className="text-lg font-semibold text-[#768172] ml-1">{suffix}</span>
      </p>
    </div>
  )
}

function AvisDetailContent({ item }: { item: any }) {
  return (
    <div className="space-y-6">
      {/* Patient info */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7c8778]">Patient</p>
        <div className="mt-2 flex items-center gap-3">
          <Avatar name={`${item.patient?.prenom || ''} ${item.patient?.nom || ''}`} />
          <div>
            <p className="font-bold text-[#152116]">{item.patient?.prenom} {item.patient?.nom}</p>
            <p className="text-sm text-[#768172]">{item.patient?.email}</p>
            {item.patient?.telephone && <p className="text-sm text-[#768172]">{item.patient.telephone}</p>}
          </div>
        </div>
      </div>

      {/* Doctor info */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7c8778]">Médecin</p>
        <div className="mt-2 flex items-center gap-3">
          <Avatar name={`Dr ${item.medecin?.prenom || ''} ${item.medecin?.nom || ''}`} />
          <div>
            <p className="font-bold text-[#152116]">Dr {item.medecin?.prenom} {item.medecin?.nom}</p>
            {item.medecin?.specialite && <p className="text-sm text-[#768172]">{item.medecin.specialite}</p>}
          </div>
        </div>
      </div>

      {/* Rating */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7c8778]">Note</p>
        <div className="mt-2 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i}
              className={`h-5 w-5 ${i <= item.note ? 'text-[#f2b84b]' : 'text-[#d9ddd5]'}`}
              fill="currentColor"
            />
          ))}
          <span className="ml-2 text-lg font-bold text-[#152116]">{item.note}/5</span>
        </div>
      </div>

      {/* Comment */}
      {item.commentaire && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7c8778]">Commentaire</p>
          <p className="mt-2 rounded-[20px] bg-[#f4f6f1] p-4 text-sm leading-6 text-[#243124]">{item.commentaire}</p>
        </div>
      )}

      {/* Flag reason */}
      {item.signale && item.raisonSignalement && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7c8778]">Motif du signalement</p>
          <div className="mt-2 rounded-[20px] bg-[#fff2f2] px-4 py-3 text-sm text-[#9a5a5a]">
            {item.raisonSignalement}
          </div>
        </div>
      )}

      {/* Status */}
      <div className="flex items-center gap-3 pt-4 border-t border-[#e3e7df]">
        {item.signale ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fde8e8] px-3 py-1.5 text-xs font-semibold text-[#b44949]">
            <Flag className="h-3.5 w-3.5" /> Signalé
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e7f5ea] px-3 py-1.5 text-xs font-semibold text-[#2f6b45]">
            <Check className="h-3.5 w-3.5" /> Avis valide
          </span>
        )}
        <span className="text-xs text-[#768172]">
          Publié le {new Date(item.createdAt).toLocaleDateString('fr-FR', {
            day: 'numeric', month: 'long', year: 'numeric',
          })}
        </span>
      </div>
    </div>
  )
}
