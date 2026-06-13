import { GameState, Card } from '../types/game'
import { validatePlay, playCards, pass } from './gameEngine'
import { getPlayValue, check114514, check1919, check810, checkKaidan } from './cards'

function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]]
  if (k > arr.length) return []
  const [first, ...rest] = arr
  const withFirst = combinations(rest, k - 1).map(c => [first, ...c])
  const withoutFirst = combinations(rest, k)
  return [...withFirst, ...withoutFirst]
}

export function cpuChoosePlay(state: GameState): Card[] | null {
  const player = state.players[state.currentPlayerIndex]
  const hand = player.hand
  if (hand.length === 0) return null

  const fieldCount = state.fieldCount
  const maxSize = Math.min(hand.length, fieldCount > 0 ? fieldCount : 6)

  const allValid: Card[][] = []

  if (fieldCount > 0) {
    const combos = combinations(hand, fieldCount)
    for (const combo of combos) {
      if (validatePlay(state, combo).valid) allValid.push(combo)
    }
    // Also check stairs if in staircase mode
    if (state.stairsMode) {
      for (let k = 3; k <= hand.length; k++) {
        const combos2 = combinations(hand, k)
        for (const combo of combos2) {
          if (validatePlay(state, combo).valid) allValid.push(combo)
        }
      }
    }
  } else {
    // Empty field: try small combos first
    for (let k = 1; k <= maxSize; k++) {
      const combos = combinations(hand, k)
      for (const combo of combos) {
        if (validatePlay(state, combo).valid) allValid.push(combo)
      }
      if (allValid.length > 0 && k <= 2) break
    }
  }

  if (allValid.length === 0) return null

  // 強力牌を温存: 手札が多いうちはジョーカー・114514を出さない
  const isLowHand = hand.length <= 7
  const filtered = allValid.filter(cards => {
    if (check114514(cards) && !isLowHand) return false
    if (cards.some(c => c.rank === 'JOKER') && !isLowHand) return false
    return true
  })

  const pool = filtered.length > 0 ? filtered : allValid

  // Sort ascending by value: play weakest valid cards
  pool.sort((a, b) => getPlayValue(a) - getPlayValue(b))

  return pool[0]
}
