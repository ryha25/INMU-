import { GameState, Card } from '../types/game'
import { validatePlay } from './gameEngine'
import { getPlayValue, check114514, checkEightCut, check810, checkKaidan, checkKakumei, get2431Cards } from './cards'

function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]]
  if (k > arr.length) return []
  const [first, ...rest] = arr
  return [
    ...combinations(rest, k - 1).map(c => [first, ...c]),
    ...combinations(rest, k),
  ]
}

/**
 * CPU の手札から最善手を選択する。
 * ・空の場では ペア/セット > 弱い階段 > 単体 の優先順で出す
 * ・強い札（Joker / 114514）は手札が少なくなるまで温存
 * ・場がある場合は最弱の合法手を出す
 */
export function cpuChoosePlay(state: GameState): Card[] | null {
  const player = state.players[state.currentPlayerIndex]
  const hand = player.hand
  if (hand.length === 0) return null

  // ── 2431 強制プレイ ──────────────────────────────────────────────────────
  if (state.must2431.includes(state.currentPlayerIndex) && !state.secondRoundOrLater) {
    const forced = get2431Cards(hand)
    if (forced.length === 4) return forced
    return null
  }

  const fieldCount = state.fieldCount

  // ── 終盤: 革命を仕掛ける（手札が減ってから）────────────────────────────
  if (fieldCount === 0 && state.rules.kakumei && hand.length <= 6) {
    const byRank = new Map<string, Card[]>()
    hand.forEach(card => {
      if (card.suit === 'joker') return
      const key = String(card.rank)
      byRank.set(key, [...(byRank.get(key) ?? []), card])
    })
    const revolution = [...byRank.values()].find(cards => cards.length >= 4)?.slice(0, 4)
    if (revolution && checkKakumei(revolution)) return revolution
  }

  const allValid: Card[][] = []

  // ── 場ありの場合 ─────────────────────────────────────────────────────────
  if (fieldCount > 0) {
    for (const combo of combinations(hand, fieldCount)) {
      if (validatePlay(state, combo).valid) allValid.push(combo)
    }
    // 階段モード: 複数サイズを試す
    if (state.stairsMode) {
      for (let k = 3; k <= hand.length; k++) {
        for (const combo of combinations(hand, k)) {
          if (validatePlay(state, combo).valid) allValid.push(combo)
        }
      }
    }
  } else {
    // ── 空の場: 効率的にコンボを探す ─────────────────────────────────────

    // 1) 同ランクグループ（ペア・セット）: 最大4枚まで
    const byRank = new Map<string, Card[]>()
    hand.forEach(card => {
      if (card.suit === 'joker') return
      const key = String(card.rank)
      byRank.set(key, [...(byRank.get(key) ?? []), card])
    })
    byRank.forEach(cards => {
      for (let k = Math.min(cards.length, 4); k >= 1; k--) {
        const combo = cards.slice(0, k)
        if (validatePlay(state, combo).valid) {
          allValid.push(combo)
          break // そのランクの最大コンボだけ追加
        }
      }
    })

    // 2) 階段: 連続するランク3枚以上（組み合わせ爆発を避け直接探索）
    if (state.rules.kaidan) {
      const sorted = [...hand]
        .filter(c => c.suit !== 'joker')
        .sort((a, b) => a.value - b.value)
      const uniqueVals = [...new Set(sorted.map(c => c.value))]
      let i = 0
      while (i < uniqueVals.length) {
        let j = i + 1
        while (j < uniqueVals.length && uniqueVals[j] === uniqueVals[j - 1] + 1) j++
        if (j - i >= 3) {
          // 最短3枚の弱い階段を候補に追加
          const stairVals = uniqueVals.slice(i, i + 3)
          const stairCards = stairVals.map(v => sorted.find(c => c.value === v)!)
          if (stairCards.every(Boolean) && validatePlay(state, stairCards).valid) {
            allValid.push(stairCards)
          }
        }
        i = j
      }
    }

    // 3) ジョーカー単体
    const joker = hand.find(c => c.suit === 'joker')
    if (joker && validatePlay(state, [joker]).valid) allValid.push([joker])
  }

  if (allValid.length === 0) return null

  // ── 強力牌を温存するフィルタ ─────────────────────────────────────────────
  const isLowHand = hand.length <= 7
  const filtered = allValid.filter(cards => {
    if (check114514(cards) && !isLowHand) return false
    if (cards.some(c => c.rank === 'JOKER') && !isLowHand) return false
    // 空の場で8切りループ防止
    if (fieldCount === 0 && state.rules.eightCut && checkEightCut(cards) && !check810(cards)) return false
    return true
  })

  const pool = filtered.length > 0 ? filtered : allValid

  // ── 空の場: ペア/セット → 階段 → 単体 の順で優先 ────────────────────────
  if (fieldCount === 0) {
    // 同ランク2枚以上のコンボを抽出（ジョーカーは除外）
    const multiSameRank = pool.filter(c =>
      c.length >= 2 && c.every(card => card.rank === c[0].rank) && !c.some(card => card.suit === 'joker')
    )
    if (multiSameRank.length > 0) {
      multiSameRank.sort((a, b) => {
        const va = getPlayValue(a), vb = getPlayValue(b)
        // 弱いランク優先; 同じ強さなら枚数が多い方
        return va !== vb ? va - vb : b.length - a.length
      })
      return multiSameRank[0]
    }

    // 階段があれば弱い3枚階段を優先
    const stairs = pool.filter(c => c.length >= 3 && checkKaidan(c))
    if (stairs.length > 0) {
      stairs.sort((a, b) => getPlayValue(a) - getPlayValue(b))
      return stairs[0]
    }
  }

  // デフォルト: 最弱の合法コンボ
  pool.sort((a, b) => getPlayValue(a) - getPlayValue(b))
  return pool[0]
}
