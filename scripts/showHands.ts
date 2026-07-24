/**
 * 各レベルの手札と推奨プレイ手順を出力する
 * 勝てたシードを自動選択して手順を表示
 */
import { initGame, validatePlay, playCards, pass, resolveSevenPass, resolveTenDiscard } from '../src/logic/gameEngine.js'
import { cpuChoosePlay } from '../src/logic/cpuAI.js'
import { checkKaidan, sortHand } from '../src/logic/cards.js'
import type { GameState, Card, RulesConfig } from '../src/types/game.js'

// ── rulesForLevel ─────────────────────────────────────────────────────────
function rulesForLevel(level: number): RulesConfig {
  return {
    kakumei: level >= 3, eightCut: level >= 6, elevenBack: level >= 8,
    shibari: level >= 11, kaidan: level >= 16, miyakochi: level >= 41,
    nanaWatashi: level >= 46, junTen: level >= 51, supe3gaeshi: level >= 56,
    suitshibari: level >= 61, kinshiAgari: false,
    forbidPairs: false, forbidStairs: false,
  }
}

// ── scenarioForLevel ──────────────────────────────────────────────────────
function scenarioForLevel(level: number) {
  type Cfg = {
    s: string; t: number; th: number; h: number; r: string
    req?: string; ban?: string; cj?: boolean; suit?: string
    fv?: number; fc?: number; fs?: boolean
    pass?: number; turn?: number; np?: boolean; ns?: boolean; d: string
  }
  const L: Partial<Record<number, Cfg>> = {
    1:  { s:'lastStand',     t:9,  th:1, h:0, r:'富豪',   d:'' },
    2:  { s:'mirrorBattle',  t:10, th:1, h:0, r:'富豪',   d:'' },
    3:  { s:'lastStand',     t:9,  th:1, h:0, r:'富豪',   fv:5,  fc:1,         d:'' },
    4:  { s:'effectRequired',t:9,  th:1, h:0, r:'富豪',   req:'8切り',          d:'' },
    5:  { s:'lastStand',     t:7,  th:1, h:0, r:'大富豪', d:'' },
    6:  { s:'effectRequired',t:10, th:1, h:0, r:'富豪',   req:'階段',           d:'' },
    7:  { s:'effectRequired',t:10, th:1, h:0, r:'富豪',   req:'革命',           d:'' },
    8:  { s:'cpuRevolution', t:10, th:1, h:0, r:'富豪',   d:'' },
    9:  { s:'sniperRush',    t:9,  th:1, h:0, r:'富豪',   req:'ジョーカー',     d:'' },
    10: { s:'doubleThreat',  t:10, th:2, h:0, r:'富豪',   d:'' },
    11: { s:'lastStand',     t:10, th:1, h:0, r:'富豪',   np:true,  d:'' },
    12: { s:'lastStand',     t:10, th:1, h:0, r:'富豪',   ns:true,  d:'' },
    13: { s:'effectRequired',t:10, th:1, h:0, r:'富豪',   req:'ジョーカー',     d:'' },
    14: { s:'effectForbidden',t:10,th:1, h:0, r:'富豪',   ban:'7渡し',          d:'' },
    15: { s:'effectForbidden',t:10,th:1, h:0, r:'富豪',   ban:'8切り',          d:'' },
    16: { s:'effectForbidden',t:10,th:1, h:0, r:'富豪',   ban:'革命',           d:'' },
    17: { s:'mirrorBattle',  t:10, th:1, h:0, r:'富豪',   pass:5,   d:'' },
    18: { s:'lockedHand',    t:10, th:1, h:0, r:'富豪',   d:'' },
    19: { s:'lastStand',     t:7,  th:1, h:0, r:'富豪',   d:'' },
    20: { s:'doubleThreat',  t:9,  th:2, h:0, r:'大富豪', np:true,  d:'' },
    21: { s:'lastStand',     t:9,  th:1, h:0, r:'富豪',   fv:4,  fc:1,         d:'' },
    22: { s:'lastStand',     t:9,  th:1, h:0, r:'富豪',   fv:9,  fc:1,         d:'' },
    23: { s:'curseCombo',    t:9,  th:1, h:0, r:'富豪',   ban:'7渡し', suit:'hearts', d:'' },
    24: { s:'cpuRevolution', t:9,  th:1, h:1, r:'富豪',   d:'' },
    25: { s:'lastStand',     t:9,  th:1, h:0, r:'富豪',   d:'' },
    26: { s:'lastStand',     t:7,  th:1, h:0, r:'大富豪', d:'' },
    27: { s:'doubleThreat',  t:9,  th:1, h:0, r:'富豪',   fv:7,  fc:2,         d:'' },
    28: { s:'effectRequired',t:9,  th:1, h:0, r:'富豪',   req:'階段', fv:7, fc:3, fs:true, d:'' },
    29: { s:'lockedHand',    t:9,  th:1, h:0, r:'富豪',   suit:'spades',        d:'' },
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
    40: { s:'doubleSiege',   t:10, th:2, h:0, r:'大富豪', ns:true,  d:'' },
    41: { s:'effectRequired',t:9,  th:1, h:0, r:'富豪',   req:'8切り',          d:'' },
    42: { s:'effectRequired',t:9,  th:1, h:0, r:'富豪',   req:'革命',           d:'' },
    43: { s:'effectForbidden',t:9, th:1, h:0, r:'大富豪', ban:'ジョーカー',     d:'' },
    44: { s:'lastStand',     t:9,  th:1, h:0, r:'富豪',   pass:2,   d:'' },
    45: { s:'lastStand',     t:9,  th:1, h:0, r:'富豪',   turn:20,  d:'' },
    46: { s:'effectRequired',t:9,  th:1, h:0, r:'富豪',   req:'7渡し',          d:'' },
    47: { s:'effectRequired',t:9,  th:1, h:0, r:'富豪',   req:'縛り',           d:'' },
    48: { s:'effectRequired',t:9,  th:1, h:0, r:'富豪',   req:'階段',           d:'' },
    49: { s:'sniperRush',    t:9,  th:1, h:0, r:'大富豪', cj:true,              d:'' },
    50: { s:'effectRequired',t:9,  th:1, h:1, r:'大富豪', req:'革命',           d:'' },
    51: { s:'cpuRevolution', t:9,  th:1, h:0, r:'富豪',   ns:true,  d:'' },
    52: { s:'lastStand',     t:7,  th:1, h:0, r:'富豪',   ban:'8切り',          d:'' },
    53: { s:'lastStand',     t:9,  th:1, h:0, r:'富豪',   fv:10, fc:1,          d:'' },
    54: { s:'doubleThreat',  t:9,  th:2, h:0, r:'富豪',   ban:'ジョーカー',     d:'' },
    55: { s:'curseCombo',    t:9,  th:1, h:0, r:'富豪',   ban:'7渡し', suit:'hearts', turn:20, d:'' },
    56: { s:'lastStand',     t:9,  th:1, h:1, r:'富豪',   np:true,  d:'' },
    57: { s:'doubleThreat',  t:9,  th:2, h:0, r:'富豪',   ban:'革命',           d:'' },
    58: { s:'effectForbidden',t:9, th:1, h:0, r:'富豪',   ban:'ジョーカー', fv:8, fc:1, d:'' },
    59: { s:'lastStand',     t:7,  th:1, h:0, r:'大富豪', d:'' },
    60: { s:'cpuRevolution', t:10, th:2, h:0, r:'大富豪', ns:true, turn:40, d:'' },
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
    81: { s:'cpuRevolution', t:9,  th:2, h:1, r:'大富豪', ban:'ジョーカー',     d:'' },
    82: { s:'lastStand',     t:7,  th:1, h:1, r:'大富豪', ns:true, turn:15,     d:'' },
    83: { s:'doubleThreat',  t:9,  th:2, h:0, r:'大富豪', fv:9, fc:2,           d:'' },
    84: { s:'curseCombo',    t:9,  th:2, h:1, r:'大富豪', ban:'7渡し', suit:'diamonds', pass:1, turn:20, d:'' },
    85: { s:'effectForbidden',t:9, th:1, h:0, r:'大富豪', ban:'8切り',          d:'' },
    86: { s:'doubleThreat',  t:7,  th:1, h:0, r:'大富豪', turn:20,              d:'' },
    87: { s:'doubleThreat',  t:9,  th:2, h:1, r:'大富豪', np:true,              d:'' },
    88: { s:'finalBoss',     t:10, th:3, h:0, r:'大富豪', d:'' },
    89: { s:'doubleThreat',  t:9,  th:2, h:1, r:'大富豪', ns:true,              d:'' },
    90: { s:'finalBoss',     t:10, th:3, h:1, r:'大富豪', ban:'ジョーカー', turn:35, d:'' },
    91: { s:'doubleSiege',   t:11, th:2, h:1, r:'大富豪', d:'' },
    92: { s:'finalBoss',     t:11, th:3, h:0, r:'大富豪', d:'' },
    93: { s:'doubleThreat',  t:9,  th:2, h:1, r:'大富豪', ns:true, turn:30,     d:'' },
    94: { s:'bruteForce',    t:8,  th:2, h:1, r:'大富豪', pass:2,               d:'' },
    95: { s:'doubleSiege',   t:10, th:2, h:0, r:'大富豪', ban:'革命',           d:'' },
    96: { s:'finalBoss',     t:10, th:3, h:1, r:'大富豪', ban:'ジョーカー', suit:'spades', d:'' },
    97: { s:'effectRequired',t:9,  th:2, h:1, r:'大富豪', req:'革命',           d:'' },
    98: { s:'bruteForce',    t:8,  th:3, h:0, r:'大富豪', d:'' },
    99: { s:'finalBoss',     t:10, th:3, h:1, r:'大富豪', pass:2, turn:30,      d:'' },
    100:{ s:'finalBoss',     t:10, th:3, h:0, r:'大富豪', d:'' },
  }
  const cfg = L[level] ?? L[100]!
  return {
    targetHandCount: cfg.t, threatCount: cfg.th, playerHandicap: cfg.h,
    scenarioType: cfg.s, minRank: cfg.r,
    requiredEffect: cfg.req, forbiddenEffect: cfg.ban,
    cpuHasJoker: cfg.cj, initialShibariSuit: cfg.suit,
    initialFieldValue: cfg.fv, initialFieldCount: cfg.fc, initialFieldStairs: cfg.fs,
    maxPlayerPasses: cfg.pass, maxTurns: cfg.turn,
    forbidPairs: cfg.np, forbidStairs: cfg.ns,
  }
}

// ── カード表示 ─────────────────────────────────────────────────────────────
const RANK_NAMES: Record<number,string> = {1:'A',2:'2',3:'3',4:'4',5:'5',6:'6',7:'7',8:'8',9:'9',10:'10',11:'J',12:'Q',13:'K'}
const SUIT_SYM: Record<string,string> = {spades:'♠',hearts:'♥',diamonds:'♦',clubs:'♣'}
function cardStr(c: Card): string {
  if (c.suit === 'joker') return 'JK'
  return (RANK_NAMES[c.rank] ?? String(c.rank)) + SUIT_SYM[c.suit]
}
function handStr(hand: Card[]): string {
  return [...hand].sort((a,b)=>a.value-b.value).map(cardStr).join(' ')
}
function comboStr(cards: Card[]): string { return cards.map(cardStr).join('+') }

// ── combos ────────────────────────────────────────────────────────────────
function* combos(arr: Card[], k: number): Generator<Card[]> {
  if (k === 0) { yield []; return }
  if (arr.length < k) return
  const [first, ...rest] = arr
  for (const c of combos(rest, k-1)) yield [first, ...c]
  yield* combos(rest, k)
}

// ── applyChallengeScenario ────────────────────────────────────────────────
function applyScenario(level: number, seed: number) {
  const setup = scenarioForLevel(level)
  const rules = rulesForLevel(level)
  let state = initGame(rules as any, ['P','C1','C2','C3'], undefined, seed)
  const players = state.players.map(p => ({ ...p, hand: [...p.hand] }))

  const tune = (idx: number, strong: boolean) => {
    const tgt = players[idx].hand
    const slots = tgt.map((c,i)=>({c,i})).sort((a,b)=>strong?a.c.value-b.c.value:b.c.value-a.c.value)
    const outside = players.flatMap((p,pi)=>pi===idx?[]:p.hand.map((c,ci)=>({c,pi,ci}))).sort((a,b)=>strong?b.c.value-a.c.value:a.c.value-b.c.value)
    const swaps = Math.min(Math.ceil(tgt.length/2), outside.length)
    for (let i=0;i<swaps;i++) {
      const own=slots[i], other=outside[i]
      if (strong?other.c.value<=own.c.value:other.c.value>=own.c.value) continue
      players[idx].hand[own.i]=other.c; players[other.pi].hand[other.ci]=own.c
    }
  }

  for (let pi=1;pi<players.length;pi++) {
    const maxCards = pi<=setup.threatCount ? setup.targetHandCount : 999
    if (players[pi].hand.length>maxCards) { const ex=players[pi].hand.splice(maxCards); players[0].hand.push(...ex) }
  }

  if (['cpuStrong','finalBoss'].includes(setup.scenarioType)) tune(1,true)
  if (setup.scenarioType==='doubleSiege') { tune(1,true); tune(2,true) }
  if (setup.scenarioType==='sniperRush') tune(1,true)
  if (setup.scenarioType==='bruteForce') tune(3,true)

  if (setup.playerHandicap && setup.playerHandicap>0) {
    const sorted=[...players[0].hand].sort((a,b)=>b.value-a.value)
    for (let i=0;i<setup.playerHandicap;i++) {
      const worst=players.slice(1).flatMap(p=>p.hand).sort((a,b)=>a.value-b.value)[0]
      const hi=sorted[i]
      const pi2=players.findIndex((p,pi)=>pi>0&&p.hand.some(c=>c.id===worst?.id))
      const ci2=pi2>=0?players[pi2].hand.findIndex(c=>c.id===worst.id):-1
      const pi0=players[0].hand.findIndex(c=>c.id===hi.id)
      if (pi2>=0&&ci2>=0&&pi0>=0) { players[pi2].hand[ci2]=hi; players[0].hand[pi0]=worst }
    }
  }

  if (setup.scenarioType==='effectRequired') {
    const req=setup.requiredEffect
    if (req==='ジョーカー'&&!players[0].hand.some(c=>c.suit==='joker')) {
      for (let pi=1;pi<players.length;pi++) {
        const ci=players[pi].hand.findIndex(c=>c.suit==='joker'); if(ci<0) continue
        const wk=[...players[0].hand].sort((a,b)=>a.value-b.value)[0]; if(!wk) break
        const wi=players[0].hand.findIndex(c=>c.id===wk.id)
        players[0].hand[wi]=players[pi].hand[ci]; players[pi].hand[ci]=wk; break
      }
    }
    if (req==='革命') {
      const has4=()=>{ const m=new Map<number,number>(); players[0].hand.filter(c=>c.suit!=='joker').forEach(c=>m.set(c.rank,(m.get(c.rank)??0)+1)); return [...m.values()].some(v=>v>=4) }
      if (!has4()) {
        const byRank=new Map<number,{pi:number,ci:number,val:number}[]>()
        players.forEach((p,pi)=>p.hand.forEach((c,ci)=>{ if(c.suit!=='joker'){const a=byRank.get(c.rank)??[];a.push({pi,ci,val:c.value});byRank.set(c.rank,a)} }))
        for (const [,es] of byRank) {
          const inH=es.filter(e=>e.pi===0), inC=es.filter(e=>e.pi>0)
          if (inH.length+inC.length>=4&&inH.length<4) {
            const need=4-inH.length
            for (let i=0;i<Math.min(need,inC.length);i++) {
              const src=inC[i]
              const wk=[...players[0].hand].sort((a,b)=>a.value-b.value)[0]; if(!wk) continue
              const wi=players[0].hand.findIndex(c=>c.id===wk.id)
              players[0].hand[wi]=players[src.pi].hand[src.ci]; players[src.pi].hand[src.ci]=wk
            }
            break
          }
        }
      }
    }
    if (req==='階段') {
      const hasStair=()=>{
        const bySuit=new Map<string,Card[]>()
        players[0].hand.filter(c=>c.suit!=='joker').forEach(c=>{const a=bySuit.get(c.suit)??[];a.push(c);bySuit.set(c.suit,a)})
        for (const[,sc]of bySuit){const s=[...sc].sort((a,b)=>a.value-b.value).filter((c,i,a)=>i===0||c.value!==a[i-1].value);for(let i=0;i<s.length-2;i++)if(s[i+1].value===s[i].value+1&&s[i+2].value===s[i].value+2)return true}
        return false
      }
      for (let loop=0;loop<3&&!hasStair();loop++) {
        const bySuit=new Map<string,{card:Card,idx:number}[]>()
        players[0].hand.filter(c=>c.suit!=='joker').forEach((c,i)=>{const a=bySuit.get(c.suit)??[];a.push({card:c,idx:i});bySuit.set(c.suit,a)})
        let bestSuit='',bestLen=0,bestBase=0
        for(const[suit,sc]of bySuit){
          const sorted=[...sc].sort((a,b)=>a.card.value-b.card.value)
          for(let i=0;i<sorted.length-1;i++)if(sorted[i+1].card.value===sorted[i].card.value+1){if(2>bestLen){bestLen=2;bestSuit=suit;bestBase=sorted[i].card.value}}
          if(bestLen===0&&sorted.length>0){bestSuit=suit;bestLen=1;bestBase=sorted[0].card.value}
        }
        if(!bestSuit) break
        const needVal=bestBase+bestLen
        const outside=players.flatMap((p,pi)=>pi===0?[]:p.hand.map((c,ci)=>({c,pi,ci}))).filter(e=>e.c.suit===bestSuit&&e.c.value===needVal)
        if(!outside.length) break
        const src=outside[0]
        const wk=[...players[0].hand].filter(c=>c.suit!==bestSuit).sort((a,b)=>a.value-b.value)[0]; if(!wk) break
        const wi=players[0].hand.findIndex(c=>c.id===wk.id)
        players[0].hand[wi]=src.c; players[src.pi].hand[src.ci]=wk
      }
    }
  }

  if (setup.requiredEffect&&setup.scenarioType!=='effectRequired') {
    if (setup.requiredEffect==='ジョーカー'&&!players[0].hand.some(c=>c.suit==='joker')) {
      for(let pi=1;pi<players.length;pi++){
        const ci=players[pi].hand.findIndex(c=>c.suit==='joker');if(ci<0)continue
        const wk=[...players[0].hand].sort((a,b)=>a.value-b.value)[0];if(!wk)break
        const wi=players[0].hand.findIndex(c=>c.id===wk.id)
        players[0].hand[wi]=players[pi].hand[ci];players[pi].hand[ci]=wk;break
      }
    }
  }

  if (setup.cpuHasJoker&&!players[1].hand.some(c=>c.suit==='joker')) {
    const jkSrc=players.flatMap((p,pi)=>pi===1?[]:p.hand.map((c,ci)=>({c,pi,ci}))).find(e=>e.c.suit==='joker')
    if(jkSrc){
      const weak=[...players[1].hand].sort((a,b)=>a.value-b.value)[0]
      if(weak){const wi=players[1].hand.findIndex(c=>c.id===weak.id);players[jkSrc.pi].hand[jkSrc.ci]=weak;players[1].hand[wi]=jkSrc.c}
    }
  }

  const challengeRules={
    ...rules, forbidPairs:setup.forbidPairs??false, forbidStairs:setup.forbidStairs??false,
    ...(setup.requiredEffect==='8切り'?{eightCut:true}:{}),
    ...(setup.requiredEffect==='階段'?{kaidan:true}:{}),
    ...(setup.requiredEffect==='革命'?{kakumei:true}:{}),
    ...(setup.requiredEffect==='7渡し'?{nanaWatashi:true}:{}),
    ...(setup.requiredEffect==='縛り'?{shibari:true}:{}),
  }

  const startsInRevolution=['cpuRevolution','reverseTrap','finalBoss'].includes(setup.scenarioType)
  let fieldOverride: Partial<GameState>={}
  if (setup.initialFieldValue!=null) {
    const fv=setup.initialFieldValue,fc=setup.initialFieldCount??1,isStairs=setup.initialFieldStairs??false
    const pool=players.flatMap((p,pi)=>p.hand.map((c,ci)=>({c,pi,ci}))).filter(e=>e.c.value===fv)
    if(pool.length>=fc){
      fieldOverride={fieldCards:pool.slice(0,fc).map(e=>e.c),fieldValue:fv,fieldCount:fc,stairsMode:isStairs,lastPlayedBy:-1,currentPlayerIndex:0}
    }
  }

  const fp=players.findIndex(p=>p.hand.some(c=>c.suit==='spades'&&c.rank===3))
  state={
    ...state, players, rules:challengeRules as any,
    currentPlayerIndex:fp>=0?fp:0, lastPlayedBy:fp>=0?fp:0,
    revolutionActive:startsInRevolution, must2431:[], log:[],
    ...fieldOverride,
  } as GameState
  if (setup.initialShibariSuit) state={...state,shibariSuit:setup.initialShibariSuit as any,shibariBroken:false} as any

  return { state, setup, challengeRules }
}

// ── playerChoosePlay ──────────────────────────────────────────────────────
function playerChoosePlay(state: GameState, req?: string): Card[]|null {
  const hand=state.players[0].hand, fcount=state.fieldCount
  const allValid: Card[][]=[]

  if (fcount>0) {
    for (const c of hand) if(validatePlay(state,[c]).valid) allValid.push([c])
    if (!state.rules.forbidPairs) {
      const byRank=new Map<number,Card[]>()
      hand.forEach(c=>{if(c.suit!=='joker'){const a=byRank.get(c.rank)??[];a.push(c);byRank.set(c.rank,a)}})
      byRank.forEach(cs=>{for(let k=Math.min(cs.length,4);k>=2;k--){const cb=cs.slice(0,k);if(validatePlay(state,cb).valid)allValid.push(cb)}})
    }
    if (state.stairsMode&&fcount>=3&&fcount<=hand.length) {
      for (const cb of combos(hand,fcount)) if(validatePlay(state,cb).valid) allValid.push(cb)
    }
  } else {
    const byRank=new Map<number,Card[]>()
    hand.forEach(c=>{if(c.suit!=='joker'){const a=byRank.get(c.rank)??[];a.push(c);byRank.set(c.rank,a)}})
    byRank.forEach(cs=>{for(let k=Math.min(cs.length,4);k>=1;k--){const cb=cs.slice(0,k);if(validatePlay(state,cb).valid){allValid.push(cb);break}}})
    if (!state.rules.forbidStairs&&state.rules.kaidan) {
      const bySuit=new Map<string,Card[]>()
      hand.filter(c=>c.suit!=='joker').forEach(c=>{const a=bySuit.get(c.suit)??[];a.push(c);bySuit.set(c.suit,a)})
      bySuit.forEach(sc=>{
        const s=[...sc].sort((a,b)=>a.value-b.value).filter((c,i,a)=>i===0||c.value!==a[i-1].value)
        let i=0; while(i<s.length){let j=i+1;while(j<s.length&&s[j].value===s[j-1].value+1)j++;if(j-i>=3){const st=s.slice(i,i+3);if(validatePlay(state,st).valid)allValid.push(st)}i=j}
      })
    }
    const jk=hand.find(c=>c.suit==='joker'); if(jk&&validatePlay(state,[jk]).valid) allValid.push([jk])
  }

  if (!allValid.length) return null

  if (req&&fcount===0) {
    if(req==='8切り'){const c=allValid.find(cs=>cs.every(x=>x.rank===8));if(c)return c}
    if(req==='7渡し'){const c=allValid.find(cs=>cs.every(x=>x.rank===7));if(c)return c}
    if(req==='革命'){const c=allValid.find(cs=>cs.length>=4&&cs.every(x=>x.rank===cs[0].rank));if(c)return c}
    if(req==='階段'){const c=allValid.find(cs=>cs.length>=3&&checkKaidan(cs));if(c)return c}
    if(req==='ジョーカー'){const c=allValid.find(cs=>cs.some(x=>x.suit==='joker'));if(c)return c}
    if(req==='縛り'){const c=allValid.find(cs=>cs.length>=2&&cs.every(x=>x.suit===cs[0].suit));if(c)return c}
  }

  let cands=allValid
  if(state.revolutionActive&&req!=='革命'){
    const noK=allValid.filter(cs=>!(cs.length>=4&&cs.every(x=>x.rank===cs[0].rank)))
    if(noK.length) cands=noK
  }
  if(state.revolutionActive&&fcount>0) cands.sort((a,b)=>Math.max(...b.map(c=>c.value))-Math.max(...a.map(c=>c.value)))
  else cands.sort((a,b)=>Math.max(...a.map(c=>c.value))-Math.max(...b.map(c=>c.value)))
  return cands[0]
}

// ── sevenPass 解決 ────────────────────────────────────────────────────────
function doSevenPass(state: GameState): GameState {
  const cur=state.currentPlayerIndex
  const spState=state.sevenPassState
  if(!spState) return pass(state)
  const toGive=[...state.players[cur].hand]
    .sort((a,b)=>a.value-b.value) // 弱いカードから渡す
    .slice(0, spState.totalToGive)
  // 渡す相手: 手札が最多のプレイヤー
  const targets=[0,1,2,3]
    .filter(i=>!state.finishedPlayers.includes(i)&&i!==cur)
    .sort((a,b)=>state.players[b].hand.length-state.players[a].hand.length)
  if(!toGive.length||!targets.length) return pass(state)
  return resolveSevenPass(state, targets[0], toGive)
}

// ── tenDiscard 解決 ───────────────────────────────────────────────────────
function doTenDiscard(state: GameState): GameState {
  const cur=state.currentPlayerIndex
  const tdState=state.tenDiscardState
  if(!tdState) return pass(state)
  const n=tdState.totalToDiscard
  // 弱いカードを捨てる
  const toDiscard=[...state.players[cur].hand]
    .sort((a,b)=>a.value-b.value)
    .slice(0, Math.min(n, state.players[cur].hand.length))
  if(!toDiscard.length) return pass(state)
  return resolveTenDiscard(state, toDiscard)
}

// ── 1試合シミュレーション ─────────────────────────────────────────────────
type PlayLog = { type:'play'|'pass'|'sevenPass'|'tenDiscard'; cards?: Card[]; target?: number }

function simulate(level: number, seed: number): { won: boolean; log: PlayLog[]; startHand: Card[] } {
  const { state: initState, setup } = applyScenario(level, seed)
  const startHand=[...initState.players[0].hand]
  const playLog: PlayLog[]=[]
  let state=initState
  let steps=0

  while(state.phase!=='result'&&steps<500) {
    steps++
    const cur=state.currentPlayerIndex

    if(state.phase==='sevenPass'){
      const ns=doSevenPass(state)
      if(cur===0) playLog.push({type:'sevenPass',cards:state.players[0].hand.filter(c=>!ns.players[0].hand.some(h=>h.id===c.id))})
      state=ns; continue
    }
    if((state.phase as string)==='tenDiscard'){
      const ns=doTenDiscard(state)
      if(cur===0) playLog.push({type:'tenDiscard',cards:state.players[0].hand.filter(c=>!ns.players[0].hand.some(h=>h.id===c.id))})
      state=ns; continue
    }

    if(cur===0){
      const played=playerChoosePlay(state,setup.requiredEffect)
      if(played&&played.length>0){ playLog.push({type:'play',cards:played}); state=playCards(state,played) }
      else { playLog.push({type:'pass'}); state=pass(state) }
    } else {
      const played=cpuChoosePlay(state)
      if(played&&validatePlay(state,played).valid) state=playCards(state,played)
      else state=pass(state)
    }
  }

  const won=state.phase==='result'&&state.players[0].finishOrder===1
  return { won, log: playLog, startHand }
}

// ── メイン ────────────────────────────────────────────────────────────────
for (let level=1;level<=100;level++) {
  const setup=scenarioForLevel(level)
  let result: ReturnType<typeof simulate>|null=null
  let winningSeed=-1

  for (let seed=level*100;seed<level*100+60;seed++) {
    const r=simulate(level,seed)
    if(r.won){ result=r; winningSeed=seed; break }
  }

  const constraints: string[]=[]
  if(setup.requiredEffect) constraints.push(`必須:${setup.requiredEffect}`)
  if(setup.forbiddenEffect) constraints.push(`禁止:${setup.forbiddenEffect}`)
  if(setup.forbidPairs) constraints.push('ペア禁止')
  if(setup.forbidStairs) constraints.push('階段禁止')
  if(setup.maxPlayerPasses) constraints.push(`パス${setup.maxPlayerPasses}回まで`)
  if(setup.maxTurns) constraints.push(`${setup.maxTurns}T以内`)
  if(['cpuRevolution','finalBoss'].includes(setup.scenarioType)) constraints.push('革命中スタート')
  if(setup.initialShibariSuit) constraints.push(`${setup.initialShibariSuit}縛り`)

  const sep='─'.repeat(60)
  if(!result){
    console.log(`\n${sep}`)
    console.log(`Lv${String(level).padStart(3,'0')} │ ❌ 勝利シードなし`)
    continue
  }

  const handDisplay=handStr(result.startHand)
  console.log(`\n${sep}`)
  console.log(`Lv${String(level).padStart(3,'0')} │ 手札(${result.startHand.length}枚): ${handDisplay}`)
  if(constraints.length) console.log(`       │ 条件: ${constraints.join(' / ')}`)
  console.log(`       │ ✅ 推奨プレイ順:`)

  let passCount=0
  for (const entry of result.log) {
    if(entry.type==='pass'){
      passCount++
    } else {
      if(passCount>0){ console.log(`         (パス×${passCount})`); passCount=0 }
      if(entry.type==='play'&&entry.cards){
        console.log(`         出す: ${comboStr(entry.cards)}`)
      } else if(entry.type==='sevenPass'&&entry.cards&&entry.cards.length>0){
        console.log(`         7渡し: ${comboStr(entry.cards)} を相手に渡す`)
      } else if(entry.type==='tenDiscard'&&entry.cards&&entry.cards.length>0){
        console.log(`         10捨て: ${comboStr(entry.cards)} を捨てる`)
      }
    }
  }
  if(passCount>0) console.log(`         (パス×${passCount})`)
}
