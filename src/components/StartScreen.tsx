import React from 'react'
import { useAudio } from '../contexts/AudioContext'

interface Props {
  onStart: () => void
  onRules: () => void
  onSettings: () => void
  onPortalSearch: () => void
}

function openXShare() {
  const appUrl = (import.meta as any).env?.VITE_APP_URL || window.location.href
  const text = `INMU大富豪の対戦相手募集中！\n\n#INMU大富豪\n#INMU`
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(appUrl)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

const FLOAT_SUITS = [
  { symbol: '♠', top: '12%',  left: '8%',  size: 32, delay: '0s',    dur: '3.2s' },
  { symbol: '♦', top: '30%',  right: '6%', size: 28, delay: '0.8s',  dur: '3.8s' },
  { symbol: '♥', top: '62%',  left: '5%',  size: 26, delay: '0.4s',  dur: '3.5s' },
  { symbol: '♣', top: '58%',  right: '7%', size: 30, delay: '1.2s',  dur: '4.0s' },
]

export default function StartScreen({ onStart, onRules, onSettings, onPortalSearch }: Props) {
  const { audioEnabled, enableAudio, playBGM } = useAudio()

  function handleAudioOn() {
    enableAudio()
    setTimeout(() => playBGM('title'), 100)
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      background: 'linear-gradient(180deg, #0a0a1a 0%, #0a0005 45%, #1a0a00 100%)',
      overflowY: 'auto',
      overflowX: 'hidden',
      position: 'relative',
    }}>
      {/* Diagonal pattern bg */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 30px, rgba(212,175,55,0.025) 30px, rgba(212,175,55,0.025) 31px)`,
      }} />

      {/* Radial glow behind character */}
      <div style={{
        position: 'absolute', top: '14%', left: '50%', transform: 'translateX(-50%)',
        width: 320, height: 320, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(212,175,55,0.13) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: 400,
        padding: '28px 20px 16px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>

        {/* ── Title ── */}
        <div style={{
          fontSize: 28, letterSpacing: 10,
          color: 'rgba(212,175,55,0.75)',
          animation: 'pulseGold 3s ease infinite',
          marginBottom: 2,
        }}>♠ ♥ ♦ ♣</div>

        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(42px, 13vw, 72px)', fontWeight: 900,
          color: '#d4af37',
          textShadow: '0 0 30px rgba(212,175,55,0.9), 0 0 70px rgba(212,175,55,0.4)',
          lineHeight: 1, marginBottom: 4,
          animation: 'pulseGold 3s ease infinite',
        }}>INMU</div>

        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(30px, 9vw, 54px)', fontWeight: 900,
          color: '#f0e8d0',
          textShadow: '2px 2px 10px rgba(0,0,0,0.9)',
          marginBottom: 4,
        }}>大富豪</div>

        <div style={{
          fontSize: 12, color: 'rgba(212,175,55,0.65)',
          letterSpacing: 2, marginBottom: 0,
        }}>CPU対戦 / フレンド対戦</div>

        {/* ── Character image with floating suits ── */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: 230,
          flexShrink: 0,
          /*
           * Crop the reference screenshot to show only the slow-loris character area.
           * Image is ~699×1241px. Character is centered at ~50% x, ~32% y.
           * background-size: 100% auto → scaled height ≈ 639px at 360px width
           * background-position-y: -110px → visible band is 110–340px of the bg (character centre at ~224px = 114px in view ≈ container centre ✓)
           */
          backgroundImage: 'url(/inmu-character.png)',
          backgroundSize: '100% auto',
          backgroundPosition: '50% -125px',
          backgroundRepeat: 'no-repeat',
        }}>
          {/* Fade top */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 50,
            background: 'linear-gradient(#0a0a1a 50%, transparent)',
            pointerEvents: 'none', zIndex: 2,
          }} />
          {/* Fade bottom */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 120,
            background: 'linear-gradient(transparent 0%, #0a0005 60%)',
            pointerEvents: 'none', zIndex: 2,
          }} />
          {/* Fade left */}
          <div style={{
            position: 'absolute', top: 0, bottom: 0, left: 0, width: 60,
            background: 'linear-gradient(to right, #0a0005, transparent)',
            pointerEvents: 'none', zIndex: 2,
          }} />
          {/* Fade right */}
          <div style={{
            position: 'absolute', top: 0, bottom: 0, right: 0, width: 60,
            background: 'linear-gradient(to left, #0a0005, transparent)',
            pointerEvents: 'none', zIndex: 2,
          }} />

          {/* Floating suit symbols */}
          {FLOAT_SUITS.map((s, i) => (
            <div key={i} style={{
              position: 'absolute',
              top: s.top,
              left: (s as any).left,
              right: (s as any).right,
              fontSize: s.size,
              color: '#d4af37',
              textShadow: '0 0 14px rgba(212,175,55,0.9), 0 0 30px rgba(212,175,55,0.5)',
              animation: `floatSuit ${s.dur} ease-in-out ${s.delay} infinite`,
              pointerEvents: 'none',
              zIndex: 4,
              lineHeight: 1,
            }}>{s.symbol}</div>
          ))}
        </div>

        {/* ── Audio ON button ── */}
        {!audioEnabled ? (
          <div style={{ marginBottom: 12, textAlign: 'center' }}>
            <button
              onClick={handleAudioOn}
              style={{
                background: 'linear-gradient(135deg, #1a3a1a, #0a2a0a)',
                border: '2px solid #22aa44',
                borderRadius: 30,
                padding: '9px 28px',
                color: '#44dd66',
                fontSize: 15, fontWeight: 900,
                cursor: 'pointer',
                fontFamily: 'var(--font-display)',
                boxShadow: '0 0 18px rgba(34,170,68,0.4)',
                animation: 'pulseGold 2s ease infinite',
                letterSpacing: 2,
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
              </svg>
              音声ON
            </button>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 5 }}>
              タップするとBGM・ボイスが有効になります
            </div>
          </div>
        ) : (
          <div style={{
            marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 11, color: '#44dd66', letterSpacing: 1,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
            </svg>
            音声ON
          </div>
        )}

        {/* ── Buttons ── */}
        <div style={{ display: 'flex', gap: 9, flexDirection: 'column', width: '100%' }}>

          {/* Game start */}
          <button
            onClick={onStart}
            style={{
              background: 'linear-gradient(135deg, #d4af37 0%, #c49a2a 50%, #d4af37 100%)',
              color: '#0a0a0a', border: 'none', borderRadius: 12,
              padding: '15px', fontSize: 19, fontWeight: 900,
              fontFamily: 'var(--font-display)', cursor: 'pointer',
              boxShadow: '0 0 22px rgba(212,175,55,0.55)', letterSpacing: 2,
              transition: 'transform 0.1s, box-shadow 0.1s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)'
              ;(e.currentTarget as HTMLElement).style.boxShadow = '0 0 32px rgba(212,175,55,0.75)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1)'
              ;(e.currentTarget as HTMLElement).style.boxShadow = '0 0 22px rgba(212,175,55,0.55)'
            }}
          >
            ゲームスタート
          </button>

          {/* Rules + BGM settings */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onRules}
              style={{
                flex: 1,
                background: 'rgba(212,175,55,0.1)',
                color: '#d4af37', border: '1px solid rgba(212,175,55,0.4)', borderRadius: 12,
                padding: '12px', fontSize: 14, fontWeight: 700,
                fontFamily: 'var(--font-main)', cursor: 'pointer',
                letterSpacing: 1,
              }}
            >
              ⚙️ ルール設定
            </button>
            <button
              onClick={onSettings}
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(240,232,208,0.7)',
                border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12,
                padding: '12px 16px', fontSize: 16,
                fontFamily: 'var(--font-main)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ♪
            </button>
          </div>

          {/* X share */}
          <button
            onClick={openXShare}
            style={{
              background: 'rgba(0,0,0,0.65)',
              border: '1px solid rgba(255,255,255,0.22)',
              borderRadius: 12, padding: '11px',
              color: '#f0e8d0', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'var(--font-main)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            Xで対戦者募集
          </button>

          {/* INMU PORTAL */}
          <button
            onClick={onPortalSearch}
            style={{
              background: 'rgba(212,175,55,0.07)',
              border: '1px solid rgba(212,175,55,0.25)',
              borderRadius: 12, padding: '11px',
              color: 'rgba(212,175,55,0.85)', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'var(--font-main)',
              letterSpacing: 1,
            }}
          >
            🔍 INMUポータルで対戦相手を探す
          </button>
        </div>

        <div style={{
          fontSize: 10, color: 'rgba(240,232,208,0.3)',
          marginTop: 14, marginBottom: 8, lineHeight: 1.8,
        }}>
          2が最強・3が最弱・♠3持ちが先攻
        </div>
      </div>
    </div>
  )
}
