'use client'

import React, { useMemo } from 'react'
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar
} from 'recharts'
import type { DashboardData, StatutConsultation } from '../../../types/api'

const STATUS_COLORS: Record<string, string> = {
  OUVERTE: '#3B6EF8',
  EN_COURS: '#F59E0B',
  TERMINEE: '#10B981',
  ANNULEE: '#EF4444',
}

const STATUS_LABELS: Record<string, string> = {
  OUVERTE: 'Ouverte',
  EN_COURS: 'En cours',
  TERMINEE: 'Terminée',
  ANNULEE: 'Annulée',
}

export default function DashboardAnalytics({ data }: { data: DashboardData | undefined }) {
  if (!data) return null

  // 1. Timeline Data (Area Chart)
  const timelineData = useMemo(() => {
    const full = Array.isArray(data.timeline) ? data.timeline : []
    const sliced = full.slice(-14) // 14 derniers jours
    return sliced.map((p) => ({
      date: new Date(p.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      consultations: p.count,
    }))
  }, [data.timeline])

  // 2. Status Data (Donut Chart)
  const statusData = useMemo(() => {
    const counts = data.statusCounts ?? {}
    return Object.keys(counts).map(key => ({
      name: STATUS_LABELS[key] || key,
      value: counts[key as StatutConsultation] || 0,
      color: STATUS_COLORS[key] || '#9CA3AF'
    })).filter(item => item.value > 0)
  }, [data.statusCounts])

  // 3. Blood Type Data (Radar Chart)
  const bloodData = useMemo(() => {
    const dist = data.bloodDistribution ?? {}
    return Object.keys(dist).map(key => ({
      groupe: key,
      patients: dist[key]
    }))
  }, [data.bloodDistribution])

  // 4. Ratings Data (Bar Chart)
  const ratingsData = useMemo(() => {
    const dist = data.ratingsDistribution ?? {}
    return [1, 2, 3, 4, 5].map(star => ({
      etoiles: `${star} ⭐`,
      avis: dist[star] || 0
    }))
  }, [data.ratingsDistribution])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-6">
        
        {/* --- Courbe d'évolution (Area Chart) --- */}
        <div className="rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <h3 className="text-sm font-bold text-[#0F2C52] mb-1">Évolution des consultations</h3>
          <p className="text-xs text-[#6B7280] mb-6">Volume sur les 14 derniers jours</p>
          
          <div className="h-[240px] w-full">
            {timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorConsults" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="consultations" 
                    name="Consultations"
                    stroke="#4F46E5" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorConsults)" 
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-[#9CA3AF]">Aucune donnée récente</div>
            )}
          </div>
        </div>

        {/* --- Répartition des statuts (Donut Chart) --- */}
        <div className="rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <h3 className="text-sm font-bold text-[#0F2C52] mb-1">Répartition par statut</h3>
          <p className="text-xs text-[#6B7280] mb-2">Toutes les consultations</p>
          
          <div className="h-[240px] w-full relative">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    animationDuration={1500}
                    animationBegin={200}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontWeight: 600 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-[#9CA3AF]">Aucune donnée</div>
            )}
            
            {/* Custom Legend */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none">
               <span className="text-2xl font-bold text-[#0F2C52]">
                 {statusData.reduce((acc, curr) => acc + curr.value, 0)}
               </span>
               <span className="text-[10px] text-[#6B7280]">Total</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* --- Groupes Sanguins (Radar Chart) --- */}
        <div className="rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <h3 className="text-sm font-bold text-[#0F2C52] mb-1">Profil sanguin</h3>
          <p className="text-xs text-[#6B7280] mb-2">Répartition des patients</p>
          
          <div className="h-[220px] w-full">
            {bloodData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={bloodData}>
                  <PolarGrid stroke="#F3F4F6" />
                  <PolarAngleAxis dataKey="groupe" tick={{ fill: '#4F46E5', fontSize: 11, fontWeight: 600 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                  <Radar
                    name="Patients"
                    dataKey="patients"
                    stroke="#F43F5E"
                    strokeWidth={2}
                    fill="#F43F5E"
                    fillOpacity={0.3}
                    animationDuration={1500}
                  />
                  <RechartsTooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-[#9CA3AF]">Aucune donnée</div>
            )}
          </div>
        </div>

        {/* --- Satisfaction (Bar Chart vertical) --- */}
        <div className="rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <h3 className="text-sm font-bold text-[#0F2C52] mb-1">Satisfaction patient</h3>
          <p className="text-xs text-[#6B7280] mb-4">Distribution des avis reçus</p>
          
          <div className="h-[220px] w-full">
            {ratingsData.some(d => d.avis > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ratingsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="etoiles" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 500 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} allowDecimals={false} />
                  <RechartsTooltip 
                    cursor={{ fill: '#F3F4F6' }}
                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar 
                    dataKey="avis" 
                    name="Avis"
                    fill="#FBBF24" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={40}
                    animationDuration={1500}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-[#9CA3AF]">Aucun avis</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
