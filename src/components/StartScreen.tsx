import React, { useState } from 'react'
import { useAudio } from '../contexts/AudioContext'
import { useProfile } from '../hooks/useProfile'
import ProfileModal from './ProfileModal'

interface Props {
  onStart: () => void
  onRules: () => void
  onSettings: () => void
  onFriends: () => void
}

const SPEAKER_ICON = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
  </svg>
)

export default function StartScreen({ onStart, onRules, onSettings, onFriends }: Props) {
  const { audioEnabled, enableAudio, playBGM } = useAudio()
  const { profile, saveProfile } = useProfile()
  const [showProfile, setShowProfile] = useState(false)

  function handleAudioOn() {
    enableAudio()
    setTimeout(() => playBGM('title'), 100)
  }

  return (
    <>
      <div style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #0a0a1a 0%, #0a0005 45%, #1a0a00 100%)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Diagonal pattern bg */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 30px, rgba(212,175,55,0.025) 30px, rgba(212,175,55,0.025) 31px)`,
        }} />

        {/* Main content */}
        <div style={{
          position: 'relative', zIndex: 1,
          width: '100%', maxWidth: 400,
          padding: '12px 18px 10px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>

          {/* ── Title ── */}
          <div style={{
            fontSize: 22, letterSpacing: 8,
            color: 'rgba(212,175,55,0.75)',
            animation: 'pulseGold 3s ease infinite',
            marginBottom: 0,
          }}>♠ ♥ ♦ ♣</div>

          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(36px, 11vw, 62px)', fontWeight: 900,
            color: '#d4af37',
            textShadow: '0 0 30px rgba(212,175,55,0.9), 0 0 60px rgba(212,175,55,0.4)',
            lineHeight: 1, marginBottom: 2,
            animation: 'pulseGold 3s ease infinite',
          }}>INMU</div>

          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(26px, 8vw, 46px)', fontWeight: 900,
            color: '#f0e8d0',
            textShadow: '2px 2px 10px rgba(0,0,0,0.9)',
            marginBottom: 2,
          }}>大富豪</div>

          <div style={{
            fontSize: 11, color: 'rgba(212,175,55,0.65)',
            letterSpacing: 2, marginBottom: 0,
          }}>CPU対戦 / フレンド対戦</div>

          {/* ── Character ── */}
          <div style={{
            width: '100%', height: 180, flexShrink: 0,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}>
            <img
              src="/loris-character.png"
              alt="INMU character"
              style={{
                height: 190,
                width: 'auto',
                objectFit: 'contain',
                display: 'block',
                mixBlendMode: 'screen',
              }}
            />
          </div>

          {/* ── Audio + Profile row ── */}
          <div style={{
            display: 'flex', gap: 8, width: '100%',
            justifyContent: 'center', marginBottom: 8,
          }}>
            <button
              onClick={audioEnabled ? undefined : handleAudioOn}
              style={{
                flex: 1,
                background: audioEnabled
                  ? 'rgba(34,170,68,0.12)'
                  : 'linear-gradient(135deg, #1a3a1a, #0a2a0a)',
                border: `1.5px solid ${audioEnabled ? 'rgba(34,170,68,0.4)' : '#22aa44'}`,
                borderRadius: 12,
                padding: '9px 10px',
                color: '#44dd66',
                fontSize: 13, fontWeight: 700,
                cursor: audioEnabled ? 'default' : 'pointer',
                fontFamily: 'var(--font-display)',
                boxShadow: audioEnabled ? 'none' : '0 0 12px rgba(34,170,68,0.3)',
                letterSpacing: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {SPEAKER_ICON}
              {audioEnabled ? '音声ON' : '音声をONにする'}
            </button>

            <button
              onClick={() => setShowProfile(true)}
              style={{
                flex: 1,
                background: 'rgba(0,0,0,0.35)',
                border: '1.5px solid rgba(212,175,55,0.35)',
                borderRadius: 12,
                padding: '9px 10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                cursor: 'pointer',
                backdropFilter: 'blur(6px)',
              }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                border: '1.5px solid rgba(212,175,55,0.5)',
                overflow: 'hidden',
                background: 'rgba(212,175,55,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {profile.avatarDataUrl
                  ? <img src={profile.avatarDataUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                  : <span style={{ fontSize: 12 }}>👤</span>
                }
              </div>
              <span style={{
                color: '#f0e8d0', fontSize: 12, fontFamily: 'var(--font-main)',
                maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{profile.username}</span>
              <span style={{ color: 'rgba(212,175,55,0.6)', fontSize: 10 }}>✏️</span>
            </button>
          </div>

          {/* ── Buttons ── */}
          <div style={{ display: 'flex', gap: 7, flexDirection: 'column', width: '100%' }}>

            <button
              onClick={onStart}
              style={{
                background: 'linear-gradient(135deg, #d4af37 0%, #c49a2a 50%, #d4af37 100%)',
                color: '#0a0a0a', border: 'none', borderRadius: 12,
                padding: '13px', fontSize: 18, fontWeight: 900,
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

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={onRules}
                style={{
                  flex: 1,
                  background: 'rgba(212,175,55,0.1)',
                  color: '#d4af37', border: '1px solid rgba(212,175,55,0.4)', borderRadius: 12,
                  padding: '10px', fontSize: 13, fontWeight: 700,
                  fontFamily: 'var(--font-main)', cursor: 'pointer',
                  letterSpacing: 1,
                }}
              >⚙️ ルール設定</button>
              <button
                onClick={onSettings}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(240,232,208,0.7)',
                  border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12,
                  padding: '10px 14px', fontSize: 15,
                  fontFamily: 'var(--font-main)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >♪</button>
            </div>

            <button
              onClick={onFriends}
              style={{
                background: 'rgba(212,175,55,0.09)',
                border: '1px solid rgba(212,175,55,0.3)',
                borderRadius: 12, padding: '11px',
                color: '#d4af37', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'var(--font-main)',
                letterSpacing: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <span style={{ fontSize: 17 }}>👥</span>
              フレンド
            </button>
          </div>

          <div style={{
            fontSize: 9, color: 'rgba(240,232,208,0.25)',
            marginTop: 8, lineHeight: 1.6,
          }}>2が最強・3が最弱・♠3持ちが先攻</div>
        </div>
      </div>

      {showProfile && (
        <ProfileModal
          profile={profile}
          onSave={saveProfile}
          onClose={() => setShowProfile(false)}
        />
      )}
    </>
  )
}
