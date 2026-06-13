import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react'
import { EFFECT_VOICES } from '../config/voices'

interface AudioContextType {
  audioEnabled: boolean
  enableAudio: () => void
  playBGM: (track: 'title' | 'game') => void
  stopBGM: () => void
  playEffectVoice: (effectId: string) => void
  playStampVoice: (voice: string | null) => void
  playCardSound: () => void
  playRuleSound: (rule: 'eight_cut' | 'kakumei' | 'eleven_back' | 'shibari' | 'juten' | 'sevenpass' | 'kaidan' | 'generic') => void
  currentBGMTrack: 'title' | 'game' | null
}

const AudioCtx = createContext<AudioContextType>({
  audioEnabled: false,
  enableAudio: () => {},
  playBGM: () => {},
  stopBGM: () => {},
  playEffectVoice: () => {},
  playStampVoice: () => {},
  playCardSound: () => {},
  playRuleSound: () => {},
  currentBGMTrack: null,
})

function getAudioContext(): AudioContext | null {
  try {
    return new (window.AudioContext || (window as any).webkitAudioContext)()
  } catch (_) { return null }
}

function synthCardSound(ac: AudioContext) {
  const buf = ac.createBuffer(1, ac.sampleRate * 0.08, ac.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    const t = i / ac.sampleRate
    const env = Math.exp(-t * 60)
    data[i] = env * (Math.random() * 2 - 1) * 0.35 + env * Math.sin(2 * Math.PI * 800 * t) * 0.15
  }
  const src = ac.createBufferSource()
  src.buffer = buf
  const gain = ac.createGain()
  gain.gain.setValueAtTime(0.5, ac.currentTime)
  src.connect(gain)
  gain.connect(ac.destination)
  src.start()
}

function synthRuleSound(
  ac: AudioContext,
  rule: 'eight_cut' | 'kakumei' | 'eleven_back' | 'shibari' | 'juten' | 'sevenpass' | 'kaidan' | 'generic'
) {
  const now = ac.currentTime
  const gain = ac.createGain()
  gain.connect(ac.destination)

  function beep(freq: number, start: number, dur: number, vol = 0.25) {
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.connect(g)
    g.connect(gain)
    osc.frequency.value = freq
    osc.type = 'sine'
    g.gain.setValueAtTime(0, now + start)
    g.gain.linearRampToValueAtTime(vol, now + start + 0.01)
    g.gain.exponentialRampToValueAtTime(0.001, now + start + dur)
    osc.start(now + start)
    osc.stop(now + start + dur + 0.05)
  }

  switch (rule) {
    case 'eight_cut':
      beep(880, 0, 0.12, 0.3)
      beep(660, 0.1, 0.15, 0.25)
      break
    case 'kakumei':
      beep(220, 0, 0.08)
      beep(330, 0.08, 0.08)
      beep(440, 0.16, 0.08)
      beep(660, 0.24, 0.25, 0.35)
      break
    case 'eleven_back':
      beep(660, 0, 0.12)
      beep(880, 0.12, 0.18, 0.3)
      break
    case 'shibari':
      beep(500, 0, 0.08)
      beep(500, 0.1, 0.08)
      beep(700, 0.2, 0.2, 0.3)
      break
    case 'juten':
      beep(440, 0, 0.1)
      beep(550, 0.1, 0.15, 0.25)
      break
    case 'sevenpass':
      beep(520, 0, 0.08)
      beep(650, 0.09, 0.18, 0.28)
      break
    case 'kaidan':
      beep(330, 0, 0.07)
      beep(440, 0.08, 0.07)
      beep(550, 0.16, 0.07)
      beep(660, 0.24, 0.18, 0.3)
      break
    default:
      beep(550, 0, 0.15, 0.22)
  }
}

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [currentBGMTrack, setCurrentBGMTrack] = useState<'title' | 'game' | null>(null)
  const bgmRef = useRef<HTMLAudioElement | null>(null)
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

  const playCardSound = useCallback(() => {
    if (!enabledRef.current) return
    const ac = getAudioContext()
    if (!ac) return
    synthCardSound(ac)
  }, [])

  const playRuleSound = useCallback((rule: 'eight_cut' | 'kakumei' | 'eleven_back' | 'shibari' | 'juten' | 'sevenpass' | 'kaidan' | 'generic') => {
    if (!enabledRef.current) return
    const ac = getAudioContext()
    if (!ac) return
    synthRuleSound(ac, rule)
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
      playCardSound,
      playRuleSound,
      currentBGMTrack,
    }}>
      {children}
    </AudioCtx.Provider>
  )
}

export function useAudio() {
  return useContext(AudioCtx)
}
