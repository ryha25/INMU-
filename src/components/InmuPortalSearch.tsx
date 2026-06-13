import React, { useState, useEffect, useRef } from 'react'

const PORTAL_BASE = 'https://inmu-portal-lx-1\u2013yasuhirot822.replit.app'

interface PortalUser {
  username: string
}

interface Props {
  onBack: () => void
}

export default function InmuPortalSearch({ onBack }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PortalUser[]>([])
  const [inviteList, setInviteList] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < 1) { setResults([]); setError(null); return }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${PORTAL_BASE}/api/search-users?q=${encodeURIComponent(query.trim())}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        const users: PortalUser[] = Array.isArray(data)
          ? data.map((u: any) => ({ username: typeof u === 'string' ? u : (u.username ?? '') })).filter(u => u.username)
          : []
        setResults(users)
      } catch {
        setError('検索できませんでした。接続を確認してください。')
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

  const showNoResults = !loading && !error && query.trim().length > 0 && results.length === 0

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(180deg, #0a0a1a 0%, #0a0005 100%)',
      padding: '20px 16px 20px',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexShrink: 0 }}>
        <button onClick={onBack} style={{
          background: 'none', border: '1px solid rgba(212,175,55,0.3)',
          borderRadius: 8, color: '#d4af37', padding: '5px 12px',
          cursor: 'pointer', fontSize: 13,
        }}>← 戻る</button>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 900,
          color: '#d4af37', textShadow: '0 0 10px rgba(212,175,55,0.4)',
        }}>INMU PORTAL ユーザー検索</div>
      </div>

      {/* Search */}
      <div style={{
        background: 'rgba(0,0,0,0.45)',
        border: '1px solid rgba(212,175,55,0.25)',
        borderRadius: 14, padding: '14px 16px',
        marginBottom: 12, flexShrink: 0,
      }}>
        <div style={{ color: '#d4af37', fontWeight: 700, fontSize: 12, marginBottom: 10 }}>🔍 ユーザー名で検索</div>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="ユーザー名を入力..."
          autoComplete="off"
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(212,175,55,0.3)',
            borderRadius: 10, padding: '10px 14px',
            color: '#f0e8d0', fontSize: 14,
            outline: 'none', fontFamily: 'var(--font-main)',
          }}
        />
        {loading && (
          <div style={{ fontSize: 11, color: 'rgba(212,175,55,0.5)', marginTop: 8, animation: 'pulse 1s infinite' }}>
            検索中...
          </div>
        )}
        {error && <div style={{ fontSize: 11, color: '#ff6666', marginTop: 8 }}>⚠️ {error}</div>}
        {showNoResults && (
          <div style={{ fontSize: 11, color: 'rgba(240,232,208,0.35)', marginTop: 8 }}>
            「{query}」のユーザーは見つかりませんでした
          </div>
        )}
      </div>

      {/* Search results */}
      {results.length > 0 && (
        <div style={{
          background: 'rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 14, padding: '12px 14px',
          marginBottom: 12, flexShrink: 0,
          maxHeight: '30vh', overflowY: 'auto',
        }}>
          <div style={{ color: 'rgba(212,175,55,0.7)', fontWeight: 700, fontSize: 11, marginBottom: 8 }}>
            検索結果 ({results.length}件)
          </div>
          {results.map(user => {
            const inList = inviteList.includes(user.username)
            return (
              <div key={user.username} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 4px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}>
                <span style={{ fontSize: 13, color: '#f0e8d0', fontWeight: 600 }}>
                  👤 {user.username}
                </span>
                <button
                  onClick={() => toggleInvite(user.username)}
                  style={{
                    background: inList ? 'rgba(212,175,55,0.18)' : 'rgba(255,255,255,0.07)',
                    border: `1px solid ${inList ? '#d4af37' : 'rgba(255,255,255,0.18)'}`,
                    borderRadius: 8, padding: '4px 12px',
                    color: inList ? '#d4af37' : 'rgba(240,232,208,0.55)',
                    fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >{inList ? '✓ 追加済み' : '+ 招待リストへ'}</button>
              </div>
            )
          })}
        </div>
      )}

      {/* Invite list */}
      {inviteList.length > 0 ? (
        <div style={{
          background: 'rgba(0,0,0,0.45)',
          border: '1px solid rgba(212,175,55,0.3)',
          borderRadius: 14, padding: '14px 16px',
          flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ color: '#d4af37', fontWeight: 700, fontSize: 12, marginBottom: 8, flexShrink: 0 }}>
            📋 招待リスト（{inviteList.length}人）
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {inviteList.map(username => (
              <div key={username} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 4px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}>
                <span style={{ fontSize: 13, color: '#d4af37', fontWeight: 700 }}>👤 {username}</span>
                <button
                  onClick={() => toggleInvite(username)}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,80,80,0.3)',
                    borderRadius: 6, padding: '3px 10px',
                    color: '#ff6666', fontSize: 11, cursor: 'pointer',
                  }}
                >✕ 削除</button>
              </div>
            ))}
          </div>
          <div style={{
            marginTop: 10, padding: '8px 12px',
            background: 'rgba(212,175,55,0.07)',
            border: '1px solid rgba(212,175,55,0.18)',
            borderRadius: 8, fontSize: 10,
            color: 'rgba(212,175,55,0.5)', textAlign: 'center', flexShrink: 0,
          }}>
            ※ 現在は招待リストの作成まで対応。招待通知は今後実装予定。
          </div>
        </div>
      ) : (
        !query.trim() && (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(240,232,208,0.22)', fontSize: 12, textAlign: 'center', padding: '0 24px',
            lineHeight: 1.8,
          }}>
            INMUポータルに登録しているユーザーを検索して<br />招待リストに追加できます
          </div>
        )
      )}
    </div>
  )
}
