// @ts-nocheck
'use client'

import { useEffect, useCallback, useMemo, useRef, useState } from 'react'

const msgAnim = { animation: 'msgIn .25s ease-out both' }
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = '@keyframes msgIn{from{opacity:0;transform:translateY(8px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}'
  document.head.appendChild(style)
}
import { ArrowLeft, Send, Stethoscope, CheckCheck, Check, Plus, X, Loader2, Paperclip, Mic, Square, FileText, ImageIcon, Video, Camera, Trash2 } from 'lucide-react'
import api from '../../api/axios'
import { useAuth } from '../../hooks/useAuth'
import { useWebSocket } from '../../hooks/useWebSocket'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/Toast'

function iri(prefix, id) { return `/api/${prefix}/${id}` }

function idFromIri(value) {
  if (!value) return null
  if (typeof value === 'object') return value.id ?? null
  return String(value).split('/').pop() || null
}

function extractArray(res) {
  const raw = res.data?.['hydra:member'] ?? res.data?.member ?? res.data
  return Array.isArray(raw) ? raw : []
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

export default function MessagesPage() {
  const { user, mounted } = useAuth()
  const toast = useToast()

  const [conversations, setConversations] = useState([])
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [medecins, setMedecins] = useState([])
  const [pendingMsgs, setPendingMsgs] = useState([])
  const [attachments, setAttachments] = useState([])
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recordTimer, setRecordTimer] = useState(0)
  const [recordingBlob, setRecordingBlob] = useState(null)
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const mediaCache = useRef(new Map())
  const [, bump] = useState(0)
  const bottomRef = useRef(null)
  const fileRef = useRef(null)
  const docRef = useRef(null)
  const cameraRef = useRef(null)
  const recorderRef = useRef(null)
  const recordTimerRef = useRef(null)
  const streamRef = useRef(null)

  const loadData = useCallback(() => {
    Promise.all([
      api.get('/api/conversations'),
      api.get('/api/messages'),
    ])
      .then(async ([convRes, msgRes]) => {
        const msgs = extractArray(msgRes)
        const iriMedias = [...new Set(msgs.filter(m => m.media && typeof m.media === 'string' && /\/(media_objects|media)\//.test(m.media)).map(m => m.media))]
        if (iriMedias.length > 0) {
          const results = await Promise.allSettled(iriMedias.map(i => api.get(i).then(r => ({ i, d: r.data }))))
          const mediaMap = new Map()
          results.forEach(r => { if (r.status === 'fulfilled') mediaMap.set(r.value.i, r.value.d) })
          setMessages(msgs.map(m => typeof m.media === 'string' && mediaMap.has(m.media) ? { ...m, media: mediaMap.get(m.media) } : m))
        } else {
          setMessages(msgs)
        }
        setConversations(extractArray(convRes))
      })
      .catch(() => toast.error('Impossible de charger la messagerie.'))
      .finally(() => setLoading(false))
  }, [toast])

  useEffect(() => {
    if (!mounted) return
    loadData()
  }, [loadData, mounted])

  const token = typeof window !== 'undefined' ? localStorage.getItem('medisecours_token') : null
  function sameMsg(a, b) {
    const idA = a.id ?? a['@id']
    const idB = b.id ?? b['@id']
    return idA !== undefined && idB !== undefined && idA == idB
  }
  const { subscribe } = useWebSocket(user?.id, token, {
    onNewMessage: (msg) => {
      if (idFromIri(msg.expediteur) === user?.id) return
      setMessages((prev) => {
        const arr = [...prev]
        // Real message replaces optimistic (matched by _tempId)
        if (msg._tempId && msg['@id']) {
          const idx = arr.findIndex(m => m._tempId === msg._tempId)
          if (idx !== -1) { arr[idx] = msg; return arr }
        }
        // Optimistic: skip if real already present (race: real arrived first)
        if (msg._tempId && arr.some(m => m._tempId === msg._tempId && m['@id'])) return prev
        return arr.some((m) => sameMsg(m, msg)) ? arr : [...arr, msg]
      })
    },
    onMessageRead: (msg) => {
      setMessages((prev) => prev.map((m) => sameMsg(m, msg) ? { ...m, statut: 'LU' } : m))
    },
  })

  useEffect(() => {
    if (activeId) subscribe(activeId)
  }, [activeId, subscribe])

  useEffect(() => {
    const iris = [...new Set(messages.filter(m => m.media && typeof m.media === 'string' && /\/(media_objects|media)\//.test(m.media)).map(m => m.media))]
    const pending = iris.filter(i => !mediaCache.current.has(i))
    if (pending.length === 0) return
    let dead = false
    Promise.allSettled(pending.map(i => api.get(i).then(r => ({ i, d: r.data })))).then(rr => {
      if (dead) return
      let changed = false
      rr.forEach(r => { if (r.status === 'fulfilled') { mediaCache.current.set(r.value.i, r.value.d); changed = true } })
      if (changed) setMessages(prev => prev.map(m => typeof m.media === 'string' && mediaCache.current.has(m.media) ? { ...m, media: mediaCache.current.get(m.media) } : m))
    })
    return () => { dead = true }
  }, [messages])

  function matchConv(msg, convId) {
    const conv = msg.conversation
    const iri = `/api/conversations/${convId}`
    if (!conv) return false
    if (typeof conv === 'string') return conv === iri
    return conv['@id'] === iri || conv.id == convId
  }

  const convMap = useMemo(() => {
    const map = new Map()
    for (const c of conversations) {
      const other = c.participants?.find((p) => p.id !== user?.id)
      const msgs = messages.filter((m) => matchConv(m, c.id))
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
  }, [conversations, messages, user, pendingMsgs])

  const sortedConvs = useMemo(() =>
    Array.from(convMap.values()).sort((a, b) => {
      const la = a.messages.at(-1)?.createdAt ?? ''
      const lb = b.messages.at(-1)?.createdAt ?? ''
      return lb.localeCompare(la)
    }), [convMap])

  const active = convMap.get(activeId)

  const dedupedMessages = useMemo(() => {
    if (!active) return []
    const seen = new Set()
    return active.messages.filter(m => {
      const key = m.id ?? m['@id']
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [active])

  useEffect(() => {
    if (!activeId && sortedConvs.length > 0) queueMicrotask(() => setActiveId(sortedConvs[0].id))
  }, [sortedConvs, activeId])

  useEffect(() => {
    const el = bottomRef.current?.parentElement
    if (!el) return
    const threshold = 120
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold
    if (nearBottom) bottomRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [active?.messages?.length])

  useEffect(() => {
    queueMicrotask(() => bottomRef.current?.scrollIntoView())
  }, [activeId])

  const readAttempted = useRef(new Set())

  const markAsRead = useCallback(async (msg) => {
    if (!msg['@id']) return
    const msgId = msg.id ?? msg['@id']
    if (msg.statut === 'LU' || idFromIri(msg.expediteur) === user?.id) return
    if (readAttempted.current.has(msgId)) return
    readAttempted.current.add(msgId)
    setMessages((all) => all.map((m) => (m.id === msg.id ? { ...m, statut: 'LU' } : m)))
    api.patch(msg['@id'], { statut: 'LU' }, { headers: { 'Content-Type': 'application/merge-patch+json' } }).catch(() => {})
  }, [user?.id])

  useEffect(() => {
    active?.messages.forEach(markAsRead)
  }, [active, markAsRead])

  const findOrCreateConv = async (medecinId) => {
    const existing = conversations.find((c) =>
      c.participants?.some((p) => p.id === medecinId)
    )
    if (existing) return String(existing.id)

    const { data: conv } = await api.post('/api/conversations', {
      participants: [iri('users', user?.id), iri('users', medecinId)]
    }, { headers: { 'Content-Type': 'application/ld+json' } })
    await loadData()
    return String(conv.id)
  }

  const openNewConversation = () => {
    setShowNew(true)
    if (medecins.length === 0) {
      api.get('/api/medecins-publics')
        .then((res) => setMedecins(extractArray(res)))
        .catch(() => toast.error('Impossible de charger la liste des médecins.'))
    }
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
        setMessages((prev) => {
          const next = [...prev]
          for (const m of created) { if (!next.some((x) => sameMsg(x, m))) next.push(m) }
          return next
        })
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
      const { data } = await api.post('/api/messages', { contenu: content, conversation: convIri }, { headers: { 'Content-Type': 'application/ld+json' } })
      setPendingMsgs((prev) => prev.filter((m) => m.id !== tempId))
      setMessages((prev) => {
        const arr = [...prev]
        const idx = arr.findIndex(m => m._tempId === tempId)
        if (idx !== -1) { arr[idx] = data; return arr }
        return arr.some((m) => sameMsg(m, data)) ? arr : [...arr, data]
      })
      fetch('/api/ws/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId: activeId, event: 'new_message', payload: { ...data, _tempId: tempId } }) }).catch(() => {})
    } catch {
      setPendingMsgs((prev) => prev.filter((m) => m.id !== tempId))
      toast.error("Échec de l'envoi du message.")
    } finally {
      setSending(false)
    }
  }

  if (!mounted) return <LoadingSpinner label="Chargement…" />
  if (loading)   return <LoadingSpinner label="Chargement de la messagerie…" />

  return (
    <div className="max-w-6xl mx-auto px-0 sm:px-6 py-0 sm:py-10 h-full flex flex-col">
      <div className="grid grid-cols-1 md:grid-cols-3 flex-1 sm:rounded-2xl overflow-hidden border border-primary-100 dark:border-white/10 shadow-xl">

        <div className={`md:col-span-1 border-r border-primary-100 dark:border-white/10 bg-white/70 dark:bg-primary-700/40 flex flex-col ${activeId ? 'hidden md:flex' : 'flex'}`}>
          <div className="flex items-center justify-between p-4 border-b border-primary-100 dark:border-white/10">
            <h2 className="font-display font-bold text-primary-900 dark:text-sable">Messages</h2>
            <button onClick={openNewConversation} className="p-2 rounded-xl bg-mint-500 text-white"><Plus className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            {sortedConvs.length === 0 ? (
              <EmptyState title="Aucune conversation" description="Démarrez une conversation avec un médecin." />
            ) : sortedConvs.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-primary-100/50 dark:hover:bg-primary-900/40 transition ${activeId === c.id ? 'bg-primary-100/70 dark:bg-primary-900/60' : ''}`}
              >
                <div className="w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {(c.info?.prenom?.[0] || '') + (c.info?.nom?.[0] || '')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-primary-900 dark:text-sable truncate">{c.info?.prenom} {c.info?.nom}</p>
                  <p className="text-xs text-primary-300 truncate">
                    {c.messages.at(-1)?.typeMessage === 'IMAGE' && <>📷 Image</>}
                    {c.messages.at(-1)?.typeMessage === 'VOIX' && <>🎤 Message vocal</>}
                    {c.messages.at(-1)?.typeMessage === 'FICHIER' && <>📎 {c.messages.at(-1)?.media?.originalName || 'Fichier'}</>}
                    {(!c.messages.at(-1)?.typeMessage || c.messages.at(-1)?.typeMessage === 'TEXTE') && (c.messages.at(-1)?.contenu || '')}
                  </p>
                </div>
                {c.unread > 0 && <span className="w-5 h-5 rounded-full bg-urgence-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">{c.unread}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className={`md:col-span-2 flex flex-col bg-sable dark:bg-primary-900 ${activeId ? 'flex' : 'hidden md:flex'}`}>
          {active ? (
            <>
              <div className="flex items-center gap-3 p-4 border-b border-primary-100 dark:border-white/10 bg-white/70 dark:bg-primary-700/40">
                <button className="md:hidden" onClick={() => setActiveId(null)} aria-label="Retour"><ArrowLeft className="w-5 h-5 text-primary-500" /></button>
                <div className="w-9 h-9 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {(active.info?.prenom?.[0] || '') + (active.info?.nom?.[0] || '')}
                </div>
                <p className="font-semibold text-sm text-primary-900 dark:text-sable">{active.info?.prenom} {active.info?.nom}</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
                {dedupedMessages.map((m) => {
                  const mine = idFromIri(m.expediteur) === user?.id
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div style={msgAnim} className={`max-w-[75%] rounded-2xl text-sm overflow-hidden ${
                        mine
                          ? 'bg-mint-500 text-white rounded-br-sm'
                          : 'bg-white dark:bg-primary-700 text-primary-900 dark:text-sable rounded-bl-sm'
                      } ${m._sending ? 'opacity-60' : ''}`}>
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

              <div className="border-t border-primary-100 dark:border-white/10 bg-white/70 dark:bg-primary-700/40">
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
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                    placeholder={recording ? 'Enregistrement en cours…' : uploadingMedia ? 'Téléchargement…' : 'Écrire un message…'}
                    disabled={recording || uploadingMedia}
                    aria-label="Zone de saisie du message"
                    className="flex-1 px-4 py-2.5 rounded-2xl border border-primary-100 dark:border-white/10 bg-white dark:bg-primary-900/60 focus:outline-none focus:ring-2 focus:ring-mint-500 disabled:opacity-40"
                  />
                  <button onClick={handleSend} disabled={sending || (!draft.trim() && attachments.length === 0) || recording} aria-label="Envoyer" className="p-3 rounded-2xl bg-mint-500 hover:bg-mint-700 text-white disabled:opacity-50 transition">
                    {uploadingMedia ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => handleFilePick(e, false)} />
              <input ref={fileRef} type="file" accept="image/*,video/mp4,video/webm,video/ogg" multiple hidden onChange={(e) => handleFilePick(e, true)} />
              <input ref={docRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z" multiple hidden onChange={(e) => handleFilePick(e, true)} />
            </>
          ) : (
            <EmptyState
              icon={Stethoscope}
              title="Sélectionnez une conversation"
              description="Choisissez un médecin pour démarrer la discussion."
            />
          )}
        </div>
      </div>

      {showNew && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          onClick={() => setShowNew(false)}
          role="dialog"
          aria-modal="true"
        >
          <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-primary-700 rounded-2xl shadow-glass w-full max-w-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-primary-900 dark:text-sable">Nouvelle conversation</h3>
              <button onClick={() => setShowNew(false)} aria-label="Fermer">
                <X className="w-5 h-5 text-primary-300" />
              </button>
            </div>
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {medecins.length === 0 ? (
                <LoadingSpinner size="sm" label="Chargement des médecins…" />
              ) : medecins.map((med) => (
                <button
                  key={med.id}
                  onClick={async () => {
                    setShowNew(false)
                    try {
                      const convId = await findOrCreateConv(med.id)
                      setActiveId(convId)
                    } catch {
                      toast.error("Impossible de créer la conversation.")
                    }
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-primary-100 dark:hover:bg-primary-900/40 text-left transition"
                >
                  <div className="w-9 h-9 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {(med.prenom?.[0] ?? '') + (med.nom?.[0] ?? '')}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-primary-900 dark:text-sable truncate">
                      Dr {med.prenom} {med.nom}
                    </p>
                    <p className="text-xs text-primary-300 truncate">{med.specialite}</p>
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
