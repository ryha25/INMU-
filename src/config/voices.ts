export interface VoicePack {
  id: string
  name: string
}

export const VOICE_PACKS: VoicePack[] = [
  { id: 'default', name: 'デフォルト' },
  { id: 'inmu', name: 'INMU' },
]

export const EFFECT_VOICES: Record<string, string | null> = {
  IKISUGI: '/audio/ikisugi-voice.mp3',
  YARIMAS: '/audio/yarimas-voice.mp3',
  IIYO:    '/audio/iiyo-voice.mp3',
  KAKUMEI: '/audio/kakumei-voice.mp3',
  '2431':  '/audio/2431-voice.mp3',
}

export interface Stamp {
  id: string
  text: string
  emoji: string
  voice: string | null
}

export const STAMPS: Stamp[] = [
  { id: 'FOO',     text: 'FOO!氣持ちいい〜',          emoji: '✨', voice: '/audio/stamps/FOO.mp3' },
  { id: 's02',     text: 'ありがとうございます…',      emoji: '🙏', voice: '/audio/stamps/stamp02.mp3' },
  { id: 's03',     text: 'やめてくれよ…(絶望)',        emoji: '😩', voice: '/audio/stamps/stamp03.mp3' },
  { id: 's04',     text: 'いいゾ～これ',               emoji: '👍', voice: '/audio/stamps/stamp04.mp3' },
  { id: 's05',     text: 'おっ、そうだな',             emoji: '🤔', voice: '/audio/stamps/stamp05.mp3' },
  { id: 's06',     text: 'おらっ、見ろよ見ろよ、ほら', emoji: '👁️', voice: '/audio/stamps/stamp06.mp3' },
  { id: 's07',     text: 'そうだよ(弁乗)',             emoji: '💬', voice: '/audio/stamps/stamp07.mp3' },
  { id: 's08',     text: '嬉しいダルルォ？',           emoji: '😏', voice: '/audio/stamps/stamp08.mp3' },
  { id: 's09',     text: '当たり前だよなぁ？',         emoji: '👍', voice: '/audio/stamps/stamp09.mp3' },
  { id: 'ANA',     text: '結のANAなめろよ',            emoji: '💭', voice: '/audio/stamps/ANA.mp3' },
  { id: 's11',     text: '見たけりゃ見せてやるよ(震え声)', emoji: '👀', voice: '/audio/stamps/stamp11.mp3' },
  { id: 's12',     text: 'ﾎﾟｯﾁｬﾏ･･･',               emoji: '💭', voice: '/audio/stamps/stamp12.mp3' },
  { id: 's13',     text: 'あ"あ"っ！',                emoji: '😤', voice: '/audio/stamps/stamp13.mp3' },
  { id: 's14',     text: 'あくしろよ',                 emoji: '⚡', voice: '/audio/stamps/stamp14.mp3' },
  { id: 's15',     text: 'あっつぅー',                 emoji: '🔥', voice: '/audio/stamps/stamp15.mp3' },
  { id: 's16',     text: 'いいすかぁ！？',             emoji: '❓', voice: '/audio/stamps/stamp16.mp3' },
  { id: 's17',     text: 'しょうがねぇなぁ・・・',     emoji: '😒', voice: '/audio/stamps/stamp17.mp3' },
  { id: 's18',     text: 'ほらよく見ろよほら',         emoji: '👁️', voice: '/audio/stamps/stamp18.mp3' },
  { id: 's19',     text: 'オナシャス',                 emoji: '🤲', voice: '/audio/stamps/stamp19.mp3' },
  { id: 's20',     text: 'あーいいっすねー(ウン)',      emoji: '👌', voice: '/audio/stamps/stamp20.mp3' },
  { id: 's21',     text: 'おっ、じゃあしまーす',       emoji: '🤔', voice: '/audio/stamps/stamp21.mp3' },
  { id: 's22',     text: 'なにしてんすか！？',         emoji: '😱', voice: '/audio/stamps/stamp22.mp3' },
  { id: 's23',     text: 'やめてくださいよ本当に！',   emoji: '😩', voice: '/audio/stamps/stamp23.mp3' },
  { id: 's24',     text: '先輩！',                     emoji: '😱', voice: '/audio/stamps/stamp24.mp3' },
  { id: 's25',     text: '入れてくださぁい',           emoji: '🚪', voice: '/audio/stamps/stamp25.mp3' },
  { id: 's26',     text: '早くしろぉ〜',               emoji: '⚡', voice: '/audio/stamps/stamp26.mp3' },
  { id: 'FOO2',    text: 'FOO↑氣持ちいい～',          emoji: '🎉', voice: '/audio/stamps/FOO_1.mp3' },
  { id: 's28',     text: 'おまたせ',                   emoji: '🚪', voice: '/audio/stamps/stamp29.mp3' },
  { id: 's29',     text: 'これもうわかんねぇな',       emoji: '😡', voice: '/audio/stamps/stamp30.mp3' },
  { id: 's30',     text: 'で、出ますよ',               emoji: '🚪', voice: '/audio/stamps/stamp31.mp3' },
  { id: 's31',     text: 'ま、多少はね？',             emoji: '🤷', voice: '/audio/stamps/stamp32.mp3' },
  { id: 's32',     text: 'ん、おかのした',             emoji: '👍', voice: '/audio/stamps/stamp33.mp3' },
  { id: 's33',     text: 'アアアア！',                 emoji: '😤', voice: '/audio/stamps/stamp34.mp3' },
  { id: 's34',     text: 'オオン！',                   emoji: '😤', voice: '/audio/stamps/stamp35.mp3' },
  { id: 's35',     text: 'カンノミホ…',               emoji: '💭', voice: '/audio/stamps/stamp36.mp3' },
  { id: 's36',     text: '入って、どうぞ',             emoji: '🚪', voice: '/audio/stamps/stamp37.mp3' },
  { id: 's37',     text: '出そうと思えば・・・（あっ）', emoji: '🚪', voice: '/audio/stamps/stamp38.mp3' },
  { id: 's38',     text: '学生です',                   emoji: '🎓', voice: '/audio/stamps/stamp39.mp3' },
  { id: 's39',     text: '暴れんなよ…暴れんな…',      emoji: '😤', voice: '/audio/stamps/_.mp3' },
  { id: 's40',     text: '生きスギィ！',               emoji: '⚡', voice: '/audio/stamps/stamp41.mp3' },
  { id: 's41',     text: '良いのかぁ？(さらなる高みへ)', emoji: '✨', voice: '/audio/stamps/stamp42.mp3' },
  { id: 's42',     text: '見とけよ見とけよ～',         emoji: '👁️', voice: '/audio/stamps/stamp43.mp3' },
  { id: 's43',     text: '頭に来ますよぉ！',           emoji: '😡', voice: '/audio/stamps/stamp44.mp3' },
  { id: 's44',     text: 'ｷﾓﾁｨ',                     emoji: '💖', voice: '/audio/stamps/stamp45.mp3' },
  { id: 's45',     text: 'ｷﾓﾁｨ(2)',                  emoji: '💖', voice: '/audio/stamps/stamp28.mp3' },
]
