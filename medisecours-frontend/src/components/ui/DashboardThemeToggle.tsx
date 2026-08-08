'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'

export default function DashboardThemeToggle() {
  const { dark, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="dashboard-icon-button"
      aria-label={dark ? 'Activer le thème clair' : 'Activer le thème sombre'}
      title={dark ? 'Thème clair' : 'Thème sombre'}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}
