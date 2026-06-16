import React, { useState, useEffect, useRef } from 'react'
import { DEFAULT_RULES } from '../types/game'
import { initGame } from '../logic/gameEngine'

const PORTAL_BASE = 'https://inmu-portal-lx-1--yasuhirot822.replit.app'
console.log('[INMU PORTAL] PORTAL_BASE =', PORTAL_BASE)

interface PortalUser {
  username: string
}

interface Props {
  playerName: string
  playerAvatar?: string | null
  onGameStart: (ws: WebSocket, playerIndex: number, initialState: any, playerNames: string[], playerAvatars: (string | null)[]) => void
  onBack: () => void
}

type Phase = 'connecting' | 'search' | 'waiting'

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

export default function InmuPortalSearch({ playerName, playerAvatar = null, onGameStart, onBack }: Props) {
  const [phase, setPhase] = useState<Phase>('connecting')
  const [roomId, setRoomId] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PortalUser[]>([])
  const [inviteList, setInviteList] = useState<string[]>([])
  const [waitingPlayers, setWaitingPlayers] = useState<string[]>([playerName])
  const [waitingAvatars, setWaitingAvatars] = useState<(string | null)[]>([playerAvatar])
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [wsError, setWsError] = useState<string | null>(null)
  const [inviteStatus, setInviteStatus] = useState<Record<string, 'sending' | 'sent' | 'error'>>({})
  const [myPlayerIndex] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const myIndexRef = useRef(0)
  const waitingRef = useRef<string[]>([playerName])
  const waitingAvatarsRef = useRef<(string | null)[]>([playerAvatar])
  const roomIdRef = useRef('')

  useEffect(() => {
    connectWS()
    return () => { wsRef.current?.close() }
  }, [])

  function connectWS() {
    setWsError(null)
    setPhase('connecting')
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${proto}//${window.location.host}/ws`)
    wsRef.current = ws
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'create_room', playerName, hasPassword: false, avatarDataUrl: playerAvatar }))
    }
    ws.onerror = () => setWsError('サーバーに接続できませんでした')
    ws.onclose = () => {}
    ws.onmessage = (e) => {
      try { handleWsMessage(JSON.parse(e.data), ws) } catch (_) {}
    }
  }

  function handleWsMessage(msg: any, ws: WebSocket) {
    switch (msg.type) {
      case 'room_created':
        roomIdRef.current = msg.roomId
        setRoomId(msg.roomId)
        myIndexRef.current = 0
        setPhase('search')
        break
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
        const pNames = players.map((p: any) => p.name)
        const pAvatars = players.map((p: any) => p.avatarDataUrl ?? null)
        onGameStart(ws, myIndexRef.current, msg.initialState, pNames, pAvatars)
        break
      }
    }
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < 1) { setResults([]); setSearchError(null); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setSearchError(null)
      try {
        const searchUrl = `${PORTAL_BASE}/api/search-users?q=${encodeURIComponent(query.trim())}`
        console.log('[INMU PORTAL] GET', searchUrl)
        const res = await fetch(searchUrl)
        console.log('[INMU PORTAL] search-users response:', res.status, res.statusText)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        const users: PortalUser[] = Array.isArray(data)
          ? data.map((u: any) => ({ username: typeof u === 'string' ? u : (u.username ?? '') })).filter(u => u.username)
          : []
        setResults(users)
      } catch (e) {
        console.error('[INMU PORTAL] search-users error:', e)
        setSearchError('検索できませんでした。PORTALへの接続を確認してください。')
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  function toggleInvite(username: string) {
    setInviteList(prev =>
      prev.includes(username) ? prev.filter(u => u !== username) : [...prev, username]
    )
  }

  async function sendInvites() {
    if (inviteList.length === 0) return
    const rid = roomIdRef.current
    const newStatus: Record<string, 'sending' | 'sent' | 'error'> = {}
    inviteList.forEach(u => { newStatus[u] = 'sending' })
    setInviteStatus(newStatus)
    setPhase('waiting')

    await Promise.all(inviteList.map(async (username) => {
      try {
        const inviteUrl = `${PORTAL_BASE}/api/game-invite`
        const inviteBody = {
          senderUsername: playerName,
          receiverUsername: username,
          roomId: rid,
          gameTitle: 'INMU大富豪',
          message: `${playerName}さんから対戦招待が届いています。\nルームID：${rid}`,
        }
        console.log('[INMU PORTAL] POST', inviteUrl, inviteBody)
        const res = await fetch(inviteUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(inviteBody),
        })
        console.log('[INMU PORTAL] game-invite response:', res.status, res.statusText, '→', username)
        setInviteStatus(prev => ({ ...prev, [username]: res.ok ? 'sent' : 'error' }))
      } catch (e) {
        console.error('[INMU PORTAL] game-invite error:', e, '→', username)
        setInviteStatus(prev => ({ ...prev, [username]: 'error' }))
      }
    }))
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
  const showNoResults = !loading && !searchError && query.trim().length > 0 && results.length === 0

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
      padding: '20px 16px 20px', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexShrink: 0 }}>
        <button onClick={onBack} style={{
          background: 'none', border: '1px solid rgba(212,175,55,0.3)',
          borderRadius: 8, color: '#d4af37', padding: '5px 12px',
          cursor: 'pointer', fontSize: 13,
        }}>← 戻る</button>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 900,
          color: '#d4af37', textShadow: '0 0 10px rgba(212,175,55,0.4)',
        }}>🎮 INMU PORTAL 招待</div>
      </div>

      {/* Connecting */}
      {phase === 'connecting' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          {wsError ? (
            <>
              <div style={{ color: '#ff6666', fontSize: 13 }}>⚠️ {wsError}</div>
              <button onClick={connectWS} style={{ ...btnSub, width: 'auto', padding: '8px 20px' }}>再接続</button>
            </>
          ) : (
            <div style={{ color: 'rgba(212,175,55,0.6)', fontSize: 13 }}>ルーム作成中...</div>
          )}
        </div>
      )}

      {/* Search phase */}
      {phase === 'search' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Room ID */}
          <div style={{
            background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(212,175,55,0.3)',
            borderRadius: 12, padding: '10px 14px', marginBottom: 12,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
          }}>
            <span style={{ color: 'rgba(212,175,55,0.7)', fontSize: 12 }}>作成したルームID</span>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 20, fontFamily: 'var(--font-display)', letterSpacing: 2 }}>{roomId}</span>
          </div>

          {/* Search box */}
          <div style={{
            background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(212,175,55,0.25)',
            borderRadius: 14, padding: '14px 16px', marginBottom: 10, flexShrink: 0,
          }}>
            <div style={{ color: '#d4af37', fontWeight: 700, fontSize: 12, marginBottom: 10 }}>🔍 ポータルユーザーを検索</div>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="ユーザー名を入力..."
              autoComplete="off"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(212,175,55,0.3)',
                borderRadius: 10, padding: '10px 14px', color: '#f0e8d0', fontSize: 14,
                outline: 'none', fontFamily: 'var(--font-main)',
              }}
            />
            {loading && <div style={{ fontSize: 11, color: 'rgba(212,175,55,0.5)', marginTop: 8 }}>検索中...</div>}
            {searchError && <div style={{ fontSize: 11, color: '#ff6666', marginTop: 8 }}>⚠️ {searchError}</div>}
            {showNoResults && (
              <div style={{ fontSize: 11, color: 'rgba(240,232,208,0.35)', marginTop: 8 }}>
                「{query}」のユーザーは見つかりませんでした
              </div>
            )}
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div style={{
              background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 14, padding: '12px 14px', marginBottom: 10, flexShrink: 0,
              maxHeight: '28vh', overflowY: 'auto',
            }}>
              <div style={{ color: 'rgba(212,175,55,0.7)', fontWeight: 700, fontSize: 11, marginBottom: 8 }}>
                検索結果 ({results.length}件)
              </div>
              {results.map(user => {
                const inList = inviteList.includes(user.username)
                return (
                  <div key={user.username} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 4px', borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <span style={{ fontSize: 13, color: '#f0e8d0', fontWeight: 600 }}>👤 {user.username}</span>
                    <button
                      onClick={() => toggleInvite(user.username)}
                      style={{
                        background: inList ? 'rgba(212,175,55,0.18)' : 'rgba(255,255,255,0.07)',
                        border: `1px solid ${inList ? '#d4af37' : 'rgba(255,255,255,0.18)'}`,
                        borderRadius: 8, padding: '4px 12px',
                        color: inList ? '#d4af37' : 'rgba(240,232,208,0.55)',
                        fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                      }}
                    >{inList ? '✓ 追加済み' : '+ 招待リストへ'}</button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Invite list */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {inviteList.length > 0 && (
              <div style={{
                background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(212,175,55,0.3)',
                borderRadius: 14, padding: '14px 16px',
              }}>
                <div style={{ color: '#d4af37', fontWeight: 700, fontSize: 12, marginBottom: 8 }}>
                  📋 招待リスト（{inviteList.length}人）
                </div>
                {inviteList.map(username => (
                  <div key={username} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 4px', borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <span style={{ fontSize: 13, color: '#d4af37', fontWeight: 700 }}>👤 {username}</span>
                    <button
                      onClick={() => toggleInvite(username)}
                      style={{
                        background: 'transparent', border: '1px solid rgba(255,80,80,0.3)',
                        borderRadius: 6, padding: '3px 10px',
                        color: '#ff6666', fontSize: 11, cursor: 'pointer',
                      }}
                    >✕</button>
                  </div>
                ))}
              </div>
            )}

            {inviteList.length > 0 ? (
              <button onClick={sendInvites} style={btnPrimary}>
                🎮 招待を送信する（{inviteList.length}人）
              </button>
            ) : (
              !query.trim() && (
                <div style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'rgba(240,232,208,0.22)', fontSize: 12, textAlign: 'center',
                  padding: '0 24px', lineHeight: 1.8,
                }}>
                  INMUポータルユーザーを検索して<br />招待リストに追加してください
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Waiting phase */}
      {phase === 'waiting' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
          {/* Room ID */}
          <div style={{
            background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(212,175,55,0.3)',
            borderRadius: 14, padding: '14px 16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: '#d4af37', fontWeight: 700, fontSize: 13 }}>ルームID</div>
              <div style={{ color: '#fff', fontWeight: 900, fontSize: 22, fontFamily: 'var(--font-display)', letterSpacing: 2 }}>{roomId}</div>
            </div>
          </div>

          {/* Invite status */}
          {Object.keys(inviteStatus).length > 0 && (
            <div style={{
              background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 14, padding: '12px 14px',
            }}>
              <div style={{ color: 'rgba(212,175,55,0.7)', fontWeight: 700, fontSize: 11, marginBottom: 8 }}>
                📨 招待送信状況
              </div>
              {Object.entries(inviteStatus).map(([username, status]) => (
                <div key={username} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '6px 4px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 13,
                }}>
                  <span style={{ color: '#f0e8d0' }}>👤 {username}</span>
                  <span style={{
                    color: status === 'sent' ? '#88ff88' : status === 'error' ? '#ff6666' : '#d4af37',
                    fontSize: 11, fontWeight: 700,
                  }}>
                    {status === 'sending' ? '送信中...' : status === 'sent' ? '✓ 送信完了' : '✗ 送信失敗'}
                  </span>
                </div>
              ))}
              <div style={{
                marginTop: 10, fontSize: 10,
                color: 'rgba(212,175,55,0.5)', textAlign: 'center', lineHeight: 1.6,
              }}>
                🔔 INMU PORTALの通知欄に表示されます
              </div>
            </div>
          )}

          {/* Waiting players */}
          <div style={{
            background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12, padding: '12px 14px',
          }}>
            <div style={{ fontSize: 12, color: 'rgba(212,175,55,0.7)', marginBottom: 10, fontWeight: 700 }}>
              参加者 ({activeCount}/4)
            </div>
            {waitingPlayers.map((name, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0',
                borderBottom: i < waitingPlayers.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              }}>
                <SmallAvatar name={name || '?'} avatarDataUrl={waitingAvatars[i] ?? null} />
                <div style={{
                  fontSize: 13,
                  color: i === myPlayerIndex ? '#d4af37' : name === '(退出)' ? '#444' : 'rgba(240,232,208,0.8)',
                  fontWeight: i === myPlayerIndex ? 700 : 400,
                }}>
                  {name || '待機中...'}{i === myPlayerIndex ? ' (あなた)' : ''}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={startGame}
            style={btnPrimary}
          >
            ゲームスタート！（{activeCount}人）
          </button>
          <div style={{ fontSize: 10, color: 'rgba(240,232,208,0.3)', textAlign: 'center' }}>
            ※ 参加者が揃わない場合はCPUで補充されます
          </div>

          <button
            onClick={() => { setPhase('search'); setInviteStatus({}); setInviteList([]) }}
            style={btnSub}
          >← 追加招待する</button>
        </div>
      )}
    </div>
  )
}
