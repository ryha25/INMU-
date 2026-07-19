import React, { useMemo, useState } from 'react'

interface Props { onOpenRoom: (participantCount: number) => void; onPortalInvite: (participantCount: number) => void; onBack: () => void }

export default function TournamentModeScreen({ onOpenRoom, onPortalInvite, onBack }: Props) {
  const [participantCount, setParticipantCount] = useState(8)
  const tables = useMemo(() => {
    const result: number[][] = []
    for (let i = 0; i < participantCount; i += 4) result.push(Array.from({ length: Math.min(4, participantCount - i) }, (_, j) => i + j + 1))
    return result
  }, [participantCount])
  const nextRoundCount = Math.max(1, Math.ceil(participantCount / 4))
  const button: React.CSSProperties = { width: '100%', padding: 13, marginBottom: 9, borderRadius: 12, cursor: 'pointer', color: '#f0e8d0', background: 'rgba(255,221,85,.1)', border: '1px solid rgba(255,221,85,.45)', textAlign: 'left' }

  return <div style={{ height: '100%', overflowY: 'auto', padding: '22px 18px', background: 'linear-gradient(180deg,#171304,#08080f)', color: '#f0e8d0' }}>
    <h2 style={{ textAlign: 'center', color: '#ffdd55', marginBottom: 4 }}>🏆 大会モード（暫定版）</h2>
    <p style={{ textAlign: 'center', fontSize: 12, opacity: .6, lineHeight: 1.7 }}>参加人数を4〜32人で設定し、4人卓へ振り分けます。</p>
    <label style={{ display: 'block', margin: '18px 0 8px', color: '#d4af37', fontWeight: 700 }}>参加人数：{participantCount}人</label>
    <input type="range" min={4} max={32} step={1} value={participantCount} onChange={e => setParticipantCount(Number(e.target.value))} style={{ width: '100%', accentColor: '#ffdd55' }} />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 7, margin: '15px 0' }}>
      {tables.map((players, index) => <div key={index} style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,221,85,.2)', borderRadius: 9, padding: 9, fontSize: 11 }}><strong style={{ color: '#ffdd55' }}>第{index + 1}卓</strong><div style={{ opacity: .65, marginTop: 4 }}>{players.map(n => `P${n}`).join('・')}</div></div>)}
    </div>
    <div style={{ padding: 11, marginBottom: 14, borderRadius: 10, background: 'rgba(255,255,255,.04)', fontSize: 11, opacity: .7, lineHeight: 1.7 }}>予選 {tables.length}卓／各卓1位が次ラウンドへ（{nextRoundCount}人）。4人未満の最終卓は空き枠をCPUで補充します。</div>
    <button onClick={() => onPortalInvite(participantCount)} style={button}><strong>INMU PORTALで参加者を募集</strong><div style={{ fontSize: 10, opacity: .6, marginTop: 3 }}>{participantCount}人大会の招待ルームを作成</div></button>
    <button onClick={() => onOpenRoom(participantCount)} style={button}><strong>ルームIDで大会を開始</strong><div style={{ fontSize: 10, opacity: .6, marginTop: 3 }}>まず第1卓の4人ルームを作成</div></button>
    <button onClick={onBack} style={{ ...button, textAlign: 'center', borderColor: '#333', background: 'transparent' }}>戻る</button>
  </div>
}
