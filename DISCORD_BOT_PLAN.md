# Splatoon3 Discord Bot 実装計画

## 概要

既存のWebUIで設定した通知条件をDiscord Botに渡し、Discord経由でプッシュ通知を受け取るシステムを構築する。

### 主要機能
- WebUIで通知条件を設定
- 設定をエンコードしてDiscord Botコマンドとして生成
- Discord Bot内で定期的にスケジュールをチェック
- 条件に合致した場合にDiscord通知を送信

## アーキテクチャ

```
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐
│   WebUI     │───▶│ 設定文字列    │───▶│  Discord Bot    │
│ (既存)      │    │ 生成・コピー   │    │ (Deno Deploy)   │
└─────────────┘    └──────────────┘    └─────────────────┘
                                              │
                                              ▼
                                       ┌─────────────────┐
                                       │  定期チェック    │
                                       │  (30分ごと)     │
                                       └─────────────────┘
                                              │
                                              ▼
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐
│ GitHub      │◀───│ スケジュール  │◀───│  条件マッチ     │
│ Pages       │    │ 取得         │    │  チェック       │
│ (JSON)      │    │              │    │                 │
└─────────────┘    └──────────────┘    └─────────────────┘
       ▲                                       │
       │                                       ▼
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐
│ GitHub      │───▶│ API データ    │    │ Discord通知送信  │
│ Actions     │    │ 取得・変換    │    │                 │
│ (2時間ごと) │    │              │    │                 │
└─────────────┘    └──────────────┘    └─────────────────┘
       ▲
       │
┌─────────────┐
│ Splatoon3   │
│ API         │
│ (公式)      │
└─────────────┘
```

## 技術スタック

### Discord Bot
- **プラットフォーム**: Deno Deploy (完全無料)
- **言語**: TypeScript
- **ライブラリ**: `@discordeno/bot`
- **定期実行**: Deno.cron (内蔵機能)

### データ配信基盤
- **GitHub Actions**: 2時間ごとのスケジュール取得
- **GitHub Pages**: 静的JSON配信
- **データ形式**: 既存WebUIと互換性のあるJSON

### WebUI拡張
- **既存**: React + TypeScript
- **追加機能**: 設定エンコード・Discord連携UI

## データフロー

### 1. 設定フロー
```typescript
// WebUI側
const settings = {
  conditions: notificationConditions.filter(c => c.enabled)
};
const encoded = btoa(JSON.stringify(settings));
const command = `/watch ${encoded}`;
```

### 2. Bot側設定保存
```typescript
// Discord Bot側（メモリ内保存）
const userSettings = new Map<string, UserSettings>();

interface UserSettings {
  userId: string;
  channelId: string;
  conditions: NotificationCondition[];
}
```

### 3. データ更新フロー
```
1. GitHub Actions が2時間ごとに実行
2. Splatoon3 公式APIからスケジュール取得
3. 既存形式に変換してGitHub Pagesに配信
4. 最終更新時刻も含めて保存
```

### 4. 通知チェックフロー
```
1. Discord Bot が30分ごとにDeno.cronで実行
2. GitHub PagesからスケジュールJSONを取得
3. 各ユーザーの条件と照合
4. マッチした場合Discord通知送信
```

## ファイル構成

### Discord Bot (Deno Deploy)
```
discord-bot/
├── main.ts           # メインBot処理
├── types.ts          # 型定義
├── schedule.ts       # スケジュール取得・処理
├── notifications.ts  # 通知送信処理
├── deno.json        # Deno設定
└── README.md        # デプロイ手順
```

### GitHub Actions (スケジュール取得)
```
.github/
└── workflows/
    └── update-schedule.yml  # スケジュール取得・更新ワークフロー

scripts/
├── fetch-schedule.js        # API取得スクリプト
└── transform-data.js        # データ変換スクリプト

docs/  (GitHub Pages)
└── api/
    ├── schedule.json        # 変換済みスケジュールデータ
    └── last-updated.json    # 最終更新情報
```

## 実装TODO

### Phase 0: データ配信基盤構築
- [ ] GitHub Actions ワークフロー作成
  - [ ] 2時間ごとのスケジュール取得
  - [ ] Splatoon3 API → GitHub Pages データ変換
  - [ ] エラーハンドリング・リトライ機能
- [ ] データ変換スクリプト実装
  - [ ] 既存WebUI形式への変換
  - [ ] match_type フィールドの正規化
  - [ ] 最終更新時刻の管理
- [ ] GitHub Pages 配信設定

### Phase 1: Discord Bot基盤
- [ ] Deno Deploy プロジェクト作成
- [ ] Discord Application & Bot作成
- [ ] 基本的なスラッシュコマンド実装
  - [ ] `/watch <設定文字列>` - 通知設定
  - [ ] `/status` - 現在の設定確認
  - [ ] `/stop` - 通知停止
  - [ ] `/test` - 通知テスト
- [ ] 設定データの保存・管理機能

### Phase 2: スケジュール処理
- [ ] GitHub Pages API連携
- [ ] スケジュールデータの解析・処理
- [ ] 通知条件マッチング機能
- [ ] 通知タイミング計算（n分前の判定）

### Phase 3: 定期実行・通知
- [ ] Deno.cronによる定期チェック機能
- [ ] Discord通知送信機能
- [ ] エラーハンドリング・ログ機能
- [ ] レート制限対応

### Phase 4: WebUI連携
- [ ] WebUI側にDiscord連携UI追加
- [ ] 設定エンコード機能
- [ ] ユーザーガイド・説明追加
- [ ] コマンド生成・コピー機能

### Phase 5: 運用・改善
- [ ] 全体のデプロイ・動作確認
- [ ] ユーザーテスト
- [ ] エラー監視・改善
- [ ] ドキュメント整備

## 詳細実装仕様

### GitHub Actions データ更新仕様

#### ワークフロー概要
```yaml
# .github/workflows/update-schedule.yml
name: Update Splatoon3 Schedule
on:
  schedule:
    - cron: '0 */2 * * *'  # 2時間ごと
  workflow_dispatch:        # 手動実行も可能

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Fetch and transform schedule
        run: node scripts/fetch-schedule.js
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs
```

#### データ変換仕様
```javascript
// 入力: Splatoon3公式API形式
// 出力: 既存WebUI互換形式 + match_type付与
const transformedData = {
  lastUpdated: "2024-01-01T12:00:00Z",
  data: {
    result: {
      regular: matches.map(m => ({ ...m, match_type: "レギュラーマッチ" })),
      bankara_challenge: matches.map(m => ({ ...m, match_type: "バンカラマッチ(チャレンジ)" })),
      bankara_open: matches.map(m => ({ ...m, match_type: "バンカラマッチ(オープン)" })),
      x: matches.map(m => ({ ...m, match_type: "Xマッチ" }))
    }
  }
};
```

### Discord Bot データ取得仕様
```typescript
// GitHub Pagesからデータ取得
const SCHEDULE_URL = "https://yourusername.github.io/splatoon3-schedule-notificator/api/schedule.json";

async function fetchScheduleData() {
  const response = await fetch(SCHEDULE_URL);
  return await response.json();
}
```

### 設定文字列フォーマット
```typescript
interface BotSettings {
  conditions: Array<{
    name: string;
    rules: string[];
    matchTypes: string[];
    stages: string[];
    notifyMinutesBefore: number;
    enabled: boolean;
  }>;
}

// Base64エンコード例
const encoded = btoa(JSON.stringify(settings));
// コマンド: /watch eyJjb25kaXRpb25zIjpbey...
```

### 通知タイミング計算
```typescript
function isNotificationTime(matchStartTime: Date, notifyMinutesBefore: number, now: Date): boolean {
  const notifyTime = new Date(matchStartTime.getTime() - notifyMinutesBefore * 60000);
  const timeDiff = Math.abs(now.getTime() - notifyTime.getTime());
  
  // ±10分の誤差許容（定期実行間隔を考慮）
  return timeDiff <= 10 * 60 * 1000;
}
```

### Discord通知フォーマット
```typescript
const embed = {
  title: "🦑 スプラトゥーン3",
  description: `**${condition.name}**\n${condition.notifyMinutesBefore}分前です！`,
  fields: [
    { name: "ルール", value: match.rule.name, inline: true },
    { name: "タイプ", value: match.match_type, inline: true },
    { name: "ステージ", value: stageNames, inline: false },
    { name: "時間", value: `<t:${startTimestamp}:t> - <t:${endTimestamp}:t>`, inline: false }
  ],
  color: 0x00ff00,
  timestamp: new Date().toISOString()
};
```

## 制約・注意点

### GitHub Actions制約
- 月2,000分の無料枠
- 2時間ごと実行 = 月360分程度（無料枠内）
- 公式APIへの負荷軽減により安定性向上

### GitHub Pages制約
- 1GB容量制限
- JSON ファイルサイズは問題なし
- CDN配信で高速アクセス

### Deno Deploy制約
- メモリ内データは再起動時にリセット
- 永続化が必要な場合は外部DB検討
- 実行時間制限（現在は特になし）

### Discord API制約
- レート制限: 5リクエスト/5秒
- メッセージ長制限: 2000文字
- Embed制限: 25フィールド

### データ更新間隔
- GitHub Actions: 2時間ごと更新
- Discord Bot: 30分ごとチェック
- 最大2時間30分の遅延可能性

## 運用計画

### デプロイ環境
- **Deno Deploy**: 完全無料、自動スケーリング
- **環境変数**: `DISCORD_TOKEN`, `DISCORD_APPLICATION_ID`
- **監視**: Deno Deploy内蔵ログ

### メンテナンス
- Splatoon3 API仕様変更への対応
- Discord.js バージョンアップ対応
- ユーザーフィードバック対応

## 成功指標

### 技術指標
- 通知到達率 > 95%
- レスポンス時間 < 5秒
- エラー率 < 1%

### ユーザー指標
- 月間アクティブユーザー数
- 設定条件数
- 通知成功率

---

## 参考リンク

- [Deno Deploy Documentation](https://deno.com/deploy/docs)
- [Discord Developer Portal](https://discord.com/developers/applications)
- [Splatoon3 API](https://spla3.yuu26.com/)
- [既存WebUI実装](/src/components/NotificationSettings.tsx)