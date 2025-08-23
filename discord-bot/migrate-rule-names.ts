/**
 * ルール名統一マイグレーションスクリプト
 * 既存の「ガチホコ」設定を「ガチホコバトル」に更新
 */

import { NotificationCondition } from './types.ts';
import {
  KVNotificationManager,
  UserNotificationSettings,
} from './kv-notification-manager.ts';

const RULE_MIGRATION_MAP: Record<string, string> = {
  ガチホコ: 'ガチホコバトル',
  // 将来的に他のルール名不整合があれば追加
};

async function migrateRuleNames() {
  const manager = new KVNotificationManager();

  try {
    console.log('🔄 ルール名マイグレーション開始...');
    await manager.initialize();

    const kv = await Deno.openKv();
    let updatedUsers = 0;
    let updatedConditionsCount = 0;

    // 全ユーザー設定を取得
    console.log('📦 既存の通知設定を検索中...');
    const iter = kv.list<UserNotificationSettings>({
      prefix: ['notifications'],
    });

    for await (const { key, value: settings } of iter) {
      if (
        !settings ||
        !settings.conditions ||
        !Array.isArray(settings.conditions)
      ) {
        continue;
      }

      const [prefix, userId, guildId] = key as string[];
      if (prefix !== 'notifications' || !userId || !guildId) {
        continue;
      }

      let hasUpdates = false;
      const updatedConditions: NotificationCondition[] =
        settings.conditions.map((condition) => {
          if (!condition.rules || !Array.isArray(condition.rules)) {
            return condition;
          }

          const updatedRules = condition.rules.map((rule) => {
            if (RULE_MIGRATION_MAP[rule]) {
              console.log(
                `  📝 ルール更新: ${rule} → ${RULE_MIGRATION_MAP[rule]}`
              );
              hasUpdates = true;
              updatedConditionsCount++;
              return RULE_MIGRATION_MAP[rule];
            }
            return rule;
          });

          return {
            ...condition,
            rules: updatedRules,
          };
        });

      if (hasUpdates) {
        console.log(`👤 ユーザー設定更新中: ${userId}/${guildId}`);

        const updatedSettings: UserNotificationSettings = {
          ...settings,
          conditions: updatedConditions,
          updatedAt: Date.now(),
          version: '2.1', // バージョンアップ
        };

        await kv.set(key, updatedSettings);
        updatedUsers++;
      }
    }

    kv.close();

    console.log('✅ ルール名マイグレーション完了');
    console.log(`📊 結果:`);
    console.log(`   - 更新されたユーザー: ${updatedUsers}人`);
    console.log(`   - 更新された通知条件: ${updatedConditionsCount}件`);

    if (updatedUsers === 0) {
      console.log('📌 更新対象の設定が見つかりませんでした');
    }
  } catch (error) {
    console.error('❌ マイグレーションエラー:', error);
    throw error;
  }
}

// 実行確認
async function verifyMigration() {
  const kv = await Deno.openKv();

  try {
    console.log('🔍 マイグレーション結果を確認中...');

    const iter = kv.list<UserNotificationSettings>({
      prefix: ['notifications'],
    });
    let totalUsers = 0;
    let gachocoUsers = 0;
    let gachocoBattleUsers = 0;

    for await (const { key, value: settings } of iter) {
      if (!settings || !settings.conditions) continue;

      const [prefix, userId, guildId] = key as string[];
      if (prefix !== 'notifications' || !userId || !guildId) continue;

      totalUsers++;

      const hasGachoco = settings.conditions.some(
        (condition) => condition.rules && condition.rules.includes('ガチホコ')
      );
      const hasGachocoBattle = settings.conditions.some(
        (condition) =>
          condition.rules && condition.rules.includes('ガチホコバトル')
      );

      if (hasGachoco) {
        gachocoUsers++;
        console.log(`⚠️  未変換設定発見: ${userId}/${guildId}`);
      }
      if (hasGachocoBattle) {
        gachocoBattleUsers++;
        console.log(`✅ 変換済み設定: ${userId}/${guildId}`);
      }
    }

    console.log('📊 確認結果:');
    console.log(`   - 総ユーザー数: ${totalUsers}人`);
    console.log(`   - 「ガチホコ」設定: ${gachocoUsers}人`);
    console.log(`   - 「ガチホコバトル」設定: ${gachocoBattleUsers}人`);
  } catch (error) {
    console.error('❌ 確認エラー:', error);
  } finally {
    kv.close();
  }
}

// 実行
if (Deno.args.length > 0) {
  const args = Deno.args;

  if (args.includes('--migrate')) {
    await migrateRuleNames();
  } else if (args.includes('--verify')) {
    await verifyMigration();
  } else {
    console.log('使用方法:');
    console.log(
      '  deno run --allow-all migrate-rule-names.ts --migrate  # ルール名マイグレーション実行'
    );
    console.log(
      '  deno run --allow-all migrate-rule-names.ts --verify   # マイグレーション結果確認'
    );
  }
} else {
  console.log(
    '🚨 重要: 既存ユーザー設定の「ガチホコ」→「ガチホコバトル」変換が必要'
  );
  console.log('実行前に --verify で現在の状況を確認することを推奨します');
  console.log('');
  console.log('使用方法:');
  console.log(
    '  deno run --allow-all migrate-rule-names.ts --verify   # 現在の設定確認'
  );
  console.log(
    '  deno run --allow-all migrate-rule-names.ts --migrate  # マイグレーション実行'
  );
}
