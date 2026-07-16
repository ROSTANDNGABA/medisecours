'use client'

import { useCallback, useState } from 'react'
import { Power, PowerOff, Clock, MapPin } from 'lucide-react'
import api from '../../../api/axios'

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

export default function DashboardPresenceStatus({ user }: { user: any }) {
  const [online, setOnline] = useState(user?.estEnLigne ?? false)
  const [toggling, setToggling] = useState(false)

  const togglePresence = useCallback(async () => {
    if (!user?.id || toggling) return
    setToggling(true)
    const newStatus = !online
    try {
      await api.patch(`/api/users/${user.id}`, { estEnLigne: newStatus })
      setOnline(newStatus)
      // Update local storage as well
      const stored = localStorage.getItem('medisecours_user')
      if (stored) {
        const u = JSON.parse(stored)
        u.estEnLigne = newStatus
        localStorage.setItem('medisecours_user', JSON.stringify(u))
        window.dispatchEvent(new Event('medisecours-auth-change'))
      }
    } catch {
      // revert on error
    } finally {
      setToggling(false)
    }
  }, [user?.id, online, toggling])

  const dispos = user?.disponibilites as Array<{ jour: string; debut: string; fin: string }> | null | undefined
  const dispoTexte = user?.disponibilitesTexte as string | null | undefined

  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <h3 className="text-sm font-bold text-[#0F2C52] mb-1">Présence</h3>
      <p className="text-xs text-[#6B7280] mb-4">Statut & disponibilités</p>

      <button
        onClick={togglePresence}
        disabled={toggling}
        className={`flex w-full items-center gap-3 rounded-xl p-4 transition ${
          online ? 'bg-[#ECFDF5] hover:bg-[#D1FAE5]' : 'bg-[#F3F4F6] hover:bg-[#E5E7EB]'
        }`}
      >
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${online ? 'bg-[#10B981]/20' : 'bg-[#9CA3AF]/20'}`}>
          {online ? <Power className="h-5 w-5 text-[#10B981]" /> : <PowerOff className="h-5 w-5 text-[#9CA3AF]" />}
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-[#374151]">{online ? 'En ligne' : 'Hors ligne'}</p>
          <p className="text-xs text-[#6B7280]">Cliquez pour changer</p>
        </div>
        <span className={`flex h-3 w-3 rounded-full ${online ? 'bg-[#10B981]' : 'bg-[#9CA3AF]'}`}>
          {online && <span className="h-3 w-3 animate-ping rounded-full bg-[#10B981]/50" />}
        </span>
      </button>

      {/* Schedule */}
      {dispos && dispos.length > 0 && (
        <div className="mt-3 space-y-1">
          <p className="flex items-center gap-1 text-[11px] font-semibold text-[#6B7280]">
            <Clock className="h-3 w-3" /> Horaires
          </p>
          {dispos
            .sort((a, b) => JOURS.indexOf(a.jour) - JOURS.indexOf(b.jour))
            .map((d) => (
              <div key={d.jour} className="flex items-center justify-between text-[11px] text-[#374151]">
                <span className="capitalize">{d.jour}</span>
                <span className="font-medium">{d.debut} - {d.fin}</span>
              </div>
            ))}
        </div>
      )}

      {dispoTexte && !dispos && (
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[#6B7280]">
          <Clock className="h-3 w-3" /> {dispoTexte}
        </div>
      )}
    </div>
  )
}
