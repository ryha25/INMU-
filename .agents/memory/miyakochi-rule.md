---
name: 都落ちルール実装
description: 正しい都落ちルールの実装方法とGameState追加フィールド
---

## ルール仕様
大富豪でスタートしたプレイヤーが、他のプレイヤー（非大富豪スタート）に先に1位を取られた場合:
- そのプレイヤーの手札を全没収
- 大貧民に転落
- ゲーム終了時に最下位(finishOrder=4)として扱われる

**初ゲーム（startingRanksが全nullの場合）は発動しない。**

## GameState追加フィールド
```ts
miyakochiPlayers: number[]           // 都落ちで除外されたインデックス
startingRanks: (PlayerRank | null)[] // 前ゲームの順位（都落ち判定用）
```

## initGame
`initGame(rules, playerNames?, startingRanks?)` — 3番目引数で前ゲーム順位を渡す。
再戦時: `handlePlayAgain(prevRanks)` → `startGame(rules, gameMode, prevRanks)`

## getNextActive
シグネチャ: `getNextActive(current, finished, total, miyakochi=[])`
miyakochiに含まれるプレイヤーもスキップする。

## ゲーム終了判定
`finishedPlayers.length + miyakochiPlayers.length >= 3` → ゲーム終了
都落ち済みプレイヤーは最後にfinishedPlayersに追加してfinishOrder=最下位を割り当て。

**Why:** 革命ベースの実装（finishedPlayers内の順位反転）は、変数がTDZにある状態で参照するバグがあった。
