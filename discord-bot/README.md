# Splatoon3 Discord Bot

スプラトゥーン3のスケジュール通知を行うDiscord Botです。

## 機能

- WebUIで設定した通知条件をDiscordで受け取り
- 5分ごとの自動チェック
- スラッシュコマンドによる設定管理

## コマンド

- `/watch <設定文字列>` - 通知監視を開始
- `/status` - 現在の設定を確認
- `/stop` - 通知を停止
- `/test` - テスト通知を送信

## セットアップ

### 1. Discord Application作成

1. [Discord Developer Portal](https://discord.com/developers/applications)にアクセス
2. "New Application"をクリック
3. アプリケーション名を入力（例: "Splatoon3 Schedule Bot"）
4. **Application ID取得**:
   - "General Information" ページで "APPLICATION ID" をコピー
   - これも後で環境変数として使用

### 2. Bot設定

1. 左メニューから "Bot" を選択
2. **Token取得**:
   - "Reset Token" ボタンがある場合はクリック
   - 表示される Token をコピー（後で使用）
   - ⚠️ Token は一度しか表示されないので必ず保存
3. **Bot権限設定**:
   - "Privileged Gateway Intents" セクションを探す
   - "MESSAGE CONTENT INTENT" を有効化（存在する場合）
   - "SERVER MEMBERS INTENT" と "PRESENCE INTENT" は不要

### 3. OAuth2設定

1. 左メニューから "OAuth2" > "URL Generator" を選択
2. Scopes: `bot`, `applications.commands` を選択
3. Bot Permissions: 以下を選択
   - Send Messages
   - Use Slash Commands
   - Embed Links
4. 生成されたURLでBotをサーバーに招待

### 4. Deno Deploy設定

1. [Deno Deploy](https://deno.com/deploy)にアクセス
2. GitHubアカウントでサインイン
3. **新しいプロジェクトを作成**:
   - "New Project" をクリック
   - "Deploy from GitHub repository" を選択
   - リポジトリ: `qnaiv/splatoon3-schedule-notificator` を選択
   - ブランチ: `main`
   - エントリーポイント: `discord-bot/main.ts`
4. **環境変数を設定**:
   - Settings > Environment Variables
   - `DISCORD_TOKEN`: Discord Botで取得したToken
   - `DISCORD_APPLICATION_ID`: Discord Applicationで取得したID
5. **デプロイ**:
   - "Deploy" ボタンをクリック
   - 初回デプロイ完了まで待機

### 5. デプロイ確認

1. Deno Deployのダッシュボードでデプロイ状況を確認
2. ログで "Bot がオンラインになりました！" メッセージを確認
3. Discordサーバーでスラッシュコマンドが表示されるか確認

## 環境変数

```env
DISCORD_TOKEN=your_bot_token_here
DISCORD_APPLICATION_ID=your_application_id_here
```

## ローカル開発

```bash
cd discord-bot

# 環境変数ファイルを作成
echo 'export DISCORD_TOKEN="your_token"' > .env
echo 'export DISCORD_APPLICATION_ID="your_app_id"' >> .env
source .env

# 開発サーバー起動
deno task dev
```

## デプロイ

Deno Deployにプッシュすると自動でデプロイされます。

## 使用方法

1. WebUIで通知条件を設定
2. 「Discord連携」ボタンで設定文字列をコピー
3. Discord で `/watch <設定文字列>` を実行
4. 自動的に通知が届きます

## ファイル構成

```
discord-bot/
├── main.ts           # メインBot処理
├── types.ts          # TypeScript型定義
├── schedule.ts       # スケジュール取得・処理
├── notifications.ts  # 通知送信処理
├── deno.json        # Deno設定ファイル
└── README.md        # このファイル
```

## 制限事項

- メモリ内データ保存（再起動時にリセット）
- 最大同時ユーザー数: Deno Deployの制限に依存
- 通知頻度: 5分間隔での確認

## Discord設定の詳細

### 現在のDiscord Developer Portal画面での確認項目

**General Information**:
- APPLICATION ID が表示されている
- PUBLIC KEY も表示される（今回は不要）

**Bot**:
- Token セクション: "Reset Token" または "Copy" ボタン
- Privileged Gateway Intents: MESSAGE CONTENT INTENT など
- Authorization Flow: "Requires OAuth2 Code Grant" は無効のまま

**OAuth2 > General**:
- CLIENT ID（APPLICATION IDと同じ）
- CLIENT SECRET（今回は不要）

**OAuth2 > URL Generator**:
- Scopes: bot と applications.commands を選択
- Bot Permissions: Send Messages, Use Slash Commands, Embed Links

## トラブルシューティング

### "MESSAGE CONTENT INTENT" が見つからない場合
- このオプションは 2022年以降に追加されました
- 見つからない場合は設定なしで進めてください
- スラッシュコマンドのみ使用するため必須ではありません

### Token が取得できない
- "Reset Token" をクリックして新しいTokenを生成
- 生成後すぐにコピーして保存（再表示されません）

### Bot が応答しない
- TOKEN と APPLICATION_ID が正しく設定されているか確認
- Bot にメッセージ送信権限があるか確認
- サーバーにBotが正しく招待されているか確認

### 通知が届かない
- `/status` で設定を確認
- `/test` でテスト通知を実行
- スケジュールデータが正常に取得できているか確認

### コマンドが表示されない
- Bot を再起動してコマンド登録を確認
- サーバーでスラッシュコマンドが有効になっているか確認
- Botに "applications.commands" スコープが付与されているか確認