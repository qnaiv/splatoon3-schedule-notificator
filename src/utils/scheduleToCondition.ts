import {
  ScheduleMatch,
  NotificationCondition,
  GameRule,
  MatchType,
} from '../types';
import { generateConditionName } from './conditionNameGenerator';

/**
 * スケジュールマッチから通知条件データを生成する
 */
export const scheduleToCondition = (
  match: ScheduleMatch
): Partial<NotificationCondition> => {
  const stageIds = match.stages.map((stage) => stage.id);
  const stageNames = match.stages.map((stage) => stage.name);
  const ruleName = match.rule.name as GameRule;
  const matchType = match.match_type as MatchType;

  // 条件名を自動生成
  const conditionName = generateConditionName({
    rules: [ruleName],
    matchTypes: matchType ? [matchType] : [],
    stages: stageNames,
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
      values: matchType ? [matchType] : [],
    },
    eventMatches: {
      enabled: false,
      eventTypes: { operator: 'OR', values: [] },
      eventStages: { operator: 'OR', values: [] },
    },
    notifyMinutesBefore: 10, // デフォルトの通知タイミング
  };

  return condition;
};
