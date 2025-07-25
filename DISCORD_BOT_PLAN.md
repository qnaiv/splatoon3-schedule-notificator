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
│ (React)     │    │ 生成・コピー   │    │ (Deno Deploy)   │
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
- **アーキテクチャ**: Webhook方式（スラッシュコマンド対応）
- **定期実行**: GitHub Actions + 手動チェック

### データ配信基盤
- **GitHub Actions**: 2時間ごとのスケジュール取得
- **GitHub Pages**: 静的JSON配信
- **データ形式**: 既存WebUIと互換性のあるJSON

### WebUI拡張
- **既存**: React + TypeScript (PWA削除済み)
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
1. ユーザーが/checkコマンドで手動実行 or 定期的なバックグラウンド処理
2. GitHub PagesからスケジュールJSONを取得
3. 各ユーザーの条件と照合
4. マッチした場合Discord通知送信
```

## ファイル構成

### Discord Bot (Deno Deploy)
```
discord-bot/
├── webhook.ts        # メインBot処理（Webhook対応）
├── types.ts          # 型定義
├── schedule.ts       # スケジュール取得・処理
├── notifications.ts  # 通知送信処理
└── README.md        # デプロイ手順
```

### GitHub Actions (スケジュール取得)
```
.github/
└── workflows/
    ├── deploy.yml           # WebUI自動デプロイ
    └── update-schedule.yml  # スケジュール取得・更新ワークフロー

scripts/
└── fetch-schedule.js       # API取得・変換スクリプト

public/  (GitHub Pages)
└── api/
    ├── schedule.json        # 変換済みスケジュールデータ
    └── last-updated.json    # 最終更新情報
```

## 実装状況

### Phase 0: データ配信基盤構築 ✅ **完了**
- [x] GitHub Actions ワークフロー作成
  - [x] 2時間ごとのスケジュール取得
  - [x] Splatoon3 API → GitHub Pages データ変換
  - [x] エラーハンドリング・リトライ機能
- [x] データ変換スクリプト実装
  - [x] 既存WebUI形式への変換
  - [x] match_type フィールドの正規化
  - [x] 最終更新時刻の管理
- [x] GitHub Pages 配信設定
  - [x] WebUIの自動デプロイ
  - [x] スケジュール表示WebUIの公開

### Phase 1: Discord Bot基盤 ✅ **完了**
- [x] Deno Deploy プロジェクト対応
- [x] Discord Application & Bot作成（セットアップガイド完備）
- [x] Webhook方式のスラッシュコマンド実装
  - [x] `/watch <設定文字列>` - 通知設定
  - [x] `/status` - 現在の設定確認
  - [x] `/stop` - 通知停止
  - [x] `/test` - 通知テスト
  - [x] `/check` - 即座に通知条件チェック
- [x] 設定データの保存・管理機能（メモリ内）

### Phase 2: スケジュール処理 ✅ **完了**
- [x] GitHub Pages API連携
- [x] スケジュールデータの解析・処理
- [x] 通知条件マッチング機能
- [x] 通知タイミング計算（即座実行対応）

### Phase 3: 定期実行・通知 ✅ **完了**
- [x] 手動チェック機能（/checkコマンド）
- [x] Discord通知送信機能（Embed形式）
- [x] エラーハンドリング・ログ機能
- [x] 日本時間表示対応

### Phase 4: WebUI連携 ✅ **完了**
- [x] Service Worker・PWA機能の完全除去
- [x] WebUI側にDiscord連携UI追加
- [x] 設定エンコード機能
- [x] Discord設定生成・コピー機能
- [x] ユーザーガイド・説明追加

### Phase 5: 運用・改善 ✅ **完了**
- [x] 全体のデプロイ・動作確認
- [x] Discord Bot時刻表示修正（日本時間対応）
- [x] ドキュメント整備（README.md, SETUP.md更新）
- [x] PWA関連コードの完全除去

## 技術的詳細

### Discord Bot実装方式
- **Webhook方式**: Deno Deployのサーバーレス環境に最適化
- **署名検証**: Ed25519による手動実装でセキュリティ確保
- **メモリ内状態管理**: 軽量でシンプルな実装

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

### Discord通知フォーマット
```typescript
const embed = {
  title: "🦑 スプラトゥーン3 通知",
  description: `**${condition.name}** の条件に合致しました！`,
  fields: [
    { name: "ルール", value: match.rule.name, inline: true },
    { name: "マッチタイプ", value: match.match_type, inline: true },
    { name: "ステージ", value: stageNames, inline: false },
    { name: "開始時刻", value: startTime, inline: false }
  ],
  color: 0x00ff88,
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
- Discord Bot: 手動チェック（/checkコマンド）
- リアルタイム性: 即座実行可能

## 運用実績

### 📊 進捗サマリー
- **Phase 0**: ✅ 完了（データ配信基盤構築）
- **Phase 1**: ✅ 完了（Discord Bot基盤）
- **Phase 2**: ✅ 完了（スケジュール処理）
- **Phase 3**: ✅ 完了（定期実行・通知）
- **Phase 4**: ✅ 完了（WebUI連携）
- **Phase 5**: ✅ 完了（運用・改善）
- **全体進捗**: 100% 完了

### 🔗 稼働中のサービス
- **WebUI**: https://qnaiv.github.io/splatoon3-schedule-notificator/
- **API**: https://qnaiv.github.io/splatoon3-schedule-notificator/api/schedule.json
- **GitHub Actions**: 2時間ごと自動実行中
- **Discord Bot**: Deno Deployで稼働中

### 🤖 Discord Bot実装完了機能
- **スラッシュコマンド**: 5種類すべて実装済み
- **通知機能**: Embed形式で日本時間表示
- **設定管理**: Base64エンコード形式で軽量化
- **エラーハンドリング**: 包括的なログ出力

### 📈 技術的成果
- Service Worker・PWA機能完全除去（500+行削減）
- Discord専用WebUIへの改修完了
- Webhook方式によるサーバーレス最適化
- 完全無料運用の実現

## 成功指標

### 技術指標 ✅ **達成**
- 通知機能: 正常動作確認済み
- レスポンス時間: 即座実行対応
- エラーハンドリング: 包括的対応完了

### ユーザビリティ ✅ **達成**
- 設定画面の直感的操作
- ワンクリック設定生成
- 即座通知テスト対応

---

## 最終状態

✅ **プロジェクト完了**

- WebUI: Discord専用設定画面として完成
- Discord Bot: 全機能実装・動作確認済み
- データ取得: 2時間ごと自動更新で安定稼働
- 通知システム: リアルタイム手動実行対応

すべての計画フェーズが完了し、運用可能な状態に到達しました。

---

# Discord Bot /statusコマンド改善

## 2025年1月25日 - /statusコマンド詳細表示改善

### 改善内容

#### 改善前の問題点
- `/status`コマンドが設定名と通知タイミングしか表示しない
- 通知条件の詳細情報が不足している
- 最終通知時刻などの重要な状態情報が表示されていない

#### 改善後の表示内容
`formatSingleConditionWithNumber`関数を改善して以下の情報を追加：

1. **有効/無効状態**: ✅/❌ アイコンと状態テキスト
2. **通知タイミング**: より明確な表示
3. **最終通知時刻**: 日本時間での最終通知時刻（未通知の場合は"まだ通知されていません"）
4. **動作説明**: 条件がどのように動作するかの説明

#### 新しい表示フォーマット
```
📊 **通知設定 1/3**

🔔 **設定名** ✅ (有効)
   ├ 通知タイミング: **30分前**
   ├ ルール条件: ナワバリバトル, ガチエリア
   ├ マッチタイプ: レギュラー, バンカラ
   ├ ステージ条件: スプラトゥーンタワー, ヒラメが丘団地
   ├ 最終通知: 2025/01/15 14:30 または まだ通知されていません
   └ 通知先: #channel-name

💡 **動作説明**: この条件に一致するマッチが開始30分前になると通知します
```

#### 実装詳細
- **ファイル**: `discord-bot/main.ts:489-531`
- **関数**: `formatSingleConditionWithNumber`
- **最終通知時刻**: 日本時間フォーマット (`toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })`)
- **有効/無効状態**: 視覚的アイコンと状態テキスト
- **項目分類**: より詳細な項目分類（ルール条件、マッチタイプ、ステージ条件）
- **動作説明**: 条件がどのように動作するかの説明を追加

#### タスク完了状況
- [x] Discord botの/statusコマンドの現在の実装を確認する
- [x] 通知設定の全データ構造を把握する  
- [x] /statusコマンドの現在の表示内容を詳細に分析して改善点を特定する
- [x] 改善版のformatSingleConditionWithNumber関数を実装してより詳細な情報を表示する
- [x] DISCORD_BOT_PLAN.mdにタスク管理内容を記録する

#### 技術的注意事項
- **TypeScriptエラー対応**: `import.meta.main`の型エラーは`@ts-ignore`で解決
- **日本時間での时刻表示**: `toLocaleString`で Asia/Tokyo タイムゾーン指定
- **配列表示の最適化**: 長い配列は改行で整理して見やすくする

## 参考リンク

- [Deno Deploy Documentation](https://deno.com/deploy/docs)
- [Discord Developer Portal](https://discord.com/developers/applications)
- [Splatoon3 API](https://spla3.yuu26.com/)
- [セットアップガイド](./SETUP.md)
- [プロジェクトREADME](./README.md)