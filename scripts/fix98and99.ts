/**
 * Lv98: 10が2枚以下 + pass候補探索
 * Lv99: CPU2の手が弱いシード探索
 */
import { initGame, playCards, pass, resolveSevenPass, resolveTenDiscard, validatePlay } from '../src/logic/gameEngine.js'
import { cpuChoosePlay } from '../src/logic/cpuAI.js'
import type { GameState, Card, RulesConfig } from '../src/types/game.js'

function cardStr(c: Card) {
  const S: Record<string, string> = { spades:'♠', hearts:'♥', diamonds:'♦', clubs:'♣', joker:'JO' }
  const V: Record<string | number, string> = { 1:'A',11:'J',12:'Q',13:'K',14:'2',15:'JO','JOKER':'JO' }
  if ((c as any).isJoker || c.rank === 'JOKER') return 'JO'
  return (V[c.value] ?? String(c.value)) + (S[c.suit] ?? c.suit)
}

function rulesForLevel(): RulesConfig {
  return {
    kakumei: true, eightCut: true, elevenBack: true, shibari: true,
    kaidan: true, miyakochi: true, nanaWatashi: true, junTen: true,
    supe3gaeshi: true, suitshibari: true, kinshiAgari: false,
    forbidPairs: false, forbidStairs: false,
  }
}

function tuneStrength(players: any[], targetIndex: number, makeStrong: boolean) {
  const target = players[targetIndex].hand
  const targetSlots = target.map((card: any, index: number) => ({ card, index }))
    .sort((a: any, b: any) => makeStrong ? a.card.value - b.card.value : b.card.value - a.card.value)
  const outside = players.flatMap((player: any, playerIndex: number) => playerIndex === targetIndex ? [] :
    player.hand.map((card: any, cardIndex: number) => ({ card, playerIndex, cardIndex })))
    .sort((a: any, b: any) => makeStrong ? b.card.value - a.card.value : a.card.value - b.card.value)
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

type Cfg = { s: string; t: number; th: number; h: number; r: string; pass?: number; turn?: number }

function applyScenario(cfg: Cfg, seed: number): { state: GameState; allPlayers: any[] } {
  const rules = rulesForLevel()
  let state = initGame(rules, ['P','C1','C2','C3'], undefined, seed)
  const players = state.players.map((p: any) => ({ ...p, hand: [...p.hand] }))
  const targetIndexes = Array.from({length: cfg.th}, (_,i) => i+1)
  const startsInRev = ['cpuRevolution','reverseTrap','finalBoss'].includes(cfg.s)

  if (['cpuStrong','finalBoss'].includes(cfg.s)) tuneStrength(players, 1, true)
  if (cfg.s === 'bruteForce') tuneStrength(players, 3, true)
  if (cfg.s === 'doubleSiege') { tuneStrength(players, 1, true); tuneStrength(players, 2, true) }

  if (cfg.h > 0) {
    const sorted = [...players[0].hand].sort((a: any, b: any) => b.value - a.value)
    const confiscated = sorted.slice(0, cfg.h)
    players[0].hand = players[0].hand.filter((c: any) => !confiscated.some((cc: any) => cc.id === c.id))
    const normalCpus = [1,2,3].filter(i => !targetIndexes.includes(i))
    const targets = normalCpus.length > 0 ? normalCpus : [targetIndexes[0] ?? 1]
    confiscated.forEach((card: any, i: number) => { players[targets[i % targets.length]].hand.push(card) })
  }

  const challengeRules = {
    ...rules,
    forbidPairs: cfg.s === 'doubleThreat' || (cfg as any).np,
    forbidStairs: (cfg as any).ns,
  }

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
  return { state: stateOut, allPlayers: players }
}

function doSevenPass(state: GameState): GameState {
  const cur = state.currentPlayerIndex
  const sp = state.sevenPassState
  if (!sp) return pass(state)
  const toGive = [...state.players[cur].hand].sort((a,b) => a.value-b.value).slice(0, sp.totalToGive)
  const targets = [0,1,2,3].filter(i => !state.finishedPlayers.includes(i) && i !== cur)
    .sort((a,b) => state.players[b].hand.length - state.players[a].hand.length)
  if (!toGive.length || !targets.length) return pass(state)
  return resolveSevenPass(state, targets[0], toGive)
}
function doTenDiscard(state: GameState): GameState {
  const cur = state.currentPlayerIndex
  const td = state.tenDiscardState
  if (!td) return pass(state)
  const toDiscard = [...state.players[cur].hand].sort((a,b) => a.value-b.value)
    .slice(0, Math.min(td.totalToDiscard, state.players[cur].hand.length))
  if (!toDiscard.length) return pass(state)
  return resolveTenDiscard(state, toDiscard)
}

function simulate(cfg: Cfg, seed: number): boolean {
  const { state: init } = applyScenario(cfg, seed)
  let state = init
  const passLimit = cfg.pass ?? 999
  const turnLimit = cfg.turn ?? 999
  let passCount = 0
  let steps = 0

  while (state.phase !== 'result' && steps < 600) {
    steps++
    if (state.phase === 'sevenPass') { state = doSevenPass(state); continue }
    if ((state.phase as string) === 'tenDiscard') { state = doTenDiscard(state); continue }
    const cur = state.currentPlayerIndex
    const elapsed = Math.floor(steps / 4)
    if (turnLimit < 999 && elapsed > turnLimit) return false

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

    if (!allValid.length || passCount >= passLimit) { passCount++; state = pass(state) }
    else {
      if (state.revolutionActive)
        allValid.sort((a,b) => Math.max(...b.map(c=>c.value)) - Math.max(...a.map(c=>c.value)))
      else
        allValid.sort((a,b) => Math.max(...a.map(c=>c.value)) - Math.max(...b.map(c=>c.value)))
      const vr = validatePlay(state, allValid[0])
      if (vr.valid) state = playCards(state, allValid[0])
      else { passCount++; state = pass(state) }
    }
  }
  return state.phase === 'result' && (state as any).players[0].finishOrder === 1
}

// ─────────────────────────────────────────────────────────────────────────────
// Lv98 現状確認
const cfg98: Cfg = {s:'bruteForce', t:8, th:3, h:0, r:'大富豪'}
console.log('=== Lv98 seed=9806 現状 ===')
{
  const { allPlayers } = applyScenario(cfg98, 9806)
  for (let i = 0; i < allPlayers.length; i++) {
    const h = [...allPlayers[i].hand].sort((a: any,b: any) => a.value-b.value)
    console.log(`${['P ','C1','C2','C3'][i]}: [${h.map(cardStr).join(' ')}] 10枚=${h.filter((c: any)=>c.value===10).length}`)
  }
}

// Lv98 探索: 10≤2枚
console.log('\n=== Lv98 10≤2枚 wins>=2 (9800〜9899) ===')
for (let s = 9800; s <= 9899; s++) {
  const { allPlayers } = applyScenario(cfg98, s)
  const ph = allPlayers[0].hand
  const tens = ph.filter((c: any) => c.value === 10).length
  if (tens > 2) continue
  let wins = 0
  for (let t = 0; t < 3; t++) if (simulate(cfg98, s)) wins++
  if (wins >= 2) {
    const hs = [...ph].sort((a: any,b: any)=>a.value-b.value).map(cardStr).join(' ')
    console.log(`  seed=${s}: [${hs}] 10枚=${tens} wins=${wins}/3`)
  }
}

// Lv98 pass:1追加でも探索
const cfg98p1: Cfg = {s:'bruteForce', t:8, th:3, h:0, r:'大富豪', pass:1}
console.log('\n=== Lv98 pass:1 + 10≤2枚 wins>=2 (9800〜9899) ===')
for (let s = 9800; s <= 9899; s++) {
  const { allPlayers } = applyScenario(cfg98p1, s)
  const ph = allPlayers[0].hand
  const tens = ph.filter((c: any) => c.value === 10).length
  if (tens > 2) continue
  let wins = 0
  for (let t = 0; t < 3; t++) if (simulate(cfg98p1, s)) wins++
  if (wins >= 2) {
    const hs = [...ph].sort((a: any,b: any)=>a.value-b.value).map(cardStr).join(' ')
    console.log(`  seed=${s}: [${hs}] 10枚=${tens} wins=${wins}/3 (pass:1)`)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Lv99 現状確認
const cfg99: Cfg = {s:'finalBoss', t:10, th:3, h:1, r:'大富豪', pass:2, turn:30}
console.log('\n=== Lv99 seed=9900 現状 (全プレイヤー) ===')
{
  const { allPlayers } = applyScenario(cfg99, 9900)
  for (let i = 0; i < allPlayers.length; i++) {
    const h = [...allPlayers[i].hand].sort((a: any,b: any)=>a.value-b.value)
    const avg = (h.reduce((s: number,c: any)=>s+c.value,0)/h.length).toFixed(1)
    const mx = Math.max(...h.map((c: any)=>c.value))
    console.log(`${['P ','C1','C2','C3'][i]}: [${h.map(cardStr).join(' ')}] avg=${avg} max=${mx}`)
  }
}

// Lv99 探索: C2 max<=13(K以下) wins>=1
console.log('\n=== Lv99 C2max≤K(13) wins>=1 (9900〜9999) ===')
for (let s = 9900; s <= 9999; s++) {
  const { allPlayers } = applyScenario(cfg99, s)
  const c2h = allPlayers[2].hand
  const c2max = Math.max(...c2h.map((c: any)=>c.value))
  if (c2max > 13) continue
  let wins = 0
  for (let t = 0; t < 3; t++) if (simulate(cfg99, s)) wins++
  if (wins >= 1) {
    const ph = [...allPlayers[0].hand].sort((a: any,b: any)=>a.value-b.value).map(cardStr).join(' ')
    const c2s = [...c2h].sort((a: any,b: any)=>a.value-b.value).map(cardStr).join(' ')
    const c3max = Math.max(...allPlayers[3].hand.map((c: any)=>c.value))
    console.log(`  seed=${s}: P=[${ph}] | C2=[${c2s}] c2max=${c2max} c3max=${c3max} wins=${wins}/3`)
  }
}
