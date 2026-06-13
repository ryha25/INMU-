import { GameState, Player, Card, RulesConfig, DEFAULT_RULES, PlayerRank } from '../types/game'
import {
  createDeck, shuffle, dealCards, findFirstPlayer,
  getPlayValue, check1919, check810, check114514,
  checkKakumei, checkEightCut, checkElevenBack,
  checkSevenPass, checkTenDiscard, checkShibari,
  checkSupe3, checkKaidan, check2431InHand, get2431Cards,
  sortHand,
} from './cards'

function reversedReason(state: GameState, type: 'normal' | 'stairs' = 'normal'): string {
  const isJback = !state.revolutionActive && state.elevenBackActive
  if (type === 'stairs') {
    return isJback ? 'Jバック中: 弱い階段を出してください' : '革命中: 弱い階段を出してください'
  }
  return isJback ? 'Jバック中: 弱いカードを出してください' : '革命中: 弱いカードを出してください'
}

const DEFAULT_PLAYER_NAMES = ['プレイヤー1', 'プレイヤー2', 'プレイヤー3', 'プレイヤー4']
const RANK_NAMES: Record<number, string> = { 1: '大富豪', 2: '富豪', 3: '貧民', 4: '大貧民' }

export function initGame(rules: RulesConfig = DEFAULT_RULES, playerNames?: string[], startingRanks?: (PlayerRank | null)[]): GameState {
  const names = playerNames ?? DEFAULT_PLAYER_NAMES
  const deck = shuffle(createDeck())
  const hands = dealCards(deck, 4)
  const firstPlayer = findFirstPlayer(hands)

  const players: Player[] = names.map((name, i) => ({
    id: i,
    name,
    hand: hands[i],
    rank: null,
    finishOrder: null,
  }))

  // 2431は初手限定: 最初のプレイヤー（♠3持ち）のみが対象
  // 途中のプレイヤーが [2,4,3,A] を持っていても2431は発動しない
  const must2431 = check2431InHand(hands[firstPlayer]) ? [firstPlayer] : []

  const log: string[] = [`🎴 ゲーム開始！ ${names[firstPlayer]}の番です (♠3持ち)`]
  if (must2431.length > 0) {
    log.push(`⚠️ ${names[firstPlayer]} は 2431 を所持！初手で出してください`)
  }
  if (startingRanks && startingRanks.some(r => r === '大富豪') && rules.miyakochi) {
    const daifugouIdx = startingRanks.findIndex(r => r === '大富豪')
    if (daifugouIdx !== -1) log.push(`🏙️ 都落ちルール有効: ${names[daifugouIdx]} は大富豪でスタート！1位以外は大貧民転落`)
  }

  return {
    players,
    currentPlayerIndex: firstPlayer,
    field: [],
    fieldCount: 0,
    fieldValue: 0,
    fieldSuit: null,
    passCount: 0,
    round: 1,
    phase: 'play',
    finishedPlayers: [],
    miyakochiPlayers: [],
    startingRanks: startingRanks ?? players.map(() => null as PlayerRank | null),
    log,
    specialEffect: null,
    speedBoost: false,
    selectedCards: [],
    revolutionActive: false,
    elevenBackActive: false,
    passedPlayers: new Set(),
    secondRoundOrLater: false,
    stairsMode: false,
    shibariSuit: null,
    lastPlayedBy: firstPlayer,
    sevenPassState: null,
    tenDiscardState: null,
    must2431,
    rules,
    kuronuriUsed: false,
    after2431Start: false,
  }
}

// Effective order: revolution XOR elevenBack
function isReversed(state: GameState): boolean {
  return state.revolutionActive !== state.elevenBackActive
}

export function validatePlay(
  state: GameState,
  cards: Card[]
): { valid: boolean; reason: string } {
  if (cards.length === 0) return { valid: false, reason: 'カードを選んでください' }

  const { fieldCount, fieldValue, shibariSuit, stairsMode, rules } = state
  const reversed = isReversed(state)

  // --- INMU special combos (always on) ---

  // 2431 forced first play
  if (state.must2431.includes(state.currentPlayerIndex) && !state.secondRoundOrLater) {
    const forced = get2431Cards(state.players[state.currentPlayerIndex].hand)
    const forcedIds = new Set(forced.map(c => c.id))
    const selectedIds = new Set(cards.map(c => c.id))
    if (![...forcedIds].every(id => selectedIds.has(id)) || selectedIds.size !== forcedIds.size) {
      return { valid: false, reason: '2431を所持！まず 2・4・3・A の4枚を出してください' }
    }
    return { valid: true, reason: '' }
  }

  // 114514 (6 cards, 2nd round+)
  if (check114514(cards)) {
    if (!state.secondRoundOrLater) return { valid: false, reason: '114514は2周目以降のみ使用可能' }
    return { valid: true, reason: '' }
  }

  // 1919 (4 cards: A,A,9,9 — must match 4-card field or empty)
  if (check1919(cards)) {
    if (fieldCount !== 0 && fieldCount !== 4) return { valid: false, reason: '1919は4枚出しまたは場が空の時のみ' }
    return { valid: true, reason: '' }
  }

  // 810切り (2 cards: 8+10 — must match 2-card field or empty)
  if (check810(cards)) {
    if (fieldCount !== 0 && fieldCount !== 2) return { valid: false, reason: '810切りは2枚出しまたは場が空の時のみ' }
    return { valid: true, reason: '' }
  }

  // --- ジョーカー処理 ---
  const hasJoker = cards.some(c => c.rank === 'JOKER')
  if (hasJoker) {
    const nonJokers = cards.filter(c => c.rank !== 'JOKER')
    if (cards.length === 1) {
      // 単体ジョーカー: 1枚出しの場にのみ出せる最強カード
      if (fieldCount !== 0 && fieldCount !== 1) return { valid: false, reason: `${fieldCount}枚で出してください` }
      return { valid: true, reason: '' }
    }
    // ジョーカーワイルド（複数枚）
    if (nonJokers.length === 0) return { valid: false, reason: 'ジョーカーは1枚のみです' }
    const firstRank = nonJokers[0].rank
    if (!nonJokers.every(c => c.rank === firstRank)) {
      return { valid: false, reason: 'ジョーカー以外は同じ数字のカードのみ' }
    }
    if (fieldCount !== 0 && cards.length !== fieldCount) {
      return { valid: false, reason: `${fieldCount}枚で出してください` }
    }
    if (stairsMode && fieldCount > 0) {
      return { valid: false, reason: '階段にはジョーカーを使えません' }
    }
    const playVal = getPlayValue(cards)
    if (fieldCount !== 0) {
      if (reversed ? playVal >= fieldValue : playVal <= fieldValue) {
        return { valid: false, reason: reversed ? reversedReason(state) : '場より強いカードを出してください' }
      }
    }
    if (shibariSuit && fieldCount !== 0) {
      if (!nonJokers.every(c => c.suit === shibariSuit)) {
        const suitMap: Record<string, string> = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' }
        return { valid: false, reason: `縛り中: ${suitMap[shibariSuit]}を出してください（ジョーカー免除）` }
      }
    }
    return { valid: true, reason: '' }
  }

  // --- スペ3返し (single ♠3 beats single 2 or single Joker) ---
  if (rules.supe3gaeshi && checkSupe3(cards)) {
    if (fieldCount === 1 && (fieldValue === 15 || fieldValue === 16)) return { valid: true, reason: '' }
  }

  // --- 階段 ---
  if (rules.kaidan && checkKaidan(cards)) {
    if (fieldCount === 0) return { valid: true, reason: '' }
    if (!stairsMode) return { valid: false, reason: '場が通常モードです。階段は場が空の時のみ' }
    if (cards.length !== fieldCount) return { valid: false, reason: `${fieldCount}枚の階段で出してください` }
    const playVal = getPlayValue(cards)
    if (reversed ? playVal >= fieldValue : playVal <= fieldValue) {
      return { valid: false, reason: reversed ? reversedReason(state, 'stairs') : '場より強い階段を出してください' }
    }
    return { valid: true, reason: '' }
  }

  // --- Normal play ---
  // Multiple cards must be same rank (not stairs, not INMU specials — already handled above)
  if (cards.length > 1) {
    const firstRank = cards[0].rank
    if (!cards.every(c => c.rank === firstRank)) {
      return { valid: false, reason: '複数枚は同じ数字のカードのみ出せます' }
    }
  }

  // Count mismatch
  if (fieldCount !== 0 && cards.length !== fieldCount) {
    return { valid: false, reason: `${fieldCount}枚で出してください` }
  }

  // Stairs field with non-stairs cards
  if (stairsMode && fieldCount > 0) {
    if (!checkKaidan(cards)) return { valid: false, reason: '階段で出してください' }
  }

  // 縛り check
  if (shibariSuit && fieldCount !== 0) {
    if (!cards.every(c => c.suit === shibariSuit)) {
      const suitMap: Record<string, string> = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' }
      return { valid: false, reason: `縛り中: ${suitMap[shibariSuit]}を出してください` }
    }
  }

  const playVal = getPlayValue(cards)

  // 禁止上がり: can't win with 8 or 2 (ただし手札が出すカードのみの場合は選択肢なしのため適用しない)
  if (rules.kinshiAgari) {
    const player = state.players[state.currentPlayerIndex]
    const remainingAfter = player.hand.filter(c => !cards.some(sc => sc.id === c.id))
    if (remainingAfter.length === 0 && player.hand.length > cards.length) {
      if (cards.some(c => c.rank === 2)) return { valid: false, reason: '禁止上がり: 2で上がれません' }
      if (cards.some(c => c.rank === 8)) return { valid: false, reason: '禁止上がり: 8で上がれません' }
    }
  }

  if (fieldCount !== 0) {
    if (reversed ? playVal >= fieldValue : playVal <= fieldValue) {
      return {
        valid: false,
        reason: reversed ? reversedReason(state) : '場より強いカードを出してください',
      }
    }
  }

  return { valid: true, reason: '' }
}

export function playCards(state: GameState, cards: Card[]): GameState {
  const player = state.players[state.currentPlayerIndex]
  const newLog = [...state.log]
  const rules = state.rules

  let specialEffect = state.specialEffect
  let speedBoost = state.speedBoost
  let clearField = false
  let immediateWin = false
  let newRevolution = state.revolutionActive
  let newElevenBack = state.elevenBackActive
  let newPhase = state.phase
  let newShibariSuit = state.shibariSuit
  let newStairsMode = state.stairsMode
  let sevenPassState = state.sevenPassState
  let tenDiscardState = state.tenDiscardState
  let nextSpecialEffect: GameState['specialEffect'] = null
  let newMiyakochiPlayers = [...state.miyakochiPlayers]

  // --- INMU forced 2431 ---
  const is2431Forced = state.must2431.includes(state.currentPlayerIndex) && !state.secondRoundOrLater
  const newMust2431 = is2431Forced
    ? state.must2431.filter(i => i !== state.currentPlayerIndex)
    : state.must2431

  // --- Detect combos ---
  if (check114514(cards)) {
    nextSpecialEffect = 'IIYO'
    immediateWin = true
    newLog.push(`🔥 ${player.name} が「114514」を発動！「いいよ！来いよ」`)
  } else if (check1919(cards)) {
    nextSpecialEffect = 'IKISUGI'
    speedBoost = true
    clearField = true
    newLog.push(`⚡ ${player.name} が「1919」を発動！「イキスギィ!!」場を流した！`)
  } else if (check810(cards)) {
    nextSpecialEffect = 'YARIMAS'
    clearField = true
    newLog.push(`🎯 ${player.name} が「810切り」を発動！「やりますねぇ〜」場を流した！`)
  } else {
    const cardStr = cards.map(c => `${c.rank}`).join(', ')
    newLog.push(`${player.name} が [${cardStr}] を出した`)

    // 革命
    if (rules.kakumei && checkKakumei(cards)) {
      newRevolution = !newRevolution
      nextSpecialEffect = 'KAKUMEI'
      newLog.push(`💥 ${player.name} が革命！${newRevolution ? '革命中！' : '革命返し！通常に戻った'}`)
    }

    // イレブンバック
    if (rules.elevenBack && checkElevenBack(cards)) {
      newElevenBack = !newElevenBack
      nextSpecialEffect = 'ELEVEN_BACK'
      newLog.push(`🔄 ${player.name} がイレブンバック！${newElevenBack ? '弱強逆転中' : 'イレブンバック解除'}`)
    }

    // 8切り (standard, not 810)
    if (rules.eightCut && checkEightCut(cards) && !check810(cards)) {
      clearField = true
      nextSpecialEffect = 'EIGHT_CUT'
      newLog.push(`✂️ ${player.name} が8切り！場を流した`)
    }

    // 7渡し
    if (rules.nanaWatashi && checkSevenPass(cards) && !clearField) {
      sevenPassState = { pending: true, totalToGive: cards.length, targetPlayer: -1 }
      nextSpecialEffect = 'YATSU'
      newLog.push(`🎁 ${player.name} が7渡し！${cards.length}枚を渡せます`)
    }

    // 10捨て
    if (rules.junTen && checkTenDiscard(cards) && !clearField) {
      tenDiscardState = { pending: true, totalToDiscard: cards.length }
      nextSpecialEffect = 'JUTEN'
      newLog.push(`🗑️ ${player.name} が10捨て！${cards.length}枚を捨てられます`)
    }

    // スペ3返し (2またはジョーカーに対して)
    if (rules.supe3gaeshi && checkSupe3(cards) && state.fieldCount === 1 && (state.fieldValue === 15 || state.fieldValue === 16)) {
      newLog.push(`♠ ${player.name} がスペ3返し！`)
      clearField = true
    }

    // 縛り check (after all other effects)
    if (rules.shibari && !clearField && checkShibari(cards)) {
      const suitMap: Record<string, string> = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' }
      newShibariSuit = cards[0].suit
      if (nextSpecialEffect === null) nextSpecialEffect = 'SHIBARI'
      newLog.push(`🔒 ${player.name} が縛り！${suitMap[newShibariSuit]}縛り発動`)
    }

    // 柄縛り: 1枚出しでもスート縛り (suitshibari rule)
    if (rules.suitshibari && !clearField && !newShibariSuit) {
      const nonJokerCard = cards.find(c => c.rank !== 'JOKER')
      if (nonJokerCard && nonJokerCard.suit !== 'joker') {
        const suitMap: Record<string, string> = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' }
        newShibariSuit = nonJokerCard.suit
        newLog.push(`🎴 ${player.name} が柄縛り！${suitMap[newShibariSuit]}縛り発動`)
      }
    }

    // 階段
    if (rules.kaidan && checkKaidan(cards)) {
      newStairsMode = true
    }
  }

  // Remove played cards from hand (except 2431 forced — they return to hand)
  let newHand = player.hand.filter(c => !cards.some(sc => sc.id === c.id))
  if (is2431Forced) {
    // Cards return to hand, field clears, ♠3 holder goes next
    newHand = player.hand
    newLog.push(`🎯 ${player.name} が2431を出した！（手札に戻る・場リセット）`)
    nextSpecialEffect = '2431'
    clearField = true
  }

  const newPlayers = state.players.map((p, i) =>
    i === state.currentPlayerIndex ? { ...p, hand: newHand } : p
  )

  let finishedPlayers = [...state.finishedPlayers]

  const RANK_EFFECTS = ['DAIFUGOU', 'FUGOU', 'HINMIN', 'DAIHINMIN'] as const

  if (newHand.length === 0 && !immediateWin) {
    const finishPos = finishedPlayers.length + 1
    finishedPlayers.push(state.currentPlayerIndex)
    newPlayers[state.currentPlayerIndex] = {
      ...newPlayers[state.currentPlayerIndex],
      finishOrder: finishPos,
      rank: RANK_NAMES[finishPos] as Player['rank'],
    }
    newLog.push(`🏆 ${player.name} が ${RANK_NAMES[finishPos]} になった！`)
    nextSpecialEffect = RANK_EFFECTS[finishPos - 1] ?? null

    // 都落ち: 大富豪スタートの人が1位以外に先に上がられたら転落
    if (rules.miyakochi && finishPos === 1 && state.startingRanks[state.currentPlayerIndex] !== '大富豪') {
      const daifugouStarterIdx = state.startingRanks.findIndex(
        (r, i) => r === '大富豪' && !state.finishedPlayers.includes(i) && !newMiyakochiPlayers.includes(i) && i !== state.currentPlayerIndex
      )
      if (daifugouStarterIdx !== -1) {
        newMiyakochiPlayers.push(daifugouStarterIdx)
        newPlayers[daifugouStarterIdx] = {
          ...newPlayers[daifugouStarterIdx],
          hand: [],
          rank: '大貧民',
        }
        newLog.push(`🏙️ 都落ち！${newPlayers[daifugouStarterIdx].name} が大貧民に転落...手札没収！`)
        nextSpecialEffect = 'DAIHINMIN'
      }
    }
  }

  // 114514 immediate win
  if (immediateWin) {
    finishedPlayers = [state.currentPlayerIndex]
    const others = state.players.map((_, i) => i).filter(i => i !== state.currentPlayerIndex)
    others.forEach((idx, j) => {
      finishedPlayers.push(idx)
      newPlayers[idx] = { ...newPlayers[idx], finishOrder: j + 2, rank: RANK_NAMES[j + 2] as Player['rank'] }
    })
    newPlayers[state.currentPlayerIndex] = {
      ...newPlayers[state.currentPlayerIndex],
      finishOrder: 1,
      rank: '大富豪',
    }
    newPhase = 'result'
    newLog.push('🎉 ゲーム終了！')
  }

  // Game end check (3+ done including miyakochi → last player assigned)
  if (finishedPlayers.length + newMiyakochiPlayers.length >= 3 && !immediateWin) {
    const remaining = state.players.map((_, i) => i).find(
      i => !finishedPlayers.includes(i) && !newMiyakochiPlayers.includes(i)
    )
    if (remaining !== undefined) {
      finishedPlayers.push(remaining)
      const pos = finishedPlayers.length
      newPlayers[remaining] = { ...newPlayers[remaining], finishOrder: pos, rank: RANK_NAMES[pos] as Player['rank'] }
      newLog.push(`${newPlayers[remaining].name} が ${RANK_NAMES[pos]} になった...`)
    }
    for (const idx of newMiyakochiPlayers) {
      if (!finishedPlayers.includes(idx)) {
        finishedPlayers.push(idx)
        newPlayers[idx] = { ...newPlayers[idx], finishOrder: finishedPlayers.length, rank: '大貧民' }
      }
    }
    if (!nextSpecialEffect) nextSpecialEffect = 'DAIHINMIN'
    newPhase = 'result'
    newLog.push('🎉 ゲーム終了！')
  }

  // Determine next player
  let lastPlayedBy = state.currentPlayerIndex
  let newField = clearField ? [] : [...state.field, cards]
  let newFieldCount = clearField ? 0 : (state.fieldCount || cards.length)
  let newFieldValue = clearField ? 0 : (is2431Forced ? state.fieldValue : getPlayValue(cards))
  let newPassedPlayers = clearField ? new Set<number>() : new Set(state.passedPlayers)

  // Clear 縛り and stairs when field clears
  if (clearField) {
    newShibariSuit = null
    newStairsMode = false
    newElevenBack = false
  }

  // 7渡し / 10捨て → special phase
  if (sevenPassState?.pending && !clearField && newPhase === 'play') {
    newPhase = 'sevenPass'
  }
  if (tenDiscardState?.pending && !clearField && newPhase === 'play') {
    newPhase = 'tenDiscard'
  }

  let nextPlayer = state.currentPlayerIndex
  if (clearField || immediateWin) {
    nextPlayer = newPlayers[state.currentPlayerIndex].hand.length === 0
      ? getNextActive(state.currentPlayerIndex, finishedPlayers, 4, newMiyakochiPlayers)
      : state.currentPlayerIndex
  } else if (newPhase === 'play') {
    nextPlayer = getNextActive(state.currentPlayerIndex, finishedPlayers, 4, newMiyakochiPlayers)
  }

  // 2431後はスペード3保持者からスタート
  let after2431Start = false
  if (is2431Forced && newPhase === 'play') {
    const supe3Holder = newPlayers.findIndex(
      p => !finishedPlayers.includes(p.id) &&
           !newMiyakochiPlayers.includes(p.id) &&
           p.hand.some(c => c.suit === 'spades' && c.rank === 3)
    )
    if (supe3Holder !== -1) nextPlayer = supe3Holder
    newLog.push(`♠3 を持つ ${newPlayers[nextPlayer].name} からスタート！`)
    after2431Start = true
  } else if (newPhase === 'play') {
    newLog.push(`${newPlayers[nextPlayer].name}の番です`)
  }

  const newFieldSuit = clearField ? null : (cards.length > 0 ? cards[0].suit : state.fieldSuit)

  return {
    ...state,
    players: newPlayers,
    currentPlayerIndex: nextPlayer,
    field: newField,
    fieldCount: newFieldCount,
    fieldValue: newFieldValue,
    fieldSuit: newFieldSuit,
    passCount: 0,
    passedPlayers: newPassedPlayers,
    phase: newPhase,
    finishedPlayers,
    log: newLog.slice(-30),
    specialEffect: nextSpecialEffect,
    speedBoost,
    selectedCards: [],
    revolutionActive: newRevolution,
    elevenBackActive: newElevenBack,
    stairsMode: newStairsMode,
    shibariSuit: newShibariSuit,
    lastPlayedBy,
    sevenPassState: newPhase === 'sevenPass' ? sevenPassState : null,
    tenDiscardState: newPhase === 'tenDiscard' ? tenDiscardState : null,
    must2431: newMust2431,
    secondRoundOrLater: state.secondRoundOrLater,
    rules: state.rules,
    miyakochiPlayers: newMiyakochiPlayers,
    after2431Start,
  }
}

export function pass(state: GameState): GameState {
  const player = state.players[state.currentPlayerIndex]
  const newLog = [...state.log, `${player.name} がパスした`]
  const newPassedPlayers = new Set(state.passedPlayers)
  newPassedPlayers.add(state.currentPlayerIndex)

  const { finishedPlayers, miyakochiPlayers } = state
  const activePlayers = state.players.map((_, i) => i).filter(
    i => !finishedPlayers.includes(i) && !miyakochiPlayers.includes(i)
  )
  const allActivePassed = activePlayers.every(i => i === state.currentPlayerIndex || newPassedPlayers.has(i))

  const nextPlayer = getNextActive(state.currentPlayerIndex, finishedPlayers, 4, miyakochiPlayers)

  if (allActivePassed) {
    const last = state.lastPlayedBy
    const excluded = [...finishedPlayers, ...miyakochiPlayers]
    const goNext = excluded.includes(last)
      ? getNextActive(last, finishedPlayers, 4, miyakochiPlayers)
      : last
    newLog.push('🌊 場が流れた！')
    newLog.push(`${state.players[goNext].name}の番です`)
    return {
      ...state,
      currentPlayerIndex: goNext,
      field: [],
      fieldCount: 0,
      fieldValue: 0,
      fieldSuit: null,
      passCount: 0,
      passedPlayers: new Set(),
      log: newLog.slice(-30),
      specialEffect: null,
      selectedCards: [],
      elevenBackActive: false,
      stairsMode: false,
      shibariSuit: null,
      secondRoundOrLater: true,
      after2431Start: false,
    }
  }

  newLog.push(`${state.players[nextPlayer].name}の番です`)
  return {
    ...state,
    currentPlayerIndex: nextPlayer,
    passCount: state.passCount + 1,
    passedPlayers: newPassedPlayers,
    log: newLog.slice(-30),
    specialEffect: null,
    selectedCards: [],
    after2431Start: false,
  }
}

// 7渡し: give cards from current player to target
export function resolveSevenPass(
  state: GameState,
  targetPlayerIndex: number,
  cardsToGive: Card[]
): GameState {
  const giver = state.players[state.currentPlayerIndex]
  const receiver = state.players[targetPlayerIndex]
  const newLog = [...state.log]

  const giverHand = giver.hand.filter(c => !cardsToGive.some(gc => gc.id === c.id))
  const receiverHand = sortHand([...receiver.hand, ...cardsToGive])

  newLog.push(`🎁 ${giver.name} → ${receiver.name} に ${cardsToGive.length}枚を渡した`)

  const newPlayers = state.players.map((p, i) => {
    if (i === state.currentPlayerIndex) return { ...p, hand: giverHand }
    if (i === targetPlayerIndex) return { ...p, hand: receiverHand }
    return p
  })

  const nextPlayer = getNextActive(state.currentPlayerIndex, state.finishedPlayers, 4, state.miyakochiPlayers)
  newLog.push(`${newPlayers[nextPlayer].name}の番です`)

  return {
    ...state,
    players: newPlayers,
    currentPlayerIndex: nextPlayer,
    phase: 'play',
    sevenPassState: null,
    log: newLog.slice(-30),
    specialEffect: null,
  }
}

// 10捨て: discard N cards from current player's hand
export function resolveTenDiscard(state: GameState, cardsToDiscard: Card[]): GameState {
  const player = state.players[state.currentPlayerIndex]
  const newLog = [...state.log]

  const newHand = player.hand.filter(c => !cardsToDiscard.some(dc => dc.id === c.id))
  newLog.push(`🗑️ ${player.name} が ${cardsToDiscard.length}枚を捨てた`)

  const newPlayers = state.players.map((p, i) =>
    i === state.currentPlayerIndex ? { ...p, hand: newHand } : p
  )

  let finishedPlayers = [...state.finishedPlayers]
  let phase: GameState['phase'] = 'play'

  if (newHand.length === 0) {
    const pos = finishedPlayers.length + 1
    finishedPlayers.push(state.currentPlayerIndex)
    newPlayers[state.currentPlayerIndex] = {
      ...newPlayers[state.currentPlayerIndex],
      finishOrder: pos,
      rank: RANK_NAMES[pos] as Player['rank'],
    }
    newLog.push(`🏆 ${player.name} が ${RANK_NAMES[pos]} になった！`)
  }

  if (finishedPlayers.length + state.miyakochiPlayers.length >= 3) {
    const remaining = state.players.map((_, i) => i).find(
      i => !finishedPlayers.includes(i) && !state.miyakochiPlayers.includes(i)
    )
    if (remaining !== undefined) {
      finishedPlayers.push(remaining)
      const pos = finishedPlayers.length
      newPlayers[remaining] = { ...newPlayers[remaining], finishOrder: pos, rank: RANK_NAMES[pos] as Player['rank'] }
      newLog.push(`${newPlayers[remaining].name} が ${RANK_NAMES[pos]} になった...`)
    }
    for (const idx of state.miyakochiPlayers) {
      if (!finishedPlayers.includes(idx)) {
        finishedPlayers.push(idx)
        newPlayers[idx] = { ...newPlayers[idx], finishOrder: finishedPlayers.length, rank: '大貧民' }
      }
    }
    phase = 'result'
    newLog.push('🎉 ゲーム終了！')
  }

  const nextPlayer = getNextActive(state.currentPlayerIndex, finishedPlayers, 4, state.miyakochiPlayers)
  if (phase === 'play') newLog.push(`${newPlayers[nextPlayer].name}の番です`)

  return {
    ...state,
    players: newPlayers,
    currentPlayerIndex: nextPlayer,
    phase,
    tenDiscardState: null,
    finishedPlayers,
    miyakochiPlayers: state.miyakochiPlayers,
    log: newLog.slice(-30),
    specialEffect: null,
  }
}

export function getNextActive(current: number, finished: number[], total: number, miyakochi: number[] = []): number {
  let next = (current + 1) % total
  for (let i = 0; i < total; i++) {
    if (!finished.includes(next) && !miyakochi.includes(next)) return next
    next = (next + 1) % total
  }
  return current
}

export function getEffectivelyReversed(state: GameState): boolean {
  return state.revolutionActive !== state.elevenBackActive
}

// 黒塗りの高級車: 発動者以外の全プレイヤーから強いカードを1枚ずつ奪う
export function resolveKuronuri(state: GameState, activatorIdx?: number): GameState {
  const activator = activatorIdx ?? state.currentPlayerIndex
  const newPlayers = state.players.map(p => ({ ...p, hand: [...p.hand] }))
  const newLog = [...state.log]
  const stolen: import('../types/game').Card[] = []

  for (let i = 0; i < state.players.length; i++) {
    if (i === activator) continue
    const from = newPlayers[i]
    if (from.hand.length === 0) continue
    const best = from.hand.reduce((b, c) => c.value > b.value ? c : b)
    newPlayers[i] = { ...from, hand: from.hand.filter(c => c.id !== best.id) }
    stolen.push(best)
    newLog.push(`🚗 ${newPlayers[activator].name} が ${from.name} から [${best.rank}] を奪った！`)
  }

  newPlayers[activator] = { ...newPlayers[activator], hand: [...newPlayers[activator].hand, ...stolen] }
  return { ...state, players: newPlayers, log: newLog.slice(-30), kuronuriUsed: true }
}

// 黒塗りの高級車: 発動前のカード奪取プレビュー（演出表示用）
export function previewKuronuri(state: GameState, activatorIdx?: number) {
  const activator = activatorIdx ?? state.currentPlayerIndex
  const getBest = (idx: number) => {
    const hand = state.players[idx].hand
    if (hand.length === 0) return null
    return hand.reduce((b, c) => c.value > b.value ? c : b)
  }
  const victims = state.players
    .map((p, i) => ({ card: getBest(i), playerName: p.name, idx: i }))
    .filter(v => v.idx !== activator)
  return {
    activatorName: state.players[activator].name,
    victims,
  }
}
