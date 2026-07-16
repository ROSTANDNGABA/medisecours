'use client'

import { useMemo } from 'react'

export default function DashboardMotifsCloud({ consultations }: { consultations: any[] }) {
  const cloud = useMemo(() => {
    const list = Array.isArray(consultations) ? consultations : []
    const freq: Record<string, number> = {}

    list.forEach((c) => {
      if (!c.motif || typeof c.motif !== 'string') return
      c.motif
        .toLowerCase()
        .split(/[\s,;]+/)
        .filter((w: string) => w.length > 3)
        .forEach((w: string) => {
          freq[w] = (freq[w] || 0) + 1
        })
    })

    const entries = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)

    if (entries.length === 0) return []

    const maxCount = entries[0][1]
    const minCount = entries[entries.length - 1][1]
    const range = maxCount - minCount || 1

    return entries.map(([word, count]) => ({
      word,
      count,
      size: 0.65 + ((count - minCount) / range) * 0.85,
    }))
  }, [consultations])

  if (cloud.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <h3 className="text-sm font-bold text-[#0F2C52] mb-1">Motifs de consultation</h3>
        <div className="flex h-[200px] items-center justify-center"><p className="text-sm text-[#9CA3AF]">Aucun motif</p></div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <h3 className="text-sm font-bold text-[#0F2C52] mb-1">Motifs de consultation</h3>
      <p className="text-xs text-[#6B7280] mb-3">Mots-clés les plus fréquents</p>
      <div className="flex flex-wrap items-center gap-2.5">
        {cloud.map(({ word, count, size }) => (
          <span
            key={word}
            className="inline-block rounded-full bg-[#EFF6FF] px-3 py-1 text-[#3B6EF8] hover:bg-[#DBEAFE] transition cursor-default"
            style={{ fontSize: `${size}rem`, fontWeight: size > 1 ? 700 : 500 }}
            title={`${count} consultation(s)`}
          >
            {word}
            <span className="ml-1 text-[10px] text-[#6B7280]">{count}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
