'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import { Star } from 'lucide-react'

const RATING_COLORS = ['#EF4444', '#F97316', '#F59E0B', '#22C55E', '#10B981']

export default function DashboardRatingsDistrib({ avis }: { avis: any[] }) {
  const { distrib, total } = useMemo(() => {
    const list = Array.isArray(avis) ? avis : []
    const counts = [0, 0, 0, 0, 0]
    list.forEach((a) => {
      if (a.note && a.note >= 1 && a.note <= 5) {
        counts[a.note - 1]++
      }
    })
    const total = list.length
    const distrib = counts.map((count, i) => ({
      stars: i + 1,
      count,
      pct: total > 0 ? +((count / total) * 100).toFixed(0) : 0,
      color: RATING_COLORS[i],
    })).reverse()
    return { distrib, total }
  }, [avis])

  if (total === 0) {
    return (
      <div className="rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <h3 className="text-sm font-bold text-[#0F2C52] mb-1">Distribution des notes</h3>
        <div className="flex h-[200px] items-center justify-center"><p className="text-sm text-[#9CA3AF]">Aucun avis</p></div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <h3 className="text-sm font-bold text-[#0F2C52] mb-1">Distribution des notes</h3>
      <p className="text-xs text-[#6B7280] mb-3">{total} avis reçus</p>

      <div className="space-y-2">
        {distrib.map((d) => (
          <div key={d.stars} className="flex items-center gap-2 text-xs">
            <div className="flex w-12 items-center gap-1 font-medium text-[#374151]">
              <Star className="h-3 w-3 text-amber-400" fill="currentColor" />
              {d.stars}
            </div>
            <div className="flex-1 h-2 rounded-full bg-[#F3F4F6]">
              <div className="h-2 rounded-full transition-all" style={{ width: `${d.pct}%`, backgroundColor: d.color }} />
            </div>
            <span className="w-8 text-right font-semibold text-[#0F2C52]">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
