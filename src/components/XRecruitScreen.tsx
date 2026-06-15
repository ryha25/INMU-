import React, { useState, useEffect, useRef } from 'react'
import { RulesConfig, DEFAULT_RULES } from '../types/game'
import { initGame } from '../logic/gameEngine'

interface Props {
  playerName: string
  playerAvatar?: string | null
  onGameStart: (wsRef: WebSocket, playerIndex: number, initialState: any, playerNames: string[], playerAvatars: (string | null)[]) => void
  onBack: () => void
}

type Phase = 'idle' | 'waiting'

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

export default function XRecruitScreen({ playerName, playerAvatar = null, onGameStart, onBack }: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [roomId, setRoomId] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [statusMsg, setStatusMsg] = useState('接続中...')
  const [waitingPlayers, setWaitingPlayers] = useState<string[]>([playerName])
  const [waitingAvatars, setWaitingAvatars] = useState<(string | null)[]>([playerAvatar])
  const [myPlayerIndex, setMyPlayerIndex] = useState(0)
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
    wsRef.current.send(JSON.stringify({ type: 'create_room', playerName, hasPassword: false, avatarDataUrl: playerAvatar }))
  }

  function openXPost() {
    const appUrl = (import.meta as any).env?.VITE_APP_URL || window.location.origin
    const text = `INMU大富豪の対戦相手募集中！\n\nルームID：${roomId}\n\n#INMU大富豪\n#INMU`
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(appUrl)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  function startGame() {
    if (!wsRef.current || wsRef.current.readyState !== 1) return
    const names = waitingRef.current.filter(n => n && n !== '(退出)')
    const paddedNames = [...names]
    while (paddedNames.length < 4) paddedNames.push(`CPU ${paddedNames.length}`)
    const state = initGame(DEFAULT_RULES, paddedNames)
    wsRef.current.send(JSON.stringify({ type: 'start_game', initialState: state }))
  }

  const activeCount = waitingPlayers.filter(p => p && p !== '(退出)').length

  const btnPrimary: React.CSSProperties = {
    background: 'linear-gradient(135deg, #d4af37, #a07c20)',
    border: 'none', borderRadius: 12, padding: '13px', width: '100%',
    color: '#0a0a0a', fontSize: 15, fontWeight: 900, cursor: 'pointer',
    fontFamily: 'var(--font-display)',
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
        color: '#e8e8e8', textAlign: 'center', marginBottom: 4,
        textShadow: '0 0 16px rgba(220,220,220,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
        X募集対戦
      </div>
      <div style={{ textAlign: 'center', fontSize: 11, color: 'rgba(240,232,208,0.45)', marginBottom: 20 }}>
        ルームを作成してXで対戦者を募集
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

      {phase === 'idle' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{
            background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(220,220,220,0.12)',
            borderRadius: 14, padding: '16px', marginBottom: 4,
          }}>
            <div style={{ fontSize: 12, color: 'rgba(240,232,208,0.6)', lineHeight: 1.7 }}>
              📋 ルームIDが自動発行されます<br />
              🐦 X投稿でルームIDを告知<br />
              👥 参加者が揃ったらゲームスタート
            </div>
          </div>
          <button onClick={createRoom} style={btnPrimary}>🏠 X募集ルームを作成</button>
          <button onClick={onBack} style={btnSub}>← 戻る</button>
        </div>
      )}

      {phase === 'waiting' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(220,220,220,0.2)',
            borderRadius: 14, padding: '16px',
          }}>
            <div style={{ fontSize: 11, color: 'rgba(240,232,208,0.45)', marginBottom: 6, textAlign: 'center' }}>
              ルームID
            </div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 900,
              color: '#e8e8e8', textAlign: 'center', letterSpacing: 6,
              textShadow: '0 0 20px rgba(220,220,220,0.4)',
            }}>{roomId}</div>
          </div>

          <button
            onClick={openXPost}
            style={{
              background: 'linear-gradient(135deg, #1a1a1a, #333)',
              border: '1.5px solid rgba(220,220,220,0.5)',
              borderRadius: 12, padding: '13px', width: '100%',
              color: '#e8e8e8', fontSize: 14, fontWeight: 900,
              cursor: 'pointer', fontFamily: 'var(--font-display)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            Xで募集投稿する
          </button>

          <div style={{ fontSize: 10, color: 'rgba(240,232,208,0.3)', textAlign: 'center', marginTop: -6 }}>
            投稿にルームID「{roomId}」が自動入力されます
          </div>

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
