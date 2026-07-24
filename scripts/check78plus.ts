/**
 * Lv78以降を実ゲームのロジックで検証
 * App.tsxのapplyChallengeScenarioと同じ処理:
 * cpuRevolution → プレイヤーはt枚の最低値カード(革命中最強)を持つ
 */
import { initGame } from '../src/logic/gameEngine.js'
import type { RulesConfig } from '../src/types/game.js'

const rules: RulesConfig = {
  kakumei: true, eightCut: true, elevenBack: true,
  shibari: true, kaidan: true, miyakochi: true,
  nanaWatashi: true, junTen: true, supe3gaeshi: true,
  suitshibari: true, kinshiAgari: false,
  forbidPairs: false, forbidStairs: false,
}

function cardStr(c: any) {
  const S: Record<string, string> = { spades:'♠', hearts:'♥', diamonds:'♦', clubs:'♣' }
  const V: Record<number, string> = { 1:'A',11:'J',12:'Q',13:'K',14:'2' }
  if (c.isJoker || c.rank === 'JOKER') return 'JO'
  return (V[c.value] ?? String(c.value)) + (S[c.suit] ?? c.suit)
}

type Cfg = { t:number; th:number; h:number; rev?:boolean }
// Lv78〜100の設定
const LEVELS: Record<number, Cfg> = {
  78: { t:7, th:1, h:1, rev:true  },  // cpuRevolution
  79: { t:7, th:1, h:1, rev:false },
  80: { t:7, th:2, h:1, rev:false },
  81: { t:9, th:2, h:1, rev:true  },
  82: { t:7, th:1, h:1, rev:false },
  83: { t:9, th:2, h:0, rev:false },
  84: { t:9, th:2, h:1, rev:false },
  85: { t:9, th:1, h:0, rev:false },
  86: { t:7, th:1, h:0, rev:false },
  87: { t:9, th:2, h:1, rev:false },
  88: { t:10,th:3, h:0, rev:false },
  89: { t:9, th:2, h:1, rev:false },
  90: { t:10,th:3, h:1, rev:false },
  91: { t:11,th:2, h:1, rev:false },
  92: { t:11,th:3, h:0, rev:false },
  93: { t:9, th:2, h:1, rev:false },
  94: { t:8, th:2, h:1, rev:false },
  95: { t:10,th:2, h:0, rev:false },
  96: { t:10,th:3, h:1, rev:false },
  97: { t:9, th:2, h:1, rev:false },
  98: { t:8, th:3, h:0, rev:false },
  99: { t:10,th:3, h:1, rev:false },
  100:{ t:10,th:3, h:0, rev:false },
}

function getPlayerHand(level: number, seed: number) {
  const cfg = LEVELS[level]
  if (!cfg) return null
  const state = initGame(rules, ['P','C1','C2','C3'], undefined, seed)
  const players = state.players.map(p => ({ ...p, hand: [...p.hand] }))

  // h:1 → 最強カードを没収
  if (cfg.h > 0) {
    const sorted = [...players[0].hand].sort((a:any,b:any) => b.value - a.value)
    for (let i = 0; i < cfg.h; i++) {
      players[0].hand = players[0].hand.filter((c:any) => c !== sorted[i])
    }
  }

  // プレイヤーをt枚に絞る (rev=trueなら低値優先=革命中最強、falseなら高値優先)
  const sorted = [...players[0].hand].sort((a:any,b:any) =>
    cfg.rev ? a.value - b.value : b.value - a.value
  )
  const hand = sorted.slice(0, cfg.t)

  return hand
}

function hasPairOrJoker(hand: any[]): boolean {
  if (hand.some((c:any) => c.isJoker || c.rank === 'JOKER')) return true
  const vals: Record<number, number> = {}
  hand.forEach((c:any) => { vals[c.value] = (vals[c.value]||0)+1 })
  return Object.values(vals).some(v => v >= 2)
}

const OVERRIDE: Record<number, number> = {
  // 既存のchallengeSeeds.ts から
  79:7922,80:8008,81:8100,82:8209,84:8401,85:8509,86:8605,87:8715,88:8807,
  90:9002,91:9100,92:9220,93:9300,94:9422,95:9500,96:9606,97:9704,98:9805,99:9915,100:10014,
}

console.log('=== Lv78〜100 実ゲームシード検証 ===\n')
const ng: number[] = []

for (const lvStr of Object.keys(LEVELS)) {
  const lv = Number(lvStr)
  const seed = OVERRIDE[lv] ?? lv
  const hand = getPlayerHand(lv, seed)
  if (!hand) continue
  const handStr = hand.sort((a:any,b:any)=>a.value-b.value).map(cardStr).join(' ')
  const ok = hasPairOrJoker(hand)
  console.log(`Lv${lv} (seed=${seed}): [${handStr}] ${ok ? '✅' : '❌ バラ手'}`)
  if (!ok) ng.push(lv)
}

if (ng.length > 0) {
  console.log('\n=== ❌ 修正が必要なレベル ===')
  for (const lv of ng) {
    const cfg = LEVELS[lv]!
    // 代替シードを探す
    for (let s = lv*100; s < lv*100+200; s++) {
      const h = getPlayerHand(lv, s)
      if (h && hasPairOrJoker(h)) {
        console.log(`  Lv${lv} → seed=${s} で勝てる手 [${h.sort((a:any,b:any)=>a.value-b.value).map(cardStr).join(' ')}]`)
        break
      }
    }
  }
}
