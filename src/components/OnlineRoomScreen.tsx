import React, { useState, useEffect, useRef } from 'react'
import { RulesConfig, DEFAULT_RULES } from '../types/game'
import { initGame } from '../logic/gameEngine'

interface Props {
  playerName: string
  playerAvatar?: string | null
  onGameStart: (wsRef: WebSocket, playerIndex: number, initialState: any, playerNames: string[], playerAvatars: (string | null)[]) => void
  onBack: () => void
}

type RoomPhase = 'lobby' | 'creating' | 'joining' | 'waiting'

function SmallAvatar({ name, avatarDataUrl }: { name: string; avatarDataUrl: string | null }) {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%',
      border: '1.5px solid rgba(212,175,55,0.35)',
      overflow: 'hidden', background: 'rgba(212,175,55,0.1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, fontSize: 13, color: '#d4af37', fontWeight: 700,
    }}>
      {avatarDataUrl
        ? <img src={avatarDataUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
        : <span>{name.charAt(0).toUpperCase() || '?'}</span>
      }
    </div>
  )
}

export default function OnlineRoomScreen({ playerName, playerAvatar = null, onGameStart, onBack }: Props) {
  const [phase, setPhase] = useState<RoomPhase>('lobby')
  const [roomId, setRoomId] = useState('')
  const [password, setPassword] = useState('')
  const [joinRoomId, setJoinRoomId] = useState('')
  const [joinPassword, setJoinPassword] = useState('')
  const [hasPassword, setHasPassword] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [statusMsg, setStatusMsg] = useState('接続中...')
  const [waitingPlayers, setWaitingPlayers] = useState<string[]>([playerName])
  const [waitingAvatars, setWaitingAvatars] = useState<(string | null)[]>([playerAvatar])
  const [myPlayerIndex, setMyPlayerIndex] = useState(0)
  const [copyMsg, setCopyMsg] = useState('')
  const wsRef = useRef<WebSocket | null>(null)
  const myIndexRef = useRef(0)
  const waitingRef = useRef<string[]>([playerName])
  const waitingAvatarsRef = useRef<(string | null)[]>([playerAvatar])
  const connectedRef = useRef(false)

  useEffect(() => {
    connectWS()
    return () => { wsRef.current?.close() }
  }, [])

  function connectWS() {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${proto}//${window.location.host}/ws`)
    wsRef.current = ws
    ws.onopen = () => { connectedRef.current = true; setStatusMsg('') }
    ws.onerror = () => setStatusMsg('サーバーに接続できませんでした')
    ws.onclose = () => { connectedRef.current = false }
    ws.onmessage = (e) => {
      try { handleWsMessage(JSON.parse(e.data), ws) } catch (_) {}
    }
  }

  function handleWsMessage(msg: any, ws: WebSocket) {
    switch (msg.type) {
      case 'room_created':
        setRoomId(msg.roomId)
        if (msg.password) setPassword(msg.password)
        myIndexRef.current = 0
        setMyPlayerIndex(0)
        waitingRef.current = [playerName]
        waitingAvatarsRef.current = [playerAvatar]
        setWaitingPlayers([playerName])
        setWaitingAvatars([playerAvatar])
        setPhase('waiting')
        break
      case 'room_joined': {
        myIndexRef.current = msg.playerIndex
        setMyPlayerIndex(msg.playerIndex)
        const names = msg.players.map((p: any) => p.name)
        const avatars = msg.players.map((p: any) => p.avatarDataUrl ?? null)
        waitingRef.current = names
        waitingAvatarsRef.current = avatars
        setWaitingPlayers(names)
        setWaitingAvatars(avatars)
        setPhase('waiting')
        break
      }
      case 'player_joined': {
        const nextNames = [...waitingRef.current]
        const nextAvatars = [...waitingAvatarsRef.current]
        nextNames[msg.playerIndex] = msg.playerName
        nextAvatars[msg.playerIndex] = msg.avatarDataUrl ?? null
        waitingRef.current = nextNames
        waitingAvatarsRef.current = nextAvatars
        setWaitingPlayers([...nextNames])
        setWaitingAvatars([...nextAvatars])
        break
      }
      case 'player_left': {
        const nextNames = [...waitingRef.current]
        const nextAvatars = [...waitingAvatarsRef.current]
        nextNames[msg.playerIndex] = '(退出)'
        nextAvatars[msg.playerIndex] = null
        waitingRef.current = nextNames
        waitingAvatarsRef.current = nextAvatars
        setWaitingPlayers([...nextNames])
        setWaitingAvatars([...nextAvatars])
        break
      }
      case 'game_started': {
        const players = msg.players
        const playerNames = players.map((p: any) => p.name)
        const playerAvatars = players.map((p: any) => p.avatarDataUrl ?? null)
        onGameStart(ws, myIndexRef.current, msg.initialState, playerNames, playerAvatars)
        break
      }
      case 'join_error':
        setErrorMsg(msg.message)
        break
    }
  }

  function createRoom() {
    if (!wsRef.current || wsRef.current.readyState !== 1) {
      setErrorMsg('サーバーに接続中です...')
      return
    }
    wsRef.current.send(JSON.stringify({ type: 'create_room', playerName, hasPassword, avatarDataUrl: playerAvatar }))
  }

  function joinRoom() {
    if (!wsRef.current || wsRef.current.readyState !== 1) { setErrorMsg('接続中...'); return }
    if (!joinRoomId) { setErrorMsg('ルームIDを入力してください'); return }
    wsRef.current.send(JSON.stringify({ type: 'join_room', roomId: joinRoomId, playerName, password: joinPassword || undefined, avatarDataUrl: playerAvatar }))
  }

  function startGame() {
    if (!wsRef.current || wsRef.current.readyState !== 1) return
    const names = waitingRef.current.filter(n => n && n !== '(退出)')
    const paddedNames = [...names]
    while (paddedNames.length < 4) paddedNames.push(`CPU ${paddedNames.length}`)
    const state = initGame(DEFAULT_RULES, paddedNames)
    wsRef.current.send(JSON.stringify({ type: 'start_game', initialState: state }))
  }

  function copyInvite() {
    const appUrl = (import.meta as any).env?.VITE_APP_URL || window.location.origin
    const joinUrl = `${appUrl.replace(/\/$/, '')}${window.location.pathname}?room=${encodeURIComponent(roomId)}`
    const pwLine = password ? `\nパスワード：${password}` : ''
    const text = `【INMU大富豪フレンド対戦】\nルームID：${roomId}${pwLine}\n${joinUrl}`
    navigator.clipboard.writeText(text).then(() => {
      setCopyMsg('コピーしました！')
      setTimeout(() => setCopyMsg(''), 2000)
    }).catch(() => setCopyMsg('コピー失敗'))
  }

  const activeCount = waitingPlayers.filter(p => p && p !== '(退出)').length

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(212,175,55,0.3)',
    borderRadius: 8, padding: '10px 12px',
    color: '#f0e8d0', fontSize: 14,
    fontFamily: 'var(--font-main)', outline: 'none',
    width: '100%', boxSizing: 'border-box',
  }

  const btnPrimary: React.CSSProperties = {
    background: 'linear-gradient(135deg, #d4af37, #a07c20)',
    border: 'none', borderRadius: 12, padding: '13px', width: '100%',
    color: '#0a0a0a', fontSize: 15, fontWeight: 900,
    cursor: 'pointer', fontFamily: 'var(--font-display)',
  }

  const btnSub: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 12, padding: '11px', width: '100%',
    color: 'rgba(240,232,208,0.7)', fontSize: 13,
    cursor: 'pointer', fontFamily: 'var(--font-main)',
  }

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(180deg, #0a0a1a 0%, #0a0005 100%)',
      padding: '24px 16px', overflowY: 'auto',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 900,
        color: '#88ff88', textAlign: 'center', marginBottom: 4,
        textShadow: '0 0 16px rgba(136,255,136,0.4)',
      }}>🔗 フレンド対戦</div>
      <div style={{ textAlign: 'center', fontSize: 11, color: 'rgba(240,232,208,0.45)', marginBottom: 20 }}>
        知り合い同士でルームを作って対戦
      </div>

      {errorMsg && (
        <div style={{
          background: 'rgba(255,50,50,0.15)', border: '1px solid rgba(255,50,50,0.4)',
          borderRadius: 8, padding: '8px 12px', color: '#ff8888',
          fontSize: 12, marginBottom: 12, textAlign: 'center',
        }}>{errorMsg}</div>
      )}
      {statusMsg && (
        <div style={{ color: 'rgba(240,232,208,0.5)', fontSize: 12, textAlign: 'center', marginBottom: 12 }}>
          {statusMsg}
        </div>
      )}

      {phase === 'lobby' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => setPhase('creating')} style={btnPrimary}>🏠 ルームを作成する</button>
          <button onClick={() => setPhase('joining')} style={btnSub}>🚪 ルームに参加する</button>
          <button onClick={onBack} style={{ ...btnSub, marginTop: 4 }}>← 戻る</button>
        </div>
      )}

      {phase === 'creating' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 13, color: 'rgba(240,232,208,0.7)', marginBottom: 4 }}>ルーム作成</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'rgba(240,232,208,0.8)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={hasPassword}
              onChange={e => setHasPassword(e.target.checked)}
              style={{ width: 16, height: 16 }}
            />
            🔒 鍵部屋にする（3桁パスワード自動生成）
          </label>
          <button onClick={createRoom} style={btnPrimary}>ルームを作成</button>
          <button onClick={() => setPhase('lobby')} style={btnSub}>← 戻る</button>
        </div>
      )}

      {phase === 'joining' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 13, color: 'rgba(240,232,208,0.7)', marginBottom: 4 }}>ルームに参加</div>
          <input
            style={inputStyle}
            placeholder="ルームID（4桁）"
            value={joinRoomId}
            onChange={e => setJoinRoomId(e.target.value.slice(0, 4))}
            inputMode="numeric"
            maxLength={4}
          />
          <input
            style={inputStyle}
            placeholder="パスワード（鍵部屋の場合）"
            value={joinPassword}
            onChange={e => setJoinPassword(e.target.value.slice(0, 3))}
            inputMode="numeric"
            maxLength={3}
          />
          <button onClick={joinRoom} style={btnPrimary}>参加する</button>
          <button onClick={() => setPhase('lobby')} style={btnSub}>← 戻る</button>
        </div>
      )}

      {phase === 'waiting' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(212,175,55,0.3)',
            borderRadius: 14, padding: '14px 16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ color: '#d4af37', fontWeight: 700, fontSize: 13 }}>ルームID</div>
              <div style={{ color: '#fff', fontWeight: 900, fontSize: 18, fontFamily: 'var(--font-display)' }}>{roomId}</div>
            </div>
            {password && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ color: '#d4af37', fontWeight: 700, fontSize: 13 }}>🔒 パスワード</div>
                <div style={{ color: '#ffdd88', fontWeight: 900, fontSize: 18 }}>{password}</div>
              </div>
            )}
          </div>

          <button
            onClick={copyInvite}
            style={{
              background: 'rgba(136,255,136,0.08)',
              border: '1px solid rgba(136,255,136,0.4)',
              borderRadius: 12, padding: '11px', width: '100%',
              color: '#88ff88', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'var(--font-main)',
            }}
          >
            {copyMsg || '📋 招待URLをコピー'}
          </button>

          <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ fontSize: 12, color: 'rgba(212,175,55,0.7)', marginBottom: 10, fontWeight: 700 }}>
              参加者 ({activeCount}/4)
            </div>
            {waitingPlayers.map((name, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '6px 0',
                borderBottom: i < waitingPlayers.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              }}>
                <SmallAvatar name={name || '?'} avatarDataUrl={waitingAvatars[i] ?? null} />
                <div style={{
                  fontSize: 13,
                  color: i === myPlayerIndex ? '#d4af37' : name === '(退出)' ? '#444' : 'rgba(240,232,208,0.8)',
                  fontWeight: i === myPlayerIndex ? 700 : 400,
                }}>
                  {name || '待機中...'} {i === myPlayerIndex ? '(あなた)' : ''}
                </div>
              </div>
            ))}
          </div>

          {myPlayerIndex === 0 && (
            <button
              onClick={startGame}
              disabled={activeCount < 2}
              style={{ ...btnPrimary, opacity: activeCount < 2 ? 0.5 : 1 }}
            >
              ゲームスタート！（{activeCount}人）
            </button>
          )}
          {myPlayerIndex !== 0 && (
            <div style={{ textAlign: 'center', fontSize: 13, color: 'rgba(240,232,208,0.5)' }}>
              ホストのスタート待ち...
            </div>
          )}

          <button onClick={onBack} style={btnSub}>← 退出</button>
        </div>
      )}
    </div>
  )
}
