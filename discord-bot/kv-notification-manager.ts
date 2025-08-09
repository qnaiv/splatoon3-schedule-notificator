import { NotificationCondition } from './types.ts';

export interface UserNotificationSettings {
  userId: string;
  guildId: string;
  conditions: NotificationCondition[];
  createdAt: number;
  updatedAt: number;
  settingId: string; // UUID
  version: string;
  channelId: string;
}

export class KVNotificationManager {
  private kv: Deno.Kv | null = null;
  private readonly maxChunkSize = 10; // 条件を10件ごとに分割
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

  private generateUUID(): string {
    return crypto.randomUUID();
  }

  private getMainKey(userId: string, guildId: string): string[] {
    return ['notifications', 'users', userId, guildId];
  }

  private getChunkKey(settingId: string, chunkIndex: number): string[] {
    return ['notifications', 'chunks', settingId, chunkIndex.toString()];
  }

  private getScheduleIndexKey(settingId: string): string[] {
    return ['notifications', 'schedule', settingId];
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

    const settingId = this.generateUUID();
    const now = Date.now();
    
    const settings: UserNotificationSettings = {
      userId,
      guildId,
      conditions: [],
      createdAt: now,
      updatedAt: now,
      settingId,
      version: '1.0',
      channelId
    };

    return await this.retryOperation(async () => {
      // 条件をチャンクに分割
      const chunks: NotificationCondition[][] = [];
      for (let i = 0; i < conditions.length; i += this.maxChunkSize) {
        chunks.push(conditions.slice(i, i + this.maxChunkSize));
      }

      // 原子的操作で全データを保存
      const atomic = this.kv!.atomic();
      
      // メイン設定を保存（チャンク数を記録）
      const mainSettings = {
        ...settings,
        chunkCount: chunks.length,
        totalConditions: conditions.length
      };
      atomic.set(this.getMainKey(userId, guildId), mainSettings);

      // 各チャンクを保存
      for (let i = 0; i < chunks.length; i++) {
        atomic.set(this.getChunkKey(settingId, i), chunks[i]);
      }

      // スケジュールインデックスに追加
      atomic.set(this.getScheduleIndexKey(settingId), {
        userId,
        guildId,
        channelId,
        settingId,
        updatedAt: now
      });

      const result = await atomic.commit();
      if (!result.ok) {
        throw new Error('Atomic operation failed');
      }

      console.log(`✅ Settings saved: ${settingId} for user ${userId} (${conditions.length} conditions in ${chunks.length} chunks)`);
      return settingId;
    });
  }

  async getUserSettings(userId: string, guildId: string): Promise<UserNotificationSettings | null> {
    if (!this.kv) {
      throw new Error('KV not initialized');
    }

    return await this.retryOperation(async () => {
      // メイン設定を取得
      const mainResult = await this.kv!.get(this.getMainKey(userId, guildId));
      if (!mainResult.value) {
        return null;
      }

      const mainSettings = mainResult.value as UserNotificationSettings & {
        chunkCount?: number;
        totalConditions?: number;
      };

      // チャンクが存在する場合は条件を復元
      if (mainSettings.chunkCount && mainSettings.chunkCount > 0) {
        const allConditions: NotificationCondition[] = [];

        for (let i = 0; i < mainSettings.chunkCount; i++) {
          const chunkResult = await this.kv!.get(
            this.getChunkKey(mainSettings.settingId, i)
          );
          if (chunkResult.value) {
            allConditions.push(...(chunkResult.value as NotificationCondition[]));
          }
        }

        return {
          ...mainSettings,
          conditions: allConditions
        };
      }

      return mainSettings;
    });
  }

  async getAllActiveSettings(): Promise<UserNotificationSettings[]> {
    if (!this.kv) {
      throw new Error('KV not initialized');
    }

    return await this.retryOperation(async () => {
      const settings: UserNotificationSettings[] = [];
      
      // スケジュールインデックスから全設定を取得
      const iter = this.kv!.list({ prefix: ['notifications', 'schedule'] });
      
      for await (const { value } of iter) {
        const indexData = value as {
          userId: string;
          guildId: string;
          channelId: string;
          settingId: string;
          updatedAt: number;
        };

        try {
          const userSettings = await this.getUserSettings(
            indexData.userId, 
            indexData.guildId
          );
          if (userSettings) {
            settings.push(userSettings);
          }
        } catch (error) {
          console.error(`❌ Error loading settings for ${indexData.userId}:`, error);
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
      // まず既存設定を取得
      const existing = await this.getUserSettings(userId, guildId);
      if (!existing) {
        console.log(`⚠️ Settings not found for deletion: ${userId}/${guildId}`);
        return false;
      }

      // 原子的操作で全データを削除
      const atomic = this.kv!.atomic();

      // メイン設定削除
      atomic.delete(this.getMainKey(userId, guildId));

      // チャンクデータ削除
      const mainResult = await this.kv!.get(this.getMainKey(userId, guildId));
      if (mainResult.value) {
        const mainSettings = mainResult.value as UserNotificationSettings & {
          chunkCount?: number;
        };
        
        if (mainSettings.chunkCount) {
          for (let i = 0; i < mainSettings.chunkCount; i++) {
            atomic.delete(this.getChunkKey(mainSettings.settingId, i));
          }
        }
      }

      // スケジュールインデックス削除
      atomic.delete(this.getScheduleIndexKey(existing.settingId));

      const result = await atomic.commit();
      if (!result.ok) {
        throw new Error('Delete atomic operation failed');
      }

      console.log(`✅ Settings deleted: ${existing.settingId} for user ${userId}`);
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