import { createDeck } from '../src/logic/cards'

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

const SEEDS = [79, 7900, 7922]
for (const seed of SEEDS) {
  const deck = seededShuffle(createDeck(), seed)
  const sorted = deck.filter(c => c.rank !== 'JOKER').sort((a,b) => a.value - b.value)
  const hand7 = sorted.slice(0, 7)
  const s = (c: any) => c.rank + (c.suit==='clubs'?'♣':c.suit==='diamonds'?'♦':c.suit==='hearts'?'♥':'♠')
  console.log(`seed=${seed}: [${hand7.map(s).join(' ')}] clubs=${hand7.filter((c:any)=>c.suit==='clubs').length}枚`)
}
