// @ts-nocheck
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Trash2, Loader2, Download } from 'lucide-react'
import { createPortal } from 'react-dom'
import api from '../../api/axios'
import { useToast } from '../ui/Toast'
import { useAuth } from '../../hooks/useAuth'
import PrescriptionPDFTemplate from './PrescriptionPDFTemplate'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export default function PrescriptionModal({ consultation, onClose, onSaved }) {
  const toast = useToast()
  const { user } = useAuth()
  const [diagnostic, setDiagnostic] = useState('')
  const [medicaments, setMedicaments] = useState([{ nom: '', posologie: '', duree: '' }])
  const [recommandations, setRecommandations] = useState('')
  const [saving, setSaving] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const addMedicament = () => {
    setMedicaments((prev) => [...prev, { nom: '', posologie: '', duree: '' }])
  }

  const removeMedicament = (index) => {
    setMedicaments((prev) => prev.filter((_, i) => i !== index))
  }

  const updateMedicament = (index, field, value) => {
    setMedicaments((prev) => prev.map((m, i) => i === index ? { ...m, [field]: value } : m))
  }

  const downloadPDF = async () => {
    try {
      setDownloading(true)
      const element = document.getElementById('prescription-pdf-content')
      if (!element) return
      
      const clone = element.cloneNode(true)
      clone.style.position = 'fixed'
      clone.style.top = '0'
      clone.style.left = '0'
      clone.style.zIndex = '-9999'
      clone.style.transform = 'none'
      document.body.appendChild(clone)
      
      const canvas = await html2canvas(clone, { 
        scale: 2, 
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      })
      
      document.body.removeChild(clone)
      
      const imgData = canvas.toDataURL('image/png')
      
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      
      const patientName = `${consultation.patient?.prenom || ''}_${consultation.patient?.nom || ''}`.trim()
      pdf.save(`Ordonnance_${patientName || 'Patient'}.pdf`)
    } catch (err) {
      console.error('Erreur PDF:', err)
      toast.error('La génération du PDF a échoué.')
    } finally {
      setDownloading(false)
    }
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
      toast.success('Ordonnance enregistrée !')
      setSaving(false)
      setPreviewMode(true)
      onSaved?.()
    } catch {
      toast.error('Échec de l\'enregistrement.')
      setSaving(false)
    }
  }

  const handleClose = () => {
    if (previewMode) setPreviewMode(false)
    else onClose()
  }

  const content = (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="dashboard-theme fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className={`bg-white dark:bg-primary-800 rounded-2xl shadow-xl ${
              previewMode ? 'w-full max-w-4xl max-h-[90vh] overflow-hidden' : 'w-full max-w-2xl max-h-[90vh] overflow-y-auto'
            }`}
          >
            {previewMode ? (
              <>
                <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
                  <div>
                    <h3 className="font-semibold text-primary-900 dark:text-sable">Ordonnance médicale</h3>
                    <p className="text-xs text-primary-300">
                      Patient : {consultation.patient?.prenom} {consultation.patient?.nom}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={downloadPDF}
                      disabled={downloading}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-500 hover:bg-primary-700 text-white font-semibold text-sm transition-colors disabled:opacity-50"
                    >
                      {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      {downloading ? 'Génération...' : 'Télécharger'}
                    </button>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-red-50 hover:text-red-500 text-primary-400 transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="overflow-auto p-6 bg-[#F3F4F6] flex justify-center items-start">
                  <div style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid rgba(0,0,0,0.05)' }} className="shrink-0" id="prescription-pdf-content">
                    <PrescriptionPDFTemplate
                      diagnostic={diagnostic}
                      medicaments={medicaments.filter((m) => m.nom.trim())}
                      recommandations={recommandations}
                      consultation={consultation}
                      medecin={user}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between p-5 border-b border-primary-100 dark:border-white/5">
                  <div>
                    <h3 className="font-semibold text-primary-900 dark:text-sable">Prescription médicale</h3>
                    <p className="text-xs text-primary-300">
                      Patient : {consultation.patient?.prenom} {consultation.patient?.nom}
                    </p>
                  </div>
                  <button onClick={onClose} disabled={saving} className="p-2 rounded-xl hover:bg-primary-100 dark:hover:bg-primary-700 text-primary-400 disabled:opacity-50">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-primary-700 dark:text-sable mb-1.5">Diagnostic</label>
                    <textarea
                      value={diagnostic}
                      onChange={(e) => setDiagnostic(e.target.value)}
                      placeholder="Ex: Infection respiratoire aiguë..."
                      rows={3}
                      disabled={saving}
                      className="w-full rounded-xl border border-primary-100 dark:border-white/10 bg-white dark:bg-primary-900 px-4 py-3 text-sm text-primary-900 dark:text-sable placeholder:text-primary-300 resize-none disabled:opacity-50"
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-medium text-primary-700 dark:text-sable">Médicaments</label>
                      <button
                        type="button"
                        onClick={addMedicament}
                        disabled={saving}
                        className="flex items-center gap-1 text-xs font-semibold text-primary-500 hover:text-primary-700 disabled:opacity-50"
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
                            disabled={saving}
                            className="flex-1 rounded-xl border border-primary-100 dark:border-white/10 bg-white dark:bg-primary-900 px-3 py-2 text-sm text-primary-900 dark:text-sable placeholder:text-primary-300 disabled:opacity-50"
                          />
                          <input
                            value={med.posologie}
                            onChange={(e) => updateMedicament(i, 'posologie', e.target.value)}
                            placeholder="Posologie"
                            disabled={saving}
                            className="w-28 rounded-xl border border-primary-100 dark:border-white/10 bg-white dark:bg-primary-900 px-3 py-2 text-sm text-primary-900 dark:text-sable placeholder:text-primary-300 disabled:opacity-50"
                          />
                          <input
                            value={med.duree}
                            onChange={(e) => updateMedicament(i, 'duree', e.target.value)}
                            placeholder="Durée"
                            disabled={saving}
                            className="w-20 rounded-xl border border-primary-100 dark:border-white/10 bg-white dark:bg-primary-900 px-3 py-2 text-sm text-primary-900 dark:text-sable placeholder:text-primary-300 disabled:opacity-50"
                          />
                          {medicaments.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeMedicament(i)}
                              disabled={saving}
                              className="p-2 rounded-xl text-red-400 hover:bg-red-50 disabled:opacity-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-primary-700 dark:text-sable mb-1.5">Recommandations</label>
                    <textarea
                      value={recommandations}
                      onChange={(e) => setRecommandations(e.target.value)}
                      placeholder="Repos, hydratation, consultation de suivi..."
                      rows={2}
                      disabled={saving}
                      className="w-full rounded-xl border border-primary-100 dark:border-white/10 bg-white dark:bg-primary-900 px-4 py-3 text-sm text-primary-900 dark:text-sable placeholder:text-primary-300 resize-none disabled:opacity-50"
                    />
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-primary-100 dark:border-white/5">
                    <button
                      type="submit"
                      disabled={saving || !diagnostic.trim()}
                      className="px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold bg-primary-500 hover:bg-primary-700 text-white disabled:opacity-75 transition-all"
                    >
                      {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                      {saving ? 'Enregistrement...' : 'Enregistrer l\'ordonnance'}
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={saving}
                      className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-primary-100 dark:border-white/10 text-primary-700 dark:text-sable disabled:opacity-50"
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </>
  )

  if (typeof window === 'undefined') return null
  return createPortal(content, document.body)
}
