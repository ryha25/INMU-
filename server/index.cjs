const { WebSocketServer } = require('ws')
const http = require('http')

const server = http.createServer((req, res) => {
  res.writeHead(200)
  res.end('INMU Game Server')
})
const wss = new WebSocketServer({ server, path: '/ws' })

const rooms = new Map()

function genId(len) {
  const min = Math.pow(10, len - 1)
  const max = Math.pow(10, len) - 1
  return Math.floor(min + Math.random() * (max - min + 1)).toString()
}

class Room {
  constructor(roomId, hasPassword) {
    this.roomId = roomId
    this.password = hasPassword ? genId(3) : null
    this.players = []
    this.started = false
  }
  send(ws, msg) {
    if (ws.readyState === 1) ws.send(JSON.stringify(msg))
  }
  broadcast(msg, excludeWs = null) {
    const data = JSON.stringify(msg)
    this.players.forEach(p => {
      if (p.ws !== excludeWs && p.ws.readyState === 1) p.ws.send(data)
    })
  }
  broadcastAll(msg) { this.broadcast(msg, null) }
  info() {
    return {
      roomId: this.roomId,
      playerCount: this.players.length,
      hasPassword: !!this.password,
      started: this.started,
      playerNames: this.players.map(p => p.name),
    }
  }
}

wss.on('connection', (ws) => {
  ws._roomId = null
  ws._playerIndex = -1
  ws._playerName = 'プレイヤー'

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString())
      handleMessage(ws, msg)
    } catch (e) { console.error('parse error', e) }
  })

  ws.on('close', () => {
    if (!ws._roomId) return
    const room = rooms.get(ws._roomId)
    if (!room) return
    const name = ws._playerName
    const idx = ws._playerIndex
    room.players = room.players.filter(p => p.ws !== ws)
    if (room.players.length === 0) {
      rooms.delete(ws._roomId)
    } else {
      room.broadcastAll({ type: 'player_left', playerIndex: idx, playerName: name, playerCount: room.players.length })
    }
  })
})

function handleMessage(ws, msg) {
  switch (msg.type) {
    case 'create_room': {
      const roomId = genId(4)
      const room = new Room(roomId, msg.hasPassword)
      room.players.push({ ws, name: msg.playerName, index: 0 })
      rooms.set(roomId, room)
      ws._roomId = roomId
      ws._playerIndex = 0
      ws._playerName = msg.playerName
      room.send(ws, { type: 'room_created', roomId, password: room.password, playerIndex: 0 })
      break
    }

    case 'join_room': {
      const room = rooms.get(msg.roomId)
      if (!room) { room_send_err(ws, '部屋が見つかりません'); return }
      if (room.password && room.password !== msg.password) { room_send_err(ws, 'パスワードが違います'); return }
      if (room.players.length >= 4) { room_send_err(ws, '部屋が満員です'); return }
      if (room.started) { room_send_err(ws, 'ゲームは開始済みです'); return }
      const playerIndex = room.players.length
      room.players.push({ ws, name: msg.playerName, index: playerIndex })
      ws._roomId = msg.roomId
      ws._playerIndex = playerIndex
      ws._playerName = msg.playerName
      room.send(ws, {
        type: 'room_joined',
        roomId: msg.roomId,
        playerIndex,
        players: room.players.map(p => ({ name: p.name, index: p.index })),
      })
      room.broadcast({ type: 'player_joined', playerName: msg.playerName, playerIndex, playerCount: room.players.length }, ws)
      break
    }

    case 'start_game': {
      if (!ws._roomId) return
      const room = rooms.get(ws._roomId)
      if (!room || ws._playerIndex !== 0) return
      if (room.started) return
      room.started = true
      room.broadcastAll({
        type: 'game_started',
        initialState: msg.initialState,
        players: room.players.map(p => ({ name: p.name, index: p.index })),
      })
      break
    }

    case 'game_action': {
      if (!ws._roomId) return
      const room = rooms.get(ws._roomId)
      if (!room) return
      room.broadcast({ type: 'game_state_sync', newState: msg.newState, actorIndex: ws._playerIndex }, ws)
      break
    }

    case 'stamp': {
      if (!ws._roomId) return
      const room = rooms.get(ws._roomId)
      if (!room) return
      room.broadcastAll({ type: 'stamp', playerIndex: ws._playerIndex, stampId: msg.stampId })
      break
    }

    case 'get_room_list': {
      const list = [...rooms.values()]
        .filter(r => !r.started && r.players.length < 4)
        .map(r => r.info())
      ws.send(JSON.stringify({ type: 'room_list', rooms: list }))
      break
    }
  }
}

function room_send_err(ws, message) {
  if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'join_error', message }))
}

const PORT = process.env.WS_PORT || 3001
server.listen(PORT, () => {
  console.log(`Game WS server on port ${PORT}`)
})
