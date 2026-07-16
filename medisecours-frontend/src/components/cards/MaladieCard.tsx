import Link from 'next/link'
import GravityBadge from '../ui/GravityBadge'
import UrgencyBadge from '../ui/UrgencyBadge'
import { CategoryIcon } from '../ui/CategoryIcon'

function CategoryLabel({ categorie }: { categorie: any }) {
  if (!categorie) return null
  return (
    <span
      className="mb-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${categorie.couleur || '#1E3A5F'}22`, color: categorie.couleur || '#1E3A5F' }}
    >
      <CategoryIcon iconName={categorie.icone} categoryName={categorie.nom} size="sm" />
      {categorie.nom}
    </span>
  )
}

export default function MaladieCard({ maladie }: { maladie: any }) {
  return (
    <Link
      href={`/maladies/${maladie.id}`}
      className="block rounded-2xl p-5 bg-white/80 dark:bg-primary-700/50 backdrop-blur-md border border-white/50 dark:border-white/10 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-display font-semibold text-primary-900 dark:text-sable leading-tight">{maladie.nom}</h3>
        {maladie.urgence && <UrgencyBadge>Urgent</UrgencyBadge>}
      </div>
      <CategoryLabel categorie={maladie.categorie} />
      <p className="text-sm text-primary-300 line-clamp-2 mb-3">{maladie.symptomes}</p>
      <div className="flex items-center gap-2">
        <GravityBadge level={maladie.niveauGravite} />
        {maladie.contagieux && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">Contagieux</span>
        )}
      </div>
    </Link>
  )
}
