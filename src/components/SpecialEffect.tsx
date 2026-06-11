import React, { useEffect, useState } from 'react'
import { SpecialEffect as SpecialEffectType } from '../types/game'

interface Props {
  effect: SpecialEffectType
  onDone: () => void
}

export default function SpecialEffect({ effect, onDone }: Props) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (!effect) return
    setVisible(true)
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onDone, 300)
    }, effect === 'IKISUGI' ? 2200 : effect === 'IIYO' ? 3000 : 1800)
    return () => clearTimeout(timer)
  }, [effect])

  if (!effect || !visible) return null

  if (effect === 'IKISUGI') {
    return (
      <div
        className="special-overlay"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(255,80,0,0.5) 0%, rgba(0,0,0,0.85) 70%)',
          animation: 'ikisugiFlash 0.3s infinite',
        }}
      >
        {/* Particle rings */}
        <div style={{
          position: 'absolute',
          width: 500,
          height: 500,
          borderRadius: '50%',
          border: '4px solid rgba(255,150,0,0.5)',
          animation: 'spinGlow 2s linear forwards',
        }} />
        <div style={{
          position: 'absolute',
          width: 350,
          height: 350,
          borderRadius: '50%',
          border: '3px solid rgba(255,80,0,0.6)',
          animation: 'spinGlow 1.5s linear reverse forwards',
        }} />
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(48px, 14vw, 96px)',
          fontWeight: 900,
          color: '#ff4400',
          textShadow: '0 0 20px #ff8800, 0 0 60px #ff4400, 0 0 100px #ff0000, 4px 4px 0 #000',
          animation: 'fadeInScale 0.4s ease-out, glitch 0.8s ease-in-out 0.5s',
          textAlign: 'center',
          letterSpacing: '-2px',
          lineHeight: 1,
          zIndex: 10,
        }}>
          イキスギィ!!
        </div>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(22px, 6vw, 40px)',
          color: '#ffcc00',
          marginTop: 12,
          textShadow: '0 0 10px #ffcc00',
          animation: 'fadeInScale 0.5s ease-out 0.3s both',
          zIndex: 10,
        }}>
          ⚡ 1919発動 ⚡
        </div>
        <div style={{
          position: 'absolute',
          bottom: '15%',
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(14px, 4vw, 22px)',
          color: 'rgba(255,200,100,0.9)',
          animation: 'pulse 0.5s infinite',
          zIndex: 10,
        }}>
          スピードアップ中！！
        </div>
      </div>
    )
  }

  if (effect === 'YARIMAS') {
    return (
      <div
        className="special-overlay"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0,80,200,0.5) 0%, rgba(0,0,0,0.85) 70%)',
        }}
      >
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(36px, 10vw, 72px)',
          fontWeight: 900,
          color: '#00ccff',
          textShadow: '0 0 20px #0088ff, 0 0 60px #00aaff, 4px 4px 0 #000',
          animation: 'fadeInScale 0.4s ease-out',
          textAlign: 'center',
          zIndex: 10,
          lineHeight: 1.2,
        }}>
          やりますねぇ〜
        </div>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(18px, 5vw, 32px)',
          color: '#88ddff',
          marginTop: 12,
          textShadow: '0 0 10px #00aaff',
          animation: 'fadeInScale 0.5s ease-out 0.3s both',
          zIndex: 10,
        }}>
          🎯 810切り発動 🎯
        </div>
      </div>
    )
  }

  if (effect === 'IIYO') {
    return (
      <div
        className="special-overlay"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(180,0,255,0.5) 0%, rgba(0,0,0,0.9) 70%)',
        }}
      >
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(270deg, #ff0080, #8000ff, #0040ff, #00ff80, #ff0080)',
          backgroundSize: '400% 400%',
          animation: 'rainbowBg 1s ease infinite',
          opacity: 0.2,
        }} />
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(36px, 10vw, 80px)',
          fontWeight: 900,
          color: '#ffffff',
          textShadow: '0 0 20px #ff00ff, 0 0 60px #8800ff, 4px 4px 0 #000',
          animation: 'fadeInScale 0.4s ease-out, pulseGold 1s ease infinite 0.4s',
          textAlign: 'center',
          zIndex: 10,
          lineHeight: 1.2,
        }}>
          いいよ！来いよ
        </div>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(18px, 5vw, 36px)',
          color: '#ffaaff',
          marginTop: 12,
          textShadow: '0 0 10px #ff00ff',
          animation: 'fadeInScale 0.5s ease-out 0.3s both',
          zIndex: 10,
        }}>
          🔥 114514 即時勝利！ 🔥
        </div>
      </div>
    )
  }

  return null
}
