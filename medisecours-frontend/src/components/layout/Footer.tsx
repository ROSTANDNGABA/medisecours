'use client'

import Link from 'next/link'
import { HeartPulse, ArrowRight, MapPin } from 'lucide-react'
import { useAuthContext } from '../../contexts/AuthContext'

export default function Footer() {
  const { isAuthenticated } = useAuthContext()

  return (
    <footer className="w-full bg-white dark:bg-[#111827] border-t border-slate-100 dark:border-white/5 mt-10">
      <div className="max-w-7xl mx-auto px-6 py-12 sm:py-16 lg:py-20">
        
        {/* --- TOP SECTION: Main CTA --- */}
        <div className="text-center mb-16 pb-16 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl text-slate-900 dark:text-white tracking-tight mb-6">
            Chaque seconde compte.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">
              Agissez maintenant.
            </span>
          </h2>

          <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            MediSecours+ met à votre disposition un réseau de médecins certifiés, des protocoles validés et une infrastructure temps réel pour vous accompagner dans les moments les plus critiques.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={isAuthenticated ? '/patient/consultations' : '/register'}
              className="group inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full bg-slate-900 dark:bg-emerald-500 text-white font-bold text-sm hover:bg-slate-800 dark:hover:bg-emerald-600 transition-colors"
            >
              {isAuthenticated ? 'Ouvrir une consultation' : 'Créer un compte gratuit'}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/centres"
              className="group inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Trouver un centre
            </Link>
          </div>
        </div>

        {/* --- BOTTOM SECTION: Newsletter & Links --- */}
        <div className="flex flex-col xl:flex-row gap-12 xl:gap-32 mb-16">
           {/* Left Column: Logo + Newsletter */}
           <div className="w-full xl:w-[380px] shrink-0">
             {/* Logo */}
             <Link href="/" className="inline-flex items-center gap-2 font-display font-extrabold text-2xl text-slate-900 dark:text-white mb-8">
               <HeartPulse className="w-6 h-6 text-emerald-500" />
               MediSecours
             </Link>
             
             <p className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
               Inscrivez-vous pour recevoir des conseils santé.
             </p>
             
             {/* Newsletter Input */}
             <form className="relative mb-5">
               <input 
                 type="email" 
                 placeholder="Votre email" 
                 className="w-full rounded-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 py-3.5 pl-5 pr-[110px] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-slate-900 dark:text-white"
               />
               <button 
                 type="button" 
                 className="absolute right-1.5 top-1.5 bottom-1.5 px-6 rounded-full bg-slate-900 dark:bg-emerald-500 text-white font-semibold text-sm hover:bg-slate-800 dark:hover:bg-emerald-600 transition-colors"
               >
                 Valider
               </button>
             </form>

             <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pr-4">
               En vous inscrivant, vous acceptez notre Politique de confidentialité et consentez à recevoir des mises à jour de notre plateforme.
             </p>
           </div>

           {/* Right Columns: Links */}
           <div className="flex-1 grid grid-cols-2 md:grid-cols-2 gap-8">
              {/* Col 1 */}
              <div>
                <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-6">Services</h4>
                <ul className="space-y-4 text-sm text-slate-500 dark:text-slate-400">
                  <li><Link href="/centres" className="hover:text-emerald-500 transition-colors">Centres de santé</Link></li>
                </ul>
              </div>
              
              {/* Col 2 */}
              <div>
                <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-6">Apprendre</h4>
                <ul className="space-y-4 text-sm text-slate-500 dark:text-slate-400">
                  <li><Link href="/maladies" className="hover:text-emerald-500 transition-colors">Gestes de secours</Link></li>
                  <li><Link href="/categories" className="hover:text-emerald-500 transition-colors">Catégories médicales</Link></li>
                </ul>
              </div>
           </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-100 dark:border-white/10 text-center">
           <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
             © {new Date().getFullYear()} MediSecours+, Tous droits réservés.
           </p>
        </div>

      </div>
    </footer>
  )
}
