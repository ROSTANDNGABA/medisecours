// @ts-nocheck
'use client'

import { useMemo, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Phone, Mail, MessageSquare, Stethoscope, Droplets, AlertTriangle, ChevronRight, Calendar, Clock, User, Shield, HeartPulse, FileText } from 'lucide-react'
import useSWR from 'swr'
import { useAuth } from '../../../hooks/useAuth'
import LoadingSpinner from '../../../components/ui/LoadingSpinner'
import Avatar from '../../../components/ui/Avatar'
import { imgUrl } from '../../../lib/config'
import { fetcher } from '../../../lib/fetcher'
import {
  STATUT_BADGE_BORDER as STATUT_BADGE,
  STATUT_CONSULTATION_LABEL as STATUT_LABEL,
} from '../../../lib/consultations'
import { CONSULTATIONS_KEY, PATIENTS_KEY } from '../../../lib/keys'
import { idStrFromRelation } from '../../../types/api'

export default function MedecinPatientsPage() {
  const { user } = useAuth()
  const router = useRouter()
  // M3 corrigé : clés SWR centralisées (cache mutualisé avec les autres pages).
  const { data: patients = [], isLoading } = useSWR(PATIENTS_KEY, fetcher, { keepPreviousData: true })
  const { data: consultations = [] } = useSWR(CONSULTATIONS_KEY, fetcher)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const filteredPatients = useMemo(() => {
    if (!search.trim()) return patients
    const q = search.toLowerCase()
    return patients.filter((p) =>
      `${p.prenom || ''} ${p.nom || ''}`.toLowerCase().includes(q) ||
      p.telephone?.includes(q) ||
      p.email?.toLowerCase().includes(q)
    )
  }, [patients, search])

  const selectedPatient = useMemo(() => {
    if (!selectedId) return null
    return patients.find((p) => p.id === selectedId) || null
  }, [patients, selectedId])

  const patientConsults = useMemo(() => {
    if (!selectedPatient) return []
    return consultations
      .filter((c) => idStrFromRelation(c.patient) === String(selectedPatient.id))
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
  }, [consultations, selectedPatient])

  const lastConsult = patientConsults[0] || null



  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* ── Left Panel: Patient List ── */}
      <div className="w-[340px] shrink-0 border-r border-[#E5E7EB] bg-white flex flex-col">
        <div className="p-4 border-b border-[#E5E7EB]">
          <h2 className="text-sm font-bold text-[#0F2C52] mb-3">Patients</h2>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, téléphone…"
              className="w-full rounded-xl bg-[#F3F4F6] py-2 pl-9 pr-3 text-sm text-[#374151] placeholder-[#9CA3AF] outline-none transition focus:bg-white focus:ring-2 focus:ring-[#3B6EF8]/20"
            />
          </div>
        </div>
        <div ref={listRef} className="flex-1 overflow-y-auto">
          {filteredPatients.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <User className="h-10 w-10 text-[#D1D5DB] mb-3" />
              <p className="text-sm font-medium text-[#6B7280]">
                {search ? 'Aucun patient trouvé' : 'Aucun patient'}
              </p>
              <p className="text-xs text-[#9CA3AF] mt-1">
                {search ? 'Essayez un autre terme' : 'Les patients apparaîtront ici'}
              </p>
            </div>
          ) : (
            filteredPatients.map((p) => {
              const consCount = consultations.filter((c) => idStrFromRelation(c.patient) === String(p.id)).length
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition border-b border-[#F3F4F6] last:border-0 hover:bg-[#F9FAFB] ${
                    selectedId === p.id ? 'bg-[#EFF6FF] border-l-2 border-l-[#3B6EF8]' : ''
                  }`}
                >
                  <Avatar
                    name={`${p.prenom || ''} ${p.nom || ''}`.trim()}
                    size="sm"
                    src={imgUrl(p.photoProfil)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${selectedId === p.id ? 'font-bold text-[#0F2C52]' : 'font-semibold text-[#374151]'}`}>
                      {p.prenom} {p.nom}
                    </p>
                    <p className="text-[11px] text-[#9CA3AF] truncate">
                      {p.telephone || p.email || '—'}
                    </p>
                    {consCount > 0 && (
                      <p className="text-[10px] text-[#3B6EF8] mt-0.5">{consCount} consultation(s)</p>
                    )}
                  </div>
                  <ChevronRight className={`h-4 w-4 ${selectedId === p.id ? 'text-[#3B6EF8]' : 'text-[#D1D5DB]'}`} />
                </button>
              )
            })
          )}
        </div>
        <div className="p-3 border-t border-[#E5E7EB] text-center text-[10px] text-[#9CA3AF]">
          {patients.length} patient(s) · {filteredPatients.length} affiché(s)
        </div>
      </div>

      {/* ── Right Panel: Patient Profile ── */}
      <div className="flex-1 bg-[#F8F9FD] overflow-y-auto">
        {selectedPatient ? (
          <div className="p-6 max-w-4xl mx-auto space-y-5">
            {/* Profile Header */}
            <div className="rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex items-start gap-5">
              <div className="shrink-0">
                <Avatar
                  name={`${selectedPatient.prenom || ''} ${selectedPatient.nom || ''}`.trim()}
                  size="lg"
                  src={imgUrl(selectedPatient.photoProfil)}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="text-xl font-bold text-[#0F2C52]">
                      {selectedPatient.prenom} {selectedPatient.nom}
                    </h1>
                    <p className="text-sm text-[#6B7280] mt-0.5">Patient · {selectedPatient.quartier || 'Adresse non renseignée'}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-3">
                  {selectedPatient.telephone && (
                    <a href={`tel:${selectedPatient.telephone}`} className="flex items-center gap-1.5 text-xs text-[#374151] bg-[#F3F4F6] rounded-lg px-3 py-1.5 hover:bg-[#E5E7EB] transition">
                      <Phone className="h-3.5 w-3.5 text-[#3B6EF8]" /> {selectedPatient.telephone}
                    </a>
                  )}
                  {selectedPatient.email && (
                    <span className="flex items-center gap-1.5 text-xs text-[#374151] bg-[#F3F4F6] rounded-lg px-3 py-1.5">
                      <Mail className="h-3.5 w-3.5 text-[#9CA3AF]" /> {selectedPatient.email}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-xs text-[#374151] bg-[#F3F4F6] rounded-lg px-3 py-1.5">
                    <Calendar className="h-3.5 w-3.5 text-[#9CA3AF]" /> {patientConsults.length} consultation(s)
                  </span>
                </div>
              </div>
            </div>

            {/* Health Summary */}
            <div className="rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
              <h3 className="text-sm font-bold text-[#0F2C52] flex items-center gap-2 mb-4">
                <HeartPulse className="h-4 w-4 text-[#EF4444]" /> Bilan de santé
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Blood Type */}
                <div className={`rounded-xl p-4 ${selectedPatient.groupeSanguin ? 'bg-[#EFF6FF]' : 'bg-[#F3F4F6]'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Droplets className="h-4 w-4 text-[#3B6EF8]" />
                    <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Groupe sanguin</span>
                  </div>
                  {selectedPatient.groupeSanguin ? (
                    <p className="text-2xl font-bold text-[#0F2C52]">{selectedPatient.groupeSanguin}</p>
                  ) : (
                    <p className="text-sm text-[#9CA3AF]">Non renseigné</p>
                  )}
                </div>

                {/* Allergies */}
                <div className={`rounded-xl p-4 ${selectedPatient.allergies?.length ? 'bg-red-50' : 'bg-[#F3F4F6]'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className={`h-4 w-4 ${selectedPatient.allergies?.length ? 'text-[#EF4444]' : 'text-[#9CA3AF]'}`} />
                    <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Allergies</span>
                  </div>
                  {selectedPatient.allergies?.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedPatient.allergies.map((a: string) => (
                        <span key={a} className="px-2 py-0.5 rounded-full bg-red-100 text-[11px] font-medium text-red-700">{a}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#9CA3AF]">Aucune connue</p>
                  )}
                </div>

                {/* Emergency Contacts */}
                <div className={`rounded-xl p-4 ${selectedPatient.contactsUrgence?.length ? 'bg-amber-50' : 'bg-[#F3F4F6]'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className={`h-4 w-4 ${selectedPatient.contactsUrgence?.length ? 'text-[#F59E0B]' : 'text-[#9CA3AF]'}`} />
                    <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Contact urgence</span>
                  </div>
                  {selectedPatient.contactsUrgence?.length > 0 ? (
                    <div className="space-y-1.5">
                      {selectedPatient.contactsUrgence.map((c: any, i: number) => (
                        <div key={i} className="text-sm">
                          <p className="font-medium text-[#374151]">{c.nom}</p>
                          <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                            <span>{c.telephone}</span>
                            {c.lien && <span className="text-[#F59E0B]">· {c.lien}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#9CA3AF]">Aucun contact</p>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
              <h3 className="text-sm font-bold text-[#0F2C52] mb-3">Actions rapides</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => router.push(`/medecin/messages?patient=${selectedPatient.id}`)}
                  className="flex items-center gap-2 rounded-xl bg-[#3B6EF8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2D5BD4] transition"
                >
                  <MessageSquare className="h-4 w-4" /> Message
                </button>
                <button
                  onClick={() => router.push(`/medecin/consultations?patient=${selectedPatient.id}`)}
                  className="flex items-center gap-2 rounded-xl bg-[#10B981] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#059669] transition"
                >
                  <Stethoscope className="h-4 w-4" /> Nouvelle consultation
                </button>

              </div>
            </div>

            {/* Consultation History */}
            <div className="rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-[#0F2C52] flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#3B6EF8]" /> Historique des consultations
                </h3>
                <span className="text-xs text-[#9CA3AF]">{patientConsults.length} au total</span>
              </div>
              {patientConsults.length > 0 ? (
                <div className="space-y-2">
                  {patientConsults.map((c) => (
                    <div key={c.id} className="flex items-start gap-4 rounded-xl border border-[#E5E7EB] p-4 hover:bg-[#F9FAFB] transition">
                      <div className="flex flex-col items-center min-w-[44px]">
                        <span className="text-xs font-bold text-[#0F2C52]">
                          {new Date(c.createdAt).toLocaleDateString('fr-FR', { day: 'numeric' })}
                        </span>
                        <span className="text-[10px] text-[#9CA3AF]">
                          {new Date(c.createdAt).toLocaleDateString('fr-FR', { month: 'short' })}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#374151]">{c.motif || 'Motif non précisé'}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUT_BADGE[c.statut] || ''}`}>
                            {STATUT_LABEL[c.statut] || c.statut}
                          </span>
                          <span className="text-[11px] text-[#9CA3AF] flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(c.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-[#D1D5DB] mt-1" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <FileText className="h-10 w-10 text-[#D1D5DB] mb-3" />
                  <p className="text-sm font-medium text-[#6B7280]">Aucune consultation</p>
                  <p className="text-xs text-[#9CA3AF] mt-1">Ce patient n'a pas encore consulté</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <User className="mx-auto h-16 w-16 text-[#D1D5DB] mb-4" />
              <h3 className="text-lg font-bold text-[#0F2C52] mb-1">Sélectionnez un patient</h3>
              <p className="text-sm text-[#9CA3AF]">Choisissez un patient dans la liste de gauche pour voir son bilan de santé</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
