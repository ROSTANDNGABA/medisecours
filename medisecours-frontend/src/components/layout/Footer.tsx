import Link from 'next/link'
import { HeartPulse, Globe, Share2, Phone } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-primary-100 dark:border-white/5 bg-white/60 dark:bg-primary-900/60">
      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 sm:grid-cols-3 gap-8 text-sm">
        <div>
          <div className="flex items-center gap-2 font-display font-extrabold text-primary-500 dark:text-mint-500 mb-2">
            <HeartPulse className="w-5 h-5 text-urgence-500" />
            MediSecours+
          </div>
          <p className="text-primary-300">Les premiers gestes qui sauvent, partout au Cameroun.</p>
        </div>
        <div>
          <h4 className="font-semibold mb-2 text-primary-700 dark:text-sable">Navigation</h4>
          <ul className="space-y-1 text-primary-300">
            <li><Link href="/categories" className="hover:text-mint-500">Catégories</Link></li>
            <li><Link href="/maladies" className="hover:text-mint-500">Maladies</Link></li>
            <li><Link href="/centres" className="hover:text-mint-500">Centres de santé</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-2 text-primary-700 dark:text-sable">Contact</h4>
          <p className="flex items-center gap-2 text-primary-300 mb-2"><Phone className="w-4 h-4" /> Urgences : 165 / 166</p>
          <div className="flex gap-3 text-primary-300">
            <Globe className="w-5 h-5 hover:text-mint-500 cursor-pointer" />
            <Share2 className="w-5 h-5 hover:text-mint-500 cursor-pointer" />
          </div>
        </div>
      </div>
      <div className="text-center text-xs text-primary-300 pb-6">
        © {new Date().getFullYear()} MediSecours+. Tous droits réservés.
      </div>
    </footer>
  )
}
