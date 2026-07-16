'use client'
import { Search, X } from 'lucide-react'

export default function SearchBar({ value, onChange, placeholder = 'Rechercher un symptôme…', size = 'md' }: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizeClasses = size === 'lg' ? 'py-4 text-base' : 'py-2.5 text-sm'
  return (
    <div className="relative w-full">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-300" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full ${sizeClasses} pl-12 pr-10 rounded-2xl bg-white/80 dark:bg-primary-700/60 backdrop-blur-md border border-white/50 dark:border-white/10 shadow-glass placeholder:text-primary-300 focus:outline-none focus:ring-2 focus:ring-mint-500 transition`}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-300 hover:text-urgence-500"
          aria-label="Effacer la recherche"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
