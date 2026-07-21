import React, { useState, useRef, useEffect } from 'react'
import { GameState, RulesConfig, DEFAULT_RULES, PlayerRank } from './types/game'
import { initGame, playCards, pass, resolveKuronuri, previewKuronuri, resolveSevenPass, resolveTenDiscard, getNextActive } from './logic/gameEngine'
import { checkKuronuri, check2431InHand, findFirstPlayer } from './logic/cards'
import { cpuChoosePlay } from './logic/cpuAI'
import { AudioProvider, useAudio } from './contexts/AudioContext'
import { useProfile } from './hooks/useProfile'
import { DEFAULT_STAMP_IDS } from './components/SettingsScreen'
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
import { useFriends } from './hooks/useFriends'

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
  gameStateRef.current = gameState

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
      } else if (gs.fieldCount > 0) {
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
      } else if (gs.fieldCount > 0) {
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

    // CPU脅威プレイヤーの手札を targetHandCount 枚に減らし、余りを他へ配る
    const targetIndexes = Array.from({ length: setup.threatCount }, (_, index) => index + 1)
    const receivers = players.map((_, index) => index).filter(index => !targetIndexes.includes(index))
    const movedCards = targetIndexes.flatMap(index => players[index].hand.splice(setup.targetHandCount))
    movedCards.forEach((card, index) => players[receivers[index % receivers.length]].hand.push(card))

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

    // ── effectForbidden: 禁止エフェクトのトリガーカードをプレイヤーの手札から排除 ──
    // 誤発動による詰みを防ぐため、対象ランクをすべてCPU手札と交換する
    if (setup.scenarioType === 'effectForbidden' && setup.forbiddenEffect) {
      const FORBIDDEN_RANK: Partial<Record<string, number | 'JOKER'>> = {
        '8切り': 8, '7渡し': 7, '10捨て': 10, '11バック': 11, 'ジョーカー': 'JOKER',
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
        // 4枚同ランクを渡す（既存ヘルパーを流用）
        giveRevolution(0)
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
        // 階段 required: 連続3枚が存在しない場合に不足分を補充
        if (setup.requiredEffect === '階段') {
          const uniqueVals = [...new Set(
            players[0].hand.filter(c => c.suit !== 'joker').map(c => c.value)
          )].sort((a, b) => a - b)
          const hasKaidan = uniqueVals.some((v, i) =>
            uniqueVals[i + 1] === v + 1 && uniqueVals[i + 2] === v + 2
          )
          if (!hasKaidan) {
            // 最長連続列の末端に隣接するカードをCPUから補充
            let bestSeq = [uniqueVals[0] ?? 3]
            let cur = [uniqueVals[0] ?? 3]
            for (let i = 1; i < uniqueVals.length; i++) {
              if (uniqueVals[i] === uniqueVals[i - 1] + 1) cur.push(uniqueVals[i])
              else cur = [uniqueVals[i]]
              if (cur.length > bestSeq.length) bestSeq = [...cur]
            }
            const need = bestSeq[bestSeq.length - 1] + 1 // 末端の次の値
            if (need <= 15) {
              for (let pi = 1; pi < players.length; pi++) {
                const ci = players[pi].hand.findIndex(c => c.value === need && c.suit !== 'joker')
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
        }
      }
    }

    // 手札調整で♠3や2431の所在が変わるため、先攻と強制対象を確定配札から再計算する。
    const firstPlayer = findFirstPlayer(players.map(player => player.hand))
    const must2431 = check2431InHand(players[firstPlayer].hand) ? [firstPlayer] : []
    const startLog = [`🎴 ゲーム開始！ ${players[firstPlayer].name}の番です (♠3持ち)`]
    if (must2431.length > 0) startLog.push(`⚠️ ${players[firstPlayer].name} は 2431 を所持！初手で出してください`)

    const startsInRevolution = setup.scenarioType === 'cpuRevolution' || setup.scenarioType === 'reverseTrap' || setup.scenarioType === 'finalBoss'

    return {
      ...state,
      players,
      currentPlayerIndex: firstPlayer,
      lastPlayedBy: firstPlayer,
      must2431,
      revolutionActive: startsInRevolution,
      log: [`🎯 Lv.${setup.level}: ${setup.description}`, ...(startsInRevolution ? ['💥 革命中でスタート！弱いカードが強い'] : []), ...startLog],
    }
  }

  function startGame(r?: RulesConfig, mode: GameMode = 'cpu', startingRanks?: (PlayerRank | null)[], cpuNames?: string[], challengeSetup?: ChallengeSetup) {
    const activeRules = r ?? rules
    // 前ゲームの残存タイマーをすべてキャンセル
    cancelPhaseViewTimer()
    if (cpuTimerRef.current) { clearTimeout(cpuTimerRef.current); cpuTimerRef.current = null }

    const playerNames = mode === 'cpu' ? [profile.username || 'あなた', ...(cpuNames ?? ['CPU 1', 'CPU 2', 'CPU 3'])] : undefined
    const initialState = initGame(activeRules, playerNames, startingRanks)
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
    setActiveChallenge(setup)
    setRules(setup.rules)
    startGame(setup.rules, 'cpu', undefined, setup.opponents, setup)
  }

  const [onlinePlayerAvatars, setOnlinePlayerAvatars] = useState<(string | null)[]>([])
  const [tournamentSize, setTournamentSize] = useState<number | null>(null)
  const [activeChallenge, setActiveChallenge] = useState<ChallengeSetup | null>(null)

  useEffect(() => {
    if (!activeChallenge || gameState?.phase !== 'result') return
    const rank = gameState.players[myPlayerIndex]?.rank
    const rankPassed = activeChallenge.minRank === '大富豪' ? rank === '大富豪' : (rank === '大富豪' || rank === '富豪')
    const flags = gameState.achievementFlags ?? []
    const effectPassed = !activeChallenge.requiredEffect || flags.includes(activeChallenge.requiredEffect)
    const prohibitionPassed = !activeChallenge.forbiddenEffect || !flags.includes(activeChallenge.forbiddenEffect)
    if (rankPassed && effectPassed && prohibitionPassed) {
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
      if (isDaifugo) report('challenge_win')
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
  function handlePlay(newState: GameState) {
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

  function handlePass(newState: GameState) {
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
    wsRef.current?.close()
    wsRef.current = null
    stopBGM()
    setTimeout(() => playBGM('title'), 100)
    setView('start')
    setGameState(null)
    setKuronuriPreview(null)
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
          />
        )}
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
