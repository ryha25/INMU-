import type { ChallengeSetup } from '../components/ChallengeModeScreen'
import type { GameState } from '../types/game'

export interface ChallengeOutcome {
  result: 'cleared' | 'failed'
  reason: string
}

export function evaluateChallengeOutcome(
  state: GameState,
  challenge: ChallengeSetup,
  playerIndex: number,
): ChallengeOutcome | null {
  if (state.maxTurns != null && state.turnCount > state.maxTurns) {
    return { result: 'failed', reason: `ターン制限（${state.maxTurns}ターン）を超過しました` }
  }
  if (state.maxPlayerPasses != null && state.playerPassCount > state.maxPlayerPasses) {
    return { result: 'failed', reason: `パス制限（${state.maxPlayerPasses}回）を超過しました` }
  }

  const flags = state.achievementFlags ?? []
  if (challenge.forbiddenEffect && flags.includes(challenge.forbiddenEffect)) {
    return { result: 'failed', reason: `禁止条件「${challenge.forbiddenEffect}」を使用しました` }
  }

  const playerRank = state.players[playerIndex]?.rank
  if (!playerRank) return null

  const rankPassed = challenge.minRank === '大富豪'
    ? playerRank === '大富豪'
    : playerRank === '大富豪' || playerRank === '富豪'
  const effectPassed = !challenge.requiredEffect || flags.includes(challenge.requiredEffect)
  const failedReasons = [
    !rankPassed ? `${challenge.minRank}の順位条件未達成` : '',
    !effectPassed ? `必須条件「${challenge.requiredEffect}」未達成` : '',
  ].filter(Boolean)

  return failedReasons.length === 0
    ? { result: 'cleared', reason: 'すべてのクリア条件を達成しました' }
    : { result: 'failed', reason: failedReasons.join('・') }
}
