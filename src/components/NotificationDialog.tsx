import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { NotificationCondition } from '../types';

interface NotificationDialogProps {
  isOpen: boolean;
  initialCondition?: Partial<NotificationCondition>;
  allStages: Array<{ id: string; name: string }>;
  onSave: (
    condition: Omit<NotificationCondition, 'id' | 'createdAt' | 'updatedAt'>
  ) => void;
  onCancel: () => void;
}

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
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full border rounded-lg px-3 py-2"
                placeholder="例: ガチホコバトル＋お気に入りステージ"
              />
              <p className="text-xs text-gray-500 mt-1">
                スケジュールから自動で生成されました。必要に応じて変更してください。
              </p>
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

            {/* 選択されている条件の表示 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-800 mb-3">
                選択されている条件
              </h3>

              {formData.rules.values.length > 0 && (
                <div className="mb-2">
                  <span className="text-sm font-medium text-blue-700">
                    ルール:{' '}
                  </span>
                  <span className="text-sm text-blue-600">
                    {formData.rules.values.join(', ')}
                  </span>
                </div>
              )}

              {formData.matchTypes.values.length > 0 && (
                <div className="mb-2">
                  <span className="text-sm font-medium text-blue-700">
                    マッチタイプ:{' '}
                  </span>
                  <span className="text-sm text-blue-600">
                    {formData.matchTypes.values.join(', ')}
                  </span>
                </div>
              )}

              {formData.stages.values.length > 0 && (
                <div className="mb-2">
                  <span className="text-sm font-medium text-blue-700">
                    ステージ:{' '}
                  </span>
                  <span className="text-sm text-blue-600">
                    {formData.stages.values
                      .map((stageId) => {
                        const stage = allStages.find((s) => s.id === stageId);
                        return stage?.name || stageId;
                      })
                      .join(', ')}
                  </span>
                </div>
              )}

              <div className="mt-3 text-xs text-blue-600">
                この条件でスケジュールがマッチした場合、
                {formData.notifyMinutesBefore}分前に通知されます。
              </div>
            </div>

            {/* 条件を編集したい場合のメッセージ */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                <strong>💡 条件を詳細に編集したい場合</strong>
                <br />
                この条件を保存した後、Discord設定タブで詳細な編集ができます。
              </p>
            </div>
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
              通知条件を保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationDialog;
