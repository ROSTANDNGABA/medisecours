'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'

const STATUS_ORDER = ['OUVERTE', 'EN_COURS', 'TERMINEE', 'ANNULEE']
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  OUVERTE: { label: 'Ouverte', color: '#3B6EF8' },
  EN_COURS: { label: 'En cours', color: '#F59E0B' },
  TERMINEE: { label: 'Terminée', color: '#10B981' },
  ANNULEE: { label: 'Annulée', color: '#EF4444' },
}

export default function DashboardFunnel({ consultations }: { consultations: any[] }) {
  const funnel = useMemo(() => {
    const list = Array.isArray(consultations) ? consultations : []
    const counts: Record<string, number> = { OUVERTE: 0, EN_COURS: 0, TERMINEE: 0, ANNULEE: 0 }
    list.forEach((c) => { if (counts[c.statut] !== undefined) counts[c.statut]++ })

    const total = list.length || 1
    const chartData = STATUS_ORDER.map((key) => ({
      name: STATUS_CONFIG[key].label,
      value: counts[key],
      pct: +((counts[key] / total) * 100).toFixed(1),
      fill: STATUS_CONFIG[key].color,
    }))

    const conversion = {
      ouverteEnCours: counts.OUVERTE > 0 ? +((counts.EN_COURS / (counts.OUVERTE + counts.EN_COURS)) * 100).toFixed(0) : 0,
      enCoursTerminee: counts.EN_COURS > 0 ? +((counts.TERMINEE / (counts.EN_COURS + counts.TERMINEE)) * 100).toFixed(0) : 0,
    }

    return { chartData, conversion, total }
  }, [consultations])

  if (funnel.total === 0) {
    return (
      <div className="rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <h3 className="text-sm font-bold text-[#0F2C52] mb-1">Entonnoir des consultations</h3>
        <div className="flex h-[240px] items-center justify-center"><p className="text-sm text-[#9CA3AF]">Aucune donnée</p></div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <h3 className="text-sm font-bold text-[#0F2C52] mb-1">Entonnoir des consultations</h3>
      <p className="text-xs text-[#6B7280] mb-4">Répartition par statut</p>

      <div className="space-y-2 mb-4">
        {funnel.chartData.map((d) => (
          <div key={d.name}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium text-[#374151]">{d.name}</span>
              <span className="font-bold text-[#0F2C52]">{d.value} ({d.pct}%)</span>
            </div>
            <div className="h-2 w-full rounded-full bg-[#F3F4F6]">
              <div className="h-2 rounded-full transition-all" style={{ width: `${d.pct}%`, backgroundColor: d.fill }} />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 rounded-xl bg-[#F3F4F6] p-3">
        <div className="flex-1 text-center">
          <p className="text-[18px] font-bold text-[#0F2C52]">{funnel.conversion.ouverteEnCours}%</p>
          <p className="text-[10px] text-[#6B7280]">Ouverte → En cours</p>
        </div>
        <div className="h-8 w-px bg-[#D1D5DB]" />
        <div className="flex-1 text-center">
          <p className="text-[18px] font-bold text-[#0F2C52]">{funnel.conversion.enCoursTerminee}%</p>
          <p className="text-[10px] text-[#6B7280]">En cours → Terminée</p>
        </div>
      </div>
    </div>
  )
}
