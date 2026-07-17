// @ts-nocheck
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Trash2 } from 'lucide-react'
import { createPortal } from 'react-dom'
import api from '../../api/axios'
import { useToast } from '../ui/Toast'

export default function PrescriptionModal({ consultation, onClose, onSaved }) {
  const toast = useToast()
  const [diagnostic, setDiagnostic] = useState('')
  const [medicaments, setMedicaments] = useState([{ nom: '', posologie: '', duree: '' }])
  const [recommandations, setRecommandations] = useState('')
  const [saving, setSaving] = useState(false)

  const addMedicament = () => {
    setMedicaments((prev) => [...prev, { nom: '', posologie: '', duree: '' }])
  }

  const removeMedicament = (index) => {
    setMedicaments((prev) => prev.filter((_, i) => i !== index))
  }

  const updateMedicament = (index, field, value) => {
    setMedicaments((prev) => prev.map((m, i) => i === index ? { ...m, [field]: value } : m))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!diagnostic.trim()) return
    setSaving(true)
    try {
      await api.post('/api/prescriptions', {
        consultation: `/api/consultations/${consultation.id}`,
        diagnostic: diagnostic.trim(),
        medicaments: medicaments.filter((m) => m.nom.trim()),
        recommandations: recommandations.trim() || null,
      })
      toast.success('Ordonnance enregistrée.')
      onSaved?.()
    } catch {
      toast.error('Échec de l\'enregistrement.')
    } finally {
      setSaving(false)
    }
  }

  const content = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-primary-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl"
        >
          <div className="flex items-center justify-between p-5 border-b border-primary-100 dark:border-white/5">
            <div>
              <h3 className="font-semibold text-primary-900 dark:text-sable">Prescription médicale</h3>
              <p className="text-xs text-primary-300">
                Patient : {consultation.patient?.prenom} {consultation.patient?.nom}
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-primary-100 dark:hover:bg-primary-700 text-primary-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            {/* Diagnostic */}
            <div>
              <label className="block text-sm font-medium text-primary-700 dark:text-sable mb-1.5">Diagnostic</label>
              <textarea
                value={diagnostic}
                onChange={(e) => setDiagnostic(e.target.value)}
                placeholder="Ex: Infection respiratoire aiguë..."
                rows={3}
                className="w-full rounded-xl border border-primary-100 dark:border-white/10 bg-white dark:bg-primary-900 px-4 py-3 text-sm text-primary-900 dark:text-sable placeholder:text-primary-300 resize-none"
                required
              />
            </div>

            {/* Médicaments */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-primary-700 dark:text-sable">Médicaments</label>
                <button
                  type="button"
                  onClick={addMedicament}
                  className="flex items-center gap-1 text-xs font-semibold text-primary-500 hover:text-primary-700"
                >
                  <Plus className="w-3.5 h-3.5" /> Ajouter
                </button>
              </div>
              <div className="space-y-2">
                {medicaments.map((med, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <input
                      value={med.nom}
                      onChange={(e) => updateMedicament(i, 'nom', e.target.value)}
                      placeholder="Médicament"
                      className="flex-1 rounded-xl border border-primary-100 dark:border-white/10 bg-white dark:bg-primary-900 px-3 py-2 text-sm text-primary-900 dark:text-sable placeholder:text-primary-300"
                    />
                    <input
                      value={med.posologie}
                      onChange={(e) => updateMedicament(i, 'posologie', e.target.value)}
                      placeholder="Posologie"
                      className="w-28 rounded-xl border border-primary-100 dark:border-white/10 bg-white dark:bg-primary-900 px-3 py-2 text-sm text-primary-900 dark:text-sable placeholder:text-primary-300"
                    />
                    <input
                      value={med.duree}
                      onChange={(e) => updateMedicament(i, 'duree', e.target.value)}
                      placeholder="Durée"
                      className="w-20 rounded-xl border border-primary-100 dark:border-white/10 bg-white dark:bg-primary-900 px-3 py-2 text-sm text-primary-900 dark:text-sable placeholder:text-primary-300"
                    />
                    {medicaments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMedicament(i)}
                        className="p-2 rounded-xl text-red-400 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Recommandations */}
            <div>
              <label className="block text-sm font-medium text-primary-700 dark:text-sable mb-1.5">Recommandations</label>
              <textarea
                value={recommandations}
                onChange={(e) => setRecommandations(e.target.value)}
                placeholder="Repos, hydratation, consultation de suivi..."
                rows={2}
                className="w-full rounded-xl border border-primary-100 dark:border-white/10 bg-white dark:bg-primary-900 px-4 py-3 text-sm text-primary-900 dark:text-sable placeholder:text-primary-300 resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2 border-t border-primary-100 dark:border-white/5">
              <button
                type="submit"
                disabled={saving || !diagnostic.trim()}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary-500 hover:bg-primary-700 text-white disabled:opacity-50"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer l\'ordonnance'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-primary-100 dark:border-white/10 text-primary-700 dark:text-sable"
              >
                Annuler
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )

  if (typeof window === 'undefined') return null
  return createPortal(content, document.body)
}
