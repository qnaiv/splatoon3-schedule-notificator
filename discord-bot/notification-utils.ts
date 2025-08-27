import { ScheduleMatch, EventMatch, NotificationCondition, Stage, Embed } from './types.ts';

// 通知送信の制限設定
export const NOTIFICATION_LIMITS = {
  MAX_NOTIFICATIONS_PER_CONDITION: 3,
} as const;

// Embedの色設定
export const EMBED_COLORS = {
  REGULAR_MATCH: 0x00ff88,
  EVENT_MATCH: 0xff6600,
  TEST: 0x00ff88,
} as const;

/**
 * 通常マッチ用のEmbedを作成
 */
export function createRegularMatchEmbed(
  condition: NotificationCondition,
  match: ScheduleMatch,
  isManualCheck = false
): Embed {
  const stages = match.stages.map((stage: Stage) => stage.name).join(', ');
  const startTime = formatDateTime(match.start_time);

  const description = isManualCheck
    ? `**${condition.name}** の条件に合致しました！\n\n詳細なスケジュール: https://qnaiv.github.io/splatoon3-schedule-notificator/`
    : `**${condition.name}** の条件に合致しました！\n${condition.notifyMinutesBefore}分前です！\n\n詳細なスケジュール: https://qnaiv.github.io/splatoon3-schedule-notificator/`;

  return {
    title: '🦑 スプラトゥーン3 通知',
    description,
    fields: [
      {
        name: 'ルール',
        value: match.rule.name,
        inline: true,
      },
      {
        name: 'マッチタイプ',
        value: match.match_type,
        inline: true,
      },
      {
        name: 'ステージ',
        value: stages,
        inline: false,
      },
      {
        name: '開始時刻',
        value: startTime,
        inline: false,
      },
    ],
    color: EMBED_COLORS.REGULAR_MATCH,
    timestamp: new Date().toISOString(),
    footer: {
      text: 'Splatoon3 Schedule Bot',
    },
  };
}

/**
 * イベントマッチ用のEmbedを作成
 */
export function createEventMatchEmbed(
  condition: NotificationCondition,
  eventMatch: EventMatch,
  isManualCheck = false
): Embed {
  const stages = eventMatch.stages.map((stage: Stage) => stage.name).join(', ');
  const startTime = formatDateTime(eventMatch.start_time);

  const description = isManualCheck
    ? `**${condition.name}** の条件に合致しました！\n\n詳細なスケジュール: https://qnaiv.github.io/splatoon3-schedule-notificator/`
    : `**${condition.name}** の条件に合致しました！\n${condition.notifyMinutesBefore}分前です！\n\n詳細なスケジュール: https://qnaiv.github.io/splatoon3-schedule-notificator/`;

  return {
    title: '🎪 スプラトゥーン3 イベントマッチ通知',
    description,
    fields: [
      {
        name: 'イベント名',
        value: eventMatch.event.name,
        inline: true,
      },
      {
        name: 'ルール',
        value: eventMatch.rule.name,
        inline: true,
      },
      {
        name: 'ステージ',
        value: stages,
        inline: false,
      },
      {
        name: '開始時刻',
        value: startTime,
        inline: false,
      },
      {
        name: '説明',
        value: eventMatch.event.desc || 'なし',
        inline: false,
      },
    ],
    color: EMBED_COLORS.EVENT_MATCH,
    timestamp: new Date().toISOString(),
    footer: {
      text: 'Splatoon3 Schedule Bot - Event Match',
    },
  };
}

/**
 * Discord APIにメッセージを送信する共通関数
 */
export async function sendDiscordMessage(
  channelId: string,
  embed: Embed,
  discordToken: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bot ${discordToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          embeds: [embed],
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Discord通知送信失敗:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Discord通知送信エラー:', error);
    return false;
  }
}

/**
 * 日時をフォーマットする共通関数
 */
function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * 通常マッチの通知を送信
 */
export async function sendRegularMatchNotification(
  channelId: string,
  condition: NotificationCondition,
  match: ScheduleMatch,
  discordToken: string,
  isManualCheck = false
): Promise<boolean> {
  const embed = createRegularMatchEmbed(condition, match, isManualCheck);
  return await sendDiscordMessage(channelId, embed, discordToken);
}

/**
 * イベントマッチの通知を送信
 */
export async function sendEventMatchNotification(
  channelId: string,
  condition: NotificationCondition,
  eventMatch: EventMatch,
  discordToken: string,
  isManualCheck = false
): Promise<boolean> {
  const embed = createEventMatchEmbed(condition, eventMatch, isManualCheck);
  return await sendDiscordMessage(channelId, embed, discordToken);
}