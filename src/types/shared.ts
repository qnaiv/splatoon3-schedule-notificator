// フロントエンドとDiscord Bot間で共有される型定義

/**
 * 基本通知条件（共通部分）
 */
export interface BaseNotificationCondition {
  name: string;
  enabled: boolean;
  notifyMinutesBefore: number;
}

/**
 * Discord Bot用のシンプルな通知条件型
 * フロントエンドから変換される最終形式
 */
export interface BotNotificationCondition extends BaseNotificationCondition {
  rules: string[];
  matchTypes: string[];
  stages: string[];
  eventMatches?: {
    enabled: boolean;
    eventTypes: string[];
    eventStages: string[];
  };
  lastNotified?: string;
}

/**
 * フロントエンド用のUIに特化した通知条件型
 * OperatorとValuesの構造を持つ
 */
export interface UINotificationCondition extends BaseNotificationCondition {
  id: string;
  rules: {
    operator: 'AND' | 'OR';
    values: string[];
  };
  matchTypes: {
    operator: 'AND' | 'OR';
    values: string[];
  };
  stages: {
    operator: 'AND' | 'OR';
    values: string[];
  };
  eventMatches: {
    enabled: boolean;
    eventTypes: {
      operator: 'AND' | 'OR';
      values: string[];
    };
    eventStages: {
      operator: 'AND' | 'OR';
      values: string[];
    };
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * フロントエンドのUI条件をDiscord Bot用の条件に変換
 *
 * @param uiCondition - フロントエンドの条件
 * @returns Discord Bot用の条件
 */
export function convertUIToBotCondition(
  uiCondition: UINotificationCondition
): BotNotificationCondition {
  const botCondition: BotNotificationCondition = {
    name: uiCondition.name,
    enabled: uiCondition.enabled,
    notifyMinutesBefore: uiCondition.notifyMinutesBefore,
    rules: uiCondition.rules.values,
    matchTypes: uiCondition.matchTypes.values,
    stages: uiCondition.stages.values,
  };

  // イベントマッチ条件がある場合のみ追加
  if (uiCondition.eventMatches.enabled) {
    botCondition.eventMatches = {
      enabled: true,
      eventTypes: uiCondition.eventMatches.eventTypes.values,
      eventStages: uiCondition.eventMatches.eventStages.values,
    };
  }

  return botCondition;
}

/**
 * Discord Bot設定データの型定義
 */
export interface BotSettings {
  conditions: BotNotificationCondition[];
}

/**
 * 通知チェック用のヘルパー型
 */
export interface NotificationCheckContext {
  condition: BotNotificationCondition;
  currentTime: Date;
  tolerance: number; // 許容誤差（ミリ秒）
}
