# 🚀 スプラトゥーン3 Discord通知システム セットアップガイド

このガイドでは、ゼロからスプラトゥーン3 Discord通知システムを構築・運用するまでの全手順を説明します。

## 📋 前提条件

- GitHubアカウント
- Discordアカウント
- Node.js 18以上
- 基本的なGit操作の知識

## 🛠️ Step 1: ローカル開発環境のセットアップ

### 1.1 プロジェクトの初期化

```bash
# リポジトリをクローン
git clone https://github.com/yourusername/splatoon3-schedule-notificator.git
cd splatoon3-schedule-notificator

# 依存関係のインストール
npm install
```

### 1.2 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 でWebUIが起動します。

## 🤖 Step 2: Discord Botのセットアップ

### 2.1 Discord Developer Portalでアプリケーション作成

1. [Discord Developer Portal](https://discord.com/developers/applications)にアクセス
2. **New Application**をクリック
3. アプリケーション名を入力（例: `Splatoon3 Schedule Bot`）

### 2.2 Botトークンの取得

1. **Bot**タブに移動
2. **Add Bot**をクリック
3. **Token**をコピーして保存
4. **Privileged Gateway Intents**は無効のまま（不要）

### 2.3 Application IDとPublic Keyの取得

1. **General Information**タブに移動
2. **Application ID**をコピーして保存
3. **Public Key**をコピーして保存

### 2.4 Botをサーバーに招待

1. **OAuth2** > **URL Generator**タブに移動
2. **Scopes**で`applications.commands`を選択
3. 生成されたURLでBotをサーバーに招待

## ☁️ Step 3: Deno Deployのセットアップ

### 3.1 Deno Deployアカウント作成

1. [Deno Deploy](https://deno.com/deploy)にアクセス
2. GitHubアカウントでサインアップ

### 3.2 プロジェクト作成

1. **New Project**をクリック
2. GitHubリポジトリを連携
3. エントリーポイント: `discord-bot/webhook.ts`

### 3.3 環境変数の設定

Deno Deployのプロジェクト設定で以下を追加:

```env
DISCORD_TOKEN=your_bot_token_here
DISCORD_APPLICATION_ID=your_application_id_here
DISCORD_PUBLIC_KEY=your_public_key_here
```

### 3.4 Interactions Endpoint URLの設定

1. Deno DeployプロジェクトのURLをコピー（例: `https://your-project.deno.dev`）
2. Discord Developer Portal > **General Information**タブ
3. **Interactions Endpoint URL**に`https://your-project.deno.dev`を入力
4. **Save Changes**をクリック

## 📄 Step 4: GitHub Pages & Actionsの設定

### 4.1 GitHubリポジトリの準備

1. リポジトリをGitHubにpush
2. **Settings** > **Pages**で **GitHub Actions**を選択

### 4.2 Workflow実行権限の確認

1. **Settings** > **Actions** > **General**
2. **Workflow permissions**で **Read and write permissions**を選択

### 4.3 初回手動実行

1. **Actions**タブに移動
2. **Update Splatoon3 Schedule**ワークフローを選択
3. **Run workflow**で手動実行

## 🔗 Step 5: 動作確認

### 5.1 WebUIの確認

1. GitHub Pages URL（`https://yourusername.github.io/splatoon3-schedule-notificator`）にアクセス
2. スケジュールデータが表示されることを確認
3. 「Discord設定」タブで通知条件を作成

### 5.2 Discord Botの確認

1. Discordでスラッシュコマンドが利用可能か確認
2. `/test`コマンドで基本動作をテスト

### 5.3 通知設定のテスト

1. WebUIで通知条件を作成して有効化
2. 「Discord設定生成」ボタンで設定文字列を生成
3. Discordで`/watch 設定文字列`コマンドを実行
4. `/status`で設定が保存されているか確認
5. `/check`で即座に通知テスト

## 📱 Step 6: プロダクション運用

### 6.1 自動更新の確認

- GitHub Actionsが2時間ごとに実行されることを確認
- スケジュールデータが正常に更新されることを確認

### 6.2 Discord Bot監視

- Deno Deployのログでエラーがないか確認
- Discord Botが正常に応答していることを確認

## 🔧 カスタマイズ

### WebUIの設定

**src/hooks/useSchedule.ts** でAPIエンドポイントを更新:

```typescript
const API_CONFIG = {
  baseUrl: 'https://yourusername.github.io/splatoon3-schedule-notificator',
  scheduleEndpoint: '/api/schedule.json'
};
```

### GitHub Actions実行頻度の変更

**.github/workflows/update-schedule.yml** でcron設定を変更:

```yaml
schedule:
  # 現在: 奇数時間（2時間ごと）
  - cron: '0 16,18,20,22,0,2,4,6,8,10,12,14 * * *'
  # 1時間ごとに変更する場合:
  # - cron: '0 * * * *'
```

## 🚨 トラブルシューティング

### Discord Botが応答しない

1. **環境変数の確認**
   - Deno Deploy設定画面で正しく設定されているか
   - トークンやIDに余分な空白がないか

2. **Interactions Endpoint URL**
   - Discord Developer Portalで正しく設定されているか
   - HTTPSで始まっているか

3. **Deno Deployログ確認**
   ```bash
   # ダッシュボード > プロジェクト > Logs
   ```

### GitHub Actions失敗

```bash
# ローカルでスクリプトテスト
cd scripts
npm install
node fetch-schedule.js
```

### 通知が来ない

1. **設定確認**
   - `/status`で設定が保存されているか
   - 通知条件が現在のスケジュールと一致しているか

2. **即座にテスト**
   - `/check`コマンドで条件に合致するマッチがあるか確認

3. **スケジュールデータ確認**
   - GitHub PagesのAPIエンドポイントが正常か確認
   - `https://yourusername.github.io/splatoon3-schedule-notificator/api/schedule.json`

### WebUI設定生成エラー

1. **通知条件の確認**
   - 1つ以上の条件が有効になっているか
   - 条件の設定が完了しているか

2. **ブラウザ設定**
   - JavaScriptが有効になっているか
   - ローカルストレージが利用可能か

## 📊 監視とメンテナンス

### 定期確認項目

#### 週次
- [ ] GitHub Actions実行履歴の確認
- [ ] Discord Bot応答状況の確認
- [ ] エラーログの確認

#### 月次
- [ ] スケジュールAPIの正常性確認
- [ ] ユーザーフィードバックの確認
- [ ] 機能改善の検討

### 監視方法

1. **GitHub Actions監視**
   - Actions タブで実行状況を確認
   - 失敗時はメール通知される

2. **Deno Deploy監視**
   - ダッシュボードでリクエスト数・エラー率を確認
   - Logsでエラーメッセージを確認

3. **Discord Bot監視**
   - 定期的に各コマンドをテスト実行
   - 応答時間やエラーの有無を確認

## 🎯 完了チェックリスト

- [ ] WebUIがGitHub Pagesで正常に表示される
- [ ] スケジュールデータが自動更新される（2時間ごと）
- [ ] Discord BotのすべてのコマンドD（/watch, /status, /stop, /test, /check）が動作する
- [ ] WebUIで設定した通知条件がDiscord Botで動作する
- [ ] 通知が正しいタイミングでDiscordに送信される

---

これで完全にセットアップ完了です！🎉

何か問題が発生した場合は、GitHubのIssuesで質問してください。