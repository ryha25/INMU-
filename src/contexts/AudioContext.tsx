import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react'
import { EFFECT_VOICES } from '../config/voices'

interface AudioContextType {
  audioEnabled: boolean
  enableAudio: () => void
  playBGM: (track: 'title' | 'game') => void
  stopBGM: () => void
  playVoice: (src: string) => void
  playEffectVoice: (effectId: string) => void
  playStampVoice: (voice: string | null) => void
  currentBGMTrack: 'title' | 'game' | null
}

const AudioCtx = createContext<AudioContextType>({
  audioEnabled: false,
  enableAudio: () => {},
  playBGM: () => {},
  stopBGM: () => {},
  playVoice: () => {},
  playEffectVoice: () => {},
  playStampVoice: () => {},
  currentBGMTrack: null,
})

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [currentBGMTrack, setCurrentBGMTrack] = useState<'title' | 'game' | null>(null)
  const bgmRef = useRef<HTMLAudioElement | null>(null)
  const voiceRef = useRef<HTMLAudioElement | null>(null)
  const enabledRef = useRef(false)

  const enableAudio = useCallback(() => {
    enabledRef.current = true
    setAudioEnabled(true)
    // Unlock audio on iOS/mobile by creating a silent AudioContext
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      ctx.resume()
    } catch (_) {}
  }, [])

  const stopBGM = useCallback(() => {
    if (bgmRef.current) {
      bgmRef.current.pause()
      bgmRef.current.currentTime = 0
      bgmRef.current = null
    }
    setCurrentBGMTrack(null)
  }, [])

  const playBGM = useCallback((track: 'title' | 'game') => {
    if (!enabledRef.current) return
    if (bgmRef.current) {
      bgmRef.current.pause()
      bgmRef.current = null
    }
    // ゲーム中はBGMなし
    if (track === 'game') {
      setCurrentBGMTrack('game')
      return
    }
    const src = '/audio/inmu-bgm.mp3'
    const audio = new Audio(src)
    audio.loop = true
    audio.volume = 0.20
    audio.play().catch(() => {})
    bgmRef.current = audio
    setCurrentBGMTrack(track)
  }, [])

  const playVoice = useCallback((src: string) => {
    if (!enabledRef.current) return
    if (voiceRef.current) {
      voiceRef.current.pause()
      voiceRef.current = null
    }
    const audio = new Audio(src)
    audio.volume = 1.0
    audio.play().catch(() => {})
    voiceRef.current = audio
  }, [])

  const playEffectVoice = useCallback((effectId: string) => {
    const src = EFFECT_VOICES[effectId]
    if (src) playVoice(src)
  }, [playVoice])

  const playStampVoice = useCallback((voice: string | null) => {
    if (voice) playVoice(voice)
  }, [playVoice])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      bgmRef.current?.pause()
      voiceRef.current?.pause()
    }
  }, [])

  return (
    <AudioCtx.Provider value={{
      audioEnabled,
      enableAudio,
      playBGM,
      stopBGM,
      playVoice,
      playEffectVoice,
      playStampVoice,
      currentBGMTrack,
    }}>
      {children}
    </AudioCtx.Provider>
  )
}

export function useAudio() {
  return useContext(AudioCtx)
}
