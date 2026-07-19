import React, { useState } from 'react'
import { DEFAULT_RULES, RulesConfig } from '../types/game'

export interface ChallengeSetup { id: string; rules: RulesConfig; opponents: string[] }
interface Props { onStart: (setup: ChallengeSetup) => void; onBack: () => void }

const CHALLENGES = [
  { id: 'rookie', title: 'ビギナーチャレンジ', desc: '縛りなし。まずは大富豪を目指そう', rules: { ...DEFAULT_RULES, shibari: false, suitshibari: false } },
  { id: 'revolution', title: '革命サバイバル', desc: '革命・11バック・都落ちありの逆転勝負', rules: { ...DEFAULT_RULES, kakumei: true, elevenBack: true, miyakochi: true } },
  { id: 'inmu', title: 'INMUマスター', desc: 'すべての特殊ルールが有効な最高難度', rules: { ...DEFAULT_RULES, suitshibari: true } },
]

export default function ChallengeModeScreen({ onStart, onBack }: Props) {
  const [challengeId, setChallengeId] = useState(CHALLENGES[0].id)
  const challenge = CHALLENGES.find(c => c.id === challengeId)!
  const opponents = ['CPU 1', 'CPU 2', 'CPU 3']

  return <div style={{ height: '100%', overflowY: 'auto', padding: '22px 16px', background: 'linear-gradient(180deg,#160d05,#090611)', color: '#f0e8d0' }}>
    <h2 style={{ color: '#ff9f43', textAlign: 'center', margin: '0 0 6px' }}>🎯 チャレンジモード</h2>
    <p style={{ textAlign: 'center', fontSize: 12, opacity: .6, marginBottom: 20 }}>特殊ルールの課題をCPU相手に攻略</p>
    {CHALLENGES.map(c => <button key={c.id} onClick={() => setChallengeId(c.id)} style={{ width: '100%', textAlign: 'left', padding: 14, marginBottom: 9, borderRadius: 12, cursor: 'pointer', color: '#f0e8d0', background: challengeId === c.id ? 'rgba(255,159,67,.18)' : 'rgba(255,255,255,.05)', border: `1px solid ${challengeId === c.id ? '#ff9f43' : 'rgba(255,255,255,.12)'}` }}><strong>{c.title}</strong><div style={{ fontSize: 11, opacity: .6, marginTop: 4 }}>{c.desc}</div></button>)}
    <div style={{ fontSize: 11, opacity: .55, margin: '16px 0 18px', textAlign: 'center' }}>対戦相手：CPU 1・CPU 2・CPU 3</div>
    <button onClick={() => onStart({ id: challenge.id, rules: challenge.rules, opponents: opponents.slice(0, 3) })} style={{ width: '100%', padding: 14, border: 0, borderRadius: 12, background: 'linear-gradient(135deg,#ff9f43,#d46b18)', fontWeight: 900, cursor: 'pointer' }}>チャレンジ開始</button>
    <button onClick={onBack} style={{ width: '100%', padding: 11, marginTop: 9, borderRadius: 12, color: '#aaa', background: 'transparent', border: '1px solid #333', cursor: 'pointer' }}>戻る</button>
  </div>
}
