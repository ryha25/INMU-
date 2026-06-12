import React, { useState } from 'react'
import { GameState, Card } from '../types/game'
import CardComponent from './CardComponent'
import { resolveSevenPass } from '../logic/gameEngine'

interface Props {
  state: GameState
  onDone: (newState: GameState) => void
}

export default function SevenPassScreen({ state, onDone }: Props) {
  const [targetPlayer, setTargetPlayer] = useState<number>(-1)
  const [selectedCards, setSelectedCards] = useState<Card[]>([])

  const giver = state.players[state.currentPlayerIndex]
  const totalToGive = state.sevenPassState?.totalToGive ?? 1
  const otherPlayers = state.players.filter((_, i) => i !== state.currentPlayerIndex && !state.finishedPlayers.includes(i))

  function toggleCard(card: Card) {
    setSelectedCards(prev =>
      prev.some(c => c.id === card.id)
        ? prev.filter(c => c.id !== card.id)
        : prev.length < totalToGive
          ? [...prev, card]
          : prev
    )
  }

  function handleConfirm() {
    if (targetPlayer === -1 || selectedCards.length !== totalToGive) return
    const newState = resolveSevenPass(state, targetPlayer, selectedCards)
    onDone(newState)
  }

  function handleSkip() {
    // Skip giving (just advance)
    const newState = resolveSevenPass(state, state.currentPlayerIndex, [])
    onDone(newState)
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(180deg, #0a1a0a 0%, #000a00 100%)',
      padding: '16px 14px',
      gap: 14,
    }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        borderBottom: '1px solid rgba(100,200,100,0.2)',
        paddingBottom: 12,
      }}>
        <div style={{ fontSize: 36, marginBottom: 4 }}>🎁</div>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          fontWeight: 900,
          color: '#66ff66',
          textShadow: '0 0 10px rgba(100,255,100,0.5)',
        }}>
          7渡し
        </div>
        <div style={{ fontSize: 13, color: 'rgba(240,232,208,0.6)', marginTop: 4 }}>
          {giver.name} → {totalToGive}枚を誰かに渡してください
        </div>
      </div>

      {/* Target player selection */}
      <div>
        <div style={{ fontSize: 12, color: 'rgba(100,255,100,0.6)', marginBottom: 8, letterSpacing: 1 }}>
          渡す相手を選択
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {otherPlayers.map(p => (
            <div
              key={p.id}
              onClick={() => setTargetPlayer(p.id)}
              style={{
                flex: 1,
                padding: '10px 8px',
                background: targetPlayer === p.id ? 'rgba(100,255,100,0.15)' : 'rgba(255,255,255,0.05)',
                border: `2px solid ${targetPlayer === p.id ? '#66ff66' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 10,
                textAlign: 'center',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 12, color: '#f0e8d0', fontWeight: 700 }}>{p.name}</div>
              <div style={{ fontSize: 11, color: 'rgba(240,232,208,0.5)' }}>🃏 {p.hand.length}枚</div>
            </div>
          ))}
        </div>
      </div>

      {/* Card selection */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: 'rgba(100,255,100,0.6)', marginBottom: 8, letterSpacing: 1 }}>
          渡すカードを選択 ({selectedCards.length} / {totalToGive})
        </div>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'flex', gap: 5, minWidth: 'fit-content', paddingBottom: 6 }}>
            {giver.hand.map(card => (
              <CardComponent
                key={card.id}
                card={card}
                selected={selectedCards.some(c => c.id === card.id)}
                onClick={() => toggleCard(card)}
                size="md"
                disabled={!selectedCards.some(c => c.id === card.id) && selectedCards.length >= totalToGive}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={handleSkip}
          style={{
            flex: 1,
            padding: '12px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 10,
            color: '#888',
            fontSize: 14,
            cursor: 'pointer',
            fontFamily: 'var(--font-main)',
          }}
        >
          スキップ
        </button>
        <button
          onClick={handleConfirm}
          disabled={targetPlayer === -1 || selectedCards.length !== totalToGive}
          style={{
            flex: 2,
            padding: '12px',
            background: targetPlayer !== -1 && selectedCards.length === totalToGive
              ? 'linear-gradient(135deg, #33cc33, #117711)'
              : 'rgba(100,200,100,0.1)',
            border: `1px solid ${targetPlayer !== -1 && selectedCards.length === totalToGive ? '#33cc33' : 'rgba(100,200,100,0.2)'}`,
            borderRadius: 10,
            color: targetPlayer !== -1 && selectedCards.length === totalToGive ? '#000' : '#444',
            fontSize: 15,
            fontWeight: 900,
            cursor: targetPlayer !== -1 && selectedCards.length === totalToGive ? 'pointer' : 'default',
            fontFamily: 'var(--font-display)',
          }}
        >
          渡す！
        </button>
      </div>
    </div>
  )
}
