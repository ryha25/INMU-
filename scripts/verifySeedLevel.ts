/**
 * 実際のゲームシード（seed=レベル番号）で全100レベルを検証する
 */
import { initGame, playCards, pass, resolveSevenPass, resolveTenDiscard, validatePlay } from '../src/logic/gameEngine.js'
import { cpuChoosePlay } from '../src/logic/cpuAI.js'

function doSevenPass(state: GameState): GameState {
  const cur = state.currentPlayerIndex
  const spState = state.sevenPassState
  if (!spState) return pass(state)
  const toGive = [...state.players[cur].hand].sort((a,b) => a.value - b.value).slice(0, spState.totalToGive)
  const targets = [0,1,2,3].filter(i => !state.finishedPlayers.includes(i) && i !== cur).sort((a,b) => state.players[b].hand.length - state.players[a].hand.length)
  if (!toGive.length || !targets.length) return pass(state)
  return resolveSevenPass(state, targets[0], toGive)
}

function doTenDiscard(state: GameState): GameState {
  const cur = state.currentPlayerIndex
  const tdState = state.tenDiscardState
  if (!tdState) return pass(state)
  const toDiscard = [...state.players[cur].hand].sort((a,b) => a.value - b.value).slice(0, Math.min(tdState.totalToDiscard, state.players[cur].hand.length))
  if (!toDiscard.length) return pass(state)
  return resolveTenDiscard(state, toDiscard)
}
import type { GameState, Card, RulesConfig } from '../src/types/game.js'

function rulesForLevel(level: number): RulesConfig {
  return {
    kakumei: level>=3, eightCut: level>=6, elevenBack: level>=8,
    shibari: level>=11, kaidan: level>=16, miyakochi: level>=41,
    nanaWatashi: level>=46, junTen: level>=51, supe3gaeshi: level>=56,
    suitshibari: level>=61, kinshiAgari: false,
    forbidPairs: false, forbidStairs: false,
  }
}

type Cfg = { s:string; t:number; th:number; h:number; r:string; req?:string; ban?:string; suit?:string; fv?:number; fc?:number; pass?:number; turn?:number; np?:boolean; ns?:boolean }

const L: Record<number, Cfg> = {
  1:{s:'lastStand',t:9,th:1,h:0,r:'富豪'},2:{s:'lastStand',t:10,th:1,h:0,r:'富豪'},3:{s:'lastStand',t:10,th:1,h:0,r:'富豪'},4:{s:'effectRequired',t:10,th:1,h:0,r:'富豪',req:'8切り'},5:{s:'lastStand',t:10,th:1,h:0,r:'富豪'},
  6:{s:'lastStand',t:10,th:1,h:0,r:'富豪'},7:{s:'lastStand',t:10,th:1,h:0,r:'富豪'},8:{s:'lastStand',t:10,th:1,h:0,r:'富豪'},9:{s:'effectRequired',t:10,th:1,h:0,r:'富豪',req:'ジョーカー'},10:{s:'lastStand',t:10,th:1,h:0,r:'富豪'},
  11:{s:'lastStand',t:10,th:1,h:0,r:'富豪'},12:{s:'effectRequired',t:10,th:1,h:0,r:'富豪',req:'縛り'},13:{s:'lastStand',t:10,th:1,h:0,r:'富豪'},14:{s:'doubleThreat',t:10,th:2,h:0,r:'富豪'},15:{s:'lastStand',t:10,th:1,h:0,r:'富豪'},
  16:{s:'lastStand',t:10,th:1,h:0,r:'富豪'},17:{s:'effectRequired',t:10,th:1,h:0,r:'富豪',req:'階段'},18:{s:'doubleThreat',t:10,th:2,h:0,r:'富豪'},19:{s:'lastStand',t:7,th:1,h:0,r:'富豪'},20:{s:'doubleThreat',t:10,th:2,h:0,r:'富豪'},
  21:{s:'lastStand',t:10,th:1,h:0,r:'富豪'},22:{s:'cpuRevolution',t:10,th:1,h:0,r:'富豪'},23:{s:'doubleThreat',t:10,th:2,h:0,r:'富豪'},24:{s:'lastStand',t:10,th:1,h:1,r:'富豪'},25:{s:'doubleThreat',t:10,th:2,h:0,r:'富豪'},
  26:{s:'lastStand',t:7,th:1,h:0,r:'富豪'},27:{s:'effectRequired',t:10,th:1,h:0,r:'富豪',req:'革命'},28:{s:'doubleThreat',t:10,th:2,h:1,r:'富豪'},29:{s:'cpuRevolution',t:10,th:1,h:0,r:'富豪'},30:{s:'doubleThreat',t:10,th:2,h:0,r:'富豪'},
  31:{s:'lastStand',t:10,th:1,h:1,r:'富豪'},32:{s:'doubleThreat',t:10,th:2,h:0,r:'富豪'},33:{s:'lastStand',t:7,th:1,h:0,r:'富豪'},34:{s:'lastStand',t:10,th:1,h:1,r:'富豪'},35:{s:'lastStand',t:7,th:1,h:0,r:'富豪'},
  36:{s:'doubleThreat',t:10,th:2,h:1,r:'富豪'},37:{s:'lastStand',t:7,th:1,h:0,r:'大富豪'},38:{s:'lastStand',t:7,th:1,h:0,r:'大富豪'},39:{s:'lastStand',t:7,th:1,h:0,r:'大富豪'},40:{s:'doubleThreat',t:10,th:2,h:1,r:'富豪'},
  41:{s:'lastStand',t:10,th:1,h:1,r:'大富豪'},42:{s:'doubleThreat',t:10,th:2,h:1,r:'大富豪'},43:{s:'cpuRevolution',t:10,th:1,h:1,r:'大富豪'},44:{s:'doubleThreat',t:10,th:2,h:1,r:'大富豪'},45:{s:'lastStand',t:10,th:1,h:1,r:'大富豪'},
  46:{s:'lastStand',t:10,th:1,h:0,r:'大富豪'},47:{s:'doubleThreat',t:10,th:2,h:1,r:'大富豪'},48:{s:'cpuRevolution',t:10,th:1,h:1,r:'大富豪'},49:{s:'doubleThreat',t:10,th:2,h:1,r:'大富豪'},50:{s:'finalBoss',t:10,th:3,h:0,r:'大富豪'},
  51:{s:'lastStand',t:9,th:1,h:0,r:'富豪',fv:7,fc:1},52:{s:'doubleThreat',t:9,th:2,h:0,r:'富豪'},53:{s:'lastStand',t:9,th:1,h:0,r:'富豪',fv:10,fc:1},54:{s:'doubleThreat',t:9,th:2,h:0,r:'富豪',ban:'ジョーカー'},55:{s:'curseCombo',t:9,th:1,h:0,r:'富豪',ban:'7渡し',turn:20},
  56:{s:'lastStand',t:9,th:1,h:1,r:'富豪',np:true},57:{s:'doubleThreat',t:9,th:2,h:0,r:'富豪',ban:'革命'},58:{s:'effectForbidden',t:9,th:1,h:0,r:'富豪',ban:'ジョーカー',fv:8,fc:1},59:{s:'lastStand',t:7,th:1,h:0,r:'大富豪'},60:{s:'cpuRevolution',t:10,th:2,h:0,r:'大富豪',ns:true,turn:40},
  61:{s:'mirrorBattle',t:10,th:1,h:1,r:'富豪',turn:25},62:{s:'doubleThreat',t:9,th:2,h:1,r:'富豪'},63:{s:'cpuStrong',t:10,th:1,h:1,r:'富豪',ban:'7渡し'},64:{s:'cpuRevolution',t:9,th:1,h:1,r:'富豪',pass:4},65:{s:'doubleThreat',t:9,th:2,h:1,r:'大富豪',turn:25},
  66:{s:'cpuStrong',t:9,th:1,h:1,r:'富豪',ban:'ジョーカー'},67:{s:'doubleSiege',t:10,th:2,h:1,r:'大富豪',turn:20},68:{s:'lastStand',t:9,th:1,h:1,r:'大富豪',pass:3,turn:20},69:{s:'cpuRevolution',t:9,th:2,h:1,r:'大富豪',ban:'ジョーカー'},70:{s:'finalBoss',t:10,th:3,h:1,r:'大富豪',turn:30},
  71:{s:'effectRequired',t:7,th:1,h:1,r:'大富豪',req:'8切り',turn:20},72:{s:'effectRequired',t:7,th:1,h:1,r:'大富豪',req:'ジョーカー',pass:5},73:{s:'effectRequired',t:7,th:1,h:1,r:'大富豪',req:'革命'},74:{s:'lastStand',t:7,th:1,h:1,r:'大富豪',pass:4},75:{s:'mirrorBattle',t:7,th:1,h:1,r:'大富豪',turn:25},
  76:{s:'effectRequired',t:7,th:1,h:1,r:'大富豪',req:'階段'},77:{s:'doubleThreat',t:7,th:2,h:1,r:'大富豪',ban:'ジョーカー'},78:{s:'cpuRevolution',t:7,th:1,h:1,r:'大富豪',pass:4},79:{s:'curseCombo',t:7,th:1,h:1,r:'大富豪',suit:'clubs',pass:3},80:{s:'effectRequired',t:7,th:2,h:1,r:'大富豪',req:'革命',turn:25},
  81:{s:'cpuRevolution',t:9,th:2,h:1,r:'大富豪',ban:'ジョーカー'},82:{s:'lastStand',t:7,th:1,h:1,r:'大富豪',ns:true,turn:15},83:{s:'doubleThreat',t:9,th:2,h:0,r:'大富豪',fv:9,fc:2},84:{s:'curseCombo',t:9,th:2,h:1,r:'大富豪',ban:'7渡し',suit:'diamonds',pass:1,turn:20},85:{s:'effectForbidden',t:9,th:1,h:0,r:'大富豪',ban:'8切り'},
  86:{s:'doubleThreat',t:7,th:1,h:0,r:'大富豪',turn:20},87:{s:'doubleThreat',t:9,th:2,h:1,r:'大富豪',np:true},88:{s:'finalBoss',t:10,th:3,h:0,r:'大富豪'},89:{s:'doubleThreat',t:9,th:2,h:1,r:'大富豪',ns:true},90:{s:'finalBoss',t:10,th:3,h:1,r:'大富豪',ban:'ジョーカー',turn:35},
  91:{s:'doubleSiege',t:11,th:2,h:1,r:'大富豪'},92:{s:'finalBoss',t:11,th:3,h:0,r:'大富豪'},93:{s:'doubleThreat',t:9,th:2,h:1,r:'大富豪',ns:true,turn:30},94:{s:'bruteForce',t:8,th:2,h:1,r:'大富豪',pass:2},95:{s:'doubleSiege',t:10,th:2,h:0,r:'大富豪',ban:'革命'},
  96:{s:'finalBoss',t:10,th:3,h:1,r:'大富豪',ban:'ジョーカー',suit:'spades'},97:{s:'effectRequired',t:9,th:2,h:1,r:'大富豪',req:'革命'},98:{s:'bruteForce',t:8,th:3,h:0,r:'大富豪'},99:{s:'finalBoss',t:10,th:3,h:1,r:'大富豪',pass:2,turn:30},100:{s:'finalBoss',t:10,th:3,h:0,r:'大富豪'},
}

function applyScenario(level: number, seed: number) {
  const cfg = L[level]!
  const rules = rulesForLevel(level) as any
  let state = initGame(rules, ['P','C1','C2','C3'], undefined, seed)
  const players = state.players.map(p => ({ ...p, hand: [...p.hand] }))

  for (let pi = 1; pi < players.length; pi++) {
    const maxCards = pi <= cfg.th ? cfg.t : 999
    if (players[pi].hand.length > maxCards) {
      const ex = players[pi].hand.splice(maxCards)
      players[0].hand.push(...ex)
    }
  }

  if (cfg.h > 0) {
    const sorted = [...players[0].hand].sort((a, b) => b.value - a.value)
    for (let i = 0; i < cfg.h; i++) {
      const worst = players.slice(1).flatMap(p => p.hand).sort((a, b) => a.value - b.value)[0]
      const hi = sorted[i]
      const pi2 = players.findIndex((p, pi) => pi > 0 && p.hand.some(c => c.id === worst?.id))
      const ci2 = pi2 >= 0 ? players[pi2].hand.findIndex(c => c.id === worst.id) : -1
      const pi0 = players[0].hand.findIndex(c => c.id === hi.id)
      if (pi2 >= 0 && ci2 >= 0 && pi0 >= 0) { players[pi2].hand[ci2] = hi; players[0].hand[pi0] = worst }
    }
  }

  const startsInRevolution = ['cpuRevolution','reverseTrap','finalBoss'].includes(cfg.s)
  const fp = players.findIndex(p => p.hand.some(c => c.suit === 'spades' && c.rank === 3))
  const challengeRules = { ...rules, maxPlayerPasses: cfg.pass ?? null, maxTurns: cfg.turn ?? null, forbidPairs: cfg.np ?? false, forbidStairs: cfg.ns ?? false }
  state = { ...state, players, rules: challengeRules, currentPlayerIndex: fp >= 0 ? fp : 0, lastPlayedBy: fp >= 0 ? fp : 0, revolutionActive: startsInRevolution, must2431: [], log: [] } as GameState
  if (cfg.suit) state = { ...state, shibariSuit: cfg.suit as any }
  return { state, cfg }
}

function simulate(level: number, seed: number): boolean {
  const { state: initState } = applyScenario(level, seed)
  let state = initState
  let steps = 0
  while (state.phase !== 'result' && steps < 500) {
    steps++
    const cur = state.currentPlayerIndex
    if (state.phase === 'sevenPass') { state = doSevenPass(state); continue }
    if ((state.phase as string) === 'tenDiscard') { state = doTenDiscard(state); continue }
    if (cur === 0) {
      const hand = state.players[0].hand
      const allValid: Card[][] = []
      if (state.fieldCount > 0) {
        for (const c of hand) if (validatePlay(state, [c]).valid) allValid.push([c])
        const byRank = new Map<number, Card[]>()
        hand.forEach(c => { if (c.suit !== 'joker') { const a = byRank.get(c.rank) ?? []; a.push(c); byRank.set(c.rank, a) } })
        byRank.forEach(cs => { for (let k = Math.min(cs.length, 4); k >= 2; k--) { const cb = cs.slice(0, k); if (validatePlay(state, cb).valid) allValid.push(cb) } })
        const jk = hand.find(c => c.suit === 'joker'); if (jk && validatePlay(state, [jk]).valid) allValid.push([jk])
      } else {
        const byRank = new Map<number, Card[]>()
        hand.forEach(c => { if (c.suit !== 'joker') { const a = byRank.get(c.rank) ?? []; a.push(c); byRank.set(c.rank, a) } })
        byRank.forEach(cs => { for (let k = Math.min(cs.length, 4); k >= 1; k--) { const cb = cs.slice(0, k); if (validatePlay(state, cb).valid) { allValid.push(cb); break } } })
        const jk = hand.find(c => c.suit === 'joker'); if (jk && validatePlay(state, [jk]).valid) allValid.push([jk])
      }
      if (!allValid.length) { state = pass(state) }
      else {
        let cands = allValid
        if (state.revolutionActive) cands.sort((a, b) => Math.max(...b.map(c => c.value)) - Math.max(...a.map(c => c.value)))
        else cands.sort((a, b) => Math.max(...a.map(c => c.value)) - Math.max(...b.map(c => c.value)))
        state = playCards(state, cands[0])
      }
    } else {
      const played = cpuChoosePlay(state)
      if (played && validatePlay(state, played).valid) state = playCards(state, played)
      else state = pass(state)
    }
  }
  return state.phase === 'result' && state.players[0].finishOrder === 1
}

// 各レベルについて seed=level（実ゲーム） と seed=level*100〜+59（スクリプト）の両方を確認
const results: string[] = []
const fails: number[] = []
const scriptOnlyWins: number[] = []

for (let lv = 1; lv <= 100; lv++) {
  const actualWin = simulate(lv, lv)  // 実際のゲームのシード

  // スクリプトシードで勝てるか
  let scriptWin = false
  let scriptSeed = -1
  for (let s = lv * 100; s < lv * 100 + 60; s++) {
    if (simulate(lv, s)) { scriptWin = true; scriptSeed = s; break }
  }

  if (!actualWin && !scriptWin) {
    results.push(`Lv${lv}: ❌ 両方NG`)
    fails.push(lv)
  } else if (!actualWin && scriptWin) {
    results.push(`Lv${lv}: ⚠️  実ゲームNG (seed=${lv}) / スクリプトはseed=${scriptSeed}で勝てる`)
    scriptOnlyWins.push(lv)
  } else {
    process.stdout.write('.')
  }
}

console.log('\n')
console.log('=== 問題のあるレベル ===')
results.forEach(r => console.log(r))
console.log('\n完全NG:', fails.join(', ') || 'なし')
console.log('実ゲームのみNG:', scriptOnlyWins.join(', ') || 'なし')
