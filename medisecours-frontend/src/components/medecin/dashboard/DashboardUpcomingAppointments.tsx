'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, ChevronRight } from 'lucide-react'
import Avatar from '../../ui/Avatar'

export default function DashboardUpcomingAppointments({ consultations }: { consultations: any[] }) {
  const router = useRouter()

  const upcoming = useMemo(() => {
    const list = Array.isArray(consultations) ? consultations : []
    const now = new Date()

    return list
      .filter((c) => {
        if (!c.dateConsultation) return false
        return new Date(c.dateConsultation) > now
      })
      .sort((a, b) => new Date(a.dateConsultation).getTime() - new Date(b.dateConsultation).getTime())
      .slice(0, 5)
  }, [consultations])

  if (upcoming.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <h3 className="text-sm font-bold text-[#0F2C52] mb-1">Prochains rendez-vous</h3>
        <div className="flex h-[200px] items-center justify-center"><p className="text-sm text-[#9CA3AF]">Aucun rendez-vous planifié</p></div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-[#0F2C52]">Prochains rendez-vous</h3>
          <p className="text-xs text-[#6B7280]">{upcoming.length} à venir</p>
        </div>
        <Calendar className="h-5 w-5 text-[#3B6EF8]" />
      </div>

      <div className="space-y-2">
        {upcoming.map((c) => {
          const d = new Date(c.dateConsultation)
          const day = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
          const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
          const isToday = d.toDateString() === new Date().toDateString()

          return (
            <button
              key={c.id}
              onClick={() => router.push(`/medecin/consultations?id=${c.id}`)}
              className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-[#F9FAFB]"
            >
              <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg ${isToday ? 'bg-[#3B6EF8]/10' : 'bg-[#F3F4F6]'}`}>
                <span className={`text-[11px] font-bold ${isToday ? 'text-[#3B6EF8]' : 'text-[#374151]'}`}>{day}</span>
                <span className={`text-[10px] ${isToday ? 'text-[#3B6EF8]/70' : 'text-[#9CA3AF]'}`}>{time}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#0F2C52] truncate">
                  {c.patient?.prenom} {c.patient?.nom}
                </p>
                <p className="text-xs text-[#9CA3AF] truncate">{c.motif || 'Consultation'}</p>
              </div>
              {isToday && (
                <span className="px-2 py-0.5 rounded-full bg-[#3B6EF8]/10 text-[10px] font-semibold text-[#3B6EF8]">
                  Aujourd'hui
                </span>
              )}
              <ChevronRight className="h-4 w-4 text-[#D1D5DB]" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
