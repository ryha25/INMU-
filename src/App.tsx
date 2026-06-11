import React, { useState, useCallback, useRef, useEffect } from 'react'
import { GameState } from './types/game'
import { initGame } from './logic/gameEngine'
import StartScreen from './components/StartScreen'
import PlayerHandScreen from './components/PlayerHandScreen'
import PlayerPassScreen from './components/PlayerPassScreen'
import ResultScreen from './components/ResultScreen'
import SpecialEffect from './components/SpecialEffect'
import GameLog from './components/GameLog'

type AppView = 'start' | 'passScreen' | 'playing' | 'result'

export default function App() {
  const [view, setView] = useState<AppView>('start')
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [showEffect, setShowEffect] = useState(false)
  const [nextPlayerIndex, setNextPlayerIndex] = useState<number>(0)
  const appRef = useRef<HTMLDivElement>(null)

  function startGame() {
    const state = initGame()
    setGameState(state)
    // Show pass screen for first player
    setNextPlayerIndex(state.currentPlayerIndex)
    setView('passScreen')
  }

  function handleReady() {
    setView('playing')
  }

  function handlePlay(newState: GameState) {
    if (newState.specialEffect) {
      setShowEffect(true)
      // Apply shake for 1919
      if (newState.specialEffect === 'IKISUGI' && appRef.current) {
        appRef.current.classList.add('shake')
        setTimeout(() => appRef.current?.classList.remove('shake'), 600)
      }
    }
    setGameState(newState)

    if (newState.phase === 'result') {
      if (newState.specialEffect) {
        setTimeout(() => setView('result'), newState.specialEffect === 'IIYO' ? 3200 : 2500)
      } else {
        setView('result')
      }
      return
    }

    if (!newState.specialEffect) {
      // Check if need pass screen (player changed)
      if (newState.currentPlayerIndex !== (gameState?.currentPlayerIndex ?? -1)) {
        setTimeout(() => {
          setNextPlayerIndex(newState.currentPlayerIndex)
          setView('passScreen')
        }, 400)
      }
    }
  }

  function handlePass(newState: GameState) {
    setGameState(newState)
    if (newState.phase === 'result') {
      setView('result')
      return
    }
    // Show pass screen for next player
    setTimeout(() => {
      setNextPlayerIndex(newState.currentPlayerIndex)
      setView('passScreen')
    }, 300)
  }

  function handleEffectDone() {
    setShowEffect(false)
    if (!gameState) return
    if (gameState.phase === 'result') {
      setView('result')
      return
    }
    // After effect, transition to next player
    if (gameState.currentPlayerIndex !== nextPlayerIndex) {
      setNextPlayerIndex(gameState.currentPlayerIndex)
      setView('passScreen')
    }
    // If same player continues (after clearing field), stay in playing
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
        transition: isSpeedBoost ? 'all 0.1s' : undefined,
      }}
    >
      {/* Main view */}
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {view === 'start' && <StartScreen onStart={startGame} />}

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
            <div style={{ padding: '0 12px 8px', flexShrink: 0 }}>
              <GameLog logs={gameState.log} />
            </div>
          </div>
        )}

        {view === 'result' && gameState && (
          <ResultScreen
            players={gameState.players}
            onRestart={startGame}
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
