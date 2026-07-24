import { initGame, playCards, pass, resolveSevenPass, resolveTenDiscard, validatePlay } from '../src/logic/gameEngine.js'
import { cpuChoosePlay } from '../src/logic/cpuAI.js'
import type { GameState, Card, RulesConfig } from '../src/types/game.js'
import { DEFAULT_RULES } from '../src/types/game.js'

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr]; let s = seed
  for (let i = a.length-1; i>0; i--) {
    s = (s*1664525+1013904223)&0xffffffff
    const j = Math.abs(s)%(i+1);[a[i],a[j]]=[a[j],a[i]]
  }
  return a
}
const cs = (c: Card) => c.rank+(c.suit==='clubs'?'♣':c.suit==='diamonds'?'♦':c.suit==='hearts'?'♥':'♠')

function rulesForLevel(): RulesConfig {
  return { ...DEFAULT_RULES, kakumei:true, eightCut:true, elevenBack:true, shibari:true,
    kaidan:true, miyakochi:true, nanaWatashi:true, junTen:true, supe3gaeshi:true,
    suitshibari:true, kinshiAgari:false, forbidPairs:false, forbidStairs:false }
}

function applyLv79(seed: number): { state: GameState; hand: Card[] } {
  const rules = rulesForLevel()
  const state0 = initGame(rules, ['P','C1','C2','C3'], undefined, seed)
  const players = state0.players.map(p => ({ ...p, hand: [...p.hand] }))

  // curseCombo: player gets weakest 7 from all cards (h:0 = no seizure)
  const all = players.flatMap(p => p.hand)
    .filter(c => c.rank !== 'JOKER')
    .sort((a,b) => a.value - b.value)
  const weak7 = all.slice(0, 7)
  const weakIds = new Set(weak7.map(c => c.id))
  const rest = all.filter(c => !weakIds.has(c.id))
  players[0].hand = [...weak7]
  // CPU th:1 gets t=7 cards
  const cpu1gets = rest.slice(0, 7)
  const remaining = rest.slice(7)
  players[1].hand = cpu1gets
  const half = Math.floor(remaining.length / 2)
  players[2].hand = remaining.slice(0, half)
  players[3].hand = remaining.slice(half)

  // spades guarantee
  if (!players[0].hand.some(c => c.suit === 'spades')) {
    for (let pi = 1; pi < 4; pi++) {
      const ci = players[pi].hand.findIndex(c => c.suit === 'spades')
      if (ci < 0) continue
      const ri = players[0].hand.map((c,i) => ({c,i})).sort((a,b) => a.c.value-b.c.value)[0]?.i
      if (ri === undefined) break
      const tmp = players[0].hand[ri]
      players[0].hand[ri] = players[pi].hand[ci]
      players[pi].hand[ci] = tmp
      break
    }
  }

  const challengeRules = { ...rules, maxPlayerPasses: 3 } as any
  const st: GameState = { ...state0, players, rules: challengeRules,
    currentPlayerIndex: 0, lastPlayedBy: 0, must2431: [], log: [],
    shibariSuit: 'spades' as any }
  return { state: st, hand: players[0].hand }
}

function simulate(seed: number): boolean {
  const { state: init } = applyLv79(seed)
  let state = init; let steps = 0
  while (state.phase !== 'result' && steps < 600) {
    steps++
    if (state.phase === 'sevenPass') { state = pass(state); continue }
    const cur = state.currentPlayerIndex
    if (cur !== 0) {
      const played = cpuChoosePlay(state)
      if (played && validatePlay(state,played).valid) state = playCards(state,played)
      else state = pass(state)
      continue
    }
    const hand = state.players[0].hand
    const allValid: Card[][] = []
    const byRank = new Map<string|number, Card[]>()
    hand.forEach(c => { if (c.rank!=='JOKER') { const a=byRank.get(c.rank)??[]; a.push(c); byRank.set(c.rank,a) }})
    if (state.fieldCount > 0) {
      for (const c of hand) if (validatePlay(state,[c]).valid) allValid.push([c])
      byRank.forEach(cs2 => { for (let k=Math.min(cs2.length,4);k>=2;k--) { const cb=cs2.slice(0,k); if(validatePlay(state,cb).valid) allValid.push(cb) }})
    } else {
      byRank.forEach(cs2 => { for (let k=Math.min(cs2.length,4);k>=1;k--) { const cb=cs2.slice(0,k); if(validatePlay(state,cb).valid){allValid.push(cb);break} }})
    }
    if (!allValid.length) { state = pass(state) }
    else {
      allValid.sort((a,b) => Math.max(...a.map(c=>c.value)) - Math.max(...b.map(c=>c.value)))
      const vr = validatePlay(state, allValid[0])
      if (vr.valid) state = playCards(state, allValid[0])
      else state = pass(state)
    }
  }
  return state.phase === 'result' && state.players[0].finishOrder === 1
}

console.log('Lv79 スペード縛り h:0 シード探索 (♠2枚以上)\n')
const found: {seed:number, hand:string, sp:number, wins:number}[] = []
for (let seed = 7900; seed <= 8200; seed++) {
  const { hand } = applyLv79(seed)
  const sp = hand.filter(c => c.suit==='spades').length
  if (sp < 2) continue
  let wins = 0
  for (let t = 0; t < 3; t++) if (simulate(seed)) wins++
  const h = hand.map(cs).join(' ')
  console.log(`seed=${seed}: [${h}] ♠${sp}枚 wins=${wins}/3`)
  if (wins >= 2) found.push({ seed, hand: h, sp, wins })
}
console.log('\n--- 採用候補 ---')
found.forEach(f => console.log(`seed=${f.seed}: [${f.hand}] ♠${f.sp}枚 wins=${f.wins}/3`))
