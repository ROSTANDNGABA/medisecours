// @ts-nocheck
'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, Save, ShieldCheck, Star, ClipboardList, MessageSquare, Plus, Trash2 } from 'lucide-react'
import api from '../../../api/axios'
import { useAuth } from '../../../hooks/useAuth'
import { useToast } from '../../../components/ui/Toast'
import Avatar from '../../../components/ui/Avatar'
import LoadingSpinner from '../../../components/ui/LoadingSpinner'

const DAYS = [
  { key: 'lundi', label: 'Lun' },
  { key: 'mardi', label: 'Mar' },
  { key: 'mercredi', label: 'Mer' },
  { key: 'jeudi', label: 'Jeu' },
  { key: 'vendredi', label: 'Ven' },
  { key: 'samedi', label: 'Sam' },
  { key: 'dimanche', label: 'Dim' },
]

export default function MedecinProfilPage() {
  const { user, updateUser } = useAuth()
  const toast = useToast()
  const fileRef = useRef(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [avis, setAvis] = useState([])
  const [consultationsCount, setConsultationsCount] = useState(0)
  const [messagesCount, setMessagesCount] = useState(0)
  const [loadingStats, setLoadingStats] = useState(true)

  const [form, setForm] = useState({
    prenom: user?.prenom || '',
    nom: user?.nom || '',
    email: user?.email || '',
    telephone: user?.telephone || '',
    specialite: user?.specialite || '',
  })
  const [dispo, setDispo] = useState(Array.isArray(user?.disponibilites) ? user.disponibilites : [])

  useEffect(() => {
    if (!user?.id) return
    Promise.all([
      api.get(`/api/avis?medecin=${user.id}`),
      api.get('/api/consultations'),
      api.get('/api/messages'),
    ])
      .then(([avisRes, consRes, msgRes]) => {
        const extract = (res) => {
          const raw = res.data?.['hydra:member'] ?? res.data?.member ?? res.data
          return Array.isArray(raw) ? raw : []
        }
        setAvis(extract(avisRes))
        setConsultationsCount(extract(consRes).length)
        setMessagesCount(extract(msgRes).length)
      })
      .catch(() => {})
      .finally(() => setLoadingStats(false))
  }, [user?.id])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const toggleDay = (dayKey) => {
    setDispo((d) => {
      if (d.some((s) => s.jour === dayKey)) return d.filter((s) => s.jour !== dayKey)
      return [...d, { jour: dayKey, debut: '08:00', fin: '17:00' }]
    })
  }

  const updateSlot = (dayKey, field, value) => {
    setDispo((d) => d.map((s) => (s.jour === dayKey ? { ...s, [field]: value } : s)))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data } = await api.patch(`/api/users/${user.id}`, { ...form, disponibilites: dispo }, { headers: { 'Content-Type': 'application/merge-patch+json' } })
      updateUser({ ...user, ...data })
      toast.success('Profil mis à jour.')
    } catch {
      toast.error('Échec de la mise à jour du profil.')
    } finally {
      setSaving(false)
    }
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const { data } = await api.post('/api/media_objects', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
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

  const noteMoyenne = avis.length ? (avis.reduce((s, a) => s + a.note, 0) / avis.length).toFixed(1) : 0

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left card */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl bg-white dark:bg-primary-800 border border-primary-100 dark:border-white/5 p-6 sticky top-20 text-center">
            <div className="relative inline-block mb-4">
              <div className="w-20 h-20 rounded-full bg-mint-500 text-white flex items-center justify-center text-2xl font-bold overflow-hidden mx-auto">
                {user.photoProfil ? <img src={user.photoProfil} alt="" className="w-full h-full object-cover" /> : `${user.prenom?.[0] || ''}${user.nom?.[0] || ''}`.toUpperCase()}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-lg"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleUpload} />
            </div>
            <h2 className="font-display font-bold text-lg text-primary-900 dark:text-sable">Dr. {user.prenom} {user.nom}</h2>
            <span className="inline-block mt-1 mb-3 text-xs font-semibold px-2.5 py-1 rounded-full bg-mint-100 text-mint-700">{user.specialite}</span>

            <div className="mb-4">
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full ${user.estValide ? 'bg-mint-100 text-mint-700' : 'bg-amber-100 text-amber-700'}`}>
                <ShieldCheck className="w-3.5 h-3.5" /> {user.estValide ? 'Compte validé' : 'En attente de validation'}
              </span>
            </div>

            <p className="text-xs text-primary-300 mb-4">N° Ordre : {user.numeroOrdre}</p>

            <div className="flex items-center justify-center gap-1 mb-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className={`w-4 h-4 ${i <= Math.round(noteMoyenne) ? 'text-amber-400' : 'text-gray-200 dark:text-primary-700'}`} fill="currentColor" />
              ))}
            </div>
            <p className="text-xs text-primary-300 mb-4">{noteMoyenne}/5 · {avis.length} avis</p>

            {loadingStats ? <LoadingSpinner size="sm" /> : (
              <div className="grid grid-cols-2 gap-2 text-left">
                <div className="rounded-xl bg-primary-50 dark:bg-primary-900/40 p-3">
                  <ClipboardList className="w-4 h-4 text-primary-500 mb-1" />
                  <p className="font-display font-bold text-primary-900 dark:text-sable">{consultationsCount}</p>
                  <p className="text-[10px] text-primary-300">Consultations</p>
                </div>
                <div className="rounded-xl bg-primary-50 dark:bg-primary-900/40 p-3">
                  <MessageSquare className="w-4 h-4 text-primary-500 mb-1" />
                  <p className="font-display font-bold text-primary-900 dark:text-sable">{messagesCount}</p>
                  <p className="text-[10px] text-primary-300">Messages</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl bg-white dark:bg-primary-800 border border-primary-100 dark:border-white/5 p-6">
            <h3 className="font-display font-bold text-lg text-primary-900 dark:text-sable mb-4">Informations personnelles</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Prénom" value={form.prenom} onChange={set('prenom')} />
              <Field label="Nom" value={form.nom} onChange={set('nom')} />
              <Field label="Email" value={form.email} onChange={set('email')} />
              <Field label="Téléphone" value={form.telephone} onChange={set('telephone')} />
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-primary-800 border border-primary-100 dark:border-white/5 p-6">
            <h3 className="font-display font-bold text-lg text-primary-900 dark:text-sable mb-4">Informations professionnelles</h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Field label="Spécialité" value={form.specialite} onChange={set('specialite')} />
              <Field label="N° Ordre" value={user.numeroOrdre} readOnly />
            </div>

            <p className="text-sm font-semibold text-primary-900 dark:text-sable mb-3">Disponibilités hebdomadaires</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {DAYS.map((d) => {
                const active = dispo.some((s) => s.jour === d.key)
                return (
                  <button
                    key={d.key}
                    onClick={() => toggleDay(d.key)}
                    className={`w-12 h-10 rounded-xl text-xs font-bold transition ${active ? 'bg-mint-500 text-white' : 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-sable hover:bg-primary-200'}`}
                  >
                    {d.label}
                  </button>
                )
              })}
            </div>

            {dispo.length > 0 && (
              <div className="space-y-2">
                {DAYS.filter((d) => dispo.some((s) => s.jour === d.key)).map((d) => {
                  const slot = dispo.find((s) => s.jour === d.key)
                  return (
                    <div key={d.key} className="flex items-center gap-2 p-2.5 rounded-xl bg-primary-50 dark:bg-primary-900/40">
                      <span className="text-xs font-semibold text-primary-700 dark:text-sable capitalize w-20">{d.key}</span>
                      <input
                        type="time"
                        value={slot.debut}
                        onChange={(e) => updateSlot(d.key, 'debut', e.target.value)}
                        className="px-2 py-1 rounded-lg border border-primary-100 dark:border-white/10 bg-white dark:bg-primary-900 text-sm"
                      />
                      <span className="text-primary-300 text-xs">à</span>
                      <input
                        type="time"
                        value={slot.fin}
                        onChange={(e) => updateSlot(d.key, 'fin', e.target.value)}
                        className="px-2 py-1 rounded-lg border border-primary-100 dark:border-white/10 bg-white dark:bg-primary-900 text-sm"
                      />
                      <button onClick={() => toggleDay(d.key)} className="ml-auto p-1.5 rounded-lg text-urgence-500 hover:bg-urgence-100"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-mint-500 hover:bg-mint-700 text-white font-semibold shadow-lg transition disabled:opacity-60"
          >
            <Save className="w-4 h-4" /> {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, readOnly }) {
  return (
    <div>
      <label className="text-xs font-semibold text-primary-300 uppercase tracking-wide">{label}</label>
      <input
        value={value || ''}
        onChange={onChange}
        readOnly={readOnly}
        className={`w-full mt-1 px-3 py-2.5 rounded-xl border border-primary-100 dark:border-white/10 bg-white dark:bg-primary-900/40 focus:outline-none focus:ring-2 focus:ring-mint-500 ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
      />
    </div>
  )
}
