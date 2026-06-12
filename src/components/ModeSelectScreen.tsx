import React from 'react'

export type GameMode = 'local' | 'cpu' | 'friend' | 'online'

interface Props {
  onSelect: (mode: GameMode) => void
  onBack: () => void
}

interface ModeItem {
  mode: GameMode
  icon: string
  title: string
  desc: string
  color: string
  glow: string
}

const MODES: ModeItem[] = [
  {
    mode: 'local',
    icon: '👥',
    title: '4人ローカル対戦',
    desc: '1台のスマホで4人が交代でプレイ',
    color: '#d4af37',
    glow: 'rgba(212,175,55,0.4)',
  },
  {
    mode: 'cpu',
    icon: '🤖',
    title: 'CPU対戦',
    desc: '3体のCPUと1人で対戦',
    color: '#00ccff',
    glow: 'rgba(0,204,255,0.35)',
  },
  {
    mode: 'friend',
    icon: '🔗',
    title: 'フレンド対戦',
    desc: 'ルームを作ってフレンドと対戦（2〜4人）',
    color: '#88ff88',
    glow: 'rgba(136,255,136,0.35)',
  },
  {
    mode: 'online',
    icon: '🌐',
    title: 'オンライン対戦',
    desc: '公開ルームで見知らぬ人と対戦',
    color: '#ff88cc',
    glow: 'rgba(255,136,204,0.35)',
  },
]

export default function ModeSelectScreen({ onSelect, onBack }: Props) {
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(180deg, #0a0a1a 0%, #0a0005 50%, #1a0a00 100%)',
      padding: '20px 16px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 30px, rgba(212,175,55,0.03) 30px, rgba(212,175,55,0.03) 31px)`,
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 360 }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22, fontWeight: 900,
          color: '#d4af37',
          textAlign: 'center',
          textShadow: '0 0 20px rgba(212,175,55,0.6)',
          marginBottom: 6,
        }}>対戦モード選択</div>
        <div style={{ textAlign: 'center', fontSize: 11, color: 'rgba(212,175,55,0.5)', marginBottom: 22 }}>
          プレイスタイルを選んでください
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {MODES.map(m => (
            <button
              key={m.mode}
              onClick={() => onSelect(m.mode)}
              style={{
                background: `rgba(0,0,0,0.55)`,
                border: `1.5px solid ${m.color}55`,
                borderRadius: 14,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
                boxShadow: `0 0 0px ${m.glow}`,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.border = `1.5px solid ${m.color}cc`
                ;(e.currentTarget as HTMLElement).style.boxShadow = `0 0 18px ${m.glow}`
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.border = `1.5px solid ${m.color}55`
                ;(e.currentTarget as HTMLElement).style.boxShadow = `0 0 0px ${m.glow}`
              }}
            >
              <div style={{ fontSize: 28, flexShrink: 0 }}>{m.icon}</div>
              <div>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 15, fontWeight: 900,
                  color: m.color,
                  marginBottom: 2,
                }}>{m.title}</div>
                <div style={{ fontSize: 11, color: 'rgba(240,232,208,0.6)', lineHeight: 1.4 }}>{m.desc}</div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={onBack}
          style={{
            marginTop: 18,
            width: '100%',
            background: 'transparent',
            border: '1px solid rgba(212,175,55,0.25)',
            borderRadius: 10,
            color: 'rgba(212,175,55,0.6)',
            fontSize: 13,
            padding: '10px',
            cursor: 'pointer',
            fontFamily: 'var(--font-main)',
          }}
        >← タイトルへ戻る</button>
      </div>
    </div>
  )
}
