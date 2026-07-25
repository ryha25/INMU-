import { initGame, playCards, pass as passG, resolveSevenPass, resolveTenDiscard, validatePlay } from '../src/logic/gameEngine.js'
import { cpuChoosePlay } from '../src/logic/cpuAI.js'
import type { GameState, Card } from '../src/types/game.js'

function cardStr(c: Card) {
  const S: Record<string,string> = { spades:'♠', hearts:'♥', diamonds:'♦', clubs:'♣' }
  const V: Record<string|number,string> = { 1:'A',11:'J',12:'Q',13:'K',14:'2',15:'JO','JOKER':'JO' }
  if ((c as any).isJoker || c.rank === 'JOKER') return 'JO'
  return (V[c.value] ?? String(c.value)) + (S[c.suit] ?? c.suit)
}
function rules(lv: number) {
  return { kakumei:lv>=3,eightCut:lv>=6,elevenBack:lv>=8,shibari:lv>=11,kaidan:lv>=16,miyakochi:lv>=41,nanaWatashi:lv>=46,junTen:lv>=51,supe3gaeshi:lv>=56,suitshibari:lv>=61,kinshiAgari:false,forbidPairs:false,forbidStairs:false }
}
function tuneStr(players: any[], ti: number, strong: boolean) {
  const tgt = players[ti].hand
  const tslots = tgt.map((c: Card, i: number) => ({c,i})).sort((a: any,b: any) => strong ? a.c.value-b.c.value : b.c.value-a.c.value)
  const out = players.flatMap((p: any, pi: number) => pi===ti ? [] : p.hand.map((c: Card,ci: number) => ({c,pi,ci}))).sort((a: any,b: any) => strong ? b.c.value-a.c.value : a.c.value-b.c.value)
  const sw = Math.min(Math.ceil(tgt.length/2), out.length)
  for (let i = 0; i < sw; i++) {
    const own = tslots[i], ot = out[i]
    if (strong ? ot.c.value > own.c.value : ot.c.value < own.c.value) {
      players[ti].hand[own.i] = ot.c; players[ot.pi].hand[ot.ci] = own.c
    }
  }
}

// Lv86: doubleThreat, t:7, th:1, h:1, turn:20
function applyLv86(seed: number) {
  const r = rules(86) as any
  const st = initGame(r, ['P','C1','C2','C3'], undefined, seed)
  const players = st.players.map(p => ({ ...p, hand: [...p.hand] }))
  tuneStr(players, 1, true)
  // h:1: confiscate strongest from player
  const sorted = [...players[0].hand].sort((a: Card,b: Card) => b.value-a.value)
  const conf = sorted.slice(0,1)
  players[0].hand = players[0].hand.filter((c: Card) => !conf.some((cc: Card) => cc.id === c.id))
  players[2].hand.push(conf[0])
  // trim to t:7
  players[0].hand = players[0].hand.sort((a: Card,b: Card) => b.value-a.value).slice(0,7).sort((a: Card,b: Card) => a.value-b.value)
  players[1].hand.splice(7)
  const cr = {...r, maxPlayerPasses:null, maxTurns:20, forbidPairs:false, forbidStairs:false}
  return { state: {...st, players, rules:cr, currentPlayerIndex:0, lastPlayedBy:0, revolutionActive:false, must2431:[], log:[]}, hand: players[0].hand as Card[] }
}

// Lv90: finalBoss, t:10, th:3, h:1, ban:ジョーカー, turn:35 (startsInRev=true, hardAdv=1 → playerTarget=9)
function applyLv90(seed: number) {
  const r = rules(90) as any
  const st = initGame(r, ['P','C1','C2','C3'], undefined, seed)
  const players = st.players.map(p => ({ ...p, hand: [...p.hand] }))
  tuneStr(players, 1, true)
  // h:1
  const sorted = [...players[0].hand].sort((a: Card,b: Card) => b.value-a.value)
  const conf = sorted.slice(0,1)
  players[0].hand = players[0].hand.filter((c: Card) => !conf.some((cc: Card) => cc.id === c.id))
  players[2].hand.push(conf[0])
  // ban joker
  const toRemove = players[0].hand.filter((c: Card) => c.rank === 'JOKER')
  const cpuPool = players.slice(1).flatMap((p: any,pi: number) => p.hand.map((c: Card,ci: number) => ({c,pi:pi+1,ci}))).filter((x: any) => x.c.rank !== 'JOKER').sort((a: any,b: any) => a.c.value-b.c.value)
  toRemove.forEach((card: Card, i: number) => {
    if (i >= cpuPool.length) return
    const {c:swap,pi,ci} = cpuPool[i] as any
    const idx = players[0].hand.findIndex((c: Card) => c.id === card.id)
    players[0].hand[idx] = swap; players[pi].hand[ci] = card
  })
  // playerTarget=9 (hardAdv=1)
  players[0].hand = players[0].hand.sort((a: Card,b: Card) => b.value-a.value).slice(0,9).sort((a: Card,b: Card) => a.value-b.value)
  ;[1,2,3].forEach(i => players[i].hand.splice(10))
  const cr = {...r, maxPlayerPasses:null, maxTurns:35, forbidPairs:false, forbidStairs:false}
  return { state: {...st, players, rules:cr, currentPlayerIndex:0, lastPlayedBy:0, revolutionActive:true, must2431:[], log:[]}, hand: players[0].hand as Card[] }
}

function sim(applyFn: (s: number) => {state: GameState, hand: Card[]}, seed: number): boolean {
  const {state:init} = applyFn(seed); let state = init; let steps = 0
  while (state.phase !== 'result' && steps < 600) {
    steps++
    if (state.phase === 'sevenPass') {
      const cur = state.currentPlayerIndex; const sp = state.sevenPassState
      if (!sp) { state = passG(state); continue }
      const toGive = [...state.players[cur].hand].sort((a,b) => a.value-b.value).slice(0, sp.totalToGive)
      const targets = [0,1,2,3].filter(i => !state.finishedPlayers.includes(i) && i !== cur).sort((a,b) => state.players[b].hand.length-state.players[a].hand.length)
      if (!toGive.length || !targets.length) { state = passG(state); continue }
      state = resolveSevenPass(state, targets[0], toGive); continue
    }
    if ((state.phase as string) === 'tenDiscard') {
      const cur = state.currentPlayerIndex; const td = state.tenDiscardState
      if (!td) { state = passG(state); continue }
      const toDiscard = [...state.players[cur].hand].sort((a,b) => a.value-b.value).slice(0, Math.min(td.totalToDiscard, state.players[cur].hand.length))
      if (!toDiscard.length) { state = passG(state); continue }
      state = resolveTenDiscard(state, toDiscard); continue
    }
    const cur = state.currentPlayerIndex
    if (cur !== 0) {
      const played = cpuChoosePlay(state)
      if (played && validatePlay(state, played).valid) state = playCards(state, played)
      else state = passG(state); continue
    }
    const hand = state.players[0].hand; const allValid: Card[][] = []
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
    if (!allValid.length) state = passG(state)
    else {
      if (state.revolutionActive) allValid.sort((a,b) => Math.max(...b.map(c=>c.value))-Math.max(...a.map(c=>c.value)))
      else allValid.sort((a,b) => Math.max(...a.map(c=>c.value))-Math.max(...b.map(c=>c.value)))
      const vr = validatePlay(state, allValid[0])
      if (vr.valid) state = playCards(state, allValid[0]); else state = passG(state)
    }
  }
  return state.phase === 'result' && (state as any).players[0].finishOrder === 1
}

console.log('--- Lv86: h:1 + 10なし探索 (8600〜8800) ---')
for (let s = 8600; s <= 8800; s++) {
  const {hand} = applyLv86(s)
  if (hand.some((c: Card) => c.value === 10)) continue
  let wins = 0; for (let t = 0; t < 3; t++) if (sim(applyLv86, s)) wins++
  if (wins >= 2) console.log(`  seed=${s}: [${hand.map(cardStr).join(' ')}] wins=${wins}/3`)
}

console.log('\n--- Lv90: 7が2枚以下探索 (9000〜9200) ---')
for (let s = 9000; s <= 9200; s++) {
  const {hand} = applyLv90(s)
  const n7 = hand.filter((c: Card) => c.value === 7).length
  if (n7 > 2) continue
  let wins = 0; for (let t = 0; t < 3; t++) if (sim(applyLv90, s)) wins++
  if (wins >= 2) console.log(`  seed=${s}: [${hand.map(cardStr).join(' ')}] 7枚=${n7} wins=${wins}/3`)
}
