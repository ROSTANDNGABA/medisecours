'use client'

import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

type Range = 7 | 14 | 30

export default function DashboardTimeline({ consultations, messages }: { consultations: any[]; messages: any[] }) {
  const [range, setRange] = useState<Range>(7)

  const data = useMemo(() => {
    const cons = Array.isArray(consultations) ? consultations : []
    const msgs = Array.isArray(messages) ? messages : []
    const now = Date.now()
    const days: Record<string, { consultations: number; messages: number }> = {}

    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(now - i * 86400000)
      const key = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
      days[key] = { consultations: 0, messages: 0 }
    }

    cons.forEach((c) => {
      if (!c.createdAt) return
      const diff = Math.floor((now - new Date(c.createdAt).getTime()) / 86400000)
      if (diff >= 0 && diff < range) {
        const key = new Date(c.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
        if (days[key]) days[key].consultations++
      }
    })

    msgs.forEach((m) => {
      if (!m.createdAt) return
      const diff = Math.floor((now - new Date(m.createdAt).getTime()) / 86400000)
      if (diff >= 0 && diff < range) {
        const key = new Date(m.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
        if (days[key]) days[key].messages++
      }
    })

    return Object.entries(days).map(([date, vals]) => ({ date, ...vals }))
  }, [consultations, messages, range])

  if (data.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <h3 className="text-sm font-bold text-[#0F2C52] mb-1">Activité récente</h3>
        <div className="flex h-[240px] items-center justify-center"><p className="text-sm text-[#9CA3AF]">Aucune donnée</p></div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-[#0F2C52]">Activité récente</h3>
          <p className="text-xs text-[#6B7280]">Consultations et messages</p>
        </div>
        <div className="flex gap-1">
          {([7, 14, 30] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition ${
                range === r ? 'bg-[#3B6EF8] text-white' : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]'
              }`}
            >
              {r}j
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barCategoryGap={4} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{ borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 12 }}
            labelStyle={{ fontWeight: 600 }}
          />
          <Bar dataKey="consultations" name="Consultations" fill="#3B6EF8" radius={[4, 4, 0, 0]} maxBarSize={16} />
          <Bar dataKey="messages" name="Messages" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
