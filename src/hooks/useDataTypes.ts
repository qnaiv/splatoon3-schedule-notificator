import { useState, useEffect } from 'react';
import { loadEventTypes, loadStageTypes } from '../utils';

/**
 * イベントタイプとステージタイプをテキストファイルから動的に読み込むカスタムフック
 */
export const useDataTypes = () => {
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [stageTypes, setStageTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [loadedEventTypes, loadedStageTypes] = await Promise.all([
          loadEventTypes(),
          loadStageTypes(),
        ]);

        setEventTypes(loadedEventTypes);
        setStageTypes(loadedStageTypes);
      } catch (err) {
        console.error('Failed to load data types:', err);
        setError(
          err instanceof Error ? err.message : 'データの読み込みに失敗しました'
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return {
    eventTypes,
    stageTypes,
    loading,
    error,
  };
};
