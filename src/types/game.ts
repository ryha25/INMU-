export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs' | 'joker'
export type Rank = 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 1 | 2 | 'JOKER'

export interface Card {
  id: string
  suit: Suit
  rank: Rank
  value: number // for comparison: 3=3, 4=4...K=13, A=14, 2=15
}

export type PlayerRank = '大富豪' | '富豪' | '貧民' | '大貧民'

export interface Player {
  id: number
  name: string
  hand: Card[]
  rank: PlayerRank | null
  finishOrder: number | null
}

export type SpecialEffect = 
  | 'IKISUGI'      // 1919
  | 'YARIMAS'      // 810切り
  | 'IIYO'         // 114514
  | null

export interface GameState {
  players: Player[]
  currentPlayerIndex: number
  field: Card[][]           // array of plays on the field
  fieldCount: number        // how many cards per play
  fieldValue: number        // value of last played cards
  passCount: number         // consecutive passes
  round: number
  phase: 'deal' | 'play' | 'result'
  finishedPlayers: number[]
  log: string[]
  specialEffect: SpecialEffect
  speedBoost: boolean       // 1919 speed boost active
  selectedCards: Card[]
  revolutionActive: boolean // 革命 (all card ranks flipped)
  passedPlayers: Set<number>
  secondRoundOrLater: boolean
}
