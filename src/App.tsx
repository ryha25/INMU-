import React, { useState, useRef, useEffect } from 'react'
import { GameState, RulesConfig, DEFAULT_RULES, PlayerRank } from './types/game'
import { initGame, playCards, pass, resolveKuronuri, previewKuronuri, resolveSevenPass, resolveTenDiscard } from './logic/gameEngine'
import { checkKuronuri } from './logic/cards'
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
import InmuPortalSearch from './components/InmuPortalSearch'
import FriendsScreen from './components/FriendsScreen'
import { useFriends } from './hooks/useFriends'

type AppView =
  | 'start'
  | 'modeSelect'
  | 'rules'
  | 'settings'
  | 'portal'
  | 'friends'
  | 'onlineRoom'
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

function AppInner() {
  const [view, setView] = useState<AppView>('start')
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [rules, setRules] = useState<RulesConfig>({ ...DEFAULT_RULES })
  const [showEffect, setShowEffect] = useState(false)
  const [nextPlayerIndex, setNextPlayerIndex] = useState<number>(0)
  const [gameMode, setGameMode] = useState<GameMode>('cpu')
  const [myPlayerIndex, setMyPlayerIndex] = useState(0)
  const [playerStamps, setPlayerStamps] = useState<string[]>([...DEFAULT_STAMP_IDS])
  const [incomingStamp, setIncomingStamp] = useState<IncomingStamp | null>(null)
  const [playerName] = useState('プレイヤー1')
  const [kuronuriPreview, setKuronuriPreview] = useState<ReturnType<typeof previewKuronuri> | null>(null)
  const kuronuriCheckedRef = useRef<string>('')
  const [gameKey, setGameKey] = useState(0)
  const { addFriend } = useFriends()
  const { profile } = useProfile()

  const appRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const cpuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const phaseViewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const gameStateRef = useRef<GameState | null>(null)
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
    if (showEffect) return  // エフェクト表示中はスキップ（エフェクト終了後に再発火）
    if (kuronuriPreview !== null) return  // 黒塗り演出中はスキップ（onDoneで再発火）

    cpuTimerRef.current = setTimeout(() => {
      const gs = gameStateRef.current
      if (!gs) return
      const cards = cpuChoosePlay(gs)
      if (cards !== null) {
        handleCPUAction(playCards(gs, cards), 'play')
      } else if (gs.fieldCount > 0) {
        handleCPUAction(pass(gs), 'pass')
      }
    }, 700)

    return () => { if (cpuTimerRef.current) clearTimeout(cpuTimerRef.current) }
  }, [gameState?.currentPlayerIndex, gameMode, view, gameState?.phase, gameState?.fieldCount, showEffect, gameKey, kuronuriPreview])

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

  // ─── 黒塗りの高級車: 手札変化時に即チェック（1ゲーム1回） ─────────────────
  useEffect(() => {
    if (!gameState) return
    if (view !== 'playing' && view !== 'passScreen') return
    if (gameState.phase !== 'play') return
    if (kuronuriPreview !== null) return
    if (gameState.kuronuriUsed) return

    // 人間プレイヤーの手札をチェック（ターン問わず手札変化の瞬間に発火）
    const player = gameState.players[myPlayerIndex]
    if (!player || player.hand.length === 0) return

    // 手札の内容でユニークキーを生成（順序不問）
    const handKey = player.hand.map(c => c.id).sort().join(',')
    if (kuronuriCheckedRef.current === handKey) return
    kuronuriCheckedRef.current = handKey

    if (checkKuronuri(player.hand)) {
      const preview = previewKuronuri(gameState, myPlayerIndex)
      setKuronuriPreview(preview)
    }
  }, [gameState?.players[myPlayerIndex]?.hand.length, gameState?.kuronuriUsed, view, kuronuriPreview, myPlayerIndex, gameKey])

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
    if (newState.specialEffect) setShowEffect(true)
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
  function startGame(r?: RulesConfig, mode: GameMode = 'cpu', startingRanks?: (PlayerRank | null)[]) {
    const activeRules = r ?? rules
    const playerNames = mode === 'cpu' ? ['あなた', 'CPU 1', 'CPU 2', 'CPU 3'] : undefined
    const state = initGame(activeRules, playerNames, startingRanks)
    setGameKey(k => k + 1)
    setShowEffect(false)
    setKuronuriPreview(null)
    kuronuriCheckedRef.current = ''
    setGameState(state)
    setGameMode(mode)
    setMyPlayerIndex(0)
    setNextPlayerIndex(state.currentPlayerIndex)
    if (currentBGMTrack !== 'game') playBGM('game')
    if (mode === 'cpu' && state.currentPlayerIndex !== 0) {
      setView('playing')
    } else {
      setView('passScreen')
    }
  }

  function handlePlayAgain(prevRanks: (PlayerRank | null)[]) {
    startGame(rules, gameMode, prevRanks)
  }

  function openXShare() {
    const appUrl = (import.meta as any).env?.VITE_APP_URL || window.location.href
    const text = `INMU大富豪の対戦相手募集中！\n\n#INMU大富豪\n#INMU`
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(appUrl)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  function handleModeSelect(mode: SelectMode) {
    if (mode === 'friend') {
      setView('onlineRoom')
    } else if (mode === 'xshare') {
      openXShare()
    } else if (mode === 'portal') {
      setView('portal')
    } else {
      startGame(rules, 'cpu')
    }
  }

  const [onlinePlayerAvatars, setOnlinePlayerAvatars] = useState<(string | null)[]>([])

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
    if (newState.specialEffect) setShowEffect(true)
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
        // 人間のターンになった時だけpassScreen
        if (newState.currentPlayerIndex === myPlayerIndex) {
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
    setKuronuriPreview(null)

    // kuronuri後のCPUターン: useEffectのdepsが変わらない場合があるため明示的にトリガー
    if (gameMode === 'cpu' && newState.currentPlayerIndex !== myPlayerIndex) {
      setTimeout(() => {
        const latest = gameStateRef.current
        if (!latest) return
        const cards = cpuChoosePlay(latest)
        if (cards !== null) handleCPUAction(playCards(latest, cards), 'play')
        else if (latest.fieldCount > 0) handleCPUAction(pass(latest), 'pass')
      }, 800)
    } else if (gameMode === 'cpu' && newState.currentPlayerIndex === myPlayerIndex) {
      setTimeout(() => { setNextPlayerIndex(myPlayerIndex); setView('passScreen') }, 300)
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
    kuronuriCheckedRef.current = ''
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
      }}
    >
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
          <InmuPortalSearch onBack={() => setView('modeSelect')} />
        )}

        {view === 'friends' && (
          <FriendsScreen
            onBack={() => setView('start')}
            onFriendMatch={() => setView('onlineRoom')}
          />
        )}

        {view === 'onlineRoom' && (
          <OnlineRoomScreen
            mode="friend"
            playerName={playerName}
            playerAvatar={profile.avatarDataUrl ?? null}
            onGameStart={handleOnlineGameStart}
            onBack={() => setView('modeSelect')}
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

      {showEffect && gameState?.specialEffect && (
        <SpecialEffect
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
