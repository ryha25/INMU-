import React, { useEffect, useRef, useState } from 'react'
import { Card } from '../types/game'
import { useAudio } from '../contexts/AudioContext'

interface StolenInfo {
  card: Card | null
  playerName: string
}

interface Props {
  activatorName: string
  left: StolenInfo
  right: StolenInfo
  onDone: () => void
}

type Phase = 'video' | 'text' | 'steal' | 'fadeout'

function getRankDisplay(rank: Card['rank']): string {
  if (rank === 1) return 'A'
  if (rank === 11) return 'J'
  if (rank === 12) return 'Q'
  if (rank === 13) return 'K'
  if (rank === 'JOKER') return 'JOKER'
  return String(rank)
}

function getSuitSymbol(suit: Card['suit']): string {
  if (suit === 'spades') return '♠'
  if (suit === 'hearts') return '♥'
  if (suit === 'diamonds') return '♦'
  if (suit === 'clubs') return '♣'
  return ''
}

function getSuitColor(suit: Card['suit']): string {
  return suit === 'hearts' || suit === 'diamonds' ? '#ff4444' : '#ffffff'
}

export default function KuronuriEffect({ activatorName, left, right, onDone }: Props) {
  const [phase, setPhase] = useState<Phase>('video')
  const [opacity, setOpacity] = useState(1)
  const [stealStep, setStealStep] = useState(0) // 0=none, 1=left, 2=right, 3=both
  const videoRef = useRef<HTMLVideoElement>(null)
  const doneCalledRef = useRef(false)
  const { audioEnabled } = useAudio()

  const finish = () => {
    if (doneCalledRef.current) return
    doneCalledRef.current = true
    setPhase('fadeout')
    setOpacity(0)
    setTimeout(onDone, 600)
  }

  // Video phase: play video, then advance to text
  useEffect(() => {
    if (phase !== 'video') return
    const vid = videoRef.current
    if (!vid) return

    vid.muted = !audioEnabled
    vid.play().catch(() => {
      // fallback if video can't play
      setTimeout(() => setPhase('text'), 500)
    })

    const onEnded = () => setPhase('text')
    vid.addEventListener('ended', onEnded)

    // Safety timeout: 12s max for video
    const fallback = setTimeout(() => setPhase('text'), 12000)

    return () => {
      vid.removeEventListener('ended', onEnded)
      clearTimeout(fallback)
    }
  }, [phase, audioEnabled])

  // Text phase: show text for 1.4s then advance to steal
  useEffect(() => {
    if (phase !== 'text') return
    const t = setTimeout(() => setPhase('steal'), 1400)
    return () => clearTimeout(t)
  }, [phase])

  // Steal phase: animate step by step
  useEffect(() => {
    if (phase !== 'steal') return
    setStealStep(0)
    const t1 = setTimeout(() => setStealStep(1), 300)
    const t2 = setTimeout(() => setStealStep(2), 1000)
    const t3 = setTimeout(() => setStealStep(3), 1700)
    const t4 = setTimeout(() => finish(), 2600)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [phase])

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#000',
    opacity,
    transition: phase === 'fadeout' ? 'opacity 0.6s ease-out' : 'none',
  }

  const cardChip = (info: StolenInfo, side: 'left' | 'right', visible: boolean) => {
    if (!info.card) return null
    const suit = info.card.suit
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : (side === 'left' ? 'translateX(-60px) scale(0.5)' : 'translateX(60px) scale(0.5)'),
        transition: 'all 0.45s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        <div style={{
          fontSize: 13,
          color: 'rgba(255,200,100,0.9)',
          fontWeight: 700,
          letterSpacing: 1,
          textShadow: '0 0 8px rgba(255,180,0,0.6)',
        }}>{info.playerName}</div>
        <div style={{
          width: 60,
          height: 80,
          background: 'linear-gradient(135deg, #1a1a2e 0%, #0d0d1a 100%)',
          border: `2px solid ${getSuitColor(suit)}`,
          borderRadius: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 0 20px ${getSuitColor(suit)}88, 0 4px 12px #000`,
          position: 'relative',
        }}>
          <div style={{ fontSize: 22, color: getSuitColor(suit), fontWeight: 900, lineHeight: 1 }}>
            {getRankDisplay(info.card.rank)}
          </div>
          <div style={{ fontSize: 18, color: getSuitColor(suit) }}>
            {getSuitSymbol(suit)}
          </div>
        </div>
        <div style={{
          fontSize: 11,
          color: 'rgba(255,80,80,0.9)',
          fontWeight: 700,
          letterSpacing: 0.5,
        }}>奪取！</div>
      </div>
    )
  }

  return (
    <div style={overlayStyle}>
      {/* Video (shown during video phase) */}
      <video
        ref={videoRef}
        src="/audio/kuronuri.mov"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: phase === 'video' ? 'block' : 'none',
          pointerEvents: 'none',
        }}
        playsInline
        preload="auto"
      />

      {/* Post-video content (text + steal) */}
      {(phase === 'text' || phase === 'steal' || phase === 'fadeout') && (
        <div style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(ellipse at center, rgba(20,10,5,0.95) 0%, #000 70%)',
          gap: 24,
          padding: 24,
        }}>
          {/* Black car icon + title */}
          <div style={{
            textAlign: 'center',
            animation: 'fadeInScale 0.5s ease-out',
          }}>
            <div style={{ fontSize: 'clamp(40px, 12vw, 72px)', marginBottom: 8 }}>🚗</div>
            <div style={{
              fontSize: 'clamp(20px, 6vw, 36px)',
              fontWeight: 900,
              color: '#111',
              textShadow: '0 0 30px rgba(80,60,40,0.8), 2px 2px 0 #333, -2px -2px 0 #333',
              letterSpacing: 2,
              background: 'linear-gradient(180deg, #555 0%, #222 50%, #444 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 12px rgba(100,80,60,0.9))',
            }}>
              黒塗りの高級車
            </div>
          </div>

          {/* Description text */}
          <div style={{
            fontSize: 'clamp(15px, 4.5vw, 22px)',
            fontWeight: 700,
            color: 'rgba(220,200,180,0.95)',
            textShadow: '0 0 12px rgba(200,160,80,0.5), 2px 2px 4px #000',
            textAlign: 'center',
            animation: 'fadeInScale 0.6s ease-out 0.15s both',
            letterSpacing: 1,
            lineHeight: 1.5,
          }}>
            黒塗りの高級車に<br />追突してしまう
          </div>

          {/* Steal animation */}
          {(phase === 'steal' || phase === 'fadeout') && (
            <div style={{
              display: 'flex',
              gap: 32,
              alignItems: 'flex-start',
              justifyContent: 'center',
              animation: 'fadeInScale 0.4s ease-out',
            }}>
              {cardChip(left, 'left', stealStep >= 1)}
              {/* Center: activator */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                paddingTop: 20,
              }}>
                <div style={{
                  fontSize: 11,
                  color: 'rgba(255,200,100,0.9)',
                  fontWeight: 700,
                }}>発動者</div>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3a2a1a, #1a0f08)',
                  border: '2px solid rgba(200,150,50,0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  boxShadow: '0 0 16px rgba(200,150,50,0.4)',
                }}>🚗</div>
                <div style={{
                  fontSize: 12,
                  color: 'rgba(255,220,120,0.9)',
                  fontWeight: 700,
                  maxWidth: 70,
                  textAlign: 'center',
                  lineHeight: 1.2,
                }}>{activatorName}</div>
                {stealStep >= 3 && (
                  <div style={{
                    fontSize: 11,
                    color: '#ff4444',
                    fontWeight: 700,
                    animation: 'fadeInScale 0.3s ease-out',
                  }}>+{(left.card ? 1 : 0) + (right.card ? 1 : 0)}枚獲得</div>
                )}
              </div>
              {cardChip(right, 'right', stealStep >= 2)}
            </div>
          )}

          {/* Tap to skip hint */}
          <div
            onClick={finish}
            style={{
              position: 'absolute',
              bottom: 28,
              right: 24,
              fontSize: 12,
              color: 'rgba(255,255,255,0.35)',
              cursor: 'pointer',
              letterSpacing: 1,
            }}
          >
            TAP TO SKIP
          </div>
        </div>
      )}

      {/* Tap to skip during video */}
      {phase === 'video' && (
        <div
          onClick={() => setPhase('text')}
          style={{
            position: 'absolute',
            bottom: 28,
            right: 24,
            fontSize: 12,
            color: 'rgba(255,255,255,0.4)',
            cursor: 'pointer',
            zIndex: 10,
            letterSpacing: 1,
          }}
        >
          TAP TO SKIP
        </div>
      )}
    </div>
  )
}
