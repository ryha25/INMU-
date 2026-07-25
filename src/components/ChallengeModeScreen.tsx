import React, { useEffect, useMemo, useState } from 'react'
import { DEFAULT_RULES, RulesConfig } from '../types/game'

export type ChallengeScenario = 'lastStand' | 'cpuStrong' | 'cpuRevolution' | 'weakHand' | 'effectRequired' | 'effectForbidden' | 'doubleThreat' | 'reverseTrap' | 'lockedHand' | 'finalBoss' | 'sniperRush' | 'doubleSiege' | 'mirrorBattle' | 'curseCombo' | 'bruteForce'
export interface ChallengeSetup {
  id: string
  level: number
  rules: RulesConfig
  opponents: string[]
  targetHandCount: number
  threatCount: number
  playerHandicap: number
  scenarioType: ChallengeScenario
  description: string
  minRank: '富豪' | '大富豪'
  requiredEffect?: string
  forbiddenEffect?: string
  cpuHasJoker?: boolean
  initialShibariSuit?: 'spades' | 'hearts' | 'diamonds' | 'clubs'
  // 初期盤面
  initialFieldValue?: number    // 初期場のカード強さ（ランク値）
  initialFieldCount?: number    // 初期場の枚数
  initialFieldStairs?: boolean  // 階段状態か
  // 制限
  maxPlayerPasses?: number      // パス上限（nullは無制限）
  maxTurns?: number             // ターン上限（nullは無制限）
  // 禁止ルール
  forbidPairs?: boolean         // ペア・複数枚出し禁止
  forbidStairs?: boolean        // 階段出し禁止
}
interface Props { playerName: string; onStart: (setup: ChallengeSetup) => void; onBack: () => void }
interface RankingEntry { position: number; username: string; highestClearedLevel: number; isCurrentUser?: boolean }

const DAILY_LIMIT = 3
const RECOVERY_COST = 500

function todayKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(new Date())
}

function storageKey(playerName: string) {
  return `inmu-challenge-attempts:${playerName || 'guest'}:${todayKey()}`
}

export function compensateChallengeAttempt(playerName: string) {
  const key = storageKey(playerName)
  const used = Math.max(0, Number(localStorage.getItem(key) || 0) - 1)
  localStorage.setItem(key, String(used))
  window.dispatchEvent(new CustomEvent('inmu-challenge-attempts-updated', { detail: { used } }))
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
  type Cfg = {
    s: ChallengeScenario
    t: number             // targetHandCount
    th: number            // threatCount
    h: number             // playerHandicap
    r: '富豪' | '大富豪'  // minRank
    req?: string          // requiredEffect
    ban?: string          // forbiddenEffect
    d: string             // description
    fv?: number           // initialFieldValue
    fc?: number           // initialFieldCount (default 1)
    fs?: boolean          // initialFieldStairs
    pass?: number         // maxPlayerPasses
    turn?: number         // maxTurns
    np?: boolean          // forbidPairs
    ns?: boolean          // forbidStairs
    cj?: boolean          // CPU1にジョーカーを保証
    suit?: 'spades' | 'hearts' | 'diamonds' | 'clubs'
  }

  const L: Partial<Record<number, Cfg>> = {
    // ── Lv 1〜10: 基本 ───────────────────────────────────────────────
    1:  { s:'lastStand',     t:9,  th:1, h:0, r:'富豪',   d:'CPU1人・弱い。通常ルールで1位を取ろう。' },
    2:  { s:'mirrorBattle',  t:10, th:1, h:0, r:'富豪',   d:'CPU1人。ペアを意識した手で先手を取れ。' },
    3:  { s:'lastStand',     t:9,  th:1, h:0, r:'富豪',   fv:5, fc:1, d:'🗂場に5が出た状態からスタート。6以上の合法手で応答しろ。' },
    4:  { s:'effectRequired',t:9,  th:1, h:0, r:'富豪',   req:'8切り',          d:'8切りを1回発動させながら1位になれ。' },
    5:  { s:'lastStand',     t:7,  th:1, h:0, r:'大富豪', d:'CPU1人と対等勝負。正確に手を組んで1位を取れ。' },
    6:  { s:'effectRequired',t:10, th:1, h:0, r:'富豪',   req:'階段',           d:'階段を1回以上出して1位になれ。' },
    7:  { s:'effectRequired',t:10, th:1, h:0, r:'富豪',   req:'革命',           d:'4枚組で革命を起こして強弱を逆転させ、1位を取れ。' },
    8:  { s:'cpuRevolution', t:10, th:1, h:0, r:'富豪',   d:'💥革命中スタート。弱いカードが強い状態から1位を目指せ。' },
    9:  { s:'sniperRush',    t:9,  th:1, h:0, r:'富豪',   req:'ジョーカー',     d:'ジョーカーを使って1位になれ。♠3返しを意識しながら制圧しろ。' },
    10: { s:'doubleThreat',  t:10, th:2, h:0, r:'富豪',   d:'CPU2人。2方向からの上がりを同時に抑えながら先頭に立て。' },
    // ── Lv 11〜20: 手札制限 ──────────────────────────────────────────
    11: { s:'lastStand',     t:10, th:1, h:0, r:'富豪',   np:true,  d:'✋ペア・複数枚出し禁止。1枚ずつ出して1位を取れ。' },
    12: { s:'lastStand',     t:10, th:1, h:0, r:'富豪',   ns:true,  d:'✋階段出し禁止。ペアと単体カードだけで突破しろ。' },
    13: { s:'effectRequired',t:10, th:1, h:0, r:'富豪',   req:'ジョーカー',     d:'ジョーカーを温存して最後に使えるか？手順が問われる。' },
    14: { s:'effectForbidden',t:10,th:1, h:0, r:'富豪',   ban:'7渡し',          d:'7渡し禁止。7を使った手渡しはできない。別の手筋で勝て。' },
    15: { s:'effectForbidden',t:10,th:1, h:0, r:'富豪',   ban:'8切り',          d:'8切り禁止。数字の強さだけで組み立てて突破しろ。' },
    16: { s:'effectForbidden',t:10,th:1, h:0, r:'富豪',   ban:'革命',           d:'革命禁止。4枚組は崩して使え。通常の強弱で戦い抜け。' },
    17: { s:'mirrorBattle',  t:10, th:1, h:0, r:'富豪',   pass:5,   d:'⛔パスは5回まで。強制パスを挟みつつ、攻め時を見極めろ。' },
    18: { s:'lockedHand',    t:10, th:1, h:0, r:'富豪',   d:'偏った手札。同じ数字に頼らず手を組み替えて活路を開け。' },
    19: { s:'lastStand',     t:7,  th:1, h:0, r:'富豪',   d:'CPU1人。確実に手を組んで制圧しろ。' },
    20: { s:'doubleThreat',  t:9,  th:2, h:0, r:'大富豪', np:true,  d:'CPU2人・✋ペア禁止。1枚ずつ2人の上がりを封じろ。' },
    // ── Lv 21〜30: 初期盤面 ──────────────────────────────────────────
    21: { s:'lastStand',     t:9,  th:1, h:0, r:'富豪',   fv:4,  fc:1,         d:'🗂場に4が出た状態からスタート。5以上の合法手で応じろ。' },
    22: { s:'lastStand',     t:9,  th:1, h:0, r:'富豪',   fv:9,  fc:1,         d:'🗂場に9が出た状態からスタート。10以上で上書きしろ。' },
    23: { s:'curseCombo',    t:9,  th:1, h:0, r:'富豪',   ban:'7渡し', suit:'hearts', d:'ハート縛り＋7渡し禁止。縛りを維持しながら上がり筋を作れ。' },
    24: { s:'cpuRevolution', t:9,  th:1, h:1, r:'富豪',   d:'💥革命中スタート＋強カード1枚没収。逆境から突破しろ。' },
    25: { s:'lastStand',     t:9,  th:1, h:0, r:'富豪',   d:'CPUが先行する構成。初動で必ず対応できる合法手を持て。' },
    26: { s:'lastStand',     t:7,  th:1, h:0, r:'大富豪', d:'CPU1人と1対1。一手の遅れが致命傷。上がり筋を先読みしろ。' },
    27: { s:'doubleThreat',  t:9,  th:1, h:0, r:'富豪',   fv:7,  fc:2,         d:'🗂場に7のペアが出た状態。8以上のペアで反撃しろ。' },
    28: { s:'effectRequired',t:9,  th:1, h:0, r:'富豪',   req:'階段', fv:7, fc:3, fs:true, d:'🗂場に5-6-7の階段あり。より強い3枚階段で上書きして制圧しろ。' },
    29: { s:'lockedHand',    t:9,  th:1, h:0, r:'富豪',   suit:'spades',        d:'スペード縛り状態から開始。縛りを継続するか切るかを見極めろ。' },
    30: { s:'cpuRevolution', t:9,  th:2, h:0, r:'大富豪', d:'💥革命中・CPU2人。強弱逆転の盤面で大富豪を取れ。' },
    // ── Lv 31〜40: 枚数差 ────────────────────────────────────────────
    31: { s:'lastStand',     t:9,  th:1, h:0, r:'富豪',   d:'CPU9枚。枚数差を活かして先手で制圧しろ。' },
    32: { s:'lastStand',     t:9,  th:1, h:0, r:'富豪',   d:'CPU9枚。手牌を丁寧に使い切れ。無駄打ちは禁物。' },
    33: { s:'lastStand',     t:7,  th:1, h:0, r:'富豪',   d:'CPU1人。先読みで差を広げろ。' },
    34: { s:'lastStand',     t:9,  th:1, h:1, r:'富豪',   d:'強カード1枚没収。油断するな。' },
    35: { s:'lastStand',     t:7,  th:1, h:0, r:'富豪',   d:'CPU1人。少ない手数で勝ちに行け。' },
    36: { s:'doubleThreat',  t:9,  th:2, h:0, r:'富豪',   d:'CPU2人・各9枚。2方向を同時に見て崩せ。' },
    37: { s:'lastStand',     t:7,  th:1, h:0, r:'大富豪', d:'CPU1人。1手の遅れが命取り。先手を維持しろ。' },
    38: { s:'doubleThreat',  t:7,  th:1, h:0, r:'大富豪', d:'CPU1人。先手を取り続けて制圧しろ。' },
    39: { s:'lastStand',     t:7,  th:1, h:0, r:'大富豪', d:'CPU1人。手を冷静に読み切れ。' },
    40: { s:'doubleSiege',   t:10, th:2, h:0, r:'大富豪', ns:true,  d:'強CPU2人・各10枚・✋階段禁止。包囲を突き破れ。' },
    // ── Lv 41〜50: 特殊クリア条件 ────────────────────────────────────
    41: { s:'effectRequired',t:9,  th:1, h:0, r:'富豪',   req:'8切り',          d:'8切りを1回以上使って1位になること。' },
    42: { s:'effectRequired',t:9,  th:1, h:0, r:'富豪',   req:'革命',           d:'革命を1回起こして1位になること。' },
    43: { s:'effectForbidden',t:9, th:1, h:0, r:'大富豪', ban:'ジョーカー',     d:'ジョーカーを一度も使わず1位になれ。' },
    44: { s:'lastStand',     t:9,  th:1, h:0, r:'富豪',   pass:2,   d:'⛔パス2回以内で1位になれ。無駄なパスは失敗のもと。' },
    45: { s:'lastStand',     t:9,  th:1, h:0, r:'富豪',   turn:20,  d:'⏱20ターン以内に1位になれ。長引くと失敗。' },
    46: { s:'effectRequired',t:9,  th:1, h:0, r:'富豪',   req:'7渡し',          d:'7渡しを1回発動させて1位になれ。タイミングが重要。' },
    47: { s:'effectRequired',t:9,  th:1, h:0, r:'富豪',   req:'縛り',           d:'縛りを成立させながら1位になれ。スートを揃えて出せ。' },
    48: { s:'effectRequired',t:9,  th:1, h:0, r:'富豪',   req:'階段',           d:'階段を1回以上使って1位になること。手の組み方が鍵。' },
    49: { s:'sniperRush',    t:9,  th:1, h:0, r:'大富豪', cj:true,              d:'CPUはジョーカーを持つ。♠3を温存して返し上がりを狙え。' },
    50: { s:'effectRequired',t:9,  th:1, h:1, r:'大富豪', req:'革命',           d:'革命を達成して1位になれ。強カード1枚没収あり。' },
    // ── Lv 51〜60: 複合ルール初級 ─────────────────────────────────────
    51: { s:'cpuRevolution', t:9,  th:1, h:0, r:'富豪',   ns:true,  d:'💥革命中スタート・✋階段禁止。単体・ペアだけで突破しろ。' },
    52: { s:'lastStand',     t:7,  th:1, h:0, r:'富豪',   ban:'8切り',          d:'8切り禁止。別の手筋で先頭を取れ。' },
    53: { s:'lastStand',     t:9,  th:1, h:0, r:'富豪',   fv:10, fc:1,          d:'🗂場に10が出た状態。J以上の合法手で押し切れ。' },
    54: { s:'doubleThreat',  t:9,  th:2, h:0, r:'富豪',   ban:'ジョーカー',     d:'CPU2人・ジョーカー禁止。最強切り札なしで2人抜けるか。' },
    55: { s:'curseCombo',    t:9,  th:1, h:0, r:'富豪',   ban:'7渡し', suit:'hearts', turn:20, d:'ハート縛り状態から開始・7渡し禁止。⏱20ターン以内に早期決着を。' },
    56: { s:'lastStand',     t:9,  th:1, h:1, r:'富豪',   np:true,  d:'強カード1枚没収・✋ペア禁止。1枚ずつ突破しろ。' },
    57: { s:'doubleThreat',  t:9,  th:2, h:0, r:'富豪',   ban:'革命',           d:'CPU2人・革命禁止。4枚組は崩して別の手筋を使え。' },
    58: { s:'effectForbidden',t:9, th:1, h:0, r:'富豪',   ban:'ジョーカー', fv:8, fc:1, d:'🗂場に8が出ている状態・ジョーカー禁止。Jや強数字で対応しろ。' },
    59: { s:'lastStand',     t:7,  th:1, h:0, r:'大富豪', d:'CPU1人。パスを最小限にして制圧しろ。' },
    60: { s:'cpuRevolution', t:10, th:2, h:0, r:'大富豪', ns:true, turn:40, d:'💥CPU2人・革命中・✋階段禁止・⏱40ターン以内。素早く大富豪を取れ。' },
    // ── Lv 61〜70: CPU戦術強化（難易度：強い） ────────────────────────
    61: { s:'mirrorBattle',  t:10, th:1, h:1, r:'富豪',   turn:25,              d:'強カード没収・⏱25T。純粋な実力で制せ。' },
    62: { s:'doubleThreat',  t:9,  th:2, h:1, r:'富豪',                         d:'CPU2人・強カード没収。2方向を読みながら上がれ。' },
    63: { s:'cpuStrong',     t:10, th:1, h:1, r:'富豪',   ban:'7渡し',          d:'7渡し禁止・強カード没収。純粋な手の強さで崩せ。' },
    64: { s:'cpuRevolution', t:9,  th:1, h:1, r:'富豪',   pass:4,               d:'強カード没収・⛔パス4回まで。革命前後を正確に読め。' },
    65: { s:'doubleThreat',  t:9,  th:2, h:1, r:'大富豪', turn:25,              d:'CPU2人・強カード没収・⏱25T。残り1枚まで気を抜くな。' },
    66: { s:'cpuStrong',     t:9,  th:1, h:1, r:'富豪',   ban:'ジョーカー',     d:'JK禁止・強カード没収。JK温存相手を手札だけで崩せ。' },
    67: { s:'doubleSiege',   t:10, th:2, h:1, r:'大富豪', turn:20,              d:'CPU2人・強カード没収・⏱20T。役を崩すタイミングを読み切れ。' },
    68: { s:'lastStand',     t:9,  th:1, h:1, r:'大富豪', pass:3,  turn:20,     d:'強カード没収・⛔パス3回・⏱20T。逆境を突き抜けろ。' },
    69: { s:'cpuRevolution', t:9,  th:2, h:1, r:'大富豪', ban:'ジョーカー',     d:'💥CPU2人・革命中・強カード没収・JK禁止。重なった逆境を突破しろ。' },
    70: { s:'finalBoss',     t:10, th:3, h:1, r:'大富豪', turn:30,              d:'CPU3人・強カード没収・⏱30T。全員を相手にした総力戦。' },
    // ── Lv 71〜80: 特殊クリア条件・上級 ────────────────────────────────
    71: { s:'effectRequired',t:7,  th:1, h:1, r:'大富豪', req:'8切り',   turn:20,              d:'8切り必須・強カード没収・⏱20T。タイミングが勝負の鍵。' },
    72: { s:'effectRequired',t:7,  th:1, h:1, r:'大富豪', req:'ジョーカー', pass:5,            d:'JK必須・強カード没収・⛔パス5回まで。切るタイミングを誤るな。' },
    73: { s:'effectRequired',t:7,  th:1, h:1, r:'大富豪', req:'革命',                          d:'革命必須・強カード没収。4枚組の保持が最優先。' },
    74: { s:'lastStand',     t:7,  th:1, h:1, r:'大富豪', pass:4,                              d:'強カード没収・⛔パス4回まで。ペアを崩す判断が鍵。' },
    75: { s:'mirrorBattle',  t:7,  th:1, h:1, r:'大富豪', turn:25,                             d:'強カード没収・⏱25T。あえてパスすると勝てる構成を読め。' },
    76: { s:'effectRequired',t:7,  th:1, h:1, r:'大富豪', req:'階段',                          d:'階段必須・強カード没収。同スート連番を温存しろ。' },
    77: { s:'doubleThreat',  t:7,  th:2, h:1, r:'大富豪', ban:'ジョーカー',                   d:'CPU2人・JK禁止・強カード没収。両方の上がりを同時に封じろ。' },
    78: { s:'cpuRevolution', t:7,  th:1, h:1, r:'大富豪', pass:4,                              d:'💥革命中・強カード没収・⛔パス4回まで。強弱逆転で組み直せ。' },
    79: { s:'cpuStrong',     t:7,  th:1, h:0, r:'大富豪', suit:'spades', pass:3,               d:'スペード縛り・強敵CPU・⛔パス3回まで。スペードを活かして上がれ。' },
    80: { s:'effectRequired',t:7,  th:2, h:1, r:'大富豪', req:'革命',    turn:25, pass:3,      d:'CPU2人・革命必須・強カード没収・⛔パス3回・⏱25T。正しいタイミングで革命を起こせ。' },
    // ── Lv 81〜90: 複合ルール上級 ─────────────────────────────────────
    81: { s:'cpuRevolution', t:9,  th:2, h:1, r:'大富豪', ban:'ジョーカー',     d:'💥CPU2人・革命中・ジョーカー禁止。重ねた縛りを突破しろ。' },
    82: { s:'lastStand',     t:7,  th:1, h:1, r:'大富豪', ns:true, turn:15,     d:'✋階段禁止・強カード没収・⏱15ターン以内。単体とペアで勝て。' },
    83: { s:'doubleThreat',  t:9,  th:2, h:0, r:'大富豪', fv:9, fc:2,           d:'🗂CPU2人・9のペアが出た状態からスタート。ペアを軸に正面突破しろ。' },
    84: { s:'cpuStrong',     t:9,  th:2, h:1, r:'大富豪', ban:'7渡し', suit:'diamonds', pass:1, turn:20, d:'CPU2人・ダイヤ縛り・強カード没収・⛔パス1回・⏱20ターン以内。重圧に耐えろ。' },
    85: { s:'effectForbidden',t:9, th:1, h:0, r:'大富豪', ban:'8切り', pass:2,   d:'8切り禁止・⛔パス2回。8に頼らず手の強さだけで突破しろ。' },
    86: { s:'doubleThreat',  t:7,  th:1, h:1, r:'大富豪', turn:20,              d:'CPU1人・強カード没収・⏱20ターン以内。弱めの手で制圧しろ。' },
    87: { s:'doubleThreat',  t:9,  th:2, h:1, r:'大富豪', np:true,  pass:3,    d:'CPU2人・✋ペア禁止・強カード没収・⛔パス3回。1枚ずつで突破しろ。' },
    88: { s:'finalBoss',     t:10, th:3, h:0, r:'大富豪', pass:3,               d:'CPU3人・💥革命中・⛔パス3回。全包囲を突破せよ。' },
    89: { s:'doubleThreat',  t:9,  th:2, h:1, r:'大富豪', ns:true,  pass:3,    d:'CPU2人・✋階段禁止・強カード没収・⛔パス3回。縛りの中で上がり筋を作れ。' },
    90: { s:'finalBoss',     t:10, th:3, h:1, r:'大富豪', ban:'ジョーカー', turn:35, d:'CPU3人・💥革命中・ジョーカー禁止・強カード没収・⏱35ターン以内。最高難度の壁。' },
    // ── Lv 91〜99: 最高難易度 ─────────────────────────────────────────
    91: { s:'doubleSiege',   t:11, th:2, h:1, r:'大富豪', d:'CPU2人・最高難易度。全力の相手に真正面から勝て。' },
    92: { s:'finalBoss',     t:11, th:3, h:0, r:'大富豪', d:'CPU3人・💥革命中・最高難易度。3方向の包囲を崩せ。' },
    93: { s:'doubleThreat',  t:9,  th:2, h:1, r:'大富豪', ns:true, turn:30,     d:'CPU2人・✋階段禁止・強カード没収・⏱30ターン以内。素早く抜けろ。' },
    94: { s:'bruteForce',    t:8,  th:2, h:1, r:'大富豪', pass:2,               d:'CPU3人・強カード没収・⛔パス2回以内で制圧しろ。' },
    95: { s:'doubleSiege',   t:10, th:2, h:0, r:'大富豪', ban:'革命',           d:'CPU2人・革命禁止。通常の強弱を崩さず純粋な力勝負を制せ。' },
    96: { s:'finalBoss',     t:10, th:3, h:1, r:'大富豪', ban:'ジョーカー', suit:'spades', d:'CPU3人・スペード縛り・ジョーカー禁止。最高難度の複合縛り。' },
    97: { s:'effectRequired',t:9,  th:2, h:1, r:'大富豪', req:'革命',           d:'CPU2人・固定手札。革命を起こして大富豪を取れ。' },
    98: { s:'bruteForce',    t:8,  th:3, h:0, r:'大富豪', d:'CPU3人・全力の包囲。8切りとK対を駆使して上がれ。' },
    99: { s:'doubleSiege', t:11, th:2, h:1, r:'大富豪', req:'8切り', ban:'革命', fv:11, fc:1, pass:2, turn:24, d:'CPU2人全力強化・強カード没収・J盤面スタート・革命禁止・⛔パス2回・⏱24ターン。8切りと11バックを組み合わせて活路を開け。' },
    // ── Lv 100: 最終試練 ──────────────────────────────────────────────
    100:{ s:'doubleSiege', t:14, th:2, h:0, r:'大富豪', req:'革命', fv:12, fc:2, pass:2, turn:35, d:'【最終試練】CPU2人全力強化・Qペア盤面スタート・⛔パス2回・⏱35ターン。4枚組で革命を起こし、すべてを逆転させよ。' },
  }

  const cfg = L[level] ?? L[100]!
  return {
    targetHandCount: cfg.t,
    threatCount: cfg.th,
    playerHandicap: cfg.h,
    scenarioType: cfg.s,
    minRank: cfg.r,
    requiredEffect: cfg.req,
    forbiddenEffect: cfg.ban,
    cpuHasJoker: cfg.cj,
    initialShibariSuit: cfg.suit,
    description: cfg.d,
    initialFieldValue: cfg.fv,
    initialFieldCount: cfg.fc,
    initialFieldStairs: cfg.fs,
    maxPlayerPasses: cfg.pass,
    maxTurns: cfg.turn,
    forbidPairs: cfg.np,
    forbidStairs: cfg.ns,
  }
}

export default function ChallengeModeScreen({ playerName, onStart, onBack }: Props) {
  const localUnlocked = Math.min(100, Math.max(1, Number(localStorage.getItem(challengeProgressKey(playerName)) || 1)))
  const [unlockedLevel, setUnlockedLevel] = useState(localUnlocked)
  const [level, setLevel] = useState(localUnlocked)
  const [used, setUsed] = useState(() => Number(localStorage.getItem(storageKey(playerName)) || 0))
  const [message, setMessage] = useState('')
  const [recovering, setRecovering] = useState(false)
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [rankingLoading, setRankingLoading] = useState(true)
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

  useEffect(() => {
    setRankingLoading(true)
    fetch('/api/challenge/ranking')
      .then(response => response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`)))
      .then(data => setRanking(Array.isArray(data.ranking) ? data.ranking : []))
      .catch(() => setRanking([]))
      .finally(() => setRankingLoading(false))
  }, [playerName, unlockedLevel])

  useEffect(() => {
    const syncAttempts = () => setUsed(Number(localStorage.getItem(storageKey(playerName)) || 0))
    window.addEventListener('inmu-challenge-attempts-updated', syncAttempts)
    return () => window.removeEventListener('inmu-challenge-attempts-updated', syncAttempts)
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

    <details style={{ ...card, marginBottom: 12 }}>
      <summary style={{ cursor: 'pointer', fontWeight: 800, color: '#ffcf70' }}>🏆 チャレンジ進捗ランキング</summary>
      <div style={{ marginTop: 10 }}>
        {rankingLoading && <div style={{ padding: 12, textAlign: 'center', opacity: .65 }}>ランキングを読み込み中…</div>}
        {!rankingLoading && ranking.length === 0 && <div style={{ padding: 12, textAlign: 'center', opacity: .65 }}>まだランキングデータがありません</div>}
        {ranking.map(entry => <div key={`${entry.position}-${entry.username}`} style={{
          display: 'grid', gridTemplateColumns: '42px 1fr auto', gap: 8, alignItems: 'center',
          padding: '9px 5px', borderBottom: '1px solid rgba(255,255,255,.08)',
          background: entry.isCurrentUser ? 'rgba(255,159,67,.12)' : 'transparent',
          borderRadius: entry.isCurrentUser ? 8 : 0,
        }}>
          <strong style={{ color: entry.position <= 3 ? '#ffd56a' : '#aaa' }}>
            {entry.position === 1 ? '🥇' : entry.position === 2 ? '🥈' : entry.position === 3 ? '🥉' : `${entry.position}位`}
          </strong>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {entry.username}{entry.isCurrentUser ? '（あなた）' : ''}
          </span>
          <strong style={{ color: '#ff9f43' }}>Lv.{entry.highestClearedLevel}</strong>
        </div>)}
      </div>
    </details>

    <button disabled={!remaining} onClick={startChallenge} style={{ width: '100%', padding: 14, border: 0, borderRadius: 12, background: remaining ? 'linear-gradient(135deg,#ff9f43,#d46b18)' : '#463a32', fontWeight: 900, cursor: remaining ? 'pointer' : 'not-allowed' }}>Lv.{level} ミッション開始！（挑戦回数を1回使う）</button>
    {remaining === 0 && <button disabled={recovering} onClick={recoverAttempts} style={{ width: '100%', padding: 13, marginTop: 9, borderRadius: 12, color: '#ffe0a8', background: 'rgba(212,175,55,.12)', border: '1px solid #d4af37', cursor: 'pointer', fontWeight: 800 }}>{recovering ? '回復中…' : `${RECOVERY_COST} PORTALポイントで3回復活！`}</button>}
    {message && <div style={{ marginTop: 9, fontSize: 11, textAlign: 'center', color: message.includes('回復しました') ? '#88ff88' : '#ff8888' }}>{message}</div>}
    <button onClick={onBack} style={{ width: '100%', padding: 11, marginTop: 9, borderRadius: 12, color: '#aaa', background: 'transparent', border: '1px solid #333', cursor: 'pointer' }}>戻る</button>
  </div>
}
