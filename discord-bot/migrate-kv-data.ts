/**
 * KVデータ移行スクリプト
 * 旧複雑構造 → 新シンプル構造
 */

import { NotificationCondition } from './types.ts';

interface OldUserNotificationSettings {
  userId: string;
  guildId: string;
  conditions: NotificationCondition[];
  createdAt: number;
  updatedAt: number;
  settingId: string;
  version: string;
  channelId: string;
  chunkCount?: number;
  totalConditions?: number;
}

interface NewUserNotificationSettings {
  userId: string;
  guildId: string;
  channelId: string;
  conditions: NotificationCondition[];
  createdAt: number;
  updatedAt: number;
  settingId: string;
  version: string;
}

async function migrateKVData() {
  const kv = await Deno.openKv();

  try {
    console.log('🔄 KVデータ移行開始...');

    const migratedCount = { users: 0, legacy: 0, chunks: 0, schedules: 0 };

    // 1. 旧user_settingsデータを移行
    console.log('📦 旧user_settingsデータを検索中...');
    const legacyIter = kv.list({ prefix: ['user_settings'] });

    for await (const { value } of legacyIter) {
      const settings = value as any;
      console.log(`📝 移行中: ${settings.userId}/${settings.channelId}`);

      // 新形式で保存（guildIdがない場合はuserIdを使用）
      const guildId = settings.guildId || settings.userId;
      const newSettings: NewUserNotificationSettings = {
        userId: settings.userId,
        guildId,
        channelId: settings.channelId,
        conditions: settings.conditions || [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        settingId: crypto.randomUUID(),
        version: '2.0',
      };

      await kv.set(['notifications', settings.userId, guildId], newSettings);
      migratedCount.legacy++;
    }

    // 2. 旧notifications/usersデータを移行
    console.log('📦 旧notifications/usersデータを検索中...');
    const usersIter = kv.list({ prefix: ['notifications', 'users'] });

    for await (const { key, value } of usersIter) {
      const [, , userId, guildId] = key as string[];
      const oldSettings = value as OldUserNotificationSettings;

      console.log(`📝 移行中: ${userId}/${guildId}`);

      let allConditions: NotificationCondition[] = [];

      // チャンクからデータを復元
      if (oldSettings.chunkCount && oldSettings.chunkCount > 0) {
        for (let i = 0; i < oldSettings.chunkCount; i++) {
          try {
            const chunkResult = await kv.get([
              'notifications',
              'chunks',
              oldSettings.settingId,
              i.toString(),
            ]);
            if (chunkResult.value) {
              allConditions.push(
                ...(chunkResult.value as NotificationCondition[])
              );
            }
          } catch (error) {
            console.warn(`⚠️ チャンク ${i} の読み込みに失敗: ${error}`);
          }
        }
      } else {
        allConditions = oldSettings.conditions || [];
      }

      const newSettings: NewUserNotificationSettings = {
        userId: oldSettings.userId,
        guildId: oldSettings.guildId,
        channelId: oldSettings.channelId,
        conditions: allConditions,
        createdAt: oldSettings.createdAt,
        updatedAt: Date.now(),
        settingId: crypto.randomUUID(),
        version: '2.0',
      };

      await kv.set(['notifications', userId, guildId], newSettings);
      migratedCount.users++;
    }

    console.log('✅ 移行完了');
    console.log(`📊 移行結果:`);
    console.log(`   - 旧user_settingsユーザー: ${migratedCount.legacy}件`);
    console.log(`   - 旧notifications/usersユーザー: ${migratedCount.users}件`);

    // 3. 移行確認
    console.log('🔍 移行結果を確認中...');
    const newIter = kv.list({ prefix: ['notifications'] });
    let newCount = 0;

    for await (const { key, value } of newIter) {
      const [prefix, userId, guildId] = key as string[];
      if (prefix === 'notifications' && userId && guildId) {
        const settings = value as NewUserNotificationSettings;
        console.log(
          `✅ 新形式: ${userId}/${guildId} (${settings.conditions.length} conditions)`
        );
        newCount++;
      }
    }

    console.log(`📈 新形式データ総数: ${newCount}件`);

    console.log(
      '🧹 古いデータをクリーンアップしますか？ (手動で実行してください)'
    );
    console.log('   - 旧user_settingsデータ');
    console.log('   - 旧notifications/users, chunks, scheduleデータ');
  } catch (error) {
    console.error('❌ 移行エラー:', error);
    throw error;
  } finally {
    kv.close();
  }
}

async function cleanupOldData() {
  const kv = await Deno.openKv();

  try {
    console.log('🧹 古いデータのクリーンアップ開始...');

    // user_settingsを削除
    const legacyIter = kv.list({ prefix: ['user_settings'] });
    for await (const { key } of legacyIter) {
      await kv.delete(key);
      console.log(`🗑️ 削除: ${key.join('/')}`);
    }

    // 旧notifications構造を削除
    const oldNotificationsIter = kv.list({
      prefix: ['notifications', 'users'],
    });
    for await (const { key } of oldNotificationsIter) {
      await kv.delete(key);
      console.log(`🗑️ 削除: ${key.join('/')}`);
    }

    const chunksIter = kv.list({ prefix: ['notifications', 'chunks'] });
    for await (const { key } of chunksIter) {
      await kv.delete(key);
      console.log(`🗑️ 削除: ${key.join('/')}`);
    }

    const scheduleIter = kv.list({ prefix: ['notifications', 'schedule'] });
    for await (const { key } of scheduleIter) {
      await kv.delete(key);
      console.log(`🗑️ 削除: ${key.join('/')}`);
    }

    console.log('✅ クリーンアップ完了');
  } catch (error) {
    console.error('❌ クリーンアップエラー:', error);
    throw error;
  } finally {
    kv.close();
  }
}

// 実行
if (Deno.args.length > 0) {
  const args = Deno.args;

  if (args.includes('--migrate')) {
    await migrateKVData();
  } else if (args.includes('--cleanup')) {
    await cleanupOldData();
  } else {
    console.log('使用方法:');
    console.log(
      '  deno run --allow-all migrate-kv-data.ts --migrate   # データ移行'
    );
    console.log(
      '  deno run --allow-all migrate-kv-data.ts --cleanup   # 古いデータ削除'
    );
  }
}
