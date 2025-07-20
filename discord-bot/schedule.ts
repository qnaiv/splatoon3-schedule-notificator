import { ScheduleData, ScheduleMatch } from "./types.ts";

// GitHub Pagesからスケジュールデータを取得
const SCHEDULE_URL = "https://qnaiv.github.io/splatoon3-schedule-notificator/api/schedule.json";

export async function fetchScheduleData(): Promise<ScheduleData | null> {
  try {
    console.log(`📡 Fetching schedule data from: ${SCHEDULE_URL}`);
    
    const response = await fetch(SCHEDULE_URL, {
      headers: {
        "User-Agent": "Splatoon3-Discord-Bot/1.0",
        "Cache-Control": "no-cache"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: ScheduleData = await response.json();
    
    console.log(`✅ Schedule data fetched successfully`);
    console.log(`📊 Last updated: ${data.lastUpdated}`);
    
    return data;
  } catch (error) {
    console.error("❌ Failed to fetch schedule data:", error);
    return null;
  }
}

export function getAllMatches(data: ScheduleData): ScheduleMatch[] {
  const result = data.data.result;
  
  return [
    ...(result.regular || []).map(match => ({ ...match, match_type: "レギュラーマッチ" })),
    ...(result.bankara_challenge || []).map(match => ({ ...match, match_type: "バンカラマッチ(チャレンジ)" })),
    ...(result.bankara_open || []).map(match => ({ ...match, match_type: "バンカラマッチ(オープン)" })),
    ...(result.x || []).map(match => ({ ...match, match_type: "Xマッチ" }))
  ];
}

export function getUpcomingMatches(matches: ScheduleMatch[], hoursAhead: number = 12): ScheduleMatch[] {
  const now = new Date();
  const cutoffTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
  
  return matches
    .filter(match => {
      const startTime = new Date(match.start_time);
      return startTime > now && startTime <= cutoffTime;
    })
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
}

export function getMatchesForNotification(matches: ScheduleMatch[], targetMinutes: number): ScheduleMatch[] {
  const now = new Date();
  const targetTime = new Date(now.getTime() + targetMinutes * 60 * 1000);
  
  // ±5分の誤差を許容（Deno Cronの実行間隔を考慮）
  const tolerance = 5 * 60 * 1000; // 5分をミリ秒に変換
  
  return matches.filter(match => {
    const startTime = new Date(match.start_time);
    const timeDiff = Math.abs(startTime.getTime() - targetTime.getTime());
    return timeDiff <= tolerance;
  });
}

export function formatMatchForDisplay(match: ScheduleMatch): string {
  const startTime = new Date(match.start_time);
  const endTime = new Date(match.end_time);
  
  const startTimestamp = Math.floor(startTime.getTime() / 1000);
  const endTimestamp = Math.floor(endTime.getTime() / 1000);
  
  const stageNames = match.stages.map(stage => stage.name).join(" / ");
  
  return `**${match.match_type}**\n` +
         `🎮 **${match.rule.name}**\n` +
         `🗺️ ${stageNames}\n` +
         `⏰ <t:${startTimestamp}:t> - <t:${endTimestamp}:t>`;
}