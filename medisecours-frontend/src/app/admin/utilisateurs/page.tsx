// @ts-nocheck
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Ban, Check, Eye, EyeOff, Mail, Pencil, Phone, Plus, Search,
  ShieldCheck, Stethoscope, UserCheck, Users, X,
} from 'lucide-react'
import api from '../../../api/axios'
import LoadingSpinner from '../../../components/ui/LoadingSpinner'
import EmptyState from '../../../components/ui/EmptyState'
import Avatar from '../../../components/ui/Avatar'
import Button from '../../../components/ui/Button'
import Modal from '../../../components/ui/Modal'
import ConfirmModal from '../../../components/ui/ConfirmModal'
import { useToast } from '../../../components/ui/Toast'

const EMPTY_CREATE_FORM = {
  type: 'patient',
  nom: '',
  prenom: '',
  email: '',
  password: '',
  telephone: '',
  quartier: '',
  groupeSanguin: '',
  allergies: '',
  specialite: '',
  numeroOrdre: '',
}

const ROLE_LABEL = {
  ROLE_MEDECIN: 'Medecin',
  ROLE_PATIENT: 'Patient',
}

const ACTION_COPY = {
  activer: { verb: 'activer', label: 'Activer', type: 'success' },
  desactiver: { verb: 'desactiver', label: 'Desactiver', type: 'danger' },
  bannir: { verb: 'bannir', label: 'Bannir', type: 'danger' },
  debannir: { verb: 'debannir', label: 'Debannir', type: 'success' },
}

function primaryRole(roles = []) {
  return roles.includes('ROLE_MEDECIN') ? 'ROLE_MEDECIN' : 'ROLE_PATIENT'
}

function fullName(user) {
  return `${user?.prenom || ''} ${user?.nom || ''}`.trim()
}

function normalizeList(value) {
  if (!value) return []
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function createPayload(form) {
  const base = {
    type: form.type,
    nom: form.nom.trim(),
    prenom: form.prenom.trim(),
    email: form.email.trim(),
    password: form.password,
    telephone: form.telephone.trim(),
    quartier: form.quartier.trim(),
  }

  if (form.type === 'patient') {
    return {
      ...base,
      groupeSanguin: form.groupeSanguin.trim(),
      allergies: normalizeList(form.allergies),
    }
  }

  return {
    ...base,
    specialite: form.specialite.trim(),
    numeroOrdre: form.numeroOrdre.trim(),
  }
}

function updatePayload(form, role) {
  // N'inclure que les champs non-vides pour éviter les erreurs de validation
  const base = {}
  if (form.nom?.trim())     base.nom     = form.nom.trim()
  if (form.prenom?.trim())  base.prenom  = form.prenom.trim()
  if (form.email?.trim())   base.email   = form.email.trim()
  // Téléphone : envoyer null si vide pour l'effacer, sinon la valeur
  base.telephone = form.telephone?.trim() || null
  base.quartier  = form.quartier?.trim()  || null

  if (role === 'ROLE_PATIENT') {
    base.groupeSanguin = form.groupeSanguin?.trim() || null
    if (form.allergies?.trim()) {
      base.allergies = normalizeList(form.allergies)
    }
  }

  if (role === 'ROLE_MEDECIN') {
    base.specialite  = form.specialite?.trim()  || null
    base.numeroOrdre = form.numeroOrdre?.trim() || null
  }

  return base
}

function formFromUser(user) {
  return {
    id: user.id,
    nom: user.nom || '',
    prenom: user.prenom || '',
    email: user.email || '',
    telephone: user.telephone || '',
    quartier: user.quartier || '',
    groupeSanguin: user.groupeSanguin || '',
    allergies: Array.isArray(user.allergies) ? user.allergies.join(', ') : (user.allergies || ''),
    specialite: user.specialite || '',
    numeroOrdre: user.numeroOrdre || '',
  }
}

export default function UtilisateursPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')
  const [viewModal, setViewModal] = useState(null)
  const [editModal, setEditModal] = useState(null)
  const [createModal, setCreateModal] = useState(false)
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, user: null, action: null })
  const [actionLoading, setActionLoading] = useState(false)
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM)
  const [editForm, setEditForm] = useState(formFromUser({}))
  const [showPassword, setShowPassword] = useState(false)
  const toast = useToast()

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/admin/users')
      setUsers(Array.isArray(res.data?.users) ? res.data.users : [])
    } catch (err) {
      console.error('Error loading users:', err)
      toast.error('Impossible de charger les utilisateurs.')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    let ignore = false

    async function run() {
      setLoading(true)
      try {
        const res = await api.get('/api/admin/users')
        if (!ignore) {
          setUsers(Array.isArray(res.data?.users) ? res.data.users : [])
        }
      } catch (err) {
        console.error('Error loading users:', err)
        if (!ignore) {
          toast.error('Impossible de charger les utilisateurs.')
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    run()
    return () => {
      ignore = true
    }
  }, [toast])

  const passwordChecks = useMemo(() => ({
    minLen: createForm.password.length >= 8,
    hasUpper: /[A-Z]/.test(createForm.password),
    hasLower: /[a-z]/.test(createForm.password),
    hasDigit: /\d/.test(createForm.password),
    hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(createForm.password),
  }), [createForm.password])

  const phoneValid = useMemo(() => {
    if (!createForm.telephone) return null
    const p = createForm.telephone.replace(/[\s\-]/g, '')
    return /^\+237\d{9}$/.test(p) || /^0\d{9}$/.test(p)
  }, [createForm.telephone])

  const filtered = useMemo(() => {
    return users.filter((user) => {
      const role = primaryRole(user.roles)
      if (filter && role !== filter) return false
      if (
        search &&
        !`${user.prenom || ''} ${user.nom || ''} ${user.email || ''}`.toLowerCase().includes(search.toLowerCase())
      ) {
        return false
      }
      return true
    })
  }, [users, filter, search])

  const counts = useMemo(() => ({
    total: users.length,
    patients: users.filter((user) => primaryRole(user.roles) === 'ROLE_PATIENT').length,
    medecins: users.filter((user) => primaryRole(user.roles) === 'ROLE_MEDECIN').length,
    actifs: users.filter((user) => user.actif && !user.banni).length,
  }), [users])

  const confirmActionMeta = ACTION_COPY[confirmModal.action] || ACTION_COPY.desactiver

  const openEditModal = (user) => {
    setEditModal(user)
    setEditForm(formFromUser(user))
  }

  const closeEditModal = () => {
    setEditModal(null)
    setEditForm(formFromUser({}))
  }

  const openStatusModal = (user, action) => {
    setConfirmModal({ isOpen: true, user, action })
  }

  const handleConfirmAction = async () => {
    if (!confirmModal.user || !confirmModal.action) return

    setActionLoading(true)
    try {
      const { data } = await api.patch(`/api/admin/users/${confirmModal.user.id}/status`, {
        action: confirmModal.action,
      })
      const updatedUser = data?.user
      setUsers((prev) => prev.map((user) => (user.id === confirmModal.user.id ? (updatedUser || user) : user)))
      toast.success(data?.message || `Utilisateur ${confirmActionMeta.verb} avec succes.`)
    } catch (err) {
      console.error('Error performing action:', err)
      toast.error(err.response?.data?.error || 'Echec de l operation.')
    } finally {
      setActionLoading(false)
      setConfirmModal({ isOpen: false, user: null, action: null })
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      const { data } = await api.post('/api/admin/users', createPayload(createForm))
      if (data?.user) {
        setUsers((prev) => [data.user, ...prev])
      } else {
        await fetchUsers()
      }
      toast.success(data?.message || 'Utilisateur cree avec succes.')
      setCreateModal(false)
      setCreateForm(EMPTY_CREATE_FORM)
    } catch (err) {
      console.error('Error creating user:', err)
      toast.error(err.response?.data?.error || 'Echec de la creation.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleEditUser = async (e) => {
    e.preventDefault()
    if (!editModal) return

    setActionLoading(true)
    try {
      const role = primaryRole(editModal.roles)
      const { data } = await api.patch(`/api/admin/users/${editModal.id}`, updatePayload(editForm, role))
      const updatedUser = data?.user
      setUsers((prev) => prev.map((user) => (user.id === editModal.id ? (updatedUser || user) : user)))
      setViewModal((prev) => (prev?.id === editModal.id ? (updatedUser || prev) : prev))
      toast.success(data?.message || 'Utilisateur modifié avec succès.')
      closeEditModal()
    } catch (err) {
      const serverErrors = err.response?.data?.errors
      const serverMsg    = err.response?.data?.error
      if (serverErrors && typeof serverErrors === 'object') {
        // Afficher chaque erreur de validation par champ
        Object.entries(serverErrors).forEach(([field, msg]) => {
          toast.error(`${field} : ${msg}`)
        })
      } else {
        toast.error(serverMsg || 'Échec de la modification.')
      }
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return <LoadingSpinner label="Chargement des utilisateurs..." />

  return (
    <div className="space-y-6">
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, user: null, action: null })}
        onConfirm={handleConfirmAction}
        isLoading={actionLoading}
        type={confirmActionMeta.type}
        title={`${confirmActionMeta.label} cet utilisateur ?`}
        message={confirmModal.user ? `Voulez-vous ${confirmActionMeta.verb} ${fullName(confirmModal.user)} ?` : ''}
        confirmText={confirmActionMeta.label}
      />

      {/* Slide-over détails utilisateur — même style que page médecins */}
      <AnimatePresence>
        {viewModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setViewModal(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-primary-800 shadow-2xl z-50 overflow-y-auto"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-display font-bold text-xl text-primary-900 dark:text-sable">
                    Détails utilisateur
                  </h3>
                  <button onClick={() => setViewModal(null)} className="text-primary-300 hover:text-primary-700">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Avatar + identité */}
                <div className="flex flex-col items-center mb-6 pb-6 border-b border-primary-100 dark:border-white/5">
                  <Avatar name={fullName(viewModal)} size="lg" />
                  <h4 className="font-display font-semibold text-lg text-primary-900 dark:text-sable mt-3 text-center">
                    {fullName(viewModal)}
                  </h4>
                  <p className="text-sm text-primary-300 mb-3">{viewModal.email}</p>

                  {/* Badges statut */}
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                      primaryRole(viewModal.roles) === 'ROLE_MEDECIN'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-mint-100 text-mint-700'
                    }`}>
                      {primaryRole(viewModal.roles) === 'ROLE_MEDECIN' ? '🩺 Médecin' : '👤 Patient'}
                    </span>
                    {viewModal.banni ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-urgence-100 text-urgence-700">
                        <Ban className="w-3 h-3" /> Banni
                      </span>
                    ) : viewModal.actif ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-mint-100 text-mint-700">
                        <UserCheck className="w-3 h-3" /> Actif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                        <X className="w-3 h-3" /> Désactivé
                      </span>
                    )}
                    {!viewModal.emailVerified && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600">
                        ⚠️ Email non vérifié
                      </span>
                    )}
                  </div>
                </div>

                {/* Infos principales */}
                <div className="space-y-3">
                  {[
                    { icon: Mail,  label: 'Email',     value: viewModal.email },
                    { icon: Phone, label: 'Téléphone', value: viewModal.telephone },
                    { icon: null,  label: 'Quartier',  value: viewModal.quartier },
                    { icon: null,  label: 'Inscription', value: viewModal.createdAt
                        ? new Date(viewModal.createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })
                        : null },
                  ].filter((f) => f.value).map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-start gap-3 p-3 rounded-xl bg-primary-50 dark:bg-primary-900/40">
                      {Icon && <Icon className="w-4 h-4 text-primary-300 shrink-0 mt-0.5" />}
                      {!Icon && <span className="w-4 h-4 shrink-0" />}
                      <div>
                        <p className="text-[10px] font-semibold text-primary-300 uppercase tracking-wide">{label}</p>
                        <p className="text-sm text-primary-900 dark:text-sable">{value}</p>
                      </div>
                    </div>
                  ))}

                  {/* Champs médecin */}
                  {primaryRole(viewModal.roles) === 'ROLE_MEDECIN' && (
                    <>
                      {viewModal.specialite && (
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/10">
                          <Stethoscope className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-wide">Spécialité</p>
                            <p className="text-sm text-primary-900 dark:text-sable">{viewModal.specialite}</p>
                          </div>
                        </div>
                      )}
                      {viewModal.numeroOrdre && (
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/10">
                          <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-wide">N° d&apos;Ordre</p>
                            <p className="text-sm text-primary-900 dark:text-sable font-mono">{viewModal.numeroOrdre}</p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/10">
                        <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-wide">Validation admin</p>
                          <p className="text-sm text-primary-900 dark:text-sable">
                            {viewModal.estValide ? '✅ Compte validé' : '⏳ En attente de validation'}
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Champs patient */}
                  {primaryRole(viewModal.roles) !== 'ROLE_MEDECIN' && (
                    <>
                      {viewModal.groupeSanguin && (
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-urgence-50 dark:bg-urgence-900/10">
                          <span className="text-urgence-500 shrink-0 mt-0.5 text-base">🩸</span>
                          <div>
                            <p className="text-[10px] font-semibold text-urgence-500 uppercase tracking-wide">Groupe sanguin</p>
                            <p className="text-sm text-primary-900 dark:text-sable font-semibold">{viewModal.groupeSanguin}</p>
                          </div>
                        </div>
                      )}
                      {Array.isArray(viewModal.allergies) && viewModal.allergies.length > 0 && (
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-urgence-50 dark:bg-urgence-900/10">
                          <span className="text-urgence-500 shrink-0 mt-0.5 text-base">⚠️</span>
                          <div>
                            <p className="text-[10px] font-semibold text-urgence-500 uppercase tracking-wide">Allergies</p>
                            <p className="text-sm text-primary-900 dark:text-sable">{viewModal.allergies.join(', ')}</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Actions rapides */}
                <div className="flex gap-2 mt-6 pt-4 border-t border-primary-100 dark:border-white/5">
                  <button
                    onClick={() => { openEditModal(viewModal); setViewModal(null) }}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-primary-200 dark:border-white/10 text-primary-700 dark:text-sable font-semibold hover:bg-primary-50 transition text-sm"
                  >
                    <Pencil className="w-4 h-4" /> Modifier
                  </button>
                  <button
                    onClick={() => { openStatusModal(viewModal, viewModal.actif ? 'desactiver' : 'activer'); setViewModal(null) }}
                    className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition text-sm ${
                      viewModal.actif
                        ? 'bg-urgence-500/10 text-urgence-500 hover:bg-urgence-500/20'
                        : 'bg-mint-500/10 text-mint-500 hover:bg-mint-500/20'
                    }`}
                  >
                    {viewModal.actif ? <><X className="w-4 h-4" /> Désactiver</> : <><Check className="w-4 h-4" /> Activer</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {createModal && (
        <Modal isOpen onClose={() => setCreateModal(false)} title="Creer un utilisateur" size="lg">
          <form onSubmit={handleCreateUser} className="space-y-4">
            <FormSelect
              label="Type d utilisateur"
              value={createForm.type}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, type: e.target.value }))}
              options={[
                { value: 'patient', label: 'Patient' },
                { value: 'medecin', label: 'Medecin' },
              ]}
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="Nom" value={createForm.nom} onChange={(e) => setCreateForm((prev) => ({ ...prev, nom: e.target.value }))} required />
              <FormField label="Prenom" value={createForm.prenom} onChange={(e) => setCreateForm((prev) => ({ ...prev, prenom: e.target.value }))} required />
            </div>
            <FormField label="Email" type="email" value={createForm.email} onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))} required />
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[#7a8578]">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={createForm.password}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                  required
                  className="w-full rounded-2xl border border-[#dfe5db] bg-[#f8faf6] px-4 py-3 pr-12 text-sm text-[#223023] outline-none transition focus:border-[#bfd0bd] focus:bg-white"
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7a8578] hover:text-[#223023]">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {createForm.password.length > 0 && (
                <div className="mt-2 space-y-1">
                  {[
                    { key: 'minLen', label: '8 caractères minimum', ok: passwordChecks.minLen },
                    { key: 'hasUpper', label: 'Une majuscule', ok: passwordChecks.hasUpper },
                    { key: 'hasLower', label: 'Une minuscule', ok: passwordChecks.hasLower },
                    { key: 'hasDigit', label: 'Un chiffre', ok: passwordChecks.hasDigit },
                    { key: 'hasSpecial', label: 'Un caractère spécial', ok: passwordChecks.hasSpecial },
                  ].map(({ key, label, ok }) => (
                    <p key={key} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-600' : 'text-[#7a8578]'}`}>
                      {ok ? <Check className="w-3.5 h-3.5" /> : <span className="inline-block w-3.5 h-3.5 rounded-full border border-current" />}
                      {label}
                    </p>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[#7a8578]">Telephone</label>
                <input
                  type="tel"
                  value={createForm.telephone}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, telephone: e.target.value }))}
                  placeholder="+237 6 89 47 85 12"
                  className="w-full rounded-2xl border border-[#dfe5db] bg-[#f8faf6] px-4 py-3 text-sm text-[#223023] outline-none transition focus:border-[#bfd0bd] focus:bg-white"
                />
                {phoneValid === false && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
                    <X className="w-3.5 h-3.5" />
                    Format invalide (ex: +237 6 89 47 85 12 ou 0689478512)
                  </p>
                )}
                {phoneValid === true && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-green-600">
                    <Check className="w-3.5 h-3.5" />
                    Numéro valide
                  </p>
                )}
              </div>
              <FormField label="Quartier" value={createForm.quartier} onChange={(e) => setCreateForm((prev) => ({ ...prev, quartier: e.target.value }))} />
            </div>
            {createForm.type === 'patient' && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField label="Groupe sanguin" value={createForm.groupeSanguin} onChange={(e) => setCreateForm((prev) => ({ ...prev, groupeSanguin: e.target.value }))} placeholder="A+, O-, etc." />
                <FormField label="Allergies" value={createForm.allergies} onChange={(e) => setCreateForm((prev) => ({ ...prev, allergies: e.target.value }))} placeholder="Penicilline, Aspirine" />
              </div>
            )}
            {createForm.type === 'medecin' && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField label="Specialite" value={createForm.specialite} onChange={(e) => setCreateForm((prev) => ({ ...prev, specialite: e.target.value }))} />
                <FormField label="Numero d ordre" value={createForm.numeroOrdre} onChange={(e) => setCreateForm((prev) => ({ ...prev, numeroOrdre: e.target.value }))} />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="secondary" onClick={() => setCreateModal(false)} disabled={actionLoading}>Annuler</Button>
              <Button variant="primary" type="submit" isLoading={actionLoading}>Creer</Button>
            </div>
          </form>
        </Modal>
      )}

      {editModal && (
        <Modal isOpen onClose={closeEditModal} title="Modifier un utilisateur" size="lg">
          <form onSubmit={handleEditUser} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="Nom" value={editForm.nom} onChange={(e) => setEditForm((prev) => ({ ...prev, nom: e.target.value }))} required />
              <FormField label="Prenom" value={editForm.prenom} onChange={(e) => setEditForm((prev) => ({ ...prev, prenom: e.target.value }))} required />
            </div>
            <FormField label="Email" type="email" value={editForm.email} onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))} required />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="Telephone" value={editForm.telephone} onChange={(e) => setEditForm((prev) => ({ ...prev, telephone: e.target.value }))} />
              <FormField label="Quartier" value={editForm.quartier} onChange={(e) => setEditForm((prev) => ({ ...prev, quartier: e.target.value }))} />
            </div>
            {primaryRole(editModal.roles) === 'ROLE_PATIENT' && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField label="Groupe sanguin" value={editForm.groupeSanguin} onChange={(e) => setEditForm((prev) => ({ ...prev, groupeSanguin: e.target.value }))} />
                <FormField label="Allergies" value={editForm.allergies} onChange={(e) => setEditForm((prev) => ({ ...prev, allergies: e.target.value }))} />
              </div>
            )}
            {primaryRole(editModal.roles) === 'ROLE_MEDECIN' && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField label="Specialite" value={editForm.specialite} onChange={(e) => setEditForm((prev) => ({ ...prev, specialite: e.target.value }))} />
                <FormField label="Numero d ordre" value={editForm.numeroOrdre} onChange={(e) => setEditForm((prev) => ({ ...prev, numeroOrdre: e.target.value }))} />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="secondary" onClick={closeEditModal} disabled={actionLoading}>Annuler</Button>
              <Button variant="primary" type="submit" isLoading={actionLoading}>Modifier</Button>
            </div>
          </form>
        </Modal>
      )}

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-[28px] bg-[linear-gradient(135deg,#09170f_0%,#0f2418_60%,#183626_100%)] p-6 text-white shadow-[0_18px_45px_rgba(15,36,24,0.16)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Gestion des comptes</p>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight">Utilisateurs</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/72">
            Pilote les patients et les medecins depuis une vue unique, avec filtres, verification des statuts
            et actions rapides alignees sur la nouvelle direction artistique.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-full bg-[#57c66b] px-4 py-3 text-sm font-semibold text-[#0f2418] transition hover:bg-[#6cda80]"
            >
              <Plus className="h-4 w-4" />
              Nouvel utilisateur
            </button>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-3 text-sm font-semibold text-white/80">
              <Users className="h-4 w-4" />
              {counts.total} comptes suivis
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
          <StatCard label="Total" value={counts.total} icon={Users} />
          <StatCard label="Patients" value={counts.patients} icon={UserCheck} tone="green" />
          <StatCard label="Medecins" value={counts.medecins} icon={ShieldCheck} tone="blue" />
          <StatCard label="Actifs" value={counts.actifs} icon={Check} tone="lime" />
        </div>
      </section>

      <section className="rounded-[28px] border border-[#e3e7df] bg-white p-5 shadow-[0_18px_45px_rgba(15,36,24,0.05)] sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-lg font-bold text-[#152116]">Recherche et segmentation</p>
            <p className="mt-1 text-sm text-[#6f796c]">Filtre rapidement les comptes par role et par identite.</p>
          </div>
          <div className="flex flex-1 flex-col gap-3 xl:max-w-3xl xl:flex-row xl:items-center xl:justify-end">
            <div className="relative xl:min-w-[320px] xl:flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a8678]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un patient ou un medecin..."
                className="w-full rounded-full border border-[#dfe5db] bg-[#f8faf6] py-3 pl-11 pr-4 text-sm text-[#233024] outline-none transition focus:border-[#bfd0bd] focus:bg-white"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {['', 'ROLE_PATIENT', 'ROLE_MEDECIN'].map((role) => (
                <button
                  key={role || 'all'}
                  type="button"
                  onClick={() => setFilter(role)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    filter === role
                      ? 'bg-[#0f2418] text-white'
                      : 'border border-[#dfe5db] bg-white text-[#5f6c5d] hover:bg-[#edf2ea]'
                  }`}
                >
                  {role ? ROLE_LABEL[role] : 'Tous'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-[#e3e7df] bg-white p-2 shadow-[0_18px_45px_rgba(15,36,24,0.05)] sm:p-3">
        {filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="Aucun utilisateur"
              description="Aucun patient ou medecin ne correspond a ces criteres."
            />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[24px]">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.18em] text-[#7a8578]">
                  <th className="px-5 py-4 font-semibold">Utilisateur</th>
                  <th className="px-5 py-4 font-semibold">Contact</th>
                  <th className="px-5 py-4 font-semibold">Role</th>
                  <th className="px-5 py-4 font-semibold">Statut</th>
                  <th className="px-5 py-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id} className="border-t border-[#edf1eb] align-top">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={fullName(user)} size="sm" />
                        <div>
                          <p className="font-semibold text-[#172216]">{fullName(user)}</p>
                          <p className="mt-1 text-xs text-[#778275]">{user.quartier || 'Quartier non renseigne'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-1 text-sm">
                        <p className="text-[#223023]">{user.email}</p>
                        <p className="text-[#7b8678]">{user.telephone || 'Telephone non renseigne'}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <RolePill role={primaryRole(user.roles)} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <StatusPill user={user} />
                        {!user.emailVerified && (
                          <span className="inline-flex rounded-full bg-[#fff4dc] px-3 py-1 text-xs font-semibold text-[#9b6b17]">
                            Email non verifie
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <ActionButton onClick={() => setViewModal(user)} title="Voir">
                          <Eye className="h-4 w-4" />
                        </ActionButton>
                        <ActionButton onClick={() => openEditModal(user)} title="Modifier">
                          <Pencil className="h-4 w-4" />
                        </ActionButton>
                        <ActionButton
                          onClick={() => openStatusModal(user, user.actif ? 'desactiver' : 'activer')}
                          title={user.actif ? 'Desactiver' : 'Activer'}
                          tone={user.actif ? 'amber' : 'green'}
                        >
                          {user.actif ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                        </ActionButton>
                        <ActionButton
                          onClick={() => openStatusModal(user, user.banni ? 'debannir' : 'bannir')}
                          title={user.banni ? 'Debannir' : 'Bannir'}
                          tone={user.banni ? 'green' : 'red'}
                        >
                          <Ban className="h-4 w-4" />
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-white text-[#152116]',
    green: 'bg-[#f3f9f1] text-[#2f6b45]',
    blue: 'bg-[#f3f6fb] text-[#285074]',
    lime: 'bg-[#f5f8eb] text-[#5f7a34]',
  }

  return (
    <div className={`rounded-[24px] border border-[#e3e7df] p-5 shadow-[0_18px_45px_rgba(15,36,24,0.05)] ${tones[tone] || tones.neutral}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7c8778]">{label}</p>
          <p className="mt-3 font-display text-3xl font-extrabold tracking-tight">{value}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-[0_8px_18px_rgba(15,36,24,0.06)]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function RolePill({ role }) {
  const ui = role === 'ROLE_MEDECIN'
    ? 'bg-[#edf4fb] text-[#285074]'
    : 'bg-[#e8f3e8] text-[#2f6b45]'

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${ui}`}>
      {ROLE_LABEL[role]}
    </span>
  )
}

function StatusPill({ user }) {
  if (user.banni) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#fde8e8] px-3 py-1 text-xs font-semibold text-[#b44949]">
        <Ban className="h-3 w-3" />
        Banni
      </span>
    )
  }

  if (user.actif) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f3e8] px-3 py-1 text-xs font-semibold text-[#2f6b45]">
        <UserCheck className="h-3 w-3" />
        Actif
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#fff4dc] px-3 py-1 text-xs font-semibold text-[#9b6b17]">
      <X className="h-3 w-3" />
      Desactive
    </span>
  )
}

function ActionButton({ children, onClick, title, tone = 'neutral' }) {
  const tones = {
    neutral: 'border-[#dfe5db] bg-white text-[#566355] hover:bg-[#edf2ea]',
    green: 'border-[#d6ead6] bg-[#f2faf0] text-[#2f6b45] hover:bg-[#e6f4e2]',
    amber: 'border-[#f2e2bc] bg-[#fff8e8] text-[#9b6b17] hover:bg-[#fff1cf]',
    red: 'border-[#efd8d8] bg-[#fdf2f2] text-[#b44949] hover:bg-[#fde8e8]',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition ${tones[tone] || tones.neutral}`}
    >
      {children}
    </button>
  )
}

function FormField({ label, value, onChange, type = 'text', required = false, placeholder = '' }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[#7a8578]">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-[#dfe5db] bg-[#f8faf6] px-4 py-3 text-sm text-[#223023] outline-none transition focus:border-[#bfd0bd] focus:bg-white"
      />
    </div>
  )
}

function FormSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[#7a8578]">{label}</label>
      <select
        value={value}
        onChange={onChange}
        className="w-full rounded-2xl border border-[#dfe5db] bg-[#f8faf6] px-4 py-3 text-sm text-[#223023] outline-none transition focus:border-[#bfd0bd] focus:bg-white"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  )
}

function DetailBlock({ label, value, icon: Icon }) {
  return (
    <div className="rounded-[20px] border border-[#e5e9e1] bg-[#fbfcfa] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a8578]">{label}</p>
      <p className="mt-2 flex items-center gap-2 text-sm font-medium text-[#243124]">
        {Icon ? <Icon className="h-4 w-4 text-[#7a8578]" /> : null}
        {value}
      </p>
    </div>
  )
}
