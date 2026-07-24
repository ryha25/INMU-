// Lv78: 少し難しめ（ペア1-2個、AI 1-2/3勝）
// Lv79: 人間が勝てるシード探索
import { initGame, playCards, pass, resolveSevenPass, resolveTenDiscard, validatePlay } from '../src/logic/gameEngine.js'
import { cpuChoosePlay } from '../src/logic/cpuAI.js'
import type { GameState, Card, RulesConfig } from '../src/types/game.js'

const BASE_RULES: RulesConfig = {
  kakumei:true,eightCut:true,elevenBack:true,shibari:true,kaidan:true,miyakochi:true,
  nanaWatashi:true,junTen:true,supe3gaeshi:true,suitshibari:true,kinshiAgari:false,
  forbidPairs:false,forbidStairs:false,
}

function cardStr(c: Card) {
  const S: Record<string,string> = {spades:'♠',hearts:'♥',diamonds:'♦',clubs:'♣',joker:'JO'}
  const V: Record<string|number,string> = {1:'A',11:'J',12:'Q',13:'K',14:'2',15:'JO','JOKER':'JO'}
  if ((c as any).isJoker || c.rank === 'JOKER') return 'JO'
  return (V[c.value] ?? String(c.value)) + (S[c.suit] ?? c.suit)
}

function getHand78(seed: number) {
  const state = initGame(BASE_RULES, ['P','C1','C2','C3'], undefined, seed)
  const players = state.players.map(p => ({...p, hand: [...p.hand]}))
  // h:1 最強1枚没収
  const top = [...players[0].hand].sort((a,b) => b.value - a.value)[0]
  players[0].hand = players[0].hand.filter(c => c.id !== top.id)
  // rev=true → 低値7枚
  const hand = [...players[0].hand].sort((a,b) => a.value - b.value).slice(0, 7)
  players[0].hand = hand
  players[1].hand.splice(7)
  const s: GameState = {
    ...state, players, revolutionActive: true, currentPlayerIndex: 0,
    lastPlayedBy: 0, must2431: [], log: [],
    rules: {...BASE_RULES, maxPlayerPasses: 4} as any,
  }
  return { state: s, hand }
}

function getHand79(seed: number) {
  const state = initGame(BASE_RULES, ['P','C1','C2','C3'], undefined, seed)
  const players = state.players.map(p => ({...p, hand: [...p.hand]}))
  // h:1 最強1枚没収
  const top = [...players[0].hand].sort((a,b) => b.value - a.value)[0]
  players[0].hand = players[0].hand.filter(c => c.id !== top.id)
  // keepWeak → 低値7枚
  const hand = [...players[0].hand].sort((a,b) => a.value - b.value).slice(0, 7)
  players[0].hand = hand
  players[1].hand.splice(7)
  // clubs保証
  if (!players[0].hand.some(c => c.suit === 'clubs')) {
    for (let pi = 1; pi < players.length; pi++) {
      const ci = players[pi].hand.findIndex(c => c.suit === 'clubs')
      if (ci < 0) continue
      const repI = players[0].hand.map((c,i) => ({c,i})).sort((a,b) => a.c.value-b.c.value)[0]?.i
      if (repI === undefined) break
      const rep = players[0].hand[repI]
      players[0].hand[repI] = players[pi].hand[ci]
      players[pi].hand[ci] = rep
      break
    }
  }
  const s: GameState = {
    ...state, players, currentPlayerIndex: 0, lastPlayedBy: 0, must2431: [], log: [],
    rules: {...BASE_RULES, maxPlayerPasses: 3} as any,
  }
  return { state: s, hand: players[0].hand }
}

function doSP(s: GameState): GameState {
  const sp = s.sevenPassState; if (!sp) return pass(s)
  const cur = s.currentPlayerIndex
  const toGive = [...s.players[cur].hand].sort((a,b)=>a.value-b.value).slice(0,sp.totalToGive)
  const targets = [0,1,2,3].filter(i=>!s.finishedPlayers.includes(i)&&i!==cur).sort((a,b)=>s.players[b].hand.length-s.players[a].hand.length)
  if (!toGive.length || !targets.length) return pass(s)
  return resolveSevenPass(s, targets[0], toGive)
}
function doTD(s: GameState): GameState {
  const td = s.tenDiscardState; if (!td) return pass(s)
  const cur = s.currentPlayerIndex
  const toD = [...s.players[cur].hand].sort((a,b)=>a.value-b.value).slice(0,Math.min(td.totalToDiscard,s.players[cur].hand.length))
  if (!toD.length) return pass(s)
  return resolveTenDiscard(s, toD)
}

function sim(state: GameState): boolean {
  let s = state; let steps = 0
  while (s.phase !== 'result' && steps < 600) {
    steps++
    if (s.phase === 'sevenPass') { s = doSP(s); continue }
    if ((s.phase as string) === 'tenDiscard') { s = doTD(s); continue }
    const cur = s.currentPlayerIndex
    if (cur !== 0) {
      const p = cpuChoosePlay(s)
      if (p && validatePlay(s,p).valid) s = playCards(s,p); else s = pass(s)
      continue
    }
    const hand = s.players[0].hand; const all: Card[][] = []
    const byR = new Map<any,Card[]>()
    hand.forEach(c => { if (c.rank!=='JOKER') { const a=byR.get(c.rank)??[]; a.push(c); byR.set(c.rank,a) } })
    if (s.fieldCount > 0) {
      for (const c of hand) if (validatePlay(s,[c]).valid) all.push([c])
      byR.forEach(cs => { for (let k=Math.min(cs.length,4);k>=2;k--) { const cb=cs.slice(0,k); if(validatePlay(s,cb).valid) all.push(cb) } })
      const jk = hand.find(c=>c.rank==='JOKER'); if (jk&&validatePlay(s,[jk]).valid) all.push([jk])
    } else {
      byR.forEach(cs => { for (let k=Math.min(cs.length,4);k>=1;k--) { const cb=cs.slice(0,k); if(validatePlay(s,cb).valid){all.push(cb);break} } })
      const jk = hand.find(c=>c.rank==='JOKER'); if (jk&&validatePlay(s,[jk]).valid) all.push([jk])
    }
    if (!all.length) { s = pass(s) }
    else {
      if (s.revolutionActive)
        all.sort((a,b) => Math.max(...b.map(c=>c.value)) - Math.max(...a.map(c=>c.value)))
      else
        all.sort((a,b) => Math.max(...a.map(c=>c.value)) - Math.max(...b.map(c=>c.value)))
      const vr = validatePlay(s, all[0])
      if (vr.valid) s = playCards(s, all[0]); else s = pass(s)
    }
  }
  return s.phase === 'result' && (s as any).players[0].finishOrder === 1
}

function pairCount(hand: Card[]) {
  const v: Record<string,number> = {}
  hand.forEach(c => { v[String(c.value)] = (v[String(c.value)]||0)+1 })
  return Object.values(v).filter(n => n >= 2).length
}
function hasJoker(hand: Card[]) { return hand.some(c => c.rank === 'JOKER') }

// Lv78: ペア1-2個、AI 1-2/3（ほどよい難易度）
console.log('=== Lv78 適度なシード探索 ===')
let found78 = 0
for (let seed = 7800; seed <= 7999 && found78 < 8; seed++) {
  const { state, hand } = getHand78(seed)
  const pc = pairCount(hand); const jo = hasJoker(hand)
  if (pc < 1 && !jo) continue
  let wins = 0
  for (let t = 0; t < 3; t++) if (sim(state)) wins++
  if (wins >= 1 && wins <= 2 && pc <= 2 && !jo) {
    console.log(`  seed=${seed} wins=${wins}/3 pairs=${pc} [${[...hand].sort((a,b)=>a.value-b.value).map(cardStr).join(' ')}]`)
    found78++
  }
}

// Lv79: AI 4-5/5（人間でも現実的に勝てる）
console.log('\n=== Lv79 勝ちやすいシード探索 ===')
let found79 = 0
for (let seed = 7900; seed <= 8100 && found79 < 6; seed++) {
  const { state, hand } = getHand79(seed)
  const clubs = hand.filter(c => c.suit === 'clubs').length
  let wins = 0
  for (let t = 0; t < 5; t++) if (sim(state)) wins++
  if (wins >= 4 && clubs >= 2) {
    console.log(`  seed=${seed} wins=${wins}/5 clubs=${clubs} [${[...hand].sort((a,b)=>a.value-b.value).map(cardStr).join(' ')}]`)
    found79++
  }
}
