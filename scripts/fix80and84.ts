import { initGame, playCards, pass, resolveSevenPass, resolveTenDiscard, validatePlay } from '../src/logic/gameEngine.js'
import { cpuChoosePlay } from '../src/logic/cpuAI.js'
import type { GameState, Card, RulesConfig } from '../src/types/game.js'

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

// App.tsx tuneStrength完全再現
function tuneStrength(players: any[], targetIndex: number, makeStrong: boolean) {
  const target = players[targetIndex].hand
  const targetSlots = target.map((card: Card, index: number) => ({ card, index }))
    .sort((a: any, b: any) => makeStrong ? a.card.value - b.card.value : b.card.value - a.card.value)
  const outside = players.flatMap((player: any, playerIndex: number) => playerIndex === targetIndex ? [] :
    player.hand.map((card: Card, cardIndex: number) => ({ card, playerIndex, cardIndex })))
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

// ── Lv80: effectRequired+革命 より難しいシード探索 ──────────────────────────
function applyLv80(seed: number) {
  const rules = rulesForLevel(80)
  const state0 = initGame(rules, ['P','C1','C2','C3'], undefined, seed)
  const players = state0.players.map((p: any) => ({ ...p, hand: [...p.hand] }))
  // th:2 → CPU1,CPU2が脅威
  // h:1 → プレイヤー最強を没収
  const sorted = [...players[0].hand].sort((a: Card, b: Card) => b.value - a.value)
  const confiscated = sorted.slice(0, 1)
  players[0].hand = players[0].hand.filter((c: Card) => !confiscated.some((cc: Card) => cc.id === c.id))
  const normalCpus = [3] // CPU3 = 非脅威
  confiscated.forEach((card: Card, i: number) => { players[normalCpus[i % normalCpus.length]].hand.push(card) })
  // effectRequired: 四つ子保証
  const all = players.flatMap((p: any) => p.hand)
  const groups = new Map<string, Card[]>()
  all.forEach((c: Card) => { if (c.rank !== 'JOKER') groups.set(String(c.rank), [...(groups.get(String(c.rank)) ?? []), c]) })
  const four = [...groups.values()].find(cs => cs.length >= 4)?.slice(0, 4)
  if (four) {
    const wantedIds = new Set(four.map((c: Card) => c.id))
    const replaceSlots = players[0].hand.map((c: Card, i: number) => ({c, i})).filter((x: any) => !wantedIds.has(x.c.id))
    four.filter((c: Card) => !players[0].hand.some((o: Card) => o.id === c.id)).forEach((card: Card, si: number) => {
      const ownerPi = players.findIndex((p: any) => p.hand.some((o: Card) => o.id === card.id))
      const ownerCi = ownerPi >= 0 ? players[ownerPi].hand.findIndex((o: Card) => o.id === card.id) : -1
      const slot = replaceSlots[si]
      if (ownerPi < 0 || ownerCi < 0 || !slot) return
      players[0].hand[slot.i] = card
      players[ownerPi].hand[ownerCi] = slot.c
    })
  }
  // 枚数絞り t=7, keepWeak=false → 最強7枚
  const candidates = [...players[0].hand].sort((a: Card, b: Card) => b.value - a.value)
  const fourIds = new Set((four ?? []).map((c: Card) => c.id))
  const pinned = players[0].hand.filter((c: Card) => fourIds.has(c.id))
  const rest = candidates.filter((c: Card) => !fourIds.has(c.id))
  players[0].hand = [...pinned, ...rest.slice(0, 7 - pinned.length)].sort((a: Card, b: Card) => a.value - b.value)
  players[1].hand.splice(7); players[2].hand.splice(7)
  const cRules = { ...rules, maxTurns: 25 } as any
  const stateOut: GameState = { ...state0, players,
    rules: cRules, currentPlayerIndex: 0, lastPlayedBy: 0, must2431: [], log: [] }
  return { state: stateOut, hand: players[0].hand }
}

// ── Lv84: cpuStrong+ダイヤ縛り ──────────────────────────────────────────────
function applyLv84(seed: number) {
  const rules = rulesForLevel(84)
  const state0 = initGame(rules, ['P','C1','C2','C3'], undefined, seed)
  const players = state0.players.map((p: any) => ({ ...p, hand: [...p.hand] }))
  // cpuStrong: CPU1を強化
  tuneStrength(players, 1, true)
  // h:1: player最強を没収
  const sorted = [...players[0].hand].sort((a: Card, b: Card) => b.value - a.value)
  const conf = sorted.slice(0, 1)
  players[0].hand = players[0].hand.filter((c: Card) => !conf.some((cc: Card) => cc.id === c.id))
  players[3].hand.push(...conf)
  // ban:'7渡し' → 7を除去
  const toRemove = players[0].hand.filter((c: Card) => c.rank === 7)
  const cpuPool = players.slice(1).flatMap((p: any, pi: number) => p.hand.map((c: Card, ci: number) => ({c, pi: pi+1, ci}))).filter((x: any) => x.c.rank !== 7).sort((a: any, b: any) => a.c.value - b.c.value)
  toRemove.forEach((card: Card, i: number) => {
    if (i >= cpuPool.length) return
    const {c: swap, pi, ci} = cpuPool[i]
    const idx = players[0].hand.findIndex((c: Card) => c.id === card.id)
    players[0].hand[idx] = swap
    players[pi].hand[ci] = card
  })
  // 枚数絞り t=9, keepWeak=false → 最強9枚(四つ子ピン無し)
  const candidates = [...players[0].hand].sort((a: Card, b: Card) => b.value - a.value)
  players[0].hand = candidates.slice(0, 9).sort((a: Card, b: Card) => a.value - b.value)
  players[1].hand.splice(9); players[2].hand.splice(9)
  // ダイヤ縛り保証
  if (!players[0].hand.some((c: Card) => c.suit === 'diamonds')) {
    for (let pi = 1; pi < 4; pi++) {
      const ci = players[pi].hand.findIndex((c: Card) => c.suit === 'diamonds')
      if (ci < 0) continue
      const repI = players[0].hand.map((c: Card, i: number) => ({c,i})).sort((a: any, b: any) => a.c.value-b.c.value)[0]?.i
      if (repI === undefined) break
      const rep = players[0].hand[repI]
      players[0].hand[repI] = players[pi].hand[ci]
      players[pi].hand[ci] = rep
      break
    }
  }
  const cRules = { ...rules, maxPlayerPasses: 1, maxTurns: 20, nanaWatashi: false } as any
  const stateOut: GameState = { ...state0, players, rules: cRules, currentPlayerIndex: 0,
    lastPlayedBy: 0, must2431: [], log: [], shibariSuit: 'diamonds' as any }
  return { state: stateOut, hand: players[0].hand }
}

function simulate(getState: () => { state: GameState }): boolean {
  let state = getState().state
  let steps = 0
  while (state.phase !== 'result' && steps < 600) {
    steps++
    if (state.phase === 'sevenPass') { state = pass(state); continue }
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
    hand.forEach((c: Card) => { if (c.rank !== 'JOKER') { const a = byRank.get(c.rank) ?? []; a.push(c); byRank.set(c.rank, a) }})
    if (state.fieldCount > 0) {
      for (const c of hand) if (validatePlay(state, [c]).valid) allValid.push([c])
      byRank.forEach(cs => { for (let k = Math.min(cs.length,4); k >= 2; k--) { const cb = cs.slice(0,k); if (validatePlay(state,cb).valid) allValid.push(cb) }})
      const jk = hand.find((c: Card) => c.rank==='JOKER'); if (jk && validatePlay(state,[jk]).valid) allValid.push([jk])
    } else {
      byRank.forEach(cs => { for (let k = Math.min(cs.length,4); k >= 1; k--) { const cb = cs.slice(0,k); if(validatePlay(state,cb).valid){allValid.push(cb);break} }})
      const jk = hand.find((c: Card) => c.rank==='JOKER'); if (jk && validatePlay(state,[jk]).valid) allValid.push([jk])
    }
    if (!allValid.length) { state = pass(state) }
    else {
      if (state.revolutionActive)
        allValid.sort((a: Card[], b: Card[]) => Math.max(...b.map((c: Card) => c.value)) - Math.max(...a.map((c: Card) => c.value)))
      else
        allValid.sort((a: Card[], b: Card[]) => Math.max(...a.map((c: Card) => c.value)) - Math.max(...b.map((c: Card) => c.value)))
      const vr = validatePlay(state, allValid[0])
      if (vr.valid) state = playCards(state, allValid[0])
      else state = pass(state)
    }
  }
  return state.phase === 'result' && state.players[0].finishOrder === 1
}

// Lv80: wins=2/3 のシードを探す（3/3は簡単すぎ）
console.log('=== Lv80 難易度調整シード探索 (wins=2/3) ===')
const lv80found: {seed:number, hand:string, wins:number}[] = []
for (let s = 8000; s <= 8300; s++) {
  const { hand } = applyLv80(s)
  // 四つ子があるか確認
  const byRank = new Map<string|number, number>()
  hand.forEach((c: Card) => { if (c.rank !== 'JOKER') byRank.set(c.rank, (byRank.get(c.rank) ?? 0) + 1) })
  if (![...byRank.values()].some(v => v >= 4)) continue
  let wins = 0
  for (let t = 0; t < 3; t++) if (simulate(() => applyLv80(s))) wins++
  const h = hand.map(cardStr).join(' ')
  if (wins === 2) {
    console.log(`  seed=${s}: [${h}] wins=2/3 ← 採用候補(ちょうどよい難易度)`)
    lv80found.push({ seed: s, hand: h, wins })
  } else if (wins === 3) {
    // 参考
  }
}
if (lv80found.length === 0) {
  console.log('  wins=2のシードなし。wins=3の中で最も難しそうなものを表示:')
  for (let s = 8000; s <= 8200; s++) {
    const { hand } = applyLv80(s)
    const byRank = new Map<string|number, number>()
    hand.forEach((c: Card) => { if (c.rank !== 'JOKER') byRank.set(c.rank, (byRank.get(c.rank) ?? 0) + 1) })
    if (![...byRank.values()].some(v => v >= 4)) continue
    let wins = 0
    for (let t = 0; t < 3; t++) if (simulate(() => applyLv80(s))) wins++
    const h = hand.map(cardStr).join(' ')
    const maxNon4 = Math.max(...hand.filter((c: Card) => {
      const byR = new Map<string|number, number>(); hand.forEach((x: Card) => byR.set(x.rank, (byR.get(x.rank)??0)+1))
      return byR.get(c.rank)! < 4
    }).map((c: Card) => c.value), 0)
    if (wins >= 1 && maxNon4 <= 10) console.log(`  seed=${s}: [${h}] wins=${wins}/3 非4枚max=${maxNon4}`)
  }
}

// Lv84: cpuStrong+ダイヤ縛り wins>=2
console.log('\n=== Lv84 cpuStrong+ダイヤ縛り シード探索 ===')
for (let s = 8400; s <= 8600; s++) {
  const { hand } = applyLv84(s)
  const dia = hand.filter((c: Card) => c.suit === 'diamonds').length
  if (dia < 2) continue
  let wins = 0
  for (let t = 0; t < 3; t++) if (simulate(() => applyLv84(s))) wins++
  const h = hand.map(cardStr).join(' ')
  if (wins >= 2) console.log(`  seed=${s}: [${h}] ♦${dia}枚 wins=${wins}/3 ← 採用候補`)
}
