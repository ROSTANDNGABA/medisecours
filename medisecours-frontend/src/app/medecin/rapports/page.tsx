// @ts-nocheck
'use client'

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { BarChart3, TrendingUp, Users, HeartPulse, CalendarCheck, Star, MessageSquare } from 'lucide-react'
import { fetcher } from '../../../lib/fetcher'
import { useAuth } from '../../../hooks/useAuth'
import LoadingSpinner from '../../../components/ui/LoadingSpinner'
import EmptyState from '../../../components/ui/EmptyState'

function idFromIri(value) {
  if (!value) return null
  if (typeof value === 'object') return value.id
  return value.split('/').pop()
}

export default function MedecinRapportsPage() {
  const { user } = useAuth()
  const { data: consData, isLoading: consLoading } = useSWR('/api/consultations', fetcher, { revalidateOnFocus: false })
  const { data: avisData, isLoading: avisLoading } = useSWR(user?.id ? `/api/avis?medecin=${user.id}` : null, fetcher, { revalidateOnFocus: false })
  const { data: msgData, isLoading: msgLoading } = useSWR('/api/messages', fetcher, { revalidateOnFocus: false })

  const consultations = useMemo(() => (Array.isArray(consData) ? consData : []), [consData])
  const avis = useMemo(() => (Array.isArray(avisData) ? avisData : []), [avisData])
  const messages = useMemo(() => (Array.isArray(msgData) ? msgData : []), [msgData])

  const stats = useMemo(() => {
    const patients = new Set(consultations.map((c) => idFromIri(c.patient)).filter(Boolean))
    const ouvertes = consultations.filter((c) => c.statut === 'OUVERTE').length
    const enCours = consultations.filter((c) => c.statut === 'EN_COURS').length
    const terminees = consultations.filter((c) => c.statut === 'TERMINEE').length
    const annulees = consultations.filter((c) => c.statut === 'ANNULEE').length
    const noteMoy = avis.length ? (avis.reduce((s, a) => s + a.note, 0) / avis.length).toFixed(1) : '—'
    const nonLus = messages.filter((m) => m.statut !== 'LU' && idFromIri(m.expediteur) !== user?.id).length

    const parMois = {}
    for (const c of consultations) {
      const mois = new Date(c.createdAt).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
      parMois[mois] = (parMois[mois] || 0) + 1
    }

    return {
      totalPatients: patients.size,
      totalConsultations: consultations.length,
      ouvertes, enCours, terminees, annulees,
      noteMoyenne: noteMoy,
      totalAvis: avis.length,
      nonLus,
      parMois: Object.entries(parMois).slice(-6),
      tauxCompletion: consultations.length ? Math.round((terminees / consultations.length) * 100) : 0,
    }
  }, [consultations, avis, messages, user?.id])

  if (consLoading || avisLoading || msgLoading) return <LoadingSpinner label="Chargement des rapports…" />

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <h2 className="font-display font-bold text-2xl text-primary-900 dark:text-sable">Rapports & Statistiques</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users, label: 'Patients uniques', value: stats.totalPatients, color: '#3B6EF8' },
          { icon: HeartPulse, label: 'Consultations', value: stats.totalConsultations, color: '#E84393' },
          { icon: TrendingUp, label: 'Taux complétion', value: `${stats.tauxCompletion}%`, color: '#00C2B8' },
          { icon: Star, label: 'Note moyenne', value: stats.noteMoyenne, color: '#F59E0B' },
        ].map(({ icon: Icon, label, value, color }, i) => (
          <div key={i} className="rounded-2xl bg-white dark:bg-primary-800 border border-primary-100 dark:border-white/5 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}20` }}>
                <Icon className="h-4.5 w-4.5" style={{ color }} />
              </div>
              <span className="text-xs font-medium text-primary-300">{label}</span>
            </div>
            <p className="font-display text-2xl font-bold text-primary-900 dark:text-sable">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-white dark:bg-primary-800 border border-primary-100 dark:border-white/5 p-5">
          <h3 className="text-sm font-bold text-primary-900 dark:text-sable mb-4">Statut des consultations</h3>
          {consultations.length > 0 ? (
            <div className="space-y-3">
              {[
                { label: 'Ouvertes', count: stats.ouvertes, color: '#3B6EF8' },
                { label: 'En cours', count: stats.enCours, color: '#00C2B8' },
                { label: 'Terminées', count: stats.terminees, color: '#10B981' },
                { label: 'Annulées', count: stats.annulees, color: '#EF4444' },
              ].map((s) => {
                const pct = stats.totalConsultations ? ((s.count / stats.totalConsultations) * 100).toFixed(1) : 0
                return (
                  <div key={s.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-primary-700 dark:text-sable">{s.label}</span>
                      <span className="font-semibold text-primary-900 dark:text-sable">{s.count} ({pct}%)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-primary-100 dark:bg-primary-900/60">
                      <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: s.color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState icon={BarChart3} title="Aucune donnée" description="Pas encore de consultations." />
          )}
        </div>

        <div className="rounded-2xl bg-white dark:bg-primary-800 border border-primary-100 dark:border-white/5 p-5">
          <h3 className="text-sm font-bold text-primary-900 dark:text-sable mb-4">Évolution des consultations</h3>
          {stats.parMois.length > 0 ? (
            <div className="space-y-3">
              {stats.parMois.map(([mois, count]) => {
                const max = Math.max(...stats.parMois.map(([, c]) => c), 1)
                const pct = (count / max) * 100
                return (
                  <div key={mois}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-primary-700 dark:text-sable capitalize">{mois}</span>
                      <span className="font-semibold text-primary-900 dark:text-sable">{count}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-primary-100 dark:bg-primary-900/60">
                      <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: '#3B6EF8' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState icon={CalendarCheck} title="Aucune donnée" description="Pas encore de consultations mensuelles." />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white dark:bg-primary-800 border border-primary-100 dark:border-white/5 p-5 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
            <Star className="h-6 w-6 text-amber-500" />
          </div>
          <div>
            <p className="text-xs font-medium text-primary-300">Avis reçus</p>
            <p className="font-display text-xl font-bold text-primary-900 dark:text-sable">{stats.totalAvis}</p>
            <p className="text-xs text-primary-300">Note moyenne: {stats.noteMoyenne}/5</p>
          </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-primary-800 border border-primary-100 dark:border-white/5 p-5 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
            <MessageSquare className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <p className="text-xs font-medium text-primary-300">Messages non lus</p>
            <p className="font-display text-xl font-bold text-primary-900 dark:text-sable">{stats.nonLus}</p>
            <p className="text-xs text-primary-300">sur {messages.length} messages</p>
          </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-primary-800 border border-primary-100 dark:border-white/5 p-5 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
            <Users className="h-6 w-6 text-emerald-500" />
          </div>
          <div>
            <p className="text-xs font-medium text-primary-300">Consultations/mois</p>
            <p className="font-display text-xl font-bold text-primary-900 dark:text-sable">
              {stats.totalConsultations ? Math.round(stats.totalConsultations / Math.max(stats.parMois.length, 1)) : 0}
            </p>
            <p className="text-xs text-primary-300">Moyenne mensuelle</p>
          </div>
        </div>
      </div>
    </div>
  )
}
