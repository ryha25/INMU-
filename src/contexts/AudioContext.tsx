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

// Card game BGM chord progression (Fmaj → Am → Dm → C)
const GAME_BGM_CHORDS: number[][] = [
  [174.61, 220.00, 261.63, 329.63], // Fmaj7
  [220.00, 261.63, 329.63, 392.00], // Am
  [146.83, 174.61, 220.00, 293.66], // Dm7
  [130.81, 164.81, 196.00, 246.94], // Cmaj7
]
const GAME_BGM_INTERVAL_MS = 2400

function playGameBGMChord(ac: AudioContext, masterGain: GainNode, freqs: number[]) {
  const now = ac.currentTime
  freqs.forEach(freq => {
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.connect(g)
    g.connect(masterGain)
    osc.type = 'triangle'
    osc.frequency.value = freq
    g.gain.setValueAtTime(0, now)
    g.gain.linearRampToValueAtTime(0.22, now + 0.18)
    g.gain.setValueAtTime(0.22, now + 1.6)
    g.gain.exponentialRampToValueAtTime(0.001, now + 2.2)
    osc.start(now)
    osc.stop(now + 2.3)
  })
}

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [currentBGMTrack, setCurrentBGMTrack] = useState<'title' | 'game' | null>(null)
  const bgmRef = useRef<HTMLAudioElement | null>(null)
  const effectVoiceRef = useRef<HTMLAudioElement | null>(null)
  const stampVoiceRef = useRef<HTMLAudioElement | null>(null)
  const enabledRef = useRef(false)

  const gameAcRef = useRef<AudioContext | null>(null)
  const gameMasterGainRef = useRef<GainNode | null>(null)
  const gameBGMTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const gameBGMChordRef = useRef(0)

  const enableAudio = useCallback(() => {
    enabledRef.current = true
    setAudioEnabled(true)
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      ctx.resume()
    } catch (_) {}
  }, [])

  const stopGameBGMSynth = useCallback(() => {
    if (gameBGMTimerRef.current) {
      clearInterval(gameBGMTimerRef.current)
      gameBGMTimerRef.current = null
    }
    if (gameAcRef.current) {
      try { gameAcRef.current.close() } catch (_) {}
      gameAcRef.current = null
      gameMasterGainRef.current = null
    }
    gameBGMChordRef.current = 0
  }, [])

  const startGameBGMSynth = useCallback(() => {
    stopGameBGMSynth()
    try {
      const ac = new (window.AudioContext || (window as any).webkitAudioContext)()
      ac.resume()
      const master = ac.createGain()
      master.gain.value = 0.06
      master.connect(ac.destination)
      gameAcRef.current = ac
      gameMasterGainRef.current = master

      playGameBGMChord(ac, master, GAME_BGM_CHORDS[0])
      gameBGMChordRef.current = 1

      gameBGMTimerRef.current = setInterval(() => {
        if (!gameAcRef.current || !gameMasterGainRef.current) return
        const idx = gameBGMChordRef.current % GAME_BGM_CHORDS.length
        playGameBGMChord(gameAcRef.current, gameMasterGainRef.current, GAME_BGM_CHORDS[idx])
        gameBGMChordRef.current++
      }, GAME_BGM_INTERVAL_MS)
    } catch (_) {}
  }, [stopGameBGMSynth])

  const stopBGM = useCallback(() => {
    if (bgmRef.current) {
      bgmRef.current.pause()
      bgmRef.current.currentTime = 0
      bgmRef.current = null
    }
    stopGameBGMSynth()
    setCurrentBGMTrack(null)
  }, [stopGameBGMSynth])

  const playBGM = useCallback((track: 'title' | 'game') => {
    if (!enabledRef.current) return
    if (bgmRef.current) {
      bgmRef.current.pause()
      bgmRef.current = null
    }
    stopGameBGMSynth()

    if (track === 'game') {
      setCurrentBGMTrack('game')
      startGameBGMSynth()
      return
    }
    const src = '/audio/inmu-bgm.mp3'
    const audio = new Audio(src)
    audio.loop = true
    audio.volume = 0.20
    audio.play().catch(() => {})
    bgmRef.current = audio
    setCurrentBGMTrack(track)
  }, [startGameBGMSynth, stopGameBGMSynth])

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
      stopGameBGMSynth()
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
