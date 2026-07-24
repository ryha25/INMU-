// Lv79 スペード縛り候補探索 (fixSeeds78plus.tsのapplyScenario流用)
import { applyScenario, simulate, cardStr } from './fixSeeds78plus.js'

const results: {seed:number, hand:string, spades:number, wins:number}[] = []

for (let seed = 7900; seed <= 8200; seed++) {
  const { hand } = applyScenario(79, seed)
  const spades = hand.filter(c => c.suit === 'spades').length
  if (spades < 2) continue  // スペード2枚以上のみ

  let wins = 0
  for (let t = 0; t < 3; t++) {
    const { state } = applyScenario(79, seed)
    if (simulate(state)) wins++
  }
  const handStr = hand.map(cardStr).join(' ')
  console.log(`seed=${seed}: [${handStr}] ♠${spades}枚 wins=${wins}/3`)
  if (wins >= 2) results.push({ seed, hand: handStr, spades, wins })
}

console.log('\n--- 採用候補 (wins>=2) ---')
results.forEach(r => console.log(`seed=${r.seed}: [${r.hand}] ♠${r.spades}枚 wins=${r.wins}/3`))
