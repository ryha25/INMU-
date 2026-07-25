// Lv80: 四つ子が3以外（4〜8）のシードを探す。タイミングが重要になる。
import { initGame, playCards, pass, validatePlay } from '../src/logic/gameEngine.js'
import { cpuChoosePlay } from '../src/logic/cpuAI.js'
import type { GameState, Card, RulesConfig } from '../src/types/game.js'

function cardStr(c: Card) {
  const S: Record<string,string> = {spades:'♠',hearts:'♥',diamonds:'♦',clubs:'♣',joker:'JO'}
  const V: Record<string|number,string> = {1:'A',11:'J',12:'Q',13:'K',14:'2','JOKER':'JO'}
  if (c.rank==='JOKER') return 'JO'
  return (V[c.value]??String(c.value))+(S[c.suit]??c.suit)
}
function rules80(): RulesConfig {
  return { kakumei:true, eightCut:true, elevenBack:true, shibari:true, kaidan:true,
    miyakochi:true, nanaWatashi:true, junTen:true, supe3gaeshi:true,
    suitshibari:true, kinshiAgari:false, forbidPairs:false, forbidStairs:false }
}

function applyLv80(seed: number) {
  const rules = rules80()
  const s0 = initGame(rules, ['P','C1','C2','C3'], undefined, seed)
  const players = s0.players.map(p => ({ ...p, hand: [...p.hand] }))
  // h:1 seize
  const sorted = [...players[0].hand].sort((a,b) => b.value - a.value)
  const conf = sorted.slice(0,1)
  players[0].hand = players[0].hand.filter(c => !conf.some(cc => cc.id === c.id))
  players[3].hand.push(...conf)
  // 四つ子保証
  const all = players.flatMap(p => p.hand)
  const groups = new Map<string, Card[]>()
  all.forEach(c => { if (c.rank!=='JOKER') groups.set(String(c.rank), [...(groups.get(String(c.rank))??[]), c]) })
  const four = [...groups.values()].find(cs => cs.length>=4)?.slice(0,4)
  if (four) {
    const wantedIds = new Set(four.map(c => c.id))
    const replaceSlots = players[0].hand.map((c,i) => ({c,i})).filter(x => !wantedIds.has(x.c.id))
    four.filter(c => !players[0].hand.some(o => o.id===c.id)).forEach((card, si) => {
      const ownerPi = players.findIndex(p => p.hand.some(o => o.id===card.id))
      const ownerCi = ownerPi>=0 ? players[ownerPi].hand.findIndex(o => o.id===card.id) : -1
      const slot = replaceSlots[si]
      if (ownerPi<0||ownerCi<0||!slot) return
      players[0].hand[slot.i] = card
      players[ownerPi].hand[ownerCi] = slot.c
    })
  }
  const candidates = [...players[0].hand].sort((a,b) => b.value-a.value)
  const fourIds = new Set((four??[]).map(c => c.id))
  const pinned = players[0].hand.filter(c => fourIds.has(c.id))
  const rest = candidates.filter(c => !fourIds.has(c.id))
  players[0].hand = [...pinned, ...rest.slice(0, 7-pinned.length)].sort((a,b) => a.value-b.value)
  players[1].hand.splice(7); players[2].hand.splice(7)
  const cRules = { ...rules, maxTurns: 25, maxPlayerPasses: 3 } as any
  return { state: { ...s0, players, rules: cRules, currentPlayerIndex:0, lastPlayedBy:0, must2431:[], log:[] } as GameState, hand: players[0].hand, four }
}

function simulate(seed: number): boolean {
  let state = applyLv80(seed).state
  let steps = 0
  while (state.phase!=='result' && steps<600) {
    steps++
    if (state.phase==='sevenPass') { state=pass(state); continue }
    const cur = state.currentPlayerIndex
    if (cur!==0) {
      const played = cpuChoosePlay(state)
      if (played && validatePlay(state,played).valid) state=playCards(state,played)
      else state=pass(state)
      continue
    }
    const hand = state.players[0].hand
    const allValid: Card[][] = []
    const byRank = new Map<string|number, Card[]>()
    hand.forEach(c => { if (c.rank!=='JOKER') { const a=byRank.get(c.rank)??[]; a.push(c); byRank.set(c.rank,a) }})
    if (state.fieldCount>0) {
      for (const c of hand) if (validatePlay(state,[c]).valid) allValid.push([c])
      byRank.forEach(cs => { for(let k=Math.min(cs.length,4);k>=2;k--){const cb=cs.slice(0,k);if(validatePlay(state,cb).valid)allValid.push(cb)} })
    } else {
      byRank.forEach(cs => { for(let k=Math.min(cs.length,4);k>=1;k--){const cb=cs.slice(0,k);if(validatePlay(state,cb).valid){allValid.push(cb);break}} })
    }
    if (!allValid.length) { state=pass(state) }
    else {
      if (state.revolutionActive)
        allValid.sort((a,b) => Math.max(...b.map(c=>c.value))-Math.max(...a.map(c=>c.value)))
      else
        allValid.sort((a,b) => Math.max(...a.map(c=>c.value))-Math.max(...b.map(c=>c.value)))
      const vr = validatePlay(state,allValid[0])
      if (vr.valid) state=playCards(state,allValid[0])
      else state=pass(state)
    }
  }
  return state.phase==='result' && state.players[0].finishOrder===1
}

console.log('=== Lv80 四つ子が4〜8ランク シード探索 (pass:3追加) ===')
const found: {seed:number, hand:string, rank:number, wins:number}[] = []
for (let s=8000; s<=8300; s++) {
  const { hand, four } = applyLv80(s)
  if (!four) continue
  const fourRank = four[0].value
  if (fourRank < 4 || fourRank > 8) continue // 3以外の四つ子
  let wins=0
  for (let t=0;t<3;t++) if (simulate(s)) wins++
  if (wins>=2) {
    const h=hand.map(cardStr).join(' ')
    console.log(`  seed=${s}: [${h}] 四${fourRank} wins=${wins}/3`)
    found.push({seed:s, hand:h, rank:fourRank, wins})
  }
}
if (found.length===0) console.log('  見つからず → 3の四つ子 + pass:3 で難易度調整')
