/**
 * Lv85〜93 修正探索スクリプト
 * 85: 四10なし + pass:2
 * 86: h:1（最強カード没収）+ 10なし手札
 * 87-89: pass:3 追加、現シードで通るか確認→NGなら探索
 * 90: 7が2枚以下
 * 93: 10が1枚以下
 */
import { initGame, playCards, pass, resolveSevenPass, resolveTenDiscard, validatePlay } from '../src/logic/gameEngine.js'
import { cpuChoosePlay } from '../src/logic/cpuAI.js'
import type { GameState, Card, RulesConfig } from '../src/types/game.js'

function cardStr(c: Card) {
  const S: Record<string,string> = { spades:'♠', hearts:'♥', diamonds:'♦', clubs:'♣', joker:'JO' }
  const V: Record<string|number,string> = { 1:'A',11:'J',12:'Q',13:'K',14:'2',15:'JO','JOKER':'JO' }
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

type Cfg = {
  s: string; t: number; th: number; h: number; r: string
  req?: string; ban?: string; suit?: string
  fv?: number; fc?: number; pass?: number; turn?: number
  np?: boolean; ns?: boolean
}

// ── 修正後の設定 ─────────────────────────────────────────────────────────
const L: Record<number, Cfg> = {
  85: {s:'effectForbidden',t:9, th:1, h:0, r:'大富豪', ban:'8切り', pass:2},          // pass:2追加
  86: {s:'doubleThreat',   t:7, th:1, h:1, r:'大富豪', turn:20},                      // h:0→h:1
  87: {s:'doubleThreat',   t:9, th:2, h:1, r:'大富豪', np:true, pass:3},              // pass:3追加
  88: {s:'finalBoss',      t:10,th:3, h:0, r:'大富豪', pass:3},                       // pass:3追加
  89: {s:'doubleThreat',   t:9, th:2, h:1, r:'大富豪', ns:true, pass:3},              // pass:3追加
  90: {s:'finalBoss',      t:10,th:3, h:1, r:'大富豪', ban:'ジョーカー', turn:35},    // 7枚数制限（シード変更）
  93: {s:'doubleThreat',   t:9, th:2, h:1, r:'大富豪', ns:true, turn:30},             // 10枚数制限（シード変更）
}

function applyScenario(cfg: Cfg, level: number, seed: number): { state: GameState; hand: Card[] } {
  const rules = rulesForLevel(level)
  let state = initGame(rules, ['P','C1','C2','C3'], undefined, seed)
  const players = state.players.map(p => ({ ...p, hand: [...p.hand] }))

  const startsInRev = ['cpuRevolution','reverseTrap','finalBoss'].includes(cfg.s)
  const keepWeak   = ['weakHand','lockedHand','curseCombo'].includes(cfg.s)
  const targetIndexes = Array.from({length: cfg.th}, (_, i) => i + 1)

  const tuneStrength = (targetIndex: number, makeStrong: boolean) => {
    const target = players[targetIndex].hand
    const targetSlots = target.map((card, index) => ({ card, index }))
      .sort((a, b) => makeStrong ? a.card.value - b.card.value : b.card.value - a.card.value)
    const outside = players.flatMap((player, playerIndex) => playerIndex === targetIndex ? [] :
      player.hand.map((card, cardIndex) => ({ card, playerIndex, cardIndex })))
      .sort((a, b) => makeStrong ? b.card.value - a.card.value : a.card.value - b.card.value)
    const swaps = Math.min(Math.ceil(target.length / 2), outside.length)
    for (let i = 0; i < swaps; i++) {
      const own = targetSlots[i]
      const other = outside[i]
      const improves = makeStrong ? other.card.value > own.card.value : other.card.value < own.card.value
      if (!improves) continue
      players[targetIndex].hand[own.index] = other.card
      players[other.playerIndex].hand[other.cardIndex] = own.card
    }
  }
  if (keepWeak) tuneStrength(0, false)
  if (['cpuStrong','finalBoss'].includes(cfg.s)) tuneStrength(1, true)
  if (cfg.s === 'doubleSiege') { tuneStrength(1, true); tuneStrength(2, true) }
  if (cfg.s === 'sniperRush') tuneStrength(1, true)
  if (cfg.s === 'bruteForce') tuneStrength(3, true)

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

  const hardAdv = ['doubleSiege','finalBoss','bruteForce'].includes(cfg.s) ? 1 : 0
  const fieldAdv = cfg.fv != null ? 1 : 0
  const fixedAdv = [91,92].includes(level) ? 1 : 0
  const rankAdv = hardAdv + fieldAdv + fixedAdv
  const playerTargetCount = Math.min(players[0].hand.length, Math.max(1, cfg.t - rankAdv))

  const candidates = players[0].hand.sort((a,b) => {
    if (a.rank === 'JOKER' && b.rank !== 'JOKER') return -1
    if (b.rank === 'JOKER' && a.rank !== 'JOKER') return 1
    if (startsInRev || keepWeak) return a.value - b.value
    return b.value - a.value
  })
  players[0].hand = candidates.slice(0, playerTargetCount).sort((a,b) => a.value - b.value)
  targetIndexes.forEach(i => { players[i].hand.splice(cfg.t) })

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
  }
  return { state: stateOut, hand: players[0].hand }
}

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

function simulate(cfg: Cfg, level: number, seed: number): boolean {
  const { state: init } = applyScenario(cfg, level, seed)
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

// ── 探索 ──────────────────────────────────────────────────────────────────
const CURRENT: Record<number, number> = {
  85:8509, 86:8605, 87:8715, 88:8801, 89:89, 90:9000, 93:9300,
}

console.log('=== Lv85〜93 修正後シード探索 ===\n')

// Lv87/88/89: 現シードでpass:3が通るか確認
for (const lv of [87, 88, 89]) {
  const cfg = L[lv]!
  const seed = CURRENT[lv]
  const { hand } = applyScenario(cfg, lv, seed)
  let wins = 0
  for (let t = 0; t < 3; t++) if (simulate(cfg, lv, seed)) wins++
  console.log(`Lv${lv} 現シード${seed} + pass:3: [${hand.map(cardStr).join(' ')}] ${wins>=1 ? `✅ ${wins}/3` : '❌'}`)
}

console.log()

// Lv85: 四10なし + pass:2
console.log('--- Lv85: 四10なし + pass:2 探索 (8500〜8700) ---')
for (let s = 8500; s <= 8700; s++) {
  const cfg = L[85]!
  const { hand } = applyScenario(cfg, 85, s)
  const rank10count = hand.filter(c => c.value === 10).length
  if (rank10count >= 4) continue   // 四10はスキップ
  let wins = 0
  for (let t = 0; t < 3; t++) if (simulate(cfg, 85, s)) wins++
  if (wins >= 2) {
    console.log(`  Lv85 seed=${s}: [${hand.map(cardStr).join(' ')}] 10枚=${rank10count} wins=${wins}/3 ← 採用候補`)
  }
}

// Lv86: h:1 + 10なし手札
console.log('\n--- Lv86: h:1 + 10なし探索 (8600〜8800) ---')
for (let s = 8600; s <= 8800; s++) {
  const cfg = L[86]!
  const { hand } = applyScenario(cfg, 86, s)
  const has10 = hand.some(c => c.value === 10)
  if (has10) continue   // 10ありはスキップ
  let wins = 0
  for (let t = 0; t < 3; t++) if (simulate(cfg, 86, s)) wins++
  if (wins >= 2) {
    console.log(`  Lv86 seed=${s}: [${hand.map(cardStr).join(' ')}] wins=${wins}/3 ← 採用候補`)
  }
}

// Lv90: 7が2枚以下
console.log('\n--- Lv90: 7が2枚以下探索 (9000〜9200) ---')
for (let s = 9000; s <= 9200; s++) {
  const cfg = L[90]!
  const { hand } = applyScenario(cfg, 90, s)
  const sevenCount = hand.filter(c => c.value === 7).length
  if (sevenCount > 2) continue
  let wins = 0
  for (let t = 0; t < 3; t++) if (simulate(cfg, 90, s)) wins++
  if (wins >= 2) {
    console.log(`  Lv90 seed=${s}: [${hand.map(cardStr).join(' ')}] 7枚=${sevenCount} wins=${wins}/3 ← 採用候補`)
  }
}

// Lv93: 10が1枚以下
console.log('\n--- Lv93: 10が1枚以下探索 (9300〜9500) ---')
for (let s = 9300; s <= 9500; s++) {
  const cfg = L[93]!
  const { hand } = applyScenario(cfg, 93, s)
  const tenCount = hand.filter(c => c.value === 10).length
  if (tenCount > 1) continue
  let wins = 0
  for (let t = 0; t < 3; t++) if (simulate(cfg, 93, s)) wins++
  if (wins >= 2) {
    console.log(`  Lv93 seed=${s}: [${hand.map(cardStr).join(' ')}] 10枚=${tenCount} wins=${wins}/3 ← 採用候補`)
  }
}
