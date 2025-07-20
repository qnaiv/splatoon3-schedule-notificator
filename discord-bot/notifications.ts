import { Bot } from "https://deno.land/x/discordeno@19.0.0/mod.ts";
import { NotificationCondition, ScheduleMatch, NotificationMessage, UserSettings } from "./types.ts";
import { formatMatchForDisplay } from "./schedule.ts";

export function checkNotificationConditions(
  matches: ScheduleMatch[],
  condition: NotificationCondition
): ScheduleMatch[] {
  return matches.filter(match => {
    // ルール条件チェック
    if (condition.rules.length > 0 && !condition.rules.includes(match.rule.name)) {
      return false;
    }
    
    // マッチタイプ条件チェック
    if (condition.matchTypes.length > 0 && !condition.matchTypes.includes(match.match_type)) {
      return false;
    }
    
    // ステージ条件チェック
    if (condition.stages.length > 0) {
      const matchStageIds = match.stages.map(stage => stage.id);
      const hasMatchingStage = condition.stages.some(stageId => 
        matchStageIds.includes(stageId)
      );
      if (!hasMatchingStage) {
        return false;
      }
    }
    
    return true;
  });
}

export async function sendNotification(
  bot: Bot,
  userSettings: UserSettings,
  notification: NotificationMessage
): Promise<boolean> {
  try {
    const embed = {
      title: "🦑 スプラトゥーン3 通知",
      description: `**${notification.condition.name}**\n${notification.condition.notifyMinutesBefore}分前です！`,
      fields: [
        {
          name: "マッチ情報",
          value: formatMatchForDisplay(notification.match),
          inline: false
        }
      ],
      color: 0x00ff88,
      timestamp: new Date().toISOString(),
      footer: {
        text: "Splatoon3 Schedule Bot"
      }
    };

    await bot.helpers.sendMessage(userSettings.channelId, {
      embeds: [embed]
    });

    console.log(`✅ Notification sent to user ${userSettings.userId} for condition "${notification.condition.name}"`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send notification to user ${userSettings.userId}:`, error);
    return false;
  }
}

export function createNotificationMessage(
  condition: NotificationCondition,
  match: ScheduleMatch
): NotificationMessage {
  const now = new Date();
  const startTime = new Date(match.start_time);
  const minutesUntilStart = Math.floor((startTime.getTime() - now.getTime()) / (1000 * 60));
  
  return {
    condition,
    match,
    minutesUntilStart
  };
}

export function shouldNotify(
  match: ScheduleMatch,
  notifyMinutesBefore: number,
  lastNotified?: string
): boolean {
  const now = new Date();
  const startTime = new Date(match.start_time);
  const notifyTime = new Date(startTime.getTime() - notifyMinutesBefore * 60 * 1000);
  
  // 通知時刻から±5分以内かチェック
  const timeDiff = Math.abs(now.getTime() - notifyTime.getTime());
  const isTimeToNotify = timeDiff <= 5 * 60 * 1000; // 5分の誤差許容
  
  if (!isTimeToNotify) {
    return false;
  }
  
  // 同じマッチについて既に通知済みかチェック
  if (lastNotified) {
    const lastNotifiedTime = new Date(lastNotified);
    const timeSinceLastNotification = now.getTime() - lastNotifiedTime.getTime();
    const oneHour = 60 * 60 * 1000;
    
    // 1時間以内に通知している場合は重複通知を避ける
    if (timeSinceLastNotification < oneHour) {
      return false;
    }
  }
  
  return true;
}