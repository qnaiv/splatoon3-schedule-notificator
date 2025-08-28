import {
  EventMatch,
  NotificationCondition,
  GameRule,
  MatchType,
} from '../types';
import { generateConditionName } from './conditionNameGenerator';

/**
 * イベントマッチから通知条件データを生成する
 */
export const eventMatchToCondition = (
  match: EventMatch
): Partial<NotificationCondition> => {
  const stageIds = match.stages.map((stage) => stage.id);
  const stageNames = match.stages.map((stage) => stage.name);
  const ruleName = match.rule.name as GameRule;
  const eventName = match.event.name;

  // 条件名を自動生成（イベント情報を含める）
  const conditionName = generateConditionName({
    rules: [ruleName],
    matchTypes: ['イベントマッチ'],
    stages: stageNames,
    eventName: eventName,
  });

  const condition: Partial<NotificationCondition> = {
    name: conditionName,
    enabled: true,
    stages: {
      operator: 'OR',
      values: stageIds,
    },
    rules: {
      operator: 'OR',
      values: [ruleName],
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
        values: stageIds,
      },
    },
    notifyMinutesBefore: 10, // デフォルトの通知タイミング
  };

  return condition;
};
