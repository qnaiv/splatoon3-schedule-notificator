# Splatoon3 Schedule Scripts

このディレクトリにはGitHub ActionsでSplatoon3スケジュールデータを取得・変換するスクリプトが含まれています。

## ファイル構成

- `fetch-schedule.js` - メインのスケジュール取得・変換スクリプト
- `package.json` - Node.js依存関係定義
- `README.md` - このファイル

## 動作方式

1. **GitHub Actions** が2時間ごとに自動実行
2. **Splatoon3 API** からスケジュールデータを取得
3. **既存WebUI形式** に変換（match_typeフィールド追加）
4. **GitHub Pages** (`docs/api/`) に配信

## ローカルテスト

```bash
cd scripts
npm install
node fetch-schedule.js
```

## 出力ファイル

### `docs/api/schedule.json`
```json
{
  "lastUpdated": "2024-01-01T12:00:00.000Z",
  "source": "Splatoon3 API via GitHub Actions",
  "data": {
    "result": {
      "regular": [/* match_type: "レギュラーマッチ" 付与 */],
      "bankara_challenge": [/* match_type: "バンカラマッチ(チャレンジ)" 付与 */],
      "bankara_open": [/* match_type: "バンカラマッチ(オープン)" 付与 */],
      "x": [/* match_type: "Xマッチ" 付与 */]
    }
  }
}
```

### `docs/api/last-updated.json`
```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "nextUpdate": "2024-01-01T14:00:00.000Z"
}
```

## GitHub Actions設定

`.github/workflows/update-schedule.yml` で以下を設定：

- **定期実行**: 2時間ごと (UTC)
- **手動実行**: `workflow_dispatch` 対応
- **GitHub Pages**: 自動デプロイ

## 環境変数

- `FORCE_UPDATE`: "true" で強制更新（デフォルト: "false"）

## エラーハンドリング

- API取得失敗時はプロセス終了コード1で終了
- GitHub Actionsログで詳細確認可能
- 1.5時間以内の重複実行はスキップ

## Discord Bot連携

変換されたデータは以下のURLでアクセス可能：

```
https://yourusername.github.io/splatoon3-schedule-notificator/api/schedule.json
```

Discord BotはこのURLからデータを取得して通知判定を行います。