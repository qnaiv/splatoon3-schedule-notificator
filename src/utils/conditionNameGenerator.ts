import {
  RULE_ABBREVIATIONS,
  MATCH_TYPE_ABBREVIATIONS,
  STAGE_ABBREVIATIONS,
} from '../constants/abbreviations';

export interface GenerateConditionNameParams {
  rules: string[];
  matchTypes: string[];
  stages: string[];
  eventName?: string;
}

/**
 * 通知条件の設定内容から条件名を自動生成する
 * フォーマット: 「ルール,マッチタイプ,ステージ」
 * - 複数項目は同じ種類内でスラッシュ区切り
 * - 異なる種類間はカンマ区切り
 * - レギュラーマッチは表示しない
 * - イベントマッチの場合はイベント名を前に付ける
 */
export function generateConditionName({
  rules,
  matchTypes,
  stages,
  eventName,
}: GenerateConditionNameParams): string {
  const parts: string[] = [];

  // イベント名がある場合は最初に追加
  if (eventName) {
    parts.push(eventName);
  }

  // ルール部分を追加
  if (rules.length > 0) {
    const ruleAbbrevs = rules
      .map((rule) => RULE_ABBREVIATIONS[rule] || rule)
      .join('/');
    parts.push(ruleAbbrevs);
  }

  // マッチタイプ部分を追加（レギュラーマッチ以外）
  if (matchTypes.length > 0) {
    const matchAbbrevs = matchTypes
      .map((type) => MATCH_TYPE_ABBREVIATIONS[type] || type)
      .filter((abbrev) => abbrev !== '') // 空文字（レギュラー）を除外
      .join('/');
    if (matchAbbrevs) {
      parts.push(matchAbbrevs);
    }
  }

  // ステージ部分を追加
  if (stages.length > 0) {
    const stageAbbrevs = stages
      .map((stage) => STAGE_ABBREVIATIONS[stage] || stage)
      .join('/');
    parts.push(stageAbbrevs);
  }

  return parts.join(',');
}
