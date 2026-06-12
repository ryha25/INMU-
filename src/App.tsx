import React, { useState, useRef } from 'react'
import { GameState, RulesConfig, DEFAULT_RULES } from './types/game'
import { initGame } from './logic/gameEngine'
import StartScreen from './components/StartScreen'
import RulesScreen from './components/RulesScreen'
import PlayerHandScreen from './components/PlayerHandScreen'
import PlayerPassScreen from './components/PlayerPassScreen'
import ResultScreen from './components/ResultScreen'
import SpecialEffect from './components/SpecialEffect'
import GameLog from './components/GameLog'
import SevenPassScreen from './components/SevenPassScreen'
import TenDiscardScreen from './components/TenDiscardScreen'

type AppView = 'start' | 'rules' | 'passScreen' | 'playing' | 'sevenPass' | 'tenDiscard' | 'result'

export default function App() {
  const [view, setView] = useState<AppView>('start')
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [rules, setRules] = useState<RulesConfig>({ ...DEFAULT_RULES })
  const [showEffect, setShowEffect] = useState(false)
  const [nextPlayerIndex, setNextPlayerIndex] = useState<number>(0)
  const appRef = useRef<HTMLDivElement>(null)

  function startGame(r?: RulesConfig) {
    const activeRules = r ?? rules
    const state = initGame(activeRules)
    setGameState(state)
    setNextPlayerIndex(state.currentPlayerIndex)
    setView('passScreen')
  }

  function handleRulesStart(r: RulesConfig) {
    setRules(r)
    startGame(r)
  }

  function handleReady() {
    setView('playing')
  }

  function transitionAfterPlay(newState: GameState) {
    setGameState(newState)

    if (newState.phase === 'result') {
      if (newState.specialEffect) {
        const dur =
          newState.specialEffect === 'IIYO' ? 3200
          : newState.specialEffect === 'KAKUMEI' ? 2000
          : 1400
        setTimeout(() => setView('result'), dur)
      } else {
        setView('result')
      }
      return
    }

    if (newState.phase === 'sevenPass') {
      if (newState.specialEffect) {
        // brief effect then go to sevenPass
        setTimeout(() => setView('sevenPass'), 1100)
      } else {
        setView('sevenPass')
      }
      return
    }

    if (newState.phase === 'tenDiscard') {
      if (newState.specialEffect) {
        setTimeout(() => setView('tenDiscard'), 1100)
      } else {
        setView('tenDiscard')
      }
      return
    }
  }

  function handlePlay(newState: GameState) {
    // Shake on 1919
    if (newState.specialEffect === 'IKISUGI' && appRef.current) {
      appRef.current.classList.add('shake')
      setTimeout(() => appRef.current?.classList.remove('shake'), 600)
    }

    if (newState.specialEffect) {
      setShowEffect(true)
    }

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

    // Normal play - player changed?
    if (!newState.specialEffect) {
      if (newState.currentPlayerIndex !== (gameState?.currentPlayerIndex ?? -1)) {
        setTimeout(() => {
          setNextPlayerIndex(newState.currentPlayerIndex)
          setView('passScreen')
        }, 350)
      }
    }
    // same player continues (after clearing field with 8切り etc)
  }

  function handlePass(newState: GameState) {
    setGameState(newState)
    if (newState.phase === 'result') { setView('result'); return }
    setTimeout(() => {
      setNextPlayerIndex(newState.currentPlayerIndex)
      setView('passScreen')
    }, 300)
  }

  function handleEffectDone() {
    setShowEffect(false)
    if (!gameState) return

    if (gameState.phase === 'result') { setView('result'); return }
    if (gameState.phase === 'sevenPass') { setView('sevenPass'); return }
    if (gameState.phase === 'tenDiscard') { setView('tenDiscard'); return }

    // Same player continues (field cleared and same player goes again)
    // or transition to next player
    if (gameState.currentPlayerIndex !== nextPlayerIndex) {
      setNextPlayerIndex(gameState.currentPlayerIndex)
      setView('passScreen')
    }
    // else stay in playing
  }

  function handleSevenPassDone(newState: GameState) {
    setGameState(newState)
    if (newState.phase === 'result') { setView('result'); return }
    setTimeout(() => {
      setNextPlayerIndex(newState.currentPlayerIndex)
      setView('passScreen')
    }, 300)
  }

  function handleTenDiscardDone(newState: GameState) {
    setGameState(newState)
    if (newState.phase === 'result') { setView('result'); return }
    setTimeout(() => {
      setNextPlayerIndex(newState.currentPlayerIndex)
      setView('passScreen')
    }, 300)
  }

  const isSpeedBoost = gameState?.speedBoost ?? false

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
            onStart={() => startGame()}
            onRules={() => setView('rules')}
          />
        )}

        {view === 'rules' && (
          <RulesScreen
            onStart={handleRulesStart}
            onBack={() => setView('start')}
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
            onRestart={() => setView('start')}
          />
        )}
      </div>

      {/* Special effect overlay */}
      {showEffect && gameState?.specialEffect && (
        <SpecialEffect
          effect={gameState.specialEffect}
          onDone={handleEffectDone}
        />
      )}
    </div>
  )
}
