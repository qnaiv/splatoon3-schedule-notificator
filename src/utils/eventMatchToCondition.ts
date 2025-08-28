import { EventMatch, NotificationCondition, MatchType } from '../types';

/**
 * イベントマッチから通知条件データを生成する
 */
export const eventMatchToCondition = (
  match: EventMatch
): Partial<NotificationCondition> => {
  const eventName = match.event.name;

  // 条件名を自動生成（イベント名のみ）
  const conditionName = eventName;

  const condition: Partial<NotificationCondition> = {
    name: conditionName,
    enabled: true,
    stages: {
      operator: 'OR',
      values: [], // イベントマッチでは通常のステージは使わない
    },
    rules: {
      operator: 'OR',
      values: [], // イベントマッチでは通常のルールは使わない
    },
    matchTypes: {
      operator: 'OR',
      values: ['イベントマッチ' as MatchType],
    },
    eventMatches: {
      enabled: true,
      eventTypes: {
        operator: 'OR',
        values: [eventName],
      },
      eventStages: {
        operator: 'OR',
        values: [], // イベントステージは選択しない
      },
    },
    notifyMinutesBefore: 10, // デフォルトの通知タイミング
  };

  return condition;
};
