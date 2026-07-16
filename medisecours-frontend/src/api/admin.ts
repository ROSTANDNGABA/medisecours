import api from './axios'

export const importMedecins = (formData: FormData, onUploadProgress?: (progressEvent: any) => void) => {
  return api.post('/api/admin/import/medecins', formData, {
    onUploadProgress,
  })
}

export const getImportTemplate = () => {
  return api.get('/api/admin/import/medecins/template', { responseType: 'blob' })
}

export const importCentres = (formData: FormData, onUploadProgress?: (progressEvent: any) => void) => {
  return api.post('/api/admin/import/centres', formData, {
    onUploadProgress,
  })
}

export const getCentreImportTemplate = () => {
  return api.get('/api/admin/import/centres/template', { responseType: 'blob' })
}

export const uploadCentreImages = (centreId: number, files: FileList, onUploadProgress?: (progressEvent: any) => void) => {
  const formData = new FormData()
  Array.from(files).forEach((f: File) => formData.append('files[]', f))
  return api.post(`/api/admin/centres/${centreId}/images`, formData, {
    onUploadProgress,
  })
}

export const deleteCentreImage = (centreId: number, imageId: number) => {
  return api.delete(`/api/admin/centres/${centreId}/images/${imageId}`)
}

export const updateCentre = (id: number, data: Record<string, unknown>) => {
  return api.patch(`/api/centre_de_santes/${id}`, data)
}

export const deleteCentre = (id: number) => {
  return api.delete(`/api/centre_de_santes/${id}`)
}
