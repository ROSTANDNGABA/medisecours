// @ts-nocheck
'use client'

import { useEffect, useCallback, useMemo, useRef, useState } from 'react'
import { API_BASE } from '../../lib/config'

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
import useSWR, { mutate as globalMutate } from 'swr'
import { fetcher } from '../../lib/fetcher'
import { useSearchParams, useRouter } from 'next/navigation'
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
  return API_BASE + path
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
  const router = useRouter()

  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const [conversationsLocal, setConversationsLocal] = useState([])
  const [activeId, setActiveId] = useState(searchParams?.get('conversation') || null)
  const [unreadCounts, setUnreadCounts] = useState(new Map())
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
  const msgContainerRef = useRef(null)
  const topSentinelRef = useRef(null)

  const [msgPage, setMsgPage] = useState(1)
  const [allLoadedMsgs, setAllLoadedMsgs] = useState([])
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const activeIdRef = useRef(activeId)
  const loadingMoreRef = useRef(false)
  const hasMoreRef = useRef(true)
  const msgLoadingRef = useRef(false)

  const { data: convData, isLoading: convLoading, error: convError, mutate: mutateConvs } = useSWR('/api/conversations', fetcher, { revalidateOnFocus: false })

  const preselectConsultation = searchParams?.get('consultation')
  const preselectStarted = useRef(false)
  useEffect(() => {
    if (!preselectConsultation || convLoading || !user || preselectStarted.current) return
    preselectStarted.current = true
    const consultationId = Number(preselectConsultation)
    if (!consultationId) return
    ;(async () => {
      try {
        const { data: consultation } = await api.get(`/api/consultations/${consultationId}`)
        const medecinId = consultation.medecin?.id
        if (!medecinId) {
          toast.error('Aucun médecin assigné à cette consultation.')
          return
        }
        const convs = Array.isArray(convData) ? convData : convData?.['hydra:member'] || []
        const existing = convs.find((c) =>
          c.participants?.some((p) => {
            const pId = typeof p === 'object' ? String(p.id) : String(idFromIri(p))
            return pId === String(medecinId)
          })
        )
        if (existing) {
          setActiveId(String(existing.id))
          return
        }
        const { data: conv } = await api.post('/api/conversations', {
          participants: [iri('users', user?.id), iri('users', medecinId)]
        }, { headers: { 'Content-Type': 'application/ld+json' } })

        await mutateConvs((prev) => {
          const arr = Array.isArray(prev) ? prev : prev?.['hydra:member'] || []
          return [conv, ...arr]
        }, { revalidate: true })
        setActiveId(String(conv.id))
      } catch {
        toast.error('Impossible de charger la conversation.')
      }
    })()
  }, [preselectConsultation, convLoading, convData, user, toast, mutateConvs])

  const activeIdNum = activeId ? Number(activeId) : null
  const MSGS_PER_PAGE = 30
  const { data: msgData, isLoading: msgLoading, error: msgError, mutate: mutateMsgs } = useSWR(
    activeIdNum ? `/api/messages?conversation=/api/conversations/${activeIdNum}&order[createdAt]=DESC&itemsPerPage=${MSGS_PER_PAGE}&page=${msgPage}` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  useEffect(() => { activeIdRef.current = activeId }, [activeId])
  useEffect(() => { loadingMoreRef.current = loadingMore }, [loadingMore])
  useEffect(() => { hasMoreRef.current = hasMore }, [hasMore])
  useEffect(() => { msgLoadingRef.current = msgLoading }, [msgLoading])

  useEffect(() => {
    setMsgPage(1)
    setAllLoadedMsgs([])
    setHasMore(true)
    setLoadingMore(false)
    scrollToBottomPendingRef.current = true
  }, [activeId])

  useEffect(() => {
    if (activeId) {
      document.body.classList.add('chat-open')
    } else {
      document.body.classList.remove('chat-open')
    }
    return () => document.body.classList.remove('chat-open')
  }, [activeId])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (activeId) {
      params.set('conversation', String(activeId))
    } else {
      params.delete('conversation')
    }
    const qs = params.toString()
    router.replace(qs ? `/messages?${qs}` : '/messages', { scroll: false })
  }, [activeId, router])

  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search)
      setActiveId(params.get('conversation') || null)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    if (!msgData) return
    const arr = Array.isArray(msgData) ? msgData : msgData['hydra:member'] || []
    if (arr.length < MSGS_PER_PAGE) setHasMore(false)

    const container = msgContainerRef.current
    const prevScrollHeight = container ? container.scrollHeight : 0

    if (msgPage === 1) {
      setAllLoadedMsgs(arr)
    } else {
      setAllLoadedMsgs(prev => {
        const existingIds = new Set(prev.map(m => String(m.id ?? m['@id'])))
        const newMsgs = arr.filter(m => !existingIds.has(String(m.id ?? m['@id'])))
        return newMsgs.length > 0 ? [...prev, ...newMsgs] : prev
      })
    }
    setLoadingMore(false)

    if (msgPage > 1 && container) {
      requestAnimationFrame(() => {
        const newScrollHeight = container.scrollHeight
        container.scrollTop += newScrollHeight - prevScrollHeight
      })
    }
  }, [msgData, msgPage])

  const token = typeof window !== 'undefined' ? localStorage.getItem('medisecours_token') : null

  function sameMsg(a, b) {
    const idA = String(a.id ?? a['@id'] ?? '')
    const idB = String(b.id ?? b['@id'] ?? '')
    return idA !== '' && idB !== '' && idA === idB
  }
  const { subscribe } = useWebSocket(user?.id, token, {
    onNewMessage: (msg) => {
      const currentActiveId = activeIdRef.current
      if (String(idFromIri(msg.expediteur)) === String(user?.id)) {
        if (msg._tempId) {
          setPendingMsgs(prev => prev.filter(m => m.id !== msg._tempId))
          setAllLoadedMsgs(prev => {
            const idx = prev.findIndex(m => m.id === msg._tempId)
            if (idx !== -1) {
              const updated = [...prev]
              updated[idx] = { ...msg, _sending: false }
              return updated
            }
            if (prev.some(m => sameMsg(m, msg))) return prev
            return [msg, ...prev]
          })
        }
        return
      }
      const convId = String(idFromIri(msg.conversation) || '')
      if (convId && convId !== currentActiveId) {
        setUnreadCounts(prev => {
          const next = new Map(prev)
          next.set(convId, (next.get(convId) || 0) + 1)
          return next
        })
        mutateConvs()
        return
      }
      if (convId && convId === currentActiveId) {
        setAllLoadedMsgs(prev => {
          if (prev.some(m => sameMsg(m, msg))) return prev
          return [msg, ...prev]
        })
        
        // Injection directe via mutation locale sur le cache SWR dynamique de la discussion (Filtre anti-rechargement)
        const activeIdNum = Number(currentActiveId)
        const MSGS_PER_PAGE = 30
        const msgKey = `/api/messages?conversation=/api/conversations/${activeIdNum}&order[createdAt]=DESC&itemsPerPage=${MSGS_PER_PAGE}&page=1`
        globalMutate(msgKey, (currentCache: any) => {
          const arr = Array.isArray(currentCache) ? currentCache : (currentCache?.['hydra:member'] || [])
          // Sécurité contre les doublons (Race Condition)
          if (arr.some((m: any) => String(m.id ?? m['@id']) === String(msg.id ?? msg['@id']))) {
            return currentCache
          }
          const newArr = [msg, ...arr]
          return Array.isArray(currentCache) ? newArr : { ...currentCache, 'hydra:member': newArr }
        }, { revalidate: false })
        
        mutateConvs()
      }
    },
    onMessageRead: (msg) => {
      setAllLoadedMsgs((prev) => prev.map((m) => sameMsg(m, msg) ? { ...m, statut: 'LU' } : m))
    },
    onProfilePhotoChanged: (data) => {
      if (!data?.userId || !('photoProfil' in data)) return
      mutateConvs()
      setMedecins(prev => {
        const idx = prev.findIndex(u => String(u.id) === String(data.userId))
        if (idx === -1) return prev
        const updated = [...prev]
        updated[idx] = { ...updated[idx], photoProfil: data.photoProfil }
        return updated
      })
    },
  })

  useEffect(() => {
    if (activeId) {
      subscribe(activeId)
      const t = setTimeout(() => {
        setUnreadCounts(prev => {
          const next = new Map(prev)
          next.set(activeId, 0)
          return next
        })
      }, 0)
      return () => clearTimeout(t)
    }
  }, [activeId, subscribe])

  const prevMsgCountRef = useRef(0)
  const scrollToBottomPendingRef = useRef(false)
  useEffect(() => {
    const el = msgContainerRef.current
    if (!el) return
    const currentCount = allLoadedMsgs.length
    if (scrollToBottomPendingRef.current && currentCount > 0) {
      scrollToBottomPendingRef.current = false
      prevMsgCountRef.current = currentCount
      requestAnimationFrame(() => { el.scrollTop = el.scrollHeight })
      return
    }
    if (currentCount <= prevMsgCountRef.current) {
      prevMsgCountRef.current = currentCount
      return
    }
    prevMsgCountRef.current = currentCount
    const threshold = 150
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold
    if (nearBottom) {
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }))
    }
  }, [allLoadedMsgs.length])

  useEffect(() => {
    if (activeId) {
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView())
    }
  }, [activeId])

  useEffect(() => {
    const sentinel = topSentinelRef.current
    if (!sentinel) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasMoreRef.current && !loadingMoreRef.current && !msgLoadingRef.current) {
        loadingMoreRef.current = true
        setLoadingMore(true)
        setMsgPage(p => p + 1)
      }
    }, { threshold: 0.1 })
    obs.observe(sentinel)
    return () => obs.disconnect()
  }, [activeId])

  useEffect(() => {
    const iris = [...new Set(allLoadedMsgs.filter(m => m.media && typeof m.media === 'string' && /\/(media_objects|media)\//.test(m.media)).map(m => m.media))]
    const pending = iris.filter(i => !mediaCache.current.has(i))
    if (pending.length === 0) return
    let dead = false
    Promise.allSettled(pending.map(i => api.get(i).then(r => ({ i, d: r.data })))).then(rr => {
      if (dead) return
      let changed = false
      rr.forEach(r => { if (r.status === 'fulfilled') { mediaCache.current.set(r.value.i, r.value.d); changed = true } })
      if (changed) setAllLoadedMsgs(prev => prev.map(m => typeof m.media === 'string' && mediaCache.current.has(m.media) ? { ...m, media: mediaCache.current.get(m.media) } : m))
    })
    return () => { dead = true }
  }, [allLoadedMsgs])

  const conversations = Array.isArray(convData) ? convData : convData?.['hydra:member'] || []

  function matchConv(msg, convId) {
    const conv = msg.conversation
    const iri = `/api/conversations/${convId}`
    if (!conv) return false
    if (typeof conv === 'string') return conv === iri
    return conv['@id'] === iri || conv.id == convId
  }

  // Auto-fetch missing participant user info if API returns string IRIs or shallow objects
  useEffect(() => {
    if (!conversations.length) return
    const missingIris = new Set()
    for (const c of conversations) {
      c.participants?.forEach(p => {
        if (typeof p === 'string') {
          if (!medecins.some(u => String(u.id) === String(idFromIri(p)))) missingIris.add(p)
        } else if (p && typeof p === 'object') {
          if (!p.nom && !p.prenom && p['@id']) {
            if (!medecins.some(u => String(u.id) === String(p.id))) missingIris.add(p['@id'])
          }
        }
      })
    }
    if (missingIris.size > 0) {
      let dead = false
      Promise.allSettled(Array.from(missingIris).map(iriStr => api.get(iriStr).then(r => r.data)))
        .then(results => {
          if (dead) return
          const newUsers = results.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value)
          if (newUsers.length > 0) {
            setMedecins(prev => {
               const map = new Map(prev.map(u => [String(u.id), u]))
               newUsers.forEach(u => map.set(String(u.id), u))
               return Array.from(map.values())
            })
          }
        })
      return () => { dead = true }
    }
  }, [conversations, medecins])

  const convMap = useMemo(() => {
    const map = new Map()
    for (const c of conversations) {
      const other = c.participants?.find((p) => {
        const pId = typeof p === 'object' ? p.id : idFromIri(p)
        return String(pId) !== String(user?.id)
      })
      
      let info = null
      if (typeof other === 'object') {
        if (other.nom || other.prenom) {
          info = other
        } else {
          info = medecins.find(u => String(u.id) === String(other.id)) || other
        }
      } else if (typeof other === 'string') {
        info = medecins.find(u => String(u.id) === String(idFromIri(other))) || null
      }

      const lastMsg = c.dernierMessage || null
      const unread = unreadCounts.get(String(c.id)) || 0
      map.set(String(c.id), { id: String(c.id), info: info, messages: [], unread, dernierMessage: lastMsg })
    }
    for (const p of pendingMsgs) {
      const convId = idFromIri(p.conversation) || p.conversation
      const existing = map.get(String(convId))
      if (existing && String(convId) === activeId) {
        existing.messages = [...existing.messages, p]
      }
    }
    return map
  }, [conversations, user, pendingMsgs, activeId, unreadCounts, medecins])

  const sortedConvs = useMemo(() =>
    Array.from(convMap.values()).sort((a, b) => {
      const la = a.dernierMessage?.createdAt ?? ''
      const lb = b.dernierMessage?.createdAt ?? ''
      return String(lb).localeCompare(String(la))
    }), [convMap])

  const active = convMap.get(activeId)

  const dedupedMessages = useMemo(() => {
    const msgs = [...allLoadedMsgs]
    if (active) {
      for (const p of active.messages) {
        if (!msgs.some(m => sameMsg(m, p))) msgs.push(p)
      }
    }
    msgs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    const seen = new Set()
    return msgs.filter(m => {
      const key = m.id ?? m['@id']
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [allLoadedMsgs, active])



  useEffect(() => {
    const el = bottomRef.current?.parentElement
    if (!el) return
    const threshold = 150
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold
    if (nearBottom) requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }))
  }, [active?.messages?.length])

  useEffect(() => {
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView())
  }, [activeId])

  const readAttempted = useRef(new Set())

  const markAsRead = useCallback(async (msg) => {
    if (!msg['@id']) return
    const msgId = msg.id ?? msg['@id']
    if (msg.statut === 'LU' || idFromIri(msg.expediteur) === user?.id) return
    if (readAttempted.current.has(msgId)) return
    readAttempted.current.add(msgId)
    setMessages((all) => all.map((m) => (m.id === msg.id ? { ...m, statut: 'LU' } : m)))
    api.patch(msg['@id'], { statut: 'LU' }, { headers: { 'Content-Type': 'application/merge-patch+json' } })
      .then(() => globalMutate('/api/messages/unread-count'))
      .catch(() => {})
  }, [user?.id])

  useEffect(() => {
    active?.messages.forEach(markAsRead)
  }, [active, markAsRead])

  const findOrCreateConv = async (medecinId) => {
    const existing = conversations.find((c) =>
      c.participants?.some((p) => {
        const pId = typeof p === 'object' ? p.id : idFromIri(p)
        return String(pId) === String(medecinId)
      })
    )
    if (existing) return String(existing.id)

    const { data: conv } = await api.post('/api/conversations', {
      participants: [iri('users', user?.id), iri('users', medecinId)]
    }, { headers: { 'Content-Type': 'application/ld+json' } })
    await mutateConvs((prev) => {
      const arr = Array.isArray(prev) ? prev : prev?.['hydra:member'] || []
      return [conv, ...arr]
    }, { revalidate: true })
    return String(conv.id)
  }

  const deleteConversation = async (idToDelete) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette discussion ? Toutes les données seront perdues.')) return
    try {
      await api.delete(`/api/conversations/${idToDelete}`)
      toast.success('Discussion supprimée.')
      mutateConvs()
      if (String(activeId) === String(idToDelete)) {
        setActiveId(null)
      }
    } catch {
      toast.error('Erreur lors de la suppression de la discussion.')
    }
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
      headers: { 'Content-Type': undefined }
    })
    return data
  }

  const handleSend = async () => {
    if (!activeId) return
    const hasText = draft.trim().length > 0
    const hasFiles = attachments.length > 0
    if (!hasText && !hasFiles) return

    const convIri = `/api/conversations/${activeId}`
    const currentActiveId = activeId

    // Optimistic sidebar update: inject mock dernierMessage instantly
    const optimisticConvMutate = (content: string) => {
      mutateConvs((prev: any) => {
        const arr = Array.isArray(prev) ? prev : []
        return arr.map((c: any) => {
          if (String(c.id) === String(currentActiveId)) {
            return { ...c, dernierMessage: { contenu: content.slice(0, 80), createdAt: new Date().toISOString(), expediteur: { id: user?.id } } }
          }
          return c
        })
      }, { revalidate: false })
    }

    if (hasFiles) {
      setSending(true)
      setUploadingMedia(true)
      const caption = draft.trim()
      setDraft('')
      const pending = attachments.map((att) => ({
        ...att,
        tempId: 'temp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      }))
      // Add optimistic messages to local state only (no WS publish yet)
      for (const att of pending) {
        const optimistic = {
          id: att.tempId, contenu: caption || '',
          expediteur: { id: user?.id },
          conversation: convIri, statut: 'ENVOYE',
          createdAt: new Date().toISOString(),
          typeMessage: msgTypeFromMime(att.mime),
          _sending: true, media: { contentUrl: att.preview || '', originalName: att.name, size: att.size, mimeType: att.mime },
        }
        setAllLoadedMsgs(prev => [...prev, optimistic])
      }
      // Optimistic sidebar: show file preview instantly
      optimisticConvMutate(caption || '📎 Fichier')
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
        // Replace optimistic entries with real ones
        setAllLoadedMsgs(prev => {
          let updated = [...prev]
          for (let i = 0; i < pending.length; i++) {
            const idx = updated.findIndex(m => m.id === pending[i].tempId)
            if (idx !== -1) updated[idx] = { ...created[i], _sending: false }
            else if (!updated.some(m => sameMsg(m, created[i]))) updated.push(created[i])
          }
          return updated
        })
        mutateConvs()
      } catch {
        toast.error("Échec de l'envoi du message.")
        const tempIds = new Set(pending.map(a => a.tempId))
        setAllLoadedMsgs(prev => prev.filter(m => !tempIds.has(m.id)))
      } finally {
        setSending(false)
        setUploadingMedia(false)
        pending.forEach((a) => { if (a.preview) URL.revokeObjectURL(a.preview) })
      }
      return
    }

    // Text-only message
    const content = draft.trim()
    const tempId = 'temp-' + Date.now()
    const temp = {
      id: tempId, contenu: content,
      expediteur: { id: user?.id },
      conversation: convIri,
      statut: 'ENVOYE', createdAt: new Date().toISOString(),
      _sending: true,
    }
    // Add optimistic message to local state (no WS publish yet)
    setAllLoadedMsgs(prev => [...prev, temp])
    // Optimistic sidebar update: show message preview instantly
    optimisticConvMutate(content)
    setDraft('')
    setSending(true)
    try {
      const { data } = await api.post('/api/messages', { contenu: content, conversation: convIri }, { headers: { 'Content-Type': 'application/ld+json' } })
      // Replace optimistic with real
      setAllLoadedMsgs(prev => {
        const idx = prev.findIndex(m => m.id === tempId)
        if (idx !== -1) {
          const updated = [...prev]
          updated[idx] = { ...data, _sending: false }
          return updated
        }
        return prev.some(m => sameMsg(m, data)) ? prev : [...prev, data]
      })
      mutateConvs()
    } catch {
      setAllLoadedMsgs(prev => prev.filter(m => m.id !== tempId))
      toast.error("Échec de l'envoi du message.")
    } finally {
      setSending(false)
    }
  }

  if (!mounted) return <LoadingSpinner label="Chargement…" />
  if (convLoading) return <LoadingSpinner label="Chargement de la messagerie…" />

  return (
    <div className={`max-w-6xl mx-auto w-full p-0 lg:px-6 lg:py-10 flex flex-col overflow-hidden relative ${activeId ? 'h-[100dvh] lg:h-[calc(100dvh_-_96px)]' : 'flex-1 min-h-0'}`}>
      <div className="grid grid-cols-1 lg:grid-cols-3 flex-1 min-h-0 lg:rounded-2xl overflow-hidden border border-primary-100 dark:border-white/10 shadow-xl">

        <div className={`lg:col-span-1 min-h-0 border-r border-primary-100 dark:border-white/10 bg-white/70 dark:bg-primary-700/40 flex flex-col ${activeId ? 'hidden lg:flex' : 'flex'}`}>
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
                <div className="w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                  {c.info?.photoProfil ? <img src={mediaUrl(c.info.photoProfil)} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} /> : null}
                  <span style={c.info?.photoProfil ? { display: 'none' } : undefined} className="flex items-center justify-center w-full h-full">{(c.info?.prenom?.[0] || '') + (c.info?.nom?.[0] || '')}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-primary-900 dark:text-sable truncate">{c.info?.prenom} {c.info?.nom}</p>
                  <p className="text-xs text-primary-300 truncate">
                    {c.dernierMessage?.typeMessage === 'IMAGE' && <>📷 Image</>}
                    {c.dernierMessage?.typeMessage === 'VOIX' && <>🎤 Message vocal</>}
                    {c.dernierMessage?.typeMessage === 'FICHIER' && <>📎 {c.dernierMessage?.media?.originalName || 'Fichier'}</>}
                    {(!c.dernierMessage?.typeMessage || c.dernierMessage?.typeMessage === 'TEXTE') && (c.dernierMessage?.contenu || '')}
                  </p>
                </div>
                {c.unread > 0 && <span className="w-5 h-5 rounded-full bg-urgence-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">{c.unread}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className={`lg:col-span-2 h-full min-h-0 flex flex-col overflow-hidden relative bg-sable dark:bg-primary-900 ${activeId ? 'flex' : 'hidden lg:flex'}`}>
          {active ? (
            <>
              <div className="sticky top-0 z-30 flex-none h-16 flex items-center gap-3 p-4 border-b border-primary-100 dark:border-white/10 bg-white/70 dark:bg-primary-700/40">
                <button className="lg:hidden" onClick={() => setActiveId(null)} aria-label="Retour"><ArrowLeft className="w-5 h-5 text-primary-500" /></button>
                <div className="w-9 h-9 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                  {active.info?.photoProfil ? <img src={mediaUrl(active.info.photoProfil)} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} /> : null}
                  <span style={active.info?.photoProfil ? { display: 'none' } : undefined} className="flex items-center justify-center w-full h-full">{(active.info?.prenom?.[0] || '') + (active.info?.nom?.[0] || '')}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-primary-900 dark:text-sable truncate">{active.info?.prenom} {active.info?.nom}</p>
                </div>
                <button onClick={() => deleteConversation(active.id)} className="p-2 text-primary-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer la discussion">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <div ref={msgContainerRef} className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0 pb-24">
                {hasMore && (
                  <div ref={topSentinelRef} className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-primary-300" />
                  </div>
                )}
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
                        {mine ? (
                          <div className={`flex justify-end items-center gap-1.5 ${m.typeMessage !== 'TEXTE' || m.contenu ? 'pb-2 px-3' : 'pb-2.5 px-4'}`}>
                            <p className="text-[10px] opacity-70">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            {m._sending ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin opacity-60" />
                            ) : m.statut === 'LU' ? (
                              <CheckCheck className="w-3.5 h-3.5 text-[#4dd0e1]" />
                            ) : (
                              <CheckCheck className="w-3.5 h-3.5 opacity-60" />
                            )}
                          </div>
                        ) : (
                          <div className={`flex justify-start ${m.typeMessage !== 'TEXTE' || m.contenu ? 'pb-2 px-3' : 'pb-2.5 px-4'}`}>
                            <p className="text-[10px] opacity-50">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              <div className="absolute bottom-0 left-0 right-0 z-30 border-t border-primary-100 dark:border-white/10 bg-white/70 dark:bg-primary-700/40 pb-[env(safe-area-inset-bottom,0px)] md:pb-0">
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
                  <button type="button" onClick={handleSend} disabled={sending || (!draft.trim() && attachments.length === 0) || recording} aria-label="Envoyer" className="p-3 rounded-2xl bg-mint-500 hover:bg-mint-700 text-white disabled:opacity-50 transition">
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
                  <div className="w-9 h-9 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                    {med.photoProfil ? <img src={mediaUrl(med.photoProfil)} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} /> : null}
                    <span style={med.photoProfil ? { display: 'none' } : undefined} className="flex items-center justify-center w-full h-full">{(med.prenom?.[0] ?? '') + (med.nom?.[0] ?? '')}</span>
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
