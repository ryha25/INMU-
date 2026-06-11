import { GameState, Player, Card } from '../types/game'
import {
  createDeck, shuffle, dealCards, findFirstPlayer,
  canPlay, getPlayValue, check1919, check810, check114514
} from './cards'

const PLAYER_NAMES = ['プレイヤー1', 'プレイヤー2', 'プレイヤー3', 'プレイヤー4']
const RANK_NAMES: Record<number, string> = { 1: '大富豪', 2: '富豪', 3: '貧民', 4: '大貧民' }

export function initGame(): GameState {
  const deck = shuffle(createDeck())
  const hands = dealCards(deck, 4)
  const firstPlayer = findFirstPlayer(hands)

  const players: Player[] = PLAYER_NAMES.map((name, i) => ({
    id: i,
    name,
    hand: hands[i],
    rank: null,
    finishOrder: null,
  }))

  return {
    players,
    currentPlayerIndex: firstPlayer,
    field: [],
    fieldCount: 0,
    fieldValue: 0,
    passCount: 0,
    round: 1,
    phase: 'play',
    finishedPlayers: [],
    log: [`🎴 ゲーム開始！ ${PLAYER_NAMES[firstPlayer]}の番です (♠3持ち)`],
    specialEffect: null,
    speedBoost: false,
    selectedCards: [],
    revolutionActive: false,
    passedPlayers: new Set(),
    secondRoundOrLater: false,
  }
}

export function playCards(state: GameState, cards: Card[]): GameState {
  const player = state.players[state.currentPlayerIndex]
  const newLog = [...state.log]
  let newState = { ...state }
  let specialEffect = null
  let speedBoost = state.speedBoost
  let clearField = false
  let immediateWin = false

  // Check special combos
  if (check114514(cards)) {
    // Only allowed from 2nd round, only on your turn
    if (!state.secondRoundOrLater) {
      return { ...state, log: [...state.log, '⚠️ 114514は2周目以降のみ使用可能！'] }
    }
    specialEffect = 'IIYO'
    immediateWin = true
    newLog.push(`🔥 ${player.name} が「114514」を発動！「いいよ！来いよ」`)
  } else if (check1919(cards)) {
    specialEffect = 'IKISUGI'
    speedBoost = true
    clearField = true
    newLog.push(`⚡ ${player.name} が「1919」を発動！「イキスギィ!!」場を流した！`)
  } else if (check810(cards)) {
    specialEffect = 'YARIMAS'
    clearField = true
    newLog.push(`🎯 ${player.name} が「810切り」を発動！「やりますねぇ〜」場を流した！`)
  } else {
    const cardStr = cards.map(c => `${c.rank}`).join(',')
    newLog.push(`${player.name} が [${cardStr}] を出した`)
  }

  // Remove played cards from hand
  const newHand = player.hand.filter(c => !cards.some(sc => sc.id === c.id))
  const newPlayers = state.players.map((p, i) =>
    i === state.currentPlayerIndex ? { ...p, hand: newHand } : p
  )

  let finishedPlayers = [...state.finishedPlayers]
  let phase = state.phase

  // Check if player finished
  if (newHand.length === 0) {
    const finishPos = finishedPlayers.length + 1
    finishedPlayers.push(state.currentPlayerIndex)
    newPlayers[state.currentPlayerIndex] = {
      ...newPlayers[state.currentPlayerIndex],
      finishOrder: finishPos,
      rank: RANK_NAMES[finishPos] as Player['rank'],
    }
    newLog.push(`🏆 ${player.name} が ${RANK_NAMES[finishPos]} になった！`)
  }

  if (immediateWin) {
    finishedPlayers = [state.currentPlayerIndex]
    // Set others in order
    const others = state.players.map((_, i) => i).filter(i => i !== state.currentPlayerIndex)
    others.forEach((idx, j) => {
      finishedPlayers.push(idx)
      newPlayers[idx] = {
        ...newPlayers[idx],
        finishOrder: j + 2,
        rank: RANK_NAMES[j + 2] as Player['rank'],
      }
    })
    newPlayers[state.currentPlayerIndex] = {
      ...newPlayers[state.currentPlayerIndex],
      finishOrder: 1,
      rank: '大富豪',
    }
    phase = 'result'
    newLog.push('🎉 ゲーム終了！')
  }

  // Check if game ended (3 players finished, 4th is automatically last)
  if (finishedPlayers.length >= 3 && !immediateWin) {
    const remaining = state.players.map((_, i) => i).find(i => !finishedPlayers.includes(i))
    if (remaining !== undefined) {
      finishedPlayers.push(remaining)
      newPlayers[remaining] = {
        ...newPlayers[remaining],
        finishOrder: 4,
        rank: '大貧民',
      }
      newLog.push(`${newPlayers[remaining].name} が 大貧民 になった...`)
    }
    phase = 'result'
    newLog.push('🎉 ゲーム終了！')
  }

  // Determine next player
  let nextPlayer = state.currentPlayerIndex
  let newField = clearField ? [] : [...state.field, cards]
  let newFieldCount = clearField ? 0 : (state.fieldCount || cards.length)
  let newFieldValue = clearField ? 0 : getPlayValue(cards)
  let newPassCount = 0
  let newPassedPlayers = clearField ? new Set<number>() : new Set(state.passedPlayers)

  if (clearField || immediateWin) {
    // Player who cleared gets to go again (unless finished)
    nextPlayer = state.currentPlayerIndex
    if (newHand.length === 0) {
      nextPlayer = getNextActivePlayer(state.currentPlayerIndex, finishedPlayers, state.players.length)
    }
  } else {
    nextPlayer = getNextActivePlayer(state.currentPlayerIndex, finishedPlayers, state.players.length)
  }

  if (newLog[newLog.length - 1] !== `${PLAYER_NAMES[nextPlayer]}の番です`) {
    if (phase === 'play') {
      newLog.push(`${newPlayers[nextPlayer].name}の番です`)
    }
  }

  return {
    ...newState,
    players: newPlayers,
    currentPlayerIndex: nextPlayer,
    field: newField,
    fieldCount: newFieldCount,
    fieldValue: newFieldValue,
    passCount: newPassCount,
    passedPlayers: newPassedPlayers,
    phase,
    finishedPlayers,
    log: newLog.slice(-30),
    specialEffect,
    speedBoost,
    selectedCards: [],
    secondRoundOrLater: state.secondRoundOrLater,
  }
}

export function pass(state: GameState): GameState {
  const player = state.players[state.currentPlayerIndex]
  const newLog = [...state.log, `${player.name} がパスした`]
  const newPassedPlayers = new Set(state.passedPlayers)
  newPassedPlayers.add(state.currentPlayerIndex)

  const finishedPlayers = state.finishedPlayers
  const activePlayers = state.players
    .map((_, i) => i)
    .filter(i => !finishedPlayers.includes(i))

  const nextPlayer = getNextActivePlayer(state.currentPlayerIndex, finishedPlayers, state.players.length)

  // Check if all remaining active players passed (field cleared)
  const notPassedActive = activePlayers.filter(i => !newPassedPlayers.has(i) && i !== state.currentPlayerIndex)
  
  // After this pass, if all non-finished players have passed, clear the field
  // Everyone except current has passed?
  const allActivePassed = activePlayers.every(i => i === state.currentPlayerIndex || newPassedPlayers.has(i))

  if (allActivePassed) {
    // Clear the field, next player (who last played) goes
    const lastPlayedPlayer = findLastPlayedPlayer(state)
    newLog.push('🌊 場が流れた！')
    const goNext = lastPlayedPlayer !== -1 && !finishedPlayers.includes(lastPlayedPlayer)
      ? lastPlayedPlayer
      : nextPlayer
    newLog.push(`${state.players[goNext].name}の番です`)
    return {
      ...state,
      currentPlayerIndex: goNext,
      field: [],
      fieldCount: 0,
      fieldValue: 0,
      passCount: 0,
      passedPlayers: new Set(),
      log: newLog.slice(-30),
      specialEffect: null,
      selectedCards: [],
      secondRoundOrLater: true,
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
  }
}

function findLastPlayedPlayer(state: GameState): number {
  // The last player who actually played (field is non-empty, find who put the last stack)
  // We track via field — but we don't have that info easily.
  // Simplification: return the player who last successfully played
  // For now return -1 to fallback
  return -1
}

function getNextActivePlayer(currentIndex: number, finishedPlayers: number[], totalPlayers: number): number {
  let next = (currentIndex + 1) % totalPlayers
  let tries = 0
  while (finishedPlayers.includes(next) && tries < totalPlayers) {
    next = (next + 1) % totalPlayers
    tries++
  }
  return next
}

export function validatePlay(state: GameState, cards: Card[]): { valid: boolean; reason: string } {
  if (cards.length === 0) return { valid: false, reason: 'カードを選んでください' }

  const { fieldCount, fieldValue, revolutionActive } = state

  // Check 114514 special (6 cards)
  if (check114514(cards)) {
    if (!state.secondRoundOrLater) {
      return { valid: false, reason: '114514は2周目以降のみ使用可能です' }
    }
    return { valid: true, reason: '' }
  }

  // Check 1919 (any 4-card field play is fine)
  if (check1919(cards)) {
    if (fieldCount !== 0 && fieldCount !== 4) {
      return { valid: false, reason: '1919は4枚出しまたは場が空の時のみ' }
    }
    return { valid: true, reason: '' }
  }

  // Check 810 (any 2-card field play)
  if (check810(cards)) {
    if (fieldCount !== 0 && fieldCount !== 2) {
      return { valid: false, reason: '810切りは2枚出しまたは場が空の時のみ' }
    }
    return { valid: true, reason: '' }
  }

  // Normal rules
  if (fieldCount !== 0 && cards.length !== fieldCount) {
    return { valid: false, reason: `${fieldCount}枚で出してください` }
  }

  const playValue = getPlayValue(cards)
  if (fieldCount !== 0) {
    if (revolutionActive) {
      if (playValue >= fieldValue) {
        return { valid: false, reason: '革命中: より弱いカードを出してください' }
      }
    } else {
      if (playValue <= fieldValue) {
        return { valid: false, reason: '場より強いカードを出してください' }
      }
    }
  }

  return { valid: true, reason: '' }
}
