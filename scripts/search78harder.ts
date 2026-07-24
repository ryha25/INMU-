// Lv78: ペア1個のみ（シングル多め）でwins>=1のシードを探す
import { initGame, playCards, pass, resolveSevenPass, resolveTenDiscard, validatePlay } from '../src/logic/gameEngine.js'
import { cpuChoosePlay } from '../src/logic/cpuAI.js'
import type { GameState, Card, RulesConfig } from '../src/types/game.js'

const RULES: RulesConfig = {
  kakumei:true,eightCut:true,elevenBack:true,shibari:true,kaidan:true,miyakochi:true,
  nanaWatashi:true,junTen:true,supe3gaeshi:true,suitshibari:true,kinshiAgari:false,
  forbidPairs:false,forbidStairs:false,
}
function cardStr(c: Card){const S:any={spades:'♠',hearts:'♥',diamonds:'♦',clubs:'♣'};const V:any={1:'A',11:'J',12:'Q',13:'K',14:'2','JOKER':'JO'};if((c as any).isJoker||c.rank==='JOKER')return'JO';return(V[c.value]??String(c.value))+(S[c.suit]??c.suit)}
function getHand78(seed:number){
  const state=initGame(RULES,['P','C1','C2','C3'],undefined,seed)
  const pl=state.players.map(p=>({...p,hand:[...p.hand]}))
  const top=[...pl[0].hand].sort((a,b)=>b.value-a.value)[0]
  pl[0].hand=pl[0].hand.filter(c=>c.id!==top.id)
  const hand=[...pl[0].hand].sort((a,b)=>a.value-b.value).slice(0,7)
  pl[0].hand=hand;pl[1].hand.splice(7)
  const s:GameState={...state,players:pl,revolutionActive:true,currentPlayerIndex:0,lastPlayedBy:0,must2431:[],log:[],rules:{...RULES,maxPlayerPasses:4}as any}
  return{state:s,hand}
}
function doSP(s:GameState){const sp=s.sevenPassState;if(!sp)return pass(s);const cur=s.currentPlayerIndex;const toGive=[...s.players[cur].hand].sort((a,b)=>a.value-b.value).slice(0,sp.totalToGive);const targets=[0,1,2,3].filter(i=>!s.finishedPlayers.includes(i)&&i!==cur).sort((a,b)=>s.players[b].hand.length-s.players[a].hand.length);if(!toGive.length||!targets.length)return pass(s);return resolveSevenPass(s,targets[0],toGive)}
function doTD(s:GameState){const td=s.tenDiscardState;if(!td)return pass(s);const cur=s.currentPlayerIndex;const toD=[...s.players[cur].hand].sort((a,b)=>a.value-b.value).slice(0,Math.min(td.totalToDiscard,s.players[cur].hand.length));if(!toD.length)return pass(s);return resolveTenDiscard(s,toD)}
function sim(state:GameState):boolean{
  let s=state;let steps=0
  while(s.phase!=='result'&&steps<600){
    steps++;if(s.phase==='sevenPass'){s=doSP(s);continue};if((s.phase as string)==='tenDiscard'){s=doTD(s);continue}
    const cur=s.currentPlayerIndex
    if(cur!==0){const p=cpuChoosePlay(s);if(p&&validatePlay(s,p).valid)s=playCards(s,p);else s=pass(s);continue}
    const hand=s.players[0].hand;const all:Card[][]=[]
    const byR=new Map<any,Card[]>()
    hand.forEach(c=>{if(c.rank!=='JOKER'){const a=byR.get(c.rank)??[];a.push(c);byR.set(c.rank,a)}})
    if(s.fieldCount>0){for(const c of hand)if(validatePlay(s,[c]).valid)all.push([c]);byR.forEach(cs=>{for(let k=Math.min(cs.length,4);k>=2;k--){const cb=cs.slice(0,k);if(validatePlay(s,cb).valid)all.push(cb)}});const jk=hand.find(c=>c.rank==='JOKER');if(jk&&validatePlay(s,[jk]).valid)all.push([jk])}
    else{byR.forEach(cs=>{for(let k=Math.min(cs.length,4);k>=1;k--){const cb=cs.slice(0,k);if(validatePlay(s,cb).valid){all.push(cb);break}}});const jk=hand.find(c=>c.rank==='JOKER');if(jk&&validatePlay(s,[jk]).valid)all.push([jk])}
    if(!all.length)s=pass(s)
    else{if(s.revolutionActive)all.sort((a,b)=>Math.max(...b.map(c=>c.value))-Math.max(...a.map(c=>c.value)));else all.sort((a,b)=>Math.max(...a.map(c=>c.value))-Math.max(...b.map(c=>c.value)));const vr=validatePlay(s,all[0]);if(vr.valid)s=playCards(s,all[0]);else s=pass(s)}
  }
  return s.phase==='result'&&(s as any).players[0].finishOrder===1
}
function pairCount(hand:Card[]){const v:Record<string,number>={};hand.forEach(c=>{v[String(c.value)]=(v[String(c.value)]||0)+1});return Object.values(v).filter(n=>n>=2).length}

// ペア1個のみ、wins>=1
console.log('=== Lv78: ペア1個+シングル5枚のシード ===')
let cnt=0
for(let seed=7800;seed<=8200&&cnt<8;seed++){
  const{state,hand}=getHand78(seed)
  const pc=pairCount(hand);const jo=hand.some(c=>c.rank==='JOKER')
  if(pc!==1||jo)continue
  let wins=0;for(let t=0;t<5;t++)if(sim(state))wins++
  if(wins>=2){
    console.log(`  seed=${seed} wins=${wins}/5 [${[...hand].sort((a,b)=>a.value-b.value).map(cardStr).join(' ')}]`)
    cnt++
  }
}
