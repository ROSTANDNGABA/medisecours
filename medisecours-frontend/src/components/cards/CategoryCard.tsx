import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { CategoryIcon } from '../ui/CategoryIcon'

export default function CategoryCard({ category }: { category: any }) {
  const count = category.maladies?.length ?? 0
  const bg = `${category.couleur || '#1E3A5F'}14`
  return (
    <Link
      href={`/categories/${category.id}`}
      className="group relative overflow-hidden rounded-2xl p-6 border border-white/40 dark:border-white/10 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
      style={{ backgroundColor: bg }}
    >
      <div
        className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-20 group-hover:scale-125 transition-transform duration-500"
        style={{ backgroundColor: category.couleur || '#1E3A5F' }}
      />
      <div className="relative">
        <div className="mb-3">
          <CategoryIcon iconName={category.icone} categoryName={category.nom} size="md" />
        </div>
        <h3 className="font-display font-bold text-lg text-primary-900 dark:text-sable mb-1">{category.nom}</h3>
        <p className="text-sm text-primary-300 line-clamp-2 mb-4">{category.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/70 dark:bg-primary-700/60 text-primary-700 dark:text-sable">
            {count} maladie{count > 1 ? 's' : ''}
          </span>
          <ArrowUpRight className="w-4 h-4 text-primary-300 group-hover:text-mint-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
        </div>
      </div>
    </Link>
  )
}
