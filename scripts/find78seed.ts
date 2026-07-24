import { initGame, playCards, pass, resolveSevenPass, resolveTenDiscard, validatePlay } from '../src/logic/gameEngine.js'
import { cpuChoosePlay } from '../src/logic/cpuAI.js'
import type { GameState, Card, RulesConfig } from '../src/types/game.js'

const rules: RulesConfig = {
  kakumei: true, eightCut: true, elevenBack: true,
  shibari: true, kaidan: true, miyakochi: true,
  nanaWatashi: true, junTen: true, supe3gaeshi: true,
  suitshibari: true, kinshiAgari: false,
  forbidPairs: false, forbidStairs: false,
}

function cardStr(c: any) {
  const SUITS: Record<string, string> = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' }
  const VALS: Record<number, string> = { 1:'A',11:'J',12:'Q',13:'K',14:'2',15:'joker' }
  if (c.isJoker) return 'JO'
  return (VALS[c.value] ?? String(c.value)) + (SUITS[c.suit] ?? c.suit)
}

function setupLv78(seed: number) {
  let state = initGame(rules, ['P','C1','C2','C3'], undefined, seed)
  const players = state.players.map(p => ({ ...p, hand: [...p.hand] }))

  // th:1, t:7 → CPU1だけ7枚制限、余りはプレイヤーへ
  const ex = players[1].hand.splice(7)
  players[0].hand.push(...ex)

  // h:1 → プレイヤー最強カードを没収
  const sorted0 = [...players[0].hand].sort((a: any, b: any) => b.value - a.value)
  const allCpuCards = [...players[1].hand, ...players[2].hand, ...players[3].hand]
  const cpuWorst = [...allCpuCards].sort((a: any, b: any) => a.value - b.value)[0]
  const hiCard = sorted0[0]
  players[0].hand = players[0].hand.filter((c: any) => c !== hiCard)
  for (let pi = 1; pi < players.length; pi++) {
    const idx = players[pi].hand.findIndex((c: any) => c === cpuWorst)
    if (idx >= 0) { players[pi].hand.splice(idx, 1); break }
  }
  players[0].hand.push(cpuWorst)

  return { state: { ...state, isRevolution: true }, players }
}

// seed=78の手札を表示
const { players: p78 } = setupLv78(78)
const hand78 = [...p78[0].hand].sort((a: any, b: any) => a.value - b.value).map(cardStr)
console.log(`seed=78 手札: [${hand78.join(' ')}] (${hand78.length}枚)`)

// ペアorジョーカーありのシードを探す
console.log('Lv78の勝てるシードを探索中 (seed=7800〜7950)...')
let found = 0
for (let seed = 7800; seed <= 7950; seed++) {
  const { players: p } = setupLv78(seed)
  const hand = [...p[0].hand].sort((a: any, b: any) => a.value - b.value).map(cardStr)
  const vals: Record<number, number> = {}
  p[0].hand.forEach((c: any) => { vals[c.value] = (vals[c.value] || 0) + 1 })
  const hasPair = Object.values(vals).some(v => v >= 2)
  const hasJoker = p[0].hand.some((c: any) => c.isJoker)
  if (hasPair || hasJoker) {
    console.log(`  ✅ seed=${seed}: [${hand.join(' ')}]`)
    found++
    if (found >= 5) break
  }
}
