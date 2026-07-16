// @ts-nocheck
'use client'

import { Pill, Clock } from 'lucide-react'
import EmptyState from '../../../components/ui/EmptyState'

export default function PharmacyPage() {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
      <div className="text-center max-w-sm">
        <EmptyState
          icon={Pill}
          title="Pharmacie"
          description="L&apos;espace pharmacie vous permettra de consulter les médicaments, interactions et d&apos;envoyer des prescriptions directement aux pharmacies partenaires."
        />
        <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
          <Clock className="w-3.5 h-3.5" /> Fonctionnalité à venir
        </div>
      </div>
    </div>
  )
}
