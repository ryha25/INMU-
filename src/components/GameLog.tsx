import React, { useEffect, useRef } from 'react'

interface Props {
  logs: string[]
}

export default function GameLog({ logs }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  return (
    <div style={{
      background: 'rgba(0,0,0,0.6)',
      border: '1px solid #2a2a4a',
      borderRadius: 8,
      padding: '8px 10px',
      maxHeight: 120,
      overflowY: 'auto',
      fontSize: 12,
    }}>
      <div style={{
        color: '#d4af37',
        fontWeight: 700,
        fontSize: 11,
        marginBottom: 4,
        letterSpacing: 1,
        textTransform: 'uppercase',
      }}>
        ゲームログ
      </div>
      {logs.map((log, i) => (
        <div
          key={i}
          style={{
            color: i === logs.length - 1 ? '#f0e8d0' : 'rgba(240,232,208,0.5)',
            padding: '1px 0',
            animation: i === logs.length - 1 ? 'slideUp 0.2s ease-out' : 'none',
            fontSize: 12,
            lineHeight: 1.4,
          }}
        >
          {log}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
