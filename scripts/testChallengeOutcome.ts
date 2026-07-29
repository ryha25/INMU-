import assert from 'node:assert/strict'
import { evaluateChallengeOutcome } from '../src/logic/challengeOutcome.js'
import type { ChallengeSetup } from '../src/components/ChallengeModeScreen.js'
import type { GameState, PlayerRank } from '../src/types/game.js'

const challenge = {
  minRank: '大富豪',
  requiredEffect: '革命',
} as ChallengeSetup

function state(rank: PlayerRank | null, flags: string[] = [], overrides: Partial<GameState> = {}) {
  return {
    players: [{ rank }],
    achievementFlags: flags,
    turnCount: 5,
    maxTurns: 5,
    playerPassCount: 2,
    maxPlayerPasses: 2,
    ...overrides,
  } as GameState
}

assert.deepEqual(evaluateChallengeOutcome(state('大富豪', ['革命']), challenge, 0), {
  result: 'cleared',
  reason: 'すべてのクリア条件を達成しました',
})
assert.equal(evaluateChallengeOutcome(state(null, ['革命']), challenge, 0), null)
assert.equal(evaluateChallengeOutcome(state('大富豪'), challenge, 0)?.result, 'failed')
assert.equal(evaluateChallengeOutcome(state('富豪', ['革命']), challenge, 0)?.result, 'failed')
assert.equal(evaluateChallengeOutcome(
  state('富豪'),
  { ...challenge, minRank: '富豪', requiredEffect: undefined },
  0,
)?.result, 'cleared')
assert.match(evaluateChallengeOutcome(
  state(null, ['8切り']),
  { ...challenge, forbiddenEffect: '8切り' },
  0,
)?.reason ?? '', /禁止条件/)
assert.match(evaluateChallengeOutcome(
  state(null, [], { turnCount: 6 }),
  challenge,
  0,
)?.reason ?? '', /ターン制限/)
assert.equal(evaluateChallengeOutcome(state(null), challenge, 0), null)

console.log('challenge outcome judgement: OK')
