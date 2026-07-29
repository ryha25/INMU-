/**
 * 全100レベル勝利可否シミュレーター
 * 各レベルを20回試行し、1回でも勝てれば「クリア可能」と判定。
 * reqエフェクト達成不可能になった時点で早期終了。
 */
import { initGame, validatePlay, playCards, pass, resolveSevenPass, resolveTenDiscard } from '../src/logic/gameEngine.js'
import { cpuChoosePlay } from '../src/logic/cpuAI.js'
import { checkKaidan, checkSupe3, createDeck, sortHand } from '../src/logic/cards.js'
import type { GameState, Card, RulesConfig } from '../src/types/game.js'
import {
  rulesForLevel as liveRulesForLevel,
  scenarioForLevel as liveScenarioForLevel,
} from '../src/components/ChallengeModeScreen.js'
import { CHALLENGE_FORCED_HAND, CHALLENGE_SEED_OVERRIDE } from '../src/logic/challengeSeeds.js'

// ─── RulesConfig per level (mirrors rulesForLevel in ChallengeModeScreen) ────
function rulesForLevel(level: number): RulesConfig {
  return {
    kakumei: level >= 3,
    eightCut: level >= 6,
    elevenBack: level >= 8,
    shibari: level >= 11,
    kaidan: level >= 16,
    miyakochi: level >= 41,
    nanaWatashi: level >= 46,
    junTen: level >= 51,
    supe3gaeshi: level >= 56,
    suitshibari: level >= 61,
    kinshiAgari: level >= 71,
    forbidPairs: false,
    forbidStairs: false,
  } as RulesConfig
}

// ─── scenarioForLevel (mirrors ChallengeModeScreen) ──────────────────────────
type Cfg = {
  s: string; t: number; th: number; h: number; r: string
  req?: string; ban?: string; d: string
  fv?: number; fc?: number; fs?: boolean
  pass?: number; turn?: number; np?: boolean; ns?: boolean
}
const LEVELS: Partial<Record<number, Cfg>> = {
  1:  { s:'lastStand',     t:9,  th:1, h:0, r:'富豪',   d:'' },
  2:  { s:'mirrorBattle',  t:10, th:1, h:0, r:'富豪',   d:'' },
  3:  { s:'lastStand',     t:9,  th:1, h:0, r:'富豪',   fv:5,  fc:1,                d:'' },
  4:  { s:'effectRequired',t:9,  th:1, h:0, r:'富豪',   req:'8切り',                d:'' },
  5:  { s:'lastStand',     t:7,  th:1, h:0, r:'大富豪', d:'' },
  6:  { s:'effectRequired',t:10, th:1, h:0, r:'富豪',   req:'階段',                 d:'' },
  7:  { s:'effectRequired',t:10, th:1, h:0, r:'富豪',   req:'革命',                 d:'' },
  8:  { s:'cpuRevolution', t:10, th:1, h:0, r:'富豪',   d:'' },
  9:  { s:'sniperRush',    t:9,  th:1, h:0, r:'富豪',   req:'ジョーカー',           d:'' },
  10: { s:'doubleThreat',  t:10, th:2, h:0, r:'富豪',   d:'' },
  11: { s:'lastStand',     t:10, th:1, h:0, r:'富豪',   np:true,                    d:'' },
  12: { s:'lastStand',     t:10, th:1, h:0, r:'富豪',   ns:true,                    d:'' },
  13: { s:'effectRequired',t:10, th:1, h:0, r:'富豪',   req:'ジョーカー',           d:'' },
  14: { s:'effectForbidden',t:10,th:1, h:0, r:'富豪',   ban:'7渡し',               d:'' },
  15: { s:'effectForbidden',t:10,th:1, h:0, r:'富豪',   ban:'8切り',               d:'' },
  16: { s:'effectForbidden',t:10,th:1, h:0, r:'富豪',   ban:'革命',                d:'' },
  17: { s:'mirrorBattle',  t:10, th:1, h:0, r:'富豪',   pass:5,                     d:'' },
  18: { s:'lockedHand',    t:10, th:1, h:0, r:'富豪',   d:'' },
  19: { s:'lastStand',     t:7,  th:1, h:0, r:'富豪',   d:'' },
  20: { s:'doubleThreat',  t:9,  th:2, h:0, r:'大富豪', np:true,                    d:'' },
  21: { s:'lastStand',     t:9,  th:1, h:0, r:'富豪',   fv:4,  fc:1,                d:'' },
  22: { s:'lastStand',     t:9,  th:1, h:0, r:'富豪',   fv:9,  fc:1,                d:'' },
  23: { s:'curseCombo',    t:9,  th:1, h:0, r:'富豪',   ban:'7渡し',               d:'' },
  24: { s:'cpuRevolution', t:9,  th:1, h:1, r:'富豪',   d:'' },
  25: { s:'lastStand',     t:9,  th:1, h:0, r:'富豪',   d:'' },
  26: { s:'lastStand',     t:7,  th:1, h:0, r:'大富豪', d:'' },
  27: { s:'doubleThreat',  t:9,  th:1, h:0, r:'富豪',   fv:7,  fc:2,                d:'' },
  28: { s:'effectRequired',t:9,  th:1, h:0, r:'富豪',   req:'階段', fv:7, fc:3, fs:true, d:'' },
  29: { s:'lockedHand',    t:9,  th:1, h:0, r:'富豪',   d:'' },
  30: { s:'cpuRevolution', t:9,  th:2, h:0, r:'大富豪', d:'' },
  31: { s:'lastStand',     t:9,  th:1, h:0, r:'富豪',   d:'' },
  32: { s:'lastStand',     t:9,  th:1, h:0, r:'富豪',   d:'' },
  33: { s:'lastStand',     t:7,  th:1, h:0, r:'富豪',   d:'' },
  34: { s:'lastStand',     t:9,  th:1, h:1, r:'富豪',   d:'' },
  35: { s:'lastStand',     t:7,  th:1, h:0, r:'富豪',   d:'' },
  36: { s:'doubleThreat',  t:9,  th:2, h:0, r:'富豪',   d:'' },
  37: { s:'lastStand',     t:7,  th:1, h:0, r:'大富豪', d:'' },
  38: { s:'doubleThreat',  t:7,  th:1, h:0, r:'大富豪', d:'' },
  39: { s:'lastStand',     t:7,  th:1, h:0, r:'大富豪', d:'' },
  40: { s:'doubleSiege',   t:10, th:2, h:0, r:'大富豪', ns:true,                    d:'' },
  41: { s:'effectRequired',t:9,  th:1, h:0, r:'富豪',   req:'8切り',                d:'' },
  42: { s:'effectRequired',t:9,  th:1, h:0, r:'富豪',   req:'革命',                 d:'' },
  43: { s:'effectForbidden',t:9, th:1, h:0, r:'大富豪', ban:'ジョーカー',           d:'' },
  44: { s:'lastStand',     t:9,  th:1, h:0, r:'富豪',   pass:2,                     d:'' },
  45: { s:'lastStand',     t:9,  th:1, h:0, r:'富豪',   turn:20,                    d:'' },
  46: { s:'effectRequired',t:9,  th:1, h:0, r:'富豪',   req:'7渡し',                d:'' },
  47: { s:'effectRequired',t:9,  th:1, h:0, r:'富豪',   req:'縛り',                 d:'' },
  48: { s:'effectRequired',t:9,  th:1, h:0, r:'富豪',   req:'階段',                 d:'' },
  49: { s:'sniperRush',    t:9,  th:1, h:0, r:'大富豪', d:'' },
  50: { s:'effectRequired',t:9,  th:1, h:1, r:'大富豪', req:'革命',                 d:'' },
  51: { s:'cpuRevolution', t:9,  th:1, h:0, r:'富豪',   ns:true,                    d:'' },
  52: { s:'lastStand',     t:7,  th:1, h:0, r:'富豪',   ban:'8切り',               d:'' },
  53: { s:'lastStand',     t:9,  th:1, h:0, r:'富豪',   fv:10, fc:1,                d:'' },
  54: { s:'doubleThreat',  t:9,  th:2, h:0, r:'富豪',   ban:'ジョーカー',           d:'' },
  55: { s:'curseCombo',    t:9,  th:1, h:0, r:'富豪',   ban:'7渡し', turn:20,       d:'' },
  56: { s:'lastStand',     t:9,  th:1, h:1, r:'富豪',   np:true,                    d:'' },
  57: { s:'doubleThreat',  t:9,  th:2, h:0, r:'富豪',   ban:'革命',                d:'' },
  58: { s:'effectForbidden',t:9, th:1, h:0, r:'富豪',   ban:'ジョーカー', fv:8, fc:1, d:'' },
  59: { s:'lastStand',     t:7,  th:1, h:0, r:'大富豪', d:'' },
  60: { s:'cpuRevolution', t:10, th:2, h:0, r:'大富豪', ns:true, turn:40,           d:'' },
  61: { s:'mirrorBattle',  t:10, th:1, h:1, r:'富豪',   turn:25,                      d:'' },
  62: { s:'doubleThreat',  t:9,  th:2, h:1, r:'富豪',                                 d:'' },
  63: { s:'cpuStrong',     t:10, th:1, h:1, r:'富豪',   ban:'7渡し',                 d:'' },
  64: { s:'cpuRevolution', t:9,  th:1, h:1, r:'富豪',   pass:4,                       d:'' },
  65: { s:'doubleThreat',  t:9,  th:2, h:1, r:'大富豪', turn:25,                      d:'' },
  66: { s:'cpuStrong',     t:9,  th:1, h:1, r:'富豪',   ban:'ジョーカー',             d:'' },
  67: { s:'doubleSiege',   t:10, th:2, h:1, r:'大富豪', turn:20,                      d:'' },
  68: { s:'lastStand',     t:9,  th:1, h:1, r:'大富豪', pass:3,  turn:20,             d:'' },
  69: { s:'cpuRevolution', t:9,  th:2, h:1, r:'大富豪', ban:'ジョーカー',             d:'' },
  70: { s:'finalBoss',     t:10, th:3, h:1, r:'大富豪', turn:30,                      d:'' },
  71: { s:'effectRequired',t:7,  th:1, h:1, r:'大富豪', req:'8切り',   turn:20,       d:'' },
  72: { s:'effectRequired',t:7,  th:1, h:1, r:'大富豪', req:'ジョーカー', pass:5,     d:'' },
  73: { s:'effectRequired',t:7,  th:1, h:1, r:'大富豪', req:'革命',                   d:'' },
  74: { s:'lastStand',     t:7,  th:1, h:1, r:'大富豪', pass:4,                       d:'' },
  75: { s:'mirrorBattle',  t:7,  th:1, h:1, r:'大富豪', turn:25,                      d:'' },
  76: { s:'effectRequired',t:7,  th:1, h:1, r:'大富豪', req:'階段',                   d:'' },
  77: { s:'doubleThreat',  t:7,  th:2, h:1, r:'大富豪', ban:'ジョーカー',             d:'' },
  78: { s:'cpuRevolution', t:7,  th:1, h:1, r:'大富豪', pass:4,                       d:'' },
  79: { s:'curseCombo',    t:7,  th:1, h:1, r:'大富豪', suit:'clubs',  pass:3,        d:'' },
  80: { s:'effectRequired',t:7,  th:2, h:1, r:'大富豪', req:'革命',    turn:25,       d:'' },
  81: { s:'cpuRevolution', t:9,  th:2, h:1, r:'大富豪', ban:'ジョーカー',           d:'' },
  82: { s:'lastStand',     t:7,  th:1, h:1, r:'大富豪', ns:true, turn:15,           d:'' },
  83: { s:'doubleThreat',  t:9,  th:2, h:0, r:'大富豪', fv:9, fc:2,                 d:'' },
  84: { s:'curseCombo',    t:9,  th:2, h:1, r:'大富豪', ban:'7渡し', pass:1, turn:20, d:'' },
  85: { s:'effectForbidden',t:9, th:1, h:0, r:'大富豪', ban:'8切り',               d:'' },
  86: { s:'doubleThreat',  t:7,  th:1, h:0, r:'大富豪', turn:20,                    d:'' },
  87: { s:'doubleThreat',  t:9,  th:2, h:1, r:'大富豪', np:true,                    d:'' },
  88: { s:'finalBoss',     t:10, th:3, h:0, r:'大富豪', d:'' },
  89: { s:'doubleThreat',  t:9,  th:2, h:1, r:'大富豪', ns:true,                    d:'' },
  90: { s:'finalBoss',     t:10, th:3, h:1, r:'大富豪', ban:'ジョーカー', turn:35,  d:'' },
  91: { s:'doubleSiege',   t:11, th:2, h:1, r:'大富豪', d:'' },
  92: { s:'finalBoss',     t:11, th:3, h:0, r:'大富豪', d:'' },
  93: { s:'doubleThreat',  t:9,  th:2, h:1, r:'大富豪', ns:true, turn:30,           d:'' },
  94: { s:'bruteForce',    t:8,  th:2, h:1, r:'大富豪', pass:2,                     d:'' },
  95: { s:'doubleSiege',   t:10, th:2, h:0, r:'大富豪', ban:'革命',                d:'' },
  96: { s:'finalBoss',     t:10, th:3, h:1, r:'大富豪', ban:'ジョーカー',           d:'' },
  97: { s:'effectRequired',t:9,  th:2, h:1, r:'大富豪', req:'革命',                 d:'' },
  98: { s:'bruteForce',    t:8,  th:3, h:0, r:'大富豪', d:'' },
  99: { s:'finalBoss',     t:10, th:3, h:1, r:'大富豪', pass:2, turn:30,            d:'' },
  100:{ s:'finalBoss',     t:10, th:3, h:0, r:'大富豪', d:'' },
}

function scenarioForLevel(level: number) {
  const cfg = LEVELS[level] ?? LEVELS[100]!
  return {
    targetHandCount: cfg.t, threatCount: cfg.th, playerHandicap: cfg.h,
    scenarioType: cfg.s, minRank: cfg.r,
    requiredEffect: cfg.req, forbiddenEffect: cfg.ban,
    initialFieldValue: cfg.fv, initialFieldCount: cfg.fc, initialFieldStairs: cfg.fs,
    maxPlayerPasses: cfg.pass ?? null, maxTurns: cfg.turn ?? null,
    forbidPairs: cfg.np ?? false, forbidStairs: cfg.ns ?? false,
    level,
  }
}

// ─── applyChallengeScenario (mirrors App.tsx) ─────────────────────────────────
function applyChallengeScenario(state: GameState, setup: ReturnType<typeof scenarioForLevel>): GameState {
  const players = state.players.map(p => ({ ...p, hand: [...p.hand] }))
  const startsInRevolution = ['cpuRevolution','reverseTrap','finalBoss'].includes(setup.scenarioType)

  // CPU枚数調整
  const targetIdxs = Array.from({ length: setup.threatCount }, (_, i) => i + 1)

  // 没収
  if (setup.playerHandicap > 0) {
    const sorted = [...players[0].hand].sort((a, b) => b.value - a.value)
    const conf = sorted.slice(0, setup.playerHandicap)
    players[0].hand = players[0].hand.filter(c => !conf.some(cc => cc.id === c.id))
    const normalCpu = players.map((_, i) => i).filter(i => i !== 0 && !targetIdxs.includes(i))
    const targets = normalCpu.length > 0 ? normalCpu : [1]
    conf.forEach((c, i) => players[targets[i % targets.length]].hand.push(c))
  }

  // 手札強弱調整
  const tune = (idx: number, strong: boolean) => {
    const tgt = players[idx].hand
    const slots = tgt.map((c, i) => ({ c, i })).sort((a, b) => strong ? a.c.value - b.c.value : b.c.value - a.c.value)
    const outside = players.flatMap((p, pi) => pi === idx ? [] : p.hand.map((c, ci) => ({ c, pi, ci })))
      .sort((a, b) => strong ? b.c.value - a.c.value : a.c.value - b.c.value)
    const swaps = Math.min(Math.ceil(tgt.length / 2), outside.length)
    for (let i = 0; i < swaps; i++) {
      const own = slots[i], other = outside[i]
      if (strong ? other.c.value <= own.c.value : other.c.value >= own.c.value) continue
      players[idx].hand[own.i] = other.c
      players[other.pi].hand[other.ci] = own.c
    }
  }
  if (['weakHand','lockedHand','curseCombo'].includes(setup.scenarioType)) tune(0, false)
  if (['cpuStrong','finalBoss'].includes(setup.scenarioType)) tune(1, true)
  if (setup.scenarioType === 'doubleSiege') { tune(1, true); tune(2, true) }
  if (setup.scenarioType === 'sniperRush') tune(1, true)
  if (setup.scenarioType === 'bruteForce') tune(3, true)

  // effectForbidden: 禁止カードをプレイヤーから除去
  if (setup.scenarioType === 'effectForbidden' && setup.forbiddenEffect) {
    const FR: Record<string, number | string> = { '8切り':8,'7渡し':7,'10捨て':10,'11バック':11,'ジョーカー':'JOKER' }
    const rank = FR[setup.forbiddenEffect]
    if (rank !== undefined) {
      const toRemove = players[0].hand.filter(c => c.rank === rank)
      const pool = players.slice(1).flatMap((p,pi) => p.hand.map((c,ci) => ({c,pi:pi+1,ci})))
        .filter(x => x.c.rank !== rank).sort((a,b) => a.c.value - b.c.value)
      toRemove.forEach((card, i) => {
        if (i >= pool.length) return
        const {c, pi, ci} = pool[i]
        const idx = players[0].hand.findIndex(x => x.id === card.id)
        players[0].hand[idx] = c; players[pi].hand[ci] = card
      })
    }
  }

  // effectRequired: 必要カードを補充
  if (setup.scenarioType === 'effectRequired' && setup.requiredEffect) {
    if (setup.requiredEffect === '革命') {
      // 4枚同ランクを配る（プレイヤーが最も多く持つランクを優先して揃える）
      const all = players.flatMap(p => p.hand)
      const groups = new Map<string, typeof all>()
      all.forEach(c => { if (c.suit!=='joker') { const k=String(c.rank); groups.set(k,[...(groups.get(k)??[]),c]) } })
      const four = [...groups.values()].find(cs => cs.length >= 4)?.slice(0,4)
      if (four) {
        const wantedIds = new Set(four.map(c => c.id))
        const replaceSlots = players[0].hand.map((c,i)=>({c,i})).filter(x=>!wantedIds.has(x.c.id))
        four.filter(c => !players[0].hand.some(h => h.id===c.id)).forEach((card, i) => {
          const ownerPi = players.findIndex(p => p.hand.some(h => h.id===card.id))
          const ownerCi = players[ownerPi]?.hand.findIndex(h => h.id===card.id) ?? -1
          const slot = replaceSlots[i]
          if (ownerPi<0||ownerCi<0||!slot) return
          players[0].hand[slot.i]=card; players[ownerPi].hand[ownerCi]=slot.c
        })
      }
      // フォールバック: まだ4枚組がなければプレイヤーが最多持つランクで再試行
      const has4 = () => {
        const m = new Map<string,number>()
        players[0].hand.forEach(c => { if (c.suit!=='joker') m.set(String(c.rank),(m.get(String(c.rank))??0)+1) })
        return [...m.values()].some(v=>v>=4)
      }
      if (!has4()) {
        const rankGroups = new Map<string, {card:Card;pi:number;ci:number}[]>()
        players.forEach((p,pi) => p.hand.forEach((c,ci) => {
          if (c.suit==='joker') return
          const k=String(c.rank); rankGroups.set(k,[...(rankGroups.get(k)??[]),{card:c,pi,ci}])
        }))
        const playerRankCount = new Map<string,number>()
        players[0].hand.forEach(c => { if (c.suit!=='joker') playerRankCount.set(String(c.rank),(playerRankCount.get(String(c.rank))??0)+1) })
        let bestRank=''; let bestOwned=-1
        rankGroups.forEach((_,k) => { const o=playerRankCount.get(k)??0; if(o>bestOwned){bestOwned=o;bestRank=k} })
        if (bestRank) {
          const needed=(rankGroups.get(bestRank)??[]).filter(x=>!players[0].hand.some(c=>c.id===x.card.id))
          const replaceSlots=players[0].hand.map((c,i)=>({c,i})).filter(x=>String(x.c.rank)!==bestRank)
          needed.forEach(({card,pi,ci},idx) => {
            const slot=replaceSlots[idx]; if(!slot) return
            players[0].hand[slot.i]=card; players[pi].hand[ci]=slot.c
          })
        }
      }
    } else {
      const RR: Record<string, number|string> = {'8切り':8,'7渡し':7,'10捨て':10,'11バック':11,'ジョーカー':'JOKER','縛り':0}
      const targetRank = RR[setup.requiredEffect]
      if (targetRank !== undefined && targetRank !== 0 && !players[0].hand.some(c => c.rank===targetRank)) {
        for (let pi=1; pi<players.length; pi++) {
          const ci = players[pi].hand.findIndex(c => c.rank===targetRank)
          if (ci<0) continue
          const weakest = [...players[0].hand].sort((a,b)=>a.value-b.value)[0]
          if (!weakest) break
          const widx = players[0].hand.findIndex(c=>c.id===weakest.id)
          players[0].hand[widx]=players[pi].hand[ci]; players[pi].hand[ci]=weakest; break
        }
      }
      // 階段 required: 同スート連番3枚が揃うまで最大3回補充
      if (setup.requiredEffect === '階段') {
        const checkRun = () => {
          const bySuit = new Map<string,number[]>()
          players[0].hand.filter(c=>c.suit!=='joker').forEach(c=>bySuit.set(c.suit,[...(bySuit.get(c.suit)??[]),c.value]))
          for (const vals of bySuit.values()) {
            const s=[...new Set(vals)].sort((a,b)=>a-b)
            for (let i=0;i+2<s.length;i++) if(s[i+1]===s[i]+1&&s[i+2]===s[i]+2) return true
          }
          return false
        }
        for (let attempt=0; attempt<3 && !checkRun(); attempt++) {
          const bySuit = new Map<string,{suit:string,vals:number[]}>()
          players[0].hand.filter(c=>c.suit!=='joker').forEach(c=>{
            const e=bySuit.get(c.suit)??{suit:c.suit,vals:[]}; e.vals.push(c.value); bySuit.set(c.suit,e)
          })
          let bestSuit='', bestNeed=-1, bestLen=0
          bySuit.forEach(({suit,vals})=>{
            const s=[...new Set(vals)].sort((a,b)=>a-b)
            let rs=0
            for (let i=1;i<=s.length;i++) {
              if(i===s.length||s[i]!==s[i-1]+1) {
                const len=i-rs
                if(len>=2&&len>bestLen){bestLen=len;bestSuit=suit;bestNeed=s[i-1]+1}
                else if(len>=1&&bestLen<2&&s[rs]+1<=15){bestLen=1;bestSuit=suit;bestNeed=s[rs]+1}
                rs=i
              }
            }
          })
          if (!bestSuit||bestNeed<=0||bestNeed>15) break
          let found=false
          for (let pi=1;pi<players.length;pi++) {
            const ci=players[pi].hand.findIndex(c=>c.suit===bestSuit&&c.value===bestNeed)
            if(ci<0) continue
            const suitVals=bySuit.get(bestSuit)?.vals??[]
            const weakest=[...players[0].hand]
              .filter(c=>!(c.suit===bestSuit&&suitVals.includes(c.value)))
              .sort((a,b)=>a.value-b.value)[0]
              ??[...players[0].hand].sort((a,b)=>a.value-b.value)[0]
            if(!weakest) break
            const widx=players[0].hand.findIndex(c=>c.id===weakest.id)
            players[0].hand[widx]=players[pi].hand[ci]; players[pi].hand[ci]=weakest; found=true; break
          }
          if (!found) break
        }
      }
    }
  }

  // firstPlayer再計算
  // 汎用req補充: effectRequired以外のシナリオでもreqカードを保証
  if (setup.requiredEffect && setup.scenarioType !== 'effectRequired') {
    if (setup.requiredEffect === 'ジョーカー' && !players[0].hand.some(c=>c.suit==='joker')) {
      for (let pi=1; pi<players.length; pi++) {
        const ci=players[pi].hand.findIndex(c=>c.suit==='joker')
        if(ci<0) continue
        const wk=[...players[0].hand].sort((a,b)=>a.value-b.value)[0]
        if(!wk) break
        const wi=players[0].hand.findIndex(c=>c.id===wk.id)
        players[0].hand[wi]=players[pi].hand[ci]; players[pi].hand[ci]=wk; break
      }
    }
  }

  if ([53, 67].includes(setup.level)) {
    const strongest = players.flatMap(player => player.hand).sort((a, b) => b.value - a.value).slice(0, 2)
    const strongestIds = new Set(strongest.map(card => card.id))
    for (const wanted of strongest) {
      if (players[0].hand.some(card => card.id === wanted.id)) continue
      const ownerIndex = players.findIndex(player => player.hand.some(card => card.id === wanted.id))
      const ownerSlot = ownerIndex >= 0 ? players[ownerIndex].hand.findIndex(card => card.id === wanted.id) : -1
      const replacementIndex = players[0].hand
        .map((card, index) => ({ card, index }))
        .filter(({ card }) => !strongestIds.has(card.id))
        .sort((a, b) => a.card.value - b.card.value)[0]?.index
      if (ownerIndex < 0 || ownerSlot < 0 || replacementIndex === undefined) continue
      const replacement = players[0].hand[replacementIndex]
      players[0].hand[replacementIndex] = wanted
      players[ownerIndex].hand[ownerSlot] = replacement
    }
  }

  if (setup.requiredEffect === '階段' || setup.requiredEffect === '縛り') {
    const allCards = players.flatMap(player => player.hand)
    let run: Card[] = []
    for (const suit of ['spades', 'hearts', 'diamonds', 'clubs'] as const) {
      for (let value = 3; value <= 13; value++) {
        const candidate = [value, value + 1, value + 2]
          .map(target => allCards.find(card => card.suit === suit && card.value === target))
          .filter((card): card is Card => Boolean(card))
        if (candidate.length === 3) { run = candidate; break }
      }
      if (run.length === 3) break
    }
    const runIds = new Set(run.map(card => card.id))
    for (const wanted of run) {
      if (players[0].hand.some(card => card.id === wanted.id)) continue
      const ownerIndex = players.findIndex(player => player.hand.some(card => card.id === wanted.id))
      const ownerSlot = ownerIndex >= 0 ? players[ownerIndex].hand.findIndex(card => card.id === wanted.id) : -1
      const replacementIndex = players[0].hand.findIndex(card => !runIds.has(card.id))
      if (ownerIndex < 0 || ownerSlot < 0 || replacementIndex < 0) continue
      const replacement = players[0].hand[replacementIndex]
      players[0].hand[replacementIndex] = wanted
      players[ownerIndex].hand[ownerSlot] = replacement
    }
  }

  const requiredPinnedCards = (() => {
    const hand = players[0].hand
    if (setup.requiredEffect === '革命') {
      const byRank = new Map<string, Card[]>()
      hand.forEach(c => {
        if (c.rank === 'JOKER') return
        const key = String(c.rank)
        byRank.set(key, [...(byRank.get(key) ?? []), c])
      })
      return [...byRank.values()].find(cards => cards.length >= 4)?.slice(0, 4) ?? []
    }
    if (setup.requiredEffect === '階段' || setup.requiredEffect === '縛り') {
      const bySuit = new Map<string, Card[]>()
      hand.filter(c => c.rank !== 'JOKER').forEach(c => {
        bySuit.set(c.suit, [...(bySuit.get(c.suit) ?? []), c])
      })
      for (const cards of bySuit.values()) {
        const sorted = [...cards].sort((a, b) => a.value - b.value)
        for (let i = 0; i + 2 < sorted.length; i++) {
          if (sorted[i + 1].value === sorted[i].value + 1 &&
              sorted[i + 2].value === sorted[i].value + 2) return sorted.slice(i, i + 3)
        }
      }
      if (setup.requiredEffect === '縛り') {
        return [...bySuit.values()].find(cards => cards.length >= 2)?.slice(0, 2) ?? []
      }
    }
    const requiredRank: Partial<Record<string, number | 'JOKER'>> = {
      '8切り': 8, '7渡し': 7, '10捨て': 10, '11バック': 11, 'ジョーカー': 'JOKER',
    }
    const rank = setup.requiredEffect ? requiredRank[setup.requiredEffect] : undefined
    return rank === undefined ? [] : hand.filter(c => c.rank === rank).slice(0, 1)
  })()
  const pinnedIds = new Set(requiredPinnedCards.map(c => c.id))
  const hardScenarioAdvantage = ['doubleSiege','finalBoss','bruteForce'].includes(setup.scenarioType) ? 1 : 0
  const fieldAdvantage = setup.initialFieldValue != null ? 1 : 0
  const fixedScenarioAdvantage = [53, 67, 91, 92].includes(setup.level) ? 1 : 0
  const rankAdvantage =
    hardScenarioAdvantage +
    fieldAdvantage +
    fixedScenarioAdvantage
  const playerTargetCount = Math.min(
    players[0].hand.length,
    Math.max(1, requiredPinnedCards.length, setup.targetHandCount - rankAdvantage),
  )
  const keepWeakCards = ['weakHand','lockedHand','curseCombo'].includes(setup.scenarioType)
  const playerCandidates = players[0].hand
    .filter(c => !pinnedIds.has(c.id))
    .sort((a, b) => {
      if (a.rank === 'JOKER' && b.rank !== 'JOKER') return -1
      if (b.rank === 'JOKER' && a.rank !== 'JOKER') return 1
      return startsInRevolution || keepWeakCards ? a.value - b.value : b.value - a.value
    })
  players[0].hand = [
    ...requiredPinnedCards,
    ...playerCandidates.slice(0, playerTargetCount - requiredPinnedCards.length),
  ].sort((a, b) => a.value - b.value || a.suit.localeCompare(b.suit))

  targetIdxs.forEach(i => players[i].hand.splice(setup.targetHandCount))

  const fp = players.findIndex(p => p.hand.some(c => c.suit==='spades'&&c.rank===3))
  const firstPlayer = setup.level === 25 ? (fp >= 0 ? fp : 0) : 0
  const must2431: number[] = []

  // effectRequired のルールを強制有効化（App.tsx と同じ修正）
  const challengeRules = {
    ...state.rules,
    forbidPairs: setup.forbidPairs, forbidStairs: setup.forbidStairs,
    ...(setup.requiredEffect === '8切り'  ? { eightCut: true }    : {}),
    ...(setup.requiredEffect === '階段'   ? { kaidan: true }      : {}),
    ...(setup.requiredEffect === '革命'   ? { kakumei: true }     : {}),
    ...(setup.requiredEffect === '7渡し'  ? { nanaWatashi: true } : {}),
    ...(setup.requiredEffect === '縛り'   ? { shibari: true }     : {}),
    ...(setup.forbiddenEffect === '7渡し' ? { nanaWatashi: false } : {}),
    ...(setup.forbiddenEffect === '革命' ? { kakumei: false } : {}),
  }

  // 初期盤面
  let fieldOverride: Partial<GameState> = {}
  if (setup.initialFieldValue != null) {
    const fv = setup.initialFieldValue, fc = setup.initialFieldCount ?? 1, isStairs = setup.initialFieldStairs ?? false
    let fieldCards: Card[]
    if (isStairs && fc >= 2) {
      fieldCards = Array.from({length:fc},(_,i)=>({id:`fi-${i}`,suit:'spades' as const,rank:(fv-fc+1+i) as any,value:fv-fc+1+i}))
    } else {
      fieldCards = Array.from({length:fc},(_,i)=>({id:`fi-${i}`,suit:'spades' as const,rank:fv as any,value:fv}))
    }
    // 階段初期盤面: 返せる同スート連番を保証
    if (isStairs && fc >= 3) {
      const requiredResponseSuit = setup.requiredEffect === '縛り' ? 'spades' : null
      if (requiredResponseSuit) {
        const desiredRun = Array.from({length:fc},(_,index)=>
          createDeck().find(card=>card.suit===requiredResponseSuit&&card.value===fv+1+index)
        ).filter((card):card is Card=>Boolean(card))
        const desiredIds = new Set(desiredRun.map(card=>card.id))
        for (const wanted of desiredRun) {
          if (players[0].hand.some(card=>card.id===wanted.id)) continue
          for(let playerIndex=1;playerIndex<players.length;playerIndex++) {
            players[playerIndex].hand=players[playerIndex].hand.filter(card=>card.id!==wanted.id)
          }
          const replacementIndex=players[0].hand.map((card,index)=>({card,index}))
            .filter(({card})=>!desiredIds.has(card.id)).sort((a,b)=>a.card.value-b.card.value)[0]?.index
          if(replacementIndex===undefined) continue
          const replacement=players[0].hand[replacementIndex]
          players[0].hand[replacementIndex]=wanted
          players[1].hand.push(replacement)
        }
      }
      const hasBeat = (hand: Card[]) => {
        const bySuit = new Map<string,number[]>()
        hand.filter(c=>c.suit!=='joker'&&(!requiredResponseSuit||c.suit===requiredResponseSuit))
          .forEach(c=>bySuit.set(c.suit,[...(bySuit.get(c.suit)??[]),c.value]))
        for (const vals of bySuit.values()) {
          const s=[...new Set(vals)].sort((a,b)=>a-b)
          for (let i=0;i+fc-1<s.length;i++) {
            let ok=true; for(let k=1;k<fc;k++) if(s[i+k]!==s[i]+k){ok=false;break}
            if(ok&&s[i+fc-1]>fv) return true
          }
        }
        return false
      }
      if (!hasBeat(players[0].hand)) {
        outer: for (let pi=1;pi<players.length;pi++) {
          for (const cpuCard of [...players[pi].hand].sort((a,b)=>a.value-b.value)) {
            if (cpuCard.suit==='joker'||(requiredResponseSuit&&cpuCard.suit!==requiredResponseSuit)) continue
            const wIdx = players[0].hand.findIndex(c=>c.value===Math.min(...players[0].hand.map(x=>x.value)))
            if (wIdx<0) break
            const testHand = [...players[0].hand]; testHand[wIdx]=cpuCard
            if (hasBeat(testHand)) {
              players[pi].hand=players[pi].hand.filter(c=>c.id!==cpuCard.id)
              players[pi].hand.push(players[0].hand[wIdx])
              players[0].hand=testHand; break outer
            }
          }
        }
      }
    } else {
      if (!players[0].hand.some(c=>c.value>fv)) {
        const cand = players.slice(1).flatMap((p,pi)=>p.hand.map((c,ci)=>({c,pi:pi+1,ci})))
          .filter(x=>x.c.value>fv).sort((a,b)=>a.c.value-b.c.value)[0]
        if (cand) {
          const wk=[...players[0].hand].sort((a,b)=>a.value-b.value)[0]
          if (wk) { const wi=players[0].hand.findIndex(c=>c.id===wk.id); players[0].hand[wi]=cand.c; players[cand.pi].hand[cand.ci]=wk }
        }
      }
    }
    fieldOverride = {
      field:[fieldCards],
      fieldCount:fc,
      fieldValue:fv,
      fieldSuit:'spades',
      lastFieldSuit:'spades',
      stairsMode:isStairs,
      lastPlayedBy:3,
    }
  }

  const forcedSpecs = CHALLENGE_FORCED_HAND[setup.level]
  if (forcedSpecs) {
    const forced = forcedSpecs
      .map(spec => createDeck().find(card => card.rank === spec.rank && card.suit === spec.suit))
      .filter((card): card is Card => Boolean(card))
    if (forced.length === forcedSpecs.length) {
      const forcedIds = new Set(forced.map(card => card.id))
      const displaced = players[0].hand.filter(card => !forcedIds.has(card.id))
      for (let index = 1; index < players.length; index++) {
        players[index].hand = players[index].hand.filter(card => !forcedIds.has(card.id))
      }
      players[1].hand.push(...displaced)
      players[0].hand = forced.sort((a, b) => a.value - b.value)
    }
  }

  return {
    ...state, players,
    currentPlayerIndex: firstPlayer, lastPlayedBy: firstPlayer, must2431,
    revolutionActive: startsInRevolution, rules: challengeRules,
    maxPlayerPasses: setup.maxPlayerPasses, maxTurns: setup.maxTurns,
    shibariSuit: setup.initialShibariSuit ?? null,
    ...fieldOverride, log: [],
  } as GameState
}

// ─── 達成記録 ──────────────────────────────────────────────────────────────────
interface AchievementFlags {
  usedKaidan: boolean; usedEightCut: boolean; usedRevolution: boolean
  usedJoker: boolean; usedSevenPass: boolean; usedShibari: boolean
}

// ─── スマートプレイヤー: req条件を達成しようとしつつ勝ちを目指す ───────────────
function playerChoosePlay(
  state: GameState,
  req: string | undefined,
  ach: AchievementFlags,
  strategy: number,
): Card[] | null {
  const hand = state.players[0].hand
  if (hand.length === 0) return null

  // 2431強制
  if (state.must2431.includes(0) && !state.secondRoundOrLater) {
    const needed: (number|string)[] = [2,4,3,1]
    const res: Card[] = []
    for (const r of needed) { const c=hand.find(x=>x.rank===r&&!res.includes(x)); if(c) res.push(c) }
    if (res.length===4) return res
    return null
  }

  // 全合法手を列挙
  const allValid: Card[][] = []
  const fcount = state.fieldCount

  if (fcount > 0) {
    // 場あり: 同枚数の組み合わせ
    for (const combo of combos(hand, fcount)) {
      if (validatePlay(state, combo).valid) allValid.push(combo)
    }
    // stairsMode: 同枚数の階段のみ有効（fcount と一致する k だけ試す）
    if (state.stairsMode && fcount >= 3 && fcount <= hand.length) {
      for (const combo of combos(hand, fcount)) {
        if (validatePlay(state, combo).valid) allValid.push(combo)
      }
    }
  } else {
    // 場なし: ペア/セット
    const byRank = new Map<string, Card[]>()
    hand.forEach(c => { if(c.suit!=='joker'){const k=String(c.rank);byRank.set(k,[...(byRank.get(k)??[]),c])} })
    byRank.forEach(cs => {
      for (let k=Math.min(cs.length,4); k>=1; k--) {
        const combo=cs.slice(0,k)
        if (validatePlay(state, combo).valid) { allValid.push(combo); break }
      }
    })
    // 階段（同スート連番）
    if (state.rules.kaidan) {
      const bySuit = new Map<string,Card[]>()
      hand.filter(c=>c.suit!=='joker').forEach(c=>bySuit.set(c.suit,[...(bySuit.get(c.suit)??[]),c]))
      bySuit.forEach(sc => {
        const s=[...sc].sort((a,b)=>a.value-b.value)
        const uniq=s.filter((c,i)=>i===0||c.value!==s[i-1].value)
        let i=0; while(i<uniq.length) {
          let j=i+1; while(j<uniq.length&&uniq[j].value===uniq[j-1].value+1) j++
          if(j-i>=3) { const st=uniq.slice(i,i+3); if(validatePlay(state,st).valid) allValid.push(st) }
          i=j
        }
      })
    }
    // ジョーカー
    const jk=hand.find(c=>c.suit==='joker')
    if (jk&&validatePlay(state,[jk]).valid) allValid.push([jk])
  }

  if (allValid.length === 0) return null

  // req条件未達成なら優先的に達成しに行く
  if (req && fcount === 0) {
    if (req==='8切り'&&!ach.usedEightCut) {
      const c=allValid.find(cs=>cs.every(x=>x.rank===8))
      if (c) return c
    }
    if (req==='7渡し'&&!ach.usedSevenPass) {
      const c=allValid.find(cs=>cs.every(x=>x.rank===7))
      if (c) return c
    }
    if (req==='革命'&&!ach.usedRevolution) {
      const c=allValid.find(cs=>cs.length>=4&&cs.every(x=>x.rank===cs[0].rank))
      if (c) return c
    }
    if (req==='階段'&&!ach.usedKaidan) {
      const c=allValid.find(cs=>cs.length>=3&&checkKaidan(cs))
      if (c) return c
    }
    if (req==='ジョーカー'&&!ach.usedJoker) {
      const c=allValid.find(cs=>cs.some(x=>x.suit==='joker'))
      if (c) return c
    }
    if (req==='縛り'&&!ach.usedShibari) {
      const c=allValid.find(cs=>cs.length>=2&&cs.every(x=>x.suit===cs[0].suit))
      if (c) return c
    }
  }

  // 革命中は4枚組プレイ（再革命）を回避（req='革命'の場合は除く）
  let candidates = allValid
  if (state.revolutionActive && req !== '革命') {
    const noKakumei = allValid.filter(cs => !(cs.length >= 4 && cs.every(x=>x.rank===cs[0].rank)))
    if (noKakumei.length > 0) candidates = noKakumei
  }

  const value = (cards: Card[]) => Math.max(...cards.map(c => c.value))
  const effectiveStrength = (cards: Card[]) =>
    state.revolutionActive ? -value(cards) : value(cards)
  if (strategy >= 6) {
    const ordered = [...candidates].sort((a, b) =>
      a.map(card => card.id).join('|').localeCompare(b.map(card => card.id).join('|'))
    )
    let hash = (strategy * 2654435761 + (state.turnCount ?? 0) * 2246822519 + hand.length * 3266489917) >>> 0
    for (const card of hand) {
      for (const char of card.id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0
    }
    return ordered[hash % ordered.length]
  }
  candidates.sort((a, b) => {
    if (strategy === 1) return effectiveStrength(b) - effectiveStrength(a)
    if (strategy === 2) return b.length - a.length || effectiveStrength(a) - effectiveStrength(b)
    if (strategy === 3) return a.length - b.length || effectiveStrength(a) - effectiveStrength(b)
    if (strategy === 4) return b.length - a.length || effectiveStrength(b) - effectiveStrength(a)
    if (strategy === 5) return a.length - b.length || effectiveStrength(b) - effectiveStrength(a)
    // 標準: 場を返すときは強札を温存し、先攻時は強く制圧する。
    if (fcount > 0) return effectiveStrength(a) - effectiveStrength(b)
    return effectiveStrength(b) - effectiveStrength(a)
  })
  return candidates[0]
}

function combos<T>(arr: T[], k: number): T[][] {
  if (k===0) return [[]]
  if (k>arr.length) return []
  const [f,...rest]=arr
  return [...combos(rest,k-1).map(c=>[f,...c]),...combos(rest,k)]
}

// ─── 1ゲームシミュレーション ───────────────────────────────────────────────────
export function simulateGame(level: number, seed: number, strategy: number): { win: boolean; impossibleReason: string | null; detail?: string } {
  const setup = { level, ...liveScenarioForLevel(level) }
  const rules = liveRulesForLevel(level)
  let state = initGame(rules, ['Player','CPU1','CPU2','CPU3'], undefined, seed)
  state = applyChallengeScenario(state, setup)

  const req = setup.requiredEffect
  const ach: AchievementFlags = {
    usedKaidan:false, usedEightCut:false, usedRevolution:false,
    usedJoker:false, usedSevenPass:false, usedShibari:false,
  }

  let steps = 0
  const MAX_STEPS = 400

  while (state.phase !== 'result' && steps < MAX_STEPS) {
    steps++

    // ターン・パス制限超過チェック
    if (setup.maxTurns != null && (state.turnCount ?? 0) > setup.maxTurns) break
    if (setup.maxPlayerPasses != null && (state.playerPassCount ?? 0) > setup.maxPlayerPasses) break

    // 特殊フェーズ処理
    if (state.phase === 'sevenPass') {
      const giver = state.players[state.currentPlayerIndex]
      const give = [...giver.hand]
        .sort((a,b) => strategy % 2 === 0 ? a.value - b.value : b.value - a.value)
        .slice(0, state.sevenPassState?.totalToGive ?? 1)
      const targets = [0,1,2,3].filter(i=>!state.finishedPlayers.includes(i)&&i!==state.currentPlayerIndex)
        .sort((a, b) => state.players[b].hand.length - state.players[a].hand.length)
      if (give.length>0&&targets.length>0) state=resolveSevenPass(state,targets[0],give)
      else break
      continue
    }
    if (state.phase === 'tenDiscard') {
      const player = state.players[state.currentPlayerIndex]
      const discard = [...player.hand].sort((a,b)=>a.value-b.value).slice(0, state.tenDiscardState?.totalToDiscard ?? 1)
      if (discard.length>0) state=resolveTenDiscard(state,discard)
      else break
      continue
    }

    const cur = state.currentPlayerIndex

    // 達成フラグ更新（achievementFlagsから読む）
    const flags = (state as any).achievementFlags ?? []
    if (flags.includes('階段')) ach.usedKaidan=true
    if (flags.includes('8切り')) ach.usedEightCut=true
    if (flags.includes('革命')) ach.usedRevolution=true
    if (flags.includes('ジョーカー')) ach.usedJoker=true
    if (flags.includes('7渡し')) ach.usedSevenPass=true
    if (flags.includes('縛り')) ach.usedShibari=true

    // 早期終了: req達成が構造的に不可能かチェック（ゲーム開始時 step=1 のみ）
    if (req && cur === 0 && steps === 1) {
      const hand = state.players[0].hand
      // ルール無効 → 絶対不可能
      if (req==='8切り'  && !state.rules.eightCut)   return {win:false,impossibleReason:`Lv${level}: 8切りルール無効`}
      if (req==='階段'   && !state.rules.kaidan)      return {win:false,impossibleReason:`Lv${level}: 階段ルール無効`}
      if (req==='革命'   && !state.rules.kakumei)     return {win:false,impossibleReason:`Lv${level}: 革命ルール無効`}
      if (req==='7渡し'  && !state.rules.nanaWatashi) return {win:false,impossibleReason:`Lv${level}: 7渡しルール無効`}
      if (req==='縛り'   && !state.rules.shibari)     return {win:false,impossibleReason:`Lv${level}: 縛りルール無効`}
      // 補充失敗（開始時点でカードがない）
      if (req==='ジョーカー' && !hand.some(c=>c.suit==='joker'))
        return {win:false,impossibleReason:`Lv${level}: JK補充失敗`}
      if (req==='革命') {
        const byRank=new Map<string,number>(); hand.forEach(c=>{if(c.suit!=='joker')byRank.set(String(c.rank),(byRank.get(String(c.rank))??0)+1)})
        if (![...byRank.values()].some(v=>v>=4)) return {
          win:false,
          impossibleReason:`Lv${level}: 革命補充失敗 (${hand.map(card => `${card.rank}${card.suit}`).join(',')})`,
        }
      }
      if (req==='階段') {
        const bySuit=new Map<string,number[]>()
        hand.filter(c=>c.suit!=='joker').forEach(c=>bySuit.set(c.suit,[...(bySuit.get(c.suit)??[]),c.value]))
        const hasK=[...bySuit.values()].some(vals=>{
          const s=[...new Set(vals)].sort((a,b)=>a-b)
          for(let i=0;i+2<s.length;i++) if(s[i+1]===s[i]+1&&s[i+2]===s[i]+2) return true; return false
        })
        if (!hasK) return {win:false,impossibleReason:`Lv${level}: 階段補充失敗`}
      }
    }

    let played: Card[] | null
    if (cur === 0) {
      played = playerChoosePlay(state, req, ach, strategy)
    } else {
      played = cpuChoosePlay(state)
    }

    if (played && played.length > 0) {
      const result = validatePlay(state, played)
      if (result.valid) {
        state = playCards(state, played)
      } else {
        state = pass(state)
      }
    } else {
      state = pass(state)
    }
  }

  if (state.phase !== 'result') {
    return {
      win: false,
      impossibleReason: null,
      detail: `未完了 phase=${state.phase} step=${steps} turn=${state.turnCount}`,
    }
  }

  // 勝利判定
  const playerFinish = state.players[0].finishOrder
  const requiredFinish = setup.minRank === '大富豪' ? 1 : 2
  const won = playerFinish != null && playerFinish <= requiredFinish

  // req達成判定
  if (won && req) {
    const flags = (state as any).achievementFlags ?? []
    if (req==='8切り'&&!flags.includes('8切り')) return {win:false,impossibleReason:null}
    if (req==='7渡し'&&!flags.includes('7渡し')) return {win:false,impossibleReason:null}
    if (req==='革命'&&!flags.includes('革命')) return {win:false,impossibleReason:null}
    if (req==='階段'&&!flags.includes('階段')) return {win:false,impossibleReason:null}
    if (req==='ジョーカー'&&!flags.includes('ジョーカー')) return {win:false,impossibleReason:null}
    if (req==='縛り'&&!flags.includes('縛り')) return {win:false,impossibleReason:null}
  }

  return {
    win: won,
    impossibleReason: null,
    detail: `順位=${playerFinish ?? '-'} 必須=${req ?? '-'} 達成=${((state as any).achievementFlags ?? []).join('/') || '-'}`,
  }
}

// ─── メイン: 全レベルを N 回試行 ──────────────────────────────────────────────
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/testAllLevels.ts')) {
const STRATEGIES = 24
const results: { level: number; wins: number; impossible: string | null; detail?: string }[] = []
const requestedLevels = (((globalThis as any).process?.argv ?? []) as string[])
  .slice(2)
  .map(Number)
  .filter(level => Number.isInteger(level) && level >= 1 && level <= 100)
const levelsToTest = requestedLevels.length > 0
  ? requestedLevels
  : Array.from({ length: 100 }, (_, index) => index + 1)

console.log('=== チャレンジ全レベル検証 ===\n')

for (const level of levelsToTest) {
  let wins = 0
  let impossible: string | null = null
  let detail: string | undefined

  for (let strategy = 0; strategy < STRATEGIES; strategy++) {
    const r = simulateGame(level, CHALLENGE_SEED_OVERRIDE[level] ?? level, strategy)
    if (r.impossibleReason) { impossible = r.impossibleReason; break }
    if (r.win) wins++
    else detail ??= r.detail
  }

  const mark = wins > 0 ? '✅' : impossible ? '🚫' : '❌'
  const pct = `${wins}/${impossible ? '中断' : STRATEGIES}`
  console.log(`${mark} Lv${String(level).padStart(3,'0')}: ${pct} ${impossible ?? ''}`)
  results.push({ level, wins, impossible, detail })
}

console.log('\n=== 要修正レベル ===')
const failed = results.filter(r => r.wins === 0)
if (failed.length === 0) {
  console.log('全レベルクリア可能！')
} else {
  failed.forEach(r => console.log(`  Lv${r.level}: ${r.impossible ?? r.detail ?? '勝利なし（難易度が高すぎる可能性）'}`))
}
}
