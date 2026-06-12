import React, { useEffect, useState } from 'react'
import { SpecialEffect as SpecialEffectType } from '../types/game'
import { useAudio } from '../contexts/AudioContext'

interface Props {
  effect: SpecialEffectType
  onDone: () => void
}

const DURATIONS: Partial<Record<NonNullable<SpecialEffectType>, number>> = {
  IKISUGI: 2200,
  YARIMAS: 1800,
  IIYO: 3000,
  KAKUMEI: 1800,
  ELEVEN_BACK: 1500,
  EIGHT_CUT: 1200,
  YATSU: 1000,
  JUTEN: 1000,
  SHIBARI: 1200,
  '2431': 1500,
}

export default function SpecialEffect({ effect, onDone }: Props) {
  const [visible, setVisible] = useState(true)
  const { playEffectVoice } = useAudio()

  useEffect(() => {
    if (!effect) return
    setVisible(true)
    // Play voice for this effect
    playEffectVoice(effect)
    const dur = (effect && DURATIONS[effect]) ?? 1200
    const t = setTimeout(() => {
      setVisible(false)
      setTimeout(onDone, 300)
    }, dur)
    return () => clearTimeout(t)
  }, [effect])

  if (!effect || !visible) return null

  if (effect === 'IKISUGI') return (
    <div className="special-overlay" style={{
      background: 'radial-gradient(ellipse at center, rgba(255,80,0,0.5) 0%, rgba(0,0,0,0.85) 70%)',
      animation: 'ikisugiFlash 0.3s infinite',
    }}>
      <div style={{
        position: 'absolute', width: 500, height: 500, borderRadius: '50%',
        border: '4px solid rgba(255,150,0,0.5)',
        animation: 'spinGlow 2s linear forwards',
      }} />
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(48px, 14vw, 96px)', fontWeight: 900,
        color: '#ff4400',
        textShadow: '0 0 20px #ff8800, 0 0 60px #ff4400, 0 0 100px #ff0000, 4px 4px 0 #000',
        animation: 'fadeInScale 0.4s ease-out, glitch 0.8s ease-in-out 0.5s',
        textAlign: 'center', zIndex: 10,
      }}>イキスギィ!!</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 'clamp(22px, 6vw, 40px)',
        color: '#ffcc00', marginTop: 12,
        textShadow: '0 0 10px #ffcc00',
        animation: 'fadeInScale 0.5s ease-out 0.3s both', zIndex: 10,
      }}>⚡ 1919発動 ⚡</div>
      <div style={{
        position: 'absolute', bottom: '15%',
        fontFamily: 'var(--font-display)', fontSize: 'clamp(14px, 4vw, 22px)',
        color: 'rgba(255,200,100,0.9)', animation: 'pulse 0.5s infinite', zIndex: 10,
      }}>スピードアップ中！！</div>
    </div>
  )

  if (effect === 'YARIMAS') return (
    <div className="special-overlay" style={{
      background: 'radial-gradient(ellipse at center, rgba(0,80,200,0.5) 0%, rgba(0,0,0,0.85) 70%)',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(36px, 10vw, 72px)', fontWeight: 900,
        color: '#00ccff',
        textShadow: '0 0 20px #0088ff, 0 0 60px #00aaff, 4px 4px 0 #000',
        animation: 'fadeInScale 0.4s ease-out', textAlign: 'center', zIndex: 10,
      }}>やりますねぇ〜</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 'clamp(18px, 5vw, 32px)',
        color: '#88ddff', marginTop: 12, textShadow: '0 0 10px #00aaff',
        animation: 'fadeInScale 0.5s ease-out 0.3s both', zIndex: 10,
      }}>🎯 810切り発動 🎯</div>
    </div>
  )

  if (effect === 'IIYO') return (
    <div className="special-overlay" style={{
      background: 'radial-gradient(ellipse at center, rgba(180,0,255,0.5) 0%, rgba(0,0,0,0.9) 70%)',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(270deg, #ff0080, #8000ff, #0040ff, #00ff80, #ff0080)',
        backgroundSize: '400% 400%',
        animation: 'rainbowBg 1s ease infinite', opacity: 0.2,
      }} />
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(36px, 10vw, 80px)', fontWeight: 900,
        color: '#ffffff',
        textShadow: '0 0 20px #ff00ff, 0 0 60px #8800ff, 4px 4px 0 #000',
        animation: 'fadeInScale 0.4s ease-out, pulseGold 1s ease infinite 0.4s',
        textAlign: 'center', zIndex: 10,
      }}>いいよ！来いよ</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 'clamp(18px, 5vw, 36px)',
        color: '#ffaaff', marginTop: 12, textShadow: '0 0 10px #ff00ff',
        animation: 'fadeInScale 0.5s ease-out 0.3s both', zIndex: 10,
      }}>🔥 114514 即時勝利！ 🔥</div>
    </div>
  )

  if (effect === 'KAKUMEI') return (
    <div className="special-overlay" style={{
      background: 'radial-gradient(ellipse at center, rgba(255,0,128,0.4) 0%, rgba(0,0,0,0.85) 70%)',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(48px, 13vw, 90px)', fontWeight: 900,
        color: '#ff0088',
        textShadow: '0 0 20px #ff0088, 0 0 60px #ff0044, 4px 4px 0 #000',
        animation: 'fadeInScale 0.4s ease-out, glitch 0.6s ease-in-out 0.5s',
        textAlign: 'center', zIndex: 10,
      }}>💥 革命 💥</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 'clamp(16px, 4.5vw, 30px)',
        color: '#ffaacc', marginTop: 12, textShadow: '0 0 10px #ff0088',
        animation: 'fadeInScale 0.5s ease-out 0.3s both', zIndex: 10,
      }}>強弱反転！</div>
    </div>
  )

  if (effect === 'ELEVEN_BACK') return (
    <div className="special-overlay" style={{
      background: 'radial-gradient(ellipse at center, rgba(0,200,255,0.35) 0%, rgba(0,0,0,0.85) 70%)',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(36px, 10vw, 72px)', fontWeight: 900,
        color: '#00eeff',
        textShadow: '0 0 20px #00ccff, 0 0 60px #0088ff, 4px 4px 0 #000',
        animation: 'fadeInScale 0.4s ease-out',
        textAlign: 'center', zIndex: 10,
      }}>🔄 イレブン<br />バック</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 'clamp(14px, 4vw, 24px)',
        color: '#88eeff', marginTop: 12,
        animation: 'fadeInScale 0.5s ease-out 0.3s both', zIndex: 10,
      }}>一時的に強弱逆転！</div>
    </div>
  )

  if (effect === 'EIGHT_CUT') return (
    <div className="special-overlay" style={{
      background: 'radial-gradient(ellipse at center, rgba(200,50,50,0.4) 0%, rgba(0,0,0,0.85) 70%)',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(48px, 13vw, 90px)', fontWeight: 900,
        color: '#ff4444',
        textShadow: '0 0 20px #ff2222, 0 0 40px #cc0000, 4px 4px 0 #000',
        animation: 'fadeInScale 0.3s ease-out',
        textAlign: 'center', zIndex: 10,
      }}>✂️ 8切り</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 'clamp(14px, 4vw, 24px)',
        color: '#ffaaaa', marginTop: 12,
        animation: 'fadeInScale 0.4s ease-out 0.2s both', zIndex: 10,
      }}>場を流した！</div>
    </div>
  )

  if (effect === 'SHIBARI') return (
    <div className="special-overlay" style={{
      background: 'radial-gradient(ellipse at center, rgba(150,100,0,0.4) 0%, rgba(0,0,0,0.85) 70%)',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(40px, 11vw, 80px)', fontWeight: 900,
        color: '#ddaa00',
        textShadow: '0 0 20px #ddaa00, 0 0 40px #aa8800, 4px 4px 0 #000',
        animation: 'fadeInScale 0.3s ease-out',
        textAlign: 'center', zIndex: 10,
      }}>🔒 縛り！</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 'clamp(14px, 4vw, 24px)',
        color: '#ffdd88', marginTop: 12,
        animation: 'fadeInScale 0.4s ease-out 0.2s both', zIndex: 10,
      }}>スート縛り発動！</div>
    </div>
  )

  if (effect === '2431') return (
    <div className="special-overlay" style={{
      background: 'radial-gradient(ellipse at center, rgba(100,50,200,0.4) 0%, rgba(0,0,0,0.85) 70%)',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(40px, 11vw, 80px)', fontWeight: 900,
        color: '#aa88ff',
        textShadow: '0 0 20px #aa88ff, 0 0 40px #8866cc, 4px 4px 0 #000',
        animation: 'fadeInScale 0.3s ease-out',
        textAlign: 'center', zIndex: 10,
      }}>⚠️ 2431</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 'clamp(14px, 4vw, 24px)',
        color: '#ccaaff', marginTop: 12,
        animation: 'fadeInScale 0.4s ease-out 0.2s both', zIndex: 10, textAlign: 'center',
      }}>強制出し！<br />（手札に戻る）</div>
    </div>
  )

  return null
}
