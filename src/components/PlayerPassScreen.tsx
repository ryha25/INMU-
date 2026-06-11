import React from 'react'
import { Player } from '../types/game'

interface Props {
  player: Player
  onReady: () => void
}

export default function PlayerPassScreen({ player, onReady }: Props) {
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(180deg, #0a0a1a 0%, #000a05 100%)',
      padding: 24,
      textAlign: 'center',
      gap: 20,
    }}>
      <div style={{
        background: 'rgba(0,0,0,0.6)',
        border: '1px solid rgba(212,175,55,0.3)',
        borderRadius: 16,
        padding: '32px 40px',
        maxWidth: 360,
        width: '100%',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔄</div>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 24,
          fontWeight: 900,
          color: '#d4af37',
          marginBottom: 8,
        }}>
          プレイヤー交代
        </div>
        <div style={{
          fontSize: 15,
          color: 'rgba(240,232,208,0.7)',
          marginBottom: 4,
        }}>
          次は
        </div>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 28,
          fontWeight: 900,
          color: '#f0e8d0',
          marginBottom: 4,
        }}>
          {player.name}
        </div>
        <div style={{
          fontSize: 13,
          color: 'rgba(240,232,208,0.5)',
          marginBottom: 28,
        }}>
          手札: {player.hand.length}枚
        </div>
        <div style={{
          fontSize: 12,
          color: 'rgba(255,200,100,0.6)',
          marginBottom: 20,
          padding: '8px 12px',
          background: 'rgba(212,175,55,0.08)',
          borderRadius: 8,
          border: '1px solid rgba(212,175,55,0.15)',
        }}>
          ⚠️ スマホを {player.name} に渡してから<br />「準備OK」を押してください
        </div>
        <button
          onClick={onReady}
          style={{
            background: 'linear-gradient(135deg, #d4af37 0%, #a07c20 100%)',
            color: '#000',
            border: 'none',
            borderRadius: 12,
            padding: '14px 36px',
            fontSize: 17,
            fontWeight: 900,
            fontFamily: 'var(--font-display)',
            cursor: 'pointer',
            boxShadow: '0 0 15px rgba(212,175,55,0.4)',
            letterSpacing: 1,
            width: '100%',
          }}
        >
          準備OK！
        </button>
      </div>
    </div>
  )
}
