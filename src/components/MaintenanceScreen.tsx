import React from 'react'

export default function MaintenanceScreen() {
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(180deg, #0a0a1a 0%, #0a0005 100%)',
      padding: '32px 24px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 64, marginBottom: 24 }}>🔧</div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 26,
        fontWeight: 900,
        color: '#d4af37',
        marginBottom: 16,
        textShadow: '0 0 20px rgba(212,175,55,0.5)',
      }}>
        メンテナンス中
      </div>
      <div style={{
        fontSize: 14,
        color: 'rgba(240,232,208,0.75)',
        lineHeight: 1.8,
        maxWidth: 280,
      }}>
        ただいまメンテナンス中です。<br />
        しばらくお待ちください。
      </div>
    </div>
  )
}
