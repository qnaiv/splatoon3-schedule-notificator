import {
  KVNotificationManager,
  UserNotificationSettings,
} from './kv-notification-manager.ts';
import { ScheduleMatch, EventMatch, NotificationCondition } from './types.ts';
import {
  checkNotificationConditions,
  checkEventNotificationConditions,
  shouldNotify,
  shouldCheckForNotification,
} from './notifications.ts';
import { getAllEventMatches } from './schedule.ts';
import {
  sendRegularMatchNotification,
  sendEventMatchNotification,
} from './notification-utils.ts';

export class NotificationChecker {
  private kvManager: KVNotificationManager;
  private isRunning = false;
  private scheduleCache: any = null;
  private scheduleCacheExpiry = 0;
  private readonly scheduleCacheTimeout = 10 * 60 * 1000; // 10分キャッシュ
  private readonly discordToken: string;

  constructor(kvManager: KVNotificationManager, discordToken: string) {
    this.kvManager = kvManager;
    this.discordToken = discordToken;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ NotificationChecker is already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 NotificationChecker started (cron mode)');
  }

  stop(): void {
    this.isRunning = false;
    console.log('🛑 NotificationChecker stopped');
  }

  private async getScheduleData(): Promise<any> {
    const now = Date.now();

    // キャッシュが有効な場合は再利用
    if (this.scheduleCache && now < this.scheduleCacheExpiry) {
      return this.scheduleCache;
    }

    try {
      console.log('📡 スケジュールデータ取得中...');
      const response = await fetch(
        'https://qnaiv.github.io/splatoon3-schedule-notificator/api/schedule.json'
      );

      if (!response.ok) {
        throw new Error(`Schedule fetch failed: ${response.status}`);
      }

      const scheduleData = await response.json();

      // キャッシュを更新
      this.scheduleCache = scheduleData;
      this.scheduleCacheExpiry = now + this.scheduleCacheTimeout;

      console.log('✅ スケジュールデータ取得成功', {
        lastUpdated: scheduleData.lastUpdated,
        hasRegular: !!scheduleData.data?.result?.regular,
        hasX: !!scheduleData.data?.result?.x,
        hasBankara: !!scheduleData.data?.result?.bankara_challenge,
      });

      return scheduleData;
    } catch (error) {
      console.error('❌ スケジュールデータ取得失敗:', error);
      throw error;
    }
  }

  public async checkNotifications(): Promise<void> {
    console.log('🔄 定期通知チェック開始...');

    try {
      // KVから全アクティブ設定を取得
      const allSettings = await this.kvManager.getAllActiveSettings();
      console.log(`👥 アクティブユーザー数: ${allSettings.length}`);

      if (allSettings.length === 0) {
        console.log('📭 通知設定がありません');
        return;
      }

      // スケジュールデータ取得
      const scheduleData = await this.getScheduleData();
      if (!scheduleData) {
        console.log('❌ スケジュールデータの取得に失敗');
        return;
      }

      const allMatches = this.getAllMatchesFromData(scheduleData);
      const allEventMatches = getAllEventMatches(scheduleData);
      console.log(
        `🎮 総マッチ数: ${allMatches.length}, イベントマッチ数: ${allEventMatches.length}`
      );

      let totalNotificationsSent = 0;

      // 各ユーザーの設定をチェック
      for (const userSettings of allSettings) {
        try {
          const notifications = await this.checkUserNotifications(
            userSettings,
            allMatches,
            allEventMatches
          );
          totalNotificationsSent += notifications;
        } catch (error) {
          console.error(
            `❌ User notification check failed for ${userSettings.userId}:`,
            error
          );
        }
      }

      console.log(`✅ 定期通知チェック完了: ${totalNotificationsSent}件送信`);
    } catch (error) {
      console.error('❌ 定期通知チェックエラー:', error);
    }
  }

  private getAllMatchesFromData(scheduleData: any): ScheduleMatch[] {
    const result = scheduleData.data?.result;
    if (!result) {
      return [];
    }

    const allMatches: ScheduleMatch[] = [
      ...(result.regular || []).map((m: any) => ({
        ...m,
        match_type: 'レギュラーマッチ',
      })),
      ...(result.bankara_challenge || []).map((m: any) => ({
        ...m,
        match_type: 'バンカラマッチ(チャレンジ)',
      })),
      ...(result.bankara_open || []).map((m: any) => ({
        ...m,
        match_type: 'バンカラマッチ(オープン)',
      })),
      ...(result.x || []).map((m: any) => ({
        ...m,
        match_type: 'Xマッチ',
      })),
    ];

    return allMatches;
  }

  private async checkUserNotifications(
    userSettings: UserNotificationSettings,
    allMatches: ScheduleMatch[],
    allEventMatches: EventMatch[]
  ): Promise<number> {
    let notificationsSent = 0;

    for (const condition of userSettings.conditions) {
      if (!condition.enabled) continue;

      try {
        // 通常マッチの処理
        const targetMatches = this.getMatchesForNotification(
          allMatches,
          condition.notifyMinutesBefore
        );

        // 条件に合致するマッチをフィルタ
        const matchingMatches = checkNotificationConditions(
          targetMatches,
          condition
        );

        for (const match of matchingMatches) {
          if (shouldNotify(match, condition)) {
            const success = await sendRegularMatchNotification(
              userSettings.channelId,
              condition,
              match,
              this.discordToken
            );

            if (success) {
              // 通知成功時はKVのlastNotifiedを更新
              await this.kvManager.updateLastNotified(
                userSettings.userId,
                userSettings.guildId,
                condition.name
              );
              notificationsSent++;
              console.log(
                `✅ Regular match notification sent to user ${userSettings.userId} for condition "${condition.name}"`
              );
            }
          }
        }

        // イベントマッチの処理
        const targetEventMatches = this.getEventMatchesForNotification(
          allEventMatches,
          condition.notifyMinutesBefore
        );

        // 条件に合致するイベントマッチをフィルタ
        const matchingEventMatches = checkEventNotificationConditions(
          targetEventMatches,
          condition
        );

        for (const eventMatch of matchingEventMatches) {
          if (shouldNotify(eventMatch, condition)) {
            const success = await sendEventMatchNotification(
              userSettings.channelId,
              condition,
              eventMatch,
              this.discordToken
            );

            if (success) {
              // 通知成功時はKVのlastNotifiedを更新
              await this.kvManager.updateLastNotified(
                userSettings.userId,
                userSettings.guildId,
                condition.name
              );
              notificationsSent++;
              console.log(
                `✅ Event match notification sent to user ${userSettings.userId} for condition "${condition.name}"`
              );
            }
          }
        }
      } catch (error) {
        console.error(
          `❌ Error checking condition "${condition.name}" for user ${userSettings.userId}:`,
          error
        );
      }
    }

    return notificationsSent;
  }

  private getMatchesForNotification(
    matches: ScheduleMatch[],
    notifyMinutesBefore: number
  ): ScheduleMatch[] {
    const now = new Date();

    return matches.filter((match) =>
      shouldCheckForNotification(match, notifyMinutesBefore, now)
    );
  }

  private getEventMatchesForNotification(
    eventMatches: EventMatch[],
    notifyMinutesBefore: number
  ): EventMatch[] {
    const now = new Date();

    return eventMatches.filter((eventMatch) =>
      shouldCheckForNotification(eventMatch, notifyMinutesBefore, now)
    );
  }


}
