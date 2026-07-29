const assert = require('node:assert/strict')
const { isChallengeCompensationEligible } = require('../server/portal-link.cjs')

const now = Date.parse('2026-07-29T12:00:00.000Z')
const sessionId = 'challenge-1785326400000-12345678-abcd-4321-abcd-123456789012'
const valid = {
  challengeActive: true,
  challengeSessionId: sessionId,
  turnStallDetected: true,
  turnStallDetails: {
    sessionId,
    playerIndex: 1,
    timeLimitSeconds: 30,
    detectedAt: new Date(now - 2_000).toISOString(),
  },
}

assert.equal(isChallengeCompensationEligible(valid, now), true, '検出済みの同一セッションだけ補填対象')
assert.equal(isChallengeCompensationEligible({ ...valid, challengeActive: false }, now), false)
assert.equal(isChallengeCompensationEligible({ ...valid, turnStallDetected: false }, now), false)
assert.equal(isChallengeCompensationEligible({
  ...valid,
  turnStallDetails: { ...valid.turnStallDetails, sessionId: `${sessionId}-other` },
}, now), false, '別セッションの停止情報は不可')
assert.equal(isChallengeCompensationEligible({
  ...valid,
  turnStallDetails: { ...valid.turnStallDetails, detectedAt: new Date(now - 31 * 60_000).toISOString() },
}, now), false, '30分より古い検出情報は不可')
assert.equal(isChallengeCompensationEligible({
  ...valid,
  turnStallDetails: { ...valid.turnStallDetails, detectedAt: new Date(now + 61_000).toISOString() },
}, now), false, '未来日時の検出情報は不可')

console.log('challenge compensation eligibility: OK')
