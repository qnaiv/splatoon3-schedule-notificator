# Splatoon3 Discord Bot

スプラトゥーン3のスケジュール通知を行うDiscord Botです。

## 機能

- WebUIで設定した通知条件をDiscordで受け取り
- 30分ごとの自動チェック
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

### 2. Bot設定

1. 左メニューから "Bot" を選択
2. "Add Bot" をクリック
3. Tokenをコピー（後で使用）
4. "MESSAGE CONTENT INTENT" を有効化

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
3. 新しいプロジェクトを作成
4. このリポジトリを選択
5. エントリーポイント: `discord-bot/main.ts`
6. 環境変数を設定:
   - `DISCORD_TOKEN`: Bot Token
   - `DISCORD_APPLICATION_ID`: Application ID

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
- 通知頻度: 30分間隔での確認

## トラブルシューティング

### Bot が応答しない
- TOKEN と APPLICATION_ID が正しく設定されているか確認
- Bot にメッセージ送信権限があるか確認

### 通知が届かない
- `/status` で設定を確認
- `/test` でテスト通知を実行
- スケジュールデータが正常に取得できているか確認

### コマンドが表示されない
- Bot を再起動してコマンド登録を確認
- サーバーでスラッシュコマンドが有効になっているか確認