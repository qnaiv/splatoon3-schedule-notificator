# スプラトゥーン3 Discord通知システム

スプラトゥーン3のスケジュール確認とDiscord通知機能を提供するWebアプリケーションです。

## ✨ 特徴

- 🤖 **Discord Bot**: スラッシュコマンドでDiscordに直接通知
- 🔔 **カスタム通知**: ステージ・ルール・マッチタイプを組み合わせた柔軟な通知条件設定
- 🌐 **WebUI**: ブラウザで簡単に通知条件を設定
- 🆓 **完全無料**: GitHub Pages + GitHub Actions + Deno Deployで運用コストゼロ
- ⚡ **高速**: 静的ファイル配信でサーバーレス
- 🔄 **自動更新**: 2時間ごとにスケジュールを自動取得
- 📊 **リアルタイム**: 現在開催中と今後の予定を表示

## 🛠️ 技術スタック

### WebUI (フロントエンド)
- **React 18** + **TypeScript**
- **Vite** (ビルドツール)
- **Tailwind CSS** (スタイリング)
- **IndexedDB** (ローカルストレージ)

### Discord Bot (バックエンド)
- **Deno** + **TypeScript**
- **Deno Deploy** (サーバーレス実行環境)
- **Discord Webhook API** (スラッシュコマンド対応)

### インフラ
- **GitHub Pages** (WebUIホスティング)
- **GitHub Actions** (自動デプロイ・データ取得)
- **Spla3 API** (データソース)

## 🚀 セットアップ手順

### 1. リポジトリのクローン

```bash
git clone https://github.com/yourusername/splatoon3-schedule-notificator.git
cd splatoon3-schedule-notificator
```

### 2. WebUIのセットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

http://localhost:3000 でWebUIが起動します。

### 3. Discord Botのセットアップ

1. **Discord Developer Portal**で新しいアプリケーションを作成
2. **Bot**セクションでTokenを取得
3. **General Information**でApplication IDとPublic Keyを取得
4. **Deno Deploy**プロジェクトを作成
5. 環境変数を設定:
   - `DISCORD_TOKEN`: Botトークン
   - `DISCORD_APPLICATION_ID`: アプリケーションID
   - `DISCORD_PUBLIC_KEY`: 公開鍵

### 4. GitHub Pages & Actionsのセットアップ

1. **GitHubリポジトリ作成**
   - このプロジェクトをGitHubにpush

2. **GitHub Pages有効化**
   - リポジトリの Settings > Pages
   - Source: "GitHub Actions" を選択

3. **URL設定の更新**
   ```typescript
   // WebUIのAPIエンドポイントを更新
   // src/hooks/useSchedule.ts内のAPIベースURL
   ```

## 📋 使用方法

### 基本的な使い方

1. **WebUIアクセス**: GitHub PagesのURLにアクセス
2. **条件設定**: 「Discord設定」タブで通知条件を作成
3. **設定生成**: 「Discord設定生成」ボタンで設定文字列をコピー
4. **Discord連携**: Discordで `/watch 設定文字列` コマンドを実行

### Discord Botコマンド

- `/watch [設定文字列]` - 通知監視を開始
- `/status` - 現在の通知設定を確認
- `/stop` - 通知監視を停止
- `/test` - テスト通知を送信
- `/check` - 即座に通知条件をチェックして送信

### 通知条件の設定

1. **条件名**: 識別しやすい名前を設定
2. **ルール選択**: ガチホコ、ガチヤグラ等を選択
3. **マッチタイプ**: Xマッチ、バンカラマッチ等を選択
4. **ステージ選択**: お気に入りのステージを選択
5. **通知タイミング**: 何分前に通知するかを設定

### 通知の仕組み

- GitHub Actionsが2時間ごとにスケジュールを取得
- Discord Botが定期的に条件をチェック
- 条件に合致し、指定した時間になったらDiscordに通知

## 🔧 開発者向け情報

### プロジェクト構造

```
splatoon3-schedule-notificator/
├── src/                          # WebUI (React)
│   ├── components/
│   │   └── NotificationSettings.tsx
│   ├── hooks/
│   │   ├── useSettings.ts
│   │   └── useSchedule.ts
│   └── types/
├── discord-bot/                  # Discord Bot (Deno)
│   ├── webhook.ts               # メインBot実装
│   ├── types.ts                 # 型定義
│   ├── schedule.ts              # スケジュール取得
│   └── notifications.ts         # 通知ロジック
├── scripts/
│   └── fetch-schedule.js        # スケジュール取得スクリプト
├── .github/workflows/
│   ├── deploy.yml               # WebUI自動デプロイ
│   └── update-schedule.yml      # スケジュール自動更新
└── public/api/                  # APIデータ
```

### 主要コンポーネント

#### WebUI
- **NotificationSettings.tsx**: 通知条件設定UI・Discord設定生成
- **useSettings.ts**: IndexedDBとの設定管理
- **useSchedule.ts**: スケジュールデータ取得

#### Discord Bot
- **webhook.ts**: Webhook受信・スラッシュコマンド処理
- **schedule.ts**: GitHub PagesからのAPI取得
- **notifications.ts**: 通知条件チェック・Discord送信

### ビルドとデプロイ

```bash
# WebUIビルド
npm run build

# スケジュールデータ取得テスト
npm run fetch-schedule

# Discord Bot (Deno Deploy自動デプロイ)
git push origin main
```

### API仕様

#### スケジュールデータ形式

```typescript
interface ScheduleMatch {
  start_time: string;      // ISO 8601形式
  end_time: string;        // ISO 8601形式
  rule: {
    name: string;          // ルール名
    key: string;           // ルールキー
  };
  stages: Stage[];         // ステージ配列
  match_type?: string;     // マッチタイプ
}
```

#### 生成されるAPIファイル

- `/api/schedule.json`: 全スケジュールデータ
- `/api/last-updated.json`: 最終更新情報

## 🐛 トラブルシューティング

### よくある問題

1. **Discord Botが応答しない**
   - Interactions Endpoint URLが正しく設定されているか確認
   - Deno Deployの環境変数が正しく設定されているか確認
   - Botがサーバーに招待されているか確認

2. **通知が来ない**
   - `/status`コマンドで設定が正しく保存されているか確認
   - `/check`コマンドで即座にテスト実行
   - 通知条件が現在のスケジュールと一致しているか確認

3. **WebUIで設定生成ができない**
   - 通知条件が1つ以上有効になっているか確認
   - ブラウザのJavaScriptが有効になっているか確認

### デバッグ方法

```bash
# Deno Deployログ確認
# Deno Deployダッシュボード > プロジェクト > Logs

# GitHub Actionsログ確認
# GitHubリポジトリ > Actions タブ

# WebUIデバッグ
# ブラウザ開発者ツール > Console
```

## 📝 ライセンス

MIT License

## 🙏 謝辞

- [Spla3 API](https://spla3.yuu26.com/) - スケジュールデータの提供
- [Lucide React](https://lucide.dev/) - アイコンライブラリ
- [Deno Deploy](https://deno.com/deploy) - サーバーレス実行環境
- Splatoon 3 - Nintendo

## 🔮 今後の予定

- [ ] 複数サーバー対応
- [ ] 統計情報表示
- [ ] より詳細な通知カスタマイズ
- [ ] フェスマッチ対応
- [ ] 通知履歴機能

---

**注意**: このアプリは非公式です。任天堂とは関係ありません。