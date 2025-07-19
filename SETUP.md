# 🚀 スプラトゥーン3 PWA セットアップガイド

このガイドでは、ゼロからスプラトゥーン3スケジュール通知PWAをGitHub Pagesで運用するまでの全手順を説明します。

## 📋 前提条件

- GitHubアカウント
- Node.js 18以上
- 基本的なGit操作の知識

## 🛠️ Step 1: ローカル開発環境のセットアップ

### 1.1 プロジェクトの初期化

```bash
# 新しいディレクトリを作成
mkdir splatoon3-schedule-pwa
cd splatoon3-schedule-pwa

# Gitリポジトリ初期化
git init
```

### 1.2 ファイルの作成

提供されたすべてのファイルを適切なディレクトリに配置:

```
splatoon3-schedule-pwa/
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── index.html
├── README.md
├── .gitignore
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── types/
│   │   └── index.ts
│   ├── hooks/
│   │   ├── useSettings.ts
│   │   └── useSchedule.ts
│   └── components/
│       └── NotificationSettings.tsx
├── public/
│   ├── sw.js
│   └── icons/ (後で作成)
├── scripts/
│   └── fetch-schedule.js
└── .github/
    └── workflows/
        └── fetch-schedule.yml
```

### 1.3 .gitignoreファイルの作成

```gitignore
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build
dist/
build/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDEs
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# API cache
public/api/
dist/api/
```

### 1.4 依存関係のインストール

```bash
npm install
```

### 1.5 アイコンファイルの準備

`public/icons/` ディレクトリに以下のサイズのPNGアイコンを配置:

- icon-16x16.png
- icon-32x32.png
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

**アイコン作成のヒント:**
- Figma、Canva、またはオンラインのアイコンジェネレーターを使用
- スプラトゥーンのテーマカラー（オレンジ、青、ピンク等）を使用
- シンプルで認識しやすいデザインにする

## 🔧 Step 2: ローカル動作確認

### 2.1 開発サーバーの起動

```bash
npm run dev
```

### 2.2 機能テスト

1. **アプリの基本動作**
   - http://localhost:3000 にアクセス
   - タブ切り替えが動作するか確認

2. **通知設定**
   - 通知設定タブで条件作成をテスト
   - ブラウザの開発者ツールでIndexedDBを確認

3. **Service Worker**
   - 開発者ツール > Application > Service Workers
   - 登録されているか確認

## 🐙 Step 3: GitHubリポジトリのセットアップ

### 3.1 GitHubリポジトリ作成

1. GitHub.comにログイン
2. 新しいリポジトリを作成
   - リポジトリ名: `splatoon3-schedule-pwa`
   - Public設定
   - README.mdは追加しない（既に作成済み）

### 3.2 ローカルリポジトリをGitHubにプッシュ

```bash
# リモートリポジトリを追加
git remote add origin https://github.com/yourusername/splatoon3-schedule-pwa.git

# ファイルをステージング
git add .

# 初回コミット
git commit -m "Initial commit: Splatoon3 PWA setup"

# メインブランチにプッシュ
git branch -M main
git push -u origin main
```

## 📄 Step 4: GitHub Pagesの設定

### 4.1 Pages設定

1. GitHubリポジトリページで **Settings** タブをクリック
2. 左サイドバーの **Pages** をクリック
3. **Source** セクションで **GitHub Actions** を選択
4. 変更を保存

### 4.2 GitHub Actions実行確認

1. **Actions** タブをクリック
2. 「Fetch Splatoon3 Schedule」ワークフローを確認
3. 初回実行を手動で開始:
   - ワークフローをクリック
   - **Run workflow** ボタンをクリック
   - **Run workflow** で実行

### 4.3 実行結果の確認

- ✅ 成功時: Pages URLでアプリにアクセス可能
- ❌ 失敗時: Actionsタブでエラーログを確認

## 🔗 Step 5: URL設定の更新

### 5.1 GitHub PagesのURLを確認

GitHub Pages URL: `https://yourusername.github.io/splatoon3-schedule-pwa`

### 5.2 アプリ内URLの更新

**src/hooks/useSchedule.ts** を編集:

```typescript
const API_CONFIG = {
  baseUrl: 'https://yourusername.github.io/splatoon3-schedule-pwa',
  scheduleEndpoint: '/api/schedule.json',
  currentEndpoint: '/api/current.json'
};
```

**public/sw.js** を編集:

```javascript
const apiUrl = 'https://yourusername.github.io/splatoon3-schedule-pwa/api/schedule.json';
```

### 5.3 変更をプッシュ

```bash
git add .
git commit -m "Update API URLs for GitHub Pages"
git push
```

## 📱 Step 6: PWAの動作確認

### 6.1 デスクトップでのテスト

1. Chrome/Edgeでアプリにアクセス
2. アドレスバーの「インストール」アイコンをクリック
3. PWAとしてインストールされることを確認
4. 通知許可をテスト

### 6.2 モバイルでのテスト

#### iPhone (Safari)
1. Safariでアプリにアクセス
2. 共有ボタン > 「ホーム画面に追加」
3. PWAアイコンがホーム画面に追加されることを確認
4. PWA版を開いて通知許可をテスト

#### Android (Chrome)
1. Chromeでアプリにアクセス
2. メニュー > 「アプリをインストール」
3. インストール後、通知をテスト

## 🔔 Step 7: 通知機能のテスト

### 7.1 通知条件の設定

1. 「通知設定」タブを開く
2. 「新規作成」で条件を作成:
   - 条件名: 「テスト通知」
   - ルール: 「ガチエリア」を選択
   - 通知タイミング: 1分前
3. 条件を保存して有効化

### 7.2 手動テスト

1. 「通知テスト」ボタンをクリック
2. ブラウザの通知許可を確認
3. 設定した条件に合致するマッチがある場合、通知が表示される

### 7.3 自動実行確認

- 2時間後にGitHub Actionsが自動実行される
- 条件に合致するマッチがあれば自動通知される

## 🚨 トラブルシューティング

### GitHub Actions失敗時

```bash
# ローカルでスクリプトテスト
npm run fetch-schedule

# エラーが出る場合、User-Agent設定を確認
# scripts/fetch-schedule.js の USER_AGENT 変数
```

### 通知が届かない場合

1. **ブラウザ設定確認**
   - 通知が許可されているか
   - PWAがインストールされているか（iOS Safari）

2. **開発者ツールで確認**
   ```javascript
   // コンソールで実行
   navigator.serviceWorker.getRegistrations().then(console.log);
   ```

3. **Service Workerログ確認**
   - 開発者ツール > Application > Service Workers
   - 「inspect」でログを確認

### API取得エラー

1. **Spla3 APIの状態確認**
   - https://spla3.yuu26.com/api/schedule に直接アクセス

2. **CORS確認**
   - GitHub PagesのAPIファイルにアクセス可能か確認

## 🎯 運用開始

### 定期メンテナンス

1. **週次確認**
   - GitHub Actionsの実行状況
   - APIレスポンスの正常性

2. **月次確認**
   - ユーザーフィードバックの確認
   - 機能改善の検討

### モニタリング

- GitHub Actions実行履歴の監視
- Repository Insightsでアクセス状況確認
- Issues/Discussionsでユーザーフィードバック収集

---

これで完全にセットアップ完了です！🎉

何か問題が発生した場合は、GitHubのIssuesで質問してください。