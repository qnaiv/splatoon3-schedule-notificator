import { useState, useEffect, useCallback } from 'react';
import { Spla3ApiResponse, ScheduleMatch, Stage } from '../types';

// 環境別API設定
const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || 
    (import.meta.env.PROD 
      ? 'https://qnaiv.github.io/splatoon3-schedule-notificator' 
      : 'http://localhost:3000'),
  scheduleEndpoint: '/api/schedule.json',
  currentEndpoint: '/api/current.json'
};

export const useSchedule = () => {
  const [scheduleData, setScheduleData] = useState<Spla3ApiResponse | null>(null);
  const [currentMatches, setCurrentMatches] = useState<ScheduleMatch[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<ScheduleMatch[]>([]);
  const [allStages, setAllStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // スケジュールデータ取得
  const fetchScheduleData = useCallback(async (): Promise<Spla3ApiResponse | null> => {
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.scheduleEndpoint}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch schedule: ${response.status} ${response.statusText}`);
      }

      const data: Spla3ApiResponse = await response.json();
      
      // API レスポンスの構造を確認
      console.log('API Response structure:', {
        hasResult: !!data.data?.result,
        resultKeys: data.data?.result ? Object.keys(data.data.result) : [],
        xMatchExists: !!data.data?.result?.x,
        xMatchLength: data.data?.result?.x?.length || 0
      });
      
      return data;
    } catch (err) {
      console.error('Failed to fetch schedule:', err);
      throw err;
    }
  }, []);


  // 全データから現在のマッチを抽出
  const getCurrentMatchesFromFull = useCallback((matches: ScheduleMatch[]): ScheduleMatch[] => {
    const now = new Date();
    return matches.filter(match => {
      const start = new Date(match.start_time);
      const end = new Date(match.end_time);
      return now >= start && now <= end;
    });
  }, []);

  // 今後のマッチを抽出
  const getUpcomingMatches = useCallback((matches: ScheduleMatch[]): ScheduleMatch[] => {
    const now = new Date();
    return matches
      .filter(match => {
        const start = new Date(match.start_time);
        return start > now;
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      .slice(0, 20); // 直近20件
  }, []);

  // 全ステージを抽出
  const extractAllStages = useCallback((matches: ScheduleMatch[]): Stage[] => {
    const stageMap = new Map<string, Stage>();
    
    matches.forEach(match => {
      match.stages.forEach(stage => {
        if (!stageMap.has(stage.id)) {
          stageMap.set(stage.id, stage);
        }
      });
    });
    
    return Array.from(stageMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  // データ更新
  const updateScheduleData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 全スケジュールデータ取得
      const data = await fetchScheduleData();
      if (!data) {
        throw new Error('No data received');
      }

      setScheduleData(data);
      setLastUpdated(data.lastUpdated);

      // データの存在確認
      const result = data.data?.result;
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid API response: result object is missing or invalid');
      }
      
      // 全マッチデータを統合（マッチタイプを設定）
      const allMatches: ScheduleMatch[] = [
        ...(result.regular || []).map(match => ({ ...match, match_type: 'レギュラーマッチ' })),
        ...(result.bankara_challenge || []).map(match => ({ ...match, match_type: 'バンカラマッチ(チャレンジ)' })),
        ...(result.bankara_open || []).map(match => ({ ...match, match_type: 'バンカラマッチ(オープン)' })),
        ...(result.x || []).map(match => ({ ...match, match_type: 'Xマッチ' }))
      ];

      // 現在のマッチ抽出
      const current = getCurrentMatchesFromFull(allMatches);
      setCurrentMatches(current);

      // 今後のマッチ抽出
      const upcoming = getUpcomingMatches(allMatches);
      setUpcomingMatches(upcoming);

      // 全ステージ抽出
      const stages = extractAllStages(allMatches);
      setAllStages(stages);

      console.log('Schedule data updated:', {
        totalMatches: allMatches.length,
        currentMatches: current.length,
        upcomingMatches: upcoming.length,
        totalStages: stages.length,
        lastUpdated: data.lastUpdated,
        dataBreakdown: {
          regular: (result.regular || []).length,
          bankara_challenge: (result.bankara_challenge || []).length,
          bankara_open: (result.bankara_open || []).length,
          x: (result.x || []).length
        },
        sampleMatches: allMatches.slice(0, 3).map(m => ({ 
          match_type: m.match_type, 
          rule: m.rule.name,
          start_time: m.start_time 
        }))
      });

    } catch (err) {
      console.error('Failed to update schedule data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch schedule data');
    } finally {
      setLoading(false);
    }
  }, [fetchScheduleData, getCurrentMatchesFromFull, getUpcomingMatches, extractAllStages]);

  // 手動リフレッシュ
  const refreshData = useCallback(async () => {
    await updateScheduleData();
  }, [updateScheduleData]);

  // 特定時間帯のマッチ取得
  const getMatchesInTimeRange = useCallback((startTime: Date, endTime: Date): ScheduleMatch[] => {
    if (!scheduleData) return [];
    
    const result = scheduleData.data.result;
    const allMatches = [
      ...(result.regular || []).map(match => ({ ...match, match_type: 'レギュラーマッチ' })),
      ...(result.bankara_challenge || []).map(match => ({ ...match, match_type: 'バンカラマッチ(チャレンジ)' })),
      ...(result.bankara_open || []).map(match => ({ ...match, match_type: 'バンカラマッチ(オープン)' })),
      ...(result.x || []).map(match => ({ ...match, match_type: 'Xマッチ' }))
    ];
    
    return allMatches.filter(match => {
      const matchStart = new Date(match.start_time);
      const matchEnd = new Date(match.end_time);
      
      // 指定された時間帯と重複するマッチを取得
      return (matchStart < endTime && matchEnd > startTime);
    });
  }, [scheduleData]);

  // 次のマッチまでの時間を取得
  const getTimeUntilNextMatch = useCallback((): { minutes: number; nextMatch: ScheduleMatch | null } => {
    if (upcomingMatches.length === 0) {
      return { minutes: -1, nextMatch: null };
    }
    
    const now = new Date();
    const nextMatch = upcomingMatches[0];
    const startTime = new Date(nextMatch.start_time);
    const minutes = Math.floor((startTime.getTime() - now.getTime()) / (1000 * 60));
    
    return { minutes, nextMatch };
  }, [upcomingMatches]);

  // ルール別マッチ取得
  const getMatchesByRule = useCallback((ruleName: string): ScheduleMatch[] => {
    if (!scheduleData) return [];
    
    const result = scheduleData.data.result;
    const allMatches = [
      ...(result.regular || []).map(match => ({ ...match, match_type: 'レギュラーマッチ' })),
      ...(result.bankara_challenge || []).map(match => ({ ...match, match_type: 'バンカラマッチ(チャレンジ)' })),
      ...(result.bankara_open || []).map(match => ({ ...match, match_type: 'バンカラマッチ(オープン)' })),
      ...(result.x || []).map(match => ({ ...match, match_type: 'Xマッチ' }))
    ];
    
    return allMatches.filter(match => match.rule.name === ruleName);
  }, [scheduleData]);

  // ステージ別マッチ取得
  const getMatchesByStage = useCallback((stageId: string): ScheduleMatch[] => {
    if (!scheduleData) return [];
    
    const result = scheduleData.data.result;
    const allMatches = [
      ...(result.regular || []).map(match => ({ ...match, match_type: 'レギュラーマッチ' })),
      ...(result.bankara_challenge || []).map(match => ({ ...match, match_type: 'バンカラマッチ(チャレンジ)' })),
      ...(result.bankara_open || []).map(match => ({ ...match, match_type: 'バンカラマッチ(オープン)' })),
      ...(result.x || []).map(match => ({ ...match, match_type: 'Xマッチ' }))
    ];
    
    return allMatches.filter(match => 
      match.stages.some(stage => stage.id === stageId)
    );
  }, [scheduleData]);

  // 今日のマッチ取得
  const getTodayMatches = useCallback((): ScheduleMatch[] => {
    if (!scheduleData) return [];
    
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    return getMatchesInTimeRange(startOfDay, endOfDay);
  }, [scheduleData, getMatchesInTimeRange]);

  // 初期データ読み込み
  useEffect(() => {
    updateScheduleData();
  }, [updateScheduleData]);

  // 定期更新（10分おき）
  useEffect(() => {
    const interval = setInterval(() => {
      // 静かに更新（ローディング状態にしない）
      updateScheduleData();
    }, 10 * 60 * 1000); // 10分

    return () => clearInterval(interval);
  }, [updateScheduleData]);

  return {
    // データ
    scheduleData,
    currentMatches,
    upcomingMatches,
    allStages,
    lastUpdated,
    
    // 状態
    loading,
    error,
    
    // アクション
    refreshData,
    
    // ユーティリティ
    getMatchesInTimeRange,
    getTimeUntilNextMatch,
    getMatchesByRule,
    getMatchesByStage,
    getTodayMatches
  };
};