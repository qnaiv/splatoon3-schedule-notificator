# KVデータ構造簡素化 - 移行ガイド

## 概要

KVNotificationManagerのデータ構造を簡素化し、保守性とパフォーマンスを向上させました。

## 変更内容

### Before (複雑な構造)
```
["notifications","users",userId,guildId] → メタデータ + チャンク情報
["notifications","chunks",settingId,"0"] → 実際の条件データ (10件ずつ分割)
["notifications","schedule",settingId] → インデックスデータ
["user_settings",userId] → レガシーデータ
```

### After (シンプル構造)
```
["notifications",userId,guildId] → {
  userId, guildId, channelId,
  conditions: NotificationCondition[],
  createdAt, updatedAt, settingId, version
}
```

## 利点

1. **データ統合**: 1箇所に全データを集約
2. **複雑性削減**: チャンク分割・復元ロジック削除
3. **パフォーマンス向上**: インデックス管理不要
4. **保守性向上**: コードが読みやすく、デバッグが容易

## 移行手順

### 1. テスト実行 (推奨)
```bash
# Discord Bot環境で実行
deno run --allow-all discord-bot/test-kv-manager.ts --test
```

### 2. データ移行
```bash
# 既存データを新形式に移行
deno run --allow-all discord-bot/migrate-kv-data.ts --migrate
```

### 3. 動作確認
- Discord Botが正常に動作することを確認
- 通知設定が正しく表示されることを確認
- 新しい通知設定の保存・取得が動作することを確認

### 4. 古いデータ削除 (オプション)
```bash
# 古いデータをクリーンアップ
deno run --allow-all discord-bot/migrate-kv-data.ts --cleanup
```

## 影響範囲

- `discord-bot/kv-notification-manager.ts`: メインロジック簡素化
- `discord-bot/notification-checker.ts`: 変更不要（インターフェース互換）
- KVデータベース: 既存データの移行が必要

## ロールバック方法

万が一問題が発生した場合は、以下の手順でロールバック可能：

1. Git で変更を元に戻す
2. Deno Deploy で旧バージョンを再デプロイ
3. 必要に応じて古いKVデータを復旧

## 注意事項

- 移行中は一時的に通知機能が停止する可能性があります
- 本番環境での実行前に、必ずテスト環境で動作確認してください
- KVデータのバックアップを取得することをお勧めします

## テスト項目

### 単体テスト
- [x] 設定の保存・取得
- [x] 全設定の取得
- [x] lastNotified更新
- [x] 設定削除

### 統合テスト
- [ ] Discord Bot起動確認
- [ ] 通知設定コマンド動作確認
- [ ] 定期通知チェック動作確認
- [ ] 通知送信動作確認

## パフォーマンス比較

| 項目 | 旧構造 | 新構造 | 改善 |
|------|--------|--------|------|
| データ取得 | 3回のKVアクセス | 1回のKVアクセス | 67%向上 |
| 設定保存 | 原子的操作3件 | KV set 1件 | シンプル化 |
| 全設定取得 | インデックス経由 | 直接スキャン | 高速化 |
| コード行数 | 292行 | 142行 | 50%削減 |

## 関連Issue

- GitHub Issue #37: Discord Bot: KVデータ構造の簡素化