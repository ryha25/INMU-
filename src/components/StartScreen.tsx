import React from 'react'

interface Props {
  onStart: () => void
  onRules: () => void
}

export default function StartScreen({ onStart, onRules }: Props) {
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
          letterSpacing: 2, marginBottom: 22,
        }}>4人ローカル対戦</div>

        {/* INMU special rules always-on */}
        <div style={{
          background: 'rgba(0,0,0,0.5)',
          border: '1px solid rgba(212,175,55,0.25)',
          borderRadius: 10,
          padding: '12px 16px',
          marginBottom: 16,
          textAlign: 'left',
        }}>
          <div style={{ color: '#d4af37', fontWeight: 700, fontSize: 12, marginBottom: 8, textAlign: 'center' }}>
            ✨ INMUルール（常時ON）
          </div>
          <div style={{ fontSize: 11, color: 'rgba(240,232,208,0.75)', lineHeight: 2 }}>
            <div>⚡ <span style={{ color: '#ff6600', fontWeight: 700 }}>1919</span>「イキスギィ!!」— 場流し</div>
            <div>🎯 <span style={{ color: '#00aaff', fontWeight: 700 }}>810切り</span>「やりますねぇ〜」— 場流し</div>
            <div>🔥 <span style={{ color: '#cc00ff', fontWeight: 700 }}>114514</span>「いいよ！来いよ」— 即時勝利</div>
            <div>⚠️ <span style={{ color: '#ff9944', fontWeight: 700 }}>2431</span> 所持で初手強制</div>
          </div>
        </div>

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
          <button
            onClick={onRules}
            style={{
              background: 'rgba(212,175,55,0.1)',
              color: '#d4af37', border: '1px solid rgba(212,175,55,0.4)', borderRadius: 12,
              padding: '13px', fontSize: 15, fontWeight: 700,
              fontFamily: 'var(--font-main)', cursor: 'pointer',
              letterSpacing: 1,
            }}
          >
            ⚙️ ルール設定
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
