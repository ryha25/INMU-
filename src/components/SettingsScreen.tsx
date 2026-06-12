import React, { useState } from 'react'
import { STAMPS } from '../config/voices'
import { useAudio } from '../contexts/AudioContext'

export interface PlayerStampSettings {
  [playerIndex: number]: string[]
}

const DEFAULT_STAMP_IDS = STAMPS.slice(0, 10).map(s => s.id)

export function getDefaultStampSettings(): PlayerStampSettings {
  return { 0: [...DEFAULT_STAMP_IDS], 1: [...DEFAULT_STAMP_IDS], 2: [...DEFAULT_STAMP_IDS], 3: [...DEFAULT_STAMP_IDS] }
}

interface Props {
  playerStamps: PlayerStampSettings
  onSave: (stamps: PlayerStampSettings) => void
  onBack: () => void
}

const PLAYER_NAMES = ['プレイヤー1', 'プレイヤー2', 'プレイヤー3', 'プレイヤー4']
const PLAYER_COLORS = ['#d4af37', '#00ccff', '#88ff88', '#ff88cc']
const MAX_STAMPS = 10

export default function SettingsScreen({ playerStamps, onSave, onBack }: Props) {
  const [local, setLocal] = useState<PlayerStampSettings>({
    0: [...(playerStamps[0] ?? DEFAULT_STAMP_IDS)],
    1: [...(playerStamps[1] ?? DEFAULT_STAMP_IDS)],
    2: [...(playerStamps[2] ?? DEFAULT_STAMP_IDS)],
    3: [...(playerStamps[3] ?? DEFAULT_STAMP_IDS)],
  })
  const [activePlayer, setActivePlayer] = useState(0)
  const { audioEnabled, enableAudio, playBGM, stopBGM, currentBGMTrack, playStampVoice } = useAudio()

  function toggleBGM() {
    if (currentBGMTrack) stopBGM()
    else playBGM('title')
  }

  function toggleStamp(stampId: string) {
    setLocal(prev => {
      const current = prev[activePlayer] ?? []
      if (current.includes(stampId)) {
        return { ...prev, [activePlayer]: current.filter(id => id !== stampId) }
      }
      if (current.length >= MAX_STAMPS) return prev
      return { ...prev, [activePlayer]: [...current, stampId] }
    })
  }

  const color = PLAYER_COLORS[activePlayer]
  const selected = local[activePlayer] ?? []

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(180deg, #0a0a1a 0%, #0a0005 100%)',
      padding: '20px 16px 0',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 22, fontWeight: 900,
        color: '#d4af37',
        textAlign: 'center',
        marginBottom: 20,
        textShadow: '0 0 16px rgba(212,175,55,0.5)',
        flexShrink: 0,
      }}>⚙️ 設定</div>

      {/* Audio section */}
      <div style={{
        background: 'rgba(0,0,0,0.45)',
        border: '1px solid rgba(212,175,55,0.2)',
        borderRadius: 14,
        padding: '14px 16px',
        marginBottom: 16,
        flexShrink: 0,
      }}>
        <div style={{ color: '#d4af37', fontWeight: 700, fontSize: 13, marginBottom: 12 }}>🔊 音声設定</div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: 'rgba(240,232,208,0.8)' }}>音声</span>
          <button
            onClick={() => { if (!audioEnabled) enableAudio() }}
            style={{
              background: audioEnabled ? 'linear-gradient(135deg, #22aa44, #116622)' : 'rgba(255,255,255,0.08)',
              border: `1px solid ${audioEnabled ? '#22aa44' : 'rgba(255,255,255,0.2)'}`,
              borderRadius: 20, padding: '4px 14px',
              color: audioEnabled ? '#fff' : 'rgba(240,232,208,0.5)',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >{audioEnabled ? '✓ ON' : 'OFF'}</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: 'rgba(240,232,208,0.8)' }}>BGM</span>
          <button
            onClick={toggleBGM}
            disabled={!audioEnabled}
            style={{
              background: currentBGMTrack ? 'linear-gradient(135deg, #22aa44, #116622)' : 'rgba(255,255,255,0.08)',
              border: `1px solid ${currentBGMTrack ? '#22aa44' : 'rgba(255,255,255,0.2)'}`,
              borderRadius: 20, padding: '4px 14px',
              color: currentBGMTrack ? '#fff' : 'rgba(240,232,208,0.5)',
              fontSize: 12, fontWeight: 700,
              cursor: audioEnabled ? 'pointer' : 'default',
              opacity: audioEnabled ? 1 : 0.4,
            }}
          >{currentBGMTrack ? '♪ 再生中' : '停止'}</button>
        </div>
      </div>

      {/* Stamp selection per player */}
      <div style={{
        background: 'rgba(0,0,0,0.45)',
        border: '1px solid rgba(212,175,55,0.2)',
        borderRadius: 14,
        padding: '14px 16px',
        marginBottom: 16,
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ color: '#d4af37', fontWeight: 700, fontSize: 13, marginBottom: 10, flexShrink: 0 }}>
          💬 スタンプ設定（プレイヤー別・最大{MAX_STAMPS}個）
        </div>

        {/* Player tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexShrink: 0 }}>
          {PLAYER_NAMES.map((name, i) => (
            <button
              key={i}
              onClick={() => setActivePlayer(i)}
              style={{
                flex: 1,
                padding: '5px 0',
                borderRadius: 8,
                fontSize: 10,
                fontWeight: 700,
                cursor: 'pointer',
                border: `1px solid ${activePlayer === i ? PLAYER_COLORS[i] : 'rgba(255,255,255,0.12)'}`,
                background: activePlayer === i
                  ? `rgba(${i === 0 ? '212,175,55' : i === 1 ? '0,204,255' : i === 2 ? '136,255,136' : '255,136,204'},0.15)`
                  : 'rgba(255,255,255,0.05)',
                color: activePlayer === i ? PLAYER_COLORS[i] : 'rgba(240,232,208,0.4)',
              }}
            >
              {name.replace('プレイヤー', 'P')}
            </button>
          ))}
        </div>

        {/* Count indicator */}
        <div style={{
          fontSize: 11,
          color: selected.length >= MAX_STAMPS ? '#ff8844' : 'rgba(240,232,208,0.5)',
          marginBottom: 8,
          flexShrink: 0,
        }}>
          <span style={{ color, fontWeight: 700 }}>{selected.length}</span> / {MAX_STAMPS} 選択中
          {selected.length >= MAX_STAMPS && <span style={{ color: '#ff8844', marginLeft: 6 }}>（上限に達しました）</span>}
        </div>

        {/* Stamp list */}
        <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' as any }}>
          {STAMPS.map(stamp => {
            const isSelected = selected.includes(stamp.id)
            const disabled = !isSelected && selected.length >= MAX_STAMPS
            return (
              <div
                key={stamp.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 6px',
                  borderRadius: 8,
                  marginBottom: 4,
                  background: isSelected
                    ? `rgba(${activePlayer === 0 ? '212,175,55' : activePlayer === 1 ? '0,204,255' : activePlayer === 2 ? '136,255,136' : '255,136,204'},0.12)`
                    : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isSelected ? color + '55' : 'rgba(255,255,255,0.06)'}`,
                  opacity: disabled ? 0.35 : 1,
                  cursor: disabled ? 'default' : 'pointer',
                  transition: 'all 0.12s',
                }}
                onClick={() => { if (!disabled) toggleStamp(stamp.id) }}
              >
                <span style={{ fontSize: 18, flexShrink: 0 }}>{stamp.emoji}</span>
                <span style={{
                  flex: 1,
                  fontSize: 11,
                  color: isSelected ? color : 'rgba(240,232,208,0.65)',
                  fontWeight: isSelected ? 700 : 400,
                  lineHeight: 1.3,
                }}>
                  {stamp.text}
                </span>
                {/* Play button */}
                {stamp.voice && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      playStampVoice(stamp.voice)
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: 6,
                      color: 'rgba(240,232,208,0.7)',
                      fontSize: 12,
                      padding: '2px 7px',
                      cursor: 'pointer',
                      flexShrink: 0,
                      lineHeight: 1.6,
                    }}
                  >▶</button>
                )}
                {/* Checkbox */}
                <div style={{
                  width: 18, height: 18,
                  borderRadius: 4,
                  border: `1.5px solid ${isSelected ? color : 'rgba(255,255,255,0.2)'}`,
                  background: isSelected ? color : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {isSelected && <span style={{ fontSize: 11, color: '#000', fontWeight: 900, lineHeight: 1 }}>✓</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 10, padding: '0 0 20px', flexShrink: 0 }}>
        <button
          onClick={() => onSave(local)}
          style={{
            flex: 2,
            background: 'linear-gradient(135deg, #d4af37, #a07c20)',
            border: 'none', borderRadius: 12,
            padding: '13px',
            color: '#0a0a0a', fontSize: 15, fontWeight: 900,
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
            borderRadius: 12, padding: '13px',
            color: 'rgba(212,175,55,0.7)',
            fontSize: 13, cursor: 'pointer',
            fontFamily: 'var(--font-main)',
          }}
        >戻る</button>
      </div>
    </div>
  )
}
