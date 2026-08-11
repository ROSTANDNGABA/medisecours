import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  Bell,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  HeartPulse,
  MailCheck,
  MapPin,
  MessageCircle,
  Search,
  ShieldAlert,
  Stethoscope,
  UserCheck,
  UserRound,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Guide d’utilisation | MediSecours',
  description: 'Guide public pour utiliser MediSecours comme visiteur, patient ou médecin.',
}

const visitorSteps = [
  {
    icon: HeartPulse,
    title: 'Consulter les premiers soins',
    description:
      'Recherchez une situation, ouvrez la fiche correspondante et suivez les gestes indiqués dans l’ordre. Consultez aussi les actions à éviter et le niveau d’urgence.',
    links: [{ href: '/premiers-soins', label: 'Voir les premiers soins' }],
  },
  {
    icon: Search,
    title: 'S’orienter à partir des symptômes',
    description:
      'Décrivez les signes observés pour obtenir une orientation et identifier le niveau de prise en charge adapté. Cette fonction ne remplace pas un diagnostic médical.',
    links: [{ href: '/maladies', label: 'Commencer l’orientation' }],
  },
  {
    icon: MapPin,
    title: 'Trouver un centre de santé',
    description:
      'Recherchez les établissements disponibles, filtrez-les selon votre besoin et utilisez leur localisation pour préparer votre déplacement.',
    links: [{ href: '/centres', label: 'Trouver un centre' }],
  },
  {
    icon: Stethoscope,
    title: 'Découvrir les médecins',
    description:
      'Consultez les profils professionnels, les spécialités et les disponibilités. Un compte patient sera demandé uniquement au moment d’envoyer une demande de consultation.',
    links: [{ href: '/medecins', label: 'Voir les médecins' }],
  },
]

const patientSteps = [
  {
    icon: UserRound,
    title: 'Créer votre compte patient',
    description:
      'Renseignez votre identité, votre adresse e-mail et un mot de passe robuste. Les informations médicales facultatives peuvent être ajoutées maintenant ou plus tard depuis votre profil.',
    links: [{ href: '/register', label: 'Créer un compte' }],
  },
  {
    icon: MailCheck,
    title: 'Confirmer votre adresse e-mail',
    description:
      'Ouvrez le message reçu après l’inscription et cliquez sur le lien de confirmation. Vérifiez vos courriers indésirables si le message n’apparaît pas.',
  },
  {
    icon: CalendarClock,
    title: 'Demander et suivre une consultation',
    description:
      'Choisissez un médecin, décrivez votre besoin puis suivez l’état de la demande : en attente, en cours, terminée ou annulée.',
    links: [
      { href: '/medecins', label: 'Choisir un médecin' },
      { href: '/patient/consultations', label: 'Mes consultations' },
    ],
  },
  {
    icon: MessageCircle,
    title: 'Échanger avec le médecin',
    description:
      'Lorsque la consultation est acceptée, utilisez la conversation associée pour envoyer vos messages et les documents utiles à la prise en charge.',
    links: [{ href: '/messages', label: 'Ma messagerie' }],
  },
  {
    icon: Bell,
    title: 'Consulter les notifications et le suivi',
    description:
      'Les notifications vous signalent les nouveaux messages et les changements concernant vos consultations. Ouvrir l’élément concerné marque l’information comme consultée.',
    links: [{ href: '/notifications', label: 'Mes notifications' }],
  },
  {
    icon: ShieldAlert,
    title: 'Signaler un comportement',
    description:
      'Depuis le profil d’un médecin, utilisez le bouton de signalement, choisissez un motif et décrivez les faits avec précision. Vous pourrez retrouver le signalement et sa réponse dans votre profil.',
    links: [{ href: '/profil', label: 'Voir mes signalements' }],
  },
]

const doctorSteps = [
  {
    icon: FileCheck2,
    title: 'Créer un profil professionnel complet',
    description:
      'Choisissez le compte médecin, indiquez votre spécialité et votre numéro d’ordre, puis fournissez les justificatifs demandés.',
    details: [
      'CNI : photo lisible du recto et du verso.',
      'Passeport : photo lisible de la page d’identité.',
      'Photo récente du visage, de face, nette et sans filtre.',
    ],
    links: [{ href: '/register', label: 'Créer un compte médecin' }],
  },
  {
    icon: UserCheck,
    title: 'Attendre l’activation du profil',
    description:
      'Après la confirmation de votre adresse e-mail, votre profil passe par une vérification de conformité. Vous recevez un message lorsque l’accès professionnel est activé.',
  },
  {
    icon: CalendarClock,
    title: 'Traiter les demandes de consultation',
    description:
      'Consultez le motif transmis par le patient, puis acceptez ou refusez la demande. Les filtres permettent de retrouver rapidement les consultations selon leur état.',
    links: [{ href: '/medecin/consultations', label: 'Mes consultations' }],
  },
  {
    icon: MessageCircle,
    title: 'Conduire les échanges',
    description:
      'Utilisez la messagerie liée à la consultation pour recueillir les informations nécessaires et transmettre vos indications au patient.',
    links: [{ href: '/medecin/messages', label: 'Messagerie médecin' }],
  },
  {
    icon: ClipboardList,
    title: 'Documenter la prise en charge',
    description:
      'Ajoutez les prescriptions et les rapports nécessaires. La rubrique Mes patients contient uniquement les personnes avec lesquelles une consultation a été réalisée.',
    links: [
      { href: '/medecin/rapports', label: 'Rapports' },
      { href: '/medecin/patients', label: 'Mes patients' },
    ],
  },
]

const faq = [
  {
    question: 'Faut-il un compte pour consulter les premiers soins ?',
    answer:
      'Non. Les premiers soins, l’orientation, les centres de santé et la liste des médecins sont accessibles sans inscription.',
  },
  {
    question: 'Pourquoi mon compte médecin n’est-il pas accessible immédiatement ?',
    answer:
      'Les profils professionnels passent par une vérification de conformité avant leur activation afin de protéger les patients et les professionnels.',
  },
  {
    question: 'Que faire si je ne reçois pas l’e-mail de confirmation ?',
    answer:
      'Vérifiez les courriers indésirables, confirmez que l’adresse saisie est correcte puis utilisez l’option de renvoi proposée sur la page de connexion.',
  },
  {
    question: 'Que faire si j’oublie mon mot de passe ?',
    answer:
      'Utilisez le lien Mot de passe oublié sur la page de connexion et suivez les instructions reçues par e-mail.',
  },
  {
    question: 'Comment signaler un médecin ?',
    answer:
      'Ouvrez sa fiche, sélectionnez Signaler, choisissez le motif et décrivez les faits. Le suivi de votre signalement apparaît ensuite dans votre profil.',
  },
  {
    question: 'Que faire en cas de danger immédiat ?',
    answer:
      'Appelez les services d’urgence sans attendre une réponse dans la messagerie ou une consultation en ligne.',
  },
]

const navigation = [
  { href: '#visiteur', label: 'Visiteur' },
  { href: '#patient', label: 'Patient' },
  { href: '#medecin', label: 'Médecin' },
  { href: '#questions', label: 'Questions fréquentes' },
]

export default function GuideUtilisationPage() {
  return (
    <main className="bg-white dark:bg-slate-950">
      <section className="border-b border-slate-200 bg-slate-950 py-16 text-white dark:border-white/10 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">
            Guide d’utilisation
          </p>
          <h1 className="mt-3 max-w-4xl font-display text-4xl font-bold leading-tight sm:text-5xl">
            Utiliser MediSecours, étape par étape.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
            Retrouvez uniquement les informations nécessaires pour utiliser la plateforme comme visiteur, patient ou médecin.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            {navigation.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="inline-flex min-h-11 items-center justify-center gap-2 border border-white/25 bg-white/10 px-5 text-sm font-bold text-white transition hover:bg-white/20"
              >
                {item.label}
                <ArrowRight className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-red-200 bg-red-50 py-5 dark:border-red-500/20 dark:bg-red-500/10">
        <div className="mx-auto flex max-w-6xl items-start gap-3 px-4 sm:px-6">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-300" />
          <div>
            <p className="text-sm font-bold text-red-950 dark:text-red-100">
              En cas de danger vital, contactez d’abord les services d’urgence.
            </p>
            <p className="mt-1 text-sm leading-6 text-red-800 dark:text-red-200">
              N’attendez pas une réponse dans la messagerie et ne remplissez pas un formulaire avant d’appeler.
            </p>
          </div>
        </div>
      </section>

      <GuideSection
        id="visiteur"
        kicker="Sans compte"
        title="Découvrir la plateforme comme visiteur"
        description="Ces services sont disponibles immédiatement, sans création de compte."
        steps={visitorSteps}
        color="blue"
      />

      <GuideSection
        id="patient"
        kicker="Espace patient"
        title="Demander une consultation et conserver son suivi"
        description="Le compte patient permet de contacter un médecin et de retrouver ses échanges."
        steps={patientSteps}
        color="violet"
        alternate
      />

      <GuideSection
        id="medecin"
        kicker="Espace médecin"
        title="Prendre en charge les demandes et suivre ses patients"
        description="Le compte médecin regroupe les consultations, les messages et les documents de suivi."
        steps={doctorSteps}
        color="emerald"
      />

      <section id="questions" className="scroll-mt-24 border-t border-slate-200 bg-slate-50 py-12 dark:border-white/10 dark:bg-slate-900 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700 dark:text-violet-300">
            Aide
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold text-slate-950 dark:text-white">
            Questions fréquentes
          </h2>
          <div className="mt-7 grid gap-x-10 border-y border-slate-200 dark:border-white/10 md:grid-cols-2">
            {faq.map((item) => (
              <article
                key={item.question}
                className="border-b border-slate-200 py-5 last:border-b-0 dark:border-white/10 md:[&:nth-last-child(-n+2)]:border-b-0"
              >
                <h3 className="text-sm font-bold text-slate-950 dark:text-white">{item.question}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.answer}</p>
              </article>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-4 border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-violet-600 dark:text-violet-300" />
              <div>
                <p className="text-sm font-bold text-slate-950 dark:text-white">
                  Vous avez terminé le guide.
                </p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Revenez à l’accueil pour choisir le service correspondant à votre situation.
                </p>
              </div>
            </div>
            <Link
              href="/"
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            >
              Revenir à l’accueil
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}

function GuideSection({
  id,
  kicker,
  title,
  description,
  steps,
  color,
  alternate = false,
}: {
  id: string
  kicker: string
  title: string
  description: string
  steps: Array<{
    icon: React.ComponentType<{ className?: string }>
    title: string
    description: string
    details?: string[]
    links?: Array<{ href: string; label: string }>
  }>
  color: 'blue' | 'violet' | 'emerald'
  alternate?: boolean
}) {
  const tones = {
    blue: 'text-blue-700 dark:text-blue-300',
    violet: 'text-violet-700 dark:text-violet-300',
    emerald: 'text-emerald-700 dark:text-emerald-300',
  }
  const iconTones = {
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
    violet: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  }

  return (
    <section
      id={id}
      className={`scroll-mt-24 py-12 sm:py-16 ${
        alternate ? 'border-y border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-slate-900' : ''
      }`}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className={`text-xs font-bold uppercase tracking-[0.16em] ${tones[color]}`}>{kicker}</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-slate-950 dark:text-white">{title}</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">{description}</p>
          </div>

          <ol className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-white/10 dark:border-white/10">
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <li key={step.title} className="grid gap-4 py-6 sm:grid-cols-[52px_minmax(0,1fr)]">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${iconTones[color]}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[11px] font-bold uppercase text-slate-400">Étape {index + 1}</p>
                    <h3 className="mt-1 font-display text-lg font-bold text-slate-950 dark:text-white">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {step.description}
                    </p>
                    {step.details && (
                      <ul className="mt-3 space-y-2">
                        {step.details.map((detail) => (
                          <li key={detail} className="flex items-start gap-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                            {detail}
                          </li>
                        ))}
                      </ul>
                    )}
                    {step.links && (
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                        {step.links.map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            className={`inline-flex items-center gap-1.5 text-xs font-bold ${tones[color]} hover:opacity-75`}
                          >
                            {link.label}
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </section>
  )
}
