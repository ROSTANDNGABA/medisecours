'use client'

import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  HeartPulse,
  LogIn,
  MessageSquareText,
  PhoneCall,
  Search,
  ShieldAlert,
  Stethoscope,
  UserPlus,
} from 'lucide-react'
import { emergencyCallHref, EMERGENCY_NUMBER } from '@/config/firstAid'

const actions = [
  {
    href: '/premiers-soins',
    icon: ShieldAlert,
    context: 'Danger immédiat ou accident',
    title: 'Une personne a besoin de premiers secours',
    description: 'Choisissez ce que vous observez : étouffement, brûlure, saignement, convulsion, accident ou malaise.',
    action: 'Ouvrir les fiches de secours',
    tone: 'border-red-200 bg-red-50 text-red-950 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-100',
  },
  {
    href: '/maladies',
    icon: Search,
    context: 'Sans urgence vitale apparente',
    title: 'J’observe des symptômes sans danger immédiat',
    description: 'Décrivez les signes, leur durée et leur intensité pour connaître le niveau de soins adapté, sans diagnostic automatique.',
    action: 'Décrire les symptômes',
    tone: 'border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-100',
  },
  {
    href: '/medecins',
    icon: MessageSquareText,
    context: 'Avis médical professionnel',
    title: 'Je souhaite parler à un médecin',
    description: 'Demandez une consultation en ligne pour obtenir une évaluation, un diagnostic et une prise en charge professionnels.',
    action: 'Choisir un médecin',
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-100',
  },
  {
    href: '/centres',
    icon: Building2,
    context: 'Examen ou soins sur place',
    title: 'Je dois me rendre dans un centre de santé',
    description: 'Localisez une structure adaptée lorsqu’un examen, des soins sur place ou une prise en charge urgente sont nécessaires.',
    action: 'Rechercher un centre',
    tone: 'border-violet-200 bg-violet-50 text-violet-950 dark:border-violet-500/25 dark:bg-violet-500/10 dark:text-violet-100',
  },
]

const emergencyChecks = [
  'La personne répond-elle lorsque vous lui parlez ?',
  'Respire-t-elle normalement ?',
  'Y a-t-il un saignement important ?',
  'Le lieu est-il sûr pour vous et pour la victime ?',
]

const gettingStartedSteps = [
  {
    icon: ShieldAlert,
    title: 'Identifiez d’abord le niveau d’urgence',
    description: 'Si la personne ne répond pas, respire mal, convulse ou saigne beaucoup, ouvrez immédiatement Premiers soins et contactez les urgences.',
    href: '/premiers-soins',
    action: 'Voir les premiers gestes',
  },
  {
    icon: ClipboardList,
    title: 'Décrivez les signes observés',
    description: 'Pour une situation non immédiatement critique, indiquez les symptômes, leur durée, leur intensité et le contexte.',
    href: '/maladies',
    action: 'Commencer l’orientation',
  },
  {
    icon: Stethoscope,
    title: 'Choisissez la prise en charge',
    description: 'Suivez l’orientation vers les urgences, un centre de santé ou une consultation médicale en ligne.',
    href: '/medecins',
    action: 'Voir les médecins',
  },
  {
    icon: UserPlus,
    title: 'Créez un compte pour être accompagné',
    description: 'Un compte patient permet de demander une consultation, échanger avec un médecin et retrouver le suivi de vos demandes.',
    href: '/register',
    action: 'Créer un compte patient',
  },
]

const careDestinations = [
  {
    icon: ShieldAlert,
    level: 'Danger immédiat',
    title: 'Services d’urgence',
    description: 'L’application affiche les signes de danger, les gestes temporaires à appliquer et la nécessité d’appeler immédiatement les secours.',
    detail: `Appel prioritaire au ${EMERGENCY_NUMBER}`,
    tone: 'border-red-200 bg-red-50 text-red-950 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-100',
  },
  {
    icon: Building2,
    level: 'Examen nécessaire',
    title: 'Centre de santé',
    description: 'MediSecours vous oriente vers une structure lorsque la personne doit être examinée ou recevoir des soins sur place.',
    detail: 'Recherche de centres disponible',
    tone: 'border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-100',
  },
  {
    icon: Stethoscope,
    level: 'Avis médical',
    title: 'Consultation en ligne',
    description: 'Pour une situation sans urgence vitale apparente, un médecin peut évaluer les symptômes et décider de la conduite médicale adaptée.',
    detail: 'Compte patient nécessaire',
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-100',
  },
]

const frequentlyAskedQuestions = [
  {
    question: 'Puis-je utiliser MediSecours sans créer de compte ?',
    answer: 'Oui. Les fiches de premiers secours, l’orientation par symptômes et la recherche de centres sont accessibles aux visiteurs. Un compte est nécessaire pour consulter un médecin et utiliser le suivi personnel.',
  },
  {
    question: 'MediSecours peut-il établir un diagnostic ?',
    answer: 'Non. L’orientation aide à reconnaître un niveau d’urgence et à choisir le bon parcours de soins. Seul un médecin qualifié peut établir un diagnostic, prescrire un traitement et organiser le suivi médical.',
  },
  {
    question: 'Quand faut-il appeler directement les urgences ?',
    answer: `Appelez le ${EMERGENCY_NUMBER} lorsqu’une personne ne répond pas, respire difficilement, convulse, présente un saignement important ou tout autre danger immédiat. Ne retardez jamais l’appel pour terminer un formulaire.`,
  },
  {
    question: 'Comment se déroule une consultation en ligne ?',
    answer: 'Créez un compte patient, choisissez un médecin disponible et transmettez les informations demandées. Le médecin analyse la situation, échange avec vous et décide si une consultation à distance suffit ou si un examen sur place est nécessaire.',
  },
  {
    question: 'Les premiers gestes remplacent-ils une prise en charge médicale ?',
    answer: 'Non. Ils servent uniquement à protéger la personne et à limiter l’aggravation en attendant les secours ou un professionnel. Ils ne constituent ni un traitement à domicile ni une prescription médicale.',
  },
]

export default function HomePage() {
  return (
    <main>
      <section className="relative flex min-h-[78vh] items-end overflow-hidden bg-slate-950">
        <Image
          src="/images/home-emergency.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-slate-950/68" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/75 to-slate-950/20" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/45" aria-hidden="true" />

        <div className="relative mx-auto w-full max-w-6xl px-4 pb-10 pt-36 sm:px-6 sm:pb-14 lg:pb-16">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">
            Premiers secours, orientation et consultation
          </p>
          <h1 className="mt-3 max-w-4xl font-display text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
            MediSecours
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
            Une personne vient d&apos;avoir un accident, un malaise ou présente des symptômes ? MediSecours vous indique quoi faire maintenant : alerter les secours, appliquer un premier geste temporaire, rejoindre un centre ou consulter un médecin.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/premiers-soins" className="inline-flex h-12 items-center gap-2 bg-red-600 px-5 text-sm font-bold text-white transition hover:bg-red-500">
              <ShieldAlert className="h-5 w-5" />
              Voir les gestes d&apos;urgence
            </Link>
            <a href={emergencyCallHref()} className="inline-flex h-12 items-center gap-2 border border-white/35 bg-white/10 px-5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20">
              <PhoneCall className="h-5 w-5" />
              Appeler le {EMERGENCY_NUMBER}
            </a>
          </div>

          <p className="mt-6 max-w-2xl text-xs leading-5 text-slate-300">
            Danger immédiat : appelez d&apos;abord le {EMERGENCY_NUMBER}. MediSecours ne remplace ni les services d&apos;urgence ni un médecin. L&apos;application ne pose pas de diagnostic et ne prescrit aucun traitement.
          </p>
        </div>
      </section>

      <section className="bg-white py-10 dark:bg-slate-950 sm:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">Commencez ici</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-slate-950 dark:text-white">Quelle situation correspond à votre besoin ?</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
              Choisissez la situation la plus proche de ce que vous vivez. En cas de doute entre deux parcours, commencez par les premiers secours : les signes de danger seront vérifiés en priorité.
            </p>
            <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
              Les fiches de premiers secours, l&apos;orientation et la recherche de centres sont accessibles sans créer de compte.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {actions.map((action) => {
              const Icon = action.icon
              return (
                <Link key={action.href} href={action.href} className={`group flex min-h-56 flex-col border p-5 transition hover:-translate-y-0.5 hover:shadow-md ${action.tone}`}>
                  <div className="flex items-start justify-between gap-4">
                    <Icon className="h-7 w-7 shrink-0" />
                    <ArrowRight className="h-5 w-5 shrink-0 transition group-hover:translate-x-1" />
                  </div>
                  <div className="mt-6">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] opacity-70">{action.context}</p>
                    <h3 className="font-display text-xl font-bold">{action.title}</h3>
                    <p className="mt-2 text-sm leading-6 opacity-80">{action.description}</p>
                  </div>
                  <span className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-bold">
                    {action.action}
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-950 text-white dark:border-white/10" aria-labelledby="getting-started-title">
        <div className="mx-auto grid max-w-7xl lg:grid-cols-[0.88fr_1.12fr]">
          <div className="relative min-h-[340px] overflow-hidden sm:min-h-[440px] lg:min-h-[620px]">
            <Image
              src="/images/home-guidance.jpg"
              alt="Accompagnement d'un patient par un professionnel de santé"
              fill
              sizes="(max-width: 1024px) 100vw, 44vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/10 lg:bg-gradient-to-r lg:from-transparent lg:to-slate-950/45" aria-hidden="true" />
          </div>

          <div className="px-4 py-10 sm:px-8 sm:py-12 lg:px-12 lg:py-14">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">Première visite</p>
            <h2 id="getting-started-title" className="mt-2 max-w-xl font-display text-3xl font-bold sm:text-4xl">
              Comment utiliser MediSecours
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Commencez toujours par l’état réel de la personne. Le parcours change selon qu’il existe un danger immédiat ou qu’un avis médical peut être demandé sans urgence vitale.
            </p>

            <ol className="mt-8 space-y-6">
              {gettingStartedSteps.map((step, index) => {
                const Icon = step.icon
                return (
                  <li key={step.title} className="grid grid-cols-[38px_minmax(0,1fr)] gap-4 border-t border-white/10 pt-5 first:border-t-0 first:pt-0">
                    <span className="flex h-9 w-9 items-center justify-center border border-white/20 bg-white/10 text-sm font-black text-emerald-300">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="flex items-center gap-2 font-display text-lg font-bold">
                        <Icon className="h-5 w-5 text-emerald-300" aria-hidden="true" />
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{step.description}</p>
                      <Link href={step.href} className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-emerald-300 hover:text-emerald-200">
                        {step.action}
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </div>
                  </li>
                )
              })}
            </ol>

            <div className="mt-8 flex flex-wrap gap-3 border-t border-white/10 pt-6">
              <Link href="/login" className="inline-flex h-11 items-center gap-2 border border-white/25 px-4 text-sm font-bold text-white transition hover:bg-white/10">
                <LogIn className="h-4 w-4" aria-hidden="true" />
                J&apos;ai déjà un compte
              </Link>
              <Link href="/register" className="inline-flex h-11 items-center gap-2 bg-emerald-500 px-4 text-sm font-bold text-slate-950 transition hover:bg-emerald-400">
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Je crée mon compte
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-10 dark:bg-slate-950 sm:py-14" aria-labelledby="orientation-result-title">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
              Après votre recherche
            </p>
            <h2 id="orientation-result-title" className="mt-2 font-display text-3xl font-bold text-slate-950 dark:text-white">
              MediSecours vous dirige vers le niveau d’aide adapté
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
              L’objectif n’est pas de vous annoncer une maladie. La plateforme vérifie d’abord les signes de danger, puis vous indique le parcours le plus prudent selon les informations observées.
            </p>
          </div>

          <div className="mt-7 grid gap-3 lg:grid-cols-3">
            {careDestinations.map((destination) => {
              const Icon = destination.icon
              return (
                <article key={destination.title} className={`flex min-h-72 flex-col border p-5 ${destination.tone}`}>
                  <div className="flex items-start justify-between gap-4">
                    <Icon className="h-7 w-7 shrink-0" aria-hidden="true" />
                    <span className="text-xs font-bold uppercase tracking-[0.1em] opacity-70">{destination.level}</span>
                  </div>
                  <h3 className="mt-8 font-display text-2xl font-bold">{destination.title}</h3>
                  <p className="mt-3 text-sm leading-6 opacity-80">{destination.description}</p>
                  <p className="mt-auto border-t border-current/15 pt-5 text-sm font-bold">{destination.detail}</p>
                </article>
              )
            })}
          </div>

          <div className="mt-6 flex flex-col gap-4 border-l-4 border-amber-500 bg-amber-50 p-5 text-amber-950 dark:bg-amber-500/10 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-display text-lg font-bold">Vous hésitez sur le parcours à choisir ?</p>
              <p className="mt-1 text-sm leading-6 opacity-80">
                Commencez par décrire les signes observés. Toute urgence détectée sera affichée avant les autres résultats.
              </p>
            </div>
            <Link href="/maladies" className="inline-flex h-11 shrink-0 items-center justify-center gap-2 bg-amber-600 px-4 text-sm font-bold text-white transition hover:bg-amber-500">
              Commencer l&apos;orientation
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 py-10 dark:border-white/10 dark:bg-slate-900 sm:py-14">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-700 dark:text-red-300">Avant tout geste</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-slate-950 dark:text-white">Évaluer les dangers immédiats</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              N&apos;intervenez pas dans une zone dangereuse. Appelez les secours dès qu&apos;une personne ne répond pas, ne respire pas normalement ou présente un saignement important.
            </p>
            <Link href="/premiers-soins" className="mt-5 inline-flex h-11 items-center gap-2 bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500">
              Ouvrir les fiches de secours <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <ol className="grid gap-2 sm:grid-cols-2">
            {emergencyChecks.map((item, index) => (
              <li key={item} className="flex min-h-24 gap-3 border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-950">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-red-600 text-xs font-black text-white">{index + 1}</span>
                <span className="text-sm font-semibold leading-6 text-slate-800 dark:text-slate-200">{item}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-white py-10 dark:bg-slate-950 sm:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <HeartPulse className="h-8 w-8 text-emerald-700 dark:text-emerald-300" />
              <h2 className="mt-4 font-display text-2xl font-bold text-slate-950 dark:text-white">Ce que peut faire un patient</h2>
              <ul className="mt-4 space-y-3">
                {[
                  'Décrire des signes observables et leur évolution.',
                  'Alerter les secours ou rejoindre un centre de santé.',
                  'Appliquer uniquement des gestes temporaires validés.',
                  'Préparer les informations utiles pour le médecin.',
                ].map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <Stethoscope className="h-8 w-8 text-blue-700 dark:text-blue-300" />
              <h2 className="mt-4 font-display text-2xl font-bold text-slate-950 dark:text-white">Ce qui reste réservé au médecin</h2>
              <ul className="mt-4 space-y-3">
                {[
                  'Établir ou confirmer un diagnostic.',
                  'Prescrire un médicament ou en modifier la dose.',
                  'Définir un traitement et organiser son suivi.',
                  'Interpréter les examens et décider d une hospitalisation.',
                ].map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" /> {item}
                  </li>
                ))}
              </ul>
              <Link href="/medecins" className="mt-5 inline-flex h-11 items-center gap-2 border border-slate-300 px-4 text-sm font-bold text-slate-800 hover:bg-slate-50 dark:border-white/15 dark:text-white dark:hover:bg-white/5">
                Consulter en ligne <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50 py-10 dark:border-white/10 dark:bg-slate-900 sm:py-14" aria-labelledby="home-faq-title">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.72fr_1.28fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
              Questions fréquentes
            </p>
            <h2 id="home-faq-title" className="mt-2 font-display text-3xl font-bold text-slate-950 dark:text-white">
              Comprendre MediSecours avant de commencer
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Ces réponses précisent le rôle de la plateforme et les limites à respecter pour l’utiliser de manière responsable.
            </p>
            <Link href="/register" className="mt-5 inline-flex h-11 items-center gap-2 bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500">
              Créer un compte patient
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-white/10 dark:border-white/10">
            {frequentlyAskedQuestions.map((item, index) => (
              <details key={item.question} className="group" open={index === 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left font-display text-base font-bold text-slate-950 marker:content-none dark:text-white sm:text-lg">
                  {item.question}
                  <ChevronDown className="h-5 w-5 shrink-0 text-slate-500 transition group-open:rotate-180 dark:text-slate-400" aria-hidden="true" />
                </summary>
                <p className="max-w-3xl pb-5 pr-8 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
