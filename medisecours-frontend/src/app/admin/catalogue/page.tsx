// @ts-nocheck
'use client'

import { useState, useMemo } from 'react'
import { Upload } from 'lucide-react'
import useSWR from 'swr'
import CrudTable from '../../../components/admin/CrudTable'
import { fetcher } from '../../../lib/fetcher'
import CategoryEditModal from '../../../components/admin/CategoryEditModal'
import DiseaseEditModal from '../../../components/admin/DiseaseEditModal'
import DiseaseDetailModal from '../../../components/admin/DiseaseDetailModal'
import PremierSoinEditModal from '../../../components/admin/PremierSoinEditModal'
import { ImportMaladiesModal } from '@/components/admin/ImportMaladiesModal'
import { ImportPremiersSoinsModal } from '@/components/admin/ImportPremiersSoinsModal'

const GRAVITES = ['LÉGÈRE', 'MODÉRÉE', 'SÉVÈRE', 'CRITIQUE', 'VARIABLE']
const URGENCES = ['FAIBLE', 'MOYEN', 'ÉLEVÉ', 'CRITIQUE']
const TABS = ['Catégories', 'Maladies', 'Premiers Soins']

export default function AdminCataloguePage() {
  const [tab, setTab] = useState('Catégories')
  const [showImportModal, setShowImportModal] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleImportSuccess = () => {
    setRefreshKey((k) => k + 1)
    setShowImportModal(false)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] bg-[linear-gradient(135deg,#09170f_0%,#0f2418_60%,#183626_100%)] p-6 text-white shadow-[0_18px_45px_rgba(15,36,24,0.16)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Base medicale</p>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight">Catalogue medical</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/72">
          Structure les categories, les maladies et les fiches de premiers soins dans une interface unifiee.
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === t
                ? 'bg-[#0f2418] text-white'
                : 'border border-[#dfe5db] bg-white text-[#5f6c5d] hover:bg-[#edf2ea]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Catégories' && (
        <CrudTable
          endpoint="/api/categories"
          title="Catégories"
          description="Classement visuel et editorial des contenus medicaux."
          createLabel="Ajouter une categorie"
          previewKeys={['icone', 'nom']}
          fields={[
            { key: 'icone', label: 'Icône', type: 'icon-picker' },
            { key: 'nom', label: 'Nom', type: 'text' },
            { key: 'couleur', label: 'Couleur', type: 'color' },
            { key: 'description', label: 'Description', type: 'textarea' },
          ]}
          editModal={(props) => <CategoryEditModal {...props} />}
        />
      )}

      {tab === 'Maladies' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Gestion des Maladies</h2>
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 bg-mint-500 text-white rounded-md hover:bg-mint-600 inline-flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Importer des maladies
            </button>
          </div>

          <ImportMaladiesModal
            isOpen={showImportModal}
            onClose={() => setShowImportModal(false)}
            onSuccess={handleImportSuccess}
          />

          <CrudTable
            key={refreshKey}
            endpoint="/api/maladies"
            title="Maladies"
            description="Base de connaissances medicales avec gravite, symptomes et traitements."
            createLabel="Ajouter une maladie"
            previewKeys={['nom', 'niveauGravite', 'categorie']}
            searchEndpoint="/api/maladies/search"
            fields={[
              { key: 'nom', label: 'Nom', type: 'text' },
              { key: 'niveauGravite', label: 'Gravité', type: 'select', options: GRAVITES },
              { key: 'categorie', label: 'Catégorie', type: 'select-api', endpoint: '/api/categories', displayKey: 'nom' },
              { key: 'urgence', label: 'Urgence', type: 'checkbox' },
              { key: 'contagieux', label: 'Contagieux', type: 'checkbox' },
              { key: 'isAccident', label: 'Accident', type: 'checkbox' },
              { key: 'typeAccident', label: "Type d'accident", type: 'text' },
              { key: 'description', label: 'Description', type: 'textarea' },
              { key: 'symptomes', label: 'Symptômes', type: 'textarea' },
              { key: 'causes', label: 'Causes', type: 'textarea' },
              { key: 'precautions', label: 'Précautions', type: 'textarea' },
              { key: 'traitement', label: 'Traitement', type: 'textarea' },
            ]}
            editModal={(props) => <DiseaseEditModal {...props} />}
            detailModal={({ item, onClose, onMutate }) => <DiseaseDetailModal maladie={item} onClose={onClose} onMutate={onMutate} />}
          />
        </div>
      )}

      {tab === 'Premiers Soins' && <PremierSoinsTab />}
    </div>
  )
}

function PremierSoinsTab() {
  const [showImportPSModal, setShowImportPSModal] = useState(false)
  const [refreshKeyPS, setRefreshKeyPS] = useState(0)
  const { data: maladies = [] } = useSWR('/api/maladies', fetcher, { revalidateOnFocus: false })
  const maladieMap = useMemo(() => {
    const map = {}
    maladies.forEach((m) => { map[m['@id']] = m.nom })
    return map
  }, [maladies])

  const handleImportPSSuccess = () => {
    setRefreshKeyPS((k) => k + 1)
    setShowImportPSModal(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Gestion des Premiers Soins</h2>
        <button
          onClick={() => setShowImportPSModal(true)}
          className="px-4 py-2 bg-mint-500 text-white rounded-md hover:bg-mint-600 inline-flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          Importer des premiers soins
        </button>
      </div>

      <ImportPremiersSoinsModal
        isOpen={showImportPSModal}
        onClose={() => setShowImportPSModal(false)}
        onSuccess={handleImportPSSuccess}
      />

      <CrudTable
        key={refreshKeyPS}
        endpoint="/api/premier_soins"
        title="Premiers Soins"
        description="Guides de premiers gestes et protocoles d urgence."
        createLabel="Ajouter une fiche"
        previewKeys={['titre', 'niveauUrgence', 'maladie']}
        fields={[
          { key: 'titre', label: 'Titre', type: 'text' },
          { key: 'niveauUrgence', label: 'Urgence', type: 'select', options: URGENCES },
          { key: 'maladie', label: 'Maladie', type: 'select-api', endpoint: '/api/maladies', displayKey: 'nom',
            render: (value) => typeof value === 'string' ? (maladieMap[value] || value.split('/').pop()) : String(value ?? '-') },
          { key: 'description', label: 'Description', type: 'textarea' },
          { key: 'symptomes', label: 'Symptômes', type: 'textarea' },
        ]}
        editModal={(props) => <PremierSoinEditModal {...props} />}
      />
    </div>
  )
}
