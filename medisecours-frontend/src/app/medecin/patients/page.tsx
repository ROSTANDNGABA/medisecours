// @ts-nocheck
'use client'

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { Users, Phone, Mail, MessageSquare, CalendarClock, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { fetcher } from '../../../lib/fetcher'
import LoadingSpinner from '../../../components/ui/LoadingSpinner'
import EmptyState from '../../../components/ui/EmptyState'
import Avatar from '../../../components/ui/Avatar'
import { useToast } from '../../../components/ui/Toast'

function idFromIri(value) {
  if (!value) return null
  if (typeof value === 'object') return value.id
  return value.split('/').pop()
}

export default function MedecinPatientsPage() {
  const toast = useToast()
  const { data, isLoading, error } = useSWR('/api/consultations', fetcher, { revalidateOnFocus: false })
  const consultations = useMemo(() => (Array.isArray(data) ? data : []), [data])

  const [search, setSearch] = useState('')
  const [selectedPatient, setSelectedPatient] = useState(null)

  useEffect(() => {
    if (error) toast.error('Impossible de charger la liste des patients.')
  }, [error, toast])

  const patientMap = useMemo(() => {
    const map = new Map()
    for (const c of consultations) {
      const p = c.patient
      if (!p || !p.id) continue
      const existing = map.get(p.id) || { ...p, consultations: [] }
      existing.consultations.push(c)
      existing.derniereConsultation = existing.derniereConsultation
        ? new Date(c.createdAt) > new Date(existing.derniereConsultation) ? c.createdAt : existing.derniereConsultation
        : c.createdAt
      map.set(p.id, existing)
    }
    return map
  }, [consultations])

  const patients = useMemo(() => {
    const list = Array.from(patientMap.values())
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(
      (p) =>
        `${p.prenom} ${p.nom}`.toLowerCase().includes(q) ||
        p.telephone?.includes(q) ||
        p.email?.toLowerCase().includes(q)
    )
  }, [patientMap, search])

  const filteredConsults = useMemo(() => {
    if (!selectedPatient) return []
    const list = selectedPatient.consultations
    return [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [selectedPatient])

  if (isLoading) return <LoadingSpinner label="Chargement des patients…" />

  return (
    <div className="h-[calc(100vh-4rem)]">
      <div className="grid grid-cols-1 md:grid-cols-3 h-full border-t border-primary-100 dark:border-white/5">
        <div className={`md:col-span-1 border-r border-primary-100 dark:border-white/5 bg-white/70 dark:bg-primary-800/40 flex flex-col ${selectedPatient ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-primary-100 dark:border-white/5">
            <h2 className="font-display font-bold text-primary-900 dark:text-sable mb-3">Mes Patients</h2>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un patient…"
              className="w-full px-3.5 py-2 rounded-xl border border-primary-100 dark:border-white/10 bg-white dark:bg-primary-900/60 focus:outline-none focus:ring-2 focus:ring-mint-500 text-sm"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {patients.length === 0 ? (
              <EmptyState icon={Users} title="Aucun patient" description="Les patients ayant consulté apparaîtront ici." />
            ) : (
              patients.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPatient(p)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-primary-50 dark:hover:bg-primary-900/40 ${selectedPatient?.id === p.id ? 'bg-primary-100/70 dark:bg-primary-900/60' : ''}`}
                >
                  <Avatar name={`${p.prenom || ''} ${p.nom || ''}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-primary-900 dark:text-sable truncate">{p.prenom} {p.nom}</p>
                    <p className="text-xs text-primary-300 truncate">{p.consultations.length} consultation(s)</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-primary-300 rotate-[-90deg]" />
                </button>
              ))
            )}
          </div>
        </div>

        <div className={`md:col-span-2 flex flex-col bg-sable dark:bg-primary-900 ${selectedPatient ? 'flex' : 'hidden md:flex'}`}>
          {selectedPatient ? (
            <>
              <div className="flex items-center gap-3 p-4 border-b border-primary-100 dark:border-white/5 bg-white/70 dark:bg-primary-800/40">
                <button className="md:hidden" onClick={() => setSelectedPatient(null)}>
                  <ChevronDown className="w-5 h-5 text-primary-500 rotate-90" />
                </button>
                <Avatar name={`${selectedPatient.prenom || ''} ${selectedPatient.nom || ''}`} size="lg" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-primary-900 dark:text-sable">{selectedPatient.prenom} {selectedPatient.nom}</p>
                  <div className="flex items-center gap-3 text-xs text-primary-300 mt-0.5">
                    {selectedPatient.telephone && (
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {selectedPatient.telephone}</span>
                    )}
                    {selectedPatient.email && (
                      <span className="flex items-center gap-1 truncate"><Mail className="w-3 h-3" /> {selectedPatient.email}</span>
                    )}
                  </div>
                </div>
                <Link
                  href={`/medecin/messages?patient=${selectedPatient.id}`}
                  className="p-2.5 rounded-xl bg-mint-500 text-white hover:bg-mint-700"
                  title="Envoyer un message"
                >
                  <MessageSquare className="w-4 h-4" />
                </Link>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <h3 className="text-sm font-semibold text-primary-700 dark:text-sable flex items-center gap-2">
                  <CalendarClock className="w-4 h-4" /> Historique des consultations
                </h3>
                {filteredConsults.length === 0 ? (
                  <p className="text-sm text-primary-300 text-center py-8">Aucune consultation</p>
                ) : (
                  filteredConsults.map((c) => (
                    <div key={c.id} className="rounded-2xl bg-white dark:bg-primary-800 border border-primary-100 dark:border-white/5 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          c.statut === 'TERMINEE' ? 'bg-gray-100 text-gray-600' :
                          c.statut === 'EN_COURS' ? 'bg-emerald-100 text-emerald-700' :
                          c.statut === 'ANNULEE' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {c.statut === 'OUVERTE' ? 'Ouverte' :
                           c.statut === 'EN_COURS' ? 'En cours' :
                           c.statut === 'TERMINEE' ? 'Terminée' :
                           c.statut === 'ANNULEE' ? 'Annulée' : c.statut}
                        </span>
                        <span className="text-xs text-primary-300">
                          {new Date(c.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-sm text-primary-700 dark:text-sable">{c.motif || 'Motif non précisé'}</p>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <EmptyState icon={Users} title="Sélectionnez un patient" description="Choisissez un patient dans la liste pour voir ses consultations." />
          )}
        </div>
      </div>
    </div>
  )
}
