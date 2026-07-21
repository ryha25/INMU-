import React, { useEffect, useMemo, useState } from 'react'
import { DEFAULT_RULES, RulesConfig } from '../types/game'

export type ChallengeScenario = 'lastStand' | 'cpuStrong' | 'cpuRevolution' | 'weakHand' | 'effectRequired' | 'effectForbidden' | 'doubleThreat' | 'reverseTrap' | 'lockedHand' | 'finalBoss' | 'sniperRush' | 'doubleSiege' | 'mirrorBattle' | 'curseCombo' | 'bruteForce'
export interface ChallengeSetup { id: string; level: number; rules: RulesConfig; opponents: string[]; targetHandCount: number; threatCount: number; playerHandicap: number; scenarioType: ChallengeScenario; description: string; minRank: '富豪' | '大富豪'; requiredEffect?: string; forbiddenEffect?: string }
interface Props { playerName: string; onStart: (setup: ChallengeSetup) => void; onBack: () => void }

const DAILY_LIMIT = 3
const RECOVERY_COST = 500

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
    elevenBack: level >= 8,
    kakumei: level >= 3,
    miyakochi: level >= 41,
    nanaWatashi: level >= 46,
    junTen: level >= 51,
    supe3gaeshi: level >= 56,
    suitshibari: level >= 61,
    kinshiAgari: level >= 71,
  }
}

function scenarioForLevel(level: number) {
  const ROTATION: ChallengeScenario[] = [
    'lastStand', 'cpuStrong', 'cpuRevolution', 'weakHand', 'effectRequired',
    'effectForbidden', 'doubleThreat', 'reverseTrap', 'lockedHand', 'finalBoss',
    'sniperRush', 'doubleSiege', 'mirrorBattle', 'curseCombo', 'bruteForce',
  ]
  const scenarioType = ROTATION[(level - 1) % 15]
  const cycle = Math.floor((level - 1) / 15) // 難易度サイクル（0始まり）

  // 脅威CPU枚数：レベルとシナリオで決定
  const targetHandCount =
    scenarioType === 'finalBoss' ? Math.max(5, 8 - cycle) :
    scenarioType === 'bruteForce' ? Math.max(3, 5 - cycle) :
    scenarioType === 'sniperRush' ? Math.max(2, 4 - cycle) :
    scenarioType === 'cpuRevolution' ? Math.max(5, 7 - cycle) :
    scenarioType === 'cpuStrong' || scenarioType === 'lockedHand' || scenarioType === 'doubleSiege' ? Math.max(4, 6 - cycle) :
    Math.max(1, 5 - Math.floor(level / 25))

  // 脅威CPUの人数
  const threatCount =
    scenarioType === 'doubleThreat' || scenarioType === 'finalBoss' || scenarioType === 'doubleSiege' || scenarioType === 'bruteForce' || level >= 76 ? 2 :
    scenarioType === 'mirrorBattle' ? 0 : 1

  // プレイヤーハンデ（Lv21以降。curseCombo/weakHandは追加ハンデ）
  const baseHandicap = Math.floor((level - 1) / 20)
  const extraHandicap = (scenarioType === 'curseCombo' || scenarioType === 'weakHand') && level >= 31 ? 1 : 0
  const playerHandicap = baseHandicap + extraHandicap

  // エフェクトリスト（ルール解禁に連動）
  const effects = [
    ...(level >= 6 ? ['8切り'] : []), ...(level >= 11 ? ['縛り'] : []),
    ...(level >= 16 ? ['階段'] : []), ...(level >= 21 ? ['11バック'] : []),
    ...(level >= 31 ? ['革命'] : []), ...(level >= 46 ? ['7渡し'] : []),
    ...(level >= 51 ? ['10捨て'] : []),
  ]

  // 最低ランク要件
  const strictScenarios: ChallengeScenario[] = ['cpuStrong', 'finalBoss', 'doubleSiege', 'bruteForce']
  const minRank: '富豪' | '大富豪' =
    strictScenarios.includes(scenarioType) || level % 5 === 0 ? '大富豪' : '富豪'

  // エフェクト関連
  const requiredEffect = scenarioType === 'effectRequired' && effects.length
    ? effects[(level - 1) % effects.length] : undefined
  // curseCombo も effectForbidden と同様に禁止エフェクトを使う
  const forbiddenEffect = (scenarioType === 'effectForbidden' || scenarioType === 'curseCombo')
    ? (effects.length ? effects[(level + 3) % effects.length] : 'ジョーカー') : undefined

  const handicapText = playerHandicap > 0 ? ` 強いカード${playerHandicap}枚を没収される。` : ''
  const mission = minRank === '大富豪' ? '条件を崩さず1位を奪え！' : '富豪以上で切り抜けろ！'

  const briefing: Record<ChallengeScenario, string> = {
    lastStand: `CPUが残り${targetHandCount}枚。上がり札を読んで、切り札を先に使わせろ。`,
    cpuStrong: 'CPUの手札は2・A・K級ばかり。弱い札で場を作り、強さをひっくり返せ。',
    cpuRevolution: `CPUは同じ数字4枚を持ち革命を狙う（残り${targetHandCount}枚）。革命後の逆転を読んで先手を打て。`,
    weakHand: 'あなたの手札は弱い数字に偏る。相手同士を消耗させ、最後に抜け出せ。',
    effectRequired: `${requiredEffect || '特殊ルール'}を一度成立させること。必要札を残して勝ち筋につなげろ。`,
    effectForbidden: `${forbiddenEffect || 'ジョーカー'}は禁止。頼れる切り札を封じたまま別の上がり筋を作れ。`,
    doubleThreat: `残り${targetHandCount}枚のCPUが2人。片方だけでなく、両方の上がり札を止めろ。`,
    reverseTrap: 'CPUは11バックや革命で強弱を反転させてくる。今どの数字が強いかを読み違えるな。',
    lockedHand: '強弱が極端な指定手札。強札を浪費せず、ペアと階段へ組み替えろ。',
    finalBoss: '強札CPUと革命CPUが同時に迫る総合戦。禁止上がりにも注意して大富豪を取れ。',
    sniperRush: `強化された1体のCPUが残り${targetHandCount}枚で待ち伏せ。猛烈な速攻を止めながら逆転をつかめ。`,
    doubleSiege: `強い手を持つCPUが${targetHandCount}枚で2人同時に攻めてくる。包囲を崩せ。`,
    mirrorBattle: 'CPUとあなたが対等な手札で激突する純粋な実力戦。ルールと読みだけが勝負を分ける。',
    curseCombo: `弱い手札 ＋ ${forbiddenEffect || 'ジョーカー'}禁止の二重縛り。逆境から突破口を見つけろ。`,
    bruteForce: `3体のCPUが${targetHandCount}枚で一斉に終盤を仕掛けてくる。スピード差で制圧されるな。`,
  }

  return {
    targetHandCount,
    threatCount,
    playerHandicap,
    scenarioType,
    minRank,
    requiredEffect,
    forbiddenEffect,
    description: `${briefing[scenarioType]}${handicapText} ミッション：${mission}`,
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
      const res = await fetch('/api/portal/challenge-recovery', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: 'INMU大富豪', points: RECOVERY_COST, date: todayKey() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      localStorage.setItem(storageKey(playerName), '0')
      setUsed(0)
      setMessage(`${RECOVERY_COST}ポイントで挑戦回数が3回に戻りました！`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '回数を回復できませんでした')
    } finally {
      setRecovering(false)
    }
  }

  const card: React.CSSProperties = { background: 'rgba(0,0,0,.36)', border: '1px solid rgba(255,159,67,.28)', borderRadius: 14, padding: 14 }
  return <div style={{ height: '100%', overflowY: 'auto', padding: '22px 16px', background: 'linear-gradient(180deg,#160d05,#090611)', color: '#f0e8d0' }}>
    <h2 style={{ color: '#ff9f43', textAlign: 'center', margin: '0 0 6px' }}>🎯 チャレンジモード</h2>
    <p style={{ textAlign: 'center', fontSize: 12, opacity: .65, marginBottom: 16 }}>ミッションを順番にクリアして、Lv.100を目指そう！</p>

    <div style={{ ...card, marginBottom: 12, textAlign: 'center' }}>
      <div style={{ fontSize: 12, opacity: .7 }}>本日の残り挑戦回数</div>
      <div style={{ fontSize: 30, color: remaining ? '#ffcf70' : '#ff6868', fontWeight: 900 }}>{remaining} / {DAILY_LIMIT}</div>
      <div style={{ fontSize: 10, opacity: .55 }}>遊び始めると1回消費。今日の3回を大切に！</div>
    </div>

    <div style={{ ...card, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><strong>難易度</strong><strong style={{ color: '#ff9f43', fontSize: 26 }}>{level}</strong></div>
      <input aria-label="難易度" type="range" min="1" max={unlockedLevel} value={level} onChange={e => setLevel(Number(e.target.value))} style={{ width: '100%', accentColor: '#ff9f43' }} />
      <input type="number" min="1" max={unlockedLevel} value={level} onChange={e => setLevel(Math.min(unlockedLevel, Math.max(1, Number(e.target.value) || 1)))} style={{ width: '100%', boxSizing: 'border-box', padding: 10, borderRadius: 9, border: '1px solid #74451f', background: '#130d09', color: '#fff', textAlign: 'center', fontWeight: 800 }} />
      <div style={{ marginTop: 8, fontSize: 11, color: '#ffcf70', textAlign: 'center' }}>いま遊べる最高レベル：{unlockedLevel} ／ 100</div>
      <div style={{ marginTop: 10, padding: 10, borderRadius: 9, background: 'rgba(255,159,67,.1)', fontSize: 12, lineHeight: 1.6 }}>{scenario.description}</div>
      <div style={{ marginTop: 10, fontSize: 11, opacity: .65 }}>レベルアップすると、8切り・縛り・革命など新しい仕掛けがどんどん登場！</div>
    </div>

    <details style={{ ...card, marginBottom: 12 }}>
      <summary style={{ cursor: 'pointer', fontWeight: 800, color: '#ffcf70' }}>Lv.1〜100のミッションを見る</summary>
      <div style={{ marginTop: 10, maxHeight: 260, overflowY: 'auto' }}>
        {Array.from({ length: 100 }, (_, index) => index + 1).map(itemLevel => {
          const item = scenarioForLevel(itemLevel)
          return <div key={itemLevel} style={{ padding: '8px 2px', borderBottom: '1px solid rgba(255,255,255,.08)', fontSize: 11, lineHeight: 1.55, opacity: itemLevel <= unlockedLevel ? 1 : .48 }}>
            <strong style={{ color: itemLevel === level ? '#ff9f43' : '#f0e8d0' }}>Lv.{itemLevel}</strong> {item.description}
          </div>
        })}
      </div>
    </details>

    <button disabled={!remaining} onClick={startChallenge} style={{ width: '100%', padding: 14, border: 0, borderRadius: 12, background: remaining ? 'linear-gradient(135deg,#ff9f43,#d46b18)' : '#463a32', fontWeight: 900, cursor: remaining ? 'pointer' : 'not-allowed' }}>Lv.{level} ミッション開始！（挑戦回数を1回使う）</button>
    {remaining === 0 && <button disabled={recovering} onClick={recoverAttempts} style={{ width: '100%', padding: 13, marginTop: 9, borderRadius: 12, color: '#ffe0a8', background: 'rgba(212,175,55,.12)', border: '1px solid #d4af37', cursor: 'pointer', fontWeight: 800 }}>{recovering ? '回復中…' : `${RECOVERY_COST} PORTALポイントで3回復活！`}</button>}
    {message && <div style={{ marginTop: 9, fontSize: 11, textAlign: 'center', color: message.includes('回復しました') ? '#88ff88' : '#ff8888' }}>{message}</div>}
    <button onClick={onBack} style={{ width: '100%', padding: 11, marginTop: 9, borderRadius: 12, color: '#aaa', background: 'transparent', border: '1px solid #333', cursor: 'pointer' }}>戻る</button>
  </div>
}
