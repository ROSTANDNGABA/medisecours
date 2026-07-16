// @ts-nocheck
'use client'

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react'

const msgAnim = { animation: 'msgIn .25s ease-out both' }
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = '@keyframes msgIn{from{opacity:0;transform:translateY(8px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}'
  document.head.appendChild(style)
}
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Send, Stethoscope, CheckCheck, Check, Plus, X, ExternalLink, Loader2, Paperclip, Mic, Square, FileText, ImageIcon, Video, Camera, Trash2 } from 'lucide-react'
import useSWR from 'swr'
import api from '../../../api/axios'
import { fetcher } from '../../../lib/fetcher'
import { useAuth } from '../../../hooks/useAuth'
import { useWebSocket } from '../../../hooks/useWebSocket'

import LoadingSpinner from '../../../components/ui/LoadingSpinner'
import EmptyState from '../../../components/ui/EmptyState'
import Avatar from '../../../components/ui/Avatar'
import { useToast } from '../../../components/ui/Toast'

function iri(prefix, id) { return `/api/${prefix}/${id}` }
function idFromIri(value) {
  if (!value) return null
  if (typeof value === 'object') return value.id
  return value.split('/').pop()
}
function mediaUrl(path) {
  if (!path || path.startsWith('http') || path.startsWith('blob:')) return path
  return 'http://127.0.0.1:8000' + path
}
function msgMediaUrl(m) {
  const media = m.media
  if (!media || typeof media === 'string') return null
  const path = media.contentUrl || (media.filePath ? '/uploads/media/' + media.filePath : null)
  return mediaUrl(path)
}

function formatFileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' o'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' Ko'
  return (bytes / 1048576).toFixed(1) + ' Mo'
}

function formatDuration(sec) {
  if (!sec) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return m + ':' + String(s).padStart(2, '0')
}

function isImageMime(m) { return m?.startsWith('image/') }
function isVideoMime(m) { return m?.startsWith('video/') }
function isAudioMime(m) { return m?.startsWith('audio/') }

function msgTypeFromMime(mime) {
  if (!mime) return 'FICHIER'
  if (isImageMime(mime)) return 'IMAGE'
  if (isVideoMime(mime)) return 'IMAGE'
  if (isAudioMime(mime)) return 'VOIX'
  return 'FICHIER'
}

export default function MedecinMessagesPage() {
  return (
    <Suspense fallback={<LoadingSpinner label="Chargement…" />}>
      <MedecinMessagesContent />
    </Suspense>
  )
}

function MedecinMessagesContent() {
  const { user } = useAuth()
  const toast = useToast()
  const searchParams = useSearchParams()
  const preselectConv = searchParams.get('conversation')

  const [activeId, setActiveId] = useState(preselectConv || null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [patients, setPatients] = useState([])
  const [loadingPatients, setLoadingPatients] = useState(false)
  const [pendingMsgs, setPendingMsgs] = useState([])
  const [attachments, setAttachments] = useState([])
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recordTimer, setRecordTimer] = useState(0)
  const [recordingBlob, setRecordingBlob] = useState(null)
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const bottomRef = useRef(null)
  const fileRef = useRef(null)
  const docRef = useRef(null)
  const cameraRef = useRef(null)
  const recorderRef = useRef(null)
  const recordTimerRef = useRef(null)
  const streamRef = useRef(null)

  const { data: convData, isLoading: convLoading, error: convError, mutate: mutateConvs } = useSWR('/api/conversations', fetcher, { revalidateOnFocus: false })
  const { data: msgData, isLoading: msgLoading, error: msgError, mutate: mutateMsgs } = useSWR('/api/messages', fetcher, { revalidateOnFocus: false })

  function matchConv(msg, convId) {
    const conv = msg.conversation
    const iri = `/api/conversations/${convId}`
    if (!conv) return false
    if (typeof conv === 'string') return conv === iri
    return conv['@id'] === iri || conv.id == convId
  }

  const conversations = Array.isArray(convData) ? convData : []
  const messages = Array.isArray(msgData) ? msgData : []
  const mediaCache = useMemo(() => new Map(), [])
  const [, bump] = useState(0)

  useEffect(() => {
    const iris = [...new Set(messages.filter(m => m.media && typeof m.media === 'string' && /\/(media_objects|media)\//.test(m.media)).map(m => m.media))]
    const pending = iris.filter(i => !mediaCache.has(i))
    if (pending.length === 0) return
    let dead = false
    Promise.allSettled(pending.map(i => api.get(i).then(r => ({ i, d: r.data })))).then(rr => {
      if (dead) return
      rr.forEach(r => { if (r.status === 'fulfilled') mediaCache.set(r.value.i, r.value.d) })
      bump(n => n + 1)
    })
    return () => { dead = true }
  }, [msgData])

  useEffect(() => {
    if (convError || msgError) toast.error('Impossible de charger la messagerie.')
  }, [convError, msgError, toast])

  const token = typeof window !== 'undefined' ? localStorage.getItem('medisecours_token') : null
  function sameMsg(a, b) {
    const idA = a.id ?? a['@id']
    const idB = b.id ?? b['@id']
    return idA !== undefined && idB !== undefined && idA == idB
  }

  const { subscribe } = useWebSocket(user?.id, token, {
    onNewMessage: (msg) => {
      if (idFromIri(msg.expediteur) === user?.id) return
      mutateMsgs((current) => {
        const arr = Array.isArray(current) ? current : []
        // Real message: only remove optimistic (no @id) matching this _tempId
        if (msg._tempId && msg['@id']) {
          const filtered = arr.filter(m => !(m._tempId === msg._tempId && !m['@id']))
          return filtered.some(m => sameMsg(m, msg)) ? filtered : [...filtered, msg]
        }
        // Optimistic: skip if real already present (race: real arrived first)
        if (msg._tempId && arr.some(m => m._tempId === msg._tempId && m['@id'])) return arr
        return arr.some((m) => sameMsg(m, msg)) ? arr : [...arr, msg]
      }, { revalidate: false })
    },
    onMessageRead: (msg) => {
      mutateMsgs((current) => (Array.isArray(current) ? current : []).map((m) => sameMsg(m, msg) ? { ...m, statut: 'LU' } : m), { revalidate: false })
    },
  })

  useEffect(() => {
    if (activeId) subscribe(activeId)
  }, [activeId, subscribe])

  const resolvedMessages = useMemo(() => {
    return messages.map(m => {
      if (m.media && typeof m.media === 'string' && /\/(media_objects|media)\//.test(m.media)) {
        const cached = mediaCache.get(m.media)
        if (cached) return { ...m, media: cached }
      }
      return m
    })
  }, [messages, bump])

  const readAttempted = useRef(new Set())

  const convMap = useMemo(() => {
    const map = new Map()
    for (const c of conversations) {
      const other = c.participants?.find((p) => p.id !== user?.id)
      const msgs = resolvedMessages.filter((m) => matchConv(m, c.id))
      const unread = msgs.filter((m) => m.statut !== 'LU' && idFromIri(m.expediteur) !== user?.id).length
      msgs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      map.set(String(c.id), { id: String(c.id), info: other || null, messages: msgs, unread })
    }
    for (const p of pendingMsgs) {
      const convId = idFromIri(p.conversation) || p.conversation
      const existing = map.get(String(convId))
      if (existing) {
        existing.messages = [...existing.messages, p]
        existing.messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      }
    }
    return map
  }, [conversations, resolvedMessages, user, pendingMsgs])

  const activeConv = convMap.get(activeId)

  const dedupedMessages = useMemo(() => {
    if (!activeConv) return []
    const seen = new Set()
    return activeConv.messages.filter(m => {
      const key = m.id ?? m['@id']
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [activeConv])

  useEffect(() => {
    if (!activeId && convMap.size > 0) queueMicrotask(() => setActiveId(convMap.keys().next().value))
  }, [convMap, activeId])

  useEffect(() => {
    const el = bottomRef.current?.parentElement
    if (!el) return
    const threshold = 120
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold
    if (nearBottom) bottomRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [activeConv?.messages?.length])

  useEffect(() => {
    queueMicrotask(() => bottomRef.current?.scrollIntoView())
  }, [activeId])

  const openNewConversation = () => {
    setShowNew(true)
    if (patients.length === 0 && !loadingPatients) {
      setLoadingPatients(true)
      api.get('/api/consultations')
        .then((res) => {
          const raw = res.data?.['hydra:member'] ?? (Array.isArray(res.data) ? res.data : [])
          const uniquePatients = []
          const seen = new Set()
          for (const c of raw) {
            const p = typeof c.patient === 'object' && c.patient ? c.patient : null
            if (p && p.id && !seen.has(p.id)) {
              seen.add(p.id)
              uniquePatients.push({ ...p, motif: c.motif })
            }
          }
          setPatients(uniquePatients)
          if (uniquePatients.length === 0) {
            toast.info('Aucun patient trouvé avec lequel démarrer une conversation.')
          }
        })
        .catch(() => {
          toast.error('Impossible de charger la liste des patients.')
        })
        .finally(() => setLoadingPatients(false))
    }
  }

  const findOrCreateConv = async (patientId) => {
    const existing = conversations.find((c) =>
      c.participants?.some((p) => p.id === patientId)
    )
    if (existing) return String(existing.id)

    const { data: conv } = await api.post('/api/conversations', {
      participants: [iri('users', user?.id), iri('users', patientId)]
    }, { headers: { 'Content-Type': 'application/ld+json' } })
    await mutateConvs()
    return String(conv.id)
  }

  function handleAttach(type) {
    setShowAttachMenu(false)
    if (type === 'camera') { cameraRef.current?.click(); return }
    if (type === 'gallery') { fileRef.current?.click(); return }
    if (type === 'doc') { docRef.current?.click(); return }
    if (type === 'voice') startRecording()
  }

  function handleFilePick(e, multi) {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    for (const f of files) {
      const preview = isImageMime(f.type) ? URL.createObjectURL(f) : null
      setAttachments((prev) => [...prev, { id: crypto.randomUUID?.() || Date.now() + '-' + Math.random(), file: f, preview, name: f.name, size: f.size, mime: f.type }])
    }
  }

  function removeAttachment(id) {
    setAttachments((prev) => {
      const item = prev.find((a) => a.id === id)
      if (item?.preview) URL.revokeObjectURL(item.preview)
      return prev.filter((a) => a.id !== id)
    })
  }

  function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) { toast.error('Enregistrement vocal non supporté.'); return }
    setShowAttachMenu(false)
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      streamRef.current = stream
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm' })
      const chunks = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(chunks, { type: mr.mimeType })
        setRecordingBlob(blob)
        setAttachments((prev) => [...prev, { id: crypto.randomUUID?.() || Date.now() + '-' + Math.random(), file: blob, preview: null, name: 'Message vocal.webm', size: blob.size, mime: mr.mimeType }])
        stream.getTracks().forEach((t) => t.stop())
      }
      recorderRef.current = mr
      mr.start(250)
      setRecording(true)
      setRecordTimer(0)
      recordTimerRef.current = setInterval(() => setRecordTimer((t) => t + 1), 1000)
    }).catch(() => toast.error('Microphone non accessible.'))
  }

  function stopRecording() {
    clearInterval(recordTimerRef.current)
    setRecording(false)
    recorderRef.current?.stop()
  }

  async function uploadFile(file) {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await api.post('/api/messages/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return data
  }

  const handleSend = async () => {
    if (!activeId) return
    const hasText = draft.trim().length > 0
    const hasFiles = attachments.length > 0
    if (!hasText && !hasFiles) return

    const convIri = `/api/conversations/${activeId}`

    if (hasFiles) {
      setSending(true)
      setUploadingMedia(true)
      const caption = draft.trim()
      setDraft('')
      const pending = attachments.map((att) => ({
        ...att,
        tempId: 'temp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      }))
      for (const att of pending) {
        const optimistic = {
          id: att.tempId, contenu: caption || '',
          expediteur: { id: user?.id },
          conversation: convIri, statut: 'ENVOYE',
          createdAt: new Date().toISOString(),
          typeMessage: msgTypeFromMime(att.mime),
          _sending: true, media: { contentUrl: att.preview || '', originalName: att.name, size: att.size, mimeType: att.mime },
        }
        setPendingMsgs((prev) => [...prev, optimistic])
        fetch('/api/ws/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId: activeId, event: 'new_message', payload: { ...optimistic, _tempId: att.tempId } }) }).catch(() => {})
      }
      setAttachments([])
      try {
        const uploads = await Promise.all(pending.map((att) => uploadFile(att.file)))
        const bodies = pending.map((att, i) => {
          const type = msgTypeFromMime(att.mime)
          const body = {
            contenu: i === 0 ? caption : '',
            conversation: convIri,
            typeMessage: type,
            media: uploads[i]['@id'],
          }
          if (type === 'VOIX') body.dureeVoix = Math.round(recordTimer)
          return api.post('/api/messages', body, { headers: { 'Content-Type': 'application/ld+json' } })
        })
        const results = await Promise.all(bodies)
        const created = results.map((r, i) => {
          const d = r.data
          return d.media && typeof d.media === 'string' && uploads[i] ? { ...d, media: uploads[i] } : d
        })
        const tempIds = new Set(pending.map((a) => a.tempId))
        setPendingMsgs((prev) => prev.filter((m) => !tempIds.has(m.id)))
        mutateMsgs((current) => {
          const arr = Array.isArray(current) ? [...current] : []
          for (const m of created) { if (!arr.some((x) => sameMsg(x, m))) arr.push(m) }
          return arr
        }, { revalidate: false })
        for (let i = 0; i < created.length; i++) {
          fetch('/api/ws/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId: activeId, event: 'new_message', payload: { ...created[i], _tempId: pending[i].tempId } }) }).catch(() => {})
        }
      } catch {
        toast.error("Échec de l'envoi du message.")
        setPendingMsgs((prev) => prev.filter((m) => pending.some((p) => p.tempId === m.id)))
      } finally {
        setSending(false)
        setUploadingMedia(false)
        pending.forEach((a) => { if (a.preview) URL.revokeObjectURL(a.preview) })
      }
      return
    }

    const content = draft.trim()
    const tempId = 'temp-' + Date.now()
    const temp = {
      id: tempId, contenu: content,
      expediteur: { id: user?.id },
      conversation: convIri,
      statut: 'ENVOYE', createdAt: new Date().toISOString(),
    }
    setPendingMsgs((prev) => [...prev, temp])
    setDraft('')
    setSending(true)
    fetch('/api/ws/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId: activeId, event: 'new_message', payload: { ...temp, _tempId: tempId } }) }).catch(() => {})
    try {
      const { data: created } = await api.post('/api/messages', { contenu: content, conversation: convIri }, { headers: { 'Content-Type': 'application/ld+json' } })
      setPendingMsgs((prev) => prev.filter((m) => m.id !== tempId))
      mutateMsgs((current) => {
        const arr = Array.isArray(current) ? current : []
        return arr.some((m) => sameMsg(m, created)) ? arr : [...arr, created]
      }, { revalidate: false })
      fetch('/api/ws/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId: activeId, event: 'new_message', payload: { ...created, _tempId: tempId } }) }).catch(() => {})
    } catch {
      setPendingMsgs((prev) => prev.filter((m) => m.id !== tempId))
      toast.error("Échec de l'envoi du message.")
    } finally {
      setSending(false)
    }
  }

  const markAsRead = useCallback(async (msg) => {
    if (!msg['@id']) return
    const msgId = msg.id ?? msg['@id']
    if (msg.statut === 'LU' || idFromIri(msg.expediteur) === user?.id) return
    if (readAttempted.current.has(msgId)) return
    readAttempted.current.add(msgId)
    mutateMsgs(
      (current) => (Array.isArray(current) ? current : []).map((m) => (m.id === msg.id ? { ...m, statut: 'LU' } : m)),
      { revalidate: false }
    )
    api.patch(msg['@id'], { statut: 'LU' }, { headers: { 'Content-Type': 'application/merge-patch+json' } }).catch(() => {})
  }, [user?.id, mutateMsgs])

  useEffect(() => {
    activeConv?.messages?.forEach(markAsRead)
  }, [activeConv, markAsRead])

  const sortedConvs = useMemo(() =>
    Array.from(convMap.values()).sort((a, b) => {
      const la = a.messages.at(-1)?.createdAt ?? ''
      const lb = b.messages.at(-1)?.createdAt ?? ''
      return lb.localeCompare(la)
    }), [convMap])

  if (convLoading || msgLoading) return <LoadingSpinner label="Chargement de la messagerie…" />

  return (
    <div className="h-[calc(100vh-4rem)]">
      <div className="grid grid-cols-1 md:grid-cols-3 h-full border-t border-primary-100 dark:border-white/5">
        <div className={`md:col-span-1 border-r border-primary-100 dark:border-white/5 bg-white/70 dark:bg-primary-800/40 flex flex-col ${activeId ? 'hidden md:flex' : 'flex'}`}>
          <div className="flex items-center justify-between p-4 border-b border-primary-100 dark:border-white/5">
            <h2 className="font-display font-bold text-primary-900 dark:text-sable">Conversations</h2>
            <button onClick={openNewConversation} className="p-2 rounded-xl bg-mint-500 text-white"><Plus className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {sortedConvs.length === 0 ? (
              <EmptyState title="Aucune conversation" description="Démarrez une conversation avec un patient." />
            ) : (
              sortedConvs.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-primary-50 dark:hover:bg-primary-900/40 ${activeId === c.id ? 'bg-primary-100/70 dark:bg-primary-900/60' : ''}`}
                >
                  <Avatar name={`${c.info?.prenom || ''} ${c.info?.nom || ''}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-primary-900 dark:text-sable truncate">{c.info?.prenom} {c.info?.nom}</p>
                    <p className="text-xs text-primary-300 truncate">
                      {c.messages.at(-1)?.typeMessage === 'IMAGE' && <>📷 Image</>}
                      {c.messages.at(-1)?.typeMessage === 'VOIX' && <>🎤 Message vocal</>}
                      {c.messages.at(-1)?.typeMessage === 'FICHIER' && <>📎 {c.messages.at(-1)?.media?.originalName || 'Fichier'}</>}
                      {(!c.messages.at(-1)?.typeMessage || c.messages.at(-1)?.typeMessage === 'TEXTE') && (c.messages.at(-1)?.contenu || '')}
                    </p>
                  </div>
                  {c.unread > 0 && <span className="w-5 h-5 rounded-full bg-urgence-500 text-white text-[10px] font-bold flex items-center justify-center">{c.unread}</span>}
                </button>
              ))
            )}
          </div>
        </div>

        <div className={`md:col-span-2 flex flex-col bg-sable dark:bg-primary-900 ${activeId ? 'flex' : 'hidden md:flex'}`}>
          {activeConv ? (
            <>
              <div className="flex items-center gap-3 p-4 border-b border-primary-100 dark:border-white/5 bg-white/70 dark:bg-primary-800/40">
                <button className="md:hidden" onClick={() => setActiveId(null)}><ArrowLeft className="w-5 h-5 text-primary-500" /></button>
                <Avatar name={`${activeConv.info?.prenom || ''} ${activeConv.info?.nom || ''}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-primary-900 dark:text-sable">{activeConv.info?.prenom} {activeConv.info?.nom}</p>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-700">Patient</span>
                </div>
                <Link href="/medecin/consultations" className="text-xs font-semibold text-mint-500 hover:text-mint-700 inline-flex items-center gap-1 shrink-0">
                  Voir la consultation <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
                {dedupedMessages.map((m) => {
                  const mine = idFromIri(m.expediteur) === user?.id
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div style={msgAnim} className={`max-w-[75%] rounded-2xl text-sm overflow-hidden ${mine ? 'bg-mint-500 text-white rounded-br-sm' : 'bg-white dark:bg-primary-700 text-primary-900 dark:text-sable rounded-bl-sm'} ${m._sending ? 'opacity-60' : ''}`}>
                        {m.typeMessage === 'IMAGE' && msgMediaUrl(m) && (
                          <img src={msgMediaUrl(m)} alt="" className="w-full max-h-64 object-cover cursor-pointer" onClick={(e) => { e.stopPropagation(); window.open(msgMediaUrl(m), '_blank') }} />
                        )}
                        {m.typeMessage === 'VOIX' && msgMediaUrl(m) && (
                          <div className="px-3 pt-3 pb-1">
                            <audio controls src={msgMediaUrl(m)} className="w-full h-10" />
                            {m.dureeVoix > 0 && <p className="text-[10px] opacity-60 mt-0.5">{formatDuration(m.dureeVoix)}</p>}
                          </div>
                        )}
                        {m.typeMessage === 'FICHIER' && m.media && (
                          <a href={msgMediaUrl(m)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 hover:opacity-80">
                            <FileText className="w-6 h-6 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{m.media.originalName || 'Fichier'}</p>
                              <p className="text-[10px] opacity-60">{formatFileSize(m.media.size)}</p>
                            </div>
                          </a>
                        )}
                        {m.contenu && (
                          <div className={m.typeMessage !== 'TEXTE' ? 'px-3 pb-2' : 'px-4 py-2.5'}>
                            <p>{m.contenu}</p>
                          </div>
                        )}
                        {!m.contenu && m.typeMessage === 'TEXTE' && (
                          <div className="px-4 py-2.5"><p>{m.contenu}</p></div>
                        )}
                        {mine && (
                          <div className={`flex justify-end ${m.typeMessage !== 'TEXTE' || m.contenu ? 'pb-2 px-3' : 'pb-2.5 px-4'}`}>
                            {m._sending ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin opacity-60" />
                            ) : m.statut === 'LU' ? (
                              <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                            ) : m.statut === 'LIVRE' ? (
                              <CheckCheck className="w-3.5 h-3.5 opacity-60" />
                            ) : (
                              <Check className="w-3.5 h-3.5 opacity-60" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>
              <div className="border-t border-primary-100 dark:border-white/5 bg-white/70 dark:bg-primary-800/40">
                {attachments.length > 0 && (
                  <div className="flex gap-2 p-2 overflow-x-auto border-b border-primary-100/50 dark:border-white/5">
                    {attachments.map((att) => (
                      <div key={att.id} className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-primary-100 dark:bg-primary-900/60">
                        {att.preview ? (
                          <img src={att.preview} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {isImageMime(att.mime) ? <ImageIcon className="w-5 h-5 text-primary-300" /> :
                             isAudioMime(att.mime) ? <Mic className="w-5 h-5 text-primary-300" /> :
                             <FileText className="w-5 h-5 text-primary-300" />}
                          </div>
                        )}
                        <button onClick={() => removeAttachment(att.id)} className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {recording && (
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-urgence-500/10">
                    <div className="w-3 h-3 rounded-full bg-urgence-500 animate-pulse" />
                    <span className="text-sm font-semibold text-urgence-500">{formatDuration(recordTimer)}</span>
                    <button onClick={stopRecording} className="ml-auto p-1.5 rounded-full bg-urgence-500 text-white">
                      <Square className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2 p-3">
                  <div className="relative">
                    <button onClick={() => setShowAttachMenu((v) => !v)} disabled={sending || recording} className="p-2 rounded-full hover:bg-primary-100 dark:hover:bg-primary-900/40 disabled:opacity-40">
                      <Paperclip className="w-5 h-5 text-primary-500 rotate-45" />
                    </button>
                    {showAttachMenu && (
                      <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-primary-800 rounded-2xl shadow-glass border border-primary-100 dark:border-white/5 p-2 flex gap-1 z-10">
                        <button onClick={() => handleAttach('camera')} className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl hover:bg-primary-50 dark:hover:bg-primary-900/40 text-primary-500">
                          <Camera className="w-5 h-5" /><span className="text-[10px]">Appareil</span>
                        </button>
                        <button onClick={() => handleAttach('gallery')} className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl hover:bg-primary-50 dark:hover:bg-primary-900/40 text-primary-500">
                          <ImageIcon className="w-5 h-5" /><span className="text-[10px]">Photos</span>
                        </button>
                        <button onClick={() => handleAttach('doc')} className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl hover:bg-primary-50 dark:hover:bg-primary-900/40 text-primary-500">
                          <FileText className="w-5 h-5" /><span className="text-[10px]">Document</span>
                        </button>
                        <button onClick={() => handleAttach('voice')} className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl hover:bg-primary-50 dark:hover:bg-primary-900/40 text-primary-500">
                          <Mic className="w-5 h-5" /><span className="text-[10px]">Vocal</span>
                        </button>
                      </div>
                    )}
                  </div>
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={recording ? 'Enregistrement en cours…' : uploadingMedia ? 'Téléchargement…' : 'Écrire un message…'}
                    disabled={recording || uploadingMedia}
                    className="flex-1 px-4 py-2.5 rounded-2xl border border-primary-100 dark:border-white/10 bg-white dark:bg-primary-900/60 focus:outline-none focus:ring-2 focus:ring-mint-500 disabled:opacity-40"
                  />
                  <button onClick={handleSend} disabled={sending || (!draft.trim() && attachments.length === 0) || recording} className="p-3 rounded-2xl bg-mint-500 hover:bg-mint-700 text-white disabled:opacity-50">
                    {uploadingMedia ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => handleFilePick(e, false)} />
              <input ref={fileRef} type="file" accept="image/*,video/mp4,video/webm,video/ogg" multiple hidden onChange={(e) => handleFilePick(e, true)} />
              <input ref={docRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z" multiple hidden onChange={(e) => handleFilePick(e, true)} />
            </>
          ) : (
            <EmptyState icon={Stethoscope} title="Sélectionnez une conversation" description="Choisissez un patient pour démarrer la discussion." />
          )}
        </div>
      </div>

      {showNew && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={() => setShowNew(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-primary-800 rounded-2xl shadow-glass w-full max-w-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-primary-900 dark:text-sable">Nouvelle conversation</h3>
              <button onClick={() => setShowNew(false)}><X className="w-5 h-5 text-primary-300" /></button>
            </div>
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {loadingPatients ? (
                <LoadingSpinner size="sm" label="Chargement des patients…" />
              ) : patients.length === 0 ? (
                <p className="text-sm text-primary-300 text-center py-8">Aucun patient trouvé.</p>
              ) : patients.map((p) => (
                <button
                  key={p.id}
                  onClick={async () => {
                    setShowNew(false)
                    try {
                      const convId = await findOrCreateConv(p.id)
                      setActiveId(convId)
                    } catch {
                      toast.error("Impossible de créer la conversation.")
                    }
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-primary-100 dark:hover:bg-primary-900/40 text-left"
                >
                  <Avatar name={`${p.prenom || ''} ${p.nom || ''}`} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-primary-900 dark:text-sable truncate">{p.prenom} {p.nom}</p>
                    <p className="text-xs text-primary-300 truncate">{p.motif || 'Consultation'}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
