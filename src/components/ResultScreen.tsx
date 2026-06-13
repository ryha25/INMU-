import React, { useState } from 'react'
import { Player, PlayerRank } from '../types/game'

interface Props {
  players: Player[]
  onRestart: () => void
  onPlayAgain?: (prevRanks: (PlayerRank | null)[]) => void
  onAddFriend?: (name: string) => void
  myPlayerIndex?: number
}

const RANK_COLORS: Record<string, { bg: string; text: string; border: string; emoji: string }> = {
  '大富豪': { bg: 'linear-gradient(135deg, #d4af37 0%, #a07c20 100%)', text: '#000', border: '#d4af37', emoji: '👑' },
  '富豪':   { bg: 'linear-gradient(135deg, #888 0%, #555 100%)',        text: '#fff', border: '#aaa',    emoji: '🥈' },
  '貧民':   { bg: 'linear-gradient(135deg, #7c4e2a 0%, #4a2a10 100%)', text: '#ddd', border: '#a07050', emoji: '😓' },
  '大貧民': { bg: 'linear-gradient(135deg, #2a1a0a 0%, #1a0a00 100%)', text: '#888', border: '#4a3020', emoji: '💀' },
}

export default function ResultScreen({ players, onRestart, onPlayAgain, onAddFriend, myPlayerIndex = 0 }: Props) {
  const sorted = [...players].sort((a, b) => (a.finishOrder ?? 99) - (b.finishOrder ?? 99))
  const [addedNames, setAddedNames] = useState<Set<string>>(new Set())

  function handleAddFriend(name: string) {
    if (onAddFriend) {
      onAddFriend(name)
      setAddedNames(prev => new Set(prev).add(name))
    }
  }

  const prevRanks: (PlayerRank | null)[] = players.map(p => p.rank)

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(180deg, #0a0a1a 0%, #0a0005 100%)',
      padding: 20,
      overflow: 'auto',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(28px, 8vw, 48px)',
        fontWeight: 900,
        color: '#d4af37',
        textShadow: '0 0 20px rgba(212,175,55,0.8)',
        marginBottom: 8,
        animation: 'pulseGold 2s ease infinite',
      }}>
        ゲーム終了！
      </div>
      <div style={{ fontSize: 13, color: 'rgba(212,175,55,0.6)', marginBottom: 28, letterSpacing: 2 }}>
        ♠ 結果発表 ♠
      </div>

      <div style={{ width: '100%', maxWidth: 360, marginBottom: 24 }}>
        {sorted.map((player, idx) => {
          const rankInfo = RANK_COLORS[player.rank ?? '貧民']
          const isSelf = player.id === myPlayerIndex
          const isAdded = addedNames.has(player.name)
          return (
            <div
              key={player.id}
              style={{
                background: rankInfo.bg,
                border: `2px solid ${rankInfo.border}`,
                borderRadius: 12,
                padding: '14px 18px',
                marginBottom: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                animation: `slideUp 0.4s ease-out ${idx * 0.1}s both`,
                boxShadow: idx === 0 ? '0 0 20px rgba(212,175,55,0.5)' : 'none',
              }}
            >
              <div style={{ fontSize: 28, lineHeight: 1 }}>{rankInfo.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: rankInfo.text, fontWeight: 700, fontSize: 16 }}>
                  {player.name}
                  {isSelf && <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 6 }}>(あなた)</span>}
                </div>
                <div style={{ color: rankInfo.text, opacity: 0.8, fontSize: 13 }}>
                  {player.rank}
                </div>
              </div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 22, fontWeight: 900,
                color: rankInfo.text, opacity: 0.8,
              }}>
                #{player.finishOrder}
              </div>
              {onAddFriend && !isSelf && (
                <button
                  onClick={() => handleAddFriend(player.name)}
                  disabled={isAdded}
                  title="フレンドに追加"
                  style={{
                    width: 28, height: 28,
                    borderRadius: '50%',
                    border: isAdded ? '1.5px solid rgba(100,200,100,0.6)' : '1.5px solid rgba(255,255,255,0.4)',
                    background: isAdded ? 'rgba(50,150,50,0.3)' : 'rgba(0,0,0,0.35)',
                    color: isAdded ? '#88ee88' : rankInfo.text,
                    fontSize: 14,
                    cursor: isAdded ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >{isAdded ? '✓' : '+'}</button>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 360 }}>
        {onPlayAgain && (
          <button
            onClick={() => onPlayAgain(prevRanks)}
            style={{
              flex: 1,
              background: 'rgba(212,175,55,0.12)',
              color: '#d4af37',
              border: '1.5px solid rgba(212,175,55,0.4)',
              borderRadius: 12,
              padding: '13px 10px',
              fontSize: 14,
              fontWeight: 900,
              fontFamily: 'var(--font-display)',
              cursor: 'pointer',
              letterSpacing: 1,
            }}
          >
            🔄 再戦
          </button>
        )}
        <button
          onClick={onRestart}
          style={{
            flex: onPlayAgain ? 1 : undefined,
            width: onPlayAgain ? undefined : '100%',
            maxWidth: onPlayAgain ? undefined : 360,
            background: 'linear-gradient(135deg, #d4af37 0%, #a07c20 100%)',
            color: '#0a0a0a',
            border: 'none',
            borderRadius: 12,
            padding: '13px 24px',
            fontSize: 15,
            fontWeight: 900,
            fontFamily: 'var(--font-display)',
            cursor: 'pointer',
            boxShadow: '0 0 20px rgba(212,175,55,0.5)',
            letterSpacing: 2,
          }}
        >
          タイトルへ
        </button>
      </div>
    </div>
  )
}
