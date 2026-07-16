'use client'

import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Star } from 'lucide-react'

export default function DashboardSatisfaction({ avis }: { avis: any[] }) {
  const { trend, moyenne, total } = useMemo(() => {
    const list = Array.isArray(avis) ? avis : []
    const months: Record<string, { sum: number; count: number }> = {}
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: '2-digit' })

    // Create last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months[formatter.format(d)] = { sum: 0, count: 0 }
    }

    list.forEach((a) => {
      if (!a.createdAt || !a.note) return
      const d = new Date(a.createdAt)
      const key = formatter.format(d)
      if (months[key]) {
        months[key].sum += a.note
        months[key].count++
      }
    })

    const trend = Object.entries(months).map(([month, data]) => ({
      month,
      note: data.count > 0 ? +((data.sum / data.count)).toFixed(1) : 0,
    }))

    const total = list.length
    const moyenne = total > 0 ? +(list.reduce((s, a) => s + a.note, 0) / total).toFixed(1) : 0

    return { trend, moyenne, total }
  }, [avis])

  if (total === 0) {
    return (
      <div className="rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <h3 className="text-sm font-bold text-[#0F2C52] mb-1">Satisfaction</h3>
        <div className="flex h-[240px] items-center justify-center"><p className="text-sm text-[#9CA3AF]">Aucun avis</p></div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-bold text-[#0F2C52]">Satisfaction</h3>
        <div className="flex items-center gap-1">
          <Star className="h-3.5 w-3.5 text-amber-400" fill="currentColor" />
          <span className="text-sm font-bold text-[#0F2C52]">{moyenne}</span>
          <span className="text-[11px] text-[#9CA3AF]">/5 ({total})</span>
        </div>
      </div>
      <p className="text-xs text-[#6B7280] mb-3">Évolution sur 6 mois</p>

      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={trend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 12 }}
            labelStyle={{ fontWeight: 600 }}
            formatter={(value: number) => [`${value}/5`, 'Note']}
          />
          <Line
            type="monotone"
            dataKey="note"
            stroke="#F59E0B"
            strokeWidth={2}
            dot={{ fill: '#F59E0B', strokeWidth: 0, r: 3 }}
            activeDot={{ r: 5, fill: '#F59E0B' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
