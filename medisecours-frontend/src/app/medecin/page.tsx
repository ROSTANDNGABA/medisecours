// @ts-nocheck
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import {
  Users, UserCog, HeartPulse, CalendarCheck,
  ClipboardList, AlertTriangle, Search,
  ChevronRight, Star, Calendar, Clock,
  Stethoscope, MessageSquare, Phone,
  ShieldCheck, ArrowRight, Activity,
  RefreshCw, ChevronLeft,
} from 'lucide-react'
import api from '../../api/axios'
import { useAuth } from '../../hooks/useAuth'
import { useWebSocket } from '../../hooks/useWebSocket'
import { imgUrl } from '../../lib/config'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Avatar from '../../components/ui/Avatar'
import CertifiedBadge from '../../components/ui/CertifiedBadge'
import DashboardAnalytics from '../../components/medecin/dashboard/DashboardAnalytics'
import { DASHBOARD_KEY } from '../../lib/keys'
import type { DashboardData, Consultation, Patient } from '../../types/api'

async function dashboardFetcher(url: string): Promise<DashboardData> {
  try {
    const res = await api.get(url)
    return res.data as DashboardData
  } catch (err: any) {
    const status = err?.response?.status
    if (status === 401) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
    throw err
  }
}

/* ── Helpers ──────────────────────────────────────────────────────── */

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

function getCalendarDays() {
  const today = new Date()
  const days: { day: number; label: string; isToday: boolean; date: Date }[] = []
  const labels = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
  for (let i = -2; i <= 4; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    days.push({ day: d.getDate(), label: labels[d.getDay()], isToday: i === 0, date: d })
  }
  return days
}

const STATUT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'OUVERTE': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  'En attente': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  'EN_COURS': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400' },
  'En cours': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400' },
  'TERMINEE': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  'Terminée': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  'ANNULEE': { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-400' },
}

const PRIORITE_BADGE: Record<string, { bg: string; text: string }> = {
  CRITIQUE: { bg: 'bg-red-100', text: 'text-red-700' },
  URGENTE: { bg: 'bg-amber-100', text: 'text-amber-700' },
  NORMALE: { bg: 'bg-slate-100', text: 'text-slate-600' },
}

/* ── Main Dashboard ──────────────────────────────────────────────── */

export default function MedecinDashboard() {
  const { user, token } = useAuth()
  const router = useRouter()

  const { data, error, isLoading, mutate } = useSWR<DashboardData>(
    DASHBOARD_KEY,
    dashboardFetcher,
    { revalidateOnFocus: false, errorRetryCount: 3, keepPreviousData: true }
  )

  const wsHandlers = {
    onConsultationCreated: () => mutate(),
    onConsultationAccepted: () => mutate(),
    onConsultationClosed: () => mutate(),
  }
  useWebSocket(user?.id || '', token || '', wsHandlers, user?.roles?.[0])

  const kpis = data?.kpis ?? { totalPatients: 0, casActifs: 0, consultations: 0, enAttente: 0, terminees: 0 }
  const noteMoyenne = data?.noteMoyenne ?? 0
  const totalAvis = data?.totalAvis ?? 0
  const activeConsultations = (data?.activeConsultations ?? []) as Consultation[]
  const riskConsultations = (data?.riskConsultations ?? []) as Consultation[]
  const upcomingAppointments = (data?.upcomingAppointments ?? []) as Consultation[]
  const recentPatients = (data?.recentPatients ?? []) as Patient[]
  const calDays = getCalendarDays()

  if (isLoading) return <LoadingSpinner label="Chargement du tableau de bord…" />

  return (
    <div className="flex gap-0 min-h-[calc(100vh-64px)]">

      {/* ═══════════════ LEFT (Main Content) ═══════════════ */}
      <div className="flex-1 min-w-0 p-5 space-y-6 overflow-y-auto">

        {error && !data && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>Données indisponibles — <button onClick={() => mutate()} className="font-semibold underline">réessayer</button>.</span>
          </div>
        )}

        {/* ── Hero Banner (like the image) ──────────────── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#818CF8] p-6 text-white">
          <div className="absolute right-0 top-0 bottom-0 w-[280px] opacity-90 pointer-events-none hidden lg:block">
            <img
              src="/images/doctor_illustration.png"
              alt=""
              className="h-full w-full object-contain object-right-bottom"
            />
          </div>
          <div className="relative z-10 max-w-[60%]">
            <h2 className="text-2xl font-bold mb-1">
              {getGreeting()}, Dr. {user?.prenom} {user?.estValide && <CertifiedBadge className="inline-block h-5 w-5 align-middle" />} 👋
            </h2>
            <p className="text-sm text-white/80 mb-4 leading-relaxed">
              Vous avez <span className="font-semibold text-white">{kpis.enAttente} consultation{kpis.enAttente > 1 ? 's' : ''} en attente</span> et{' '}
              <span className="font-semibold text-white">{kpis.casActifs} cas actif{kpis.casActifs > 1 ? 's' : ''}</span> aujourd'hui.
              {riskConsultations.length > 0 && (
                <> Dont <span className="font-semibold text-amber-200">{riskConsultations.length} urgent{riskConsultations.length > 1 ? 's' : ''}</span>.</>
              )}
            </p>
            <Link
              href="/medecin/consultations"
              className="inline-flex items-center gap-2 rounded-xl bg-white/20 backdrop-blur-sm px-4 py-2 text-sm font-semibold text-white hover:bg-white/30 transition"
            >
              Voir les consultations <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {/* Decorative circles */}
          <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-white/5" />
          <div className="absolute -bottom-8 left-1/3 w-24 h-24 rounded-full bg-white/5" />
        </div>

        {/* ── Category Cards (like "You Need to hire" section) ─── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-[#0F2C52]">Répartition des patients</h3>
            <Link href="/medecin/patients" className="text-xs font-semibold text-[#4F46E5] hover:underline flex items-center gap-1">
              Voir tout <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { value: kpis.totalPatients, label: 'Total patients', icon: Users, gradient: 'from-[#4F46E5] to-[#6366F1]', bgLight: 'bg-indigo-50' },
              { value: kpis.casActifs, label: 'Cas actifs', icon: Activity, gradient: 'from-[#F97316] to-[#FB923C]', bgLight: 'bg-orange-50' },
              { value: kpis.consultations, label: 'Consultations', icon: HeartPulse, gradient: 'from-[#EC4899] to-[#F472B6]', bgLight: 'bg-pink-50' },
              { value: kpis.enAttente, label: 'En attente', icon: CalendarCheck, gradient: 'from-[#14B8A6] to-[#2DD4BF]', bgLight: 'bg-teal-50' },
            ].map(({ value, label, icon: Icon, gradient, bgLight }, i) => (
              <div key={i} className={`${bgLight} rounded-2xl p-4 text-center transition hover:shadow-md hover:-translate-y-0.5 cursor-default`}>
                <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <p className="text-lg font-bold text-[#0F2C52]">{value}</p>
                <p className="text-[11px] text-[#6B7280] font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Animated Analytics Charts ─────────────────── */}
        <DashboardAnalytics data={data} />

        {/* ── Consultation Progress Table (like "Recruitment Progress") ─── */}
        <div className="rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#0F2C52]">Suivi des consultations</h3>
            <Link href="/medecin/consultations" className="text-xs font-semibold text-[#4F46E5] hover:underline flex items-center gap-1">
              Voir tout <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {activeConsultations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF]">
                    <th className="pb-3 pr-4">Patient</th>
                    <th className="pb-3 pr-4">Motif</th>
                    <th className="pb-3 pr-4">Priorité</th>
                    <th className="pb-3 pr-4">Statut</th>
                    <th className="pb-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeConsultations.slice(0, 6).map((c, idx) => {
                    const patient = typeof c.patient === 'object' ? c.patient : null
                    const sc = STATUT_COLORS[c.statut] || STATUT_COLORS['EN_COURS']
                    const pb = PRIORITE_BADGE[c.priorite] || PRIORITE_BADGE['NORMALE']
                    const isHighlighted = c.priorite === 'CRITIQUE' || c.priorite === 'URGENTE'

                    return (
                      <tr
                        key={c.id}
                        className={`border-b border-gray-50 text-sm transition ${isHighlighted ? 'bg-indigo-50/60' : 'hover:bg-[#F9FAFB]'}`}
                      >
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={`${patient?.prenom || ''} ${patient?.nom || ''}`} size="sm" src={patient?.photoProfil ? imgUrl(patient.photoProfil) : null} />
                            <div>
                              <p className="font-semibold text-[#0F2C52] text-[13px]">{patient?.prenom} {patient?.nom}</p>
                              <p className="text-[10px] text-[#9CA3AF]">{patient?.telephone || patient?.email || ''}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-[13px] text-[#374151] max-w-[160px] truncate">{c.motif || 'Non précisé'}</td>
                        <td className="py-3 pr-4">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${pb.bg} ${pb.text}`}>
                            {c.priorite}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${sc.bg} ${sc.text}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                            {c.statut}
                          </span>
                        </td>
                        <td className="py-3">
                          <button
                            onClick={() => router.push(`/medecin/consultations?id=${c.id}`)}
                            className="flex items-center gap-1 text-xs font-semibold text-[#4F46E5] hover:text-[#4338CA] transition"
                          >
                            Voir <ChevronRight className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex h-[180px] flex-col items-center justify-center">
              <ClipboardList className="mb-2 h-8 w-8 text-[#D1D5DB]" />
              <p className="text-sm text-[#9CA3AF]">Aucune consultation active</p>
            </div>
          )}
        </div>

        {/* ── Risk Patients (urgent cases) ──────────────────── */}
        {riskConsultations.length > 0 && (
          <div className="rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[#0F2C52]">⚠️ Patients à risque</h3>
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-bold text-red-600">
                {riskConsultations.length} cas
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {riskConsultations.slice(0, 4).map((c) => {
                const patient = typeof c.patient === 'object' ? c.patient : null
                const isCritique = c.priorite === 'CRITIQUE'
                return (
                  <button
                    key={c.id}
                    onClick={() => router.push(`/medecin/consultations?id=${c.id}`)}
                    className={`flex items-center gap-3 rounded-xl p-3 text-left transition hover:shadow-sm ${isCritique ? 'bg-red-50 border border-red-100' : 'bg-amber-50 border border-amber-100'}`}
                  >
                    <Avatar name={`${patient?.prenom || ''} ${patient?.nom || ''}`} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#0F2C52] truncate">{patient?.prenom} {patient?.nom}</p>
                      <p className="text-[11px] text-[#6B7280] truncate">{c.motif || '—'}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${isCritique ? 'bg-red-200 text-red-800' : 'bg-amber-200 text-amber-800'}`}>
                      {c.priorite}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════ RIGHT SIDEBAR ═══════════════ */}
      <aside className="hidden xl:block w-[300px] border-l border-[#E5E7EB] bg-white p-5 overflow-y-auto space-y-5">

        {/* ── Doctor Profile Card ────────────────────── */}
        <div className="text-center">
          <div className="relative inline-block mb-2">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#4F46E5] to-[#818CF8] text-white flex items-center justify-center text-xl font-bold overflow-hidden mx-auto shadow-lg ring-3 ring-indigo-100">
              {user?.photoProfil
                ? <img src={imgUrl(user.photoProfil) || ''} alt="" className="w-full h-full object-cover" />
                : `${user?.prenom?.[0] || ''}${user?.nom?.[0] || ''}`.toUpperCase()
              }
            </div>
            <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-400 border-2 border-white" />
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <h4 className="font-bold text-[#0F2C52] text-sm">Dr. {user?.prenom} {user?.nom}</h4>
            {user?.estValide && <CertifiedBadge className="h-3.5 w-3.5" />}
          </div>
          <p className="text-[11px] text-[#6B7280] mb-1">{user?.specialite || 'Médecin'}</p>
          <Link href="/medecin/profil" className="text-[11px] text-[#4F46E5] font-semibold hover:underline">
            Voir profil →
          </Link>

          {/* Rating */}
          <div className="flex items-center justify-center gap-0.5 mt-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className={`w-3.5 h-3.5 ${i <= Math.round(noteMoyenne) ? 'text-amber-400' : 'text-gray-200'}`} fill="currentColor" />
            ))}
            <span className="ml-1 text-[11px] text-[#6B7280]">{noteMoyenne.toFixed(1)} ({totalAvis})</span>
          </div>
        </div>

        <hr className="border-[#F3F4F6]" />

        {/* ── Schedule Calendar ──────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-[#0F2C52]">Planning</h4>
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-[#4F46E5]" />
              <span className="text-[11px] font-semibold text-[#4F46E5]">
                {new Date().toLocaleDateString('fr-FR', { month: 'long' })}
              </span>
            </div>
          </div>
          <div className="flex gap-1.5">
            {calDays.map((d, i) => (
              <button
                key={i}
                className={`flex-1 flex flex-col items-center py-2 rounded-xl text-center transition ${
                  d.isToday
                    ? 'bg-[#4F46E5] text-white shadow-md shadow-indigo-200'
                    : 'bg-[#F9FAFB] text-[#374151] hover:bg-[#F3F4F6]'
                }`}
              >
                <span className={`text-[9px] font-medium ${d.isToday ? 'text-white/70' : 'text-[#9CA3AF]'}`}>{d.label}</span>
                <span className="text-sm font-bold">{d.day}</span>
              </button>
            ))}
          </div>
        </div>

        <hr className="border-[#F3F4F6]" />

        {/* ── Upcoming Appointments (sidebar) ──────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-[#0F2C52]">Prochains RDV</h4>
            <Link href="/medecin/consultations" className="text-[11px] text-[#4F46E5] font-semibold hover:underline">Tout</Link>
          </div>
          {upcomingAppointments.length > 0 ? (
            <div className="space-y-2">
              {upcomingAppointments.slice(0, 4).map((c) => {
                const patient = typeof c.patient === 'object' ? c.patient : null
                const d = new Date(c.dateConsultation || c.createdAt)
                return (
                  <button
                    key={c.id}
                    onClick={() => router.push(`/medecin/consultations?id=${c.id}`)}
                    className="flex items-center gap-2.5 w-full rounded-xl p-2 hover:bg-[#F9FAFB] transition text-left"
                  >
                    <Avatar name={`${patient?.prenom || ''} ${patient?.nom || ''}`} size="sm" src={patient?.photoProfil ? imgUrl(patient.photoProfil) : null} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-[#0F2C52] truncate">{patient?.prenom} {patient?.nom}</p>
                      <p className="text-[10px] text-[#9CA3AF] truncate">{c.motif || 'Consultation'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-semibold text-[#374151]">
                        {d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </p>
                      <p className="text-[9px] text-[#9CA3AF]">
                        {d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="text-[12px] text-[#9CA3AF] text-center py-4">Aucun rendez-vous planifié</p>
          )}
        </div>

        <hr className="border-[#F3F4F6]" />

        {/* ── Recent Patients (like "New Applicants") ──── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-[#0F2C52]">Patients récents</h4>
            <Link href="/medecin/patients" className="text-[11px] text-[#4F46E5] font-semibold hover:underline">Tout</Link>
          </div>
          {recentPatients.length > 0 ? (
            <div className="space-y-2">
              {recentPatients.slice(0, 5).map((p) => {
                const pid = p.id || p['@id']?.split('/').pop()
                return (
                  <div
                    key={pid}
                    className="flex items-center gap-2.5 rounded-xl p-2 hover:bg-[#F9FAFB] transition"
                  >
                    <Avatar name={`${p.prenom || ''} ${p.nom || ''}`} size="sm" src={p.photoProfil ? imgUrl(p.photoProfil) : null} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-[#0F2C52] truncate">{p.prenom} {p.nom}</p>
                      <p className="text-[10px] text-[#9CA3AF]">{p.telephone || p.email || '—'}</p>
                    </div>
                    <div className="flex gap-0.5">
                      <button
                        onClick={() => router.push(`/medecin/messages?patient=${pid}`)}
                        className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-[#4F46E5] hover:bg-indigo-100 transition"
                        title="Message"
                      >
                        <MessageSquare className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => router.push(`/medecin/consultations?patient=${pid}`)}
                        className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition"
                        title="Consultation"
                      >
                        <Stethoscope className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-[12px] text-[#9CA3AF] text-center py-4">Aucun patient récent</p>
          )}
        </div>

        <hr className="border-[#F3F4F6]" />

        {/* ── Quick Stats (like "Ready For Training") ──── */}
        <div>
          <h4 className="text-sm font-bold text-[#0F2C52] mb-3">Résumé rapide</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-indigo-50 p-3 text-center">
              <p className="text-lg font-bold text-[#4F46E5]">{kpis.terminees}</p>
              <p className="text-[10px] text-[#6B7280] font-medium">Terminées</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3 text-center">
              <p className="text-lg font-bold text-emerald-600">{totalAvis}</p>
              <p className="text-[10px] text-[#6B7280] font-medium">Avis reçus</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-3 text-center">
              <p className="text-lg font-bold text-amber-600">{kpis.enAttente}</p>
              <p className="text-[10px] text-[#6B7280] font-medium">En attente</p>
            </div>
            <div className="rounded-xl bg-pink-50 p-3 text-center">
              <p className="text-lg font-bold text-pink-600">{riskConsultations.length}</p>
              <p className="text-[10px] text-[#6B7280] font-medium">Urgents</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
