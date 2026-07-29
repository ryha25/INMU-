import React, { useState, useRef, useEffect } from 'react'
import { GameState, RulesConfig, DEFAULT_RULES, PlayerRank } from './types/game'
import { initGame, playCards, pass, resolveKuronuri, previewKuronuri, resolveSevenPass, resolveTenDiscard, getNextActive, forfeitGame } from './logic/gameEngine'
import { checkKuronuri, createDeck, findFirstPlayer } from './logic/cards'
import { cpuChoosePlay } from './logic/cpuAI'
import { AudioProvider, useAudio } from './contexts/AudioContext'
import { useProfile } from './hooks/useProfile'
import { DEFAULT_STAMP_IDS } from './components/SettingsScreen'
import MaintenanceScreen from './components/MaintenanceScreen'
import StartScreen from './components/StartScreen'
import RulesScreen from './components/RulesScreen'
import PlayerHandScreen from './components/PlayerHandScreen'
import PlayerPassScreen from './components/PlayerPassScreen'
import ResultScreen from './components/ResultScreen'
import SpecialEffect from './components/SpecialEffect'
import KuronuriEffect from './components/KuronuriEffect'
import GameLog from './components/GameLog'
import SevenPassScreen from './components/SevenPassScreen'
import TenDiscardScreen from './components/TenDiscardScreen'
import ModeSelectScreen, { GameMode, SelectMode } from './components/ModeSelectScreen'
import SettingsScreen from './components/SettingsScreen'
import OnlineRoomScreen from './components/OnlineRoomScreen'
import XRecruitScreen from './components/XRecruitScreen'
import InmuPortalSearch from './components/InmuPortalSearch'
import FriendsScreen from './components/FriendsScreen'
import ChallengeModeScreen, { ChallengeSetup, challengeProgressKey, saveChallengeProgress } from './components/ChallengeModeScreen'
import TournamentModeScreen from './components/TournamentModeScreen'
import AdMaxSlot, { AdMaxSize, AdVariant } from './components/AdMaxSlot'
import BugReportButton from './components/BugReportButton'
import { useFriends } from './hooks/useFriends'
import { CHALLENGE_SEED_OVERRIDE, CHALLENGE_FORCED_HAND } from './logic/challengeSeeds'
import { evaluateChallengeOutcome } from './logic/challengeOutcome'

const PORTAL_URL = 'https://inmu-portal-core--kimanayakatamah.replit.app'

type AppView =
  | 'start'
  | 'modeSelect'
  | 'rules'
  | 'settings'
  | 'portal'
  | 'challenge'
  | 'tournament'
  | 'friends'
  | 'onlineRoom'
  | 'xRecruitRoom'
  | 'passScreen'
  | 'playing'
  | 'sevenPass'
  | 'tenDiscard'
  | 'result'

interface IncomingStamp {
  playerIndex: number
  stampId: string
  playerName: string
}

interface TurnStallDetection {
  sessionId: string
  playerIndex: number
  timeLimitSeconds: number
  detectedAt: string
}

const _initialRoomId: string | null = new URLSearchParams(window.location.search).get('room')
if (_initialRoomId) {
  window.history.replaceState({}, '', window.location.pathname)
}

function AppInner() {
  const initialRoomId = _initialRoomId

  const [view, setView] = useState<AppView>(_initialRoomId ? 'xRecruitRoom' : 'start')
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [rules, setRules] = useState<RulesConfig>({ ...DEFAULT_RULES })
  const [showEffect, setShowEffect] = useState(false)
  const [effectKey, setEffectKey] = useState(0)
  const [nextPlayerIndex, setNextPlayerIndex] = useState<number>(0)
  const [gameMode, setGameMode] = useState<GameMode>('cpu')
  const [myPlayerIndex, setMyPlayerIndex] = useState(0)
  const [playerStamps, setPlayerStamps] = useState<string[]>([...DEFAULT_STAMP_IDS])
  const [incomingStamp, setIncomingStamp] = useState<IncomingStamp | null>(null)
  const [playerName] = useState('プレイヤー1')
  const [kuronuriPreview, setKuronuriPreview] = useState<ReturnType<typeof previewKuronuri> | null>(null)
  const [gameKey, setGameKey] = useState(0)
  const { addFriend } = useFriends()
  const { profile } = useProfile()
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false)
  const MAINTENANCE_ADMIN_ID = 'user-1782061206251-cna0t3gps28'

  useEffect(() => {
    fetch('/api/maintenance')
      .then(r => r.json())
      .then(d => setMaintenanceMode(!!d.maintenance))
      .catch(() => {})
  }, [])
  const adSize: AdMaxSize | null =
    view === 'start' || view === 'result' ? '320x50' :
    view === 'portal' || view === 'friends' || view === 'onlineRoom' || view === 'xRecruitRoom' ? '300x250' :
    view === 'modeSelect' || view === 'rules' || view === 'settings' || view === 'challenge' || view === 'tournament' || view === 'passScreen' ? '320x100' :
    null
  const adVariant: AdVariant = adSize === '320x100'
    ? (view === 'modeSelect' || view === 'rules' || view === 'challenge' ? 2 : 3)
    : adSize === '300x250'
      ? (view === 'portal' ? 1 : view === 'xRecruitRoom' ? 3 : 2)
      : 1

  const appRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const cpuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const phaseViewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const gameStateRef = useRef<GameState | null>(null)
  const reportedGameKeyRef = useRef<number | null>(null)
  const turnStallCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const viewRef = useRef<AppView>(view)
  const showEffectRef = useRef(showEffect)
  const kuronuriPreviewRef = useRef(kuronuriPreview)
  gameStateRef.current = gameState
  viewRef.current = view
  showEffectRef.current = showEffect
  kuronuriPreviewRef.current = kuronuriPreview

  function cancelPhaseViewTimer() {
    if (phaseViewTimerRef.current) {
      clearTimeout(phaseViewTimerRef.current)
      phaseViewTimerRef.current = null
    }
  }

  const { playBGM, stopBGM, currentBGMTrack } = useAudio()

  const isCPU = (idx: number) => gameMode === 'cpu' && idx !== myPlayerIndex

  // ─── CPU: 通常ターン自動プレイ ───────────────────────────────────────────
  useEffect(() => {
    if (gameMode !== 'cpu') return
    if (!gameState || view !== 'playing') return
    if (gameState.phase !== 'play') return
    if (gameState.currentPlayerIndex === myPlayerIndex) return
    if (gameState.finishedPlayers.includes(gameState.currentPlayerIndex)) return
    if (gameState.miyakochiPlayers.includes(gameState.currentPlayerIndex)) return
    if (showEffect) return
    if (kuronuriPreview !== null) return

    // メインタイマー (700ms)
    cpuTimerRef.current = setTimeout(() => {
      const gs = gameStateRef.current
      if (!gs || gs.phase !== 'play' || gs.currentPlayerIndex === myPlayerIndex) return
      const cards = cpuChoosePlay(gs)
      if (cards !== null) {
        handleCPUAction(playCards(gs, cards), 'play')
      } else {
        // 初期縛りや手札変化で合法手がない場合、空の場でも手番を進める。
        // ここで停止するとCPUターンが永久に残る。
        handleCPUAction(pass(gs), 'pass')
      }
    }, 700)

    // ウォッチドッグ (2500ms): メインタイマーが何らかの理由で失敗した場合の保険
    const watchdog = setTimeout(() => {
      const gs = gameStateRef.current
      if (!gs || gs.phase !== 'play' || gs.currentPlayerIndex === myPlayerIndex) return
      if (gs.finishedPlayers.includes(gs.currentPlayerIndex)) return
      const cards = cpuChoosePlay(gs)
      if (cards !== null) {
        handleCPUAction(playCards(gs, cards), 'play')
      } else {
        handleCPUAction(pass(gs), 'pass')
      }
    }, 2500)

    return () => {
      if (cpuTimerRef.current) clearTimeout(cpuTimerRef.current)
      clearTimeout(watchdog)
    }
  }, [gameState?.currentPlayerIndex, gameMode, view, gameState?.phase, gameState?.fieldCount, showEffect, gameKey, kuronuriPreview])

  // ─── CPU: 終了プレイヤーのターン自動スキップ（安全機構）────────────────────
  // currentPlayerIndex が finishedPlayers / miyakochiPlayers を指したままになる場合の
  // フォールバック: 次のアクティブプレイヤーへ即時進める
  useEffect(() => {
    if (gameMode !== 'cpu') return
    if (!gameState || view !== 'playing') return
    if (gameState.phase !== 'play') return
    const curIdx = gameState.currentPlayerIndex
    const isFinished = gameState.finishedPlayers.includes(curIdx) || gameState.miyakochiPlayers.includes(curIdx)
    if (!isFinished) return

    const numPlayers = gameState.players.length
    const next = getNextActive(curIdx, gameState.finishedPlayers, numPlayers, gameState.miyakochiPlayers)
    if (next === curIdx) return // 全員終了 — ゲーム終了処理に任せる

    setGameState({ ...gameState, currentPlayerIndex: next })
  }, [gameState?.currentPlayerIndex, gameState?.finishedPlayers.length, gameState?.miyakochiPlayers.length, view, gameMode, gameState?.phase])

  // ─── CPU: 7渡し自動処理 ──────────────────────────────────────────────────
  useEffect(() => {
    if (gameMode !== 'cpu') return
    if (view !== 'sevenPass') return
    if (!gameState || gameState.phase !== 'sevenPass') return
    if (gameState.currentPlayerIndex === myPlayerIndex) return

    const gs = gameState
    const t = setTimeout(() => {
      const cpu = gs.players[gs.currentPlayerIndex]
      const total = gs.sevenPassState?.totalToGive ?? 1
      const others = gs.players
        .map((p, i) => ({ p, i }))
        .filter(({ i }) => i !== gs.currentPlayerIndex && !gs.finishedPlayers.includes(i))
      if (others.length === 0) {
        handleSevenPassDone(resolveSevenPass(gs, gs.currentPlayerIndex, []))
        return
      }
      const target = others.reduce((a, b) => a.p.hand.length >= b.p.hand.length ? a : b)
      const sorted = [...cpu.hand].sort((a, b) => a.value - b.value)
      const cards = sorted.slice(0, Math.min(total, sorted.length))
      handleSevenPassDone(resolveSevenPass(gs, target.i, cards))
    }, 600)
    return () => clearTimeout(t)
  }, [view, gameState?.currentPlayerIndex, gameState?.phase, gameMode])

  // ─── CPU: 10捨て自動処理 ─────────────────────────────────────────────────
  useEffect(() => {
    if (gameMode !== 'cpu') return
    if (view !== 'tenDiscard') return
    if (!gameState || gameState.phase !== 'tenDiscard') return
    if (gameState.currentPlayerIndex === myPlayerIndex) return

    const gs = gameState
    const t = setTimeout(() => {
      const cpu = gs.players[gs.currentPlayerIndex]
      const total = gs.tenDiscardState?.totalToDiscard ?? 1
      const sorted = [...cpu.hand].sort((a, b) => a.value - b.value)
      const cards = sorted.slice(0, Math.min(total, sorted.length))
      handleTenDiscardDone(resolveTenDiscard(gs, cards))
    }, 600)
    return () => clearTimeout(t)
  }, [view, gameState?.currentPlayerIndex, gameState?.phase, gameMode])

  // ─── 黒塗りの高級車: gameState変化時に毎回チェック（2周目以降・1ゲーム1回） ──
  useEffect(() => {
    if (!gameState) return
    if (view !== 'playing' && view !== 'passScreen') return
    if (gameState.phase !== 'play') return
    if (kuronuriPreview !== null) return
    if (gameState.kuronuriUsed) return
    if (!gameState.secondRoundOrLater) return

    const player = gameState.players[myPlayerIndex]
    if (!player || player.hand.length === 0) return

    if (checkKuronuri(player.hand)) {
      const preview = previewKuronuri(gameState, myPlayerIndex)
      setKuronuriPreview(preview)
    }
  }, [gameState, view, kuronuriPreview, myPlayerIndex])

  // ─── WebSocket (フレンド対戦) ─────────────────────────────────────────────
  function setupWSHandlers(ws: WebSocket) {
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.type === 'game_state_sync') {
          const st = deserializeState(msg.newState)
          setGameState(st)
          if (st.phase === 'result') setView('result')
          else if (st.phase === 'sevenPass') setView('sevenPass')
          else if (st.phase === 'tenDiscard') setView('tenDiscard')
          else setView('playing')
        } else if (msg.type === 'stamp') {
          setIncomingStamp({ playerIndex: msg.playerIndex, stampId: msg.stampId, playerName: msg.playerName || `P${msg.playerIndex + 1}` })
          setTimeout(() => setIncomingStamp(null), 100)
        }
      } catch (_) {}
    }
  }

  function deserializeState(raw: any): GameState {
    return {
      ...raw,
      passedPlayers: new Set(raw.passedPlayers ?? []),
      miyakochiPlayers: raw.miyakochiPlayers ?? [],
      startingRanks: raw.startingRanks ?? (raw.players?.map(() => null) ?? []),
    }
  }

  function serializeState(state: GameState): any {
    return { ...state, passedPlayers: [...state.passedPlayers] }
  }

  function broadcastIfOnline(newState: GameState) {
    if (gameMode === 'friend' && wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify({ type: 'game_action', newState: serializeState(newState) }))
    }
  }

  function getRankEffectDuration(effect: GameState['specialEffect']): number {
    if (effect === 'IIYO') return 3800
    if (effect === 'DAIFUGOU') return 3400
    if (effect === 'FUGOU') return 2800
    if (effect === 'HINMIN') return 2400
    if (effect === 'DAIHINMIN') return 3000
    if (effect) return 2000
    return 0
  }

  // ─── CPUアクション後の画面遷移 ───────────────────────────────────────────
  function handleCPUAction(newState: GameState, _type: 'play' | 'pass') {
    if (newState.specialEffect === 'IKISUGI' && appRef.current) {
      appRef.current.classList.add('shake')
      setTimeout(() => appRef.current?.classList.remove('shake'), 600)
    }
    if (newState.specialEffect) { setShowEffect(true); setEffectKey(k => k + 1) }
    setGameState(newState)

    if (newState.phase === 'result') {
      cancelPhaseViewTimer()
      const dur = getRankEffectDuration(newState.specialEffect)
      if (dur) { phaseViewTimerRef.current = setTimeout(() => setView('result'), dur) }
      else setView('result')
      return
    }
    if (newState.phase === 'sevenPass') {
      cancelPhaseViewTimer()
      const dur = newState.specialEffect ? 1100 : 0
      if (dur) { phaseViewTimerRef.current = setTimeout(() => setView('sevenPass'), dur) }
      else setView('sevenPass')
      return
    }
    if (newState.phase === 'tenDiscard') {
      cancelPhaseViewTimer()
      const dur = newState.specialEffect ? 1100 : 0
      if (dur) { phaseViewTimerRef.current = setTimeout(() => setView('tenDiscard'), dur) }
      else setView('tenDiscard')
      return
    }
    // エフェクトなし: 人間のターンになったらpassScreen、CPU継続はuseEffectに任せる
    if (!newState.specialEffect) {
      if (newState.currentPlayerIndex === myPlayerIndex) {
        setTimeout(() => { setNextPlayerIndex(myPlayerIndex); setView('passScreen') }, 350)
      }
      // else: CPU auto-play useEffect が処理
    }
  }

  // ─── ゲーム開始 ──────────────────────────────────────────────────────────
  function applyChallengeScenario(state: GameState, setup: ChallengeSetup): GameState {
    const players = state.players.map(player => ({ ...player, hand: [...player.hand] }))
    const startsInRevolutionScenario =
      setup.scenarioType === 'cpuRevolution' ||
      setup.scenarioType === 'reverseTrap' ||
      setup.scenarioType === 'finalBoss'

    // CPU脅威プレイヤーの手札を targetHandCount 枚に減らす。
    // 余剰カードを別CPUへ集めると手札が30枚前後まで膨らみ、
    // 合法手探索が指数的に重くなるためチャレンジ盤面から除外する。
    const targetIndexes = Array.from({ length: setup.threatCount }, (_, index) => index + 1)

    // プレイヤーの強いカードを没収して通常CPUへ渡す（Lv21以降）
    if (setup.playerHandicap > 0) {
      const playerHand = [...players[0].hand].sort((a, b) => b.value - a.value)
      const confiscated = playerHand.slice(0, setup.playerHandicap)
      players[0] = { ...players[0], hand: players[0].hand.filter(c => !confiscated.some(cc => cc.id === c.id)) }
      // 没収カードは脅威でない通常CPUへ均等に配る
      const normalCpuIndexes = players.map((_, i) => i).filter(i => i !== 0 && !targetIndexes.includes(i))
      const targets = normalCpuIndexes.length > 0 ? normalCpuIndexes : [1]
      confiscated.forEach((card, i) => {
        const idx = targets[i % targets.length]
        players[idx] = { ...players[idx], hand: [...players[idx].hand, card] }
      })
    }

    // 指定対象だけカードを交換し、それ以外のランダム配札は維持する。
    const tuneStrength = (targetIndex: number, makeStrong: boolean) => {
      const target = players[targetIndex].hand
      const targetSlots = target.map((card, index) => ({ card, index }))
        .sort((a, b) => makeStrong ? a.card.value - b.card.value : b.card.value - a.card.value)
      const outside = players.flatMap((player, playerIndex) => playerIndex === targetIndex ? [] :
        player.hand.map((card, cardIndex) => ({ card, playerIndex, cardIndex })))
        .sort((a, b) => makeStrong ? b.card.value - a.card.value : a.card.value - b.card.value)
      const swaps = Math.min(Math.ceil(target.length / 2), outside.length)
      for (let i = 0; i < swaps; i++) {
        const own = targetSlots[i]
        const other = outside[i]
        const improves = makeStrong ? other.card.value > own.card.value : other.card.value < own.card.value
        if (!improves) continue
        players[targetIndex].hand[own.index] = other.card
        players[other.playerIndex].hand[other.cardIndex] = own.card
      }
    }

    const giveRevolution = (targetIndex: number) => {
      if (players[targetIndex].hand.length < 4) return
      const allCards = players.flatMap(player => player.hand)
      const groups = new Map<string, typeof allCards>()
      allCards.forEach(card => {
        if (card.suit === 'joker') return
        const key = String(card.rank)
        groups.set(key, [...(groups.get(key) ?? []), card])
      })
      const four = [...groups.values()].find(cards => cards.length >= 4)?.slice(0, 4)
      if (!four) return
      const wantedIds = new Set(four.map(card => card.id))
      const replaceSlots = players[targetIndex].hand
        .map((card, index) => ({ card, index }))
        .filter(item => !wantedIds.has(item.card.id))
      four.filter(card => !players[targetIndex].hand.some(own => own.id === card.id)).forEach((card, i) => {
        const ownerIndex = players.findIndex(player => player.hand.some(own => own.id === card.id))
        const ownerSlot = players[ownerIndex].hand.findIndex(own => own.id === card.id)
        const replacement = replaceSlots[i]
        if (ownerIndex < 0 || ownerSlot < 0 || !replacement) return
        players[targetIndex].hand[replacement.index] = card
        players[ownerIndex].hand[ownerSlot] = replacement.card
      })
    }

    if (setup.scenarioType === 'weakHand' || setup.scenarioType === 'lockedHand' || setup.scenarioType === 'curseCombo') tuneStrength(0, false)
    if (setup.scenarioType === 'cpuStrong' || setup.scenarioType === 'finalBoss') tuneStrength(1, true)
    if (setup.scenarioType === 'doubleSiege') { tuneStrength(1, true); tuneStrength(2, true) }
    if (setup.scenarioType === 'sniperRush') tuneStrength(1, true)  // 少枚数CPU を強化
    if (setup.scenarioType === 'bruteForce') tuneStrength(3, true)  // 非脅威CPUを強化
    // 革命系シナリオは開始時点から革命中（CPUに4枚組は不要）

    // 革命中の3は最強なので、CPUが初手から3を3枚出して場を独占しないよう分散する。
    if (startsInRevolutionScenario) {
      for (let cpuIndex = 1; cpuIndex < players.length; cpuIndex++) {
        while (players[cpuIndex].hand.filter(card => card.rank === 3).length >= 3) {
          let extraThreeIndex = -1
          for (let cardIndex = players[cpuIndex].hand.length - 1; cardIndex >= 0; cardIndex--) {
            if (players[cpuIndex].hand[cardIndex].rank === 3) {
              extraThreeIndex = cardIndex
              break
            }
          }
          if (extraThreeIndex < 0) break
          let swapped = false
          for (let otherIndex = 1; otherIndex < players.length && !swapped; otherIndex++) {
            if (otherIndex === cpuIndex || players[otherIndex].hand.filter(card => card.rank === 3).length >= 2) continue
            const replacementIndex = players[otherIndex].hand.findIndex(card =>
              card.rank !== 3 &&
              players[cpuIndex].hand.filter(own => own.rank === card.rank).length < 2
            )
            if (replacementIndex < 0) continue
            const replacement = players[otherIndex].hand[replacementIndex]
            players[otherIndex].hand[replacementIndex] = players[cpuIndex].hand[extraThreeIndex]
            players[cpuIndex].hand[extraThreeIndex] = replacement
            swapped = true
          }
          if (!swapped) break
        }
      }
    }

    // 説明通りCPU1がジョーカーを持つステージでは、プレイヤーではなくCPUへ保証する。
    if (setup.cpuHasJoker && !players[1].hand.some(card => card.rank === 'JOKER')) {
      const ownerIndex = players.findIndex(player => player.hand.some(card => card.rank === 'JOKER'))
      const jokerIndex = ownerIndex >= 0 ? players[ownerIndex].hand.findIndex(card => card.rank === 'JOKER') : -1
      const replacementIndex = players[1].hand
        .map((card, index) => ({ card, index }))
        .sort((a, b) => a.card.value - b.card.value)[0]?.index
      if (ownerIndex >= 0 && jokerIndex >= 0 && replacementIndex !== undefined) {
        const replacement = players[1].hand[replacementIndex]
        players[1].hand[replacementIndex] = players[ownerIndex].hand[jokerIndex]
        players[ownerIndex].hand[jokerIndex] = replacement
      }
    }

    // 初期縛りのスートを1枚も持たない配札では初手から行動不能になるため、1枚を保証する。
    if (setup.initialShibariSuit && !players[0].hand.some(card => card.suit === setup.initialShibariSuit)) {
      for (let playerIndex = 1; playerIndex < players.length; playerIndex++) {
        const suitedIndex = players[playerIndex].hand.findIndex(card => card.suit === setup.initialShibariSuit)
        if (suitedIndex < 0) continue
        const replacementIndex = players[0].hand
          .map((card, index) => ({ card, index }))
          .sort((a, b) => a.card.value - b.card.value)[0]?.index
        if (replacementIndex === undefined) break
        const replacement = players[0].hand[replacementIndex]
        players[0].hand[replacementIndex] = players[playerIndex].hand[suitedIndex]
        players[playerIndex].hand[suitedIndex] = replacement
        break
      }
    }

    // 禁止札を所持する複合ステージでは、配札次第で詰まないよう10捨て用の10を保証する。
    const forbiddenDiscardRank: Partial<Record<string, number | 'JOKER'>> = {
      '8切り': 8, '7渡し': 7, 'ジョーカー': 'JOKER',
    }
    const discardTarget = setup.forbiddenEffect ? forbiddenDiscardRank[setup.forbiddenEffect] : undefined
    if (setup.rules.junTen && discardTarget !== undefined &&
        players[0].hand.some(card => card.rank === discardTarget) &&
        !players[0].hand.some(card => card.rank === 10)) {
      for (let playerIndex = 1; playerIndex < players.length; playerIndex++) {
        const tenIndex = players[playerIndex].hand.findIndex(card => card.rank === 10)
        if (tenIndex < 0) continue
        const replacementIndex = players[0].hand
          .map((card, index) => ({ card, index }))
          .filter(({ card }) => card.rank !== discardTarget)
          .sort((a, b) => a.card.value - b.card.value)[0]?.index
        if (replacementIndex === undefined) break
        const replacement = players[0].hand[replacementIndex]
        players[0].hand[replacementIndex] = players[playerIndex].hand[tenIndex]
        players[playerIndex].hand[tenIndex] = replacement
        break
      }
    }

    // ── effectForbidden: 禁止エフェクトのトリガーカードをプレイヤーの手札から排除 ──
    // 誤発動による詰みを防ぐため、対象ランクをすべてCPU手札と交換する
    // ※ '7渡し' はルール無効化（nanaWatashi:false）で制御するため除外。7は手に残す。
    if (setup.scenarioType === 'effectForbidden' && setup.forbiddenEffect) {
      const FORBIDDEN_RANK: Partial<Record<string, number | 'JOKER'>> = {
        '8切り': 8, '10捨て': 10, '11バック': 11, 'ジョーカー': 'JOKER',
      }
      const triggerRank = FORBIDDEN_RANK[setup.forbiddenEffect]
      if (triggerRank !== undefined) {
        const toRemove = players[0].hand.filter(c => c.rank === triggerRank)
        // CPU側から対象ランク以外の弱いカードを調達して交換
        const cpuPool = players.slice(1)
          .flatMap((p, pi) => p.hand.map((c, ci) => ({ c, pi: pi + 1, ci })))
          .filter(({ c }) => c.rank !== triggerRank)
          .sort((a, b) => a.c.value - b.c.value)
        toRemove.forEach((card, i) => {
          if (i >= cpuPool.length) return
          const { c: swap, pi, ci } = cpuPool[i]
          const idx = players[0].hand.findIndex(c => c.id === card.id)
          players[0].hand[idx] = swap
          players[pi].hand[ci] = card
        })
      }
    }

    // ── effectRequired: 必須エフェクトのトリガーカードをプレイヤーに確保 ──
    // 必要札が手札にない場合、クリア不可能になるため補充する
    if (setup.scenarioType === 'effectRequired' && setup.requiredEffect) {
      if (setup.requiredEffect === '革命') {
        // 4枚同ランクを渡す。失敗した場合は別ランクで再試行
        giveRevolution(0)
        // 念のため: 4枚組がまだなければ全ランクを総当たりで補充
        const has4 = () => {
          const m = new Map<string, number>()
          players[0].hand.forEach(c => { if (c.suit !== 'joker') m.set(String(c.rank), (m.get(String(c.rank)) ?? 0) + 1) })
          return [...m.values()].some(v => v >= 4)
        }
        if (!has4()) {
          // 全プレイヤーのカードをランク別にまとめ、最も分散していないランクを優先
          const rankGroups = new Map<string, { card: import('./types/game').Card; pi: number; ci: number }[]>()
          players.forEach((p, pi) => p.hand.forEach((c, ci) => {
            if (c.suit === 'joker') return
            const k = String(c.rank)
            rankGroups.set(k, [...(rankGroups.get(k) ?? []), { card: c, pi, ci }])
          }))
          // プレイヤーが既に最多持つランクを選ぶ
          const playerRankCount = new Map<string, number>()
          players[0].hand.forEach(c => { if (c.suit !== 'joker') playerRankCount.set(String(c.rank), (playerRankCount.get(String(c.rank)) ?? 0) + 1) })
          let bestRank = ''
          let bestOwned = -1
          rankGroups.forEach((_, k) => {
            const owned = playerRankCount.get(k) ?? 0
            if (owned > bestOwned) { bestOwned = owned; bestRank = k }
          })
          if (bestRank) {
            const needed = (rankGroups.get(bestRank) ?? []).filter(x => !players[0].hand.some(c => c.id === x.card.id))
            const replaceSlots = players[0].hand.map((c, i) => ({ c, i })).filter(x => String(x.c.rank) !== bestRank)
            needed.forEach(({ card, pi, ci }, idx) => {
              const slot = replaceSlots[idx]
              if (!slot) return
              players[0].hand[slot.i] = card
              players[pi].hand[ci] = slot.c
            })
          }
        }
      } else {
        const REQUIRED_RANK: Partial<Record<string, number | 'JOKER'>> = {
          '8切り': 8, '7渡し': 7, '10捨て': 10, '11バック': 11, 'ジョーカー': 'JOKER',
        }
        const targetRank = REQUIRED_RANK[setup.requiredEffect]
        if (targetRank !== undefined && !players[0].hand.some(c => c.rank === targetRank)) {
          // CPU から対象ランクを1枚借りてプレイヤーの最弱カードと交換
          for (let pi = 1; pi < players.length; pi++) {
            const ci = players[pi].hand.findIndex(c => c.rank === targetRank)
            if (ci < 0) continue
            const weakest = [...players[0].hand].sort((a, b) => a.value - b.value)[0]
            if (!weakest) break
            const widx = players[0].hand.findIndex(c => c.id === weakest.id)
            players[0].hand[widx] = players[pi].hand[ci]
            players[pi].hand[ci] = weakest
            break
          }
        }
        // 階段・縛り required: 同一スートの階段なら両方を成立できるため、
        // 連続3枚が揃うまで最大3回補充を繰り返す。
        if (setup.requiredEffect === '階段' || setup.requiredEffect === '縛り') {
          const checkSameSuit3Run = () => {
            const bySuit = new Map<string, number[]>()
            players[0].hand.filter(c => c.suit !== 'joker').forEach(c => {
              bySuit.set(c.suit, [...(bySuit.get(c.suit) ?? []), c.value])
            })
            for (const vals of bySuit.values()) {
              const s = [...new Set(vals)].sort((a, b) => a - b)
              for (let i = 0; i + 2 < s.length; i++) {
                if (s[i + 1] === s[i] + 1 && s[i + 2] === s[i] + 2) return true
              }
            }
            return false
          }
          // 最大3回ループ（最悪でも連番ゼロ状態から2回で3枚揃う）
          for (let attempt = 0; attempt < 3 && !checkSameSuit3Run(); attempt++) {
            const bySuit = new Map<string, { suit: string; vals: number[] }>()
            players[0].hand.filter(c => c.suit !== 'joker').forEach(c => {
              const entry = bySuit.get(c.suit) ?? { suit: c.suit, vals: [] }
              entry.vals.push(c.value)
              bySuit.set(c.suit, entry)
            })
            let bestSuit = ''
            let bestNeed = -1
            let bestLen = 0
            bySuit.forEach(({ suit, vals }) => {
              const sorted = [...new Set(vals)].sort((a, b) => a - b)
              let runStart = 0
              for (let i = 1; i <= sorted.length; i++) {
                if (i === sorted.length || sorted[i] !== sorted[i - 1] + 1) {
                  const len = i - runStart
                  if (len >= 2 && len > bestLen) {
                    bestLen = len; bestSuit = suit; bestNeed = sorted[i - 1] + 1
                  } else if (len >= 1 && bestLen < 2) {
                    if (sorted[runStart] + 1 <= 15) {
                      bestLen = 1; bestSuit = suit; bestNeed = sorted[runStart] + 1
                    }
                  }
                  runStart = i
                }
              }
            })
            if (!bestSuit || bestNeed <= 0 || bestNeed > 15) break
            let found = false
            for (let pi = 1; pi < players.length; pi++) {
              const ci = players[pi].hand.findIndex(c => c.suit === bestSuit && c.value === bestNeed)
              if (ci < 0) continue
              // 同スート連番に干渉しない最弱カードを選んで交換
              const weakest = [...players[0].hand]
                .filter(c => !(c.suit === bestSuit && bySuit.get(bestSuit)?.vals.includes(c.value)))
                .sort((a, b) => a.value - b.value)[0]
                ?? [...players[0].hand].sort((a, b) => a.value - b.value)[0]
              if (!weakest) break
              const widx = players[0].hand.findIndex(c => c.id === weakest.id)
              players[0].hand[widx] = players[pi].hand[ci]
              players[pi].hand[ci] = weakest
              found = true; break
            }
            if (!found) break
          }
        }
      }
    }

    // ── 汎用req補充: scenarioTypeに関わらず必要カードを確保 ──────────────────
    // (effectRequired以外のシナリオ型でもreq指定がある場合に対応)
    if (setup.requiredEffect && setup.scenarioType !== 'effectRequired') {
      if (setup.requiredEffect === 'ジョーカー') {
        if (!players[0].hand.some(c => c.suit === 'joker')) {
          for (let pi = 1; pi < players.length; pi++) {
            const ci = players[pi].hand.findIndex(c => c.suit === 'joker')
            if (ci < 0) continue
            const weakest = [...players[0].hand].sort((a, b) => a.value - b.value)[0]
            if (!weakest) break
            const widx = players[0].hand.findIndex(c => c.id === weakest.id)
            players[0].hand[widx] = players[pi].hand[ci]
            players[pi].hand[ci] = weakest
            break
          }
        }
      }
      // ランクベースのreq補充（8切り・7渡し等）
      const GENERIC_REQ_RANK: Partial<Record<string, number | 'JOKER'>> = {
        '8切り': 8, '7渡し': 7, '10捨て': 10, '11バック': 11,
      }
      const gr = GENERIC_REQ_RANK[setup.requiredEffect]
      if (gr !== undefined && !players[0].hand.some(c => c.rank === gr)) {
        for (let pi = 1; pi < players.length; pi++) {
          const ci = players[pi].hand.findIndex(c => c.rank === gr)
          if (ci < 0) continue
          const weakest = [...players[0].hand].sort((a, b) => a.value - b.value)[0]
          if (!weakest) break
          const widx = players[0].hand.findIndex(c => c.id === weakest.id)
          players[0].hand[widx] = players[pi].hand[ci]
          players[pi].hand[ci] = weakest
          break
        }
      }
      // 革命req: 4枚組を確保
      if (setup.requiredEffect === '革命') {
        giveRevolution(0)
      }
    }

    // 固定シード上で相手のA・2・ジョーカーを止められなかった2盤面は、
    // 最上位2枚をプレイヤーへ保証して詰みを防ぐ。
    if ([53, 67].includes(setup.level)) {
      const strongest = players
        .flatMap(player => player.hand)
        .sort((a, b) => b.value - a.value)
        .slice(0, 2)
      const strongestIds = new Set(strongest.map(card => card.id))
      for (const wanted of strongest) {
        if (players[0].hand.some(card => card.id === wanted.id)) continue
        const ownerIndex = players.findIndex(player => player.hand.some(card => card.id === wanted.id))
        const ownerSlot = ownerIndex >= 0 ? players[ownerIndex].hand.findIndex(card => card.id === wanted.id) : -1
        const replacementIndex = players[0].hand
          .map((card, index) => ({ card, index }))
          .filter(({ card }) => !strongestIds.has(card.id))
          .sort((a, b) => a.card.value - b.card.value)[0]?.index
        if (ownerIndex < 0 || ownerSlot < 0 || replacementIndex === undefined) continue
        const replacement = players[0].hand[replacementIndex]
        players[0].hand[replacementIndex] = wanted
        players[ownerIndex].hand[ownerSlot] = replacement
      }
    }

    // 階段／縛り課題は、全配札から確実に同スート3連番を揃える。
    if (setup.requiredEffect === '階段' || setup.requiredEffect === '縛り') {
      const allCards = players.flatMap(player => player.hand)
      let run: typeof allCards = []
      for (const suit of ['spades', 'hearts', 'diamonds', 'clubs'] as const) {
        for (let value = 3; value <= 13; value++) {
          const candidate = [value, value + 1, value + 2]
            .map(target => allCards.find(card => card.suit === suit && card.value === target))
            .filter((card): card is NonNullable<typeof card> => Boolean(card))
          if (candidate.length === 3) {
            run = candidate
            break
          }
        }
        if (run.length === 3) break
      }
      const runIds = new Set(run.map(card => card.id))
      for (const wanted of run) {
        if (players[0].hand.some(card => card.id === wanted.id)) continue
        const ownerIndex = players.findIndex(player => player.hand.some(card => card.id === wanted.id))
        const ownerSlot = ownerIndex >= 0 ? players[ownerIndex].hand.findIndex(card => card.id === wanted.id) : -1
        const replacementIndex = players[0].hand.findIndex(card => !runIds.has(card.id))
        if (ownerIndex < 0 || ownerSlot < 0 || replacementIndex < 0) continue
        const replacement = players[0].hand[replacementIndex]
        players[0].hand[replacementIndex] = wanted
        players[ownerIndex].hand[ownerSlot] = replacement
      }
    }

    // 必須の組合せを作ってから、そのカードを固定して詰め手の枚数へ絞る。
    const requiredPinnedCards = (() => {
      const hand = players[0].hand
      if (setup.requiredEffect === '革命') {
        const byRank = new Map<string, typeof hand>()
        hand.forEach(card => {
          if (card.rank === 'JOKER') return
          const key = String(card.rank)
          byRank.set(key, [...(byRank.get(key) ?? []), card])
        })
        return [...byRank.values()].find(cards => cards.length >= 4)?.slice(0, 4) ?? []
      }
      if (setup.requiredEffect === '階段' || setup.requiredEffect === '縛り') {
        const bySuit = new Map<string, typeof hand>()
        hand.filter(card => card.rank !== 'JOKER').forEach(card => {
          bySuit.set(card.suit, [...(bySuit.get(card.suit) ?? []), card])
        })
        for (const cards of bySuit.values()) {
          const sorted = [...cards].sort((a, b) => a.value - b.value)
          for (let index = 0; index + 2 < sorted.length; index++) {
            if (sorted[index + 1].value === sorted[index].value + 1 &&
                sorted[index + 2].value === sorted[index].value + 2) {
              return sorted.slice(index, index + 3)
            }
          }
        }
        if (setup.requiredEffect === '縛り') {
          return [...bySuit.values()].find(cards => cards.length >= 2)?.slice(0, 2) ?? []
        }
      }
      const requiredRank: Partial<Record<string, number | 'JOKER'>> = {
        '8切り': 8, '7渡し': 7, '10捨て': 10, '11バック': 11, 'ジョーカー': 'JOKER',
      }
      const rank = setup.requiredEffect ? requiredRank[setup.requiredEffect] : undefined
      return rank === undefined ? [] : hand.filter(card => card.rank === rank).slice(0, 1)
    })()
    const pinnedIds = new Set(requiredPinnedCards.map(card => card.id))
    const hardScenarioAdvantage =
      setup.scenarioType === 'doubleSiege' ||
      setup.scenarioType === 'finalBoss' ||
      setup.scenarioType === 'bruteForce'
        ? 1
        : 0
    const fieldAdvantage = setup.initialFieldValue != null ? 1 : 0
    const fixedScenarioAdvantage = [53, 67, 91, 92].includes(setup.level) ? 1 : 0
    const rankAdvantage =
      hardScenarioAdvantage +
      fieldAdvantage +
      fixedScenarioAdvantage
    const playerTargetCount = Math.min(
      players[0].hand.length,
      Math.max(1, requiredPinnedCards.length, setup.targetHandCount - rankAdvantage),
    )
    const keepWeakCards =
      setup.scenarioType === 'weakHand' ||
      setup.scenarioType === 'lockedHand' ||
      setup.scenarioType === 'curseCombo'
    const playerCandidates = players[0].hand
      .filter(card => !pinnedIds.has(card.id))
      .sort((a, b) => {
        if (a.rank === 'JOKER' && b.rank !== 'JOKER') return -1
        if (b.rank === 'JOKER' && a.rank !== 'JOKER') return 1
        if (startsInRevolutionScenario || keepWeakCards) return a.value - b.value
        return b.value - a.value
      })
    players[0].hand = [
      ...requiredPinnedCards,
      ...playerCandidates.slice(0, playerTargetCount - requiredPinnedCards.length),
    ].sort((a, b) => a.value - b.value || a.suit.localeCompare(b.suit))

    // 必須カード補充に山全体を使った後で、脅威CPUの余剰カードを盤面から除外する。
    targetIndexes.forEach(index => {
      players[index].hand.splice(setup.targetHandCount)
    })

    // 手札調整で♠3や2431の所在が変わるため、先攻と強制対象を確定配札から再計算する。
    // チャレンジは課題を組み立てる機会を保証するためプレイヤー先攻。
    // Lv25だけは説明どおりCPU先攻を維持する。
    const firstPlayer = setup.level === 25 ? findFirstPlayer(players.map(player => player.hand)) : 0
    // チャレンジ固有の課題へ無関係な2431強制が割り込むと、説明・配札・
    // クリア条件が食い違うため、2431は通常対戦だけで判定する。
    const must2431: number[] = []
    const startLog = [
      setup.level === 25
        ? `🎴 ゲーム開始！ ${players[firstPlayer].name}の番です (♠3持ち)`
        : `🎯 チャレンジ先攻！ ${players[firstPlayer].name}の番です`,
    ]
    if (must2431.length > 0) startLog.push(`⚠️ ${players[firstPlayer].name} は 2431 を所持！初手で出してください`)

    const startsInRevolution = startsInRevolutionScenario

    // ── 禁止ルールをゲームのrulesに反映 ──────────────────────────────────
    const challengeRules = {
      ...state.rules,
      forbidPairs: setup.forbidPairs ?? false,
      forbidStairs: setup.forbidStairs ?? false,
      // effectRequired: 必要エフェクトのルールを強制有効化（レベル解放段階に関わらず）
      ...(setup.requiredEffect === '8切り'  ? { eightCut: true }    : {}),
      ...(setup.requiredEffect === '階段'   ? { kaidan: true }      : {}),
      ...(setup.requiredEffect === '革命'   ? { kakumei: true }     : {}),
      ...(setup.requiredEffect === '7渡し'  ? { nanaWatashi: true } : {}),
      ...(setup.requiredEffect === '縛り'   ? { shibari: true }     : {}),
      ...(setup.requiredEffect === 'ジョーカー' ? {} : {}),
      // effectForbidden: 7渡しはカード除去ではなくルール無効化で禁止
      ...(setup.forbiddenEffect === '7渡し' ? { nanaWatashi: false } : {}),
      // 革命禁止
      ...(setup.forbiddenEffect === '革命' ? { kakumei: false } : {}),
    }

    // ── 初期盤面の設定 ────────────────────────────────────────────────────
    let initialFieldOverride: Partial<import('./types/game').GameState> = {}
    if (setup.initialFieldValue != null) {
      const fv = setup.initialFieldValue
      const fc = setup.initialFieldCount ?? 1
      const isStairs = setup.initialFieldStairs ?? false

      let fieldCards: import('./types/game').Card[]
      if (isStairs && fc >= 2) {
        // 階段: 最大値=fv の連続fc枚（例: fv=7,fc=3 → 5,6,7）
        fieldCards = Array.from({ length: fc }, (_, i) => ({
          id: `field-init-${fv - fc + 1 + i}`,
          suit: 'spades' as import('./types/game').Suit,
          rank: (fv - fc + 1 + i) as import('./types/game').Rank,
          value: fv - fc + 1 + i,
        }))
      } else {
        // 通常/ペア: 全部同じランク
        fieldCards = Array.from({ length: fc }, (_, i) => ({
          id: `field-init-${fv}-${i}`,
          suit: 'spades' as import('./types/game').Suit,
          rank: fv as import('./types/game').Rank,
          value: fv,
        }))
      }

      // プレイヤーに初期盤面に応答できる合法手があるか確認し、なければCPUから補充
      const requiredResponseSuit = setup.requiredEffect === '縛り' ? 'spades' : null
      const hasSameSuitStair = (hand: import('./types/game').Card[], minTop: number, len: number) => {
        const bySuit = new Map<string, number[]>()
        hand.filter(c => c.suit !== 'joker' && (!requiredResponseSuit || c.suit === requiredResponseSuit)).forEach(c => {
          bySuit.set(c.suit, [...(bySuit.get(c.suit) ?? []), c.value])
        })
        for (const vals of bySuit.values()) {
          const sorted = [...new Set(vals)].sort((a, b) => a - b)
          for (let i = 0; i + len - 1 < sorted.length; i++) {
            let ok = true
            for (let k = 1; k < len; k++) if (sorted[i + k] !== sorted[i] + k) { ok = false; break }
            if (ok && sorted[i + len - 1] > minTop) return true
          }
        }
        return false
      }

      if (isStairs && fc >= 3) {
        if (requiredResponseSuit) {
          const desiredRun = Array.from({ length: fc }, (_, index) =>
            createDeck().find(card => card.suit === requiredResponseSuit && card.value === fv + 1 + index)
          ).filter((card): card is import('./types/game').Card => Boolean(card))
          const desiredIds = new Set(desiredRun.map(card => card.id))
          for (const wanted of desiredRun) {
            if (players[0].hand.some(card => card.id === wanted.id)) continue
            for (let playerIndex = 1; playerIndex < players.length; playerIndex++) {
              players[playerIndex].hand = players[playerIndex].hand.filter(card => card.id !== wanted.id)
            }
            const replacementIndex = players[0].hand
              .map((card, index) => ({ card, index }))
              .filter(({ card }) => !desiredIds.has(card.id))
              .sort((a, b) => a.card.value - b.card.value)[0]?.index
            if (replacementIndex === undefined) continue
            const replacement = players[0].hand[replacementIndex]
            players[0].hand[replacementIndex] = wanted
            players[1].hand.push(replacement)
          }
        }
        // 階段初期盤面: 同スートで fc 枚連番かつ最大値 > fv の階段が必要
        if (!hasSameSuitStair(players[0].hand, fv, fc)) {
          // CPUから同スートの適切なカードを補充して階段を作る
          for (let pi = 1; pi < players.length; pi++) {
            for (const cpuCard of [...players[pi].hand].sort((a, b) => a.value - b.value)) {
              if (cpuCard.suit === 'joker' || (requiredResponseSuit && cpuCard.suit !== requiredResponseSuit)) continue
              // cpuCardをプレイヤーに渡した場合に有効な階段ができるか試す
              const testHand = [...players[0].hand]
              const weakestIdx = testHand.findIndex(c =>
                c.value === Math.min(...testHand.map(x => x.value))
              )
              if (weakestIdx < 0) break
              const replaced = [...testHand]
              replaced[weakestIdx] = cpuCard
              if (hasSameSuitStair(replaced, fv, fc)) {
                players[pi].hand = players[pi].hand.filter(c => c.id !== cpuCard.id)
                players[pi].hand.push(testHand[weakestIdx])
                players[0].hand = replaced
                break
              }
            }
            if (hasSameSuitStair(players[0].hand, fv, fc)) break
          }
        }
      } else {
        // 通常/ペア初期盤面: fv より大きい単体カードがあればOK
        const hasValidPlay = players[0].hand.some(c => c.value > fv)
        if (!hasValidPlay) {
          const candidate = players.slice(1)
            .flatMap((p, pi) => p.hand.map((c, ci) => ({ c, pi: pi + 1, ci })))
            .filter(({ c }) => c.value > fv)
            .sort((a, b) => a.c.value - b.c.value)[0]
          if (candidate) {
            const weakest = [...players[0].hand].sort((a, b) => a.value - b.value)[0]
            if (weakest) {
              const widx = players[0].hand.findIndex(c => c.id === weakest.id)
              players[0].hand[widx] = candidate.c
              players[candidate.pi].hand[candidate.ci] = weakest
            }
          }
        }
      }

      initialFieldOverride = {
        field: [fieldCards],
        fieldCount: fc,
        fieldValue: fv,
        fieldSuit: 'spades',
        lastFieldSuit: 'spades',
        stairsMode: isStairs,
        lastPlayedBy: 3, // "CPU3が出した体" でフィールドを設定
      }
    }

    const challengeSuitLabels = { spades: 'スペード', hearts: 'ハート', diamonds: 'ダイヤ', clubs: 'クラブ' }
    const extraLog: string[] = [
      ...(startsInRevolution ? ['💥 革命中でスタート！弱いカードが強い'] : []),
      ...(setup.initialFieldValue != null ? [`🗂 初期盤面：${setup.initialFieldCount ?? 1}枚が出た状態からスタート`] : []),
      ...(setup.initialShibariSuit ? [`🔒 ${challengeSuitLabels[setup.initialShibariSuit]}縛りでスタート`] : []),
      ...(setup.forbidPairs ? ['✋ ペア・複数枚出し禁止'] : []),
      ...(setup.forbidStairs ? ['✋ 階段出し禁止'] : []),
      ...(setup.maxPlayerPasses != null ? [`⛔ パス制限：合計${setup.maxPlayerPasses}回まで`] : []),
      ...(setup.maxTurns != null ? [`⏱ ターン制限：${setup.maxTurns}ターン以内`] : []),
    ]

    // forcedHand: 指定レベルの手札をランク+スートで強制差し替え
    const forcedSpecs = CHALLENGE_FORCED_HAND[setup.level]
    if (forcedSpecs) {
      const newPlayerHand: typeof players[0]['hand'] = []
      for (const spec of forcedSpecs) {
        const found = createDeck().find(card =>
          card.rank === spec.rank &&
          card.suit === spec.suit &&
          !newPlayerHand.some(selected => selected.id === card.id)
        )
        if (found) newPlayerHand.push(found)
      }
      if (newPlayerHand.length === forcedSpecs.length) {
        // 元の手札で強制手札に入らなかったカードをCPUプールへ戻す
        const newHandIds = new Set(newPlayerHand.map(c => c.id))
        const displaced = players[0].hand.filter(c => !newHandIds.has(c.id))
        // 強制手札に入ったカードを各CPUから除去
        for (let pi = 1; pi < players.length; pi++) {
          players[pi].hand = players[pi].hand.filter(c => !newHandIds.has(c.id))
        }
        // 弾き出されたカードをCPU1に追加
        players[1].hand.push(...displaced)
        players[0].hand = newPlayerHand.sort((a, b) => a.value - b.value)
      }
    }

    // Lv99: CPU3(players[3])の「2」(rank=2)は最大2枚に制限
    if (setup.level === 99 && players[3]) {
      const twos = players[3].hand.filter(c => c.rank === 2)
      const excess = twos.slice(2)
      if (excess.length > 0) {
        const excessIds = new Set(excess.map(c => c.id))
        players[3].hand = players[3].hand.filter(c => !excessIds.has(c.id))
        // 余分な2をCPU1に渡す
        players[1].hand.push(...excess)
      }
    }

    return {
      ...state,
      players,
      currentPlayerIndex: firstPlayer,
      lastPlayedBy: firstPlayer,
      must2431,
      revolutionActive: startsInRevolution,
      rules: challengeRules,
      maxPlayerPasses: setup.maxPlayerPasses ?? null,
      maxTurns: setup.maxTurns ?? null,
      shibariSuit: setup.initialShibariSuit ?? state.shibariSuit,
      ...initialFieldOverride,
      log: [`🎯 Lv.${setup.level}: ${setup.description}`, ...extraLog, ...startLog],
    }
  }

  function failChallenge(state: GameState, reason: string): GameState {
    return {
      ...forfeitGame(state, reason),
      challengeResult: 'failed',
      challengeResultReason: reason,
    }
  }

  // チャレンジはプレイヤーの順位が確定した時点で成否を確定し、残りの対局を省略する。
  function checkChallengeOutcome(rawState: GameState): GameState {
    const state = rawState
    if (!activeChallenge || state.challengeResult) return state

    const outcome = evaluateChallengeOutcome(state, activeChallenge, myPlayerIndex)
    if (!outcome) return state
    const playerRank = state.players[myPlayerIndex]?.rank
    if (!playerRank) return failChallenge(state, outcome.reason)
    const cleared = outcome.result === 'cleared'

    const players = state.players.map(player => ({ ...player }))
    const finishedPlayers = [...new Set(state.finishedPlayers)]
    for (let index = 0; index < players.length; index++) {
      if (finishedPlayers.includes(index) || state.miyakochiPlayers.includes(index)) continue
      finishedPlayers.push(index)
      const position = finishedPlayers.length
      players[index] = {
        ...players[index],
        finishOrder: position,
        rank: (['', '大富豪', '富豪', '貧民', '大貧民'][position] ?? '大貧民') as PlayerRank,
      }
    }

    return {
      ...state,
      players,
      finishedPlayers,
      phase: 'result',
      challengeResult: outcome.result,
      challengeResultReason: outcome.reason,
      log: [
        ...state.log,
        cleared ? '🎯 クリア条件達成！この時点でチャレンジ終了！' : `❌ ${outcome.reason}。チャレンジ終了`,
        '🎉 ゲーム終了！',
      ].slice(-30),
    }
  }

  function startGame(r?: RulesConfig, mode: GameMode = 'cpu', startingRanks?: (PlayerRank | null)[], cpuNames?: string[], challengeSetup?: ChallengeSetup) {
    const activeRules = r ?? rules
    // 前ゲームの残存タイマーをすべてキャンセル
    cancelPhaseViewTimer()
    if (cpuTimerRef.current) { clearTimeout(cpuTimerRef.current); cpuTimerRef.current = null }

    const playerNames = mode === 'cpu' ? [profile.username || 'あなた', ...(cpuNames ?? ['CPU 1', 'CPU 2', 'CPU 3'])] : undefined
    const seed = challengeSetup
      ? (CHALLENGE_SEED_OVERRIDE[challengeSetup.level] ?? challengeSetup.level)
      : undefined
    const initialState = initGame(activeRules, playerNames, startingRanks, seed)
    const state = challengeSetup ? applyChallengeScenario(initialState, challengeSetup) : initialState
    setGameKey(k => k + 1)
    setShowEffect(false)
    setKuronuriPreview(null)
    setGameState(state)
    setGameMode(mode)
    setMyPlayerIndex(0)
    setNextPlayerIndex(state.currentPlayerIndex)
    if (currentBGMTrack !== 'game') playBGM('game')
    setView('passScreen')
  }

  function handlePlayAgain(prevRanks: (PlayerRank | null)[]) {
    if (turnStallCheckTimerRef.current) clearTimeout(turnStallCheckTimerRef.current)
    setTurnStallDetected(null)
    setChallengeSessionId(null)
    startGame(rules, gameMode, prevRanks)
  }

  function handleModeSelect(mode: SelectMode) {
    if (mode === 'friend') {
      setView('onlineRoom')
    } else if (mode === 'xshare') {
      setView('xRecruitRoom')
    } else if (mode === 'portal') {
      setView('portal')
    } else if (mode === 'challenge') {
      setView('challenge')
    } else if (mode === 'tournament') {
      setView('tournament')
    } else {
      startGame(rules, 'cpu')
    }
  }

  function handleChallengeStart(setup: ChallengeSetup) {
    if (turnStallCheckTimerRef.current) clearTimeout(turnStallCheckTimerRef.current)
    setTurnStallDetected(null)
    setActiveChallenge(setup)
    setChallengeSessionId(`challenge-${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`)
    setRules(setup.rules)
    startGame(setup.rules, 'cpu', undefined, setup.opponents, setup)
  }

  const [onlinePlayerAvatars, setOnlinePlayerAvatars] = useState<(string | null)[]>([])
  const [tournamentSize, setTournamentSize] = useState<number | null>(null)
  const [activeChallenge, setActiveChallenge] = useState<ChallengeSetup | null>(null)
  const [challengeSessionId, setChallengeSessionId] = useState<string | null>(null)
  const [turnStallDetected, setTurnStallDetected] = useState<TurnStallDetection | null>(null)

  function handleTurnDeadlineExpired(playerIndex: number, timeLimitSeconds: number) {
    const sessionId = challengeSessionId
    if (!sessionId) return
    if (turnStallCheckTimerRef.current) clearTimeout(turnStallCheckTimerRef.current)
    turnStallCheckTimerRef.current = setTimeout(() => {
      const current = gameStateRef.current
      if (
        !current
        || current.phase !== 'play'
        || current.currentPlayerIndex !== playerIndex
        || viewRef.current !== 'playing'
        || showEffectRef.current
        || kuronuriPreviewRef.current !== null
      ) return
      setTurnStallDetected({
        sessionId,
        playerIndex,
        timeLimitSeconds,
        detectedAt: new Date().toISOString(),
      })
    }, 1500)
  }

  useEffect(() => {
    if (!activeChallenge || gameState?.phase !== 'result') return
    const rank = gameState.players[myPlayerIndex]?.rank
    const rankPassed = activeChallenge.minRank === '大富豪' ? rank === '大富豪' : (rank === '大富豪' || rank === '富豪')
    const flags = gameState.achievementFlags ?? []
    const effectPassed = !activeChallenge.requiredEffect || flags.includes(activeChallenge.requiredEffect)
    const prohibitionPassed = !activeChallenge.forbiddenEffect || !flags.includes(activeChallenge.forbiddenEffect)
    const passPassed = gameState.maxPlayerPasses == null || gameState.playerPassCount <= gameState.maxPlayerPasses
    const turnPassed = gameState.maxTurns == null || gameState.turnCount <= gameState.maxTurns
    if (rankPassed && effectPassed && prohibitionPassed && passPassed && turnPassed) {
      const key = challengeProgressKey(profile.username || 'プレイヤー')
      const current = Math.max(1, Number(localStorage.getItem(key) || 1))
      const next = Math.min(100, activeChallenge.level + 1)
      if (next > current) localStorage.setItem(key, String(next))
      saveChallengeProgress(profile.username || 'プレイヤー', activeChallenge.level).catch(console.error)
    }
    setActiveChallenge(null)
  }, [gameState?.phase, activeChallenge, myPlayerIndex, profile.username])

  useEffect(() => {
    if (!profile.portalLinked || gameState?.phase !== 'result' || reportedGameKeyRef.current === gameKey) return
    reportedGameKeyRef.current = gameKey
    const roomId = `game-${gameKey}`
    const isDaifugo = gameState.players[myPlayerIndex]?.rank === '大富豪'
    const flags = gameState.achievementFlags ?? []
    const challengeCleared = activeChallenge
      ? (
          (activeChallenge.minRank === '大富豪'
            ? isDaifugo
            : isDaifugo || gameState.players[myPlayerIndex]?.rank === '富豪')
          && (!activeChallenge.requiredEffect || flags.includes(activeChallenge.requiredEffect))
          && (!activeChallenge.forbiddenEffect || !flags.includes(activeChallenge.forbiddenEffect))
          && (gameState.maxPlayerPasses == null || gameState.playerPassCount <= gameState.maxPlayerPasses)
          && (gameState.maxTurns == null || gameState.turnCount <= gameState.maxTurns)
        )
      : false
    const report = (eventType: string) => fetch('/api/portal/game-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        eventType,
        roomId,
        ...(activeChallenge ? { challengeLevel: activeChallenge.level } : {}),
      }),
    }).catch(console.error)
    if (activeChallenge) {
      report('challenge_play')
      if (challengeCleared) report('challenge_win')
    } else {
      report('play')
      if (isDaifugo) report('win')
    }
  }, [gameState?.phase, gameKey, myPlayerIndex, profile.portalLinked, activeChallenge])

  function handleOnlineGameStart(ws: WebSocket, playerIndex: number, initialState: any, _playerNames: string[], playerAvatars: (string | null)[]) {
    wsRef.current = ws
    setupWSHandlers(ws)
    const state = deserializeState(initialState)
    setGameState(state)
    setGameMode('friend')
    setMyPlayerIndex(playerIndex)
    setNextPlayerIndex(state.currentPlayerIndex)
    setOnlinePlayerAvatars(playerAvatars)
    if (currentBGMTrack !== 'game') playBGM('game')
    setView('playing')
  }

  function handleRulesStart(r: RulesConfig) {
    setRules(r)
    setView('modeSelect')
  }

  function handleReady() {
    setView('playing')
  }

  // ─── プレイヤーのカード操作 ───────────────────────────────────────────────
  function handlePlay(rawState: GameState) {
    const newState = checkChallengeOutcome(rawState)
    if (newState.specialEffect === 'IKISUGI' && appRef.current) {
      appRef.current.classList.add('shake')
      setTimeout(() => appRef.current?.classList.remove('shake'), 600)
    }
    if (newState.specialEffect) { setShowEffect(true); setEffectKey(k => k + 1) }
    setGameState(newState)
    broadcastIfOnline(newState)

    if (newState.phase === 'result') {
      cancelPhaseViewTimer()
      const dur = getRankEffectDuration(newState.specialEffect)
      if (dur) { phaseViewTimerRef.current = setTimeout(() => setView('result'), dur) }
      else setView('result')
      return
    }
    if (newState.phase === 'sevenPass') {
      cancelPhaseViewTimer()
      const dur = newState.specialEffect ? 1100 : 0
      if (dur) { phaseViewTimerRef.current = setTimeout(() => setView('sevenPass'), dur) }
      else setView('sevenPass')
      return
    }
    if (newState.phase === 'tenDiscard') {
      cancelPhaseViewTimer()
      const dur = newState.specialEffect ? 1100 : 0
      if (dur) { phaseViewTimerRef.current = setTimeout(() => setView('tenDiscard'), dur) }
      else setView('tenDiscard')
      return
    }
    if (!newState.specialEffect) {
      if (gameMode === 'cpu') {
        if (newState.after2431Start) {
          // 2431直後: ♠3スタートなので誰が先攻でもpassScreen表示
          setTimeout(() => { setNextPlayerIndex(newState.currentPlayerIndex); setView('passScreen') }, 350)
        } else if (newState.currentPlayerIndex === myPlayerIndex) {
          // 人間のターンになった時だけpassScreen
          setTimeout(() => { setNextPlayerIndex(myPlayerIndex); setView('passScreen') }, 350)
        }
        // else: CPU auto-play useEffect が処理
      } else if (gameMode === 'friend') {
        // オンラインはpassScreenなし (各デバイスが独立)
      }
    }
  }

  function handlePass(rawState: GameState) {
    const newState = checkChallengeOutcome(rawState)
    setGameState(newState)
    broadcastIfOnline(newState)

    if (newState.phase === 'result') { setView('result'); return }

    if (gameMode === 'cpu') {
      if (newState.currentPlayerIndex === myPlayerIndex) {
        setTimeout(() => { setNextPlayerIndex(myPlayerIndex); setView('passScreen') }, 300)
      }
      // else: CPU auto-play useEffect が処理
    }
  }

  function handleEffectDone() {
    // gameStateRef.current を使ってstaleクロージャーを回避
    const gs = gameStateRef.current
    if (!gs) return

    if (gs.phase === 'result') { setShowEffect(false); setView('result'); return }
    if (gs.phase === 'sevenPass') { setShowEffect(false); setView('sevenPass'); return }
    if (gs.phase === 'tenDiscard') { setShowEffect(false); setView('tenDiscard'); return }

    if (gameMode === 'cpu') {
      if (gs.currentPlayerIndex === myPlayerIndex) {
        setShowEffect(false)
        setNextPlayerIndex(myPlayerIndex)
        setView('passScreen')
      } else {
        // showEffectとgameKeyを同時に更新してCPU useEffectを1回だけ確実に再発火
        // （競合するtimerを設けずuseEffect側のみでCPUを動かす）
        setShowEffect(false)
        setGameKey(k => k + 1)
      }
    } else {
      setShowEffect(false)
    }
  }

  function handleSevenPassDone(newState: GameState) {
    newState = checkChallengeOutcome(newState)
    cancelPhaseViewTimer()
    setGameState(newState)
    broadcastIfOnline(newState)
    if (newState.phase === 'result') { setView('result'); return }

    if (gameMode === 'cpu') {
      if (newState.currentPlayerIndex === myPlayerIndex) {
        setTimeout(() => { setNextPlayerIndex(myPlayerIndex); setView('passScreen') }, 300)
      } else {
        setView('playing') // CPUターン: auto-play useEffectに任せる
      }
    } else {
      setTimeout(() => { setNextPlayerIndex(newState.currentPlayerIndex); setView('passScreen') }, 300)
    }
  }

  function handleTenDiscardDone(newState: GameState) {
    newState = checkChallengeOutcome(newState)
    cancelPhaseViewTimer()
    setGameState(newState)
    broadcastIfOnline(newState)
    if (newState.phase === 'result') { setView('result'); return }

    if (gameMode === 'cpu') {
      if (newState.currentPlayerIndex === myPlayerIndex) {
        setTimeout(() => { setNextPlayerIndex(myPlayerIndex); setView('passScreen') }, 300)
      } else {
        setView('playing') // CPUターン: auto-play useEffectに任せる
      }
    } else {
      setTimeout(() => { setNextPlayerIndex(newState.currentPlayerIndex); setView('passScreen') }, 300)
    }
  }

  function handleSendStamp(stampId: string) {
    if (gameMode === 'friend' && wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify({ type: 'stamp', stampId }))
    }
  }

  function handleKuronuriDone() {
    const gs = gameStateRef.current
    if (!gs) { setKuronuriPreview(null); return }
    const newState = resolveKuronuri(gs, myPlayerIndex)
    setGameState(newState)
    broadcastIfOnline(newState)
    // setKuronuriPreview(null) + gameKey bump でCPU useEffectを1回だけ確実に再発火
    setKuronuriPreview(null)
    if (gameMode === 'cpu') {
      if (newState.currentPlayerIndex === myPlayerIndex) {
        setTimeout(() => { setNextPlayerIndex(myPlayerIndex); setView('passScreen') }, 300)
      } else {
        // handleEffectDone同様: orphaned timerを作らずgameKeyでuseEffectをトリガー
        setGameKey(k => k + 1)
      }
    }
  }

  function handleBackToTitle() {
    if (turnStallCheckTimerRef.current) clearTimeout(turnStallCheckTimerRef.current)
    wsRef.current?.close()
    wsRef.current = null
    stopBGM()
    setTimeout(() => playBGM('title'), 100)
    setView('start')
    setGameState(null)
    setKuronuriPreview(null)
    setTurnStallDetected(null)
    setChallengeSessionId(null)
  }

  return (
    <div
      ref={appRef}
      style={{
        height: '100dvh',
        maxWidth: 480,
        margin: '0 auto',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <button
        type="button"
        onClick={() => { window.location.href = PORTAL_URL }}
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 40,
          border: '1px solid rgba(212,175,55,.55)',
          borderRadius: 999,
          background: 'rgba(5,5,12,.78)',
          color: '#f7d86a',
          padding: '7px 10px',
          fontSize: 11,
          fontWeight: 900,
          boxShadow: '0 0 14px rgba(212,175,55,.22)',
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
        }}
      >
        PORTALへ戻る
      </button>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {maintenanceMode && profile.portalUserId !== MAINTENANCE_ADMIN_ID ? (
          <MaintenanceScreen />
        ) : (<>
        {view === 'start' && (
          <StartScreen
            onStart={() => setView('modeSelect')}
            onRules={() => setView('rules')}
            onSettings={() => setView('settings')}
            onFriends={() => setView('friends')}
          />
        )}

        {view === 'modeSelect' && (
          <ModeSelectScreen
            onSelect={handleModeSelect}
            onBack={() => setView('start')}
          />
        )}

        {view === 'rules' && (
          <RulesScreen
            onStart={handleRulesStart}
            onBack={() => setView('start')}
          />
        )}

        {view === 'settings' && (
          <SettingsScreen
            stampIds={playerStamps}
            onSave={(s) => { setPlayerStamps(s); setView('start') }}
            onBack={() => setView('start')}
            portalUserId={profile.portalUserId}
          />
        )}

        {view === 'portal' && (
          <InmuPortalSearch
            playerName={profile.username || 'プレイヤー'}
            playerAvatar={profile.avatarDataUrl ?? null}
            tournamentSize={tournamentSize}
            onGameStart={handleOnlineGameStart}
            onBack={() => setView('modeSelect')}
          />
        )}

        {view === 'challenge' && (
          <ChallengeModeScreen playerName={profile.username || 'プレイヤー'} onStart={handleChallengeStart} onBack={() => setView('modeSelect')} />
        )}

        {view === 'tournament' && (
          <TournamentModeScreen
            onOpenRoom={(count) => { setTournamentSize(count); setView('onlineRoom') }}
            onPortalInvite={(count) => { setTournamentSize(count); setView('portal') }}
            onBack={() => setView('modeSelect')}
          />
        )}

        {view === 'friends' && (
          <FriendsScreen
            onBack={() => setView('start')}
            onFriendMatch={() => setView('onlineRoom')}
          />
        )}

        {view === 'onlineRoom' && (
          <OnlineRoomScreen
            playerName={playerName}
            playerAvatar={profile.avatarDataUrl ?? null}
            onGameStart={handleOnlineGameStart}
            onBack={() => setView('modeSelect')}
          />
        )}

        {view === 'xRecruitRoom' && (
          <XRecruitScreen
            playerName={playerName}
            playerAvatar={profile.avatarDataUrl ?? null}
            initialRoomId={initialRoomId}
            onGameStart={handleOnlineGameStart}
            onBack={() => initialRoomId ? setView('start') : setView('modeSelect')}
          />
        )}

        {view === 'passScreen' && gameState && (
          <PlayerPassScreen
            player={gameState.players[nextPlayerIndex]}
            onReady={handleReady}
          />
        )}

        {view === 'playing' && gameState && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, minHeight: 0 }}>
              <PlayerHandScreen
                state={gameState}
                onPlay={handlePlay}
                onPass={handlePass}
                gameMode={gameMode}
                myPlayerIndex={myPlayerIndex}
                selectedStampIds={playerStamps}
                onSendStamp={handleSendStamp}
                incomingStamp={incomingStamp}
                onBackToTitle={handleBackToTitle}
                onTurnDeadlineExpired={handleTurnDeadlineExpired}
              />
            </div>
            <div style={{ padding: '0 10px 6px', flexShrink: 0 }}>
              <GameLog logs={gameState.log} />
            </div>
          </div>
        )}

        {view === 'sevenPass' && gameState && gameState.currentPlayerIndex === myPlayerIndex && (
          <SevenPassScreen state={gameState} onDone={handleSevenPassDone} />
        )}

        {view === 'tenDiscard' && gameState && gameState.currentPlayerIndex === myPlayerIndex && (
          <TenDiscardScreen state={gameState} onDone={handleTenDiscardDone} />
        )}

        {view === 'result' && gameState && (
          <ResultScreen
            players={gameState.players}
            onRestart={handleBackToTitle}
            onPlayAgain={gameMode === 'cpu' ? handlePlayAgain : undefined}
            onAddFriend={(name, avatarDataUrl) => addFriend(name, avatarDataUrl)}
            playerAvatars={gameMode === 'friend' && onlinePlayerAvatars.length > 0
              ? onlinePlayerAvatars
              : gameState.players.map((_, i) =>
                  i === myPlayerIndex ? (profile.avatarDataUrl ?? null) : null
                )
            }
            myPlayerIndex={myPlayerIndex}
            challengeResult={gameState.challengeResult}
            challengeResultReason={gameState.challengeResultReason}
          />
        )}
        </>)}
      </div>

      {adSize && <AdMaxSlot size={adSize} variant={adVariant} />}

      {showEffect && gameState?.specialEffect && (
        <SpecialEffect
          key={effectKey}
          effect={gameState.specialEffect}
          onDone={handleEffectDone}
        />
      )}

      {kuronuriPreview && (
        <KuronuriEffect
          activatorName={kuronuriPreview.activatorName}
          victims={kuronuriPreview.victims}
          onDone={handleKuronuriDone}
        />
      )}

      <BugReportButton
        playerName={profile.username || 'プレイヤー'}
        portalLinked={profile.portalLinked === true}
        challengeActive={Boolean(challengeSessionId)}
        challengeSessionId={challengeSessionId}
        turnStallDetected={turnStallDetected}
      />
    </div>
  )
}

export default function App() {
  return (
    <AudioProvider>
      <AppInner />
    </AudioProvider>
  )
}
