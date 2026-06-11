import React from 'react'

interface Props {
  onStart: () => void
}

export default function StartScreen({ onStart }: Props) {
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(180deg, #0a0a1a 0%, #0a0005 50%, #1a0a00 100%)',
      padding: 24,
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `repeating-linear-gradient(
          45deg,
          transparent,
          transparent 30px,
          rgba(212,175,55,0.03) 30px,
          rgba(212,175,55,0.03) 31px
        )`,
      }} />
      
      {/* Glow circles */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Card suits decoration */}
        <div style={{
          fontSize: 32,
          marginBottom: 8,
          letterSpacing: 8,
          color: 'rgba(212,175,55,0.6)',
          animation: 'pulseGold 3s ease infinite',
        }}>
          ♠ ♥ ♦ ♣
        </div>

        {/* Title */}
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(38px, 11vw, 72px)',
          fontWeight: 900,
          color: '#d4af37',
          textShadow: '0 0 30px rgba(212,175,55,0.8), 0 0 60px rgba(212,175,55,0.4)',
          lineHeight: 1,
          marginBottom: 8,
          animation: 'pulseGold 3s ease infinite',
        }}>
          INMU
        </div>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(28px, 8vw, 54px)',
          fontWeight: 900,
          color: '#f0e8d0',
          textShadow: '2px 2px 8px rgba(0,0,0,0.8)',
          marginBottom: 4,
        }}>
          大富豪
        </div>

        {/* Subtitle */}
        <div style={{
          fontSize: 13,
          color: 'rgba(212,175,55,0.7)',
          letterSpacing: 2,
          marginBottom: 32,
        }}>
          4人ローカル対戦
        </div>

        {/* Special rules preview */}
        <div style={{
          background: 'rgba(0,0,0,0.5)',
          border: '1px solid rgba(212,175,55,0.3)',
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 32,
          maxWidth: 320,
          textAlign: 'left',
        }}>
          <div style={{ color: '#d4af37', fontWeight: 700, fontSize: 13, marginBottom: 10, textAlign: 'center' }}>
            ✨ 特殊役
          </div>
          <div style={{ fontSize: 12, color: 'rgba(240,232,208,0.8)', lineHeight: 1.8 }}>
            <div>⚡ <span style={{ color: '#ff6600', fontWeight: 700 }}>1919</span>「イキスギィ!!」— 4枚出し・場流し</div>
            <div>🎯 <span style={{ color: '#00aaff', fontWeight: 700 }}>810切り</span>「やりますねぇ〜」— 2枚出し・場流し</div>
            <div>🔥 <span style={{ color: '#cc00ff', fontWeight: 700 }}>114514</span>「いいよ！来いよ」— 6枚・即時勝利</div>
          </div>
        </div>

        {/* Basic rules */}
        <div style={{
          fontSize: 11,
          color: 'rgba(240,232,208,0.5)',
          marginBottom: 32,
          lineHeight: 1.8,
        }}>
          2が最強 ・ 3が最弱 ・ 同枚数縛り ・ ♠3持ちが先攻
        </div>

        {/* Start button */}
        <button
          onClick={onStart}
          style={{
            background: 'linear-gradient(135deg, #d4af37 0%, #a07c20 50%, #d4af37 100%)',
            backgroundSize: '200% 200%',
            color: '#0a0a0a',
            border: 'none',
            borderRadius: 12,
            padding: '16px 48px',
            fontSize: 20,
            fontWeight: 900,
            fontFamily: 'var(--font-display)',
            cursor: 'pointer',
            boxShadow: '0 0 20px rgba(212,175,55,0.5), 0 4px 12px rgba(0,0,0,0.5)',
            transition: 'transform 0.1s, box-shadow 0.1s',
            letterSpacing: 2,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'scale(1.05)'
            e.currentTarget.style.boxShadow = '0 0 30px rgba(212,175,55,0.8), 0 4px 16px rgba(0,0,0,0.5)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow = '0 0 20px rgba(212,175,55,0.5), 0 4px 12px rgba(0,0,0,0.5)'
          }}
        >
          ゲームスタート
        </button>
      </div>
    </div>
  )
}
