import React, { useState, useEffect } from 'react';
import { Calendar, Settings, RefreshCw, Users } from 'lucide-react';
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
      <nav className="bg-white/80 backdrop-blur-sm border-b border-white/30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex space-x-8">
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
              onClick={() => setCurrentTab('settings')}
              className={`relative flex items-center gap-2 py-4 px-3 font-semibold text-sm transition-all duration-300 ${
                currentTab === 'settings'
                  ? 'text-purple-600'
                  : 'text-gray-500 hover:text-purple-500'
              }`}
            >
              <Settings className="w-5 h-5" />
              通知設定
              {settings?.notificationConditions && settings.notificationConditions.length > 0 && (
                <span className="bg-gradient-to-r from-blue-400 to-purple-500 text-white text-xs px-2.5 py-1 rounded-full shadow-md">
                  {settings.notificationConditions.filter(c => c.enabled).length}
                </span>
              )}
              {currentTab === 'settings' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
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
  formatTime: (dateString: string) => string;
  formatDate: (dateString: string) => string;
}

const ScheduleView: React.FC<ScheduleViewProps> = ({
  currentMatches,
  upcomingMatches,
  loading,
  error,
  formatTime,
  formatDate
}) => {

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
        color: 'bg-gradient-to-r from-match-turf/20 to-splatoon-yellow/20 text-green-800 border-match-turf/30',
        bgColor: 'bg-gradient-to-br from-match-turf/10 via-splatoon-yellow/5 to-green-50/50',
        borderColor: 'border-match-turf/20',
        shadowColor: 'shadow-match-turf/10'
      };
    } else if (matchType === 'バンカラマッチ(チャレンジ)') {
      return {
        name: '⚔️ バンカラ(チャレンジ)',
        color: 'bg-gradient-to-r from-match-bankara/20 to-splatoon-orange/20 text-red-800 border-match-bankara/30',
        bgColor: 'bg-gradient-to-br from-match-bankara/10 via-splatoon-orange/5 to-red-50/50',
        borderColor: 'border-match-bankara/20',
        shadowColor: 'shadow-match-bankara/10'
      };
    } else if (matchType === 'バンカラマッチ(オープン)') {
      return {
        name: '🛡️ バンカラ(オープン)',
        color: 'bg-gradient-to-r from-splatoon-pink/20 to-match-bankara/20 text-pink-800 border-splatoon-pink/30',
        bgColor: 'bg-gradient-to-br from-splatoon-pink/10 via-match-bankara/5 to-pink-50/50',
        borderColor: 'border-splatoon-pink/20',
        shadowColor: 'shadow-splatoon-pink/10'
      };
    } else if (matchType === 'Xマッチ') {
      return {
        name: '✨ Xマッチ',
        color: 'bg-gradient-to-r from-match-x/20 to-splatoon-cyan/20 text-teal-800 border-match-x/30',
        bgColor: 'bg-gradient-to-br from-match-x/10 via-splatoon-cyan/5 to-teal-50/50',
        borderColor: 'border-match-x/20',
        shadowColor: 'shadow-match-x/10'
      };
    }
    return {
      name: matchType || 'その他',
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      shadowColor: 'shadow-gray/10'
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
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center shadow-lg">
            <Users className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">現在開催中</h2>
        </div>

        {currentMatches.length === 0 ? (
          <div className="bg-white/40 backdrop-blur-sm rounded-xl p-6 text-center border border-white/30 shadow-lg">
            <p className="text-gray-600">現在開催中のマッチはありません</p>
          </div>
        ) : (
          <div className="bg-white/40 backdrop-blur-sm border border-white/30 rounded-xl p-5 shadow-xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {currentMatches.map((match, index) => {
                const matchTypeInfo = getMatchTypeInfo(match.match_type || '');
                const stageNames = match.stages.map(stage => stage.name).join(' / ');
                
                return (
                  <div key={`current-${index}`} className={`rounded-xl border p-4 ${matchTypeInfo.bgColor} ${matchTypeInfo.borderColor} backdrop-blur-sm shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${matchTypeInfo.color} backdrop-blur-sm`}>
                        {getCompactMatchTypeName(match.match_type || '')}
                      </span>
                      <span className="bg-gradient-to-r from-green-400 to-emerald-500 text-white text-xs px-2 py-1 rounded-full shadow-md animate-pulse">
                        開催中
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm font-bold text-gray-800 truncate">
                        {getCompactRuleName(match.rule.name)}
                      </div>
                      <div className="text-xs text-gray-700 leading-relaxed font-medium">
                        {stageNames}
                      </div>
                      <div className="text-xs text-gray-600 font-medium">
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
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center shadow-lg">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">今後の予定</h2>
        </div>

        {upcomingMatches.length === 0 ? (
          <div className="bg-white/40 backdrop-blur-sm rounded-xl p-6 text-center border border-white/30 shadow-lg">
            <p className="text-gray-600">今後の予定が取得できませんでした</p>
          </div>
        ) : (
          <div className="space-y-5">
            {groupMatchesByTime(upcomingMatches.slice(0, 24)).map((timeGroup, groupIndex) => (
              <div key={`time-group-${groupIndex}`} className="bg-white/30 backdrop-blur-sm border border-white/40 rounded-xl p-5 shadow-xl hover:shadow-2xl transition-all duration-300">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                    {formatDate(timeGroup.startTime)}
                  </h3>
                  <div className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {formatTime(timeGroup.startTime)} - {formatTime(timeGroup.endTime)}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {timeGroup.matches.map((match, index) => {
                    const matchTypeInfo = getMatchTypeInfo(match.match_type || '');
                    const stageNames = match.stages.map(stage => stage.name).join(' / ');
                    
                    return (
                      <div key={`upcoming-${groupIndex}-${index}`} className={`rounded-xl border p-4 ${matchTypeInfo.bgColor} ${matchTypeInfo.borderColor} backdrop-blur-sm shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer`}>
                        <div className="mb-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${matchTypeInfo.color} backdrop-blur-sm`}>
                            {getCompactMatchTypeName(match.match_type || '')}
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="text-sm font-bold text-gray-800 truncate">
                            {getCompactRuleName(match.rule.name)}
                          </div>
                          <div className="text-xs text-gray-700 leading-relaxed font-medium">
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


export default App;