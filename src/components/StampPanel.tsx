import React, { useState, useEffect } from 'react'
import { STAMPS } from '../config/voices'
import { useAudio } from '../contexts/AudioContext'

interface ActiveStamp {
  stampId: string
  playerName: string
  playerIndex: number
  id: number
}

interface Props {
  playerName: string
  playerIndex: number
  selectedStampIds?: string[]
  onSendStamp?: (stampId: string) => void
  incomingStamp?: { playerIndex: number; stampId: string; playerName: string } | null
}

let stampCounter = 0

export default function StampPanel({ playerName, playerIndex, selectedStampIds, onSendStamp, incomingStamp }: Props) {
  const [open, setOpen] = useState(false)
  const [activeStamps, setActiveStamps] = useState<ActiveStamp[]>([])
  const { playStampVoice } = useAudio()

  const visibleStamps = selectedStampIds && selectedStampIds.length > 0
    ? STAMPS.filter(s => selectedStampIds.includes(s.id))
    : STAMPS.slice(0, 10)

  useEffect(() => {
    if (!incomingStamp) return
    const stamp = STAMPS.find(s => s.id === incomingStamp.stampId)
    if (!stamp) return
    addStamp(incomingStamp.stampId, incomingStamp.playerName, incomingStamp.playerIndex)
    playStampVoice(stamp.voice)
  }, [incomingStamp])

  function addStamp(stampId: string, pName: string, pIdx: number) {
    const id = ++stampCounter
    setActiveStamps(prev => [...prev, { stampId, playerName: pName, playerIndex: pIdx, id }])
    setTimeout(() => {
      setActiveStamps(prev => prev.filter(s => s.id !== id))
    }, 2600)
  }

  function handleSend(stamp: typeof STAMPS[0]) {
    setOpen(false)
    addStamp(stamp.id, playerName, playerIndex)
    playStampVoice(stamp.voice)
    onSendStamp?.(stamp.id)
  }

  const stampColors = ['#d4af37', '#00ccff', '#88ff88', '#ff88cc']

  return (
    <>
      {/* Active stamp bubbles */}
      <div style={{
        position: 'absolute',
        top: 80,
        left: 0, right: 0,
        pointerEvents: 'none',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
      }}>
        {activeStamps.map(as => {
          const stamp = STAMPS.find(s => s.id === as.stampId)
          if (!stamp) return null
          const color = stampColors[as.playerIndex % stampColors.length]
          return (
            <div key={as.id} style={{
              background: `rgba(0,0,0,0.85)`,
              border: `2px solid ${color}`,
              borderRadius: 20,
              padding: '7px 14px',
              animation: 'stampFadeIn 0.3s ease-out',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <span style={{ fontSize: 16 }}>{stamp.emoji}</span>
              <div>
                <div style={{ fontSize: 9, color: `${color}cc`, fontWeight: 700, lineHeight: 1.2 }}>{as.playerName}</div>
                <div style={{ fontSize: 14, fontWeight: 900, color: color, fontFamily: 'var(--font-display)' }}>{stamp.text}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Stamp toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: open ? 'rgba(212,175,55,0.25)' : 'rgba(255,255,255,0.07)',
          border: `1px solid ${open ? 'rgba(212,175,55,0.6)' : 'rgba(255,255,255,0.15)'}`,
          borderRadius: 8,
          padding: '6px 10px',
          fontSize: 18,
          cursor: 'pointer',
          color: '#f0e8d0',
          lineHeight: 1,
          flexShrink: 0,
        }}
        title="スタンプ"
      >💬</button>

      {/* Stamp picker */}
      {open && (
        <div style={{
          position: 'absolute',
          bottom: 60,
          right: 10,
          background: 'rgba(10,10,26,0.97)',
          border: '1px solid rgba(212,175,55,0.3)',
          borderRadius: 14,
          padding: 10,
          zIndex: 100,
          width: 272,
          maxHeight: '55vh',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 6,
          }}>
            {visibleStamps.map(stamp => (
              <button
                key={stamp.id}
                onClick={() => handleSend(stamp)}
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 10,
                  padding: '6px 4px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <span style={{ fontSize: 20 }}>{stamp.emoji}</span>
                <span style={{ fontSize: 8, color: 'rgba(240,232,208,0.7)', lineHeight: 1.2, textAlign: 'center', wordBreak: 'break-all' }}>
                  {stamp.text}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
