import React, { useState } from 'react'
import { GameState, Card } from '../types/game'
import CardComponent from './CardComponent'
import { resolveTenDiscard } from '../logic/gameEngine'

interface Props {
  state: GameState
  onDone: (newState: GameState) => void
}

export default function TenDiscardScreen({ state, onDone }: Props) {
  const [selectedCards, setSelectedCards] = useState<Card[]>([])

  const player = state.players[state.currentPlayerIndex]
  const totalToDiscard = state.tenDiscardState?.totalToDiscard ?? 1

  function toggleCard(card: Card) {
    setSelectedCards(prev =>
      prev.some(c => c.id === card.id)
        ? prev.filter(c => c.id !== card.id)
        : prev.length < totalToDiscard
          ? [...prev, card]
          : prev
    )
  }

  function handleConfirm() {
    if (selectedCards.length === 0) return
    const newState = resolveTenDiscard(state, selectedCards)
    onDone(newState)
  }

  function handleSkip() {
    const newState = resolveTenDiscard(state, [])
    onDone(newState)
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(180deg, #1a0a0a 0%, #0a0000 100%)',
      padding: '16px 14px',
      gap: 14,
    }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        borderBottom: '1px solid rgba(200,100,100,0.2)',
        paddingBottom: 12,
      }}>
        <div style={{ fontSize: 36, marginBottom: 4 }}>🗑️</div>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          fontWeight: 900,
          color: '#ff6666',
          textShadow: '0 0 10px rgba(255,100,100,0.5)',
        }}>
          10捨て
        </div>
        <div style={{ fontSize: 13, color: 'rgba(240,232,208,0.6)', marginTop: 4 }}>
          {player.name} — 最大{totalToDiscard}枚を捨てられます
        </div>
      </div>

      {/* Card selection */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: 'rgba(255,100,100,0.6)', marginBottom: 8, letterSpacing: 1 }}>
          捨てるカードを選択 ({selectedCards.length} / {totalToDiscard})
        </div>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'flex', gap: 5, minWidth: 'fit-content', paddingBottom: 6 }}>
            {player.hand.map(card => (
              <CardComponent
                key={card.id}
                card={card}
                selected={selectedCards.some(c => c.id === card.id)}
                onClick={() => toggleCard(card)}
                size="md"
                disabled={!selectedCards.some(c => c.id === card.id) && selectedCards.length >= totalToDiscard}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Info */}
      <div style={{
        padding: '8px 12px',
        background: 'rgba(255,100,100,0.07)',
        border: '1px solid rgba(255,100,100,0.2)',
        borderRadius: 8,
        fontSize: 12,
        color: 'rgba(240,232,208,0.5)',
        textAlign: 'center',
      }}>
        ※ 捨てた枚数分、手札が減ります
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
          disabled={selectedCards.length === 0}
          style={{
            flex: 2,
            padding: '12px',
            background: selectedCards.length > 0
              ? 'linear-gradient(135deg, #cc3333, #881111)'
              : 'rgba(200,100,100,0.1)',
            border: `1px solid ${selectedCards.length > 0 ? '#cc3333' : 'rgba(200,100,100,0.2)'}`,
            borderRadius: 10,
            color: selectedCards.length > 0 ? '#fff' : '#444',
            fontSize: 15,
            fontWeight: 900,
            cursor: selectedCards.length > 0 ? 'pointer' : 'default',
            fontFamily: 'var(--font-display)',
          }}
        >
          {selectedCards.length > 0 ? `${selectedCards.length}枚捨てる！` : 'カードを選択'}
        </button>
      </div>
    </div>
  )
}
