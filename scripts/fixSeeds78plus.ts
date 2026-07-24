/**
 * Lv78〜100 を App.tsx の applyChallengeScenario と同じロジックで再現し、
 * 各レベルで「プレイヤーが1位になれるシード」を検証・探索する。
 *
 * App.tsx との主な違いを修正:
 *  - 余剰CPUカードをプレイヤーに渡さない（App は渡さず除外）
 *  - playerTargetCount = targetHandCount - rankAdvantage
 *  - rev/keepWeak → 低値カード優先、それ以外 → 高値カード優先
 *  - effectRequired で必須カードを固定してから枚数絞り
 */
import { initGame, playCards, pass, resolveSevenPass, resolveTenDiscard, validatePlay } from '../src/logic/gameEngine.js'
import { cpuChoosePlay } from '../src/logic/cpuAI.js'
import type { GameState, Card, RulesConfig } from '../src/types/game.js'

// ── ユーティリティ ─────────────────────────────────────────────────────────
function cardStr(c: Card) {
  const S: Record<string, string> = { spades:'♠', hearts:'♥', diamonds:'♦', clubs:'♣', joker:'JO' }
  const V: Record<string | number, string> = { 1:'A',11:'J',12:'Q',13:'K',14:'2',15:'JO','JOKER':'JO' }
  if ((c as any).isJoker || c.rank === 'JOKER') return 'JO'
  return (V[c.value] ?? String(c.value)) + (S[c.suit] ?? c.suit)
}

function rulesForLevel(level: number): RulesConfig {
  return {
    kakumei: level>=3, eightCut: level>=6, elevenBack: level>=8,
    shibari: level>=11, kaidan: level>=16, miyakochi: level>=41,
    nanaWatashi: level>=46, junTen: level>=51, supe3gaeshi: level>=56,
    suitshibari: level>=61, kinshiAgari: false,
    forbidPairs: false, forbidStairs: false,
  }
}

// ── レベル設定 ────────────────────────────────────────────────────────────
type Cfg = {
  s: string; t: number; th: number; h: number; r: string
  req?: string; ban?: string; suit?: string
  fv?: number; fc?: number; pass?: number; turn?: number
  np?: boolean; ns?: boolean
}
const L: Record<number, Cfg> = {
  78: {s:'cpuRevolution', t:7,  th:1, h:1, r:'大富豪', pass:4},
  79: {s:'curseCombo',    t:7,  th:1, h:0, r:'大富豪', suit:'spades', pass:3},
  80: {s:'effectRequired',t:7,  th:2, h:1, r:'大富豪', req:'革命', turn:25},
  81: {s:'cpuRevolution', t:9,  th:2, h:1, r:'大富豪', ban:'ジョーカー'},
  82: {s:'lastStand',     t:7,  th:1, h:1, r:'大富豪', ns:true, turn:15},
  83: {s:'doubleThreat',  t:9,  th:2, h:0, r:'大富豪', fv:9, fc:2},
  84: {s:'curseCombo',    t:9,  th:2, h:1, r:'大富豪', ban:'7渡し', suit:'diamonds', pass:1, turn:20},
  85: {s:'effectForbidden',t:9, th:1, h:0, r:'大富豪', ban:'8切り'},
  86: {s:'doubleThreat',  t:7,  th:1, h:0, r:'大富豪', turn:20},
  87: {s:'doubleThreat',  t:9,  th:2, h:1, r:'大富豪', np:true},
  88: {s:'finalBoss',     t:10, th:3, h:0, r:'大富豪'},
  89: {s:'doubleThreat',  t:9,  th:2, h:1, r:'大富豪', ns:true},
  90: {s:'finalBoss',     t:10, th:3, h:1, r:'大富豪', ban:'ジョーカー', turn:35},
  91: {s:'doubleSiege',   t:11, th:2, h:1, r:'大富豪'},
  92: {s:'finalBoss',     t:11, th:3, h:0, r:'大富豪'},
  93: {s:'doubleThreat',  t:9,  th:2, h:1, r:'大富豪', ns:true, turn:30},
  94: {s:'bruteForce',    t:8,  th:2, h:1, r:'大富豪', pass:2},
  95: {s:'doubleSiege',   t:10, th:2, h:0, r:'大富豪', ban:'革命'},
  96: {s:'finalBoss',     t:10, th:3, h:1, r:'大富豪', ban:'ジョーカー', suit:'spades'},
  97: {s:'effectRequired',t:9,  th:2, h:1, r:'大富豪', req:'革命'},
  98: {s:'bruteForce',    t:8,  th:3, h:0, r:'大富豪'},
  99: {s:'finalBoss',     t:10, th:3, h:1, r:'大富豪', pass:2, turn:30},
  100:{s:'finalBoss',     t:10, th:3, h:0, r:'大富豪'},
}

// ── App.tsx の applyChallengeScenario を再現 ──────────────────────────────
function applyScenario(level: number, seed: number): { state: GameState; hand: Card[] } {
  const cfg = L[level]!
  const rules = rulesForLevel(level)
  let state = initGame(rules, ['P','C1','C2','C3'], undefined, seed)
  const players = state.players.map(p => ({ ...p, hand: [...p.hand] }))

  const startsInRev = ['cpuRevolution','reverseTrap','finalBoss'].includes(cfg.s)
  const keepWeak   = ['weakHand','lockedHand','curseCombo'].includes(cfg.s)
  const targetIndexes = Array.from({length: cfg.th}, (_, i) => i + 1)

  // h:1 → プレイヤー最強カードを没収して通常CPUへ
  if (cfg.h > 0) {
    const sorted = [...players[0].hand].sort((a,b) => b.value - a.value)
    const confiscated = sorted.slice(0, cfg.h)
    players[0].hand = players[0].hand.filter(c => !confiscated.some(cc => cc.id === c.id))
    const normalCpus = [1,2,3].filter(i => !targetIndexes.includes(i))
    const targets = normalCpus.length > 0 ? normalCpus : [targetIndexes[0] ?? 1]
    confiscated.forEach((card, i) => {
      const idx = targets[i % targets.length]
      players[idx].hand.push(card)
    })
  }

  // effectRequired: 必須カードを確保
  if (cfg.req === '革命') {
    // 4枚組を渡す
    const all = players.flatMap(p => p.hand)
    const groups = new Map<string, Card[]>()
    all.forEach(c => { if (c.rank !== 'JOKER') groups.set(String(c.rank), [...(groups.get(String(c.rank))??[]), c]) })
    const four = [...groups.values()].find(cs => cs.length >= 4)?.slice(0,4)
    if (four) {
      const wantedIds = new Set(four.map(c => c.id))
      const replaceSlots = players[0].hand.map((c,i) => ({c,i})).filter(x => !wantedIds.has(x.c.id))
      four.filter(c => !players[0].hand.some(o => o.id === c.id)).forEach((card, si) => {
        const ownerPi = players.findIndex(p => p.hand.some(o => o.id === card.id))
        const ownerCi = ownerPi >= 0 ? players[ownerPi].hand.findIndex(o => o.id === card.id) : -1
        const slot = replaceSlots[si]
        if (ownerPi < 0 || ownerCi < 0 || !slot) return
        players[0].hand[slot.i] = card
        players[ownerPi].hand[ownerCi] = slot.c
      })
    }
  } else if (cfg.req === 'ジョーカー') {
    if (!players[0].hand.some(c => c.rank === 'JOKER')) {
      for (let pi = 1; pi < players.length; pi++) {
        const ci = players[pi].hand.findIndex(c => c.rank === 'JOKER')
        if (ci < 0) continue
        const weakest = [...players[0].hand].sort((a,b) => a.value-b.value)[0]
        if (!weakest) break
        const wi = players[0].hand.findIndex(c => c.id === weakest.id)
        players[0].hand[wi] = players[pi].hand[ci]
        players[pi].hand[ci] = weakest
        break
      }
    }
  } else if (cfg.req === '階段' || cfg.req === '縛り') {
    // 全カードから同スート3連番を探して渡す
    const allCards = players.flatMap(p => p.hand)
    let run: Card[] = []
    for (const suit of ['spades','hearts','diamonds','clubs'] as const) {
      for (let v = 3; v <= 13; v++) {
        const cands = [v,v+1,v+2].map(tv => allCards.find(c => c.suit===suit && c.value===tv)).filter(Boolean) as Card[]
        if (cands.length === 3) { run = cands; break }
      }
      if (run.length === 3) break
    }
    const runIds = new Set(run.map(c => c.id))
    for (const wanted of run) {
      if (players[0].hand.some(c => c.id === wanted.id)) continue
      const ownerPi = players.findIndex(p => p.hand.some(c => c.id === wanted.id))
      const ownerCi = ownerPi >= 0 ? players[ownerPi].hand.findIndex(c => c.id === wanted.id) : -1
      const repI = players[0].hand.findIndex(c => !runIds.has(c.id))
      if (ownerPi < 0 || ownerCi < 0 || repI < 0) continue
      const rep = players[0].hand[repI]
      players[0].hand[repI] = wanted
      players[ownerPi].hand[ownerCi] = rep
    }
  }

  // effectForbidden: 禁止カードを除去
  if (cfg.ban) {
    const banRankMap: Record<string, string|number> = { '8切り':8,'7渡し':7,'ジョーカー':'JOKER','革命':'revolution' }
    const banRank = banRankMap[cfg.ban]
    if (banRank && banRank !== 'revolution') {
      const toRemove = players[0].hand.filter(c => c.rank === banRank)
      const cpuPool = players.slice(1).flatMap((p,pi) => p.hand.map((c,ci) => ({c,pi:pi+1,ci}))).filter(x => x.c.rank !== banRank).sort((a,b) => a.c.value - b.c.value)
      toRemove.forEach((card, i) => {
        if (i >= cpuPool.length) return
        const {c:swap, pi, ci} = cpuPool[i]
        const idx = players[0].hand.findIndex(c => c.id === card.id)
        players[0].hand[idx] = swap
        players[pi].hand[ci] = card
      })
    }
  }

  // 必須カードを固定
  const requiredPinnedCards: Card[] = (() => {
    const hand = players[0].hand
    if (cfg.req === '革命') {
      const byRank = new Map<string, Card[]>()
      hand.forEach(c => { if (c.rank !== 'JOKER') byRank.set(String(c.rank), [...(byRank.get(String(c.rank))??[]), c]) })
      return [...byRank.values()].find(cs => cs.length >= 4)?.slice(0,4) ?? []
    }
    if (cfg.req === '階段' || cfg.req === '縛り') {
      const bySuit = new Map<string, Card[]>()
      hand.filter(c => c.rank !== 'JOKER').forEach(c => bySuit.set(c.suit, [...(bySuit.get(c.suit)??[]), c]))
      for (const cs of bySuit.values()) {
        const sorted = [...cs].sort((a,b) => a.value-b.value)
        for (let i = 0; i+2 < sorted.length; i++) {
          if (sorted[i+1].value === sorted[i].value+1 && sorted[i+2].value === sorted[i].value+2)
            return sorted.slice(i, i+3)
        }
      }
      if (cfg.req === '縛り') return [...bySuit.values()].find(cs => cs.length >= 2)?.slice(0,2) ?? []
    }
    const rankMap: Record<string, string|number> = {'8切り':8,'7渡し':7,'ジョーカー':'JOKER'}
    const rank = cfg.req ? rankMap[cfg.req] : undefined
    return rank === undefined ? [] : hand.filter(c => c.rank === rank).slice(0,1)
  })()
  const pinnedIds = new Set(requiredPinnedCards.map(c => c.id))

  // rankAdvantage
  const hardAdv = ['doubleSiege','finalBoss','bruteForce'].includes(cfg.s) ? 1 : 0
  const fieldAdv = cfg.fv != null ? 1 : 0
  const fixedAdv = [91,92].includes(level) ? 1 : 0   // 53,67は対象外(Lv78-100)
  const rankAdv = hardAdv + fieldAdv + fixedAdv
  const playerTargetCount = Math.min(players[0].hand.length, Math.max(1, requiredPinnedCards.length, cfg.t - rankAdv))

  // プレイヤー手札絞り
  const candidates = players[0].hand
    .filter(c => !pinnedIds.has(c.id))
    .sort((a,b) => {
      if (a.rank === 'JOKER' && b.rank !== 'JOKER') return -1
      if (b.rank === 'JOKER' && a.rank !== 'JOKER') return 1
      if (startsInRev || keepWeak) return a.value - b.value   // 低値優先(革命中最強)
      return b.value - a.value                                 // 高値優先
    })
  players[0].hand = [
    ...requiredPinnedCards,
    ...candidates.slice(0, playerTargetCount - requiredPinnedCards.length),
  ].sort((a,b) => a.value - b.value)

  // 脅威CPUの余剰カードを除外（プレイヤーへは渡さない）
  targetIndexes.forEach(i => { players[i].hand.splice(cfg.t) })

  // 初期縛りスートが1枚もなければ補充
  if (cfg.suit && !players[0].hand.some(c => c.suit === cfg.suit)) {
    for (let pi = 1; pi < players.length; pi++) {
      const ci = players[pi].hand.findIndex(c => c.suit === cfg.suit)
      if (ci < 0) continue
      const repI = players[0].hand.map((c,i) => ({c,i})).sort((a,b) => a.c.value-b.c.value)[0]?.i
      if (repI === undefined) break
      const rep = players[0].hand[repI]
      players[0].hand[repI] = players[pi].hand[ci]
      players[pi].hand[ci] = rep
      break
    }
  }

  const challengeRules = {
    ...rules,
    maxPlayerPasses: cfg.pass ?? null,
    maxTurns: cfg.turn ?? null,
    forbidPairs: cfg.np ?? false,
    forbidStairs: cfg.ns ?? false,
  } as any

  const stateOut: GameState = {
    ...state,
    players,
    rules: challengeRules,
    currentPlayerIndex: 0,
    lastPlayedBy: 0,
    revolutionActive: startsInRev,
    must2431: [],
    log: [],
    ...(cfg.suit ? { shibariSuit: cfg.suit as any } : {}),
  }
  return { state: stateOut, hand: players[0].hand }
}

// ── シミュレーション ──────────────────────────────────────────────────────
function doSevenPass(state: GameState): GameState {
  const cur = state.currentPlayerIndex
  const sp = state.sevenPassState
  if (!sp) return pass(state)
  const toGive = [...state.players[cur].hand].sort((a,b) => a.value-b.value).slice(0, sp.totalToGive)
  const targets = [0,1,2,3].filter(i => !state.finishedPlayers.includes(i) && i !== cur).sort((a,b) => state.players[b].hand.length-state.players[a].hand.length)
  if (!toGive.length || !targets.length) return pass(state)
  return resolveSevenPass(state, targets[0], toGive)
}
function doTenDiscard(state: GameState): GameState {
  const cur = state.currentPlayerIndex
  const td = state.tenDiscardState
  if (!td) return pass(state)
  const toDiscard = [...state.players[cur].hand].sort((a,b) => a.value-b.value).slice(0, Math.min(td.totalToDiscard, state.players[cur].hand.length))
  if (!toDiscard.length) return pass(state)
  return resolveTenDiscard(state, toDiscard)
}

function simulate(level: number, seed: number): boolean {
  const { state: init } = applyScenario(level, seed)
  let state = init
  let steps = 0
  while (state.phase !== 'result' && steps < 600) {
    steps++
    if (state.phase === 'sevenPass') { state = doSevenPass(state); continue }
    if ((state.phase as string) === 'tenDiscard') { state = doTenDiscard(state); continue }
    const cur = state.currentPlayerIndex
    if (cur !== 0) {
      const played = cpuChoosePlay(state)
      if (played && validatePlay(state, played).valid) state = playCards(state, played)
      else state = pass(state)
      continue
    }
    // プレイヤー: 全合法手を列挙して最善を選ぶ
    const hand = state.players[0].hand
    const allValid: Card[][] = []
    const byRank = new Map<string|number, Card[]>()
    hand.forEach(c => { if (c.rank !== 'JOKER') { const a = byRank.get(c.rank)??[]; a.push(c); byRank.set(c.rank, a) } })

    if (state.fieldCount > 0) {
      for (const c of hand) if (validatePlay(state,[c]).valid) allValid.push([c])
      byRank.forEach(cs => { for (let k=Math.min(cs.length,4);k>=2;k--) { const cb=cs.slice(0,k); if(validatePlay(state,cb).valid) allValid.push(cb) } })
      const jk = hand.find(c => c.rank==='JOKER'); if (jk && validatePlay(state,[jk]).valid) allValid.push([jk])
    } else {
      byRank.forEach(cs => { for (let k=Math.min(cs.length,4);k>=1;k--) { const cb=cs.slice(0,k); if(validatePlay(state,cb).valid){allValid.push(cb);break} } })
      const jk = hand.find(c => c.rank==='JOKER'); if (jk && validatePlay(state,[jk]).valid) allValid.push([jk])
    }

    if (!allValid.length) { state = pass(state) }
    else {
      // 革命中: 高値(弱)から出す。通常: 低値(弱)から出す → 強いカードを温存
      if (state.revolutionActive)
        allValid.sort((a,b) => Math.max(...b.map(c=>c.value)) - Math.max(...a.map(c=>c.value)))
      else
        allValid.sort((a,b) => Math.max(...a.map(c=>c.value)) - Math.max(...b.map(c=>c.value)))
      const vr = validatePlay(state, allValid[0])
      if (vr.valid) state = playCards(state, allValid[0])
      else state = pass(state)
    }
  }
  return state.phase === 'result' && (state as any).players[0].finishOrder === 1
}

// ── 現在のオーバーライドマップ ────────────────────────────────────────────
const CURRENT: Record<number, number> = {
  78:7800, 79:8111, 80:8009, 81:8100, 82:8200, 84:8411, 85:8509,
  86:8605, 87:8715, 88:8801, 90:9002, 91:9103, 92:9202, 93:9300,
  94:9422, 95:9500, 96:9601, 97:9713, 98:9805, 99:9900, 100:10014,
}

// ── 実行 ──────────────────────────────────────────────────────────────────
console.log('=== Lv78〜100 精密検証 (App.tsxロジック再現) ===\n')
const ng: number[] = []

for (const lvStr of Object.keys(L).sort((a,b) => Number(a)-Number(b))) {
  const lv = Number(lvStr)
  const seed = CURRENT[lv] ?? lv
  const { hand } = applyScenario(lv, seed)
  const handStr = hand.map(cardStr).join(' ')

  // 3試行で1回でも勝てるか（乱数の揺れを考慮）
  let wins = 0
  for (let t = 0; t < 3; t++) if (simulate(lv, seed)) wins++

  const ok = wins >= 1
  console.log(`Lv${lv} (seed=${seed}): [${handStr}] ${ok ? `✅ ${wins}/3` : '❌'}`)
  if (!ok) ng.push(lv)
}

if (ng.length > 0) {
  console.log('\n=== 修正が必要なレベル → 代替シード探索 ===')
  const fixes: Record<number, number> = {}
  for (const lv of ng) {
    const start = lv * 100
    let found = false
    for (let s = start; s < start + 300 && !found; s++) {
      let wins = 0
      for (let t = 0; t < 3; t++) if (simulate(lv, s)) wins++
      if (wins >= 2) {
        const { hand } = applyScenario(lv, s)
        console.log(`  Lv${lv} → seed=${s} (${wins}/3) [${hand.map(cardStr).join(' ')}]`)
        fixes[lv] = s
        found = true
      }
    }
    if (!found) console.log(`  Lv${lv} → ❌ seed=${start}〜${start+299} で見つからず`)
  }
  console.log('\n--- challengeSeeds.ts へ追加 ---')
  for (const [lv, s] of Object.entries(fixes)) console.log(`  ${lv}: ${s},`)
} else {
  console.log('\n✅ 全レベルOK')
}

// ── Lv79 スペード縛り: ♠2枚以上かつ wins>=2 のシード探索 ──────────────────
console.log('\n=== Lv79 スペード縛り ♠2枚以上シード探索 (7900〜8200) ===')
const sp2found: {seed:number, hand:string, sp:number, wins:number}[] = []
for (let s = 7900; s <= 8200; s++) {
  const { hand } = applyScenario(79, s)
  const sp = hand.filter(c => c.suit === 'spades').length
  if (sp < 2) continue
  let wins = 0
  for (let t = 0; t < 3; t++) if (simulate(79, s)) wins++
  const h = hand.map(cardStr).join(' ')
  if (wins >= 2) {
    console.log(`  seed=${s}: [${h}] ♠${sp}枚 wins=${wins}/3 ← 採用候補`)
    sp2found.push({ seed: s, hand: h, sp, wins })
  }
}
if (sp2found.length === 0) {
  console.log('  ♠2枚以上 wins>=2 のシードは見つからず。seed=7900 (♠1枚) で継続。')
}
