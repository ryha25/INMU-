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
      justifyContent: 'center',
      background: 'linear-gradient(180deg, #0a0a1a 0%, #0a0005 50%, #1a0a00 100%)',
      padding: 20,
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 30px, rgba(212,175,55,0.03) 30px, rgba(212,175,55,0.03) 31px)`,
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 360 }}>
        <div style={{
          fontSize: 30, marginBottom: 6, letterSpacing: 8,
          color: 'rgba(212,175,55,0.6)', animation: 'pulseGold 3s ease infinite',
        }}>♠ ♥ ♦ ♣</div>

        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(38px, 11vw, 70px)', fontWeight: 900,
          color: '#d4af37',
          textShadow: '0 0 30px rgba(212,175,55,0.8), 0 0 60px rgba(212,175,55,0.4)',
          lineHeight: 1, marginBottom: 6, animation: 'pulseGold 3s ease infinite',
        }}>INMU</div>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(28px, 8vw, 52px)', fontWeight: 900,
          color: '#f0e8d0',
          textShadow: '2px 2px 8px rgba(0,0,0,0.8)',
          marginBottom: 4,
        }}>大富豪</div>
        <div style={{
          fontSize: 12, color: 'rgba(212,175,55,0.7)',
          letterSpacing: 2, marginBottom: 28,
        }}>CPU対戦 / フレンド対戦</div>

        {/* Audio ON button */}
        {!audioEnabled && (
          <div style={{ marginBottom: 16 }}>
            <button
              onClick={handleAudioOn}
              style={{
                background: 'linear-gradient(135deg, #1a3a1a, #0a2a0a)',
                border: '2px solid #22aa44',
                borderRadius: 30,
                padding: '10px 28px',
                color: '#44dd66',
                fontSize: 15, fontWeight: 900,
                cursor: 'pointer',
                fontFamily: 'var(--font-display)',
                boxShadow: '0 0 18px rgba(34,170,68,0.4)',
                animation: 'pulseGold 2s ease infinite',
                letterSpacing: 2,
              }}
            >
              🔊 音声ON
            </button>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>
              タップするとBGM・ボイスが有効になります
            </div>
          </div>
        )}

        {audioEnabled && (
          <div style={{ fontSize: 11, color: '#44dd66', marginBottom: 16, letterSpacing: 1 }}>🔊 音声ON</div>
        )}

        <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
          <button
            onClick={onStart}
            style={{
              background: 'linear-gradient(135deg, #d4af37 0%, #a07c20 50%, #d4af37 100%)',
              color: '#0a0a0a', border: 'none', borderRadius: 12,
              padding: '15px', fontSize: 19, fontWeight: 900,
              fontFamily: 'var(--font-display)', cursor: 'pointer',
              boxShadow: '0 0 20px rgba(212,175,55,0.5)', letterSpacing: 2,
              transition: 'transform 0.1s, box-shadow 0.1s',
            }}
          >
            ゲームスタート
          </button>

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
                color: 'rgba(240,232,208,0.7)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12,
                padding: '12px 14px', fontSize: 14,
                fontFamily: 'var(--font-main)', cursor: 'pointer',
              }}
            >
              🎵
            </button>
          </div>

          {/* X share button */}
          <button
            onClick={openXShare}
            style={{
              background: 'rgba(0,0,0,0.7)',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 12, padding: '11px',
              color: '#f0e8d0', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'var(--font-main)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            Xで対戦者募集
          </button>

          {/* INMU PORTAL search button */}
          <button
            onClick={onPortalSearch}
            style={{
              background: 'rgba(212,175,55,0.07)',
              border: '1px solid rgba(212,175,55,0.25)',
              borderRadius: 12, padding: '11px',
              color: 'rgba(212,175,55,0.8)', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'var(--font-main)',
              letterSpacing: 1,
            }}
          >
            🔍 INMUポータルで対戦相手を探す
          </button>
        </div>

        <div style={{
          fontSize: 10, color: 'rgba(240,232,208,0.35)',
          marginTop: 16, lineHeight: 1.8,
        }}>
          2が最強・3が最弱・♠3持ちが先攻
        </div>
      </div>
    </div>
  )
}
