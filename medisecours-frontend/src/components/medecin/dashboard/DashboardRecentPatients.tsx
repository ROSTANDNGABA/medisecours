'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, Stethoscope, Phone, Mail } from 'lucide-react'
import Avatar from '../../ui/Avatar'

function idFromIri(value: any): string | null {
  if (!value) return null
  if (typeof value === 'object') return value.id || value['@id']?.split('/').pop() || null
  return value.split('/').pop()
}

export default function DashboardRecentPatients({ consultations }: { consultations: any[] }) {
  const router = useRouter()

  const patients = useMemo(() => {
    const list = Array.isArray(consultations) ? consultations : []
    const map = new Map<string, any>()

    list
      .filter((c) => c.patient)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .forEach((c) => {
        const pid = idFromIri(c.patient)
        if (pid && !map.has(pid)) {
          map.set(pid, {
            id: pid,
            nom: c.patient?.prenom || '',
            prenom: c.patient?.nom || '',
            telephone: c.patient?.telephone || '',
            email: c.patient?.email || '',
            lastVisit: c.createdAt,
            statut: c.statut,
          })
        }
      })

    return Array.from(map.values()).slice(0, 5)
  }, [consultations])

  if (patients.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <h3 className="text-sm font-bold text-[#0F2C52] mb-1">Patients récents</h3>
        <div className="flex h-[240px] items-center justify-center"><p className="text-sm text-[#9CA3AF]">Aucun patient</p></div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <h3 className="text-sm font-bold text-[#0F2C52] mb-1">Patients récents</h3>
      <p className="text-xs text-[#6B7280] mb-4">Derniers patients consultés</p>

      <div className="space-y-1">
        {patients.map((p, i) => (
          <div
            key={p.id}
            className="flex items-center gap-3 rounded-xl p-2.5 transition hover:bg-[#F9FAFB]"
          >
            <Avatar name={`${p.prenom || ''} ${p.nom || ''}`.trim()} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#0F2C52] truncate">
                {p.prenom} {p.nom}
              </p>
              <p className="text-[11px] text-[#9CA3AF]">
                {p.lastVisit
                  ? new Date(p.lastVisit).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                  : '—'}
                {p.telephone ? ` · ${p.telephone}` : ''}
              </p>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => router.push(`/medecin/consultations?patient=${p.id}`)}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#3B6EF8] hover:bg-[#DBEAFE] transition"
                title="Nouvelle consultation"
              >
                <Stethoscope className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => router.push(`/medecin/messages?patient=${p.id}`)}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ECFDF5] text-[#10B981] hover:bg-[#D1FAE5] transition"
                title="Envoyer un message"
              >
                <MessageSquare className="h-3.5 w-3.5" />
              </button>
              {p.telephone && (
                <a
                  href={`tel:${p.telephone}`}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FFFBEB] text-[#F59E0B] hover:bg-[#FEF3C7] transition"
                  title="Appeler"
                >
                  <Phone className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
