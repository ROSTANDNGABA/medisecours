const { WebSocketServer } = require('ws')
const http = require('http')
const jwt = require('jsonwebtoken')
const fs = require('fs')
const path = require('path')

const WS_PORT = process.env.WS_PORT || 8081
const HTTP_PORT = process.env.WS_HTTP_PORT || 8082

// ── JWT public key (RSA) ──────────────────────────────────────────
const PUB_KEY_PATH = process.env.JWT_PUBLIC_KEY
  || path.resolve(__dirname, '../../medisecours-backend/config/jwt/public.pem')
const PUBLIC_KEY = fs.readFileSync(PUB_KEY_PATH, 'utf8')

// ── In-memory client maps ─────────────────────────────────────────
const clients = new Map()       // userId -> Set<ws>
const convClients = new Map()   // conversationId -> Set<ws>

// ── WebSocket server ──────────────────────────────────────────────
const wss = new WebSocketServer({ port: WS_PORT })
console.log(`[WS] WebSocket server on ws://127.0.0.1:${WS_PORT}`)

const AUTH_TIMEOUT_MS = 10_000

wss.on('connection', (ws) => {
  ws.authenticated = false
  ws.userId = null
  ws.role = null
  ws.subscriptions = new Set()

  // Close if not authenticated within timeout
  const authTimer = setTimeout(() => {
    if (!ws.authenticated) {
      ws.close(4002, 'Auth timeout')
    }
  }, AUTH_TIMEOUT_MS)

  ws.on('message', (raw) => {
    let msg
    try {
      msg = JSON.parse(raw.toString())
    } catch {
      return // ignore malformed
    }

    // ── Auth handshake ────────────────────────────────────────────
    if (msg.type === 'auth') {
      if (ws.authenticated) return // already authed

      try {
        const decoded = jwt.verify(msg.token, PUBLIC_KEY, {
          algorithms: ['RS256'],
        })
        // The JWT payload typically contains the email in username.
        // We use msg.userId (the database ID sent by frontend) for routing.
        const userId = msg.userId || decoded.sub || decoded.username
        if (!userId) {
          ws.close(4003, 'Invalid token: no subject')
          return
        }

        clearTimeout(authTimer)
        ws.authenticated = true
        ws.userId = String(userId)
        ws.role = Array.isArray(decoded.roles) && decoded.roles[0]
          ? decoded.roles[0].replace('ROLE_', '').toLowerCase()
          : ''

        if (!clients.has(ws.userId)) clients.set(ws.userId, new Set())
        clients.get(ws.userId).add(ws)

        ws.send(JSON.stringify({ type: 'auth_ok', userId: ws.userId }))
        console.log(`[WS] Authenticated: ${ws.userId} (role=${ws.role})`)
      } catch (err) {
        ws.close(4003, 'Invalid token')
      }
      return
    }

    // ── All other messages require authentication ─────────────────
    if (!ws.authenticated) {
      ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }))
      return
    }

    // ── ping / pong ───────────────────────────────────────────────
    if (msg.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong' }))
      return
    }

    // ── subscribe / unsubscribe ───────────────────────────────────
    if (msg.type === 'subscribe' && msg.conversationId) {
      ws.subscriptions.add(msg.conversationId)
      if (!convClients.has(msg.conversationId)) convClients.set(msg.conversationId, new Set())
      convClients.get(msg.conversationId).add(ws)
    }
    if (msg.type === 'unsubscribe' && msg.conversationId) {
      ws.subscriptions.delete(msg.conversationId)
      convClients.get(msg.conversationId)?.delete(ws)
    }
  })

  ws.on('close', () => {
    clearTimeout(authTimer)
    if (ws.userId) {
      clients.get(ws.userId)?.delete(ws)
      if (clients.get(ws.userId)?.size === 0) clients.delete(ws.userId)
    }
    for (const convId of ws.subscriptions) {
      convClients.get(convId)?.delete(ws)
    }
  })
})

// ── HTTP /publish endpoint (used by Symfony backend) ─────────────
const httpServer = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/publish') {
    let body = ''
    req.on('data', (chunk) => body += chunk)
    req.on('end', () => {
      try {
        const data = JSON.parse(body)
        const { conversationId, event, payload, broadcast, targetUserIds } = data

        if (broadcast) {
          const message = JSON.stringify({ event, payload })
          let sent = 0
          for (const [, wsSet] of clients) {
            for (const ws of wsSet) {
              if (ws.readyState === 1 && ws.authenticated) {
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
          const message = JSON.stringify({ event, payload })
          let sent = 0
          for (const uid of targetUserIds) {
            const wsSet = clients.get(String(uid))
            if (wsSet) {
              for (const ws of wsSet) {
                if (ws.readyState === 1 && ws.authenticated) {
                  ws.send(message)
                  sent++
                }
              }
            }
          }
          console.log(`[WS] Publish: event=${event} conv=${conversationId} targeted=${targetUserIds.length} sent=${sent}`)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ sent }))
          return
        }

        if (!conversationId || !event) {
          res.writeHead(400)
          res.end('Missing conversationId, event, or broadcast')
          return
        }

        const message = JSON.stringify({ event, payload })
        const subscribers = convClients.get(String(conversationId))
        console.log(`[WS] Publish: event=${event} conv=${conversationId} subscribers=${subscribers?.size || 0}`)
        if (subscribers) {
          for (const ws of subscribers) {
            if (ws.readyState === 1 && ws.authenticated) ws.send(message)
          }
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ sent: subscribers?.size || 0 }))
      } catch {
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
  console.log(`[WS] HTTP publish endpoint on http://127.0.0.1:${HTTP_PORT}/publish`)
})
