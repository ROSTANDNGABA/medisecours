'use client'

const COLORS = ['bg-primary-500', 'bg-mint-500', 'bg-purple-500', 'bg-orange-400', 'bg-pink-500']

export default function Avatar({ name, size = 'md', src }: {
  name?: string
  size?: 'sm' | 'md' | 'lg'
  src?: string | null
}) {
  const initials = name?.split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?'
  const colorIndex = name ? name.charCodeAt(0) % COLORS.length : 0
  const sizeClasses: Record<string, string> = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg' }

  if (src) {
    return (
      <img
        src={src}
        alt={name || ''}
        className={`${sizeClasses[size]} rounded-full object-cover shrink-0`}
      />
    )
  }

  return (
    <div className={`${COLORS[colorIndex]} ${sizeClasses[size]} rounded-full flex items-center justify-center text-white font-bold shrink-0`}>
      {initials}
    </div>
  )
}
