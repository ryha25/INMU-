/**
 * 全100レベル勝利可否シミュレーター
 * 各レベルを20回試行し、1回でも勝てれば「クリア可能」と判定。
 * reqエフェクト達成不可能になった時点で早期終了。
 */
import { initGame, validatePlay, playCards, pass, resolveSevenPass, resolveTenDiscard } from '../src/logic/gameEngine.js'
import { cpuChoosePlay } from '../src/logic/cpuAI.js'
import { checkKaidan, checkSupe3, sortHand } from '../src/logic/cards.js'
import type { GameState, Card, RulesConfig } from '../src/types/game.js'

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
  1:  { s:'lastStand',     t:6,  th:1, h:0, r:'富豪',   d:'' },
  2:  { s:'mirrorBattle',  t:7,  th:1, h:0, r:'富豪',   d:'' },
  3:  { s:'lastStand',     t:6,  th:1, h:0, r:'富豪',   fv:5,  fc:1,                d:'' },
  4:  { s:'effectRequired',t:6,  th:1, h:0, r:'富豪',   req:'8切り',                d:'' },
  5:  { s:'lastStand',     t:4,  th:1, h:0, r:'大富豪', d:'' },
  6:  { s:'effectRequired',t:7,  th:1, h:0, r:'富豪',   req:'階段',                 d:'' },
  7:  { s:'effectRequired',t:7,  th:1, h:0, r:'富豪',   req:'革命',                 d:'' },
  8:  { s:'cpuRevolution', t:7,  th:1, h:0, r:'富豪',   d:'' },
  9:  { s:'sniperRush',    t:5,  th:1, h:0, r:'富豪',   req:'ジョーカー',           d:'' },
  10: { s:'doubleThreat',  t:7,  th:2, h:0, r:'富豪',   d:'' },
  11: { s:'lastStand',     t:7,  th:1, h:0, r:'富豪',   np:true,                    d:'' },
  12: { s:'lastStand',     t:7,  th:1, h:0, r:'富豪',   ns:true,                    d:'' },
  13: { s:'effectRequired',t:7,  th:1, h:0, r:'富豪',   req:'ジョーカー',           d:'' },
  14: { s:'effectForbidden',t:7, th:1, h:0, r:'富豪',   ban:'7渡し',               d:'' },
  15: { s:'effectForbidden',t:7, th:1, h:0, r:'富豪',   ban:'8切り',               d:'' },
  16: { s:'effectForbidden',t:7, th:1, h:0, r:'富豪',   ban:'革命',                d:'' },
  17: { s:'mirrorBattle',  t:7,  th:1, h:0, r:'富豪',   pass:3,                     d:'' },
  18: { s:'lockedHand',    t:7,  th:1, h:0, r:'富豪',   d:'' },
  19: { s:'lastStand',     t:4,  th:1, h:0, r:'富豪',   d:'' },
  20: { s:'doubleThreat',  t:6,  th:2, h:0, r:'大富豪', np:true,                    d:'' },
  21: { s:'lastStand',     t:6,  th:1, h:0, r:'富豪',   fv:4,  fc:1,                d:'' },
  22: { s:'lastStand',     t:6,  th:1, h:0, r:'富豪',   fv:9,  fc:1,                d:'' },
  23: { s:'curseCombo',    t:6,  th:1, h:0, r:'富豪',   ban:'7渡し',               d:'' },
  24: { s:'cpuRevolution', t:6,  th:1, h:1, r:'富豪',   d:'' },
  25: { s:'lastStand',     t:6,  th:1, h:0, r:'富豪',   d:'' },
  26: { s:'lastStand',     t:3,  th:1, h:0, r:'大富豪', d:'' },
  27: { s:'doubleThreat',  t:5,  th:1, h:0, r:'富豪',   fv:7,  fc:2,                d:'' },
  28: { s:'effectRequired',t:6,  th:1, h:0, r:'富豪',   req:'階段', fv:7, fc:3, fs:true, d:'' },
  29: { s:'lockedHand',    t:6,  th:1, h:0, r:'富豪',   d:'' },
  30: { s:'cpuRevolution', t:6,  th:2, h:0, r:'大富豪', d:'' },
  31: { s:'lastStand',     t:5,  th:1, h:0, r:'富豪',   d:'' },
  32: { s:'lastStand',     t:5,  th:1, h:0, r:'富豪',   d:'' },
  33: { s:'lastStand',     t:4,  th:1, h:0, r:'富豪',   d:'' },
  34: { s:'lastStand',     t:5,  th:1, h:1, r:'富豪',   d:'' },
  35: { s:'lastStand',     t:4,  th:1, h:0, r:'富豪',   d:'' },
  36: { s:'doubleThreat',  t:5,  th:2, h:0, r:'富豪',   d:'' },
  37: { s:'lastStand',     t:3,  th:1, h:0, r:'大富豪', d:'' },
  38: { s:'doubleThreat',  t:2,  th:1, h:0, r:'大富豪', d:'' },
  39: { s:'lastStand',     t:3,  th:1, h:0, r:'大富豪', d:'' },
  40: { s:'doubleSiege',   t:5,  th:2, h:0, r:'大富豪', ns:true,                    d:'' },
  41: { s:'effectRequired',t:6,  th:1, h:0, r:'富豪',   req:'8切り',                d:'' },
  42: { s:'effectRequired',t:6,  th:1, h:0, r:'富豪',   req:'革命',                 d:'' },
  43: { s:'effectForbidden',t:6, th:1, h:0, r:'大富豪', ban:'ジョーカー',           d:'' },
  44: { s:'lastStand',     t:5,  th:1, h:0, r:'富豪',   pass:2,                     d:'' },
  45: { s:'lastStand',     t:5,  th:1, h:0, r:'富豪',   turn:15,                    d:'' },
  46: { s:'effectRequired',t:6,  th:1, h:0, r:'富豪',   req:'7渡し',                d:'' },
  47: { s:'effectRequired',t:6,  th:1, h:0, r:'富豪',   req:'縛り',                 d:'' },
  48: { s:'effectRequired',t:6,  th:1, h:0, r:'富豪',   req:'階段',                 d:'' },
  49: { s:'sniperRush',    t:5,  th:1, h:0, r:'大富豪', req:'ジョーカー',           d:'' },
  50: { s:'effectRequired',t:5,  th:1, h:1, r:'大富豪', req:'革命',                 d:'' },
  51: { s:'cpuRevolution', t:6,  th:1, h:0, r:'富豪',   ns:true,                    d:'' },
  52: { s:'lastStand',     t:4,  th:1, h:0, r:'富豪',   ban:'8切り',               d:'' },
  53: { s:'lastStand',     t:5,  th:1, h:0, r:'富豪',   fv:10, fc:1,                d:'' },
  54: { s:'doubleThreat',  t:6,  th:2, h:0, r:'富豪',   ban:'ジョーカー',           d:'' },
  55: { s:'curseCombo',    t:5,  th:1, h:0, r:'富豪',   ban:'7渡し', turn:15,       d:'' },
  56: { s:'lastStand',     t:5,  th:1, h:1, r:'富豪',   np:true,                    d:'' },
  57: { s:'doubleThreat',  t:6,  th:2, h:0, r:'富豪',   ban:'革命',                d:'' },
  58: { s:'effectForbidden',t:5, th:1, h:0, r:'富豪',   ban:'ジョーカー', fv:8, fc:1, d:'' },
  59: { s:'lastStand',     t:3,  th:1, h:0, r:'大富豪', d:'' },
  60: { s:'cpuRevolution', t:5,  th:2, h:0, r:'大富豪', ns:true, turn:30,           d:'' },
  61: { s:'mirrorBattle',  t:7,  th:1, h:0, r:'富豪',   d:'' },
  62: { s:'doubleThreat',  t:6,  th:2, h:0, r:'富豪',   d:'' },
  63: { s:'cpuStrong',     t:6,  th:1, h:0, r:'富豪',   d:'' },
  64: { s:'cpuRevolution', t:6,  th:1, h:0, r:'富豪',   d:'' },
  65: { s:'doubleThreat',  t:5,  th:2, h:0, r:'大富豪', d:'' },
  66: { s:'cpuStrong',     t:6,  th:1, h:0, r:'富豪',   d:'' },
  67: { s:'doubleSiege',   t:6,  th:2, h:0, r:'大富豪', d:'' },
  68: { s:'lastStand',     t:5,  th:1, h:1, r:'大富豪', d:'' },
  69: { s:'cpuRevolution', t:5,  th:2, h:1, r:'大富豪', d:'' },
  70: { s:'finalBoss',     t:6,  th:3, h:0, r:'大富豪', d:'' },
  71: { s:'effectRequired',t:3,  th:1, h:0, r:'大富豪', req:'8切り',                d:'' },
  72: { s:'effectRequired',t:3,  th:1, h:0, r:'大富豪', req:'ジョーカー',           d:'' },
  73: { s:'effectRequired',t:3,  th:1, h:0, r:'大富豪', req:'革命',                 d:'' },
  74: { s:'lastStand',     t:4,  th:1, h:0, r:'大富豪', d:'' },
  75: { s:'mirrorBattle',  t:3,  th:1, h:0, r:'大富豪', d:'' },
  76: { s:'effectRequired',t:4,  th:1, h:0, r:'大富豪', req:'階段',                 d:'' },
  77: { s:'doubleThreat',  t:2,  th:2, h:0, r:'大富豪', d:'' },
  78: { s:'cpuRevolution', t:3,  th:1, h:0, r:'大富豪', d:'' },
  79: { s:'curseCombo',    t:4,  th:1, h:0, r:'大富豪', d:'' },
  80: { s:'effectRequired',t:4,  th:2, h:0, r:'大富豪', req:'革命',                 d:'' },
  81: { s:'cpuRevolution', t:5,  th:2, h:1, r:'大富豪', ban:'ジョーカー',           d:'' },
  82: { s:'lastStand',     t:4,  th:1, h:1, r:'大富豪', ns:true, turn:10,           d:'' },
  83: { s:'doubleThreat',  t:5,  th:2, h:0, r:'大富豪', fv:9, fc:2,                 d:'' },
  84: { s:'curseCombo',    t:5,  th:2, h:1, r:'大富豪', ban:'7渡し', pass:1, turn:12, d:'' },
  85: { s:'effectForbidden',t:5, th:1, h:0, r:'大富豪', ban:'8切り',               d:'' },
  86: { s:'doubleThreat',  t:2,  th:1, h:0, r:'大富豪', turn:20,                    d:'' },
  87: { s:'doubleThreat',  t:5,  th:2, h:1, r:'大富豪', np:true,                    d:'' },
  88: { s:'finalBoss',     t:5,  th:3, h:0, r:'大富豪', d:'' },
  89: { s:'doubleThreat',  t:5,  th:2, h:1, r:'大富豪', ns:true,                    d:'' },
  90: { s:'finalBoss',     t:5,  th:3, h:1, r:'大富豪', ban:'ジョーカー', turn:25,  d:'' },
  91: { s:'doubleSiege',   t:6,  th:2, h:1, r:'大富豪', d:'' },
  92: { s:'finalBoss',     t:5,  th:3, h:0, r:'大富豪', d:'' },
  93: { s:'doubleThreat',  t:5,  th:2, h:1, r:'大富豪', ns:true, turn:20,           d:'' },
  94: { s:'bruteForce',    t:3,  th:2, h:1, r:'大富豪', pass:2,                     d:'' },
  95: { s:'doubleSiege',   t:5,  th:2, h:1, r:'大富豪', ban:'革命',                d:'' },
  96: { s:'finalBoss',     t:5,  th:3, h:1, r:'大富豪', ban:'ジョーカー',           d:'' },
  97: { s:'effectRequired',t:5,  th:2, h:1, r:'大富豪', req:'革命',                 d:'' },
  98: { s:'bruteForce',    t:4,  th:3, h:1, r:'大富豪', d:'' },
  99: { s:'finalBoss',     t:5,  th:3, h:1, r:'大富豪', pass:2, turn:20,            d:'' },
  100:{ s:'finalBoss',     t:6,  th:3, h:0, r:'大富豪', d:'' },
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

  // CPU枚数調整
  const targetIdxs = Array.from({ length: setup.threatCount }, (_, i) => i + 1)
  const receivers = players.map((_, i) => i).filter(i => !targetIdxs.includes(i))
  const moved = targetIdxs.flatMap(i => players[i].hand.splice(setup.targetHandCount))
  moved.forEach((c, i) => players[receivers[i % receivers.length]].hand.push(c))

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

  const fp = players.findIndex(p => p.hand.some(c => c.suit==='spades'&&c.rank===3))
  const firstPlayer = fp >= 0 ? fp : 0
  const must2431 = (players[firstPlayer].hand.some(c=>c.rank===2)&&
    players[firstPlayer].hand.some(c=>c.rank===4)&&
    players[firstPlayer].hand.some(c=>c.rank===3)&&
    players[firstPlayer].hand.some(c=>c.rank===1)) ? [firstPlayer] : []

  const startsInRevolution = ['cpuRevolution','reverseTrap','finalBoss'].includes(setup.scenarioType)
  // effectRequired のルールを強制有効化（App.tsx と同じ修正）
  const challengeRules = {
    ...state.rules,
    forbidPairs: setup.forbidPairs, forbidStairs: setup.forbidStairs,
    ...(setup.requiredEffect === '8切り'  ? { eightCut: true }    : {}),
    ...(setup.requiredEffect === '階段'   ? { kaidan: true }      : {}),
    ...(setup.requiredEffect === '革命'   ? { kakumei: true }     : {}),
    ...(setup.requiredEffect === '7渡し'  ? { nanaWatashi: true } : {}),
    ...(setup.requiredEffect === '縛り'   ? { shibari: true }     : {}),
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
      const hasBeat = (hand: Card[]) => {
        const bySuit = new Map<string,number[]>()
        hand.filter(c=>c.suit!=='joker').forEach(c=>bySuit.set(c.suit,[...(bySuit.get(c.suit)??[]),c.value]))
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
            if (cpuCard.suit==='joker') continue
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
    fieldOverride = { field:[fieldCards], fieldCount:fc, fieldValue:fv, stairsMode:isStairs, lastPlayedBy:3 }
  }

  return {
    ...state, players,
    currentPlayerIndex: firstPlayer, lastPlayedBy: firstPlayer, must2431,
    revolutionActive: startsInRevolution, rules: challengeRules,
    maxPlayerPasses: setup.maxPlayerPasses, maxTurns: setup.maxTurns,
    ...fieldOverride, log: [],
  } as GameState
}

// ─── 達成記録 ──────────────────────────────────────────────────────────────────
interface AchievementFlags {
  usedKaidan: boolean; usedEightCut: boolean; usedRevolution: boolean
  usedJoker: boolean; usedSevenPass: boolean; usedShibari: boolean
}

// ─── スマートプレイヤー: req条件を達成しようとしつつ勝ちを目指す ───────────────
function playerChoosePlay(state: GameState, req: string | undefined, ach: AchievementFlags): Card[] | null {
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

  // 革命中: 場あり時は高バリュー（弱いカード）から出して強いカードを温存する
  // 場なし時: 最強カード（最低バリュー）で即制圧
  if (state.revolutionActive && fcount > 0) {
    candidates.sort((a,b)=>Math.max(...b.map(c=>c.value))-Math.max(...a.map(c=>c.value)))
  } else {
    candidates.sort((a,b)=>Math.max(...a.map(c=>c.value))-Math.max(...b.map(c=>c.value)))
  }
  return candidates[0]
}

function combos<T>(arr: T[], k: number): T[][] {
  if (k===0) return [[]]
  if (k>arr.length) return []
  const [f,...rest]=arr
  return [...combos(rest,k-1).map(c=>[f,...c]),...combos(rest,k)]
}

// ─── 1ゲームシミュレーション ───────────────────────────────────────────────────
function simulateGame(level: number, seed: number): { win: boolean; impossibleReason: string | null } {
  const setup = scenarioForLevel(level)
  const rules = rulesForLevel(level)
  let state = initGame(rules, ['Player','CPU1','CPU2','CPU3'], undefined, seed)
  state = applyChallengeScenario(state, setup)

  const req = setup.requiredEffect
  const ach: AchievementFlags = {
    usedKaidan:false, usedEightCut:false, usedRevolution:false,
    usedJoker:false, usedSevenPass:false, usedShibari:false,
  }

  let steps = 0
  const MAX_STEPS = 2000

  while (state.phase !== 'result' && steps < MAX_STEPS) {
    steps++

    // ターン・パス制限超過チェック
    if (setup.maxTurns != null && (state.turnCount ?? 0) > setup.maxTurns) break
    if (setup.maxPlayerPasses != null && (state.playerPassCount ?? 0) > setup.maxPlayerPasses) break

    // 特殊フェーズ処理
    if (state.phase === 'sevenPass') {
      const giver = state.players[state.currentPlayerIndex]
      const give = [...giver.hand].sort((a,b)=>a.value-b.value).slice(0, state.sevenPassState?.totalToGive ?? 1)
      const targets = [1,2,3].filter(i=>!state.finishedPlayers.includes(i)&&i!==state.currentPlayerIndex)
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
        if (![...byRank.values()].some(v=>v>=4)) return {win:false,impossibleReason:`Lv${level}: 革命補充失敗`}
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
      played = playerChoosePlay(state, req, ach)
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

  if (state.phase !== 'result') return { win: false, impossibleReason: null }

  // 勝利判定
  const playerFinish = state.players[0].finishOrder
  const won = playerFinish === 1

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

  return { win: won, impossibleReason: null }
}

// ─── メイン: 全レベルを N 回試行 ──────────────────────────────────────────────
const TRIALS = 30
const results: { level: number; wins: number; impossible: string | null }[] = []

console.log('=== チャレンジ全レベル検証 ===\n')

for (let level = 1; level <= 100; level++) {
  let wins = 0
  let impossible: string | null = null

  for (let seed = level * 100; seed < level * 100 + TRIALS; seed++) {
    const r = simulateGame(level, seed)
    if (r.impossibleReason) { impossible = r.impossibleReason; break }
    if (r.win) wins++
  }

  const mark = wins > 0 ? '✅' : impossible ? '🚫' : '❌'
  const pct = `${wins}/${impossible ? '中断' : TRIALS}`
  console.log(`${mark} Lv${String(level).padStart(3,'0')}: ${pct} ${impossible ?? ''}`)
  results.push({ level, wins, impossible })
}

console.log('\n=== 要修正レベル ===')
const failed = results.filter(r => r.wins === 0)
if (failed.length === 0) {
  console.log('全レベルクリア可能！')
} else {
  failed.forEach(r => console.log(`  Lv${r.level}: ${r.impossible ?? '勝利なし（難易度が高すぎる可能性）'}`))
}
