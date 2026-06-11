import React, { useState } from 'react'
import { GameState, Card } from '../types/game'
import CardComponent from './CardComponent'
import { validatePlay, playCards, pass } from '../logic/gameEngine'
import { check1919, check810, check114514 } from '../logic/cards'

interface Props {
  state: GameState
  onPlay: (newState: GameState) => void
  onPass: (newState: GameState) => void
}

function detectCombo(cards: Card[]): string | null {
  if (check114514(cards)) return '114514「いいよ！来いよ」'
  if (check1919(cards)) return '1919「イキスギィ!!」'
  if (check810(cards)) return '810切り「やりますねぇ〜」'
  return null
}

export default function PlayerHandScreen({ state, onPlay, onPass }: Props) {
  const [selected, setSelected] = useState<Card[]>([])
  const player = state.players[state.currentPlayerIndex]
  const validation = validatePlay(state, selected)
  const combo = detectCombo(selected)

  function toggleCard(card: Card) {
    setSelected(prev =>
      prev.some(c => c.id === card.id)
        ? prev.filter(c => c.id !== card.id)
        : [...prev, card]
    )
  }

  function handlePlay() {
    if (!validation.valid) return
    const newState = playCards(state, selected)
    setSelected([])
    onPlay(newState)
  }

  function handlePass() {
    const newState = pass(state)
    setSelected([])
    onPass(newState)
  }

  const fieldLastPlay = state.field.length > 0 ? state.field[state.field.length - 1] : []
  const canPassNow = state.fieldCount > 0

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(180deg, #0a0a1a 0%, #080810 100%)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px 8px',
        borderBottom: '1px solid rgba(212,175,55,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 18,
          fontWeight: 900,
          color: '#d4af37',
          textShadow: '0 0 10px rgba(212,175,55,0.5)',
        }}>
          INMU大富豪
        </div>
        {state.speedBoost && (
          <div style={{
            background: 'linear-gradient(135deg, #ff4400, #ff8800)',
            color: '#fff',
            fontSize: 11,
            fontWeight: 900,
            padding: '3px 8px',
            borderRadius: 20,
            animation: 'pulse 0.5s infinite',
          }}>
            ⚡ SPEED UP
          </div>
        )}
        <div style={{
          fontSize: 12,
          color: 'rgba(240,232,208,0.6)',
        }}>
          Round {state.round}
        </div>
      </div>

      {/* Other players status */}
      <div style={{
        display: 'flex',
        gap: 6,
        padding: '8px 12px',
        flexShrink: 0,
        overflowX: 'auto',
      }}>
        {state.players.map((p, i) => {
          if (i === state.currentPlayerIndex) return null
          const isFinished = state.finishedPlayers.includes(i)
          const isPassed = state.passedPlayers.has(i)
          return (
            <div key={p.id} style={{
              background: isFinished
                ? 'rgba(212,175,55,0.15)'
                : 'rgba(255,255,255,0.05)',
              border: `1px solid ${isFinished ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 8,
              padding: '5px 10px',
              minWidth: 80,
              textAlign: 'center',
              flexShrink: 0,
            }}>
              <div style={{ fontSize: 11, color: 'rgba(240,232,208,0.7)', marginBottom: 2 }}>
                {p.name}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: isFinished ? '#d4af37' : '#f0e8d0' }}>
                {isFinished ? p.rank : `🃏 ${p.hand.length}枚`}
              </div>
              {isPassed && !isFinished && (
                <div style={{ fontSize: 10, color: '#888', marginTop: 1 }}>パス</div>
              )}
            </div>
          )
        })}
      </div>

      {/* Field area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px 12px',
        background: 'rgba(0,30,0,0.3)',
        border: '1px solid rgba(0,100,0,0.3)',
        margin: '0 12px',
        borderRadius: 12,
        minHeight: 100,
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        <div style={{
          fontSize: 10,
          color: 'rgba(212,175,55,0.5)',
          position: 'absolute',
          top: 6,
          left: 10,
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}>
          場
        </div>
        {state.fieldCount === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 14 }}>
            — 場は空です —
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
              {fieldLastPlay.map(card => (
                <CardComponent
                  key={card.id}
                  card={card}
                  selected={false}
                  onClick={() => {}}
                  disabled
                  size="md"
                />
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(240,232,208,0.5)' }}>
              {state.fieldCount}枚縛り
            </div>
          </div>
        )}
      </div>

      {/* Current player indicator */}
      <div style={{
        padding: '8px 14px 4px',
        textAlign: 'center',
        flexShrink: 0,
      }}>
        <div style={{
          fontSize: 13,
          fontWeight: 700,
          color: '#d4af37',
        }}>
          👤 {player.name} の番 — 手札 {player.hand.length}枚
        </div>
        {combo && (
          <div style={{
            fontSize: 12,
            color: '#ff6600',
            fontWeight: 700,
            marginTop: 4,
            animation: 'pulse 0.8s infinite',
          }}>
            ✨ {combo} が出せます！
          </div>
        )}
        {selected.length > 0 && !validation.valid && (
          <div style={{ fontSize: 11, color: '#ff6666', marginTop: 4 }}>
            ⚠️ {validation.reason}
          </div>
        )}
      </div>

      {/* Hand */}
      <div style={{
        padding: '8px 10px',
        flexShrink: 0,
        overflowX: 'auto',
        maxHeight: 130,
      }}>
        <div style={{
          display: 'flex',
          gap: 5,
          minWidth: 'fit-content',
          paddingBottom: 8,
          alignItems: 'flex-end',
        }}>
          {player.hand.map(card => (
            <CardComponent
              key={card.id}
              card={card}
              selected={selected.some(c => c.id === card.id)}
              onClick={() => toggleCard(card)}
              size="md"
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{
        padding: '8px 12px 12px',
        display: 'flex',
        gap: 10,
        flexShrink: 0,
      }}>
        <button
          onClick={handlePass}
          disabled={!canPassNow}
          style={{
            flex: 1,
            padding: '12px',
            background: canPassNow ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${canPassNow ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)'}`,
            borderRadius: 10,
            color: canPassNow ? '#f0e8d0' : '#555',
            fontSize: 15,
            fontWeight: 700,
            cursor: canPassNow ? 'pointer' : 'default',
            fontFamily: 'var(--font-main)',
          }}
        >
          パス
        </button>
        <button
          onClick={handlePlay}
          disabled={!validation.valid}
          style={{
            flex: 2,
            padding: '12px',
            background: validation.valid
              ? combo
                ? 'linear-gradient(135deg, #ff4400 0%, #cc0000 100%)'
                : 'linear-gradient(135deg, #d4af37 0%, #a07c20 100%)'
              : 'rgba(212,175,55,0.1)',
            border: `1px solid ${validation.valid ? (combo ? '#ff4400' : '#d4af37') : 'rgba(212,175,55,0.2)'}`,
            borderRadius: 10,
            color: validation.valid ? '#000' : '#555',
            fontSize: 15,
            fontWeight: 900,
            cursor: validation.valid ? 'pointer' : 'default',
            fontFamily: 'var(--font-display)',
            boxShadow: validation.valid ? (combo ? '0 0 15px rgba(255,68,0,0.5)' : '0 0 10px rgba(212,175,55,0.3)') : 'none',
          }}
        >
          {selected.length === 0 ? 'カードを選択' : `${selected.length}枚出す`}
        </button>
      </div>
    </div>
  )
}
