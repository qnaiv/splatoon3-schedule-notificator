# スプラトゥーン3 スケジュール通知PWA

スプラトゥーン3のスケジュール確認と通知機能を提供するProgressive Web App（PWA）です。

## ✨ 特徴

- 🔔 **カスタム通知**: ステージ・ルール・マッチタイプを組み合わせた柔軟な通知条件設定
- 📱 **PWA対応**: ホーム画面に追加してアプリのように使用可能
- 🆓 **完全無料**: GitHub Pages + GitHub Actionsで運用コストゼロ
- ⚡ **高速**: 静的ファイル配信でサーバーレス
- 🔄 **自動更新**: 2時間ごとにスケジュールを自動取得
- 📊 **リアルタイム**: 現在開催中と今後の予定を表示

## 🛠️ 技術スタック

### フロントエンド
- **React 18** + **TypeScript**
- **Vite** (ビルドツール)
- **Tailwind CSS** (スタイリング)
- **PWA** (Service Worker)
- **IndexedDB** (ローカルストレージ)

### インフラ
- **GitHub Pages** (ホスティング)
- **GitHub Actions** (自動デプロイ・データ取得)
- **Spla3 API** (データソース)

## 🚀 セットアップ手順

### 1. リポジトリのクローン

```bash
git clone https://github.com/yourusername/splatoon3-schedule-pwa.git
cd splatoon3-schedule-pwa
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 でアプリが起動します。

### 4. GitHub Pagesのセットアップ

1. **GitHubリポジトリ作成**
   - このプロジェクトをGitHubにpush

2. **GitHub Pages有効化**
   - リポジトリの Settings > Pages
   - Source: "GitHub Actions" を選択

3. **GitHub Actions実行**
   - `.github/workflows/fetch-schedule.yml` が自動実行
   - 2時間ごとにスケジュールデータを取得

4. **URL設定の更新**
   ```typescript
   // src/hooks/useSchedule.ts
   const API_CONFIG = {
     baseUrl: 'https://yourusername.github.io/splatoon3-schedule-pwa',
     // ...
   };
   ```
   
   ```javascript
   // public/sw.js
   const apiUrl = 'https://yourusername.github.io/splatoon3-schedule-pwa/api/schedule.json';
   ```

## 📋 使用方法

### 基本的な使い方

1. **アプリアクセス**: GitHub PagesのURLにアクセス
2. **PWAインストール**: ブラウザの「ホーム画面に追加」
3. **通知許可**: 初回起動時に通知を許可
4. **条件設定**: 「通知設定」タブで通知条件を作成

### 通知条件の設定

1. **条件名**: 識別しやすい名前を設定
2. **ルール選択**: ガチホコ、ガチヤグラ等を選択
3. **マッチタイプ**: Xマッチ、バンカラマッチ等を選択
4. **ステージ選択**: お気に入りのステージを選択
5. **通知タイミング**: 何分前に通知するかを設定
6. **論理演算**: AND/OR条件で組み合わせ

### 通知の仕組み

- アプリが2時間ごとにGitHub Pagesからスケジュールを取得
- 設定した条件に合致するマッチがあるかをチェック
- 条件に合致し、指定した時間になったらプッシュ通知を表示

## 🔧 開発者向け情報

### プロジェクト構造

```
splatoon3-schedule-pwa/
├── src/
│   ├── components/
│   │   └── NotificationSettings.tsx
│   ├── hooks/
│   │   ├── useSettings.ts
│   │   └── useSchedule.ts
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   └── main.tsx
├── public/
│   ├── sw.js
│   ├── manifest.json
│   └── icons/
├── scripts/
│   └── fetch-schedule.js
├── .github/
│   └── workflows/
│       └── fetch-schedule.yml
└── package.json
```

### 主要コンポーネント

- **App.tsx**: メインアプリケーション
- **NotificationSettings.tsx**: 通知条件設定UI
- **useSettings.ts**: IndexedDBとの設定管理
- **useSchedule.ts**: スケジュールデータ取得
- **sw.js**: Service Worker（通知機能）

### ビルドとデプロイ

```bash
# ローカルビルド
npm run build

# スケジュールデータ取得テスト
npm run fetch-schedule

# プレビュー
npm run preview
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
- `/api/current.json`: 現在開催中のマッチ
- `/api/upcoming.json`: 今後24時間のマッチ
- `/api/summary.json`: データサマリー

## 🐛 トラブルシューティング

### よくある問題

1. **通知が来ない**
   - ブラウザの通知許可を確認
   - PWAとしてホーム画面に追加しているか確認（iOS Safari）
   - 通知条件が正しく設定されているか確認

2. **スケジュールが更新されない**
   - GitHub Actionsの実行状況を確認
   - API URLが正しく設定されているか確認
   - ネットワーク接続を確認

3. **PWAがインストールできない**
   - HTTPS接続であることを確認
   - manifest.jsonが正しく配信されているか確認
   - Service Workerが正常に登録されているか確認

### デバッグ方法

```javascript
// ブラウザのコンソールでService Workerの状態確認
navigator.serviceWorker.getRegistrations().then(console.log);

// IndexedDBの内容確認
// 開発者ツール > Application > Storage > IndexedDB
```

## 📝 ライセンス

MIT License

## 🙏 謝辞

- [Spla3 API](https://spla3.yuu26.com/) - スケジュールデータの提供
- [Lucide React](https://lucide.dev/) - アイコンライブラリ
- Splatoon 3 - Nintendo

## 🔮 今後の予定

- [ ] ダークモード対応
- [ ] 統計情報表示
- [ ] エクスポート/インポート機能
- [ ] より詳細な通知カスタマイズ
- [ ] オフライン対応強化

---

**注意**: このアプリは非公式です。任天堂とは関係ありません。