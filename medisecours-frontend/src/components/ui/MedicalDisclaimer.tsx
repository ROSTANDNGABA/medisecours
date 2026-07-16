import { AlertTriangle } from 'lucide-react'

export default function MedicalDisclaimer({ variant = 'inline' }: {
  variant?: 'inline' | 'banner'
}) {
  if (variant === 'banner') {
    return (
      <div className="w-full bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-700/40 px-4 py-2">
        <p className="max-w-6xl mx-auto text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          MediSecours+ fournit des informations médicales générales.
          En cas d&apos;urgence, appelez le <strong>119</strong> (SAMU Cameroun).
          Cette application ne remplace pas un avis médical professionnel.
        </p>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <p>
        <strong>Avertissement médical</strong> — Les informations présentées sont indicatives et ne
        remplacent pas un diagnostic ou un avis médical professionnel. En cas de doute ou d&apos;urgence,
        consultez immédiatement un médecin ou appelez le <strong>119</strong>.
      </p>
    </div>
  )
}
