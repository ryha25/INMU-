import assert from 'node:assert/strict'
import { scenarioForLevel } from '../src/components/ChallengeModeScreen.js'

for (let level = 1; level <= 100; level++) {
  const setup = scenarioForLevel(level)
  const description = setup.description
  assert.match(description, /^説明：/, `Lv.${level}: 説明`)
  assert.match(description, /\n縛り内容：/, `Lv.${level}: 縛り内容`)
  assert.match(description, /\nクリア条件：/, `Lv.${level}: クリア条件`)
  assert.ok(description.includes(setup.minRank === '富豪' ? '富豪以上になる' : '大富豪になる'), `Lv.${level}: 順位条件`)
  if (setup.requiredEffect) assert.ok(description.includes(`「${setup.requiredEffect}」を1回以上発動する`), `Lv.${level}: 必須効果`)
  if (setup.forbiddenEffect) assert.ok(description.includes(`「${setup.forbiddenEffect}」は禁止`), `Lv.${level}: 禁止効果`)
  if (setup.forbidPairs) assert.ok(description.includes('ペア・複数枚出し禁止'), `Lv.${level}: ペア禁止`)
  if (setup.forbidStairs) assert.ok(description.includes('階段出し禁止'), `Lv.${level}: 階段禁止`)
  if (setup.maxPlayerPasses != null) assert.ok(description.includes(`パスは${setup.maxPlayerPasses}回まで`), `Lv.${level}: パス制限`)
  if (setup.maxTurns != null) assert.ok(description.includes(`手番は${setup.maxTurns}回まで`), `Lv.${level}: 手番制限`)
}

console.log('challenge descriptions Lv.1-100: OK')
