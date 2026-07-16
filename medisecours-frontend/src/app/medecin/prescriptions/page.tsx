// @ts-nocheck
'use client'

import { FileText, Clock } from 'lucide-react'
import EmptyState from '../../../components/ui/EmptyState'

export default function PrescriptionsPage() {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
      <div className="text-center max-w-sm">
        <EmptyState
          icon={FileText}
          title="Prescriptions"
          description="La gestion des prescriptions sera bientôt disponible. Vous pourrez créer et gérer les ordonnances de vos patients directement depuis cette interface."
        />
        <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
          <Clock className="w-3.5 h-3.5" /> Fonctionnalité à venir
        </div>
      </div>
    </div>
  )
}
