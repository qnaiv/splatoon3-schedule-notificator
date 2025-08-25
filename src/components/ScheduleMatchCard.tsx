import React from 'react';
import { ScheduleMatch } from '../types';

interface ScheduleMatchCardProps {
  match: ScheduleMatch;
  onTap: (match: ScheduleMatch) => void;
  formatTime: (dateString: string) => string;
  isCurrentMatch?: boolean;
  index: number;
}

const ScheduleMatchCard: React.FC<ScheduleMatchCardProps> = ({
  match,
  onTap,
  formatTime,
  isCurrentMatch = false,
  index,
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
      ナワバリバトル: 'ナワバリ',
      ガチエリア: 'エリア',
      ガチヤグラ: 'ヤグラ',
      ガチホコバトル: 'ホコ',
      ガチアサリ: 'アサリ',
    };
    return ruleMap[ruleName as keyof typeof ruleMap] || ruleName;
  };

  const getMatchTypeInfo = (matchType: string) => {
    if (matchType === 'レギュラーマッチ') {
      return {
        name: '🎯 ナワバリ',
        color:
          'bg-gradient-to-r from-match-turf/20 to-splatoon-yellow/20 text-green-800 border-match-turf/30',
        bgColor:
          'bg-gradient-to-br from-match-turf/10 via-splatoon-yellow/5 to-green-50/50',
        borderColor: 'border-match-turf/20',
        shadowColor: 'shadow-match-turf/10',
      };
    } else if (matchType === 'バンカラマッチ(チャレンジ)') {
      return {
        name: '⚔️ バンカラ(チャレンジ)',
        color:
          'bg-gradient-to-r from-match-bankara/20 to-splatoon-orange/20 text-red-800 border-match-bankara/30',
        bgColor:
          'bg-gradient-to-br from-match-bankara/10 via-splatoon-orange/5 to-red-50/50',
        borderColor: 'border-match-bankara/20',
        shadowColor: 'shadow-match-bankara/10',
      };
    } else if (matchType === 'バンカラマッチ(オープン)') {
      return {
        name: '🛡️ バンカラ(オープン)',
        color:
          'bg-gradient-to-r from-splatoon-pink/20 to-match-bankara/20 text-pink-800 border-splatoon-pink/30',
        bgColor:
          'bg-gradient-to-br from-splatoon-pink/10 via-match-bankara/5 to-pink-50/50',
        borderColor: 'border-splatoon-pink/20',
        shadowColor: 'shadow-splatoon-pink/10',
      };
    } else if (matchType === 'Xマッチ') {
      return {
        name: '✨ Xマッチ',
        color:
          'bg-gradient-to-r from-match-x/20 to-splatoon-cyan/20 text-teal-800 border-match-x/30',
        bgColor:
          'bg-gradient-to-br from-match-x/10 via-splatoon-cyan/5 to-teal-50/50',
        borderColor: 'border-match-x/20',
        shadowColor: 'shadow-match-x/10',
      };
    }
    return {
      name: matchType || 'その他',
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      shadowColor: 'shadow-gray/10',
    };
  };

  const matchTypeInfo = getMatchTypeInfo(match.match_type || '');
  const stageNames = match.stages.map((stage) => stage.name).join(' / ');

  // ステージ背景画像の生成
  const stageImages = match.stages
    .filter((stage) => stage.image)
    .map((stage) => stage.image);
  const backgroundStyle =
    stageImages.length >= 2
      ? {}
      : stageImages.length === 1
        ? {
            backgroundImage: `url('${stageImages[0]}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }
        : {};

  const keyPrefix = isCurrentMatch ? 'current' : 'upcoming';

  const handleClick = () => {
    onTap(match);
  };

  return (
    <div
      key={`${keyPrefix}-${index}`}
      className={`rounded-xl p-4 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer relative overflow-hidden ${stageImages.length > 0 ? '' : matchTypeInfo.bgColor}`}
      style={backgroundStyle}
      onClick={handleClick}
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
              clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)',
            }}
          />
          <div
            className="absolute inset-0 rounded-xl opacity-80"
            style={{
              backgroundImage: `url('${stageImages[1]}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)',
            }}
          />
        </>
      )}

      {/* 可読性向上のための強化オーバーレイ */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-white/50 to-white/40 backdrop-blur-xs rounded-xl"></div>

      {/* コンテンツ */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${matchTypeInfo.color} bg-white shadow-xl`}
          >
            {getCompactMatchTypeName(match.match_type || '')}
          </span>
          {isCurrentMatch && (
            <span className="bg-gradient-to-r from-green-400 to-emerald-500 text-white text-xs px-2 py-1 rounded-full shadow-lg animate-pulse font-bold">
              開催中
            </span>
          )}
        </div>

        <div>
          <div className="text-sm font-bold text-gray-900 truncate">
            {getCompactRuleName(match.rule.name)}
          </div>
          <div className="text-xs text-gray-800 leading-relaxed font-bold">
            {stageNames}
          </div>
          {isCurrentMatch && (
            <div className="text-xs text-gray-700 font-bold">
              ～{formatTime(match.end_time)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduleMatchCard;
