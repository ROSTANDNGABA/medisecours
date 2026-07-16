// @ts-nocheck
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Users, UserCog, HeartPulse, CalendarCheck, Star, MessageSquare,
  ClipboardList, TrendingUp,
} from 'lucide-react'
import api from '../../api/axios'
import { useAuth } from '../../hooks/useAuth'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import DashboardFunnel from '../../components/medecin/dashboard/DashboardFunnel'
import DashboardTimeline from '../../components/medecin/dashboard/DashboardTimeline'
import DashboardAlerts from '../../components/medecin/dashboard/DashboardAlerts'
import DashboardBloodAllergies from '../../components/medecin/dashboard/DashboardBloodAllergies'
import DashboardRecentPatients from '../../components/medecin/dashboard/DashboardRecentPatients'
import DashboardSatisfaction from '../../components/medecin/dashboard/DashboardSatisfaction'
import DashboardMotifsCloud from '../../components/medecin/dashboard/DashboardMotifsCloud'
import DashboardRatingsDistrib from '../../components/medecin/dashboard/DashboardRatingsDistrib'
import DashboardPresenceStatus from '../../components/medecin/dashboard/DashboardPresenceStatus'
import DashboardUpcomingAppointments from '../../components/medecin/dashboard/DashboardUpcomingAppointments'
import DashboardRiskPatients from '../../components/medecin/dashboard/DashboardRiskPatients'
import DashboardCatalogueSearch from '../../components/medecin/dashboard/DashboardCatalogueSearch'

function idFromIri(value) {
  if (!value) return null
  if (typeof value === 'object') return value.id
  return value.split('/').pop()
}

export default function MedecinDashboard() {
  const { user } = useAuth()
  const [consultations, setConsultations] = useState([])
  const [avis, setAvis] = useState([])
  const [messages, setMessages] = useState([])
  const [medecins, setMedecins] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    let active = true
    Promise.allSettled([
      api.get('/api/consultations'),
      api.get(`/api/avis?medecin=${user.id}`),
      api.get('/api/messages'),
      api.get('/api/medecins-publics'),
    ]).then(([cons, rev, msg, docs]) => {
      if (!active) return
      const extract = (res) => {
        if (res.status !== 'fulfilled') return []
        const d = res.value.data
        return Array.isArray(d) ? d : (d?.['hydra:member'] ?? d?.member ?? [])
      }
      setConsultations(extract(cons))
      setAvis(extract(rev))
      setMessages(extract(msg))
      setMedecins(extract(docs))
      setLoading(false)
    })
    return () => { active = false }
  }, [user?.id])

  const kpis = useMemo(() => {
    const list = Array.isArray(consultations) ? consultations : []
    const patients = new Set(list.map((c) => idFromIri(c.patient)).filter(Boolean))
    return {
      totalPatients: patients.size,
      casActifs: list.filter((c) => c.statut === 'EN_COURS').length,
      consultations: list.length,
      enAttente: list.filter((c) => c.statut === 'OUVERTE').length,
      terminees: list.filter((c) => c.statut === 'TERMINEE').length,
    }
  }, [consultations])

  const noteMoyenne = useMemo(() => {
    const list = Array.isArray(avis) ? avis : []
    if (list.length === 0) return 0
    return (list.reduce((sum, a) => sum + a.note, 0) / list.length).toFixed(1)
  }, [avis])

  const unreadMessages = useMemo(() => {
    const list = Array.isArray(messages) ? messages : []
    return list.filter((m) => m.statut !== 'LU' && idFromIri(m.expediteur) !== user?.id).length
  }, [messages, user])

  const activeConsultations = useMemo(() => {
    const list = Array.isArray(consultations) ? consultations : []
    return list
      .filter((c) => c.statut !== 'TERMINEE' && c.statut !== 'ANNULEE')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
  }, [consultations])

  if (loading) return <LoadingSpinner label="Chargement du tableau de bord…" />

  const STATUT_BADGE = {
    OUVERTE: 'bg-blue-100 text-blue-700',
    EN_COURS: 'bg-emerald-100 text-emerald-700',
    TERMINEE: 'bg-gray-100 text-gray-600',
    ANNULEE: 'bg-red-100 text-red-700',
  }
  const STATUT_LABEL = { OUVERTE: 'Ouverte', EN_COURS: 'En cours', TERMINEE: 'Terminée', ANNULEE: 'Annulée' }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Row 1 — KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { value: kpis.totalPatients, label: 'Mes patients', subtitle: `${kpis.casActifs} en cours de traitement`, icon: Users, color: '#3B6EF8' },
          { value: kpis.casActifs, label: 'Cas actifs', subtitle: `${kpis.enAttente} en attente`, icon: UserCog, color: '#FF7A45' },
          { value: kpis.consultations, label: 'Consultations', subtitle: `${kpis.terminees} terminées`, icon: HeartPulse, color: '#E84393' },
          { value: kpis.enAttente, label: 'En attente', subtitle: 'Consultations ouvertes', icon: CalendarCheck, color: '#00C2B8' },
        ].map(({ value, label, subtitle, icon: Icon, color }, i) => (
          <div key={i} className="rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}20` }}>
                <Icon className="h-5 w-5" style={{ color }} />
              </div>
            </div>
            <p className="text-xs font-medium text-[#6B7280]">{label}</p>
            <p className="font-display text-2xl font-bold text-[#0F2C52]">{value}</p>
            <p className="mt-0.5 text-xs text-[#9CA3AF]">{subtitle}</p>
          </div>
        ))}
      </div>

      {/* Row 2 — Funnel, Timeline, Alerts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[28%_44%_28%]">
        <DashboardFunnel consultations={consultations} />
        <DashboardTimeline consultations={consultations} messages={messages} />
        <DashboardAlerts consultations={consultations} />
      </div>

      {/* Row 3 — Blood types, Motifs cloud, Ratings, Presence */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardBloodAllergies consultations={consultations} />
        <DashboardMotifsCloud consultations={consultations} />
        <DashboardRatingsDistrib avis={avis} />
        <DashboardPresenceStatus user={user} />
      </div>

      {/* Row 4 — Upcoming appointments, Recent patients, Satisfaction */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[28%_42%_30%]">
        <DashboardUpcomingAppointments consultations={consultations} />
        <DashboardRecentPatients consultations={consultations} />
        <DashboardSatisfaction avis={avis} />
      </div>

      {/* Row 5 — Risk patients, Catalogue search, Overview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[35%_30%_35%]">
        <DashboardRiskPatients consultations={consultations} />
        <DashboardCatalogueSearch />
        <div className="rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <h3 className="text-sm font-bold text-[#0F2C52] mb-1">Aperçu</h3>
          <p className="text-xs text-[#6B7280] mb-4">Indicateurs rapides</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-[#F3F4F6] p-4">
              <div className="flex items-center gap-3">
                <Star className="h-5 w-5 text-amber-400" fill="currentColor" />
                <div>
                  <p className="text-xs font-medium text-[#6B7280]">Note moyenne</p>
                  <p className="text-sm font-bold text-[#0F2C52]">{noteMoyenne}/5</p>
                </div>
              </div>
              <span className="text-xs text-[#9CA3AF]">{avis.length} avis</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-[#F3F4F6] p-4">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-[#3B6EF8]" />
                <div>
                  <p className="text-xs font-medium text-[#6B7280]">Messages</p>
                  <p className="text-sm font-bold text-[#0F2C52]">{unreadMessages} non lus</p>
                </div>
              </div>
              <Link href="/medecin/messages" className="text-xs font-semibold text-[#3B6EF8]">Voir</Link>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-[#F3F4F6] p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-[#059669]" />
                <div>
                  <p className="text-xs font-medium text-[#6B7280]">Consultations</p>
                  <p className="text-sm font-bold text-[#0F2C52]">{kpis.terminees} terminées</p>
                </div>
              </div>
              <span className="text-xs text-[#9CA3AF]">{kpis.consultations} total</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-[#F3F4F6] p-4">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-[#8B5CF6]" />
                <div>
                  <p className="text-xs font-medium text-[#6B7280]">Médecins</p>
                  <p className="text-sm font-bold text-[#0F2C52]">{medecins.length} disponibles</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 6 — Active consultations */}
      <div className="grid grid-cols-1 gap-6">
        <div className="rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#0F2C52]">Consultations actives</h3>
            <Link href="/medecin/consultations" className="text-xs font-semibold text-[#3B6EF8]">Voir tout</Link>
          </div>
          {activeConsultations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF]">
                    <th className="w-[22%] pb-3">Patient</th>
                    <th className="w-[30%] pb-3">Motif</th>
                    <th className="w-[18%] pb-3">Date</th>
                    <th className="w-[15%] pb-3">Statut</th>
                    <th className="w-[15%] pb-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeConsultations.map((c) => (
                    <tr key={c.id} className="border-b border-gray-50 text-sm text-[#374151] transition hover:bg-[#F9FAFB]">
                      <td className="py-3 font-medium">{c.patient?.prenom} {c.patient?.nom}</td>
                      <td className="truncate py-3">{c.motif || 'Non précisé'}</td>
                      <td className="py-3">{new Date(c.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</td>
                      <td className="py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUT_BADGE[c.statut] || 'bg-gray-100 text-gray-600'}`}>
                          {STATUT_LABEL[c.statut] || c.statut}
                        </span>
                      </td>
                      <td className="py-3">
                        <Link href="/medecin/consultations" className="text-xs font-semibold text-[#3B6EF8]">Voir</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex h-[180px] items-center justify-center">
              <ClipboardList className="mb-2 h-8 w-8 text-[#D1D5DB]" />
              <p className="text-sm text-[#9CA3AF]">Aucune consultation active</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
