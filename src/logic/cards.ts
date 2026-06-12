import { Card, Suit, Rank } from '../types/game'

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs']
const RANKS: { rank: Rank; value: number }[] = [
  { rank: 3, value: 3 },
  { rank: 4, value: 4 },
  { rank: 5, value: 5 },
  { rank: 6, value: 6 },
  { rank: 7, value: 7 },
  { rank: 8, value: 8 },
  { rank: 9, value: 9 },
  { rank: 10, value: 10 },
  { rank: 11, value: 11 },
  { rank: 12, value: 12 },
  { rank: 13, value: 13 },
  { rank: 1, value: 14 },
  { rank: 2, value: 15 },
]

export function createDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const { rank, value } of RANKS) {
      deck.push({ id: `${suit}-${rank}`, suit, rank, value })
    }
  }
  return deck
}

export function shuffle(cards: Card[]): Card[] {
  const arr = [...cards]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function dealCards(deck: Card[], numPlayers: number): Card[][] {
  const hands: Card[][] = Array.from({ length: numPlayers }, () => [])
  deck.forEach((card, i) => hands[i % numPlayers].push(card))
  return hands.map(hand => sortHand(hand))
}

export function sortHand(hand: Card[]): Card[] {
  return [...hand].sort((a, b) => a.value - b.value || a.suit.localeCompare(b.suit))
}

export function getRankDisplay(rank: Rank): string {
  if (rank === 1) return 'A'
  if (rank === 11) return 'J'
  if (rank === 12) return 'Q'
  if (rank === 13) return 'K'
  if (rank === 'JOKER') return 'JK'
  return String(rank)
}

export function getSuitSymbol(suit: Suit): string {
  switch (suit) {
    case 'spades': return '♠'
    case 'hearts': return '♥'
    case 'diamonds': return '♦'
    case 'clubs': return '♣'
    case 'joker': return '🃏'
  }
}

export function isRedSuit(suit: Suit): boolean {
  return suit === 'hearts' || suit === 'diamonds'
}

export function getPlayValue(cards: Card[]): number {
  return Math.max(...cards.map(c => c.value))
}

// ------- Combo Checks -------

export function check1919(cards: Card[]): boolean {
  if (cards.length !== 4) return false
  const ranks = cards.map(c => c.rank).sort()
  return ranks[0] === 1 && ranks[1] === 1 && ranks[2] === 9 && ranks[3] === 9
}

export function check810(cards: Card[]): boolean {
  if (cards.length !== 2) return false
  const ranks = cards.map(c => c.rank).sort((a, b) => Number(a) - Number(b))
  return ranks[0] === 8 && ranks[1] === 10
}

export function check114514(cards: Card[]): boolean {
  if (cards.length !== 6) return false
  const ranks = cards.map(c => c.rank)
  const count = (r: Rank) => ranks.filter(x => x === r).length
  return count(1) === 3 && count(4) === 2 && count(5) === 1
}

// 2431: player's starting hand must include 2,4,3,1 (ranks 2,4,3,A)
export function check2431InHand(hand: Card[]): boolean {
  const ranks = hand.map(c => c.rank)
  const count = (r: Rank) => ranks.filter(x => x === r).length
  return count(2) >= 1 && count(4) >= 1 && count(3) >= 1 && count(1) >= 1
}

// Get the 2431 cards from hand (pick first of each needed rank)
export function get2431Cards(hand: Card[]): Card[] {
  const needed: Rank[] = [2, 4, 3, 1]
  const result: Card[] = []
  for (const rank of needed) {
    const card = hand.find(c => c.rank === rank && !result.includes(c))
    if (card) result.push(card)
  }
  return result
}

// 革命: 4+ of same rank
export function checkKakumei(cards: Card[]): boolean {
  if (cards.length < 4) return false
  const ranks = cards.map(c => c.rank)
  const allSame = ranks.every(r => r === ranks[0])
  return allSame
}

// 8切り: any play with all 8s
export function checkEightCut(cards: Card[]): boolean {
  return cards.length > 0 && cards.every(c => c.rank === 8)
}

// イレブンバック: any play with all Js
export function checkElevenBack(cards: Card[]): boolean {
  return cards.length > 0 && cards.every(c => c.rank === 11)
}

// 7渡し: any play with all 7s
export function checkSevenPass(cards: Card[]): boolean {
  return cards.length > 0 && cards.every(c => c.rank === 7)
}

// 10捨て: any play with all 10s
export function checkTenDiscard(cards: Card[]): boolean {
  return cards.length > 0 && cards.every(c => c.rank === 10)
}

// 縛り: all cards same suit
export function checkShibari(cards: Card[]): boolean {
  if (cards.length < 2) return false
  return cards.every(c => c.suit === cards[0].suit)
}

// スペ3返し: single ♠3 played against single 2
export function checkSupe3(cards: Card[]): boolean {
  return cards.length === 1 && cards[0].suit === 'spades' && cards[0].rank === 3
}

// 階段: consecutive ranks (min 3 cards), 1 card per rank, in sequence
// e.g. 3-4-5, 7-8-9-10, etc.
export function checkKaidan(cards: Card[]): boolean {
  if (cards.length < 3) return false
  // All cards unique rank
  const rankVals = cards.map(c => c.value)
  const uniqueRanks = new Set(rankVals)
  if (uniqueRanks.size !== cards.length) return false
  // Sorted consecutive
  const sorted = [...rankVals].sort((a, b) => a - b)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) return false
  }
  return true
}

// Find player who holds ♠3 (goes first)
export function findFirstPlayer(hands: Card[][]): number {
  for (let i = 0; i < hands.length; i++) {
    if (hands[i].some(c => c.suit === 'spades' && c.rank === 3)) return i
  }
  return 0
}
