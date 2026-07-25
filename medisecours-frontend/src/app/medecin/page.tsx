'use client'

import Link from 'next/link'
import useSWR from 'swr'
import {
  Users, UserCog, HeartPulse, CalendarCheck,
  ClipboardList, AlertTriangle,
} from 'lucide-react'
import api from '../../api/axios'
import { useAuth } from '../../hooks/useAuth'
import { useWebSocket } from '../../hooks/useWebSocket'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import DashboardFunnel from '../../components/medecin/dashboard/DashboardFunnel'
import DashboardTimeline from '../../components/medecin/dashboard/DashboardTimeline'
import DashboardAlerts from '../../components/medecin/dashboard/DashboardAlerts'
import DashboardBloodAllergies from '../../components/medecin/dashboard/DashboardBloodAllergies'
import DashboardRecentPatients from '../../components/medecin/dashboard/DashboardRecentPatients'
import DashboardMotifsCloud from '../../components/medecin/dashboard/DashboardMotifsCloud'
import DashboardRatingsDistrib from '../../components/medecin/dashboard/DashboardRatingsDistrib'
import DashboardPresenceStatus from '../../components/medecin/dashboard/DashboardPresenceStatus'
import DashboardUpcomingAppointments from '../../components/medecin/dashboard/DashboardUpcomingAppointments'
import DashboardRiskPatients from '../../components/medecin/dashboard/DashboardRiskPatients'
import DashboardCatalogueSearch from '../../components/medecin/dashboard/DashboardCatalogueSearch'
import { DASHBOARD_KEY } from '../../lib/keys'
import type { DashboardData, Consultation } from '../../types/api'

async function dashboardFetcher(url: string): Promise<DashboardData> {
  try {
    const res = await api.get(url)
    return res.data as DashboardData
  } catch (err: any) {
    const status = err?.response?.status
    if (status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('medisecours_token')
        localStorage.removeItem('medisecours_user')
        window.location.href = '/login'
      }
    }
    throw err
  }
}

export default function MedecinDashboard() {
  const { user, token } = useAuth()

  const { data, error, isLoading, mutate } = useSWR<DashboardData>(
    DASHBOARD_KEY,
    dashboardFetcher,
    { revalidateOnFocus: false, errorRetryCount: 3, keepPreviousData: true }
  )

  // Real-time: refresh dashboard on consultation events
  const wsHandlers = {
    onConsultationCreated: () => mutate(),
    onConsultationAccepted: () => mutate(),
    onConsultationClosed: () => mutate(),
  }
  useWebSocket(user?.id || '', token || '', wsHandlers, user?.roles?.[0])

  const kpis = data?.kpis ?? {
    totalPatients: 0,
    casActifs: 0,
    consultations: 0,
    enAttente: 0,
    terminees: 0,
  }
  const noteMoyenne = data?.noteMoyenne ?? 0
  const totalAvis = data?.totalAvis ?? 0
  const unreadMessages = data?.unreadMessages ?? 0
  const activeConsultations = (data?.activeConsultations ?? []) as Consultation[]
  const riskConsultations = (data?.riskConsultations ?? []) as Consultation[]
  const upcomingAppointments = (data?.upcomingAppointments ?? []) as Consultation[]
  const recentPatients = data?.recentPatients ?? []
  const bloodDistribution = data?.bloodDistribution ?? {}
  const allergies = data?.allergies
  const motifsCount = data?.motifsCount ?? []
  const ratingsDistribution = data?.ratingsDistribution ?? {}
  const statusCounts = data?.statusCounts
  const alerts = data?.alerts
  const timeline = data?.timeline

  if (isLoading) return <LoadingSpinner label="Chargement du tableau de bord…" />

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {error && !data && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>Données en cache indisponibles — <button onClick={() => mutate()} className="font-semibold underline">réessayer</button>.</span>
        </div>
      )}

      {/* Row 1 — Alertes critiques (priorité médicale maximale) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[35%_35%_30%]">
        <DashboardRiskPatients riskConsultations={riskConsultations} />
        <DashboardAlerts alerts={alerts} />
        <DashboardUpcomingAppointments upcomingAppointments={upcomingAppointments} />
      </div>

      {/* Row 2 — KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { value: kpis.totalPatients, label: 'Mes patients', subtitle: `${kpis.casActifs} en cours de traitement`, icon: Users, color: '#3B6EF8' },
          { value: kpis.casActifs, label: 'Cas actifs', subtitle: `${kpis.enAttente} en attente`, icon: UserCog, color: '#FF7A45' },
          { value: kpis.consultations, label: 'Consultations', subtitle: `${kpis.terminees} terminées`, icon: HeartPulse, color: '#E84393' },
          { value: kpis.enAttente, label: 'En attente', subtitle: 'Consultations ouvertes', icon: CalendarCheck, color: '#00C2B8' },
        ].map(({ value, label, subtitle, icon: Icon, color }, i) => (
          <div key={i} className="rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]" role="status">
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

      {/* Row 3 — File active (consultations + patients récents) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[60%_40%]">
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
                    <th scope="col" className="w-[22%] pb-3">Patient</th>
                    <th scope="col" className="w-[30%] pb-3">Motif</th>
                    <th scope="col" className="w-[18%] pb-3">Date</th>
                    <th scope="col" className="w-[15%] pb-3">Statut</th>
                    <th scope="col" className="w-[15%] pb-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeConsultations.map((c) => {
                    const patient = typeof c.patient === 'object' ? c.patient : null
                    return (
                      <tr key={c.id} className="border-b border-gray-50 text-sm text-[#374151] transition hover:bg-[#F9FAFB]">
                        <td className="py-3 font-medium">{patient?.prenom} {patient?.nom}</td>
                        <td className="truncate py-3">{c.motif || 'Non précisé'}</td>
                        <td className="py-3">{new Date(c.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</td>
                        <td className="py-3">
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700">
                            {c.statut}
                          </span>
                        </td>
                        <td className="py-3">
                          <Link href="/medecin/consultations" className="text-xs font-semibold text-[#3B6EF8]">Voir</Link>
                        </td>
                      </tr>
                    )
                  })}
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
        <DashboardRecentPatients recentPatients={recentPatients} />
      </div>

      {/* Row 4 — Insights (Timeline, Funnel, Blood/Allergies, Ratings) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[28%_28%_22%_22%]">
        <DashboardTimeline timeline={timeline} />
        <DashboardFunnel statusCounts={statusCounts} />
        <DashboardBloodAllergies bloodDistribution={bloodDistribution} allergies={allergies} />
        <DashboardRatingsDistrib ratingsDistribution={ratingsDistribution} totalAvis={totalAvis} noteMoyenne={noteMoyenne} />
      </div>

      {/* Row 5 — Motifs + Présence + Catalogue */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <DashboardMotifsCloud motifsCount={motifsCount} />
        <DashboardPresenceStatus user={user} />
        <DashboardCatalogueSearch />
      </div>
    </div>
  )
}
