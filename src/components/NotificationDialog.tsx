import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import {
  NotificationCondition,
  GAME_RULES,
  MATCH_TYPES,
  GameRule,
  MatchType,
} from '../types';
import { generateConditionName } from '../utils/conditionNameGenerator';

interface NotificationDialogProps {
  isOpen: boolean;
  initialCondition?: Partial<NotificationCondition>;
  allStages: Array<{ id: string; name: string }>;
  onSave: (
    condition: Omit<NotificationCondition, 'id' | 'createdAt' | 'updatedAt'>
  ) => void;
  onCancel: () => void;
}

// 条件選択セクションコンポーネント
interface ConditionSectionProps {
  title: string;
  options: Array<{ id: string; name: string }>;
  selectedValues: string[];
  operator: 'AND' | 'OR';
  onSelectionChange: (values: string[]) => void;
  onOperatorChange: (operator: 'AND' | 'OR') => void;
  isGrid?: boolean;
}

const ConditionSection: React.FC<ConditionSectionProps> = ({
  title,
  options,
  selectedValues,
  onSelectionChange,
  isGrid = false,
}) => {
  const handleToggle = (id: string) => {
    if (selectedValues.includes(id)) {
      onSelectionChange(selectedValues.filter((v) => v !== id));
    } else {
      onSelectionChange([...selectedValues, id]);
    }
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-3">
        <label className="text-sm font-medium">{title}</label>
        {selectedValues.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-xs text-blue-500 hover:text-blue-700 underline"
          >
            全て外す
          </button>
        )}
      </div>
      <div
        className={
          isGrid
            ? 'grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3'
            : 'space-y-2'
        }
      >
        {options.map((option) => (
          <label key={option.id} className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedValues.includes(option.id)}
              onChange={() => handleToggle(option.id)}
            />
            <span className="text-sm">{option.name}</span>
          </label>
        ))}
      </div>
      {selectedValues.length > 0 && (
        <p className="text-xs text-gray-500 mt-2">
          {selectedValues.length}件選択中 (いずれかを含む)
        </p>
      )}
    </div>
  );
};

const NotificationDialog: React.FC<NotificationDialogProps> = ({
  isOpen,
  initialCondition,
  allStages,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState(() => ({
    name: initialCondition?.name || '',
    enabled: initialCondition?.enabled ?? true,
    stages: initialCondition?.stages || { operator: 'OR' as const, values: [] },
    rules: initialCondition?.rules || { operator: 'OR' as const, values: [] },
    matchTypes: initialCondition?.matchTypes || {
      operator: 'OR' as const,
      values: [],
    },
    eventMatches: initialCondition?.eventMatches || {
      enabled: false,
      eventTypes: { operator: 'OR' as const, values: [] },
      eventStages: { operator: 'OR' as const, values: [] },
    },
    notifyMinutesBefore: initialCondition?.notifyMinutesBefore || 10,
  }));

  const [isNameManuallyEdited, setIsNameManuallyEdited] = useState(false);

  // initialCondition が変更されたときにフォームデータを再初期化
  useEffect(() => {
    setFormData({
      name: initialCondition?.name || '',
      enabled: initialCondition?.enabled ?? true,
      stages: initialCondition?.stages || {
        operator: 'OR' as const,
        values: [],
      },
      rules: initialCondition?.rules || { operator: 'OR' as const, values: [] },
      matchTypes: initialCondition?.matchTypes || {
        operator: 'OR' as const,
        values: [],
      },
      eventMatches: initialCondition?.eventMatches || {
        enabled: false,
        eventTypes: { operator: 'OR' as const, values: [] },
        eventStages: { operator: 'OR' as const, values: [] },
      },
      notifyMinutesBefore: initialCondition?.notifyMinutesBefore || 10,
    });
    setIsNameManuallyEdited(false);
  }, [initialCondition]);

  // 初期データがある場合（スケジュールから作成時）のみ条件変更に応じて条件名を自動生成
  useEffect(() => {
    if (!isNameManuallyEdited && initialCondition) {
      const autoName = generateConditionName({
        rules: formData.rules.values,
        matchTypes: formData.matchTypes.values,
        stages: formData.stages.values.map((stageId) => {
          const stage = allStages.find((s) => s.id === stageId);
          return stage?.name || stageId;
        }),
      });
      setFormData((prev) => ({ ...prev, name: autoName }));
    }
  }, [
    formData.rules.values,
    formData.matchTypes.values,
    formData.stages.values,
    isNameManuallyEdited,
    initialCondition,
    allStages,
  ]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsNameManuallyEdited(true);
    setFormData({ ...formData, name: e.target.value });
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      alert('条件名を入力してください');
      return;
    }

    if (
      formData.rules.values.length === 0 &&
      formData.matchTypes.values.length === 0 &&
      formData.stages.values.length === 0
    ) {
      alert('少なくとも一つの条件を設定してください');
      return;
    }

    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-blue-600">通知条件を作成</h2>
            <button
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-600 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            {/* 条件名 */}
            <div>
              <label className="block text-sm font-medium mb-2">条件名 *</label>
              <input
                type="text"
                value={formData.name}
                onChange={handleNameChange}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="例: ガチホコバトル＋お気に入りステージ"
              />
              {initialCondition && (
                <p className="text-xs text-gray-500 mt-1">
                  スケジュールから自動で生成されました。必要に応じて変更してください。
                </p>
              )}
            </div>

            {/* 通知タイミング */}
            <div>
              <label className="block text-sm font-medium mb-2">
                通知タイミング
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={formData.notifyMinutesBefore}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      notifyMinutesBefore: parseInt(e.target.value),
                    })
                  }
                  className="border rounded px-3 py-2"
                >
                  <option value={10}>10分前</option>
                  <option value={30}>30分前</option>
                  <option value={60}>1時間前</option>
                  <option value={240}>4時間前</option>
                  <option value={1440}>24時間前</option>
                </select>
                <span className="text-sm text-gray-600">に通知</span>
              </div>
            </div>

            {/* ルール選択 */}
            <ConditionSection
              title="ルール"
              options={GAME_RULES.map((rule) => ({
                id: rule,
                name: rule,
              }))}
              selectedValues={formData.rules.values}
              operator={formData.rules.operator}
              onSelectionChange={(values) =>
                setFormData({
                  ...formData,
                  rules: {
                    ...formData.rules,
                    values: values as GameRule[],
                  },
                })
              }
              onOperatorChange={(operator) =>
                setFormData({
                  ...formData,
                  rules: { ...formData.rules, operator },
                })
              }
            />

            {/* マッチタイプ選択 */}
            <ConditionSection
              title="マッチタイプ"
              options={MATCH_TYPES.filter(
                (type) => type !== 'イベントマッチ'
              ).map((type) => ({ id: type, name: type }))}
              selectedValues={formData.matchTypes.values}
              operator={formData.matchTypes.operator}
              onSelectionChange={(values) =>
                setFormData({
                  ...formData,
                  matchTypes: {
                    ...formData.matchTypes,
                    values: values as MatchType[],
                  },
                })
              }
              onOperatorChange={(operator) =>
                setFormData({
                  ...formData,
                  matchTypes: { ...formData.matchTypes, operator },
                })
              }
            />

            {/* ステージ選択 */}
            <ConditionSection
              title="ステージ"
              options={allStages}
              selectedValues={formData.stages.values}
              operator={formData.stages.operator}
              onSelectionChange={(values) =>
                setFormData({
                  ...formData,
                  stages: { ...formData.stages, values },
                })
              }
              onOperatorChange={(operator) =>
                setFormData({
                  ...formData,
                  stages: { ...formData.stages, operator },
                })
              }
              isGrid={true}
            />
          </div>

          {/* ボタン */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
            <button
              onClick={onCancel}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <Save className="w-4 h-4" />
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationDialog;
