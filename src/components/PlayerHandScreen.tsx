import React, { useState, useEffect, useRef, useCallback } from 'react'
import { GameState, Card } from '../types/game'
import CardComponent from './CardComponent'
import { validatePlay, playCards, pass, getEffectivelyReversed } from '../logic/gameEngine'
import {
  check1919, check810, check114514, checkKakumei,
  checkEightCut, checkElevenBack, checkSevenPass, checkTenDiscard,
  checkShibari, checkSupe3, checkKaidan, check2431InHand, get2431Cards,
  getSuitSymbol,
} from '../logic/cards'
import StampPanel from './StampPanel'
import { useAudio } from '../contexts/AudioContext'

interface Props {
  state: GameState
  onPlay: (newState: GameState) => void
  onPass: (newState: GameState) => void
  gameMode?: 'local' | 'cpu' | 'online' | 'friend'
  myPlayerIndex?: number
  selectedStampIds?: string[]
  onSendStamp?: (stampId: string) => void
  incomingStamp?: { playerIndex: number; stampId: string; playerName: string } | null
  onBackToTitle?: () => void
}

function detectCombo(cards: Card[], state: GameState): string | null {
  if (check114514(cards)) return '114514「いいよ！来いよ」'
  if (check1919(cards)) return '1919「イキスギィ!!」'
  if (check810(cards)) return '810切り「やりますねぇ〜」'
  if (state.rules.kakumei && checkKakumei(cards)) return '革命！'
  if (state.rules.elevenBack && checkElevenBack(cards)) return 'イレブンバック！'
  if (state.rules.eightCut && checkEightCut(cards) && !check810(cards)) return '8切り！'
  if (state.rules.nanaWatashi && checkSevenPass(cards)) return '7渡し！'
  if (state.rules.junTen && checkTenDiscard(cards)) return '10捨て！'
  if (state.rules.supe3gaeshi && checkSupe3(cards) && state.fieldCount === 1 && (state.fieldValue === 15 || state.fieldValue === 16)) return 'スペ3返し！'
  if (state.rules.kaidan && checkKaidan(cards)) return '階段！'
  return null
}

const SUIT_LABEL: Record<string, string> = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' }

export default function PlayerHandScreen({
  state, onPlay, onPass,
  gameMode = 'local',
  myPlayerIndex = 0,
  selectedStampIds,
  onSendStamp,
  incomingStamp,
  onBackToTitle,
}: Props) {
  const [selected, setSelected] = useState<Card[]>([])
  const { playCardSound, playRuleSound } = useAudio()

  const isOnline = gameMode === 'online' || gameMode === 'friend'
  const isCPUMode = gameMode === 'cpu'
  const displayPlayerIndex = (isOnline || isCPUMode) ? myPlayerIndex : state.currentPlayerIndex
  const isMyTurn = (isOnline || isCPUMode) ? (state.currentPlayerIndex === myPlayerIndex) : true

  const player = state.players[displayPlayerIndex]
  const validation = validatePlay(state, selected)
  const combo = detectCombo(selected, state)
  const reversed = getEffectivelyReversed(state)

  const is2431Player = state.must2431.includes(state.currentPlayerIndex) && !state.secondRoundOrLater && isMyTurn
  const forced2431Cards = is2431Player ? get2431Cards(player.hand) : []

  const canPassNow = state.fieldCount > 0 && isMyTurn

  // Turn timer
  const getTimeLimit = useCallback(() => state.speedBoost ? 60 : 30, [state.speedBoost])
  const [timeLeft, setTimeLeft] = useState(getTimeLimit())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const passRef = useRef<() => void>(() => {})
  const canPassRef = useRef(canPassNow)
  canPassRef.current = canPassNow

  passRef.current = () => {
    if (canPassRef.current) {
      const newState = pass(state)
      setSelected([])
      onPass(newState)
    }
  }

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)

    if (!isMyTurn || state.phase !== 'play') {
      setTimeLeft(getTimeLimit())
      return
    }

    const limit = getTimeLimit()
    setTimeLeft(limit)

    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!)
          passRef.current()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [state.currentPlayerIndex, state.speedBoost, isMyTurn, state.phase])

  const timerRatio = timeLeft / getTimeLimit()
  const timerColor = timerRatio > 0.5 ? '#d4af37' : timerRatio > 0.25 ? '#ff8800' : '#ff2200'
  const timerUrgent = timeLeft <= 10

  function toggleCard(card: Card) {
    if (!isMyTurn) return
    if (is2431Player) {
      if (!forced2431Cards.some(c => c.id === card.id)) return
    }
    setSelected(prev =>
      prev.some(c => c.id === card.id)
        ? prev.filter(c => c.id !== card.id)
        : [...prev, card]
    )
  }

  function handlePlay() {
    if (!validation.valid || !isMyTurn) return
    const newState = playCards(state, selected)
    setSelected([])

    // カード出し効果音
    playCardSound()

    // ルール発動効果音（特殊エフェクトがある場合はSpecialEffectで鳴るのでスキップ）
    if (!newState.specialEffect) {
      if (state.rules.eightCut && checkEightCut(selected) && !check810(selected)) {
        playRuleSound('eight_cut')
      } else if (state.rules.kakumei && checkKakumei(selected)) {
        playRuleSound('kakumei')
      } else if (state.rules.elevenBack && checkElevenBack(selected)) {
        playRuleSound('eleven_back')
      } else if (checkShibari(selected)) {
        playRuleSound('shibari')
      } else if (state.rules.junTen && checkTenDiscard(selected)) {
        playRuleSound('juten')
      } else if (state.rules.nanaWatashi && checkSevenPass(selected)) {
        playRuleSound('sevenpass')
      } else if (state.rules.kaidan && checkKaidan(selected)) {
        playRuleSound('kaidan')
      }
    }

    onPlay(newState)
  }

  function handlePass() {
    if (!isMyTurn) return
    const newState = pass(state)
    setSelected([])
    onPass(newState)
  }

  const fieldLastPlay = state.field.length > 0 ? state.field[state.field.length - 1] : []

  const badges: { label: string; color: string; bg: string }[] = []
  if (state.revolutionActive && !state.elevenBackActive) {
    badges.push({ label: '💥革命中', color: '#ff0088', bg: 'rgba(255,0,136,0.15)' })
  }
  if (!state.revolutionActive && state.elevenBackActive) {
    badges.push({ label: '🔄11バック', color: '#00eeff', bg: 'rgba(0,238,255,0.12)' })
  }
  if (state.revolutionActive && state.elevenBackActive) {
    badges.push({ label: '💥🔄相殺', color: '#ffff00', bg: 'rgba(255,255,0,0.1)' })
  }
  if (state.shibariSuit) {
    badges.push({ label: `🔒${SUIT_LABEL[state.shibariSuit]}縛り`, color: '#ddaa00', bg: 'rgba(221,170,0,0.12)' })
  }
  if (state.stairsMode && state.fieldCount > 0) {
    badges.push({ label: '📶階段', color: '#88ff88', bg: 'rgba(136,255,136,0.1)' })
  }

  const currentActingName = isOnline ? state.players[state.currentPlayerIndex].name : player.name

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(180deg, #0a0a1a 0%, #080810 100%)',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Header */}
      <div style={{
        padding: '8px 12px 6px',
        borderBottom: '1px solid rgba(212,175,55,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        gap: 6,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {onBackToTitle && (
            <button
              onClick={onBackToTitle}
              title="タイトルに戻る"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 7,
                padding: '4px 7px',
                color: 'rgba(240,232,208,0.6)',
                fontSize: 13,
                cursor: 'pointer',
                lineHeight: 1,
                display: 'flex', alignItems: 'center',
              }}
            >🏠</button>
          )}
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 16, fontWeight: 900,
            color: '#d4af37',
            textShadow: '0 0 10px rgba(212,175,55,0.5)',
          }}>
            {gameMode === 'cpu' ? 'CPU対戦' : 'INMU大富豪'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'center' }}>
          {state.speedBoost && (
            <span style={{
              background: 'linear-gradient(135deg, #ff4400, #ff8800)',
              color: '#fff', fontSize: 10, fontWeight: 900,
              padding: '2px 6px', borderRadius: 10, animation: 'pulse 0.5s infinite',
            }}>⚡SPEED</span>
          )}
          {badges.map(b => (
            <span key={b.label} style={{
              background: b.bg, color: b.color,
              fontSize: 10, fontWeight: 700,
              padding: '2px 6px', borderRadius: 10,
              border: `1px solid ${b.color}44`,
            }}>{b.label}</span>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(240,232,208,0.5)', flexShrink: 0 }}>
          Round {state.round}
        </div>
      </div>

      {/* Turn timer bar */}
      {isMyTurn && state.phase === 'play' && (
        <div style={{ flexShrink: 0, padding: '4px 12px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${timerRatio * 100}%`,
                background: timerColor,
                borderRadius: 2,
                transition: 'width 1s linear, background 0.3s',
                boxShadow: timerUrgent ? `0 0 6px ${timerColor}` : 'none',
              }} />
            </div>
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: timerColor,
              minWidth: 26,
              textAlign: 'right',
              animation: timerUrgent ? 'pulse 0.5s infinite' : 'none',
            }}>{timeLeft}s</span>
          </div>
        </div>
      )}

      {/* Other players */}
      <div style={{
        display: 'flex',
        gap: 5,
        padding: '6px 10px',
        flexShrink: 0,
        overflowX: 'auto',
      }}>
        {state.players.map((p, i) => {
          if (i === myPlayerIndex) return null
          const isFinished = state.finishedPlayers.includes(i)
          const isPassed = state.passedPlayers.has(i)
          const hasMust2431 = state.must2431.includes(i) && !state.secondRoundOrLater
          const isActing = i === state.currentPlayerIndex
          return (
            <div key={p.id} style={{
              background: isActing
                ? 'rgba(212,175,55,0.2)'
                : isFinished ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${isActing ? 'rgba(212,175,55,0.7)' : isFinished ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 8,
              padding: '4px 9px',
              minWidth: 75,
              textAlign: 'center',
              flexShrink: 0,
              animation: isActing ? 'pulse 1s infinite' : 'none',
            }}>
              <div style={{ fontSize: 10, color: 'rgba(240,232,208,0.7)', marginBottom: 1 }}>
                {p.name}{gameMode === 'cpu' && i > 0 ? ' 🤖' : ''}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: isFinished ? '#d4af37' : '#f0e8d0' }}>
                {isFinished ? p.rank : `🃏 ${p.hand.length}枚`}
              </div>
              {isPassed && !isFinished && <div style={{ fontSize: 9, color: '#888' }}>パス</div>}
              {hasMust2431 && !isFinished && <div style={{ fontSize: 9, color: '#ff9944' }}>⚠️2431</div>}
              {isActing && <div style={{ fontSize: 9, color: '#d4af37', fontWeight: 700 }}>▶ 番</div>}
            </div>
          )
        })}
      </div>

      {/* Online: waiting message */}
      {isOnline && !isMyTurn && (
        <div style={{
          textAlign: 'center',
          padding: '4px 12px',
          fontSize: 12,
          color: '#d4af37',
          animation: 'pulse 1.2s infinite',
          flexShrink: 0,
        }}>
          ⏳ {currentActingName} の番です...
        </div>
      )}

      {/* Field */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6px 12px',
        background: 'rgba(0,25,0,0.35)',
        border: '1px solid rgba(0,80,0,0.35)',
        margin: '0 10px',
        borderRadius: 10,
        minHeight: 88,
        position: 'relative',
        flexShrink: 0,
      }}>
        <div style={{
          fontSize: 9, color: 'rgba(212,175,55,0.5)',
          position: 'absolute', top: 5, left: 9,
          letterSpacing: 1, textTransform: 'uppercase',
        }}>場</div>
        {state.shibariSuit && (
          <div style={{ position: 'absolute', top: 5, right: 9, fontSize: 9, color: '#ddaa00' }}>
            🔒{SUIT_LABEL[state.shibariSuit]}縛り
          </div>
        )}
        {state.stairsMode && state.fieldCount > 0 && (
          <div style={{
            position: 'absolute', top: 5, right: state.shibariSuit ? 60 : 9,
            fontSize: 9, color: '#88ff88',
          }}>📶階段</div>
        )}
        {reversed && state.fieldCount > 0 && (
          <div style={{ position: 'absolute', bottom: 5, right: 9, fontSize: 9, color: '#ff8888' }}>逆順</div>
        )}
        {state.fieldCount === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.18)', fontSize: 13 }}>— 場は空です —</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'center' }}>
              {fieldLastPlay.map(card => (
                <CardComponent key={card.id} card={card} selected={false} onClick={() => {}} disabled size="sm" />
              ))}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(240,232,208,0.4)' }}>
              {state.fieldCount}枚縛り
            </div>
          </div>
        )}
      </div>

      {/* Current player info */}
      <div style={{ padding: '6px 12px 2px', textAlign: 'center', flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#d4af37' }}>
          {isOnline
            ? `👤 ${player.name}（あなた）— 手札 ${player.hand.length}枚`
            : isMyTurn
              ? `👤 ${player.name} の番 — 手札 ${player.hand.length}枚`
              : `👤 ${player.name} の手札 — ${player.hand.length}枚`
          }
        </div>
        {isCPUMode && !isMyTurn && (
          <div style={{ fontSize: 11, color: 'rgba(212,175,55,0.7)', marginTop: 2, animation: 'pulse 1.2s infinite' }}>
            ⏳ {state.players[state.currentPlayerIndex].name} の番...
          </div>
        )}
        {is2431Player && (
          <div style={{
            fontSize: 12, color: '#ff9944', fontWeight: 700, marginTop: 3,
            padding: '3px 8px', background: 'rgba(255,100,0,0.1)',
            border: '1px solid rgba(255,100,0,0.3)', borderRadius: 6,
            animation: 'pulse 0.8s infinite',
          }}>
            ⚠️ えっと、24歳を初手で出してください！（手札に戻ります）
          </div>
        )}
        {combo && !is2431Player && isMyTurn && (
          <div style={{
            fontSize: 12, color: '#ff6600', fontWeight: 700, marginTop: 3,
            animation: 'pulse 0.8s infinite',
          }}>
            ✨ {combo} が出せます！
          </div>
        )}
        {selected.length > 0 && !validation.valid && isMyTurn && (
          <div style={{ fontSize: 11, color: '#ff6666', marginTop: 3 }}>
            ⚠️ {validation.reason}
          </div>
        )}
      </div>

      {/* Hand */}
      <div style={{ padding: '6px 8px 4px', flexShrink: 0, overflowX: 'auto', maxHeight: 120 }}>
        <div style={{
          display: 'flex',
          gap: 4,
          minWidth: 'fit-content',
          paddingBottom: 6,
          alignItems: 'flex-end',
        }}>
          {player.hand.map(card => {
            const isForced = forced2431Cards.some(c => c.id === card.id)
            const isOtherWhenForced = is2431Player && !isForced
            return (
              <div key={card.id} style={{ position: 'relative' }}>
                <CardComponent
                  card={card}
                  selected={selected.some(c => c.id === card.id)}
                  onClick={() => toggleCard(card)}
                  size="md"
                  disabled={isOtherWhenForced || !isMyTurn}
                />
                {isForced && (
                  <div style={{
                    position: 'absolute', top: -8, left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: 9, color: '#ff9944', fontWeight: 900,
                    whiteSpace: 'nowrap',
                    background: 'rgba(0,0,0,0.8)',
                    padding: '1px 3px', borderRadius: 3,
                    border: '1px solid rgba(255,100,0,0.5)',
                  }}>必須</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: '6px 10px 10px', display: 'flex', gap: 8, flexShrink: 0, position: 'relative' }}>
        <button
          onClick={handlePass}
          disabled={!canPassNow}
          style={{
            flex: 1,
            padding: '11px',
            background: canPassNow ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${canPassNow ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)'}`,
            borderRadius: 10,
            color: canPassNow ? '#f0e8d0' : '#555',
            fontSize: 14, fontWeight: 700,
            cursor: canPassNow ? 'pointer' : 'default',
            fontFamily: 'var(--font-main)',
          }}
        >
          パス
        </button>
        <button
          onClick={handlePlay}
          disabled={!validation.valid || !isMyTurn}
          style={{
            flex: 2,
            padding: '11px',
            background: validation.valid && isMyTurn
              ? combo
                ? 'linear-gradient(135deg, #ff4400 0%, #cc0000 100%)'
                : 'linear-gradient(135deg, #d4af37 0%, #a07c20 100%)'
              : 'rgba(212,175,55,0.1)',
            border: `1px solid ${validation.valid && isMyTurn ? (combo ? '#ff4400' : '#d4af37') : 'rgba(212,175,55,0.2)'}`,
            borderRadius: 10,
            color: validation.valid && isMyTurn ? '#000' : '#555',
            fontSize: 14, fontWeight: 900,
            cursor: validation.valid && isMyTurn ? 'pointer' : 'default',
            fontFamily: 'var(--font-display)',
            boxShadow: validation.valid && isMyTurn
              ? combo ? '0 0 14px rgba(255,68,0,0.5)' : '0 0 10px rgba(212,175,55,0.3)'
              : 'none',
          }}
        >
          {selected.length === 0 ? 'カードを選択' : `${selected.length}枚出す`}
        </button>

        <StampPanel
          playerName={player.name}
          playerIndex={displayPlayerIndex}
          selectedStampIds={selectedStampIds}
          onSendStamp={onSendStamp}
          incomingStamp={incomingStamp}
        />
      </div>
    </div>
  )
}
