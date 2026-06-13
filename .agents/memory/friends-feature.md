---
name: フレンド機能
description: localStorage管理のフレンドリスト、FriendsScreen、タイトル画面ボタン
---

## 構成
- `src/hooks/useFriends.ts` — localStorage ('inmu_friends_v1') でCRUD管理
- `src/components/FriendsScreen.tsx` — フレンド一覧、チェックボックス、アイコン選択、追加/削除UI

## Friend型
```ts
{ id: string, name: string, icon: string (emoji), addedAt: number }
```

## タイトル画面変更
- `StartScreen` の props: `onPortalSearch` → `onFriends` に変更
- X共有ボタン・INMUポータルボタンを削除し 👥フレンド ボタンを追加

## フレンド対戦フロー
FriendsScreen → フレンドを選択 → onFriendMatch() → OnlineRoomScreen (既存のWS部屋機能)

## 結果画面
ResultScreen に `onAddFriend`, `onPlayAgain`, `myPlayerIndex` プロップ追加
- + ボタンでCPU名をフレンド追加（デフォルトアイコン🐱）
- 再戦ボタン → handlePlayAgain(prevRanks) → startGame with startingRanks

**Why:** ユーザーの指示で X/INMUポータルを廃止してフレンド機能に置き換え。
