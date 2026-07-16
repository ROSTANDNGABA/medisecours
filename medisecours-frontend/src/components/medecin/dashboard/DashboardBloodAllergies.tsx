'use client'

import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

const BLOOD_COLORS: Record<string, string> = {
  'A+': '#3B6EF8',
  'A-': '#6B8FF8',
  'B+': '#F59E0B',
  'B-': '#F0B84D',
  'AB+': '#10B981',
  'AB-': '#34D399',
  'O+': '#EF4444',
  'O-': '#F87171',
}

export default function DashboardBloodAllergies({ consultations }: { consultations: any[] }) {
  const { bloodData, allergyData } = useMemo(() => {
    const list = Array.isArray(consultations) ? consultations : []
    const bloodCount: Record<string, number> = {}
    const allergyCount: Record<string, number> = {}
    const seen = new Set<string>()

    list.forEach((c) => {
      const p = c.patient
      if (!p) return

      // Avoid counting same patient multiple times using their IRI or id
      const patientId = p['@id'] || p.id
      if (seen.has(patientId)) return
      seen.add(patientId)

      if (p.groupeSanguin) {
        bloodCount[p.groupeSanguin] = (bloodCount[p.groupeSanguin] || 0) + 1
      }

      if (Array.isArray(p.allergies)) {
        p.allergies.forEach((a: string) => {
          if (a && typeof a === 'string') {
            allergyCount[a] = (allergyCount[a] || 0) + 1
          }
        })
      }
    })

    const bloodChart = Object.entries(bloodCount)
      .map(([name, value]) => ({ name, value, color: BLOOD_COLORS[name] || '#9CA3AF' }))
      .sort((a, b) => b.value - a.value)

    const allergyList = Object.entries(allergyCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return { bloodData: bloodChart, allergyData: allergyList }
  }, [consultations])

  const hasBloodData = bloodData.length > 0
  const hasAllergyData = allergyData.length > 0

  if (!hasBloodData && !hasAllergyData) {
    return (
      <div className="rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <h3 className="text-sm font-bold text-[#0F2C52] mb-1">Patients</h3>
        <div className="flex h-[240px] items-center justify-center"><p className="text-sm text-[#9CA3AF]">Aucune donnée patient</p></div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <h3 className="text-sm font-bold text-[#0F2C52] mb-1">Groupes sanguins & allergies</h3>
      <p className="text-xs text-[#6B7280] mb-4">Profil des patients</p>

      <div className="grid grid-cols-2 gap-4">
        {/* Blood types */}
        <div>
          {hasBloodData ? (
            <>
              <ResponsiveContainer width="100%" height={100}>
                <PieChart>
                  <Pie data={bloodData} cx="50%" cy="50%" innerRadius={28} outerRadius={44} paddingAngle={2} dataKey="value" stroke="none">
                    {bloodData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-1">
                {bloodData.map((b) => (
                  <div key={b.name} className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5 text-[#374151]">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: b.color }} />
                      {b.name}
                    </span>
                    <span className="font-semibold text-[#0F2C52]">{b.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-[140px] items-center justify-center text-xs text-[#9CA3AF]">Aucun groupe sanguin</div>
          )}
        </div>

        {/* Allergies */}
        <div>
          <p className="text-[11px] font-semibold text-[#374151] mb-2">Top allergies</p>
          {hasAllergyData ? (
            <div className="space-y-2">
              {allergyData.map((a) => (
                <div key={a.name}>
                  <div className="flex items-center justify-between text-[11px] mb-0.5">
                    <span className="text-[#374151] truncate">{a.name}</span>
                    <span className="font-semibold text-[#0F2C52]">{a.count}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[#F3F4F6]">
                    <div
                      className="h-1.5 rounded-full bg-[#EF4444]"
                      style={{ width: `${Math.min(100, (a.count / Math.max(...allergyData.map((x) => x.count))) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-[130px] items-center justify-center text-xs text-[#9CA3AF]">Aucune allergie</div>
          )}
        </div>
      </div>
    </div>
  )
}
