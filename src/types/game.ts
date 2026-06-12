export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs' | 'joker'
export type Rank = 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 1 | 2 | 'JOKER'

export interface Card {
  id: string
  suit: Suit
  rank: Rank
  value: number
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
  | 'IKISUGI'
  | 'YARIMAS'
  | 'IIYO'
  | 'KAKUMEI'     // 革命
  | 'ELEVEN_BACK' // イレブンバック
  | 'EIGHT_CUT'   // 8切り
  | 'YATSU'       // 7渡し
  | 'JUTEN'       // 10捨て
  | 'SHIBARI'     // 縛り
  | '2431'        // 2431
  | null

export interface RulesConfig {
  // Standard rules (toggleable)
  kakumei: boolean        // 革命
  kaidan: boolean         // 階段
  elevenBack: boolean     // イレブンバック
  eightCut: boolean       // 8切り
  shibari: boolean        // 縛り
  supe3gaeshi: boolean    // スペ3返し
  kinshiAgari: boolean    // 禁止上がり (2・8で上がれない)
  nanaWatashi: boolean    // 7渡し
  junTen: boolean         // 10捨て
  // INMU rules (always on, cannot disable)
  // ikisugi_1919, yarimas_810, iiyo_114514, forced_2431 are always on
}

export interface SevenPassState {
  pending: boolean
  totalToGive: number
  targetPlayer: number    // -1 = not chosen yet
}

export interface TenDiscardState {
  pending: boolean
  totalToDiscard: number
}

export interface GameState {
  players: Player[]
  currentPlayerIndex: number
  field: Card[][]
  fieldCount: number
  fieldValue: number
  fieldSuit: Suit | null        // for 縛り
  passCount: number
  round: number
  phase: 'play' | 'result' | 'sevenPass' | 'tenDiscard'
  finishedPlayers: number[]
  log: string[]
  specialEffect: SpecialEffect
  speedBoost: boolean
  selectedCards: Card[]
  revolutionActive: boolean
  elevenBackActive: boolean     // イレブンバック
  passedPlayers: Set<number>
  secondRoundOrLater: boolean
  stairsMode: boolean           // whether current field is a staircase
  shibariSuit: Suit | null      // active 縛り suit
  lastPlayedBy: number          // who last played cards
  sevenPassState: SevenPassState | null
  tenDiscardState: TenDiscardState | null
  must2431: number[]            // player indices who must play 2431 first
  rules: RulesConfig
}

export const DEFAULT_RULES: RulesConfig = {
  kakumei: true,
  kaidan: true,
  elevenBack: true,
  eightCut: true,
  shibari: true,
  supe3gaeshi: true,
  kinshiAgari: true,
  nanaWatashi: true,
  junTen: true,
}
