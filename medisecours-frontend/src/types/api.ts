/**
 * Types API — MediSecours
 *
 * Miroir TypeScript des entités Symfony sérialisées via API Platform (groups `*:read`).
 * Les relations sont représentées soit par un IRI (string "/api/.../123") soit par
 * un objet embarqué selon le contexte de normalisation. On utilise une union pour
 * couvrir les deux cas proprement.
 */

/** IRI d'une ressource API Platform, ex: "/api/consultations/42" */
export type Iri = string

/** Une relation peut être un IRI ou un objet embarqué (selon les groups de normalisation) */
export type Relation<T> = Iri | T

/* ------------------------------------------------------------------ */
/* Utilisateur (héritage SINGLE_TABLE : Patient | Medecin | Admin)     */
/* ------------------------------------------------------------------ */

export type UserRole = 'ROLE_USER' | 'ROLE_PATIENT' | 'ROLE_MEDECIN' | 'ROLE_ADMIN'

export type DiscriminatorType = 'patient' | 'medecin' | 'admin'

export interface Utilisateur {
  id: string
  email?: string
  nom: string | null
  prenom: string | null
  telephone: string | null
  quartier: string | null
  photoProfil: string | null
  estEnLigne: boolean
  dernierePresence: string | null
  emailVerified: boolean
  actif: boolean
  banni: boolean
  createdAt: string
  '@id'?: Iri
  '@type'?: string
  discriminatorType?: DiscriminatorType
}

/* ------------------------------------------------------------------ */
/* Patient                                                            */
/* ------------------------------------------------------------------ */

export interface Patient extends Utilisateur {
  groupeSanguin?: string | null
  allergies?: string[] | null
  contactsUrgence?: ContactUrgence[] | null
}

export interface ContactUrgence {
  nom: string
  telephone: string
  lien?: string
}

/* ------------------------------------------------------------------ */
/* Médecin                                                            */
/* ------------------------------------------------------------------ */

export interface CreneauDisponibilite {
  jour: 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi' | 'samedi' | 'dimanche'
  debut: string
  fin: string
}

export interface Medecin extends Utilisateur {
  specialite?: string | null
  numeroOrdre?: string | null
  estValide?: boolean
  disponibilites?: CreneauDisponibilite[] | null
  disponibilitesTexte?: string | null
}

/* ------------------------------------------------------------------ */
/* Consultation                                                       */
/* ------------------------------------------------------------------ */

export const STATUT_CONSULTATION = {
  OUVERTE: 'OUVERTE',
  EN_COURS: 'EN_COURS',
  TERMINEE: 'TERMINEE',
  ANNULEE: 'ANNULEE',
} as const
export type StatutConsultation = (typeof STATUT_CONSULTATION)[keyof typeof STATUT_CONSULTATION]

export const PRIORITE_CONSULTATION = {
  NORMALE: 'NORMALE',
  URGENTE: 'URGENTE',
  CRITIQUE: 'CRITIQUE',
} as const
export type PrioriteConsultation = (typeof PRIORITE_CONSULTATION)[keyof typeof PRIORITE_CONSULTATION]

export interface Consultation {
  id: number
  patient: Relation<Patient>
  medecin?: Relation<Medecin> | null
  statut: StatutConsultation
  motif?: string | null
  createdAt: string
  closedAt?: string | null
  dateConsultation?: string | null
  priorite: PrioriteConsultation
  messages?: Message[]
  prescriptions?: Prescription[]
  '@id'?: Iri
  '@type'?: string
}

/* ------------------------------------------------------------------ */
/* Conversation & Message                                             */
/* ------------------------------------------------------------------ */

export interface Conversation {
  id: number
  titre: string | null
  createdAt: string
  updatedAt: string | null
  participants: Relation<Utilisateur>[]
  dernierMessage?: Message | null
  messages?: Message[]
  '@id'?: Iri
  '@type'?: string
}

export const STATUT_MESSAGE = {
  ENVOYE: 'ENVOYE',
  LIVRE: 'LIVRE',
  LU: 'LU',
} as const
export type StatutMessage = (typeof STATUT_MESSAGE)[keyof typeof STATUT_MESSAGE]

export const TYPE_MESSAGE = {
  TEXTE: 'TEXTE',
  VOIX: 'VOIX',
  IMAGE: 'IMAGE',
  FICHIER: 'FICHIER',
} as const
export type TypeMessage = (typeof TYPE_MESSAGE)[keyof typeof TYPE_MESSAGE]

export interface Message {
  id: number
  contenu: string
  statut: StatutMessage
  typeMessage: TypeMessage
  dureeVoix?: number | null
  createdAt: string
  expediteur: Relation<Utilisateur>
  conversation?: Relation<Conversation>
  '@id'?: Iri
  '@type'?: string
}

/* ------------------------------------------------------------------ */
/* Avis                                                               */
/* ------------------------------------------------------------------ */

export interface Avis {
  id: number
  patient: Relation<Patient>
  medecin: Relation<Medecin>
  note: number
  commentaire?: string | null
  signale: boolean
  raisonSignalement?: string | null
  createdAt: string
  updatedAt?: string | null
  '@id'?: Iri
  '@type'?: string
}

/* ------------------------------------------------------------------ */
/* Prescription                                                       */
/* ------------------------------------------------------------------ */

export interface Prescription {
  id: number
  consultation?: Relation<Consultation> | null
  medicament: string
  posologie?: string | null
  duree?: string | null
  instructions?: string | null
  createdAt?: string
  '@id'?: Iri
  '@type'?: string
}

/* ------------------------------------------------------------------ */
/* Dashboard agrégé (endpoint /api/me/dashboard)                      */
/* ------------------------------------------------------------------ */

export interface DashboardKpis {
  totalPatients: number
  casActifs: number
  consultations: number
  enAttente: number
  terminees: number
}

/** Répartition brute par statut (depuis un agrégat SQL backend). */
export type DashboardStatusCounts = Record<StatutConsultation, number>

/** Alertes de garde (>48h). */
export interface DashboardAlerts {
  enAttenteLongue: number
  enCoursLongue: number
  urgentes: number
}

/** Série temporelle du volume de consultations. */
export interface DashboardTimelinePoint {
  date: string
  count: number
}

/** Top allergies parmi les patients du médecin. */
export interface DashboardAllergie {
  name: string
  count: number
}

export interface DashboardData {
  kpis: DashboardKpis
  statusCounts?: DashboardStatusCounts
  alerts?: DashboardAlerts
  noteMoyenne: number
  totalAvis: number
  unreadMessages: number
  activeConsultations: Consultation[]
  riskConsultations: Consultation[]
  recentPatients: Patient[]
  bloodDistribution: Record<string, number>
  allergies?: DashboardAllergie[]
  motifsCount: { motif: string; count: number }[]
  timeline?: DashboardTimelinePoint[]
  ratingsDistribution: Record<number, number>
  upcomingAppointments: Consultation[]
}

/* ------------------------------------------------------------------ */
/* Helpers de relations                                               */
/* ------------------------------------------------------------------ */

/** Extrait un id numérique ou string depuis une relation (IRI ou objet). */
export function idFromRelation(value: unknown): string | number | null {
  if (!value) return null
  if (typeof value === 'string') return value.split('/').pop() ?? null
  if (typeof value === 'object' && value !== null && 'id' in value) {
    return (value as { id: string | number }).id
  }
  return null
}

/** Extrait un id au format string (utile pour comparer avec user.id). */
export function idStrFromRelation(value: unknown): string | null {
  const id = idFromRelation(value)
  return id === null ? null : String(id)
}
