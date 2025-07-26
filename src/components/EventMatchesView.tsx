import React from 'react';
import { Calendar, Trophy } from 'lucide-react';
import { EventMatch } from '../types';

interface EventMatchesViewProps {
  currentEvents: EventMatch[];
  upcomingEvents: EventMatch[];
  loading: boolean;
  error: string | null;
  formatTime: (dateString: string) => string;
  formatDate: (dateString: string) => string;
}

const EventMatchesView: React.FC<EventMatchesViewProps> = ({
  currentEvents,
  upcomingEvents,
  loading,
  error,
  formatTime,
  formatDate
}) => {


  // イベントをグルーピング
  const groupEventsByType = (events: EventMatch[]) => {
    const groups: { [key: string]: EventMatch[] } = {};
    
    events.forEach(event => {
      const eventId = event.event?.id || 'unknown';
      if (!groups[eventId]) {
        groups[eventId] = [];
      }
      groups[eventId].push(event);
    });
    
    // 各グループ内で時間順にソート
    Object.values(groups).forEach(group => {
      group.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    });
    
    return groups;
  };

  // 開催期間をまとめて表示
  const formatEventPeriod = (events: EventMatch[]) => {
    if (events.length === 0) return '';
    if (events.length === 1) {
      return `${formatDate(events[0].start_time)} ${formatTime(events[0].start_time)} ～ ${formatTime(events[0].end_time)}`;
    }
    
    const firstEvent = events[0];
    const lastEvent = events[events.length - 1];
    const firstDate = formatDate(firstEvent.start_time);
    const lastDate = formatDate(lastEvent.end_time);
    
    if (firstDate === lastDate) {
      return `${firstDate} ${formatTime(firstEvent.start_time)} ～ ${formatTime(lastEvent.end_time)}`;
    } else {
      return `${firstDate} ${formatTime(firstEvent.start_time)} ～ ${lastDate} ${formatTime(lastEvent.end_time)}`;
    }
  };

  // 開催時間帯を日付別にグループ化
  const groupEventsByDate = (events: EventMatch[]) => {
    const dateGroups: { [date: string]: EventMatch[] } = {};
    events.forEach(event => {
      const date = formatDate(event.start_time);
      if (!dateGroups[date]) {
        dateGroups[date] = [];
      }
      dateGroups[date].push(event);
    });
    return dateGroups;
  };

  const getEventTypeColor = (eventName: string | undefined) => {
    if (!eventName) {
      return {
        color: 'bg-gradient-to-r from-blue-500/20 to-teal-500/20 text-blue-800 border-blue-500/30',
        bgColor: 'bg-gradient-to-br from-blue-50/80 via-teal-50/80 to-blue-50/80',
        borderColor: 'border-blue-200/50',
        shadowColor: 'shadow-blue/10'
      };
    }
    
    if (eventName.includes('ツキイチ') || eventName.includes('Monthly')) {
      return {
        color: 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-800 border-purple-500/30',
        bgColor: 'bg-gradient-to-br from-purple-50/80 via-pink-50/80 to-purple-50/80',
        borderColor: 'border-purple-200/50',
        shadowColor: 'shadow-purple/10'
      };
    } else if (eventName.includes('ビッグラン') || eventName.includes('Big Run')) {
      return {
        color: 'bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-800 border-orange-500/30',
        bgColor: 'bg-gradient-to-br from-orange-50/80 via-red-50/80 to-orange-50/80',
        borderColor: 'border-orange-200/50',
        shadowColor: 'shadow-orange/10'
      };
    } else if (eventName.includes('霧') || eventName.includes('Fog')) {
      return {
        color: 'bg-gradient-to-r from-gray-500/20 to-slate-500/20 text-gray-800 border-gray-500/30',
        bgColor: 'bg-gradient-to-br from-gray-50/80 via-slate-50/80 to-gray-50/80',
        borderColor: 'border-gray-200/50',
        shadowColor: 'shadow-gray/10'
      };
    } else {
      return {
        color: 'bg-gradient-to-r from-blue-500/20 to-teal-500/20 text-blue-800 border-blue-500/30',
        bgColor: 'bg-gradient-to-br from-blue-50/80 via-teal-50/80 to-blue-50/80',
        borderColor: 'border-blue-200/50',
        shadowColor: 'shadow-blue/10'
      };
    }
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
      {/* 現在開催中のイベント */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center shadow-lg">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            開催中のイベント
          </h2>
        </div>

        {currentEvents.length === 0 ? (
          <div className="bg-white/40 backdrop-blur-sm rounded-xl p-6 text-center border border-white/30 shadow-lg">
            <p className="text-gray-600">現在開催中のイベントマッチはありません</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupEventsByType(currentEvents)).map(([, events], groupIndex) => {
              const event = events[0]; // 代表のイベント情報を使用
              const eventTypeInfo = getEventTypeColor(event.event?.name);
              const stageNames = event.stages?.map(stage => stage?.name || '不明').join(' / ') || '不明';
              const stageImages = event.stages?.filter(stage => stage?.image).map(stage => stage.image) || [];
              
              const backgroundStyle = stageImages.length >= 2 ? {} : stageImages.length === 1 ? {
                backgroundImage: `url('${stageImages[0]}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              } : {};

              return (
                <div 
                  key={`current-event-group-${groupIndex}`} 
                  className={`rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden ${stageImages.length > 0 ? '' : eventTypeInfo.bgColor}`}
                  style={backgroundStyle}
                >
                  {/* 2つのステージの場合の背景 */}
                  {stageImages.length >= 2 && (
                    <>
                      <div 
                        className="absolute inset-0 rounded-xl opacity-80"
                        style={{
                          backgroundImage: `url('${stageImages[0]}')`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                          clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)'
                        }}
                      />
                      <div 
                        className="absolute inset-0 rounded-xl opacity-80"
                        style={{
                          backgroundImage: `url('${stageImages[1]}')`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                          clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)'
                        }}
                      />
                    </>
                  )}
                  
                  {/* 可読性向上のためのオーバーレイ */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/70 via-white/60 to-white/50 backdrop-blur-xs rounded-xl"></div>
                  
                  {/* コンテンツ */}
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className={`px-4 py-2 rounded-full text-sm font-bold border-2 ${eventTypeInfo.color} bg-white shadow-xl`}>
                            🎪 イベントマッチ
                          </span>
                          <span className="bg-gradient-to-r from-green-400 to-emerald-500 text-white text-sm px-3 py-1 rounded-full shadow-lg animate-pulse font-bold">
                            開催中
                          </span>
                        </div>
                        
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{event.event?.name || 'イベントマッチ'}</h3>
                        {event.event?.desc && (
                          <p className="text-sm text-gray-700 mb-3 leading-relaxed">{event.event.desc}</p>
                        )}
                        
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-semibold text-gray-800">開催期間:</span>
                            <span className="text-gray-700 font-bold">
                              {formatEventPeriod(events)}
                            </span>
                          </div>
                          <div className="text-sm">
                            <span className="font-semibold text-gray-800 block mb-2">開催時間帯:</span>
                            <div className="space-y-2">
                              {Object.entries(groupEventsByDate(events)).map(([date, dayEvents]) => (
                                <div key={date} className="bg-white/60 rounded-lg p-3 border border-gray-200/50">
                                  <div className="font-semibold text-gray-900 text-xs mb-1">{date}</div>
                                  <div className="flex flex-wrap gap-2">
                                    {dayEvents.map((event, idx) => {
                                      const now = new Date();
                                      const start = new Date(event.start_time);
                                      const end = new Date(event.end_time);
                                      const isCurrent = now >= start && now <= end;
                                      
                                      return (
                                        <span 
                                          key={idx}
                                          className={`px-2 py-1 rounded text-xs font-medium ${
                                            isCurrent 
                                              ? 'bg-green-100/80 text-green-800 ring-1 ring-green-500/30' 
                                              : 'bg-blue-100/80 text-blue-800'
                                          }`}
                                        >
                                          {formatTime(event.start_time)}～{formatTime(event.end_time)}
                                          {isCurrent && <span className="ml-1">●</span>}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-semibold text-gray-800">ルール:</span>
                            <span className="text-gray-700 font-bold">{event.rule?.name || '不明'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-semibold text-gray-800">ステージ:</span>
                            <span className="text-gray-700 font-bold">{stageNames}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
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

        {upcomingEvents.length === 0 ? (
          <div className="bg-white/40 backdrop-blur-sm rounded-xl p-6 text-center border border-white/30 shadow-lg">
            <p className="text-gray-600">今後のイベントマッチの予定はありません</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupEventsByType(upcomingEvents)).slice(0, 5).map(([, events], groupIndex) => {
              const event = events[0]; // 代表のイベント情報を使用
              const eventTypeInfo = getEventTypeColor(event.event?.name);
              const stageNames = event.stages?.map(stage => stage?.name || '不明').join(' / ') || '不明';
              const stageImages = event.stages?.filter(stage => stage?.image).map(stage => stage.image) || [];
              
              const backgroundStyle = stageImages.length >= 2 ? {} : stageImages.length === 1 ? {
                backgroundImage: `url('${stageImages[0]}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              } : {};

              return (
                <div 
                  key={`upcoming-event-group-${groupIndex}`} 
                  className={`rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 relative overflow-hidden ${stageImages.length > 0 ? '' : eventTypeInfo.bgColor}`}
                  style={backgroundStyle}
                >
                  {/* 2つのステージの場合の背景 */}
                  {stageImages.length >= 2 && (
                    <>
                      <div 
                        className="absolute inset-0 rounded-xl opacity-80"
                        style={{
                          backgroundImage: `url('${stageImages[0]}')`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                          clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)'
                        }}
                      />
                      <div 
                        className="absolute inset-0 rounded-xl opacity-80"
                        style={{
                          backgroundImage: `url('${stageImages[1]}')`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                          clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)'
                        }}
                      />
                    </>
                  )}
                  
                  {/* 可読性向上のためのオーバーレイ */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/70 via-white/60 to-white/50 backdrop-blur-xs rounded-xl"></div>
                  
                  {/* コンテンツ */}
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="mb-3">
                          <span className={`px-4 py-2 rounded-full text-sm font-bold border-2 ${eventTypeInfo.color} bg-white shadow-xl`}>
                            🎪 イベントマッチ
                          </span>
                        </div>
                        
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{event.event?.name || 'イベントマッチ'}</h3>
                        {event.event?.desc && (
                          <p className="text-sm text-gray-700 mb-3 leading-relaxed">{event.event.desc}</p>
                        )}
                        
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-semibold text-gray-800">開催期間:</span>
                            <span className="text-gray-700 font-bold">
                              {formatEventPeriod(events)}
                            </span>
                          </div>
                          <div className="text-sm">
                            <span className="font-semibold text-gray-800 block mb-2">開催時間帯:</span>
                            <div className="space-y-2">
                              {Object.entries(groupEventsByDate(events)).map(([date, dayEvents]) => (
                                <div key={date} className="bg-white/60 rounded-lg p-3 border border-gray-200/50">
                                  <div className="font-semibold text-gray-900 text-xs mb-1">{date}</div>
                                  <div className="flex flex-wrap gap-2">
                                    {dayEvents.map((event, idx) => {
                                      const now = new Date();
                                      const start = new Date(event.start_time);
                                      const end = new Date(event.end_time);
                                      const isCurrent = now >= start && now <= end;
                                      
                                      return (
                                        <span 
                                          key={idx}
                                          className={`px-2 py-1 rounded text-xs font-medium ${
                                            isCurrent 
                                              ? 'bg-green-100/80 text-green-800 ring-1 ring-green-500/30' 
                                              : 'bg-blue-100/80 text-blue-800'
                                          }`}
                                        >
                                          {formatTime(event.start_time)}～{formatTime(event.end_time)}
                                          {isCurrent && <span className="ml-1">●</span>}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-semibold text-gray-800">ルール:</span>
                            <span className="text-gray-700 font-bold">{event.rule?.name || '不明'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-semibold text-gray-800">ステージ:</span>
                            <span className="text-gray-700 font-bold">{stageNames}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default EventMatchesView;