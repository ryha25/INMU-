# INMUPORTAL連携

大富豪のユーザーデータは、INMUPORTALから連携したユーザーにだけ作成されます。

## Replit Secrets

- `DATABASE_URL`: INMUPORTALと共用するNeon接続文字列
- `PORTAL_LINK_SECRET`: INMUPORTALと大富豪だけが共有する十分に長いランダム値

## INMUPORTAL側

ログイン済みユーザーについて、次のJSONをUTF-8 JSON化し、base64urlでエンコードします。

```json
{"portalUserId":"PORTAL側の不変ID","username":"表示名","exp":1893456000}
```

エンコード済み本文を `PORTAL_LINK_SECRET` によるHMAC-SHA256で署名し、署名もbase64url化します。

`https://大富豪のReplitドメイン/api/portal/link?token=本文.署名`

へユーザーを遷移させます。`exp` は短時間（5分程度）を推奨します。

## DB準備

Neon SQL Editorで `server/migrations/001_portal_linked_users.sql` を一度実行します。既存PORTALテーブルは変更しません。
