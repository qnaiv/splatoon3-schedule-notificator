import React, { useState, useEffect } from 'react';
import { Calendar, Settings, RefreshCw, Clock, Users } from 'lucide-react';
import NotificationSettings from './components/NotificationSettings';
import { useSchedule } from './hooks/useSchedule';
import { useSettings } from './hooks/useSettings';
import { ScheduleMatch } from './types';

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<'schedule' | 'settings'>('schedule');
  const { 
    currentMatches, 
    upcomingMatches, 
    loading, 
    error, 
    refreshData,
    getTimeUntilNextMatch,
    lastUpdated 
  } = useSchedule();
  const { settings, enableNotifications } = useSettings();

  // Service Worker登録
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered successfully:', registration);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);

  // 自動通知有効化（初回のみ）
  useEffect(() => {
    if (settings && settings.globalSettings.enableNotifications) {
      enableNotifications().catch((err) => {
        console.error('Failed to enable notifications:', err);
      });
    }
  }, [settings, enableNotifications]);

  const { minutes: minutesUntilNext, nextMatch } = getTimeUntilNextMatch();

  const formatTimeUntilNext = () => {
    if (minutesUntilNext < 0) return null;
    
    const hours = Math.floor(minutesUntilNext / 60);
    const mins = minutesUntilNext % 60;
    
    if (hours > 0) {
      return `${hours}時間${mins}分後`;
    } else {
      return `${mins}分後`;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Asia/Tokyo'
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      weekday: 'short',
      timeZone: 'Asia/Tokyo'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">🦑</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">スプラトゥーン3</h1>
                <p className="text-sm text-gray-600">スケジュール通知</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {lastUpdated && (
                <div className="text-xs text-gray-500">
                  最終更新: {formatTime(lastUpdated)}
                </div>
              )}
              
              <button
                onClick={refreshData}
                disabled={loading}
                className="p-2 text-gray-400 hover:text-blue-500 rounded-lg disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* タブナビゲーション */}
      <nav className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex space-x-8">
            <button
              onClick={() => setCurrentTab('schedule')}
              className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm ${
                currentTab === 'schedule'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Calendar className="w-4 h-4" />
              スケジュール
            </button>
            
            <button
              onClick={() => setCurrentTab('settings')}
              className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm ${
                currentTab === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Settings className="w-4 h-4" />
              通知設定
              {settings?.notificationConditions && settings.notificationConditions.length > 0 && (
                <span className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full">
                  {settings.notificationConditions.filter(c => c.enabled).length}
                </span>
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
            nextMatch={nextMatch}
            timeUntilNext={formatTimeUntilNext()}
            formatTime={formatTime}
            formatDate={formatDate}
          />
        ) : (
          <NotificationSettings />
        )}
      </main>
    </div>
  );
};

// スケジュール表示コンポーネント
interface ScheduleViewProps {
  currentMatches: ScheduleMatch[];
  upcomingMatches: ScheduleMatch[];
  loading: boolean;
  error: string | null;
  nextMatch: ScheduleMatch | null;
  timeUntilNext: string | null;
  formatTime: (dateString: string) => string;
  formatDate: (dateString: string) => string;
}

const ScheduleView: React.FC<ScheduleViewProps> = ({
  currentMatches,
  upcomingMatches,
  loading,
  error,
  nextMatch,
  timeUntilNext,
  formatTime,
  formatDate
}) => {
  const getNextMatchRule = (matchType: string, upcomingMatches: ScheduleMatch[], nextMatch: ScheduleMatch | null) => {
    const match = upcomingMatches.find(m => m.match_type === matchType) || 
                  (nextMatch?.match_type === matchType ? nextMatch : null);
    if (!match) return '-';
    
    const ruleMap = {
      'ナワバリバトル': 'ナワバリ',
      'ガチエリア': 'エリア',
      'ガチヤグラ': 'ヤグラ',
      'ガチホコバトル': 'ホコ',
      'ガチアサリ': 'アサリ'
    };
    return ruleMap[match.rule.name as keyof typeof ruleMap] || match.rule.name;
  };

  const getNextMatchStage = (matchType: string, upcomingMatches: ScheduleMatch[], nextMatch: ScheduleMatch | null) => {
    const match = upcomingMatches.find(m => m.match_type === matchType) || 
                  (nextMatch?.match_type === matchType ? nextMatch : null);
    if (!match || !match.stages || match.stages.length === 0) return '-';
    
    return match.stages.map(stage => stage.name).join(' / ');
  };

  const getCompactMatchTypeName = (matchType: string) => {
    if (matchType === 'レギュラーマッチ') return '🎯 ナワバリ';
    if (matchType === 'バンカラマッチ(チャレンジ)') return '⚔️ バンカラ(C)';
    if (matchType === 'バンカラマッチ(オープン)') return '🛡️ バンカラ(O)';
    if (matchType === 'Xマッチ') return '✨ Xマッチ';
    return matchType;
  };

  const getCompactRuleName = (ruleName: string) => {
    const ruleMap = {
      'ナワバリバトル': 'ナワバリ',
      'ガチエリア': 'エリア',
      'ガチヤグラ': 'ヤグラ',
      'ガチホコバトル': 'ホコ',
      'ガチアサリ': 'アサリ'
    };
    return ruleMap[ruleName as keyof typeof ruleMap] || ruleName;
  };

  const getMatchTypeInfo = (matchType: string) => {
    if (matchType === 'レギュラーマッチ') {
      return {
        name: '🎯 ナワバリ',
        color: 'bg-lime-100 text-lime-800 border-lime-200',
        bgColor: 'bg-lime-50',
        borderColor: 'border-lime-200'
      };
    } else if (matchType === 'バンカラマッチ(チャレンジ)') {
      return {
        name: '⚔️ バンカラ(チャレンジ)',
        color: 'bg-red-100 text-red-800 border-red-200',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      };
    } else if (matchType === 'バンカラマッチ(オープン)') {
      return {
        name: '🛡️ バンカラ(オープン)',
        color: 'bg-red-100 text-red-800 border-red-200',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      };
    } else if (matchType === 'Xマッチ') {
      return {
        name: '✨ Xマッチ',
        color: 'bg-teal-100 text-teal-800 border-teal-200',
        bgColor: 'bg-teal-50',
        borderColor: 'border-teal-200'
      };
    }
    return {
      name: matchType || 'その他',
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200'
    };
  };

  const groupMatchesByTime = (matches: ScheduleMatch[]) => {
    const groups: { startTime: string; endTime: string; matches: ScheduleMatch[] }[] = [];
    
    for (const match of matches) {
      const existingGroup = groups.find(group => 
        group.startTime === match.start_time && group.endTime === match.end_time
      );
      
      if (existingGroup) {
        existingGroup.matches.push(match);
      } else {
        groups.push({
          startTime: match.start_time,
          endTime: match.end_time,
          matches: [match]
        });
      }
    }
    
    return groups.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
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
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-green-600" />
          <h2 className="text-lg font-bold text-gray-800">現在開催中</h2>
        </div>

        {currentMatches.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-gray-600">現在開催中のマッチはありません</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {currentMatches.map((match, index) => {
                const matchTypeInfo = getMatchTypeInfo(match.match_type || '');
                const stageNames = match.stages.map(stage => stage.name).join(' / ');
                
                return (
                  <div key={`current-${index}`} className={`rounded-lg border p-3 ${matchTypeInfo.bgColor} ${matchTypeInfo.borderColor}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${matchTypeInfo.color}`}>
                        {getCompactMatchTypeName(match.match_type || '')}
                      </span>
                      <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                        開催中
                      </span>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-gray-800 truncate">
                        {getCompactRuleName(match.rule.name)}
                      </div>
                      <div className="text-xs text-gray-600 leading-tight">
                        {stageNames}
                      </div>
                      <div className="text-xs text-gray-500">
                        ～{formatTime(match.end_time)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* 今後の予定 */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-gray-800">今後の予定</h2>
        </div>

        {upcomingMatches.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-gray-600">今後の予定が取得できませんでした</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupMatchesByTime(upcomingMatches.slice(0, 24)).map((timeGroup, groupIndex) => (
              <div key={`time-group-${groupIndex}`} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="mb-3">
                  <h3 className="text-sm font-medium text-gray-700 mb-1">
                    {formatDate(timeGroup.startTime)}
                  </h3>
                  <div className="text-lg font-bold text-gray-800">
                    {formatTime(timeGroup.startTime)} - {formatTime(timeGroup.endTime)}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {timeGroup.matches.map((match, index) => {
                    const matchTypeInfo = getMatchTypeInfo(match.match_type || '');
                    const stageNames = match.stages.map(stage => stage.name).join(' / ');
                    
                    return (
                      <div key={`upcoming-${groupIndex}-${index}`} className={`rounded-lg border p-3 ${matchTypeInfo.bgColor} ${matchTypeInfo.borderColor}`}>
                        <div className="mb-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${matchTypeInfo.color}`}>
                            {getCompactMatchTypeName(match.match_type || '')}
                          </span>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-gray-800 truncate">
                            {getCompactRuleName(match.rule.name)}
                          </div>
                          <div className="text-xs text-gray-600 leading-tight">
                            {stageNames}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

// マッチカードコンポーネント
interface MatchCardProps {
  match: ScheduleMatch;
  formatTime: (dateString: string) => string;
  formatDate?: (dateString: string) => string;
  isCurrent: boolean;
}

const MatchCard: React.FC<MatchCardProps> = ({
  match,
  formatTime,
  formatDate,
  isCurrent
}) => {
  const getMatchTypeInfo = (matchType: string) => {
    console.log('Match type:', matchType); // デバッグ用
    
    if (matchType === 'レギュラーマッチ') {
      return {
        name: '🎯 ナワバリ',
        color: 'bg-lime-100 text-lime-800 border-lime-200',
        bgColor: 'bg-lime-50',
        borderColor: 'border-lime-200'
      };
    } else if (matchType === 'バンカラマッチ(チャレンジ)') {
      return {
        name: '⚔️ バンカラ(チャレンジ)',
        color: 'bg-red-100 text-red-800 border-red-200',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      };
    } else if (matchType === 'バンカラマッチ(オープン)') {
      return {
        name: '🛡️ バンカラ(オープン)',
        color: 'bg-red-100 text-red-800 border-red-200',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      };
    } else if (matchType === 'Xマッチ') {
      return {
        name: '✨ Xマッチ',
        color: 'bg-teal-100 text-teal-800 border-teal-200',
        bgColor: 'bg-teal-50',
        borderColor: 'border-teal-200'
      };
    }
    return {
      name: matchType || 'その他',
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200'
    };
  };

  const getRuleDisplay = (ruleName: string) => {
    const ruleMap = {
      'ナワバリバトル': '🎨 ナワバリバトル',
      'ガチエリア': '🎯 ガチエリア',
      'ガチヤグラ': '🚂 ガチヤグラ',
      'ガチホコバトル': '🏆 ガチホコ',
      'ガチアサリ': '🐚 ガチアサリ'
    };
    return ruleMap[ruleName as keyof typeof ruleMap] || `⚡ ${ruleName}`;
  };

  const matchTypeInfo = getMatchTypeInfo(match.match_type || '');

  return (
    <div className={`rounded-lg border p-4 transition-all ${
      isCurrent 
        ? `${matchTypeInfo.bgColor} ${matchTypeInfo.borderColor} shadow-md` 
        : `bg-white ${matchTypeInfo.borderColor} hover:shadow-md`
    }`}>
      {/* マッチタイプヘッダー */}
      <div className="flex items-center justify-between mb-3">
        <span className={`px-2.5 py-0.5 rounded text-sm font-medium border ${matchTypeInfo.color}`}>
          {matchTypeInfo.name}
        </span>
        {isCurrent && (
          <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
            開催中
          </span>
        )}
      </div>

      {/* 時間情報 */}
      <div className="mb-3">
        {formatDate && (
          <div className="text-xs text-gray-500 mb-1">
            {formatDate(match.start_time)}
          </div>
        )}
        <div className="text-sm font-medium text-gray-700">
          {formatTime(match.start_time)} - {formatTime(match.end_time)}
        </div>
      </div>

      <div className="space-y-3">
        {/* ルール */}
        <div>
          <span className="text-sm font-medium text-gray-700">
            {getRuleDisplay(match.rule.name)}
          </span>
        </div>

        {/* ステージ */}
        <div className="space-y-1">
          {match.stages.map((stage, index) => (
            <div key={index} className="flex items-center gap-2 text-sm text-gray-700 font-medium">
              <span className="text-blue-500">🗺️</span>
              {stage.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;