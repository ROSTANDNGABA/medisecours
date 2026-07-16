'use client'

import { useEffect, useRef } from 'react'

const MERCURE_HUB_URL = 'http://127.0.0.1:8000/.well-known/mercure'
const MAX_BACKOFF_MS = 30000

export function useMercure(topic: string | null, onMessage: (data: any) => void) {
  const onMessageRef = useRef(onMessage)

  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  useEffect(() => {
    if (!topic) return

    let eventSource: EventSource | undefined
    let retryTimeout: any
    let attempt = 0
    let closed = false

    const connect = () => {
      const url = new URL(MERCURE_HUB_URL)
      url.searchParams.append('topic', topic)

      eventSource = new EventSource(url.toString(), { withCredentials: true })

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          onMessageRef.current?.(data)
        } catch {
          // ignore malformed payloads
        }
      }

      eventSource.onopen = () => {
        attempt = 0
      }

      eventSource.onerror = () => {
        eventSource?.close()
        if (closed) return
        const backoff = Math.min(1000 * 2 ** attempt, MAX_BACKOFF_MS)
        attempt += 1
        retryTimeout = setTimeout(connect, backoff)
      }
    }

    connect()

    return () => {
      closed = true
      clearTimeout(retryTimeout)
      eventSource?.close()
    }
  }, [topic])
}
