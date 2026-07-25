'use client'

import { useEffect, useRef, useCallback } from 'react'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://127.0.0.1:8081'
const MAX_BACKOFF = 30000
const PING_INTERVAL = 30000
const PONG_TIMEOUT = 10000

export function useWebSocket(userId: string, token: string, handlers: {
  onNewMessage?: (msg: any) => void
  onMessageRead?: (msg: any) => void
  onUserOnline?: (data: any) => void
  onUserOffline?: (data: any) => void
  onConsultationCreated?: (data: any) => void
  onConsultationAccepted?: (data: any) => void
  onConsultationClosed?: (data: any) => void
}, role?: string) {
  const wsRef = useRef<WebSocket | null>(null)
  const attemptRef = useRef(0)
  const closedRef = useRef(false)
  const handlersRef = useRef(handlers)
  const pendingRef = useRef<any[]>([])
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pongTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const authenticatedRef = useRef(false)

  useEffect(() => {
    handlersRef.current = handlers
  }, [handlers])

  const clearTimers = useCallback(() => {
    if (pingIntervalRef.current) { clearInterval(pingIntervalRef.current); pingIntervalRef.current = null }
    if (pongTimeoutRef.current) { clearTimeout(pongTimeoutRef.current); pongTimeoutRef.current = null }
  }, [])

  const startPing = useCallback((ws: WebSocket) => {
    clearTimers()
    pingIntervalRef.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }))
        pongTimeoutRef.current = setTimeout(() => {
          ws.close()
        }, PONG_TIMEOUT)
      }
    }, PING_INTERVAL)
  }, [clearTimers])

  const handlePong = useCallback(() => {
    if (pongTimeoutRef.current) { clearTimeout(pongTimeoutRef.current); pongTimeoutRef.current = null }
  }, [])

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
    if (ws && ws.readyState === WebSocket.OPEN && authenticatedRef.current) {
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
    authenticatedRef.current = false
    clearTimers()

    const connect = () => {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        attemptRef.current = 0
        // Send auth message (no token in query string)
        ws.send(JSON.stringify({ type: 'auth', token }))
      }

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data)

          // Auth handshake
          if (parsed.type === 'auth_ok') {
            authenticatedRef.current = true
            startPing(ws)
            flush()
            return
          }

          if (parsed.type === 'error') {
            // Auth rejected — close and do not retry (bad token)
            ws.close(4003, parsed.message)
            return
          }

          if (parsed.type === 'pong') { handlePong(); return }

          const { event: evt, payload } = parsed
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

      ws.onclose = (event) => {
        clearTimers()
        authenticatedRef.current = false
        if (closedRef.current) return
        // Do not retry if auth failed (code 4003)
        if (event.code === 4003) return
        const backoff = Math.min(1000 * Math.pow(2, attemptRef.current), MAX_BACKOFF)
        attemptRef.current++
        setTimeout(connect, backoff)
      }
    }

    connect()

    return () => {
      closedRef.current = true
      clearTimers()
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [userId, token, startPing, handlePong, clearTimers, flush])

  return { subscribe, unsubscribe }
}
