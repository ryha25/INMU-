import React, { useEffect, useRef, useState } from 'react'
import { Card } from '../types/game'
import { useAudio } from '../contexts/AudioContext'

interface VictimInfo {
  card: Card | null
  playerName: string
  idx: number
}

interface Props {
  activatorName: string
  victims: VictimInfo[]
  onDone: () => void
}

type Phase = 'video' | 'text' | 'steal' | 'fadeout'

function getRankDisplay(rank: Card['rank']): string {
  if (rank === 1) return 'A'
  if (rank === 11) return 'J'
  if (rank === 12) return 'Q'
  if (rank === 13) return 'K'
  if (rank === 'JOKER') return 'JK'
  return String(rank)
}

function getSuitSymbol(suit: Card['suit']): string {
  if (suit === 'spades') return '♠'
  if (suit === 'hearts') return '♥'
  if (suit === 'diamonds') return '♦'
  if (suit === 'clubs') return '♣'
  if (suit === 'joker') return '🃏'
  return ''
}

function getSuitColor(suit: Card['suit']): string {
  return suit === 'hearts' || suit === 'diamonds' ? '#ff4444' : '#ffffff'
}

export default function KuronuriEffect({ activatorName, victims, onDone }: Props) {
  const [phase, setPhase] = useState<Phase>('video')
  const [opacity, setOpacity] = useState(1)
  const [stealStep, setStealStep] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const doneCalledRef = useRef(false)
  const { audioEnabled } = useAudio()

  const totalStolen = victims.filter(v => v.card !== null).length

  const finish = () => {
    if (doneCalledRef.current) return
    doneCalledRef.current = true
    setPhase('fadeout')
    setOpacity(0)
    setTimeout(onDone, 600)
  }

  useEffect(() => {
    if (phase !== 'video') return
    const vid = videoRef.current
    if (!vid) return
    vid.muted = !audioEnabled
    vid.play().catch(() => setTimeout(() => setPhase('text'), 500))
    const onEnded = () => setPhase('text')
    vid.addEventListener('ended', onEnded)
    const fallback = setTimeout(() => setPhase('text'), 12000)
    return () => { vid.removeEventListener('ended', onEnded); clearTimeout(fallback) }
  }, [phase, audioEnabled])

  useEffect(() => {
    if (phase !== 'text') return
    const t = setTimeout(() => setPhase('steal'), 1400)
    return () => clearTimeout(t)
  }, [phase])

  useEffect(() => {
    if (phase !== 'steal') return
    setStealStep(0)
    const timers = victims.map((_, i) =>
      setTimeout(() => setStealStep(i + 1), 300 + i * 700)
    )
    const done = setTimeout(() => finish(), 300 + victims.length * 700 + 900)
    return () => { timers.forEach(clearTimeout); clearTimeout(done) }
  }, [phase])

  const cardChip = (victim: VictimInfo, visible: boolean, i: number) => {
    if (!victim.card) return null
    const suit = victim.card.suit
    const offsets = ['translateX(-80px)', 'translateY(-40px)', 'translateX(80px)']
    const offset = offsets[i] ?? 'scale(0.5)'
    return (
      <div key={victim.idx} style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translate(0,0) scale(1)' : `${offset} scale(0.5)`,
        transition: 'all 0.45s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        <div style={{
          fontSize: 12,
          color: 'rgba(255,200,100,0.9)',
          fontWeight: 700,
          letterSpacing: 1,
          textShadow: '0 0 8px rgba(255,180,0,0.6)',
          textAlign: 'center',
          maxWidth: 64,
          lineHeight: 1.2,
        }}>{victim.playerName}</div>
        <div style={{
          width: 56,
          height: 76,
          background: 'linear-gradient(135deg, #1a1a2e 0%, #0d0d1a 100%)',
          border: `2px solid ${getSuitColor(suit)}`,
          borderRadius: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 0 18px ${getSuitColor(suit)}88, 0 4px 12px #000`,
        }}>
          <div style={{ fontSize: 20, color: getSuitColor(suit), fontWeight: 900, lineHeight: 1 }}>
            {getRankDisplay(victim.card.rank)}
          </div>
          <div style={{ fontSize: 16, color: getSuitColor(suit) }}>
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
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#000', opacity,
      transition: phase === 'fadeout' ? 'opacity 0.6s ease-out' : 'none',
    }}>
      {/* Video */}
      <video
        ref={videoRef}
        src="/audio/kuronuri.mov"
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          display: phase === 'video' ? 'block' : 'none',
          pointerEvents: 'none',
        }}
        playsInline preload="auto"
      />

      {/* Post-video content */}
      {(phase === 'text' || phase === 'steal' || phase === 'fadeout') && (
        <div style={{
          position: 'relative', width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'radial-gradient(ellipse at center, rgba(20,10,5,0.95) 0%, #000 70%)',
          gap: 28, padding: 24,
        }}>
          {/* Title */}
          <div style={{ textAlign: 'center', animation: 'fadeInScale 0.5s ease-out' }}>
            <div style={{ fontSize: 'clamp(40px, 12vw, 72px)', marginBottom: 8 }}>🚗</div>
            <div style={{
              fontSize: 'clamp(20px, 6vw, 36px)', fontWeight: 900,
              letterSpacing: 3,
              background: 'linear-gradient(180deg, #fff 0%, #d4af37 40%, #f0e68c 70%, #b8860b 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 16px rgba(212,175,55,0.9)) drop-shadow(0 2px 4px #000)',
            }}>
              黒塗りの高級車
            </div>
          </div>

          {/* Steal animation: 3 victims in a row */}
          {(phase === 'steal' || phase === 'fadeout') && (
            <div style={{
              display: 'flex', gap: 16,
              alignItems: 'flex-start', justifyContent: 'center',
              animation: 'fadeInScale 0.4s ease-out',
              flexWrap: 'wrap',
            }}>
              {victims.map((v, i) => cardChip(v, stealStep > i, i))}

              {/* Center: activator */}
              <div style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 6,
                paddingTop: 20, order: -1,
                width: '100%', marginBottom: -8,
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3a2a1a, #1a0f08)',
                  border: '2px solid rgba(200,150,50,0.8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20,
                  boxShadow: '0 0 16px rgba(200,150,50,0.4)',
                }}>🚗</div>
                <div style={{
                  fontSize: 12, color: 'rgba(255,220,120,0.9)', fontWeight: 700,
                  textAlign: 'center',
                }}>{activatorName}</div>
                {stealStep >= victims.length && (
                  <div style={{
                    fontSize: 11, color: '#ff4444', fontWeight: 700,
                    animation: 'fadeInScale 0.3s ease-out',
                  }}>+{totalStolen}枚獲得</div>
                )}
              </div>
            </div>
          )}

          <div onClick={finish} style={{
            position: 'absolute', bottom: 28, right: 24,
            fontSize: 12, color: 'rgba(255,255,255,0.35)',
            cursor: 'pointer', letterSpacing: 1,
          }}>TAP TO SKIP</div>
        </div>
      )}

      {phase === 'video' && (
        <div onClick={() => setPhase('text')} style={{
          position: 'absolute', bottom: 28, right: 24,
          fontSize: 12, color: 'rgba(255,255,255,0.4)',
          cursor: 'pointer', zIndex: 10, letterSpacing: 1,
        }}>TAP TO SKIP</div>
      )}
    </div>
  )
}
