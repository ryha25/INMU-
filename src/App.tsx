import React, { useState, useRef, useEffect, useCallback } from 'react'
import { GameState, RulesConfig, DEFAULT_RULES } from './types/game'
import { initGame, playCards, pass, resolveKuronuri, previewKuronuri } from './logic/gameEngine'
import { checkKuronuri } from './logic/cards'
import { cpuChoosePlay } from './logic/cpuAI'
import { AudioProvider, useAudio } from './contexts/AudioContext'
import { PlayerVoiceSettings } from './components/SettingsScreen'
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
import ModeSelectScreen, { GameMode } from './components/ModeSelectScreen'
import SettingsScreen from './components/SettingsScreen'
import OnlineRoomScreen from './components/OnlineRoomScreen'

type AppView =
  | 'start'
  | 'modeSelect'
  | 'rules'
  | 'settings'
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
  const [gameMode, setGameMode] = useState<GameMode>('local')
  const [myPlayerIndex, setMyPlayerIndex] = useState(0)
  const [playerVoices, setPlayerVoices] = useState<PlayerVoiceSettings>({ 0: 'default', 1: 'default', 2: 'default', 3: 'default' })
  const [incomingStamp, setIncomingStamp] = useState<IncomingStamp | null>(null)
  const [pendingOnlineMode, setPendingOnlineMode] = useState<'friend' | 'online'>('friend')
  const [playerName] = useState('プレイヤー1')
  // 黒塗りの高級車
  const [kuronuriPreview, setKuronuriPreview] = useState<ReturnType<typeof previewKuronuri> | null>(null)
  const kuronuriCheckedRef = useRef<string>('')

  const appRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const cpuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { playBGM, stopBGM, currentBGMTrack } = useAudio()

  // CPU auto-play logic
  useEffect(() => {
    if (gameMode !== 'cpu') return
    if (!gameState || view !== 'playing') return
    if (gameState.phase !== 'play') return
    if (gameState.currentPlayerIndex === myPlayerIndex) return
    if (gameState.finishedPlayers.includes(gameState.currentPlayerIndex)) return

    cpuTimerRef.current = setTimeout(() => {
      if (!gameState) return
      const cards = cpuChoosePlay(gameState)
      if (cards === null || gameState.fieldCount === 0 && cards === null) {
        if (gameState.fieldCount > 0) {
          const newState = pass(gameState)
          handleCPUAction(newState, 'pass')
        }
        return
      }
      if (cards !== null) {
        const newState = playCards(gameState, cards)
        handleCPUAction(newState, 'play')
      } else if (gameState.fieldCount > 0) {
        const newState = pass(gameState)
        handleCPUAction(newState, 'pass')
      }
    }, 700)

    return () => {
      if (cpuTimerRef.current) clearTimeout(cpuTimerRef.current)
    }
  }, [gameState?.currentPlayerIndex, gameMode, view, gameState?.phase])

  // In CPU mode, skip pass screen for CPU players
  useEffect(() => {
    if (gameMode !== 'cpu') return
    if (view !== 'passScreen') return
    if (nextPlayerIndex !== myPlayerIndex) {
      // CPU's turn: skip to playing
      setView('playing')
    }
  }, [view, nextPlayerIndex, gameMode, myPlayerIndex])

  // 黒塗りの高級車: ターン開始時に条件チェック
  useEffect(() => {
    if (!gameState || view !== 'playing') return
    if (gameState.phase !== 'play') return
    if (kuronuriPreview !== null) return // already showing

    const player = gameState.players[gameState.currentPlayerIndex]
    // Unique key: playerIndex + hand size (prevents re-trigger after resolve)
    const key = `${gameState.currentPlayerIndex}-${player.hand.length}`
    if (kuronuriCheckedRef.current === key) return
    kuronuriCheckedRef.current = key

    if (checkKuronuri(player.hand)) {
      const preview = previewKuronuri(gameState)
      setKuronuriPreview(preview)
    }
  }, [gameState?.currentPlayerIndex, gameState?.phase, view, kuronuriPreview])

  // WebSocket message handler for online
  function setupWSHandlers(ws: WebSocket) {
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.type === 'game_state_sync') {
          // Deserialize passedPlayers (Set gets serialized as object)
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
    }
  }

  function serializeState(state: GameState): any {
    return {
      ...state,
      passedPlayers: [...state.passedPlayers],
    }
  }

  function handleCPUAction(newState: GameState, type: 'play' | 'pass') {
    if (newState.specialEffect === 'IKISUGI' && appRef.current) {
      appRef.current.classList.add('shake')
      setTimeout(() => appRef.current?.classList.remove('shake'), 600)
    }
    if (newState.specialEffect) setShowEffect(true)
    setGameState(newState)

    if (newState.phase === 'result') {
      const dur = newState.specialEffect === 'IIYO' ? 3200 : newState.specialEffect ? 2000 : 0
      if (dur) setTimeout(() => setView('result'), dur)
      else setView('result')
      return
    }
    if (newState.phase === 'sevenPass') {
      const dur = newState.specialEffect ? 1100 : 0
      if (dur) setTimeout(() => setView('sevenPass'), dur)
      else setView('sevenPass')
      return
    }
    if (newState.phase === 'tenDiscard') {
      const dur = newState.specialEffect ? 1100 : 0
      if (dur) setTimeout(() => setView('tenDiscard'), dur)
      else setView('tenDiscard')
      return
    }
    // After CPU action: if next player is human, show pass screen; else CPU continues (handled by useEffect)
    if (!newState.specialEffect) {
      if (newState.currentPlayerIndex === myPlayerIndex) {
        setTimeout(() => {
          setNextPlayerIndex(myPlayerIndex)
          setView('passScreen')
        }, 350)
      }
      // else: useEffect will trigger next CPU
    }
  }

  function startGame(r?: RulesConfig, mode: GameMode = 'local') {
    const activeRules = r ?? rules
    let playerNames: string[] | undefined
    if (mode === 'cpu') {
      playerNames = ['あなた', 'CPU 1', 'CPU 2', 'CPU 3']
    }
    const state = initGame(activeRules, playerNames)
    setGameState(state)
    setGameMode(mode)
    setMyPlayerIndex(0)
    setNextPlayerIndex(state.currentPlayerIndex)
    // Start game BGM
    if (currentBGMTrack !== 'game') playBGM('game')
    setView('passScreen')
  }

  function handleModeSelect(mode: GameMode) {
    if (mode === 'friend' || mode === 'online') {
      setPendingOnlineMode(mode)
      setView('onlineRoom')
    } else if (mode === 'cpu') {
      startGame(rules, 'cpu')
    } else {
      startGame(rules, 'local')
    }
  }

  function handleOnlineGameStart(ws: WebSocket, playerIndex: number, initialState: any, playerNames: string[]) {
    wsRef.current = ws
    setupWSHandlers(ws)
    const state = deserializeState(initialState)
    setGameState(state)
    setGameMode(pendingOnlineMode === 'friend' ? 'friend' : 'online')
    setMyPlayerIndex(playerIndex)
    setNextPlayerIndex(state.currentPlayerIndex)
    if (currentBGMTrack !== 'game') playBGM('game')
    setView('playing')
  }

  function handleRulesStart(r: RulesConfig) {
    setRules(r)
    startGame(r, 'local')
  }

  function handleReady() {
    setView('playing')
  }

  function handlePlay(newState: GameState) {
    if (newState.specialEffect === 'IKISUGI' && appRef.current) {
      appRef.current.classList.add('shake')
      setTimeout(() => appRef.current?.classList.remove('shake'), 600)
    }
    if (newState.specialEffect) setShowEffect(true)
    setGameState(newState)

    // Online: broadcast new state
    if ((gameMode === 'friend' || gameMode === 'online') && wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify({ type: 'game_action', newState: serializeState(newState) }))
    }

    if (newState.phase === 'result') {
      const dur = newState.specialEffect === 'IIYO' ? 3200 : newState.specialEffect ? 2000 : 0
      if (dur) setTimeout(() => setView('result'), dur)
      else setView('result')
      return
    }
    if (newState.phase === 'sevenPass') {
      const dur = newState.specialEffect ? 1100 : 0
      if (dur) setTimeout(() => setView('sevenPass'), dur)
      else setView('sevenPass')
      return
    }
    if (newState.phase === 'tenDiscard') {
      const dur = newState.specialEffect ? 1100 : 0
      if (dur) setTimeout(() => setView('tenDiscard'), dur)
      else setView('tenDiscard')
      return
    }

    // Local/CPU mode: show pass screen for next player
    if (!newState.specialEffect && (gameMode === 'local' || gameMode === 'cpu')) {
      if (newState.currentPlayerIndex !== (gameState?.currentPlayerIndex ?? -1)) {
        setTimeout(() => {
          setNextPlayerIndex(newState.currentPlayerIndex)
          setView('passScreen')
        }, 350)
      }
    }
  }

  function handlePass(newState: GameState) {
    setGameState(newState)

    // Online: broadcast
    if ((gameMode === 'friend' || gameMode === 'online') && wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify({ type: 'game_action', newState: serializeState(newState) }))
    }

    if (newState.phase === 'result') { setView('result'); return }

    if (gameMode === 'local' || gameMode === 'cpu') {
      setTimeout(() => {
        setNextPlayerIndex(newState.currentPlayerIndex)
        setView('passScreen')
      }, 300)
    }
  }

  function handleEffectDone() {
    setShowEffect(false)
    if (!gameState) return
    if (gameState.phase === 'result') { setView('result'); return }
    if (gameState.phase === 'sevenPass') { setView('sevenPass'); return }
    if (gameState.phase === 'tenDiscard') { setView('tenDiscard'); return }

    if (gameMode === 'local' || gameMode === 'cpu') {
      if (gameState.currentPlayerIndex !== nextPlayerIndex) {
        setNextPlayerIndex(gameState.currentPlayerIndex)
        setView('passScreen')
      }
    }
  }

  function handleSevenPassDone(newState: GameState) {
    setGameState(newState)
    if ((gameMode === 'friend' || gameMode === 'online') && wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify({ type: 'game_action', newState: serializeState(newState) }))
    }
    if (newState.phase === 'result') { setView('result'); return }
    setTimeout(() => {
      setNextPlayerIndex(newState.currentPlayerIndex)
      setView('passScreen')
    }, 300)
  }

  function handleTenDiscardDone(newState: GameState) {
    setGameState(newState)
    if ((gameMode === 'friend' || gameMode === 'online') && wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify({ type: 'game_action', newState: serializeState(newState) }))
    }
    if (newState.phase === 'result') { setView('result'); return }
    setTimeout(() => {
      setNextPlayerIndex(newState.currentPlayerIndex)
      setView('passScreen')
    }, 300)
  }

  function handleSendStamp(stampId: string) {
    if ((gameMode === 'friend' || gameMode === 'online') && wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify({ type: 'stamp', stampId }))
    }
  }

  function handleKuronuriDone() {
    if (!gameState) { setKuronuriPreview(null); return }
    const newState = resolveKuronuri(gameState)
    setGameState(newState)
    // Online: broadcast resolved state
    if ((gameMode === 'friend' || gameMode === 'online') && wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify({ type: 'game_action', newState: serializeState(newState) }))
    }
    setKuronuriPreview(null)
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

  const isOnlineMode = gameMode === 'friend' || gameMode === 'online'

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
            playerVoices={playerVoices}
            onSave={(s) => { setPlayerVoices(s); setView('start') }}
            onBack={() => setView('start')}
          />
        )}

        {view === 'onlineRoom' && (
          <OnlineRoomScreen
            mode={pendingOnlineMode}
            playerName={playerName}
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
                onSendStamp={handleSendStamp}
                incomingStamp={incomingStamp}
              />
            </div>
            <div style={{ padding: '0 10px 6px', flexShrink: 0 }}>
              <GameLog logs={gameState.log} />
            </div>
          </div>
        )}

        {view === 'sevenPass' && gameState && (
          <SevenPassScreen state={gameState} onDone={handleSevenPassDone} />
        )}

        {view === 'tenDiscard' && gameState && (
          <TenDiscardScreen state={gameState} onDone={handleTenDiscardDone} />
        )}

        {view === 'result' && gameState && (
          <ResultScreen
            players={gameState.players}
            onRestart={handleBackToTitle}
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
          left={kuronuriPreview.left}
          right={kuronuriPreview.right}
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
