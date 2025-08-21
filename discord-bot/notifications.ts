import { Bot } from 'https://deno.land/x/discordeno@18.0.0/mod.ts';
import {
  NotificationCondition,
  ScheduleMatch,
  EventMatch,
  NotificationMessage,
  UserSettings,
} from './types.ts';
import { formatMatchForDisplay } from './schedule.ts';

export function checkNotificationConditions(
  matches: ScheduleMatch[],
  condition: NotificationCondition
): ScheduleMatch[] {
  return matches.filter((match) => {
    // ルール条件チェック
    if (
      condition.rules &&
      condition.rules.length > 0 &&
      !condition.rules.includes(match.rule.name)
    ) {
      return false;
    }

    // マッチタイプ条件チェック
    if (
      condition.matchTypes &&
      condition.matchTypes.length > 0 &&
      !condition.matchTypes.includes(match.match_type)
    ) {
      return false;
    }

    // ステージ条件チェック
    if (condition.stages && condition.stages.length > 0) {
      const matchStageIds = match.stages.map((stage) => stage.id);
      const hasMatchingStage = condition.stages.some((stageId) =>
        matchStageIds.includes(stageId)
      );
      if (!hasMatchingStage) {
        return false;
      }
    }

    return true;
  });
}

export function checkEventNotificationConditions(
  eventMatches: EventMatch[],
  condition: NotificationCondition
): EventMatch[] {
  // イベントマッチ条件が無効または未定義の場合は空配列を返す
  if (!condition.eventMatches?.enabled) {
    return [];
  }

  const eventMatchCondition = condition.eventMatches;

  return eventMatches.filter((eventMatch) => {
    try {
      // イベントタイプ条件チェック（安全なnullチェック）
      if (
        eventMatchCondition.eventTypes &&
        eventMatchCondition.eventTypes.length > 0
      ) {
        if (!eventMatchCondition.eventTypes.includes(eventMatch.event.name)) {
          return false;
        }
      }

      // イベントステージ条件チェック（安全なnullチェック）
      if (
        eventMatchCondition.eventStages &&
        eventMatchCondition.eventStages.length > 0
      ) {
        const matchStageIds = eventMatch.stages.map((stage) => stage.id);
        const hasMatchingStage = eventMatchCondition.eventStages.some(
          (stageId) => matchStageIds.includes(stageId)
        );
        if (!hasMatchingStage) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Error checking event notification condition:', error);
      return false;
    }
  });
}

export async function sendNotification(
  bot: Bot,
  userSettings: UserSettings,
  notification: NotificationMessage
): Promise<boolean> {
  try {
    const embed = {
      title: '🦑 スプラトゥーン3 通知',
      description: `**${notification.condition.name}**\n${notification.condition.notifyMinutesBefore}分前です！\n\n詳細なスケジュール: https://qnaiv.github.io/splatoon3-schedule-notificator/`,
      fields: [
        {
          name: 'マッチ情報',
          value: formatMatchForDisplay(notification.match),
          inline: false,
        },
      ],
      color: 0x00ff88,
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Splatoon3 Schedule Bot',
      },
    };

    await bot.helpers.sendMessage(userSettings.channelId, {
      embeds: [embed],
    });

    console.log(
      `✅ Notification sent to user ${userSettings.userId} for condition "${notification.condition.name}"`
    );
    return true;
  } catch (error) {
    console.error(
      `❌ Failed to send notification to user ${userSettings.userId}:`,
      error
    );
    return false;
  }
}

export function createNotificationMessage(
  condition: NotificationCondition,
  match: ScheduleMatch | EventMatch
): NotificationMessage {
  const now = new Date();
  const startTime = new Date(match.start_time);
  const minutesUntilStart = Math.floor(
    (startTime.getTime() - now.getTime()) / (1000 * 60)
  );

  return {
    condition,
    match,
    minutesUntilStart,
  };
}

export function shouldCheckForNotification(
  match: ScheduleMatch | EventMatch,
  notifyMinutesBefore: number,
  currentTime: Date = new Date()
): boolean {
  const startTime = new Date(match.start_time);
  const endTime = new Date(match.end_time);
  const notifyTime = new Date(
    startTime.getTime() - notifyMinutesBefore * 60 * 1000
  );

  // 条件: 通知時刻 ≤ 現在時刻 < 終了時刻
  return notifyTime <= currentTime && currentTime < endTime;
}

export function checkDuplicateNotification(
  condition: NotificationCondition
): boolean {
  // この条件で既に通知済みかチェック
  if (condition.lastNotified) {
    const now = new Date();
    const lastNotifiedTime = new Date(condition.lastNotified);
    const timeSinceLastNotification =
      now.getTime() - lastNotifiedTime.getTime();

    // 通知設定の時間間隔より短い間隔での重複通知を防ぐ
    // 例: 24時間前通知なら、24時間以内の重複を防ぐ
    const notificationInterval = condition.notifyMinutesBefore * 60 * 1000;
    const minInterval = Math.max(notificationInterval, 60 * 60 * 1000); // 最低1時間

    if (timeSinceLastNotification < minInterval) {
      return false; // 重複通知のため送信しない
    }
  }

  return true; // 重複ではないため通知可能
}
