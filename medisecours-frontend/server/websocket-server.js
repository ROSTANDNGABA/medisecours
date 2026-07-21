const { WebSocketServer } = require('ws')
const http = require('http')

const WS_PORT = process.env.WS_PORT || 8081
const HTTP_PORT = process.env.WS_HTTP_PORT || 8082

const clients = new Map()
const convClients = new Map()

const wss = new WebSocketServer({ port: WS_PORT })
console.log(`WebSocket server running on ws://127.0.0.1:${WS_PORT}`)

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost')
  const userId = url.searchParams.get('userId')
  const token = url.searchParams.get('token')
  const role = url.searchParams.get('role') || ''

  if (!userId || !token) {
    ws.close(4001, 'userId and token required')
    return
  }

  ws.userId = userId
  ws.token = token
  ws.role = role
  ws.subscriptions = new Set()

  console.log(`[WS] Client connected: ${userId} (role=${role})`)
  if (!clients.has(userId)) clients.set(userId, new Set())
  clients.get(userId).add(ws)

  let alive = true

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString())
      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }))
        return
      }
      if (msg.type === 'subscribe' && msg.conversationId) {
        ws.subscriptions.add(msg.conversationId)
        if (!convClients.has(msg.conversationId)) convClients.set(msg.conversationId, new Set())
        convClients.get(msg.conversationId).add(ws)
      }
      if (msg.type === 'unsubscribe' && msg.conversationId) {
        ws.subscriptions.delete(msg.conversationId)
        convClients.get(msg.conversationId)?.delete(ws)
      }
    } catch { /* ignore malformed */ }
  })

  ws.on('close', () => {
    clients.get(userId)?.delete(ws)
    if (clients.get(userId)?.size === 0) clients.delete(userId)
    for (const convId of ws.subscriptions) {
      convClients.get(convId)?.delete(ws)
    }
  })
})

const httpServer = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/publish') {
    let body = ''
    req.on('data', (chunk) => body += chunk)
    req.on('end', () => {
      try {
        const data = JSON.parse(body)
        const { conversationId, event, payload, broadcast, targetUserIds } = data

        if (broadcast) {
          // System-wide event — send to ALL connected clients
          const message = JSON.stringify({ event, payload })
          let sent = 0
          for (const [uid, wsSet] of clients) {
            for (const ws of wsSet) {
              if (ws.readyState === 1) {
                ws.send(message)
                sent++
              }
            }
          }
          console.log(`[WS] Broadcast: event=${event} sent=${sent}`)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ sent }))
          return
        }

        if (targetUserIds && Array.isArray(targetUserIds)) {
          // Targeted user delivery (e.g. for new messages in a conversation)
          const message = JSON.stringify({ event, payload })
          let sent = 0
          for (const uid of targetUserIds) {
            const wsSet = clients.get(String(uid))
            if (wsSet) {
              for (const ws of wsSet) {
                if (ws.readyState === 1) {
                  ws.send(message)
                  sent++
                }
              }
            }
          }
          console.log(`[WS] Publish: event=${event} conv=${conversationId} targeted_users=${targetUserIds.length} sent=${sent}`)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ sent }))
          return
        }

        if (!conversationId || !event) {
          res.writeHead(400)
          res.end('Missing conversationId, event, or broadcast')
          return
        }

        // Fallback: Per-conversation notification (legacy)
        const message = JSON.stringify({ event, payload })
        const subscribers = convClients.get(String(conversationId))
        console.log(`[WS] Publish: event=${event} conv=${conversationId} subscribers=${subscribers?.size || 0}`)
        if (subscribers) {
          for (const ws of subscribers) {
            if (ws.readyState === 1) ws.send(message)
          }
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ sent: subscribers?.size || 0 }))
      } catch (e) {
        res.writeHead(400)
        res.end('Invalid JSON')
      }
    })
  } else {
    res.writeHead(404)
    res.end('Not found')
  }
})

httpServer.listen(HTTP_PORT, () => {
  console.log(`HTTP publish endpoint on http://127.0.0.1:${HTTP_PORT}/publish`)
})
