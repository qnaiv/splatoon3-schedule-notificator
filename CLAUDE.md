# Claude開発メモ

## プロジェクト概要
Splatoon3スケジュール通知システム - スプラトゥーン3の対戦スケジュールを追跡し、WebUIとDiscord botで通知するアプリケーション

## システム構成

### 主要コンポーネント
1. **Web UI (React + Vite)**: `src/`に配置、`dist/`にビルド
2. **Discord Bot (Deno)**: `discord-bot/`に配置、個別にデプロイ
3. **スケジュール取得スクリプト (Node.js)**: `scripts/fetch-schedule.js`
4. **GitHub Actions**: 自動スケジュール更新とデプロイ

### データフロー
1. GitHub Actionsが2時間ごとに`scripts/fetch-schedule.js`を実行
2. スプラトゥーン3 API (https://spla3.yuu26.com/api/schedule) からデータ取得
3. データを変換して`public/api/schedule.json`に保存
4. Reactアプリを更新されたデータでビルド
5. GitHub Actions経由でGitHub Pagesにデプロイ

## 重要な設定情報

### GitHub Actionsワークフロー
- **ファイル**: `.github/workflows/update-schedule.yml`
- **実行スケジュール**: 2時間ごと (cron: '0 16,18,20,22,0,2,4,6,8,10,12,14 * * *')
- **最近の修正**: `peaceiris/actions-gh-pages@v3`から公式の`actions/deploy-pages@v2`に変更
- **権限**: `contents: read`, `pages: write`, `id-token: write`

### Discord Bot
- **実行環境**: Deno Deploy
- **通知チェック**: 5分ごと `Deno.cron("notification-check", "*/5 * * * *", checkNotifications)`
- **データソース**: GitHub PagesのJSONエンドポイントから取得
- **主要ファイル**: 
  - `discord-bot/main.ts` - メインbot処理
  - `discord-bot/schedule.ts` - スケジュールデータ取得
  - `discord-bot/notifications.ts` - 通知ロジック

### ファイル管理
- **除外ファイル**: `public/`ディレクトリは`.gitignore`に設定済み
- **自動生成ファイル**: `public/api/`内のすべてのファイルはGitHub Actionsで自動生成
- **コミット禁止**: スケジュールJSONファイルは自動生成されるためコミット不要

## よくある問題と解決方法

### スケジュール更新が動作しない
**問題**: GitHub Actionsは実行されるが`schedule.json`が更新されない
**根本原因**: GitHub Actions内でのスクリプト実行パスの問題
**解決方法**: `cd scripts && node fetch-schedule.js`ではなく`node scripts/fetch-schedule.js`を`working-directory: .`と組み合わせて使用

### Discord Botが古いデータを表示する
**問題**: Botが古いスケジュールデータを表示
**原因**: BotはGitHub Pagesからデータを取得するため、最新の変更が反映されていない可能性
**確認方法**: GitHub Actionsが正常完了してPagesにデプロイされたか確認

## 開発用コマンド

### ローカル開発
```bash
npm run dev          # React開発サーバー起動
npm run build        # プロダクションビルド
npm run lint         # リント実行 (利用可能な場合)
npm run typecheck    # TypeScriptチェック (利用可能な場合)
```

### Discord Bot テスト
```bash
cd discord-bot
deno run --allow-net --allow-env main.ts
```

### 手動スケジュール更新
```bash
cd scripts
node fetch-schedule.js
```

### 強制スケジュール更新
```bash
cd scripts
FORCE_UPDATE=true node fetch-schedule.js
```

## APIエンドポイント

### 外部API
- **スプラトゥーン3 API**: https://spla3.yuu26.com/api/schedule

### 内部API (GitHub Pages)
- **スケジュールデータ**: https://qnaiv.github.io/splatoon3-schedule-notificator/api/schedule.json
- **最終更新時刻**: https://qnaiv.github.io/splatoon3-schedule-notificator/api/last-updated.json

## 主要設定ファイル

### パッケージ管理
- `package.json` - メインプロジェクトの依存関係
- `scripts/package.json` - 取得スクリプトの依存関係
- `discord-bot/deno.json` - Deno設定

### ビルド・デプロイ
- `vite.config.ts` - Viteビルド設定
- `tsconfig.json` - TypeScript設定
- `.gitignore` - `public/`ディレクトリを含む

### データ管理ファイル
- `data/event-types.txt` - イベントタイプ一覧（1行1項目）
- `data/stage-types.txt` - ステージタイプ一覧（1行1項目）

## デプロイ構成

### GitHub Pages
- **方法**: GitHub Actionsデプロイ (ブランチベースではない)
- **ソース**: Reactビルド後の`dist/`ディレクトリ
- **廃止**: `gh-pages`ブランチ (現在は使用しない)

### Discord Bot
- **プラットフォーム**: Deno Deploy
- **環境変数**: `DISCORD_TOKEN`, `DISCORD_APPLICATION_ID`, `DISCORD_PUBLIC_KEY`

## 監視・確認方法

### スケジュール更新
- GitHub Actionsワークフロー実行状況を確認
- `last-updated.json`のタイムスタンプを確認
- Discord botログで成功したデータ取得を確認

### Discord Bot状態
- Botログで通知チェック結果を確認
- Discordで`/test`コマンドでテスト
- Deno Deployダッシュボードでエラー確認

## 今後の開発時の注意点

1. **自動生成ファイルは編集禁止** - `public/api/`内のファイルはGitHub Actionsで上書きされる
2. **ローカルテスト必須** - スケジュール取得ロジックの変更前は必ずローカルでテスト
3. **GitHub Actionsログ** - スケジュール更新問題のデバッグでは主にここを確認
4. **Discord botの許容誤差** - cronの実行間隔を考慮して通知タイミングに5分の許容誤差あり
5. **API制限** - 外部スプラトゥーン3 APIに負荷をかけないため、2時間間隔で更新

## 最近解決した問題

### GitHub Actionsでスケジュール更新が失敗
- **原因**: `cd scripts && node fetch-schedule.js`の実行パス問題
- **修正**: `node scripts/fetch-schedule.js`に変更、`working-directory: .`を設定

### GitHub Pages設定変更
- **変更前**: Deploy from branch (gh-pages)
- **変更後**: GitHub Actions
- **影響**: `gh-pages`ブランチは不要になった

### テキストファイル管理への移行 (2025-01-27)
- **変更内容**: ハードコードされたEVENT_TYPES配列をテキストファイル管理に移行
- **影響ファイル**:
  - `src/types/index.ts` - EVENT_TYPES配列削除、EventType型をstring型に変更
  - `src/hooks/useDataTypes.ts` - 新規作成、テキストファイル読み込み用カスタムフック
  - `src/utils/index.ts` - loadEventTypes/loadStageTypes関数追加、セッション内キャッシュ実装
  - `src/components/NotificationSettings.tsx` - useDataTypesフック使用に変更
- **パフォーマンス改善**: セッション内キャッシュでHTTPリクエスト最適化
  - ページリロード時: 新しいセッションとして再取得
  - ダイアログ開閉時: キャッシュされたデータを再利用