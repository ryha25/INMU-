import React, { useState } from 'react'
import { STAMPS } from '../config/voices'
import { useAudio } from '../contexts/AudioContext'

export const DEFAULT_STAMP_IDS = STAMPS.slice(0, 10).map(s => s.id)

const MAX_STAMPS = 10

interface Props {
  stampIds: string[]
  onSave: (stampIds: string[]) => void
  onBack: () => void
}

export default function SettingsScreen({ stampIds, onSave, onBack }: Props) {
  const [local, setLocal] = useState<string[]>([...(stampIds.length > 0 ? stampIds : DEFAULT_STAMP_IDS)])
  const { audioEnabled, enableAudio, playBGM, stopBGM, currentBGMTrack, playStampVoice } = useAudio()

  function toggleBGM() {
    if (currentBGMTrack) stopBGM()
    else playBGM('title')
  }

  function toggleStamp(stampId: string) {
    setLocal(prev => {
      if (prev.includes(stampId)) return prev.filter(id => id !== stampId)
      if (prev.length >= MAX_STAMPS) return prev
      return [...prev, stampId]
    })
  }

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

      {/* Stamp selection */}
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
        <div style={{ color: '#d4af37', fontWeight: 700, fontSize: 13, marginBottom: 4, flexShrink: 0 }}>
          💬 スタンプ設定（最大{MAX_STAMPS}個）
        </div>
        <div style={{
          fontSize: 11,
          color: local.length >= MAX_STAMPS ? '#ff8844' : 'rgba(240,232,208,0.5)',
          marginBottom: 10,
          flexShrink: 0,
        }}>
          <span style={{ color: '#d4af37', fontWeight: 700 }}>{local.length}</span> / {MAX_STAMPS} 選択中
          {local.length >= MAX_STAMPS && <span style={{ color: '#ff8844', marginLeft: 6 }}>（上限です）</span>}
        </div>

        {/* Stamp list */}
        <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' as any }}>
          {STAMPS.map(stamp => {
            const isSelected = local.includes(stamp.id)
            const disabled = !isSelected && local.length >= MAX_STAMPS
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
                  background: isSelected ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isSelected ? 'rgba(212,175,55,0.45)' : 'rgba(255,255,255,0.06)'}`,
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
                  color: isSelected ? '#d4af37' : 'rgba(240,232,208,0.65)',
                  fontWeight: isSelected ? 700 : 400,
                  lineHeight: 1.3,
                }}>
                  {stamp.text}
                </span>
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
                <div style={{
                  width: 18, height: 18,
                  borderRadius: 4,
                  border: `1.5px solid ${isSelected ? '#d4af37' : 'rgba(255,255,255,0.2)'}`,
                  background: isSelected ? '#d4af37' : 'transparent',
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
