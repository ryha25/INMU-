// Lv79 スペード縛り候補シード探索
// curseCombo t=7, th=1, h=0, pass=3, suit='spades'
import { createDeck, Card } from '../src/logic/cards'
import { initGame, validatePlay, playCards, pass } from '../src/logic/gameEngine'
import { GameState } from '../src/types/game'
import { DEFAULT_RULES } from '../src/types/game'

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr]
  let s = seed
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const s = (c: Card) => c.rank + (c.suit==='clubs'?'♣':c.suit==='diamonds'?'♦':c.suit==='hearts'?'♥':'♠')

function buildHand(seed: number): Card[] {
  const deck = seededShuffle(createDeck().filter(c => c.rank !== 'JOKER'), seed)
  // curseCombo: weakest 7
  const sorted = [...deck].sort((a, b) => a.value - b.value)
  return sorted.slice(0, 7)
}

function simulate(seed: number): boolean {
  const t = 7
  const deck = seededShuffle(createDeck(), seed)
  const perPlayer = Math.floor(deck.length / 4)
  const players = [
    { name: 'P', hand: deck.slice(0, perPlayer) },
    { name: 'C1', hand: deck.slice(perPlayer, perPlayer*2) },
    { name: 'C2', hand: deck.slice(perPlayer*2, perPlayer*3) },
    { name: 'C3', hand: deck.slice(perPlayer*3) },
  ]
  // curseCombo: give player the t weakest cards from all cards
  const allCards = players.flatMap(p => p.hand).sort((a,b) => a.value - b.value)
  const weak7 = allCards.filter(c => c.rank !== 'JOKER').sort((a,b) => a.value - b.value).slice(0, t)
  // Reassign
  players[0].hand = weak7
  // Remove from CPUs
  const weakIds = new Set(weak7.map(c => c.id))
  players[1].hand = players.slice(1).flatMap(p => p.hand).filter(c => !weakIds.has(c.id))
  players[2].hand = []
  players[3].hand = []
  // Distribute to CPUs
  const cpuCards = players[1].hand
  const c1 = cpuCards.slice(0, Math.floor(cpuCards.length/3))
  const c2 = cpuCards.slice(Math.floor(cpuCards.length/3), Math.floor(cpuCards.length*2/3))
  const c3 = cpuCards.slice(Math.floor(cpuCards.length*2/3))
  players[1].hand = c1.slice(0, 13)
  players[2].hand = c2.slice(0, 13)
  players[3].hand = c3

  const rules = { ...DEFAULT_RULES, maxPlayerPasses: 3, nanaWatashi: false }
  let state = initGame(players.map(p => p.hand), p => p.name === 'P', rules)
  state = { ...state, shibariSuit: 'spades', currentPlayerIndex: 0, lastPlayedBy: 0 }

  for (let step = 0; step < 600; step++) {
    if (state.phase === 'result') break
    const pi = state.currentPlayerIndex
    const hand = state.players[pi].hand
    if (hand.length === 0) { state = pass(state); continue }
    
    // Simple AI: try best valid play
    const groups = new Map<string, Card[]>()
    for (const c of hand) {
      const k = String(c.rank)
      if (!groups.has(k)) groups.set(k, [])
      groups.get(k)!.push(c)
    }
    const allCombos: Card[][] = []
    groups.forEach(g => { for (let k = Math.min(g.length,4); k>=1; k--) allCombos.push(g.slice(0,k)) })
    
    const valid = allCombos
      .filter(cs => validatePlay(state, cs).valid)
      .sort((a,b) => Math.max(...b.map(c=>c.value)) - Math.max(...a.map(c=>c.value)))
    
    if (!valid.length) { state = pass(state); continue }
    state = playCards(state, valid[0])
  }
  
  const finishOrder = state.players.map((p,i) => ({ i, rank: state.players[i].hand.length }))
  return state.phase === 'result' && state.players[0].hand.length === 0
}

console.log('スペード縛り候補シード探索 (curseCombo, h=0, t=7, pass=3)\n')
const found: {seed:number, hand:Card[], spades:number, wins:number}[] = []

for (let seed = 7900; seed <= 8000; seed++) {
  const hand = buildHand(seed)
  const spades = hand.filter(c => c.suit === 'spades').length
  if (spades < 2) continue  // スペード2枚以上
  
  let wins = 0
  for (let t = 0; t < 3; t++) { if (simulate(seed)) wins++ }
  
  const handStr = hand.map(s).join(' ')
  console.log(`seed=${seed}: [${handStr}] ♠${spades}枚 wins=${wins}/3`)
  if (wins >= 2) found.push({ seed, hand, spades, wins })
}

console.log(`\n--- 採用候補 ---`)
found.forEach(f => console.log(`seed=${f.seed}: [${f.hand.map(s).join(' ')}] ♠${f.spades}枚 wins=${f.wins}/3`))
