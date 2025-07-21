import React, { useState } from 'react';
import { Plus, Settings, Bell, BellOff, Trash2, Edit3, Save, X } from 'lucide-react';
import { NotificationCondition, GAME_RULES, MATCH_TYPES, GameRule, MatchType } from '../types';
import { useSettings } from '../hooks/useSettings';
import { useSchedule } from '../hooks/useSchedule';

const NotificationSettings: React.FC = () => {
  const { 
    settings, 
    loading, 
    error, 
    addNotificationCondition, 
    updateNotificationCondition, 
    deleteNotificationCondition, 
    toggleNotificationCondition
  } = useSettings();
  
  const { allStages } = useSchedule();
  
  const [showEditor, setShowEditor] = useState(false);
  const [editingCondition, setEditingCondition] = useState<NotificationCondition | null>(null);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">エラー: {error}</p>
      </div>
    );
  }

  const handleCreateNew = () => {
    setEditingCondition(null);
    setShowEditor(true);
  };

  const handleEdit = (condition: NotificationCondition) => {
    setEditingCondition(condition);
    setShowEditor(true);
  };

  const handleGenerateDiscordSettings = () => {
    if (!settings?.notificationConditions || settings.notificationConditions.length === 0) {
      alert('まず通知条件を設定してください。');
      return;
    }
    
    const enabledConditions = settings.notificationConditions.filter(c => c.enabled);
    if (enabledConditions.length === 0) {
      alert('有効な通知条件がありません。');
      return;
    }
    
    const botSettings = {
      conditions: enabledConditions
    };
    
    const settingsString = btoa(unescape(encodeURIComponent(JSON.stringify(botSettings))));
    navigator.clipboard.writeText(settingsString).then(() => {
      alert('Discord Bot用の設定文字列をクリップボードにコピーしました！\nDiscordで「/watch」コマンドと一緒に使用してください。');
    }).catch(() => {
      prompt('Discord Bot用の設定文字列（コピーしてDiscordで使用してください）:', settingsString);
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="w-8 h-8 text-blue-500" />
          <h1 className="text-3xl font-bold text-gray-800">通知設定</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateDiscordSettings}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
          >
            <Bell className="w-4 h-4" />
            Discord設定生成
          </button>
          
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <Plus className="w-4 h-4" />
            新規作成
          </button>
        </div>
      </div>

      {/* Discord通知の説明 */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="w-5 h-5 text-indigo-600" />
          <h3 className="font-medium text-indigo-800">Discord通知について</h3>
        </div>
        <p className="text-indigo-700 text-sm mb-2">
          このアプリで設定した条件をDiscord Botで使用できます。
        </p>
        <div className="text-indigo-700 text-sm space-y-1">
          <p><strong>使用方法:</strong></p>
          <ol className="list-decimal list-inside ml-4 space-y-1">
            <li>通知条件を設定して有効にする</li>
            <li>「Discord設定生成」ボタンで設定文字列を生成</li>
            <li>Discordで「/watch 設定文字列」コマンドを実行</li>
          </ol>
        </div>
      </div>

      {/* 既存の通知条件一覧 */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">設定済み通知条件</h2>
        
        {!settings?.notificationConditions || settings.notificationConditions.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">まだ通知条件が設定されていません</p>
            <button
              onClick={handleCreateNew}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              最初の条件を作成
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {settings.notificationConditions.map((condition) => (
              <NotificationConditionCard
                key={condition.id}
                condition={condition}
                onToggle={(enabled) => toggleNotificationCondition(condition.id, enabled)}
                onEdit={() => handleEdit(condition)}
                onDelete={() => deleteNotificationCondition(condition.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 条件編集モーダル */}
      {showEditor && (
        <NotificationConditionEditor
          condition={editingCondition}
          allStages={allStages}
          onSave={async (conditionData) => {
            try {
              if (editingCondition) {
                await updateNotificationCondition(editingCondition.id, conditionData);
              } else {
                await addNotificationCondition(conditionData);
              }
              setShowEditor(false);
              setEditingCondition(null);
            } catch (err) {
              console.error('Failed to save condition:', err);
              alert('保存に失敗しました。');
            }
          }}
          onCancel={() => {
            setShowEditor(false);
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
  onDelete
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
    <div className={`border rounded-lg p-4 ${condition.enabled ? 'bg-white border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => onToggle(!condition.enabled)}
              className={`p-1 rounded ${condition.enabled ? 'text-blue-500' : 'text-gray-400'}`}
            >
              {condition.enabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
            </button>
            <h3 className={`font-medium ${condition.enabled ? 'text-gray-800' : 'text-gray-500'}`}>
              {condition.name}
            </h3>
          </div>
          
          <div className="ml-8 space-y-1 text-sm">
            <p className={condition.enabled ? 'text-gray-600' : 'text-gray-400'}>
              <span className="font-medium">通知タイミング:</span> {condition.notifyMinutesBefore}分前
            </p>
            
            {condition.rules.values.length > 0 && (
              <p className={condition.enabled ? 'text-gray-600' : 'text-gray-400'}>
                <span className="font-medium">ルール:</span> {condition.rules.values.join(`, `)}
              </p>
            )}
            
            {condition.matchTypes.values.length > 0 && (
              <p className={condition.enabled ? 'text-gray-600' : 'text-gray-400'}>
                <span className="font-medium">マッチタイプ:</span> {condition.matchTypes.values.join(`, `)}
              </p>
            )}
            
            {condition.stages.values.length > 0 && (
              <p className={condition.enabled ? 'text-gray-600' : 'text-gray-400'}>
                <span className="font-medium">ステージ:</span> {condition.stages.values.length}件選択
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

// 通知条件編集モーダル
interface NotificationConditionEditorProps {
  condition: NotificationCondition | null;
  allStages: Array<{ id: string; name: string }>;
  onSave: (condition: Omit<NotificationCondition, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

const NotificationConditionEditor: React.FC<NotificationConditionEditorProps> = ({
  condition,
  allStages,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState(() => ({
    name: condition?.name || '',
    enabled: condition?.enabled ?? true,
    stages: condition?.stages || { operator: 'OR' as const, values: [] },
    rules: condition?.rules || { operator: 'OR' as const, values: [] },
    matchTypes: condition?.matchTypes || { operator: 'OR' as const, values: [] },
    notifyMinutesBefore: condition?.notifyMinutesBefore || 15
  }));

  const handleSave = () => {
    if (!formData.name.trim()) {
      alert('条件名を入力してください');
      return;
    }
    
    if (formData.rules.values.length === 0 && 
        formData.matchTypes.values.length === 0 && 
        formData.stages.values.length === 0) {
      alert('少なくとも一つの条件を設定してください');
      return;
    }
    
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">
              {condition ? '通知条件を編集' : '新しい通知条件を作成'}
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
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="例: ガチホコ＋お気に入りステージ"
              />
            </div>

            {/* 通知タイミング */}
            <div>
              <label className="block text-sm font-medium mb-2">通知タイミング</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={formData.notifyMinutesBefore}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    notifyMinutesBefore: parseInt(e.target.value) || 15 
                  })}
                  className="w-20 border rounded px-3 py-2"
                />
                <span className="text-sm">分前に通知</span>
              </div>
            </div>

            {/* ルール選択 */}
            <ConditionSection
              title="ルール"
              options={GAME_RULES.map(rule => ({ id: rule, name: rule }))}
              selectedValues={formData.rules.values}
              operator={formData.rules.operator}
              onSelectionChange={(values) => 
                setFormData({ ...formData, rules: { ...formData.rules, values: values as GameRule[] } })
              }
              onOperatorChange={(operator) => 
                setFormData({ ...formData, rules: { ...formData.rules, operator } })
              }
            />

            {/* マッチタイプ選択 */}
            <ConditionSection
              title="マッチタイプ"
              options={MATCH_TYPES.map(type => ({ id: type, name: type }))}
              selectedValues={formData.matchTypes.values}
              operator={formData.matchTypes.operator}
              onSelectionChange={(values) => 
                setFormData({ ...formData, matchTypes: { ...formData.matchTypes, values: values as MatchType[] } })
              }
              onOperatorChange={(operator) => 
                setFormData({ ...formData, matchTypes: { ...formData.matchTypes, operator } })
              }
            />

            {/* ステージ選択 */}
            <ConditionSection
              title="ステージ"
              options={allStages}
              selectedValues={formData.stages.values}
              operator={formData.stages.operator}
              onSelectionChange={(values) => 
                setFormData({ ...formData, stages: { ...formData.stages, values } })
              }
              onOperatorChange={(operator) => 
                setFormData({ ...formData, stages: { ...formData.stages, operator } })
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
  isGrid = false
}) => {
  const handleToggle = (id: string) => {
    if (selectedValues.includes(id)) {
      onSelectionChange(selectedValues.filter(v => v !== id));
    } else {
      onSelectionChange([...selectedValues, id]);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-3">
        <label className="text-sm font-medium">{title}</label>
      </div>
      
      <div className={isGrid ? 'grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3' : 'space-y-2'}>
        {options.map(option => (
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