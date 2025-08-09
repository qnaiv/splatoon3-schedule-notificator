import { KVNotificationManager, UserNotificationSettings } from './kv-notification-manager.ts';
import { ScheduleMatch, EventMatch, NotificationCondition } from './types.ts';
import { getAllMatches } from './schedule.ts';
import { checkNotificationConditions, shouldNotify } from './notifications.ts';

export class NotificationChecker {
  private kvManager: KVNotificationManager;
  private isRunning = false;
  private scheduleCache: any = null;
  private scheduleCacheExpiry = 0;
  private readonly scheduleCacheTimeout = 10 * 60 * 1000; // 10分キャッシュ
  private readonly checkInterval = 5 * 60 * 1000; // 5分間隔
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
    console.log('🚀 NotificationChecker started');
    
    // 無限ループで通知チェック
    this.startNotificationLoop();
  }

  stop(): void {
    this.isRunning = false;
    console.log('🛑 NotificationChecker stopped');
  }

  private async startNotificationLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        await this.checkNotifications();
        await this.sleep(this.checkInterval);
      } catch (error) {
        console.error('❌ Notification check error:', error);
        // エラー時は1分後にリトライ
        await this.sleep(60 * 1000);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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

  private async checkNotifications(): Promise<void> {
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
      console.log(`🎮 総マッチ数: ${allMatches.length}`);

      let totalNotificationsSent = 0;

      // 各ユーザーの設定をチェック
      for (const userSettings of allSettings) {
        try {
          const notifications = await this.checkUserNotifications(
            userSettings, 
            allMatches
          );
          totalNotificationsSent += notifications;
        } catch (error) {
          console.error(`❌ User notification check failed for ${userSettings.userId}:`, error);
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
    allMatches: ScheduleMatch[]
  ): Promise<number> {
    let notificationsSent = 0;

    for (const condition of userSettings.conditions) {
      if (!condition.enabled) continue;

      try {
        // 通知対象のマッチを取得（指定時間前のマッチ）
        const targetMatches = this.getMatchesForNotification(
          allMatches,
          condition.notifyMinutesBefore
        );

        // 条件に合致するマッチをフィルタ
        const matchingMatches = checkNotificationConditions(targetMatches, condition);

        for (const match of matchingMatches) {
          if (shouldNotify(match, condition)) {
            const success = await this.sendDiscordNotification(
              userSettings,
              condition,
              match
            );

            if (success) {
              // 通知成功時はKVのlastNotifiedを更新
              await this.kvManager.updateLastNotified(
                userSettings.userId,
                userSettings.guildId,
                condition.name
              );
              notificationsSent++;
              console.log(`✅ Notification sent to user ${userSettings.userId} for condition "${condition.name}"`);
            }
          }
        }
      } catch (error) {
        console.error(`❌ Error checking condition "${condition.name}" for user ${userSettings.userId}:`, error);
      }
    }

    return notificationsSent;
  }

  private getMatchesForNotification(
    matches: ScheduleMatch[],
    notifyMinutesBefore: number
  ): ScheduleMatch[] {
    const now = new Date();

    return matches.filter((match) => {
      const startTime = new Date(match.start_time);
      const notifyTime = new Date(startTime.getTime() - notifyMinutesBefore * 60 * 1000);

      // 通知時刻から±10分以内のマッチを対象（5分間隔チェックに対応）
      const timeDiff = Math.abs(now.getTime() - notifyTime.getTime());
      return timeDiff <= 10 * 60 * 1000; // 10分の誤差許容
    });
  }

  private async sendDiscordNotification(
    userSettings: UserNotificationSettings,
    condition: NotificationCondition,
    match: ScheduleMatch
  ): Promise<boolean> {
    try {
      const stages = match.stages.map((stage: any) => stage.name).join(', ');
      const startTime = new Date(match.start_time).toLocaleString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      const embed = {
        title: '🦑 スプラトゥーン3 通知',
        description: `**${condition.name}** の条件に合致しました！\n${condition.notifyMinutesBefore}分前です！\n\n詳細なスケジュール: https://qnaiv.github.io/splatoon3-schedule-notificator/`,
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
        color: 0x00ff88,
        timestamp: new Date().toISOString(),
        footer: {
          text: 'Splatoon3 Schedule Bot',
        },
      };

      const response = await fetch(
        `https://discord.com/api/v10/channels/${userSettings.channelId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bot ${this.discordToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            embeds: [embed],
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error(`❌ Discord通知送信失敗:`, error);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`❌ Discord通知送信エラー:`, error);
      return false;
    }
  }
}