import React, { useState } from 'react'
import { VOICE_PACKS } from '../config/voices'
import { useAudio } from '../contexts/AudioContext'

export interface PlayerVoiceSettings {
  [playerIndex: number]: string // voicePackId
}

interface Props {
  playerVoices: PlayerVoiceSettings
  onSave: (settings: PlayerVoiceSettings) => void
  onBack: () => void
}

const PLAYER_NAMES = ['プレイヤー1', 'プレイヤー2', 'プレイヤー3', 'プレイヤー4']
const PLAYER_COLORS = ['#d4af37', '#00ccff', '#88ff88', '#ff88cc']

export default function SettingsScreen({ playerVoices, onSave, onBack }: Props) {
  const [local, setLocal] = useState<PlayerVoiceSettings>({ ...playerVoices })
  const { audioEnabled, enableAudio, playBGM, stopBGM, currentBGMTrack } = useAudio()

  function handleVoice(idx: number, packId: string) {
    setLocal(prev => ({ ...prev, [idx]: packId }))
  }

  function toggleBGM() {
    if (currentBGMTrack) stopBGM()
    else playBGM('title')
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(180deg, #0a0a1a 0%, #0a0005 100%)',
      padding: '20px 16px',
      overflowY: 'auto',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 22, fontWeight: 900,
        color: '#d4af37',
        textAlign: 'center',
        marginBottom: 20,
        textShadow: '0 0 16px rgba(212,175,55,0.5)',
      }}>⚙️ 設定</div>

      {/* Audio section */}
      <div style={{
        background: 'rgba(0,0,0,0.45)',
        border: '1px solid rgba(212,175,55,0.2)',
        borderRadius: 14,
        padding: '14px 16px',
        marginBottom: 16,
      }}>
        <div style={{ color: '#d4af37', fontWeight: 700, fontSize: 13, marginBottom: 12 }}>🔊 音声設定</div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: 'rgba(240,232,208,0.8)' }}>音声</span>
          <button
            onClick={() => { if (!audioEnabled) enableAudio() }}
            style={{
              background: audioEnabled
                ? 'linear-gradient(135deg, #22aa44, #116622)'
                : 'rgba(255,255,255,0.08)',
              border: `1px solid ${audioEnabled ? '#22aa44' : 'rgba(255,255,255,0.2)'}`,
              borderRadius: 20,
              padding: '4px 14px',
              color: audioEnabled ? '#fff' : 'rgba(240,232,208,0.5)',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {audioEnabled ? '✓ ON' : 'OFF'}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: 'rgba(240,232,208,0.8)' }}>BGM</span>
          <button
            onClick={toggleBGM}
            disabled={!audioEnabled}
            style={{
              background: currentBGMTrack
                ? 'linear-gradient(135deg, #22aa44, #116622)'
                : 'rgba(255,255,255,0.08)',
              border: `1px solid ${currentBGMTrack ? '#22aa44' : 'rgba(255,255,255,0.2)'}`,
              borderRadius: 20,
              padding: '4px 14px',
              color: currentBGMTrack ? '#fff' : 'rgba(240,232,208,0.5)',
              fontSize: 12, fontWeight: 700,
              cursor: audioEnabled ? 'pointer' : 'default',
              opacity: audioEnabled ? 1 : 0.4,
            }}
          >
            {currentBGMTrack ? '♪ 再生中' : '停止'}
          </button>
        </div>
      </div>

      {/* Voice pack per player */}
      <div style={{
        background: 'rgba(0,0,0,0.45)',
        border: '1px solid rgba(212,175,55,0.2)',
        borderRadius: 14,
        padding: '14px 16px',
        marginBottom: 16,
      }}>
        <div style={{ color: '#d4af37', fontWeight: 700, fontSize: 13, marginBottom: 6 }}>🎤 ボイス設定（プレイヤー別）</div>
        <div style={{ fontSize: 10, color: 'rgba(240,232,208,0.4)', marginBottom: 12 }}>
          ボイスファイルは随時追加予定です
        </div>
        {PLAYER_NAMES.map((name, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 0',
            borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none',
          }}>
            <span style={{ fontSize: 12, color: PLAYER_COLORS[i], fontWeight: 700 }}>{name}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {VOICE_PACKS.map(pack => (
                <button
                  key={pack.id}
                  onClick={() => handleVoice(i, pack.id)}
                  style={{
                    background: local[i] === pack.id
                      ? `linear-gradient(135deg, ${PLAYER_COLORS[i]}44, ${PLAYER_COLORS[i]}22)`
                      : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${local[i] === pack.id ? PLAYER_COLORS[i] : 'rgba(255,255,255,0.12)'}`,
                    borderRadius: 8,
                    padding: '3px 9px',
                    fontSize: 11,
                    color: local[i] === pack.id ? PLAYER_COLORS[i] : 'rgba(240,232,208,0.5)',
                    cursor: 'pointer',
                    fontWeight: local[i] === pack.id ? 700 : 400,
                  }}
                >
                  {pack.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => onSave(local)}
          style={{
            flex: 2,
            background: 'linear-gradient(135deg, #d4af37, #a07c20)',
            border: 'none',
            borderRadius: 12,
            padding: '13px',
            color: '#0a0a0a',
            fontSize: 15, fontWeight: 900,
            cursor: 'pointer',
            fontFamily: 'var(--font-display)',
          }}
        >保存</button>
        <button
          onClick={onBack}
          style={{
            flex: 1,
            background: 'transparent',
            border: '1px solid rgba(212,175,55,0.3)',
            borderRadius: 12,
            padding: '13px',
            color: 'rgba(212,175,55,0.7)',
            fontSize: 13, cursor: 'pointer',
            fontFamily: 'var(--font-main)',
          }}
        >戻る</button>
      </div>
    </div>
  )
}
