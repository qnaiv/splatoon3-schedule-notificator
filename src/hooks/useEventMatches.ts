import { useState, useEffect, useCallback } from 'react';
import { Spla3ApiResponse, EventMatch } from '../types';

// 環境別API設定
const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || 
    (import.meta.env.PROD 
      ? 'https://qnaiv.github.io/splatoon3-schedule-notificator' 
      : 'http://localhost:3000'),
  scheduleEndpoint: '/api/schedule.json'
};

export const useEventMatches = () => {
  const [eventMatches, setEventMatches] = useState<EventMatch[]>([]);
  const [currentEvents, setCurrentEvents] = useState<EventMatch[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<EventMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // スケジュールデータ取得
  const fetchEventData = useCallback(async (): Promise<Spla3ApiResponse | null> => {
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.scheduleEndpoint}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch event data: ${response.status} ${response.statusText}`);
      }

      const data: Spla3ApiResponse = await response.json();
      return data;
    } catch (err) {
      console.error('Failed to fetch event data:', err);
      throw err;
    }
  }, []);

  // 現在開催中のイベントを抽出
  const getCurrentEvents = useCallback((events: EventMatch[]): EventMatch[] => {
    const now = new Date();
    return events.filter(event => {
      const start = new Date(event.start_time);
      const end = new Date(event.end_time);
      return now >= start && now <= end;
    });
  }, []);

  // 今後のイベントを抽出
  const getUpcomingEvents = useCallback((events: EventMatch[]): EventMatch[] => {
    const now = new Date();
    return events
      .filter(event => {
        const start = new Date(event.start_time);
        return start > now;
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, []);

  // データ更新
  const updateEventData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchEventData();
      if (!data) {
        throw new Error('No data received');
      }

      setLastUpdated(data.lastUpdated);

      // イベントデータの取得
      const events = data.data?.result?.event || [];
      setEventMatches(events);

      // 現在開催中のイベント抽出
      const current = getCurrentEvents(events);
      setCurrentEvents(current);

      // 今後のイベント抽出
      const upcoming = getUpcomingEvents(events);
      setUpcomingEvents(upcoming);

      console.log('Event data updated:', {
        totalEvents: events.length,
        currentEvents: current.length,
        upcomingEvents: upcoming.length,
        lastUpdated: data.lastUpdated
      });

    } catch (err) {
      console.error('Failed to update event data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch event data');
    } finally {
      setLoading(false);
    }
  }, [fetchEventData, getCurrentEvents, getUpcomingEvents]);

  // 手動リフレッシュ
  const refreshData = useCallback(async () => {
    await updateEventData();
  }, [updateEventData]);

  // 特定期間のイベント取得
  const getEventsInTimeRange = useCallback((startTime: Date, endTime: Date): EventMatch[] => {
    return eventMatches.filter(event => {
      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time);
      
      // 指定された時間帯と重複するイベントを取得
      return (eventStart < endTime && eventEnd > startTime);
    });
  }, [eventMatches]);

  // 初期データ読み込み
  useEffect(() => {
    updateEventData();
  }, [updateEventData]);

  // 定期更新（10分おき）
  useEffect(() => {
    const interval = setInterval(() => {
      updateEventData();
    }, 10 * 60 * 1000); // 10分

    return () => clearInterval(interval);
  }, [updateEventData]);

  return {
    // データ
    eventMatches,
    currentEvents,
    upcomingEvents,
    lastUpdated,
    
    // 状態
    loading,
    error,
    
    // アクション
    refreshData,
    
    // ユーティリティ
    getEventsInTimeRange
  };
};