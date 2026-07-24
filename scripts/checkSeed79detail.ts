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

const s = (c: any) => c.rank + (c.suit==='clubs'?'♣':c.suit==='diamonds'?'♦':c.suit==='hearts'?'♥':'♠')

for (const seed of [79, 7900]) {
  const deck = seededShuffle(createDeck(), seed)
  const sorted = deck.filter(c => c.rank !== 'JOKER').sort((a,b) => a.value - b.value)
  const initial7 = sorted.slice(0, 7)
  console.log(`\nseed=${seed} curseCombo初期7枚: [${initial7.map(s).join(' ')}]`)
  
  // h:1 = 最強カード没収（最高valueをCPUへ）
  const strongest = initial7[initial7.length - 1]
  const after = initial7.filter(c => c.id !== strongest.id)
  // CPU1の最弱カード（初期7枚以外）を補充
  const cpuCandidates = deck.filter(c => !initial7.some(h => h.id === c.id) && c.rank !== 'JOKER')
  const cpuWeakest = cpuCandidates.sort((a,b) => a.value - b.value)[0]
  after.push(cpuWeakest)
  after.sort((a,b) => a.value - b.value)
  
  const clubs = after.filter(c => c.suit === 'clubs')
  console.log(`  没収: ${s(strongest)} → もらう: ${s(cpuWeakest)}`)
  console.log(`  最終手札7枚: [${after.map(s).join(' ')}]`)
  console.log(`  クラブ: ${clubs.map(s).join(' ')} (${clubs.length}枚)`)
}
