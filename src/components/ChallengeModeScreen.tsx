import React, { useEffect, useMemo, useState } from 'react'
import { DEFAULT_RULES, RulesConfig } from '../types/game'

export interface ChallengeSetup { id: string; level: number; rules: RulesConfig; opponents: string[]; targetHandCount: number; threatCount: number; description: string; minRank: '富豪' | '大富豪'; requiredEffect?: string; forbiddenEffect?: string }
interface Props { playerName: string; onStart: (setup: ChallengeSetup) => void; onBack: () => void }

const DAILY_LIMIT = 3
const RECOVERY_COST = 500
const PORTAL_BASE = ((import.meta as any).env?.VITE_PORTAL_URL || 'https://inmu-portal-lx-1--yasuhirot822.replit.app').replace(/\/$/, '')

function todayKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(new Date())
}

function storageKey(playerName: string) {
  return `inmu-challenge-attempts:${playerName || 'guest'}:${todayKey()}`
}

export function challengeProgressKey(playerName: string) {
  return `inmu-challenge-unlocked:${playerName || 'guest'}`
}

export async function saveChallengeProgress(playerName: string, level: number) {
  const response = await fetch('/api/challenge/progress', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: playerName, level }),
  })
  if (!response.ok && response.status !== 404) throw new Error(`Progress save failed: ${response.status}`)
}

function rulesForLevel(level: number): RulesConfig {
  return {
    ...DEFAULT_RULES,
    eightCut: level >= 6,
    shibari: level >= 11,
    kaidan: level >= 16,
    elevenBack: level >= 21,
    kakumei: level >= 31,
    miyakochi: level >= 41,
    nanaWatashi: level >= 46,
    junTen: level >= 51,
    supe3gaeshi: level >= 56,
    suitshibari: level >= 61,
    kinshiAgari: level >= 71,
  }
}

const TACTICS = [
  '弱いカードを温存して相手の単騎上がりを止める', '8切りの使用順を考えて主導権を奪う',
  'パスのタイミングを選び相手に場を渡さない', '同じ数字をまとめるか分けるか判断する',
  'ジョーカーを最後まで使わず逆転に備える', '革命を警戒して強いカードを切りすぎない',
  '11バック中の強弱逆転を利用して阻止する', '縛りを作って相手の出せるスートを減らす',
  '階段を崩すタイミングを考えて場を支配する', '禁止上がりを利用して相手の選択肢を削る',
]

function scenarioForLevel(level: number) {
  const targetHandCount = Math.max(1, 6 - Math.ceil(level / 20))
  const threatCount = level >= 61 ? 2 : 1
  const tactic = TACTICS[(level - 1) % TACTICS.length]
  const effects = [
    ...(level >= 6 ? ['8切り'] : []), ...(level >= 11 ? ['縛り'] : []),
    ...(level >= 16 ? ['階段'] : []), ...(level >= 21 ? ['11バック'] : []),
    ...(level >= 31 ? ['革命'] : []), ...(level >= 46 ? ['7渡し'] : []),
    ...(level >= 51 ? ['10捨て'] : []),
  ]
  const pattern = (level - 1) % 4
  const minRank: '富豪' | '大富豪' = pattern === 1 ? '大富豪' : '富豪'
  const requiredEffect = pattern === 2 && effects.length ? effects[(level - 1) % effects.length] : undefined
  const forbiddenEffect = pattern === 3 ? (effects.length ? effects[(level + 2) % effects.length] : 'ジョーカー') : undefined
  const condition = `${requiredEffect ? `${requiredEffect}を発動して` : ''}${forbiddenEffect ? `${forbiddenEffect}を使わず` : ''}${minRank === '大富豪' ? '大富豪（1位）' : '富豪以上（2位以内）'}で終了`
  return {
    targetHandCount,
    threatCount,
    minRank,
    requiredEffect,
    forbiddenEffect,
    description: `上がり目前のCPU${threatCount}人（残り${targetHandCount}枚）を警戒し、${tactic}。条件：${condition}。`,
  }
}

export default function ChallengeModeScreen({ playerName, onStart, onBack }: Props) {
  const localUnlocked = Math.min(100, Math.max(1, Number(localStorage.getItem(challengeProgressKey(playerName)) || 1)))
  const [unlockedLevel, setUnlockedLevel] = useState(localUnlocked)
  const [level, setLevel] = useState(localUnlocked)
  const [used, setUsed] = useState(() => Number(localStorage.getItem(storageKey(playerName)) || 0))
  const [message, setMessage] = useState('')
  const [recovering, setRecovering] = useState(false)
  const remaining = Math.max(0, DAILY_LIMIT - used)
  const rules = useMemo(() => rulesForLevel(level), [level])
  const opponents = useMemo(() => [1, 2, 3].map(n => `Lv.${level} CPU ${n}`), [level])
  const scenario = useMemo(() => scenarioForLevel(level), [level])

  useEffect(() => {
    fetch(`/api/challenge/progress?username=${encodeURIComponent(playerName)}`)
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (!data) return
        const remoteUnlocked = Math.min(100, Math.max(1, Number(data.highestUnlockedLevel) || 1))
        const merged = Math.max(localUnlocked, remoteUnlocked)
        setUnlockedLevel(merged)
        setLevel(merged)
        localStorage.setItem(challengeProgressKey(playerName), String(merged))
      }).catch(() => {})
  }, [playerName])

  function startChallenge() {
    if (remaining <= 0) return
    const next = used + 1
    localStorage.setItem(storageKey(playerName), String(next))
    setUsed(next)
    onStart({ id: `level-${level}`, level, rules, opponents, ...scenario })
  }

  async function recoverAttempts() {
    if (!playerName || playerName === 'プレイヤー') {
      setMessage('PORTAL連携ユーザーでログインしてください')
      return
    }
    setRecovering(true)
    setMessage('')
    try {
      const res = await fetch(`${PORTAL_BASE}/api/challenge-recovery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: playerName, game: 'INMU大富豪', points: RECOVERY_COST, date: todayKey() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      localStorage.setItem(storageKey(playerName), '0')
      setUsed(0)
      setMessage(`${RECOVERY_COST}ポイントで本日の挑戦回数を3回に回復しました`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '回数を回復できませんでした')
    } finally {
      setRecovering(false)
    }
  }

  const card: React.CSSProperties = { background: 'rgba(0,0,0,.36)', border: '1px solid rgba(255,159,67,.28)', borderRadius: 14, padding: 14 }
  return <div style={{ height: '100%', overflowY: 'auto', padding: '22px 16px', background: 'linear-gradient(180deg,#160d05,#090611)', color: '#f0e8d0' }}>
    <h2 style={{ color: '#ff9f43', textAlign: 'center', margin: '0 0 6px' }}>🎯 チャレンジモード</h2>
    <p style={{ textAlign: 'center', fontSize: 12, opacity: .65, marginBottom: 16 }}>難易度1〜100から選択・挑戦は全ステージ共通で1日3回</p>

    <div style={{ ...card, marginBottom: 12, textAlign: 'center' }}>
      <div style={{ fontSize: 12, opacity: .7 }}>本日の残り挑戦回数</div>
      <div style={{ fontSize: 30, color: remaining ? '#ffcf70' : '#ff6868', fontWeight: 900 }}>{remaining} / {DAILY_LIMIT}</div>
      <div style={{ fontSize: 10, opacity: .55 }}>開始した時点で1回消費します。失敗・再挑戦でも戻りません。</div>
    </div>

    <div style={{ ...card, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><strong>難易度</strong><strong style={{ color: '#ff9f43', fontSize: 26 }}>{level}</strong></div>
      <input aria-label="難易度" type="range" min="1" max={unlockedLevel} value={level} onChange={e => setLevel(Number(e.target.value))} style={{ width: '100%', accentColor: '#ff9f43' }} />
      <input type="number" min="1" max={unlockedLevel} value={level} onChange={e => setLevel(Math.min(unlockedLevel, Math.max(1, Number(e.target.value) || 1)))} style={{ width: '100%', boxSizing: 'border-box', padding: 10, borderRadius: 9, border: '1px solid #74451f', background: '#130d09', color: '#fff', textAlign: 'center', fontWeight: 800 }} />
      <div style={{ marginTop: 8, fontSize: 11, color: '#ffcf70', textAlign: 'center' }}>現在の最高解放：難易度 {unlockedLevel} ／ 100</div>
      <div style={{ marginTop: 10, padding: 10, borderRadius: 9, background: 'rgba(255,159,67,.1)', fontSize: 12, lineHeight: 1.6 }}>{scenario.description}</div>
      <div style={{ marginTop: 10, fontSize: 11, opacity: .65 }}>レベルが上がるほど8切り・縛り・階段・11バック・革命などのルールが段階的に追加されます。</div>
    </div>

    <details style={{ ...card, marginBottom: 12 }}>
      <summary style={{ cursor: 'pointer', fontWeight: 800, color: '#ffcf70' }}>難易度1〜100の縛り内容を見る</summary>
      <div style={{ marginTop: 10, maxHeight: 260, overflowY: 'auto' }}>
        {Array.from({ length: 100 }, (_, index) => index + 1).map(itemLevel => {
          const item = scenarioForLevel(itemLevel)
          return <div key={itemLevel} style={{ padding: '8px 2px', borderBottom: '1px solid rgba(255,255,255,.08)', fontSize: 11, lineHeight: 1.55, opacity: itemLevel <= unlockedLevel ? 1 : .48 }}>
            <strong style={{ color: itemLevel === level ? '#ff9f43' : '#f0e8d0' }}>Lv.{itemLevel}</strong> {item.description}
          </div>
        })}
      </div>
    </details>

    <button disabled={!remaining} onClick={startChallenge} style={{ width: '100%', padding: 14, border: 0, borderRadius: 12, background: remaining ? 'linear-gradient(135deg,#ff9f43,#d46b18)' : '#463a32', fontWeight: 900, cursor: remaining ? 'pointer' : 'not-allowed' }}>難易度 {level} に挑戦する（1回消費）</button>
    {remaining === 0 && <button disabled={recovering} onClick={recoverAttempts} style={{ width: '100%', padding: 13, marginTop: 9, borderRadius: 12, color: '#ffe0a8', background: 'rgba(212,175,55,.12)', border: '1px solid #d4af37', cursor: 'pointer', fontWeight: 800 }}>{recovering ? '処理中…' : `PORTAL ${RECOVERY_COST}ポイントで3回回復`}</button>}
    {message && <div style={{ marginTop: 9, fontSize: 11, textAlign: 'center', color: message.includes('回復しました') ? '#88ff88' : '#ff8888' }}>{message}</div>}
    <button onClick={onBack} style={{ width: '100%', padding: 11, marginTop: 9, borderRadius: 12, color: '#aaa', background: 'transparent', border: '1px solid #333', cursor: 'pointer' }}>戻る</button>
  </div>
}
