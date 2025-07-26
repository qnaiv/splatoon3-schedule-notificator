import { ScheduleData, ScheduleMatch, EventMatch } from './types.ts';

// GitHub Pagesからスケジュールデータを取得
const SCHEDULE_URL =
  'https://qnaiv.github.io/splatoon3-schedule-notificator/api/schedule.json';

export async function fetchScheduleData(): Promise<ScheduleData | null> {
  try {
    console.log(`📡 Fetching schedule data from: ${SCHEDULE_URL}`);

    const response = await fetch(SCHEDULE_URL, {
      headers: {
        'User-Agent': 'Splatoon3-Discord-Bot/1.0',
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      const errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      console.error(`❌ Schedule fetch failed: ${errorMessage}`);
      throw new Error(errorMessage);
    }

    const data: ScheduleData = await response.json();

    // データの基本的な検証
    if (!data || !data.data || !data.data.result) {
      throw new Error('Invalid schedule data structure received');
    }

    console.log(`✅ Schedule data fetched successfully`);
    console.log(`📊 Last updated: ${data.lastUpdated}`);
    console.log(`📊 Data source: ${data.source}`);

    return data;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`❌ Failed to fetch schedule data: ${error.message}`);
      console.error(`❌ Error details:`, error.stack);
    } else {
      console.error(
        '❌ Failed to fetch schedule data with unknown error:',
        error
      );
    }
    return null;
  }
}

export function getAllMatches(data: ScheduleData): ScheduleMatch[] {
  try {
    const result = data.data.result;

    // 各マッチタイプに安全にアクセス
    const matches: ScheduleMatch[] = [];

    if (result.regular && Array.isArray(result.regular)) {
      matches.push(
        ...result.regular.map((match) => ({
          ...match,
          match_type: 'レギュラーマッチ',
        }))
      );
    }

    if (result.bankara_challenge && Array.isArray(result.bankara_challenge)) {
      matches.push(
        ...result.bankara_challenge.map((match) => ({
          ...match,
          match_type: 'バンカラマッチ(チャレンジ)',
        }))
      );
    }

    if (result.bankara_open && Array.isArray(result.bankara_open)) {
      matches.push(
        ...result.bankara_open.map((match) => ({
          ...match,
          match_type: 'バンカラマッチ(オープン)',
        }))
      );
    }

    if (result.x && Array.isArray(result.x)) {
      matches.push(
        ...result.x.map((match) => ({
          ...match,
          match_type: 'Xマッチ',
        }))
      );
    }

    console.log(`📊 Total matches found: ${matches.length}`);
    return matches;
  } catch (error) {
    console.error('❌ Error processing matches:', error);
    return [];
  }
}

export function getAllEventMatches(data: ScheduleData): EventMatch[] {
  try {
    const result = data.data.result;

    if (!result.event || !Array.isArray(result.event)) {
      console.log('📊 No event matches found');
      return [];
    }

    console.log(`📊 Event matches found: ${result.event.length}`);
    return result.event;
  } catch (error) {
    console.error('❌ Error processing event matches:', error);
    return [];
  }
}

export function getUpcomingMatches(
  matches: ScheduleMatch[],
  hoursAhead: number = 12
): ScheduleMatch[] {
  const now = new Date();
  const cutoffTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

  return matches
    .filter((match) => {
      const startTime = new Date(match.start_time);
      return startTime > now && startTime <= cutoffTime;
    })
    .sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
}

export function getUpcomingEventMatches(
  eventMatches: EventMatch[],
  hoursAhead: number = 12
): EventMatch[] {
  const now = new Date();
  const cutoffTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

  return eventMatches
    .filter((eventMatch) => {
      const startTime = new Date(eventMatch.start_time);
      return startTime > now && startTime <= cutoffTime;
    })
    .sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
}

export function getMatchesForNotification(
  matches: ScheduleMatch[],
  targetMinutes: number
): ScheduleMatch[] {
  const now = new Date();
  const targetTime = new Date(now.getTime() + targetMinutes * 60 * 1000);

  // ±5分の誤差を許容（Deno Cronの実行間隔を考慮）
  const tolerance = 5 * 60 * 1000; // 5分をミリ秒に変換

  return matches.filter((match) => {
    const startTime = new Date(match.start_time);
    const timeDiff = Math.abs(startTime.getTime() - targetTime.getTime());
    return timeDiff <= tolerance;
  });
}

export function getEventMatchesForNotification(
  eventMatches: EventMatch[],
  targetMinutes: number
): EventMatch[] {
  const now = new Date();
  const targetTime = new Date(now.getTime() + targetMinutes * 60 * 1000);

  // ±5分の誤差を許容（Deno Cronの実行間隔を考慮）
  const tolerance = 5 * 60 * 1000; // 5分をミリ秒に変換

  return eventMatches.filter((eventMatch) => {
    const startTime = new Date(eventMatch.start_time);
    const timeDiff = Math.abs(startTime.getTime() - targetTime.getTime());
    return timeDiff <= tolerance;
  });
}

export function formatMatchForDisplay(
  match: ScheduleMatch | EventMatch
): string {
  const startTime = new Date(match.start_time);
  const endTime = new Date(match.end_time);

  const startTimestamp = Math.floor(startTime.getTime() / 1000);
  const endTimestamp = Math.floor(endTime.getTime() / 1000);

  const stageNames = match.stages.map((stage) => stage.name).join(' / ');

  // EventMatchかどうかをチェック
  if ('event' in match) {
    return (
      `**🎪 イベントマッチ: ${match.event.name}**\n` +
      `🎮 **${match.rule.name}**\n` +
      `🗺️ ${stageNames}\n` +
      `⏰ <t:${startTimestamp}:t> - <t:${endTimestamp}:t>\n` +
      `📝 ${match.event.desc}`
    );
  } else {
    return (
      `**${match.match_type}**\n` +
      `🎮 **${match.rule.name}**\n` +
      `🗺️ ${stageNames}\n` +
      `⏰ <t:${startTimestamp}:t> - <t:${endTimestamp}:t>`
    );
  }
}
