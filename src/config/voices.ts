export interface VoicePack {
  id: string
  name: string
}

export const VOICE_PACKS: VoicePack[] = [
  { id: 'default', name: 'デフォルト' },
  { id: 'inmu', name: 'INMU' },
]

// Effect voice map: effectId → audio path (null = no voice yet)
export const EFFECT_VOICES: Record<string, string | null> = {
  IKISUGI: null,
  YARIMAS: null,
  IIYO:    null,
  KAKUMEI: null,
  '2431':  null,
}

export interface Stamp {
  id: string
  text: string
  emoji: string
  voice: string | null
}

export const STAMPS: Stamp[] = [
  { id: 'ikisugi',  text: 'イキスギィ!!',    emoji: '⚡', voice: null },
  { id: 'yarimas',  text: 'やりますねぇ〜',  emoji: '🎯', voice: null },
  { id: 'iiyo',     text: 'いいよ！来いよ', emoji: '🔥', voice: null },
  { id: 'pass',     text: 'パスします〜',    emoji: '🙈', voice: null },
  { id: 'nice',     text: 'ナイス！',        emoji: '👍', voice: null },
  { id: 'lol',      text: 'ｗｗｗ',         emoji: '😂', voice: null },
  { id: 'yabai',    text: 'やばい...',       emoji: '😱', voice: null },
  { id: 'sugoi',    text: 'すごい！！',      emoji: '✨', voice: null },
]
