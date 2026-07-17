'use client'

import { useEffect, useRef, useCallback } from 'react'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://127.0.0.1:8081'
const MAX_BACKOFF = 30000

export function useWebSocket(userId: string, token: string, handlers: {
  onNewMessage?: (msg: any) => void
  onMessageRead?: (msg: any) => void
  onUserOnline?: (data: any) => void
  onUserOffline?: (data: any) => void
  onConsultationCreated?: (data: any) => void
  onConsultationAccepted?: (data: any) => void
  onConsultationClosed?: (data: any) => void
}) {
  const wsRef = useRef<WebSocket | null>(null)
  const attemptRef = useRef(0)
  const closedRef = useRef(false)
  const handlersRef = useRef(handlers)
  const pendingRef = useRef<any[]>([])

  useEffect(() => {
    handlersRef.current = handlers
  }, [handlers])

  const flush = useCallback(() => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    const queue = pendingRef.current
    pendingRef.current = []
    queue.forEach(({ type, conversationId }) => {
      ws.send(JSON.stringify({ type, conversationId }))
    })
  }, [])

  const send = useCallback((type: string, conversationId: string) => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, conversationId }))
    } else {
      pendingRef.current.push({ type, conversationId })
    }
  }, [])

  const subscribe = useCallback((conversationId: string) => send('subscribe', conversationId), [send])
  const unsubscribe = useCallback((conversationId: string) => send('unsubscribe', conversationId), [send])

  useEffect(() => {
    if (!userId || !token) return

    closedRef.current = false
    attemptRef.current = 0
    pendingRef.current = []

    const connect = () => {
      const role = ''
      const url = `${WS_URL}?userId=${encodeURIComponent(userId)}&token=${encodeURIComponent(token)}&role=${role}`
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => { attemptRef.current = 0; flush() }

      ws.onmessage = (event) => {
        try {
          const { event: evt, payload } = JSON.parse(event.data)
          const h = handlersRef.current
          if (evt === 'new_message' && h.onNewMessage) h.onNewMessage(payload)
          if (evt === 'message_read' && h.onMessageRead) h.onMessageRead(payload)
          if (evt === 'user_online' && h.onUserOnline) h.onUserOnline(payload)
          if (evt === 'user_offline' && h.onUserOffline) h.onUserOffline(payload)
          if (evt === 'consultation_created' && h.onConsultationCreated) h.onConsultationCreated(payload)
          if (evt === 'consultation_accepted' && h.onConsultationAccepted) h.onConsultationAccepted(payload)
          if (evt === 'consultation_closed' && h.onConsultationClosed) h.onConsultationClosed(payload)
        } catch { /* ignore */ }
      }

      ws.onclose = () => {
        if (closedRef.current) return
        const backoff = Math.min(1000 * Math.pow(2, attemptRef.current), MAX_BACKOFF)
        attemptRef.current++
        setTimeout(connect, backoff)
      }
    }

    connect()

    return () => {
      closedRef.current = true
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [userId, token])

  return { subscribe, unsubscribe }
}
