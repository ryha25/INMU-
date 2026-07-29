import { simulateGame } from './testAllLevels.js'

const requested = process.argv.slice(2).map(Number).filter(Number.isInteger)
const levels = requested.length ? requested : [73, 74, 75, 76, 78, 79, 80, 81, 83, 84, 85]
const strategies = 24
const scanLimit = Math.max(1, Number(process.env.SEED_SCAN_LIMIT) || 150)

for (const level of levels) {
  const candidates: { seed: number; wins: number }[] = []
  for (let offset = 0; offset < scanLimit; offset++) {
    const seed = level * 100 + offset
    let wins = 0
    for (let strategy = 0; strategy < strategies; strategy++) {
      if (simulateGame(level, seed, strategy).win) wins++
      if (wins > 8) break
    }
    if (wins >= 1 && wins <= 8) candidates.push({ seed, wins })
    if (candidates.length >= 5) break
  }
  console.log(`Lv${level}: ${candidates.map(item => `${item.seed}(${item.wins}/24)`).join(', ') || '候補なし'}`)
}
