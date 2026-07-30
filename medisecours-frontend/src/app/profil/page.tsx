'use client'

import { useRef, useState } from 'react'
import { Camera, Save, Edit3, ShieldCheck, X } from 'lucide-react'
import api from '../../api/axios'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'

function Field({ label, value, onChange, editing }: {
  label: string
  value: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  editing: boolean
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-primary-300 uppercase tracking-wide">{label}</label>
      {editing ? (
        <input
          value={value || ''}
          onChange={onChange}
          className="w-full mt-1 px-3 py-2.5 rounded-xl border border-primary-100 dark:border-white/10 bg-white/80 dark:bg-primary-900/40 focus:outline-none focus:ring-2 focus:ring-mint-500"
        />
      ) : (
        <p className="text-sm text-primary-900 dark:text-sable mt-1">{value || '—'}</p>
      )}
    </div>
  )
}

export default function ProfilPage() {
  const { user, updateUser } = useAuth()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const isMedecin = user?.roles?.includes('ROLE_MEDECIN')

  const [form, setForm] = useState<any>({
    telephone: user?.telephone || '',
    quartier: user?.quartier || '',
    groupeSanguin: user?.groupeSanguin || '',
    allergies: user?.allergies || '',
    contactsUrgence: user?.contactsUrgence || '',
    specialite: user?.specialite || '',
    disponibilites: user?.disponibilites || '',
  })

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f: any) => ({ ...f, [key]: e.target.value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data } = await api.patch(`/api/users/${user.id}`, form, { headers: { 'Content-Type': 'application/merge-patch+json' } })
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
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const { data } = await api.post('/api/media_objects', formData, { headers: { 'Content-Type': undefined } })
      const photoUrl = data.contentUrl || data['@id']
      const { data: updated } = await api.patch(`/api/users/${user.id}`, { photoProfil: photoUrl }, { headers: { 'Content-Type': 'application/merge-patch+json' } })
      updateUser({ ...user, ...updated })
      toast.success('Photo de profil mise à jour.')
    } catch {
      toast.error("Échec de l'envoi de la photo.")
    } finally {
      setUploading(false)
    }
  }

  if (!user) return null
  const initials = `${user.prenom?.[0] || ''}${user.nom?.[0] || ''}`.toUpperCase()

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="rounded-2xl bg-white/80 dark:bg-primary-700/40 border border-white/50 dark:border-white/10 shadow-glass p-5 sm:p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-primary-500 text-white flex items-center justify-center text-2xl font-bold overflow-hidden">
              {user.photoProfil ? <img src={user.photoProfil} alt="" className="w-full h-full object-cover" /> : initials}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-mint-500 text-white flex items-center justify-center shadow-lg"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleUpload} />
          </div>
          <h1 className="font-display font-bold text-2xl text-primary-900 dark:text-sable mt-4">{user.prenom} {user.nom}</h1>
          <p className="text-sm text-primary-300">{user.email}</p>
          {isMedecin && (
            <span className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full ${user.estValide ? 'bg-mint-100 text-mint-700' : 'bg-amber-100 text-amber-700'}`}>
              <ShieldCheck className="w-3.5 h-3.5" /> {user.estValide ? 'Compte validé' : 'En attente de validation'}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-primary-900 dark:text-sable">Informations</h2>
          <button
            onClick={() => editing ? handleSave() : setEditing(true)}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-mint-500 hover:bg-mint-700 text-white text-sm font-semibold disabled:opacity-60"
          >
            {editing ? <><Save className="w-4 h-4" /> {saving ? 'Enregistrement…' : 'Enregistrer'}</> : <><Edit3 className="w-4 h-4" /> Modifier</>}
          </button>
          {editing && (
            <button onClick={() => setEditing(false)} className="ml-2 p-2 text-primary-300"><X className="w-4 h-4" /></button>
          )}
        </div>

        <div className="space-y-4">
          {!isMedecin ? (
            <>
              <Field label="Téléphone" value={form.telephone} onChange={set('telephone')} editing={editing} />
              <Field label="Quartier" value={form.quartier} onChange={set('quartier')} editing={editing} />
              <Field label="Groupe sanguin" value={form.groupeSanguin} onChange={set('groupeSanguin')} editing={editing} />
              <Field label="Allergies" value={form.allergies} onChange={set('allergies')} editing={editing} />
              <Field label="Contact d'urgence" value={form.contactsUrgence} onChange={set('contactsUrgence')} editing={editing} />
            </>
          ) : (
            <>
              <Field label="Spécialité" value={form.specialite} onChange={set('specialite')} editing={editing} />
              <Field label="Numéro d'ordre" value={user.numeroOrdre} editing={false} />
              <Field label="Disponibilités" value={form.disponibilites} onChange={set('disponibilites')} editing={editing} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
