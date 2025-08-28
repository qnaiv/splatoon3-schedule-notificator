import React, { useState } from 'react';
import { Calendar, Settings, RefreshCw, Users, Trophy } from 'lucide-react';
import NotificationSettings from './components/NotificationSettings';
import EventMatchesView from './components/EventMatchesView';
import ScheduleMatchCard from './components/ScheduleMatchCard';
import NotificationDialog from './components/NotificationDialog';
import { useSchedule } from './hooks/useSchedule';
import { useEventMatches } from './hooks/useEventMatches';
import { useSettings } from './hooks/useSettings';
import { ScheduleMatch, EventMatch, NotificationCondition } from './types';
import { scheduleToCondition } from './utils/scheduleToCondition';
import { eventMatchToCondition } from './utils/eventMatchToCondition';

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<
    'schedule' | 'events' | 'settings'
  >('schedule');
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [selectedSchedule, setSelectedSchedule] =
    useState<ScheduleMatch | null>(null);
  const [selectedEventMatch, setSelectedEventMatch] =
    useState<EventMatch | null>(null);
  const {
    currentMatches,
    upcomingMatches,
    allStages,
    loading,
    error,
    refreshData,
    lastUpdated,
  } = useSchedule();
  const {
    currentEvents,
    upcomingEvents,
    loading: eventLoading,
    error: eventError,
    refreshData: refreshEventData,
  } = useEventMatches();
  const { settings, addNotificationCondition } = useSettings();

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Tokyo',
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      weekday: 'short',
      timeZone: 'Asia/Tokyo',
    });
  };

  const handleScheduleCardClick = (match: ScheduleMatch) => {
    setSelectedSchedule(match);
    setSelectedEventMatch(null);
    setShowNotificationDialog(true);
  };

  const handleEventCardClick = (match: EventMatch) => {
    setSelectedEventMatch(match);
    setSelectedSchedule(null);
    setShowNotificationDialog(true);
  };

  const handleNotificationSave = async (
    conditionData: Omit<NotificationCondition, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    try {
      await addNotificationCondition(conditionData);
      setShowNotificationDialog(false);
      setSelectedSchedule(null);
      setSelectedEventMatch(null);
      // 成功した場合は設定タブに移動
      setCurrentTab('settings');
    } catch (err) {
      console.error('Failed to save notification condition:', err);
      alert('通知条件の保存に失敗しました。');
    }
  };

  const handleNotificationCancel = () => {
    setShowNotificationDialog(false);
    setSelectedSchedule(null);
    setSelectedEventMatch(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-teal-50">
      {/* ヘッダー */}
      <header className="bg-gradient-to-r from-white/90 to-white/95 backdrop-blur-sm shadow-lg border-b border-white/20">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-splatoon-cyan to-splatoon-purple rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">🦑</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">
                  スプラトゥーン3
                </h1>
                <p className="text-sm text-gray-600">Discord通知</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {lastUpdated && (
                <div className="text-xs text-gray-500">
                  最終更新: {formatTime(lastUpdated)}
                </div>
              )}

              <button
                onClick={() => {
                  refreshData();
                  refreshEventData();
                }}
                disabled={loading || eventLoading}
                className="p-2 text-gray-400 hover:text-blue-500 rounded-lg disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-5 h-5 ${loading || eventLoading ? 'animate-spin' : ''}`}
                />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* タブナビゲーション */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-white/30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-8">
            <button
              onClick={() => setCurrentTab('schedule')}
              className={`relative flex items-center gap-2 py-4 px-3 font-semibold text-sm transition-all duration-300 ${
                currentTab === 'schedule'
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-blue-500'
              }`}
            >
              <Calendar className="w-5 h-5" />
              スケジュール
              {currentTab === 'schedule' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
              )}
            </button>

            <button
              onClick={() => setCurrentTab('events')}
              className={`relative flex items-center gap-2 py-4 px-3 font-semibold text-sm transition-all duration-300 ${
                currentTab === 'events'
                  ? 'text-purple-600'
                  : 'text-gray-500 hover:text-purple-500'
              }`}
            >
              <Trophy className="w-5 h-5" />
              イベントマッチ
              {currentEvents && currentEvents.length > 0 && (
                <span className="bg-gradient-to-r from-purple-400 to-pink-500 text-white text-xs px-2.5 py-1 rounded-full shadow-md">
                  {currentEvents.length}
                </span>
              )}
              {currentTab === 'events' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
              )}
            </button>

            <button
              onClick={() => setCurrentTab('settings')}
              className={`relative flex items-center gap-2 py-4 px-3 font-semibold text-sm transition-all duration-300 ${
                currentTab === 'settings'
                  ? 'text-teal-600'
                  : 'text-gray-500 hover:text-teal-500'
              }`}
            >
              <Settings className="w-5 h-5" />
              Discord設定
              {settings?.notificationConditions &&
                settings.notificationConditions.length > 0 && (
                  <span className="bg-gradient-to-r from-teal-400 to-cyan-500 text-white text-xs px-2.5 py-1 rounded-full shadow-md">
                    {
                      settings.notificationConditions.filter((c) => c.enabled)
                        .length
                    }
                  </span>
                )}
              {currentTab === 'settings' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full"></div>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* メインコンテンツ */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {currentTab === 'schedule' ? (
          <ScheduleView
            currentMatches={currentMatches}
            upcomingMatches={upcomingMatches}
            loading={loading}
            error={error}
            formatTime={formatTime}
            formatDate={formatDate}
            onScheduleCardClick={handleScheduleCardClick}
          />
        ) : currentTab === 'events' ? (
          <EventMatchesView
            currentEvents={currentEvents}
            upcomingEvents={upcomingEvents}
            loading={eventLoading}
            error={eventError}
            formatTime={formatTime}
            formatDate={formatDate}
            onEventCardClick={handleEventCardClick}
          />
        ) : (
          <NotificationSettings />
        )}
      </main>

      {/* 通知条件作成ダイアログ */}
      <NotificationDialog
        isOpen={showNotificationDialog}
        initialCondition={
          selectedSchedule
            ? scheduleToCondition(selectedSchedule)
            : selectedEventMatch
              ? eventMatchToCondition(selectedEventMatch)
              : undefined
        }
        allStages={allStages}
        onSave={handleNotificationSave}
        onCancel={handleNotificationCancel}
      />
    </div>
  );
};

// スケジュール表示コンポーネント
interface ScheduleViewProps {
  currentMatches: ScheduleMatch[];
  upcomingMatches: ScheduleMatch[];
  loading: boolean;
  error: string | null;
  formatTime: (dateString: string) => string;
  formatDate: (dateString: string) => string;
  onScheduleCardClick: (match: ScheduleMatch) => void;
}

const ScheduleView: React.FC<ScheduleViewProps> = ({
  currentMatches,
  upcomingMatches,
  loading,
  error,
  formatTime,
  formatDate,
  onScheduleCardClick,
}) => {
  const groupMatchesByTime = (matches: ScheduleMatch[]) => {
    const groups: {
      startTime: string;
      endTime: string;
      matches: ScheduleMatch[];
    }[] = [];

    for (const match of matches) {
      const existingGroup = groups.find(
        (group) =>
          group.startTime === match.start_time &&
          group.endTime === match.end_time
      );

      if (existingGroup) {
        existingGroup.matches.push(match);
      } else {
        groups.push({
          startTime: match.start_time,
          endTime: match.end_time,
          matches: [match],
        });
      }
    }

    return groups.sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  };
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-medium mb-2">エラーが発生しました</h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 現在開催中のマッチ */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center shadow-lg">
            <Users className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            現在開催中
          </h2>
        </div>

        {currentMatches.length === 0 ? (
          <div className="bg-white/40 backdrop-blur-sm rounded-xl p-6 text-center border border-white/30 shadow-lg">
            <p className="text-gray-600">現在開催中のマッチはありません</p>
          </div>
        ) : (
          <div className="bg-white/40 backdrop-blur-sm border border-white/30 rounded-xl p-5 shadow-xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {currentMatches.map((match, index) => (
                <ScheduleMatchCard
                  key={`current-${index}`}
                  match={match}
                  onTap={onScheduleCardClick}
                  formatTime={formatTime}
                  isCurrentMatch={true}
                  index={index}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 今後の予定 */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center shadow-lg">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            今後の予定
          </h2>
        </div>

        {upcomingMatches.length === 0 ? (
          <div className="bg-white/40 backdrop-blur-sm rounded-xl p-6 text-center border border-white/30 shadow-lg">
            <p className="text-gray-600">今後の予定が取得できませんでした</p>
          </div>
        ) : (
          <div className="space-y-5">
            {groupMatchesByTime(upcomingMatches.slice(0, 24)).map(
              (timeGroup, groupIndex) => (
                <div
                  key={`time-group-${groupIndex}`}
                  className="bg-white/30 backdrop-blur-sm border border-white/40 rounded-xl p-5 shadow-xl hover:shadow-2xl transition-all duration-300"
                >
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                      {formatDate(timeGroup.startTime)}
                    </h3>
                    <div className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      {formatTime(timeGroup.startTime)} -{' '}
                      {formatTime(timeGroup.endTime)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {timeGroup.matches.map((match, index) => (
                      <ScheduleMatchCard
                        key={`upcoming-${groupIndex}-${index}`}
                        match={match}
                        onTap={onScheduleCardClick}
                        formatTime={formatTime}
                        isCurrentMatch={false}
                        index={index}
                      />
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default App;
