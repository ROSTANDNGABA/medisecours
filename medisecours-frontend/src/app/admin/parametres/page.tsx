'use client'

import { useState } from 'react'
import { Activity, Info, Key, Save, ShieldCheck } from 'lucide-react'
import api from '../../../api/axios'
import { useAuth } from '../../../hooks/useAuth'
import LoadingSpinner from '../../../components/ui/LoadingSpinner'
import Button from '../../../components/ui/Button'
import Modal from '../../../components/ui/Modal'
import { useToast } from '../../../components/ui/Toast'

export default function AdminParametresPage() {
  const { user, updateUser, logout } = useAuth()
  const toast = useToast()
  const [savingProfile, setSavingProfile] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' })
  const [auditLog, setAuditLog] = useState([])
  const [loadingAudit, setLoadingAudit] = useState(false)
  const [form, setForm] = useState({
    prenom: user?.prenom || '',
    nom: user?.nom || '',
    email: user?.email || '',
    telephone: user?.telephone || '',
  })

  const loadAuditLog = async () => {
    setLoadingAudit(true)
    try {
      const { data } = await api.get('/api/admin/audit-log')
      setAuditLog(data.entries || [])
    } catch {
      toast.error('Impossible de charger le journal d audit.')
    } finally {
      setLoadingAudit(false)
    }
  }

  const setFormField = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [key]: e.target.value }))
  const setPasswordField = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => setPasswordForm((current) => ({ ...current, [key]: e.target.value }))

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    try {
      const profilePayload = { ...form }
      delete (profilePayload as Partial<typeof form>).email
      const { data } = await api.patch(`/api/users/${user.id}`, profilePayload, {
        headers: { 'Content-Type': 'application/merge-patch+json' },
      })
      updateUser({ ...user, ...data })
      toast.success('Profil administrateur mis a jour.')
    } catch {
      toast.error('Echec de la mise a jour.')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      toast.error('Les mots de passe ne correspondent pas.')
      return
    }

    setChangingPassword(true)
    try {
      await api.post('/api/auth/change-password', {
        currentPassword: passwordForm.current,
        newPassword: passwordForm.new,
      })
      toast.success('Mot de passe modifie avec succes.')
      setShowPasswordModal(false)
      setPasswordForm({ current: '', new: '', confirm: '' })
      await logout()
      window.location.assign('/login')
    } catch {
      toast.error('Echec de la modification du mot de passe.')
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-[28px] bg-[linear-gradient(135deg,#09170f_0%,#0f2418_60%,#183626_100%)] p-6 text-white shadow-[0_18px_45px_rgba(15,36,24,0.16)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Configuration</p>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight">Parametres admin</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/72">
            Gere ton profil administrateur, la securite d acces et les informations techniques du back-office.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
          <MetricCard label="Role" value="Admin" tone="green" />
          <MetricCard label="Audit" value={auditLog.length || '0'} tone="blue" />
          <MetricCard label="Version" value="1.0.0" tone="neutral" />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <Panel
            icon={ShieldCheck}
            title="Profil administrateur"
            description="Mets a jour tes informations de contact et ton identite."
            iconTone="green"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Prenom" value={form.prenom} onChange={setFormField('prenom')} />
              <Field label="Nom" value={form.nom} onChange={setFormField('nom')} />
              <Field label="Email" value={form.email} onChange={setFormField('email')} readOnly />
              <Field label="Telephone" value={form.telephone} onChange={setFormField('telephone')} />
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={handleSaveProfile} variant="primary" isLoading={savingProfile}>
                <Save className="h-4 w-4" /> Enregistrer le profil
              </Button>
              <Button onClick={() => setShowPasswordModal(true)} variant="secondary">
                <Key className="h-4 w-4" /> Changer le mot de passe
              </Button>
            </div>
          </Panel>

          <Panel
            icon={Activity}
            title="Journal d audit"
            description="Historique recent des actions d administration."
            iconTone="blue"
            action={(
              <Button onClick={loadAuditLog} variant="secondary" size="sm">
                Actualiser
              </Button>
            )}
          >
            {loadingAudit ? (
              <LoadingSpinner label="Chargement du journal..." />
            ) : auditLog.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-[#dbe1d8] bg-[#f8faf6] px-4 py-10 text-center text-sm text-[#7a8578]">
                Aucune entree dans le journal d audit.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-[24px] border border-[#edf1eb]">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-[0.18em] text-[#7a8578]">
                      <th className="px-5 py-4 font-semibold">Date</th>
                      <th className="px-5 py-4 font-semibold">Action</th>
                      <th className="px-5 py-4 font-semibold">Entite</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLog.slice(0, 10).map((entry: any, index: number) => (
                      <tr key={index} className="border-t border-[#edf1eb]">
                        <td className="px-5 py-4 text-[#4c584c]">{new Date(entry.loggedAt).toLocaleString('fr-FR')}</td>
                        <td className="px-5 py-4 font-medium text-[#172216]">{entry.action}</td>
                        <td className="px-5 py-4 text-[#4c584c]">{entry.objectClass?.split('\\').pop()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>

        <Panel
          icon={Info}
          title="Informations plateforme"
          description="Vue rapide des caracteristiques du produit."
          iconTone="amber"
        >
          <dl className="space-y-3">
            <InfoRow label="Nom" value="MediSecours+" />
            <InfoRow label="Marche" value="Cameroun" />
            <InfoRow label="Frontend" value="Next.js 16" />
            <InfoRow label="Backend" value="Symfony 7.4 + API Platform 4" />
            <InfoRow label="Base de donnees" value="PostgreSQL 15" />
            <InfoRow label="Version" value="1.0.0" />
          </dl>
        </Panel>
      </section>

      {showPasswordModal && (
        <Modal isOpen onClose={() => setShowPasswordModal(false)} title="Changer le mot de passe">
          <div className="space-y-4">
            <Field
              label="Mot de passe actuel"
              type="password"
              value={passwordForm.current}
              onChange={setPasswordField('current')}
            />
            <Field
              label="Nouveau mot de passe"
              type="password"
              value={passwordForm.new}
              onChange={setPasswordField('new')}
            />
            <Field
              label="Confirmer le nouveau mot de passe"
              type="password"
              value={passwordForm.confirm}
              onChange={setPasswordField('confirm')}
            />
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowPasswordModal(false)} disabled={changingPassword}>
              Annuler
            </Button>
            <Button variant="primary" onClick={handleChangePassword} isLoading={changingPassword}>
              <Key className="h-4 w-4" /> Changer le mot de passe
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Panel({ icon: Icon, title, description, children, iconTone = 'green', action = null }: { icon: any; title: string; description: string; children: React.ReactNode; iconTone?: string; action?: React.ReactNode }) {
  const toneMap = {
    green: 'bg-[#eef6ea] text-[#2f6b45]',
    blue: 'bg-[#eef3fa] text-[#285074]',
    amber: 'bg-[#fff7e8] text-[#9b6b17]',
  }

  return (
    <section className="rounded-[28px] border border-[#e3e7df] bg-white p-5 shadow-[0_18px_45px_rgba(15,36,24,0.05)] sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${toneMap[iconTone as keyof typeof toneMap] || toneMap.green}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-bold text-[#152116]">{title}</p>
            <p className="mt-1 text-sm text-[#6f796c]">{description}</p>
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function Field({ label, value, onChange, type = 'text', readOnly = false }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string; readOnly?: boolean }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[#7a8578]">{label}</label>
      <input
        type={type}
        value={value || ''}
        onChange={onChange}
        readOnly={readOnly}
        className={`w-full rounded-2xl border border-[#dfe5db] bg-[#f8faf6] px-4 py-3 text-sm text-[#223023] outline-none transition focus:border-[#bfd0bd] focus:bg-white ${readOnly ? 'cursor-not-allowed opacity-65' : ''}`}
      />
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[20px] border border-[#e8ece4] bg-[#fbfcfa] px-4 py-3">
      <dt className="text-sm text-[#71806f]">{label}</dt>
      <dd className="text-sm font-semibold text-[#172216]">{value}</dd>
    </div>
  )
}

function MetricCard({ label, value, tone = 'neutral' }: { label: string; value: any; tone?: string }) {
  const tones: Record<string, string> = {
    neutral: 'bg-white text-[#152116]',
    green: 'bg-[#f3f9f1] text-[#2f6b45]',
    blue: 'bg-[#f3f6fb] text-[#285074]',
  }

  return (
    <div className={`rounded-[24px] border border-[#e3e7df] p-5 shadow-[0_18px_45px_rgba(15,36,24,0.05)] ${tones[tone] || tones.neutral}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7c8778]">{label}</p>
      <p className="mt-3 font-display text-3xl font-extrabold tracking-tight">{value}</p>
    </div>
  )
}
