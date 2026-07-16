import { type ElementType, type ReactNode } from 'react'
import { FolderSearch } from 'lucide-react'

export default function EmptyState({ title = 'Rien à afficher', description = '', icon: Icon = FolderSearch, action = undefined }: {
  title?: string
  description?: string
  icon?: ElementType
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-700 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-primary-500 dark:text-mint-500" />
      </div>
      <h3 className="font-display font-semibold text-lg text-primary-900 dark:text-sable">{title}</h3>
      {description && <p className="text-sm text-primary-300 mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
