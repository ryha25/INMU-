import React from 'react'
import { Card } from '../types/game'
import { getRankDisplay, getSuitSymbol, isRedSuit } from '../logic/cards'

interface CardProps {
  card: Card
  selected: boolean
  onClick: () => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  faceDown?: boolean
}

const SIZES = {
  sm: { width: 38, height: 54, fontSize: 13, suitSize: 11 },
  md: { width: 52, height: 74, fontSize: 17, suitSize: 14 },
  lg: { width: 64, height: 90, fontSize: 20, suitSize: 17 },
}

export default function CardComponent({ card, selected, onClick, disabled = false, size = 'md', faceDown = false }: CardProps) {
  const dim = SIZES[size]
  const red = isRedSuit(card.suit)
  const rank = getRankDisplay(card.rank)
  const suit = getSuitSymbol(card.suit)

  if (faceDown) {
    return (
      <div
        style={{
          width: dim.width,
          height: dim.height,
          borderRadius: 8,
          border: '2px solid #3a3a6a',
          background: 'linear-gradient(135deg, #1a1a3a 0%, #2a1a2a 50%, #1a1a3a 100%)',
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(212,175,55,0.08) 4px, rgba(212,175,55,0.08) 5px)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: dim.suitSize,
          color: '#d4af37',
          flexShrink: 0,
        }}
      >
        🂠
      </div>
    )
  }

  return (
    <div
      className={`card${red ? ' red' : ''}${selected ? ' selected' : ''}${disabled ? ' disabled' : ''}`}
      style={{
        width: dim.width,
        height: dim.height,
        fontSize: dim.fontSize,
        flexShrink: 0,
        background: selected
          ? 'linear-gradient(135deg, #fffde0 0%, #fff9c4 100%)'
          : 'linear-gradient(135deg, #f9f4e8 0%, #f0ead4 100%)',
      }}
      onClick={disabled ? undefined : onClick}
    >
      <div style={{ position: 'absolute', top: 3, left: 4, lineHeight: 1, fontSize: dim.fontSize - 2 }}>
        <div style={{ fontWeight: 900 }}>{rank}</div>
        <div style={{ fontSize: dim.suitSize }}>{suit}</div>
      </div>
      <div style={{ fontSize: dim.fontSize + 4, lineHeight: 1 }}>{suit}</div>
      <div style={{
        position: 'absolute', bottom: 3, right: 4, lineHeight: 1,
        fontSize: dim.fontSize - 2, transform: 'rotate(180deg)'
      }}>
        <div style={{ fontWeight: 900 }}>{rank}</div>
        <div style={{ fontSize: dim.suitSize }}>{suit}</div>
      </div>
    </div>
  )
}
