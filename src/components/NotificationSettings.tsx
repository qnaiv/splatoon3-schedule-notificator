import React, { useState, useEffect } from 'react';
import {
  Plus,
  Settings,
  Bell,
  BellOff,
  Trash2,
  Edit3,
  Save,
  X,
} from 'lucide-react';
import {
  NotificationCondition,
  GAME_RULES,
  MATCH_TYPES,
  GameRule,
  MatchType,
  EventType,
} from '../types';
import { convertUIToBotCondition } from '../types/shared';
import { generateConditionName } from '../utils/conditionNameGenerator';
import { encodeToBase64 } from '../utils';
import { useSettings } from '../hooks/useSettings';
import { useSchedule } from '../hooks/useSchedule';
import { useDataTypes } from '../hooks/useDataTypes';

const NotificationSettings: React.FC = () => {
  const {
    settings,
    loading,
    error,
    addNotificationCondition,
    updateNotificationCondition,
    deleteNotificationCondition,
    toggleNotificationCondition,
  } = useSettings();

  const { allStages } = useSchedule();
  const {
    eventTypes,
    loading: dataTypesLoading,
    error: dataTypesError,
  } = useDataTypes();

  const [showBasicMatchEditor, setShowBasicMatchEditor] = useState(false);
  const [showEventMatchEditor, setShowEventMatchEditor] = useState(false);
  const [editingCondition, setEditingCondition] =
    useState<NotificationCondition | null>(null);

  if (loading || dataTypesLoading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || dataTypesError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">エラー: {error || dataTypesError}</p>
      </div>
    );
  }

  const handleCreateBasicMatch = () => {
    setEditingCondition(null);
    setShowBasicMatchEditor(true);
  };

  const handleCreateEventMatch = () => {
    setEditingCondition(null);
    setShowEventMatchEditor(true);
  };

  const handleEdit = (condition: NotificationCondition) => {
    setEditingCondition(condition);
    if (condition.eventMatches?.enabled) {
      setShowEventMatchEditor(true);
    } else {
      setShowBasicMatchEditor(true);
    }
  };

  const handleGenerateDiscordSettings = () => {
    if (
      !settings?.notificationConditions ||
      settings.notificationConditions.length === 0
    ) {
      alert('まず通知条件を設定してください。');
      return;
    }

    const enabledConditions = settings.notificationConditions.filter(
      (c) => c.enabled
    );
    if (enabledConditions.length === 0) {
      alert('有効な通知条件がありません。');
      return;
    }

    // WebUI形式からDiscord Bot形式に変換
    const botConditions = enabledConditions.map(convertUIToBotCondition);

    const botSettings = {
      conditions: botConditions,
    };

    // UTF-8文字列を安全にBase64エンコード（新しいユーティリティ関数を使用）
    const settingsString = encodeToBase64(botSettings);
    const watchCommand = `/watch settings:${settingsString}`;

    navigator.clipboard
      .writeText(watchCommand)
      .then(() => {
        alert(
          'Discord Botコマンドをクリップボードにコピーしました！\nDiscordにそのまま貼り付けて実行してください。'
        );
      })
      .catch(() => {
        prompt(
          'Discord Botコマンド（コピーしてDiscordで実行してください）:',
          watchCommand
        );
      });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 md:space-y-8">
      {/* ヘッダー */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Settings className="w-8 h-8 text-blue-500" />
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            通知設定
          </h1>
        </div>

        {/* ボタン群 - モバイル対応 */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleGenerateDiscordSettings}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 text-sm md:text-base"
          >
            <Bell className="w-4 h-4" />
            Discord設定生成
          </button>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleCreateBasicMatch}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm md:text-base"
            >
              <Plus className="w-4 h-4" />
              通常マッチ条件を作成
            </button>

            <button
              onClick={handleCreateEventMatch}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm md:text-base"
            >
              <Plus className="w-4 h-4" />
              🎪 イベントマッチ条件を作成
            </button>
          </div>
        </div>
      </div>

      {/* Discord通知の説明 */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="w-5 h-5 text-indigo-600" />
          <h3 className="font-medium text-indigo-800">Discord通知について</h3>
        </div>
        <p className="text-indigo-700 text-sm">
          このアプリで設定した条件をDiscord
          Botに登録すると、指定した条件に基づいて通知を受け取ることができます。
        </p>
        <p className="text-indigo-700 text-sm mb-3">
          通知は、通知条件登録を実行したチャンネルに送信されます。
        </p>

        {/* Bot追加ボタン */}
        <div className="mb-4">
          <a
            href="https://discord.com/oauth2/authorize?client_id=1396430552407740427"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.010c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            DiscordサーバーにBotを追加
          </a>
        </div>

        <div className="text-indigo-700 text-sm space-y-1">
          <p>
            <strong>使用方法:</strong>
          </p>
          <ol className="list-decimal list-inside ml-4 space-y-1">
            <li>上のボタンでBotをDiscordサーバーに追加</li>
            <li>通知条件を設定して有効にする</li>
            <li>「Discord設定生成」ボタンで設定文字列を生成</li>
            <li>Discordで「/watch 設定文字列」コマンドを実行</li>
          </ol>

          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-xs text-yellow-800">
              <strong>⚠️ 通知タイミングについて：</strong>
              <br />
              Discord
              Botは5分間隔で自動チェックを行うため、設定した時刻から±5分程度の誤差が発生する場合があります。
              <br />
              即座に確認したい場合は、Discordで{' '}
              <code className="bg-yellow-100 px-1 rounded">/check</code>{' '}
              コマンドをお使いください。
            </p>
          </div>
        </div>
      </div>

      {/* 既存の通知条件一覧 */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">
          設定済み通知条件
        </h2>

        {!settings?.notificationConditions ||
        settings.notificationConditions.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              まだ通知条件が設定されていません
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <button
                onClick={handleCreateBasicMatch}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                通常マッチ条件を作成
              </button>
              <button
                onClick={handleCreateEventMatch}
                className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
              >
                🎪 イベントマッチ条件を作成
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {settings.notificationConditions.map((condition) => (
              <NotificationConditionCard
                key={condition.id}
                condition={condition}
                onToggle={(enabled) =>
                  toggleNotificationCondition(condition.id, enabled)
                }
                onEdit={() => handleEdit(condition)}
                onDelete={() => deleteNotificationCondition(condition.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 通常マッチ条件編集モーダル */}
      {showBasicMatchEditor && (
        <BasicMatchConditionEditor
          condition={editingCondition}
          allStages={allStages}
          onSave={async (conditionData) => {
            try {
              if (editingCondition) {
                await updateNotificationCondition(
                  editingCondition.id,
                  conditionData
                );
              } else {
                await addNotificationCondition(conditionData);
              }
              setShowBasicMatchEditor(false);
              setEditingCondition(null);
            } catch (err) {
              console.error('Failed to save condition:', err);
              alert('保存に失敗しました。');
            }
          }}
          onCancel={() => {
            setShowBasicMatchEditor(false);
            setEditingCondition(null);
          }}
        />
      )}

      {/* イベントマッチ条件編集モーダル */}
      {showEventMatchEditor && (
        <EventMatchConditionEditor
          condition={editingCondition}
          allStages={allStages}
          eventTypes={eventTypes}
          onSave={async (conditionData) => {
            try {
              if (editingCondition) {
                await updateNotificationCondition(
                  editingCondition.id,
                  conditionData
                );
              } else {
                await addNotificationCondition(conditionData);
              }
              setShowEventMatchEditor(false);
              setEditingCondition(null);
            } catch (err) {
              console.error('Failed to save condition:', err);
              alert('保存に失敗しました。');
            }
          }}
          onCancel={() => {
            setShowEventMatchEditor(false);
            setEditingCondition(null);
          }}
        />
      )}
    </div>
  );
};

// 通知条件カードコンポーネント
interface NotificationConditionCardProps {
  condition: NotificationCondition;
  onToggle: (enabled: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}

const NotificationConditionCard: React.FC<NotificationConditionCardProps> = ({
  condition,
  onToggle,
  onEdit,
  onDelete,
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete();
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  return (
    <div
      className={`border rounded-lg p-4 ${condition.enabled ? 'bg-white border-blue-200' : 'bg-gray-50 border-gray-200'}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => onToggle(!condition.enabled)}
              className={`p-1 rounded ${condition.enabled ? 'text-blue-500' : 'text-gray-400'}`}
            >
              {condition.enabled ? (
                <Bell className="w-5 h-5" />
              ) : (
                <BellOff className="w-5 h-5" />
              )}
            </button>
            <h3
              className={`font-medium ${condition.enabled ? 'text-gray-800' : 'text-gray-500'}`}
            >
              {condition.name}
            </h3>
          </div>

          <div className="ml-8 space-y-1 text-sm">
            <p
              className={condition.enabled ? 'text-gray-600' : 'text-gray-400'}
            >
              <span className="font-medium">通知タイミング:</span>{' '}
              {condition.notifyMinutesBefore}分前
            </p>

            {condition.rules.values.length > 0 && (
              <p
                className={
                  condition.enabled ? 'text-gray-600' : 'text-gray-400'
                }
              >
                <span className="font-medium">ルール:</span>{' '}
                {condition.rules.values.join(`, `)}
              </p>
            )}

            {condition.matchTypes.values.length > 0 && (
              <p
                className={
                  condition.enabled ? 'text-gray-600' : 'text-gray-400'
                }
              >
                <span className="font-medium">マッチタイプ:</span>{' '}
                {condition.matchTypes.values.join(`, `)}
              </p>
            )}

            {condition.stages.values.length > 0 && (
              <p
                className={
                  condition.enabled ? 'text-gray-600' : 'text-gray-400'
                }
              >
                <span className="font-medium">ステージ:</span>{' '}
                {condition.stages.values.length}件選択
              </p>
            )}

            {condition.eventMatches?.enabled && (
              <p
                className={
                  condition.enabled ? 'text-gray-600' : 'text-gray-400'
                }
              >
                <span className="font-medium">🎪 イベントマッチ:</span> 有効
                {condition.eventMatches.eventTypes.values.length > 0 &&
                  ` (${condition.eventMatches.eventTypes.values.length}イベント)`}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-blue-500 rounded"
          >
            <Edit3 className="w-4 h-4" />
          </button>

          <button
            onClick={handleDelete}
            className={`p-2 rounded ${confirmDelete ? 'text-red-600 bg-red-50' : 'text-gray-400 hover:text-red-500'}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {confirmDelete && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          もう一度クリックすると削除されます
        </div>
      )}
    </div>
  );
};

// 通常マッチ条件編集モーダル
interface BasicMatchConditionEditorProps {
  condition: NotificationCondition | null;
  allStages: Array<{ id: string; name: string }>;
  onSave: (
    condition: Omit<NotificationCondition, 'id' | 'createdAt' | 'updatedAt'>
  ) => void;
  onCancel: () => void;
}

const BasicMatchConditionEditor: React.FC<BasicMatchConditionEditorProps> = ({
  condition,
  allStages,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState(() => ({
    name: condition?.name || '',
    enabled: condition?.enabled ?? true,
    stages: condition?.stages || { operator: 'OR' as const, values: [] },
    rules: condition?.rules || { operator: 'OR' as const, values: [] },
    matchTypes: condition?.matchTypes || {
      operator: 'OR' as const,
      values: [],
    },
    eventMatches: {
      enabled: false,
      eventTypes: { operator: 'OR' as const, values: [] },
      eventStages: { operator: 'OR' as const, values: [] },
    },
    notifyMinutesBefore: condition?.notifyMinutesBefore || 10,
  }));

  const [isNameManuallyEdited, setIsNameManuallyEdited] = useState(false);

  // 新規作成時のみ条件変更に応じて条件名を自動生成
  useEffect(() => {
    if (!isNameManuallyEdited && !condition) {
      // 新規作成時のみ
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
    condition,
    allStages,
  ]);

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

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsNameManuallyEdited(true);
    setFormData({ ...formData, name: e.target.value });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-blue-600">
              {condition
                ? '通常マッチ条件を編集'
                : '新しい通常マッチ条件を作成'}
            </h2>
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

// イベントマッチ条件編集モーダル
export interface EventMatchConditionEditorProps {
  condition: NotificationCondition | null;
  allStages: Array<{ id: string; name: string }>;
  eventTypes: string[];
  onSave: (
    condition: Omit<NotificationCondition, 'id' | 'createdAt' | 'updatedAt'>
  ) => void;
  onCancel: () => void;
}

export const EventMatchConditionEditor: React.FC<
  EventMatchConditionEditorProps
> = ({ condition, allStages, eventTypes, onSave, onCancel }) => {
  const [formData, setFormData] = useState(() => ({
    name: condition?.name || '',
    enabled: condition?.enabled ?? true,
    stages: { operator: 'OR' as const, values: [] },
    rules: { operator: 'OR' as const, values: [] },
    matchTypes: {
      operator: 'OR' as const,
      values: ['イベントマッチ'] as MatchType[],
    },
    eventMatches: condition?.eventMatches || {
      enabled: true,
      eventTypes: { operator: 'OR' as const, values: [] },
      eventStages: { operator: 'OR' as const, values: [] },
    },
    notifyMinutesBefore: condition?.notifyMinutesBefore || 10,
  }));

  const handleSave = () => {
    if (!formData.name.trim()) {
      alert('条件名を入力してください');
      return;
    }

    if (
      formData.eventMatches.eventTypes.values.length === 0 &&
      formData.eventMatches.eventStages.values.length === 0
    ) {
      alert('少なくとも一つのイベント条件を設定してください');
      return;
    }

    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-purple-600">
              🎪{' '}
              {condition
                ? 'イベントマッチ条件を編集'
                : '新しいイベントマッチ条件を作成'}
            </h2>
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
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full border rounded-lg px-3 py-2"
                placeholder="例: フェス＋好きなステージ"
              />
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

            {/* イベントタイプ選択 */}
            <ConditionSection
              title="イベント"
              options={eventTypes.map((type) => ({
                id: type,
                name: type,
              }))}
              selectedValues={formData.eventMatches.eventTypes.values}
              operator={formData.eventMatches.eventTypes.operator}
              onSelectionChange={(values) =>
                setFormData({
                  ...formData,
                  eventMatches: {
                    ...formData.eventMatches,
                    eventTypes: {
                      ...formData.eventMatches.eventTypes,
                      values: values as EventType[],
                    },
                  },
                })
              }
              onOperatorChange={(operator) =>
                setFormData({
                  ...formData,
                  eventMatches: {
                    ...formData.eventMatches,
                    eventTypes: {
                      ...formData.eventMatches.eventTypes,
                      operator,
                    },
                  },
                })
              }
            />

            {/* イベントステージ選択 */}
            <ConditionSection
              title="イベントステージ"
              options={allStages}
              selectedValues={formData.eventMatches.eventStages.values}
              operator={formData.eventMatches.eventStages.operator}
              onSelectionChange={(values) =>
                setFormData({
                  ...formData,
                  eventMatches: {
                    ...formData.eventMatches,
                    eventStages: {
                      ...formData.eventMatches.eventStages,
                      values,
                    },
                  },
                })
              }
              onOperatorChange={(operator) =>
                setFormData({
                  ...formData,
                  eventMatches: {
                    ...formData.eventMatches,
                    eventStages: {
                      ...formData.eventMatches.eventStages,
                      operator,
                    },
                  },
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
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
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

// 条件選択セクション
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

  return (
    <div>
      <div className="flex items-center gap-4 mb-3">
        <label className="text-sm font-medium">{title}</label>
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

export default NotificationSettings;
