import { generateUUID } from '../utils';

// スプラトゥーン3 API レスポンス型
export interface Spla3ApiResponse {
  lastUpdated: string;
  source: string;
  data: {
    result: {
      regular: ScheduleMatch[];
      bankara_challenge?: ScheduleMatch[];
      bankara_open?: ScheduleMatch[];
      x?: ScheduleMatch[];
      event?: EventMatch[];
    };
  };
}

export interface ScheduleMatch {
  start_time: string;
  end_time: string;
  rule: {
    name: string;
    key: string;
  };
  stages: Stage[];
  match_type?: string; // Xマッチ、バンカラマッチ等の区別
}

export interface Stage {
  id: string;
  name: string;
  image?: string;
}

// イベントマッチ型
export interface EventMatch {
  start_time: string;
  end_time: string;
  rule: {
    name: string;
    key: string;
  };
  stages: Stage[];
  event: {
    id: string;
    name: string;
    desc: string;
  };
  is_fest: boolean;
}

// 通知条件設定型
export interface NotificationCondition {
  id: string;
  name: string;
  enabled: boolean;

  stages: {
    operator: 'AND' | 'OR';
    values: string[];
  };

  rules: {
    operator: 'AND' | 'OR';
    values: GameRule[];
  };

  matchTypes: {
    operator: 'AND' | 'OR';
    values: MatchType[];
  };

  // イベントマッチ条件
  eventMatches: {
    enabled: boolean;
    eventTypes: {
      operator: 'AND' | 'OR';
      values: EventType[];
    };
    eventStages: {
      operator: 'AND' | 'OR';
      values: string[];
    };
  };

  notifyMinutesBefore: number;
  createdAt: string;
  updatedAt: string;
}

// ゲームルール
export type GameRule =
  | 'ガチホコ'
  | 'ガチヤグラ'
  | 'ガチエリア'
  | 'ガチアサリ'
  | 'ナワバリバトル';

// マッチタイプ
export type MatchType =
  | 'Xマッチ'
  | 'バンカラマッチ(オープン)'
  | 'バンカラマッチ(チャレンジ)'
  | 'レギュラーマッチ'
  | 'イベントマッチ';

// イベントタイプ
export type EventType =
  | 'ツキイチ・イベントマッチ'
  | '新シーズン開幕記念カップ'
  | '大会イベント練習会(JP)'
  | '大会イベント(JP)'
  | 'ウルトラショット祭り'
  | 'ショクワンダー祭り'
  | 'ジェットパック祭り'
  | 'サメライド祭り'
  | 'ウルトラハンコ祭り'
  | '最強ローラー＆フデ決定戦'
  | '最強スピナー決定戦'
  | '最強ブラスター決定戦'
  | '最強チャージャー決定戦'
  | '最強マニューバー決定戦'
  | '最強シェルター決定戦'
  | '最強スロッシャー決定戦'
  | 'いろんなブキをかわいがるブキチ杯'
  | '仮装してブキをかわいがるブキチ杯'
  | 'ギアパワーとの出会いを楽しむブキチ杯'
  | '霧の中の戦い'
  | 'カンケツセン決戦'
  | '改造ガチホコをかわいがるテスト'
  | 'デカ・ガチヤグラ'
  | 'なぜここにガチホコが？！'
  | 'ハイジャンプバトル'
  | 'イカダッシュバトル'
  | '塗りダッシュバトル'
  | 'スーパーラインマーカーバトル'
  | 'ビッグカーリングボムバトル'
  | 'スプラッシュボムラッシュ'
  | '快走カニタンクバトル'
  | '最強ペア決定戦'
  | 'スーパージャンプ祭り';

// ユーザー設定
export interface UserSettings {
  userId: string;
  notificationConditions: NotificationCondition[];
  globalSettings: {
    enableNotifications: boolean;
    timezone: string;
    lastUpdated: string;
  };
}

// 通知データ
export interface NotificationData {
  condition: string;
  match: ScheduleMatch;
  startTime: string;
  message: string;
}

// IndexedDB用のキー
export const DB_NAME = 'Splatoon3App';
export const DB_VERSION = 1;
export const SETTINGS_STORE = 'settings';
export const SETTINGS_KEY = 'userSettings';

// GitHub Pages API設定
export interface ApiConfig {
  baseUrl: string;
  scheduleEndpoint: string;
  currentEndpoint: string;
}

// デフォルト設定
export const DEFAULT_SETTINGS: UserSettings = {
  userId: generateUUID(),
  notificationConditions: [],
  globalSettings: {
    enableNotifications: true,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    lastUpdated: new Date().toISOString(),
  },
};

// 利用可能な選択肢
export const GAME_RULES: GameRule[] = [
  'ナワバリバトル',
  'ガチエリア',
  'ガチヤグラ',
  'ガチホコ',
  'ガチアサリ',
];

export const MATCH_TYPES: MatchType[] = [
  'レギュラーマッチ',
  'バンカラマッチ(チャレンジ)',
  'バンカラマッチ(オープン)',
  'Xマッチ',
  'イベントマッチ',
];

export const EVENT_TYPES: EventType[] = [
  'ツキイチ・イベントマッチ',
  '新シーズン開幕記念カップ',
  '大会イベント練習会(JP)',
  '大会イベント(JP)',
  'ウルトラショット祭り',
  'ショクワンダー祭り',
  'ジェットパック祭り',
  'サメライド祭り',
  'ウルトラハンコ祭り',
  '最強ローラー＆フデ決定戦',
  '最強スピナー決定戦',
  '最強ブラスター決定戦',
  '最強チャージャー決定戦',
  '最強マニューバー決定戦',
  '最強シェルター決定戦',
  '最強スロッシャー決定戦',
  'いろんなブキをかわいがるブキチ杯',
  '仮装してブキをかわいがるブキチ杯',
  'ギアパワーとの出会いを楽しむブキチ杯',
  '霧の中の戦い',
  'カンケツセン決戦',
  '改造ガチホコをかわいがるテスト',
  'デカ・ガチヤグラ',
  'なぜここにガチホコが？！',
  'ハイジャンプバトル',
  'イカダッシュバトル',
  '塗りダッシュバトル',
  'スーパーラインマーカーバトル',
  'ビッグカーリングボムバトル',
  'スプラッシュボムラッシュ',
  '快走カニタンクバトル',
  '最強ペア決定戦',
  'スーパージャンプ祭り',
];
