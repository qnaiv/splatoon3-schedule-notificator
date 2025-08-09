import { NotificationCondition } from './types.ts';

export interface UserNotificationSettings {
  userId: string;
  guildId: string;
  channelId: string;
  conditions: NotificationCondition[];
  createdAt: number;
  updatedAt: number;
  settingId: string;
  version: string;
}

export class KVNotificationManager {
  private kv: Deno.Kv | null = null;
  private readonly maxRetries = 3;

  async initialize(): Promise<void> {
    try {
      console.log('🗄️ KVNotificationManager初期化中...');
      this.kv = await Deno.openKv();
      console.log('✅ KVNotificationManager初期化成功');
    } catch (error) {
      console.error('❌ KVNotificationManager初期化失敗:', error);
      throw error;
    }
  }

  private getSettingsKey(userId: string, guildId: string): string[] {
    return ['notifications', userId, guildId];
  }

  private async retryOperation<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.error(`❌ KV操作失敗 (試行 ${attempt}/${this.maxRetries}):`, error);
        
        if (attempt < this.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    throw lastError!;
  }

  async saveUserSettings(
    userId: string, 
    guildId: string, 
    conditions: NotificationCondition[],
    channelId: string
  ): Promise<string> {
    if (!this.kv) {
      throw new Error('KV not initialized');
    }

    const now = Date.now();
    const key = this.getSettingsKey(userId, guildId);

    return await this.retryOperation(async () => {
      // 既存設定を取得してcreatedAtを保持
      const existing = await this.kv!.get(key);
      const createdAt = existing.value ? (existing.value as UserNotificationSettings).createdAt : now;

      const settings: UserNotificationSettings = {
        userId,
        guildId,
        channelId,
        conditions,
        createdAt,
        updatedAt: now,
        settingId: crypto.randomUUID(),
        version: '2.0'
      };

      const result = await this.kv!.set(key, settings);
      if (!result.ok) {
        throw new Error('KV set operation failed');
      }

      console.log(`✅ Settings saved: ${userId}/${guildId} (${conditions.length} conditions)`);
      return settings.settingId;
    });
  }

  async getUserSettings(userId: string, guildId: string): Promise<UserNotificationSettings | null> {
    if (!this.kv) {
      throw new Error('KV not initialized');
    }

    return await this.retryOperation(async () => {
      const result = await this.kv!.get(this.getSettingsKey(userId, guildId));
      return result.value as UserNotificationSettings | null;
    });
  }

  async getAllActiveSettings(): Promise<UserNotificationSettings[]> {
    if (!this.kv) {
      throw new Error('KV not initialized');
    }

    return await this.retryOperation(async () => {
      const settings: UserNotificationSettings[] = [];
      
      // notificationsプレフィックスで直接スキャン
      const iter = this.kv!.list({ prefix: ['notifications'] });
      
      for await (const { value } of iter) {
        const userSettings = value as UserNotificationSettings;
        if (userSettings.conditions && userSettings.conditions.length > 0) {
          settings.push(userSettings);
        }
      }

      return settings;
    });
  }

  async deleteUserSettings(userId: string, guildId: string): Promise<boolean> {
    if (!this.kv) {
      throw new Error('KV not initialized');
    }

    return await this.retryOperation(async () => {
      const key = this.getSettingsKey(userId, guildId);
      const existing = await this.kv!.get(key);
      
      if (!existing.value) {
        console.log(`⚠️ Settings not found for deletion: ${userId}/${guildId}`);
        return false;
      }

      await this.kv!.delete(key);
      console.log(`✅ Settings deleted: ${userId}/${guildId}`);
      return true;
    });
  }

  async updateLastNotified(userId: string, guildId: string, conditionName: string): Promise<boolean> {
    if (!this.kv) {
      throw new Error('KV not initialized');
    }

    return await this.retryOperation(async () => {
      const settings = await this.getUserSettings(userId, guildId);
      if (!settings) {
        return false;
      }

      // 条件のlastNotifiedを更新
      const updatedConditions = settings.conditions.map(condition => {
        if (condition.name === conditionName) {
          return {
            ...condition,
            lastNotified: new Date().toISOString()
          };
        }
        return condition;
      });

      // 設定を再保存
      await this.saveUserSettings(userId, guildId, updatedConditions, settings.channelId);
      return true;
    });
  }

  async cleanup(): Promise<void> {
    if (this.kv) {
      try {
        this.kv.close();
        this.kv = null;
        console.log('✅ KV connection closed');
      } catch (error) {
        console.error('❌ Error closing KV connection:', error);
      }
    }
  }
}