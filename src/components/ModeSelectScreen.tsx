import React from 'react'
import AdMaxSlot from './AdMaxSlot'

export type GameMode = 'cpu' | 'friend'
export type SelectMode = 'cpu' | 'friend' | 'xshare' | 'portal' | 'challenge' | 'tournament'

interface Props {
  onSelect: (mode: SelectMode) => void
  onBack: () => void
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 900, letterSpacing: 3,
      color: 'rgba(212,175,55,0.45)', textTransform: 'uppercase',
      marginBottom: 8, marginTop: 4, paddingLeft: 4,
      fontFamily: 'var(--font-main)',
    }}>{children}</div>
  )
}

interface ModeButtonProps {
  icon: string
  title: string
  desc: string
  color: string
  glow: string
  onClick: () => void
  isSvgIcon?: boolean
}

function ModeButton({ icon, title, desc, color, glow, onClick, isSvgIcon }: ModeButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'rgba(0,0,0,0.55)',
        border: `1.5px solid ${color}55`,
        borderRadius: 14, padding: '12px 14px',
        display: 'flex', alignItems: 'center', gap: 12,
        cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
        width: '100%', boxShadow: `0 0 0px ${glow}`,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.border = `1.5px solid ${color}cc`
        el.style.boxShadow = `0 0 16px ${glow}`
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.border = `1.5px solid ${color}55`
        el.style.boxShadow = `0 0 0px ${glow}`
      }}
    >
      <div style={{ fontSize: isSvgIcon ? 14 : 24, flexShrink: 0, width: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
        {isSvgIcon ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        ) : icon}
      </div>
      <div>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 900,
          color, marginBottom: 2,
        }}>{title}</div>
        <div style={{ fontSize: 10, color: 'rgba(240,232,208,0.55)', lineHeight: 1.4 }}>{desc}</div>
      </div>
    </button>
  )
}

export default function ModeSelectScreen({ onSelect, onBack }: Props) {
  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'flex-start',
      background: 'linear-gradient(180deg, #0a0a1a 0%, #0a0005 50%, #1a0a00 100%)',
      padding: '52px 16px 20px', position: 'relative',
      overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 30px, rgba(212,175,55,0.03) 30px, rgba(212,175,55,0.03) 31px)`,
        pointerEvents: 'none',
      }} />

      <button
        onClick={onBack}
        style={{
          position: 'absolute', top: 10, left: 12, zIndex: 2,
          background: 'rgba(5,5,12,.78)',
          border: '1px solid rgba(212,175,55,.45)', borderRadius: 999,
          color: '#f7d86a', fontSize: 11, fontWeight: 900,
          padding: '7px 10px', cursor: 'pointer',
          boxShadow: '0 0 14px rgba(212,175,55,.18)',
          backdropFilter: 'blur(8px)',
        }}
      >🏠 タイトルへ戻る</button>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 360 }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 900,
          color: '#d4af37', textAlign: 'center',
          textShadow: '0 0 20px rgba(212,175,55,0.6)', marginBottom: 4,
        }}>モード選択</div>
        <div style={{ textAlign: 'center', fontSize: 11, color: 'rgba(212,175,55,0.45)', marginBottom: 20 }}>
          プレイスタイルを選んでください
        </div>

        {/* ── 1人モード ── */}
        <div style={{
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(0,204,255,0.18)',
          borderRadius: 16, padding: '12px 12px 12px', marginBottom: 10,
        }}>
          <SectionLabel>🤖 1人モード</SectionLabel>
          <ModeButton
            icon="🤖"
            title="CPU対戦"
            desc="3体のCPUと1人で対戦"
            color="#00ccff"
            glow="rgba(0,204,255,0.35)"
            onClick={() => onSelect('cpu')}
          />
          <div style={{ height: 8 }} />
          <ModeButton icon="🎯" title="チャレンジモード" desc="特殊ルールの課題をCPU相手に攻略" color="#ff9f43" glow="rgba(255,159,67,0.35)" onClick={() => onSelect('challenge')} />
        </div>

        <div style={{ margin: '10px 0' }}>
          <AdMaxSlot size="320x50" />
        </div>

        {/* ── 対戦モード ── */}
        <div style={{
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(136,255,136,0.15)',
          borderRadius: 16, padding: '12px 12px 12px', marginBottom: 14,
        }}>
          <SectionLabel>⚔️ 対戦モード</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <ModeButton
              icon="🔗"
              title="フレンド対戦"
              desc="ルーム作成・参加、鍵部屋、招待URLコピー対応"
              color="#88ff88"
              glow="rgba(136,255,136,0.35)"
              onClick={() => onSelect('friend')}
            />
            <ModeButton
              icon="X"
              title="X募集対戦"
              desc="ルームIDを自動発行してXで対戦者を募集"
              color="#e8e8e8"
              glow="rgba(220,220,220,0.25)"
              onClick={() => onSelect('xshare')}
              isSvgIcon
            />
            <ModeButton
              icon="🔍"
              title="INMU PORTAL招待"
              desc="ポータルユーザーを検索して招待リストに追加"
              color="#d4af37"
              glow="rgba(212,175,55,0.3)"
              onClick={() => onSelect('portal')}
            />
            <ModeButton icon="🏆" title="大会モード" desc="4〜32人の暫定大会を設定して参加者を募集" color="#ffdd55" glow="rgba(255,221,85,0.35)" onClick={() => onSelect('tournament')} />
          </div>
        </div>
      </div>
    </div>
  )
}
