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
  { rank: 11, value: 11 }, // J
  { rank: 12, value: 12 }, // Q
  { rank: 13, value: 13 }, // K
  { rank: 1, value: 14 },  // A
  { rank: 2, value: 15 },  // 2 (strongest)
]

export function createDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const { rank, value } of RANKS) {
      deck.push({
        id: `${suit}-${rank}`,
        suit,
        rank,
        value,
      })
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
  deck.forEach((card, i) => {
    hands[i % numPlayers].push(card)
  })
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

// Check if selection is valid to play
export function canPlay(selected: Card[], fieldCards: Card[], fieldValue: number, fieldCount: number, revolutionActive: boolean): boolean {
  if (selected.length === 0) return false
  
  // Field empty - any play is valid
  if (fieldCount === 0) return true
  
  // Must match field count
  if (selected.length !== fieldCount) return false
  
  const selectedValue = Math.max(...selected.map(c => c.value))
  
  if (revolutionActive) {
    return selectedValue < fieldValue
  }
  return selectedValue > fieldValue
}

// Get effective value for a set of played cards
export function getPlayValue(cards: Card[]): number {
  return Math.max(...cards.map(c => c.value))
}

// Check 1919: ranks must be 1,9,1,9 exactly (4 cards with ranks 1,1,9,9)
export function check1919(cards: Card[]): boolean {
  if (cards.length !== 4) return false
  const ranks = cards.map(c => c.rank).sort()
  return ranks[0] === 1 && ranks[1] === 1 && ranks[2] === 9 && ranks[3] === 9
}

// Check 810: 8 and 10 together (2 cards)
export function check810(cards: Card[]): boolean {
  if (cards.length !== 2) return false
  const ranks = cards.map(c => c.rank).sort((a, b) => Number(a) - Number(b))
  return ranks[0] === 8 && ranks[1] === 10
}

// Check 114514: ranks 1,1,4,5,1,4 = three 1s, two 4s, one 5 (6 cards)
export function check114514(cards: Card[]): boolean {
  if (cards.length !== 6) return false
  const ranks = cards.map(c => c.rank)
  const count = (r: Rank) => ranks.filter(x => x === r).length
  return count(1) === 3 && count(4) === 2 && count(5) === 1
}

// Find player who holds 3 of spades (goes first)
export function findFirstPlayer(hands: Card[][]): number {
  for (let i = 0; i < hands.length; i++) {
    if (hands[i].some(c => c.suit === 'spades' && c.rank === 3)) {
      return i
    }
  }
  return 0
}
