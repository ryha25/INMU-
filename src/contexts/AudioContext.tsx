import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react'
import { EFFECT_VOICES } from '../config/voices'

interface AudioContextType {
  audioEnabled: boolean
  enableAudio: () => void
  playBGM: (track: 'title' | 'game') => void
  stopBGM: () => void
  playEffectVoice: (effectId: string) => void
  playStampVoice: (voice: string | null) => void
  currentBGMTrack: 'title' | 'game' | null
}

const AudioCtx = createContext<AudioContextType>({
  audioEnabled: false,
  enableAudio: () => {},
  playBGM: () => {},
  stopBGM: () => {},
  playEffectVoice: () => {},
  playStampVoice: () => {},
  currentBGMTrack: null,
})

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [currentBGMTrack, setCurrentBGMTrack] = useState<'title' | 'game' | null>(null)
  const bgmRef = useRef<HTMLAudioElement | null>(null)
  // 専用ボイス（エフェクト）とスタンプボイスは別チャンネル — 互いに切らない
  const effectVoiceRef = useRef<HTMLAudioElement | null>(null)
  const stampVoiceRef = useRef<HTMLAudioElement | null>(null)
  const enabledRef = useRef(false)

  const enableAudio = useCallback(() => {
    enabledRef.current = true
    setAudioEnabled(true)
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

  // 専用エフェクトボイス — スタンプと独立した専用チャンネル
  const playEffectVoice = useCallback((effectId: string) => {
    if (!enabledRef.current) return
    const src = EFFECT_VOICES[effectId]
    if (!src) return
    if (effectVoiceRef.current) {
      effectVoiceRef.current.pause()
      effectVoiceRef.current = null
    }
    const audio = new Audio(src)
    audio.volume = 1.0
    audio.play().catch(() => {})
    effectVoiceRef.current = audio
  }, [])

  // スタンプボイス — エフェクトボイスと独立した専用チャンネル
  const playStampVoice = useCallback((voice: string | null) => {
    if (!enabledRef.current || !voice) return
    if (stampVoiceRef.current) {
      stampVoiceRef.current.pause()
      stampVoiceRef.current = null
    }
    const audio = new Audio(voice)
    audio.volume = 1.0
    audio.play().catch(() => {})
    stampVoiceRef.current = audio
  }, [])

  useEffect(() => {
    return () => {
      bgmRef.current?.pause()
      effectVoiceRef.current?.pause()
      stampVoiceRef.current?.pause()
    }
  }, [])

  return (
    <AudioCtx.Provider value={{
      audioEnabled,
      enableAudio,
      playBGM,
      stopBGM,
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
