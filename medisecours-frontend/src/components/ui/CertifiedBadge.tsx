import { Check } from 'lucide-react'

/**
 * Badge de certification bleu (style compte vérifié YouTube/TikTok).
 * Cercle bleu rempli avec une coche blanche.
 */
export default function CertifiedBadge({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[#1DA1F2] text-white ${className}`}
      title="Compte certifié"
      aria-label="Compte certifié"
    >
      <Check className="h-[58%] w-[58%]" strokeWidth={4} aria-hidden="true" />
    </span>
  )
}
