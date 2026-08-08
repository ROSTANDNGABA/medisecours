'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Camera, Edit3, Save, ShieldCheck, X, Phone, MapPin, Droplet,
  HeartPulse, Siren, Plus, Stethoscope, BadgeCheck, CalendarClock, Lock, AlertTriangle,
  CheckCircle2, AlertCircle, Info, Flag, Clock3, MessageSquareText, XCircle, Eye,
  ChevronRight,
} from 'lucide-react'
import useSWR from 'swr'
import api from '../../api/axios'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import { resolveImgPath } from '../../lib/config'
import { fetcher } from '../../lib/fetcher'
import EmptyState from '../../components/ui/EmptyState'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Modal from '../../components/ui/Modal'

const GROUPES_SANGUINS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const PHONE_RE = /^\+237\s?[26]\d{8}$/
const PHONE_EXAMPLE = '+237 6XXXXXXXX'

type ReportStatus = 'NOUVEAU' | 'EN_COURS' | 'TRAITE' | 'REJETE'

interface PatientReport {
  id: number
  motif: string
  description: string
  statut: ReportStatus
  noteAdmin?: string | null
  createdAt: string
  updatedAt: string
  traiteAt?: string | null
  medecin?: {
    id?: string
    nom?: string | null
    prenom?: string | null
    specialite?: string | null
  } | null
}

const REPORT_REASON_LABELS: Record<string, string> = {
  COMPORTEMENT_INAPPROPRIE: 'Comportement inapproprié',
  FAUSSE_INFORMATION: 'Informations fausses ou trompeuses',
  HARCELEMENT: 'Harcèlement ou propos déplacés',
  NEGLIGENCE: 'Négligence pendant la prise en charge',
  FRAUDE: 'Fraude ou paiement suspect',
  AUTRE: 'Autre motif',
}

const REPORT_STATUS_META: Record<ReportStatus, {
  label: string
  className: string
  icon: typeof Flag
}> = {
  NOUVEAU: {
    label: 'Reçu',
    className: 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200',
    icon: Flag,
  },
  EN_COURS: {
    label: 'En cours d’examen',
    className: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200',
    icon: Clock3,
  },
  TRAITE: {
    label: 'Traité',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200',
    icon: CheckCircle2,
  },
  REJETE: {
    label: 'Rejeté',
    className: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200',
    icon: XCircle,
  },
}

function validatePhone(v: string): { ok: boolean; message: string } | null {
  const t = v.trim()
  if (t === '') return null
  return PHONE_RE.test(t)
    ? { ok: true, message: 'Format valide' }
    : { ok: false, message: `Format invalide — exemple : ${PHONE_EXAMPLE}` }
}

function isFilled(v: unknown): boolean {
  return typeof v === 'string' && v.trim().length > 0
}

function formFromUser(user: any) {
  return {
    telephone: typeof user?.telephone === 'string' ? user.telephone : '',
    quartier: typeof user?.quartier === 'string' ? user.quartier : '',
    groupeSanguin: typeof user?.groupeSanguin === 'string' ? user.groupeSanguin : '',
    allergies: Array.isArray(user?.allergies) ? [...user.allergies] : [],
    contactsUrgence: Array.isArray(user?.contactsUrgence)
      ? user.contactsUrgence.map((c: any) => ({ nom: c?.nom || '', telephone: c?.telephone || '', lien: c?.lien || '' }))
      : [],
    specialite: typeof user?.specialite === 'string' ? user.specialite : '',
    disponibilitesTexte: typeof user?.disponibilitesTexte === 'string' ? user.disponibilitesTexte : '',
  }
}

function Card({ accent = '', className = '', children }: { accent?: string; className?: string; children: ReactNode }) {
  return (
    <div className={`bg-white dark:bg-primary-700/40 border border-slate-100 dark:border-white/10 rounded-2xl p-5 shadow-xs transition-all hover:shadow-sm ${accent} ${className}`}>
      {children}
    </div>
  )
}

function CardHeading({ icon, title, badgeClass = 'bg-blue-50 dark:bg-blue-500/10 text-blue-500' }: {
  icon: ReactNode
  title: string
  badgeClass?: string
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${badgeClass}`}>{icon}</span>
      <h3 className="font-display font-semibold text-slate-800 dark:text-sable">{title}</h3>
    </div>
  )
}

function FieldRow({ icon, label, value, placeholder, emptyLabel, editing, onChange, onRequestEdit, iconBg, inputMode, hint, validation }: {
  icon: ReactNode
  label: string
  value: string
  placeholder?: string
  emptyLabel?: string
  editing: boolean
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRequestEdit: () => void
  iconBg?: string
  inputMode?: 'text' | 'tel'
  hint?: string
  validation?: (v: string) => { ok: boolean; message: string } | null
}) {
  const filled = isFilled(value)
  const feedback = editing && validation ? validation(value) : null
  const inputBorder = feedback
    ? feedback.ok
      ? 'border-emerald-300 focus:ring-emerald-500 focus:border-emerald-500'
      : 'border-red-300 focus:ring-red-500 focus:border-red-500'
    : 'border-slate-200 focus:ring-blue-500 focus:border-blue-500'
  return (
    <div className="flex items-start gap-3">
      <span className={`mt-0.5 w-9 h-9 rounded-xl bg-blue-50 dark:bg-white/10 text-blue-500 flex items-center justify-center shrink-0 ${iconBg || ''}`}>
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
        {editing ? (
          <>
            <input
              value={value || ''}
              onChange={onChange}
              placeholder={placeholder}
              inputMode={inputMode}
              className={`w-full mt-1 px-3 py-2.5 rounded-xl border bg-slate-50/50 dark:bg-primary-900/40 text-sm text-slate-800 dark:text-sable focus:outline-none focus:ring-2 transition-shadow ${inputBorder}`}
            />
            {validation && (
              <p className={`mt-1.5 flex items-center gap-1.5 text-xs font-medium ${feedback ? (feedback.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400') : 'text-slate-400'}`}>
                {feedback ? (
                  feedback.ok ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                ) : <Info className="w-3.5 h-3.5 shrink-0" />}
                {feedback ? feedback.message : hint}
              </p>
            )}
          </>
        ) : filled ? (
          <p className="mt-1.5 text-sm font-medium text-slate-700 dark:text-sable break-words">{value}</p>
        ) : (
          <button
            onClick={onRequestEdit}
            className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-slate-300 dark:text-slate-400 hover:text-blue-500 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> {emptyLabel || 'Non renseigné'}
          </button>
        )}
      </div>
    </div>
  )
}

function TagEditor({ tags, onChange, placeholder }: {
  tags: string[]
  onChange: (next: string[]) => void
  placeholder?: string
}) {
  const [draft, setDraft] = useState('')
  const add = () => {
    const v = draft.trim()
    if (v && !tags.includes(v)) onChange([...tags, v])
    setDraft('')
  }
  return (
    <div className="mt-1 space-y-2">
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={placeholder}
          className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-primary-900/40 text-sm text-slate-800 dark:text-sable focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
        />
        <button type="button" onClick={add} className="shrink-0 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">Ajouter</button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((t, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm font-medium border border-red-100 dark:border-red-500/20">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {t}
              <button type="button" onClick={() => onChange(tags.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600" title="Retirer">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function ContactsEditor({ contacts, onChange }: {
  contacts: Array<{ nom: string; telephone: string; lien: string }>
  onChange: (next: Array<{ nom: string; telephone: string; lien: string }>) => void
}) {
  const update = (i: number, key: 'nom' | 'telephone' | 'lien', v: string) =>
    onChange(contacts.map((c, j) => (j === i ? { ...c, [key]: v } : c)))
  const remove = (i: number) => onChange(contacts.filter((_, j) => j !== i))
  return (
    <div className="mt-1 space-y-3">
      {contacts.map((c, i) => (
        <div key={i} className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-primary-900/40 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Contact {i + 1}</p>
            <button type="button" onClick={() => remove(i)} className="p-1 text-red-400 hover:text-red-600" title="Supprimer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            value={c.nom}
            onChange={(e) => update(i, 'nom', e.target.value)}
            placeholder="Nom complet"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-primary-900/40 text-sm text-slate-800 dark:text-sable focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <input
                value={c.telephone}
                onChange={(e) => update(i, 'telephone', e.target.value)}
                placeholder={`Téléphone (ex : ${PHONE_EXAMPLE})`}
                inputMode="tel"
                className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-primary-900/40 text-sm text-slate-800 dark:text-sable focus:outline-none focus:ring-2 transition-shadow ${(() => {
                  const fb = validatePhone(c.telephone)
                  return fb ? (fb.ok ? 'border-emerald-300 focus:ring-emerald-500 focus:border-emerald-500' : 'border-red-300 focus:ring-red-500 focus:border-red-500') : 'border-slate-200 focus:ring-blue-500 focus:border-blue-500'
                })()}`}
              />
              {(() => {
                const fb = validatePhone(c.telephone)
                return (
                  <p className={`mt-1 flex items-center gap-1.5 text-xs font-medium ${fb ? (fb.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400') : 'text-slate-400'}`}>
                    {fb ? (
                      fb.ok ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    ) : <Info className="w-3.5 h-3.5 shrink-0" />}
                    {fb ? fb.message : `Format attendu : ${PHONE_EXAMPLE}`}
                  </p>
                )
              })()}
            </div>
            <input
              value={c.lien}
              onChange={(e) => update(i, 'lien', e.target.value)}
              placeholder="Lien (ex : Mère)"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-primary-900/40 text-sm text-slate-800 dark:text-sable focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...contacts, { nom: '', telephone: '', lien: '' }])}
        className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border-2 border-dashed border-red-200 dark:border-red-500/20 text-red-400 hover:text-red-500 hover:border-red-300 transition-colors text-sm font-medium"
      >
        <Plus className="w-4 h-4" /> Ajouter un contact
      </button>
    </div>
  )
}

function disponibilitesLabel(d: unknown): string {
  if (!Array.isArray(d)) return ''
  return d
    .filter((c: any) => c && (c.jour || c.debut || c.fin))
    .map((c: any) => `${c.jour || ''} ${c.debut ? `${c.debut}-${c.fin || ''}` : (c.fin || '')}`.trim())
    .filter(Boolean)
    .join(', ')
}

function formatReportDate(value?: string | null): string {
  if (!value) return ''

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function PatientReportCard({ report }: { report: PatientReport }) {
  const status = REPORT_STATUS_META[report.statut] ?? REPORT_STATUS_META.NOUVEAU
  const StatusIcon = status.icon
  const doctorName = `Dr ${report.medecin?.prenom ?? ''} ${report.medecin?.nom ?? ''}`
    .replace(/\s+/g, ' ')
    .trim()
  const responseDate = report.traiteAt ?? report.updatedAt

  return (
    <article className="p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-base font-extrabold text-slate-900 dark:text-white">
            {doctorName === 'Dr' ? 'Médecin concerné' : doctorName}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-300">
            {report.medecin?.specialite || 'Spécialité non renseignée'}
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Envoyé le {formatReportDate(report.createdAt)}
          </p>
        </div>
        <span className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${status.className}`}>
          <StatusIcon className="h-3.5 w-3.5" />
          {status.label}
        </span>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-white/10 dark:bg-primary-900/40">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
          {REPORT_REASON_LABELS[report.motif] ?? report.motif}
        </p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">
          {report.description}
        </p>
      </div>

      <div className={`mt-4 rounded-2xl border p-4 ${
        report.noteAdmin
          ? 'border-blue-200 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10'
          : 'border-slate-200 bg-white dark:border-white/10 dark:bg-white/5'
      }`}>
        <div className="flex items-center gap-2">
          <MessageSquareText className={`h-4 w-4 ${report.noteAdmin ? 'text-blue-600 dark:text-blue-300' : 'text-slate-400'}`} />
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-700 dark:text-slate-200">
            Réponse de l’administration
          </p>
        </div>
        {report.noteAdmin ? (
          <>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">
              {report.noteAdmin}
            </p>
            <p className="mt-3 text-xs text-slate-400">
              Mise à jour le {formatReportDate(responseDate)}
            </p>
          </>
        ) : (
          <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-300">
            {report.statut === 'NOUVEAU'
              ? 'Votre signalement a bien été reçu. Il n’a pas encore été examiné par un administrateur.'
              : report.statut === 'EN_COURS'
                ? 'Votre signalement est en cours d’examen. Aucune réponse écrite n’a encore été publiée.'
                : 'Le dossier a été clôturé sans commentaire administratif complémentaire.'}
          </p>
        )}
      </div>
    </article>
  )
}

function PatientReportRow({
  report,
  onOpen,
}: {
  report: PatientReport
  onOpen: () => void
}) {
  const status = REPORT_STATUS_META[report.statut] ?? REPORT_STATUS_META.NOUVEAU
  const StatusIcon = status.icon
  const doctorName = `Dr ${report.medecin?.prenom ?? ''} ${report.medecin?.nom ?? ''}`
    .replace(/\s+/g, ' ')
    .trim()

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-white/5 sm:px-5"
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${status.className}`}>
        <StatusIcon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-extrabold text-slate-900 dark:text-white">
          {doctorName === 'Dr' ? 'Médecin concerné' : doctorName}
        </span>
        <span className="mt-1 block truncate text-xs text-slate-500 dark:text-slate-300">
          {REPORT_REASON_LABELS[report.motif] ?? report.motif}
          <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
          {new Date(report.createdAt).toLocaleDateString('fr-FR')}
        </span>
        <span className="mt-1 block text-[11px] font-bold text-slate-500 dark:text-slate-300 sm:hidden">
          {status.label}
        </span>
      </span>
      <span className={`hidden shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold sm:inline-flex ${status.className}`}>
        <StatusIcon className="h-3 w-3" />
        {status.label}
      </span>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors group-hover:bg-white group-hover:text-blue-600 dark:group-hover:bg-white/10">
        <Eye className="h-4 w-4" />
      </span>
    </button>
  )
}

export default function ProfilPage() {
  const { user, updateUser } = useAuth()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const syncedRef = useRef(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedReport, setSelectedReport] = useState<PatientReport | null>(null)
  const [reportsHistoryOpen, setReportsHistoryOpen] = useState(false)
  const isMedecin = user?.roles?.includes('ROLE_MEDECIN')
  const isPatient = user?.roles?.includes('ROLE_PATIENT')
  const {
    data: reportsData,
    error: reportsError,
    isLoading: reportsLoading,
  } = useSWR<{ items: PatientReport[] }>(
    isPatient ? '/api/signalements-medecins/mine' : null,
    fetcher,
    { revalidateOnFocus: true },
  )
  const reports = reportsData?.items ?? []

  const [form, setForm] = useState<any>(() => formFromUser(user))

  useEffect(() => {
    const id = user?.id
    if (!id || syncedRef.current) return
    syncedRef.current = true
    api
      .get(`/api/users/${id}`)
      .then(({ data }) => {
        updateUser(data)
        setForm(formFromUser(data))
      })
      .catch(() => {})
  }, [user?.id, updateUser])

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f: any) => ({ ...f, [key]: e.target.value }))

  const handleSave = async () => {
    if (!isMedecin && form.telephone.trim() !== '' && !PHONE_RE.test(form.telephone.trim())) {
      toast.error('Format camerounais attendu : +237 6XXXXXXXX ou +237 2XXXXXXXX')
      return
    }
    setSaving(true)
    try {
      const payload: any = {}
      if (isMedecin) {
        if (form.specialite.trim() !== '') payload.specialite = form.specialite.trim()
        if (form.disponibilitesTexte.trim() !== '') payload.disponibilitesTexte = form.disponibilitesTexte.trim()
      } else {
        if (form.telephone.trim() !== '') payload.telephone = form.telephone.trim()
        if (form.quartier.trim() !== '') payload.quartier = form.quartier.trim()
        payload.groupeSanguin = form.groupeSanguin || null
        payload.allergies = form.allergies.map((a: string) => a.trim()).filter(Boolean)
        payload.contactsUrgence = form.contactsUrgence
          .map((c: any) => ({ nom: (c.nom || '').trim(), telephone: (c.telephone || '').trim(), lien: (c.lien || '').trim() }))
          .filter((c: any) => c.nom || c.telephone)
      }
      const { data } = await api.patch(`/api/users/${user.id}`, payload, { headers: { 'Content-Type': 'application/merge-patch+json' } })
      updateUser({ ...user, ...data })
      toast.success('Profil mis à jour.')
      setEditing(false)
    } catch {
      toast.error('Échec de la mise à jour du profil.')
    } finally {
      setSaving(false)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Format non autorise. Utilisez une image JPEG, PNG ou WebP.')
      e.target.value = ''
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La photo ne doit pas depasser 5 Mo.')
      e.target.value = ''
      return
    }
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const { data } = await api.post('/api/profile/photo', formData)
      updateUser({ ...user, photoProfil: data.photoProfil })
      toast.success('Photo de profil mise à jour.')
    } catch {
      toast.error("Échec de l'envoi de la photo.")
    } finally {
      setUploading(false)
      if (e.target) e.target.value = ''
    }
  }

  if (!user) return null
  const initials = `${user.prenom?.[0] || ''}${user.nom?.[0] || ''}`.toUpperCase()
  const visibleContacts = form.contactsUrgence.filter((c: any) => c.nom || c.telephone)
  const medecinDispo = form.disponibilitesTexte || disponibilitesLabel(user.disponibilites) || ''

  const profileChecks = isMedecin
    ? [isFilled(form.specialite), isFilled(medecinDispo), isFilled(user.numeroOrdre || ''), Boolean(user.photoProfil)]
    : [isFilled(form.telephone), isFilled(form.quartier), isFilled(form.groupeSanguin), form.allergies.length > 0, visibleContacts.length > 0, Boolean(user.photoProfil)]
  const completion = Math.round((profileChecks.filter(Boolean).length / profileChecks.length) * 100)
  const roleLabel = isMedecin ? 'Professionnel de santé' : 'Patient'
  const primaryLocation = isMedecin ? (form.specialite || 'Spécialité non renseignée') : (form.quartier || 'Localisation non renseignée')
  return (
    <div className="min-h-[calc(100dvh-6rem)] bg-[#F7FAFC] dark:bg-primary-900">
      <Modal
        isOpen={Boolean(selectedReport)}
        onClose={() => setSelectedReport(null)}
        title="Détail du signalement"
        size="lg"
      >
        {selectedReport && <PatientReportCard report={selectedReport} />}
      </Modal>

      <Modal
        isOpen={reportsHistoryOpen}
        onClose={() => setReportsHistoryOpen(false)}
        title="Historique des signalements"
        size="lg"
      >
        <div className="max-h-[65dvh] divide-y divide-slate-100 overflow-y-auto rounded-2xl border border-slate-200 dark:divide-white/10 dark:border-white/10">
          {reports.map((report) => (
            <PatientReportRow
              key={report.id}
              report={report}
              onOpen={() => {
                setReportsHistoryOpen(false)
                setSelectedReport(report)
              }}
            />
          ))}
        </div>
      </Modal>

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">Espace personnel</p>
            <h1 className="mt-2 font-display text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white">Profil {isMedecin ? 'médecin' : 'patient'}</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-300">
              Gérez les informations utilisées pour votre suivi, vos contacts et votre dossier médical numérique.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {editing && (
              <button
                onClick={() => setEditing(false)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition-colors hover:border-red-200 hover:text-red-600 dark:border-white/10 dark:bg-primary-800 dark:text-slate-200"
              >
                <X className="h-4 w-4" /> Annuler
              </button>
            )}
            <button
              onClick={() => editing ? handleSave() : setEditing(true)}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-blue-600/20 transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {editing ? <><Save className="h-4 w-4" /> {saving ? 'Enregistrement...' : 'Enregistrer'}</> : <><Edit3 className="h-4 w-4" /> Modifier le profil</>}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
          <section className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-primary-800/80 sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="relative shrink-0">
                <div className="h-28 w-28 overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-cyan-500 text-3xl font-extrabold text-white shadow-lg shadow-blue-600/20 ring-4 ring-blue-50 dark:ring-white/10 flex items-center justify-center">
                  {user.photoProfil ? (
                    <img src={resolveImgPath(user.photoProfil)} alt="" className="h-full w-full object-cover" onError={(e) => { const img = e.target as HTMLImageElement; img.style.display = 'none'; const fb = img.nextSibling as HTMLElement | null; if (fb) fb.style.display = 'flex' }} />
                  ) : null}
                  <span style={user.photoProfil ? { display: 'none' } : undefined} className="flex h-full w-full items-center justify-center">{initials}</span>
                </div>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-md ring-4 ring-white transition-colors hover:bg-blue-700 disabled:opacity-60 dark:ring-primary-800"
                  title="Changer la photo de profil"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleUpload} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
                    <ShieldCheck className="h-3.5 w-3.5" /> {roleLabel}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                    <Lock className="h-3.5 w-3.5" /> Données protégées
                  </span>
                </div>
                <h2 className="mt-3 truncate font-display text-2xl font-extrabold text-slate-950 dark:text-white">{user.prenom} {user.nom}</h2>
                <p className="mt-1 truncate text-sm font-medium text-slate-500 dark:text-slate-300">{user.email}</p>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-primary-900/40">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Contact principal</p>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-800 dark:text-sable">{form.telephone || 'Téléphone non renseigné'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-primary-900/40">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Repère médical</p>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-800 dark:text-sable">{primaryLocation}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-primary-800/80 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Dossier médical</p>
                <h2 className="mt-2 font-display text-xl font-extrabold text-slate-950 dark:text-white">Complétude</h2>
              </div>
              <span className="rounded-2xl bg-blue-600 px-3 py-1.5 text-sm font-extrabold text-white">{completion}%</span>
            </div>
            <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-primary-900">
              <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${completion}%` }} />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-white/10 dark:bg-primary-900/40">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Groupe</p>
                <p className="mt-1 font-extrabold text-slate-900 dark:text-white">{form.groupeSanguin || '-'}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-white/10 dark:bg-primary-900/40">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Allergies</p>
                <p className="mt-1 font-extrabold text-slate-900 dark:text-white">{form.allergies.length}</p>
              </div>
            </div>
            <p className="mt-5 text-sm leading-6 text-slate-500 dark:text-slate-300">
              Un profil complet aide les professionnels de santé à mieux comprendre votre situation lors d’une consultation.
            </p>
          </aside>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <main className="space-y-5">
            {!isMedecin ? (
              <>
                <Card className="rounded-[24px] p-5 sm:p-6">
                  <CardHeading icon={<Phone className="w-4 h-4" />} title="Identité et coordonnées" />
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <FieldRow
                      icon={<Phone className="w-4 h-4" />}
                      label="Téléphone"
                      value={form.telephone}
                      placeholder={`Ex : ${PHONE_EXAMPLE}`}
                      emptyLabel="Ajouter votre téléphone"
                      editing={editing}
                      onChange={set('telephone')}
                      onRequestEdit={() => setEditing(true)}
                      inputMode="tel"
                      hint={`Format attendu : ${PHONE_EXAMPLE}`}
                      validation={validatePhone}
                    />
                    <FieldRow
                      icon={<MapPin className="w-4 h-4" />}
                      label="Quartier / Localisation"
                      value={form.quartier}
                      placeholder="Ex : Gombe, Kinshasa"
                      emptyLabel="Ajouter votre quartier"
                      editing={editing}
                      onChange={set('quartier')}
                      onRequestEdit={() => setEditing(true)}
                      iconBg="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500"
                    />
                  </div>
                </Card>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <Card className="rounded-[24px] p-5 sm:p-6">
                    <CardHeading icon={<Droplet className="w-4 h-4" />} title="Groupe sanguin" badgeClass="bg-red-50 dark:bg-red-500/10 text-red-500" />
                    {editing ? (
                      <select
                        value={form.groupeSanguin || ''}
                        onChange={set('groupeSanguin')}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm text-slate-800 transition-shadow focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-primary-900/40 dark:text-sable"
                      >
                        <option value="">Non spécifié</option>
                        {GROUPES_SANGUINS.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                    ) : form.groupeSanguin ? (
                      <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-4 dark:border-red-500/20 dark:bg-red-500/10">
                        <span className="text-sm font-semibold text-slate-500 dark:text-slate-300">Groupe renseigné</span>
                        <span className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-extrabold text-white shadow-sm shadow-red-600/20">
                          <Droplet className="h-4 w-4" /> {form.groupeSanguin}
                        </span>
                      </div>
                    ) : (
                      <button onClick={() => setEditing(true)} className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700 transition-colors hover:bg-amber-100">
                        <Plus className="h-4 w-4" /> Renseigner le groupe sanguin
                      </button>
                    )}
                  </Card>

                  <Card className="rounded-[24px] p-5 sm:p-6">
                    <CardHeading icon={<HeartPulse className="w-4 h-4" />} title="Allergies" badgeClass="bg-red-50 dark:bg-red-500/10 text-red-500" />
                    {editing ? (
                      <TagEditor tags={form.allergies} onChange={(next) => setForm((f: any) => ({ ...f, allergies: next }))} placeholder="Ex : Pénicilline" />
                    ) : form.allergies.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {form.allergies.map((a: string, i: number) => (
                          <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-red-100 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                            <AlertTriangle className="h-3.5 w-3.5" /> {a}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                        <ShieldCheck className="h-4 w-4 shrink-0" /> Aucune allergie signalée
                      </div>
                    )}
                  </Card>
                </div>

                <Card accent="border-l-4 border-l-red-500" className="rounded-[24px] p-5 sm:p-6">
                  <CardHeading icon={<Siren className="w-4 h-4" />} title="Contacts d’urgence" badgeClass="bg-red-50 dark:bg-red-500/10 text-red-500" />
                  {editing ? (
                    <ContactsEditor contacts={form.contactsUrgence} onChange={(next) => setForm((f: any) => ({ ...f, contactsUrgence: next }))} />
                  ) : visibleContacts.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {visibleContacts.map((c: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 dark:border-red-500/20 dark:bg-red-500/10">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-600 text-white">
                            <Phone className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-extrabold text-slate-900 dark:text-white">{c.nom || 'Contact'}</p>
                            <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-300">{c.telephone}{c.lien ? ` · ${c.lien}` : ''}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <button onClick={() => setEditing(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-red-200 px-4 py-4 text-sm font-bold text-red-500 transition-colors hover:border-red-300 hover:bg-red-50 dark:border-red-500/20 dark:hover:bg-red-500/10">
                      <Plus className="h-4 w-4" /> Ajouter un contact d’urgence
                    </button>
                  )}
                </Card>

                <Card className="rounded-[24px] p-0 overflow-hidden">
                  <div className="flex flex-col gap-2 border-b border-slate-100 p-5 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <CardHeading
                      icon={<Flag className="h-4 w-4" />}
                      title="Mes signalements"
                      badgeClass="bg-red-50 dark:bg-red-500/10 text-red-600"
                    />
                    {!reportsLoading && !reportsError && (
                      <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-white/10 dark:text-slate-200">
                        {reports.length} dossier{reports.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {reportsLoading ? (
                    <LoadingSpinner label="Chargement des signalements..." />
                  ) : reportsError ? (
                    <div className="p-6">
                      <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        Impossible de charger l’historique de vos signalements.
                      </div>
                    </div>
                  ) : reports.length === 0 ? (
                    <EmptyState
                      icon={Flag}
                      title="Aucun signalement"
                      description="Les signalements envoyés à l’administration apparaîtront ici avec leur état de traitement."
                    />
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-white/10">
                      {reports.slice(0, 3).map((report) => (
                        <PatientReportRow
                          key={report.id}
                          report={report}
                          onOpen={() => setSelectedReport(report)}
                        />
                      ))}
                      {reports.length > 3 && (
                        <div className="p-4 sm:px-5">
                          <button
                            type="button"
                            onClick={() => setReportsHistoryOpen(true)}
                            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-blue-500/30 dark:hover:bg-blue-500/10"
                          >
                            Voir les {reports.length} signalements
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              </>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Card className="rounded-[24px] p-5 sm:p-6">
                  <CardHeading icon={<Stethoscope className="w-4 h-4" />} title="Pratique" />
                  <FieldRow icon={<Stethoscope className="w-4 h-4" />} label="Spécialité" value={form.specialite} placeholder="Ex : Cardiologie" emptyLabel="Ajouter votre spécialité" editing={editing} onChange={set('specialite')} onRequestEdit={() => setEditing(true)} />
                </Card>
                <Card className="rounded-[24px] p-5 sm:p-6">
                  <CardHeading icon={<BadgeCheck className="w-4 h-4" />} title="Accréditation" />
                  <FieldRow icon={<BadgeCheck className="w-4 h-4" />} label="Numéro d'ordre" value={user.numeroOrdre || ''} emptyLabel="Non renseigné" editing={false} onRequestEdit={() => setEditing(true)} />
                </Card>
                <Card className="rounded-[24px] p-5 sm:p-6 md:col-span-2">
                  <CardHeading icon={<CalendarClock className="w-4 h-4" />} title="Disponibilités" />
                  <FieldRow icon={<CalendarClock className="w-4 h-4" />} label="Horaires" value={medecinDispo} placeholder="Ex : Lun - Ven, 8h - 17h" emptyLabel="Ajouter vos disponibilités" editing={editing} onChange={set('disponibilitesTexte')} onRequestEdit={() => setEditing(true)} />
                </Card>
              </div>
            )}
          </main>

          <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
            <Card className="rounded-[24px] p-5 sm:p-6">
              <CardHeading icon={<ShieldCheck className="w-4 h-4" />} title="Confidentialité" />
              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex gap-3">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  <p>Vos données médicales restent protégées et utilisées uniquement pour votre prise en charge.</p>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <p>Les champs sensibles sont séparés pour être lisibles rapidement en consultation.</p>
                </div>
              </div>
            </Card>

            <Card className="rounded-[24px] p-5 sm:p-6">
              <CardHeading icon={<Info className="w-4 h-4" />} title="Conseil" badgeClass="bg-amber-50 dark:bg-amber-500/10 text-amber-600" />
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                Ajoutez au minimum un contact d’urgence, votre groupe sanguin et vos allergies connues pour faciliter la prise en charge rapide.
              </p>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  )
}
