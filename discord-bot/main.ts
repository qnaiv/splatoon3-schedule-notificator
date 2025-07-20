import { createBot, Intents, startBot } from "@discordeno/bot";
import { encode } from "@std/encoding/base64.ts";
import { BotSettings, UserSettings, NotificationCondition } from "./types.ts";
import { fetchScheduleData, getAllMatches, getMatchesForNotification } from "./schedule.ts";
import { checkNotificationConditions, sendNotification, createNotificationMessage, shouldNotify } from "./notifications.ts";

// 環境変数の取得
const DISCORD_TOKEN = Deno.env.get("DISCORD_TOKEN");
const DISCORD_APPLICATION_ID = Deno.env.get("DISCORD_APPLICATION_ID");

if (!DISCORD_TOKEN || !DISCORD_APPLICATION_ID) {
  console.error("❌ 環境変数が設定されていません:");
  console.error("  DISCORD_TOKEN:", !!DISCORD_TOKEN ? "✅" : "❌");
  console.error("  DISCORD_APPLICATION_ID:", !!DISCORD_APPLICATION_ID ? "✅" : "❌");
  Deno.exit(1);
}

// ユーザー設定を保存するMap（メモリ内）
const userSettings = new Map<string, UserSettings>();

// Botの作成
const bot = createBot({
  token: DISCORD_TOKEN,
  intents: Intents.Guilds | Intents.GuildMessages,
  events: {
    ready: (payload) => {
      console.log(`🤖 ${payload.user.username} がオンラインになりました！`);
      console.log(`📊 ${payload.guilds.length} のサーバーに参加中`);
    },
    
    interactionCreate: async (interaction) => {
      if (!interaction.data) return;
      
      const command = interaction.data.name;
      const userId = interaction.user.id.toString();
      const channelId = interaction.channelId?.toString();
      
      if (!channelId) {
        await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
          type: 4,
          data: {
            content: "❌ チャンネル情報が取得できませんでした。",
            flags: 64 // EPHEMERAL
          }
        });
        return;
      }

      try {
        switch (command) {
          case "watch": {
            const settingsParam = interaction.data.options?.find(opt => opt.name === "settings")?.value as string;
            
            if (!settingsParam) {
              await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
                type: 4,
                data: {
                  content: "❌ 設定文字列が指定されていません。",
                  flags: 64
                }
              });
              return;
            }

            try {
              // Base64デコードしてJSON解析
              const decoded = new TextDecoder().decode(
                new Uint8Array([...atob(settingsParam)].map(c => c.charCodeAt(0)))
              );
              const settings: BotSettings = JSON.parse(decoded);
              
              // ユーザー設定を保存
              userSettings.set(userId, {
                userId,
                channelId,
                conditions: settings.conditions.filter(c => c.enabled)
              });
              
              const enabledCount = settings.conditions.filter(c => c.enabled).length;
              
              await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
                type: 4,
                data: {
                  content: `✅ 通知設定が完了しました！\n📊 有効な条件数: ${enabledCount}`,
                  flags: 64
                }
              });
              
              console.log(`📝 User ${userId} set ${enabledCount} notification conditions`);
            } catch (error) {
              await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
                type: 4,
                data: {
                  content: "❌ 設定文字列の解析に失敗しました。正しい設定文字列を使用してください。",
                  flags: 64
                }
              });
            }
            break;
          }
          
          case "status": {
            const settings = userSettings.get(userId);
            
            if (!settings) {
              await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
                type: 4,
                data: {
                  content: "❌ 通知設定が見つかりません。先に `/watch` コマンドで設定してください。",
                  flags: 64
                }
              });
              return;
            }
            
            const conditionsList = settings.conditions
              .map(c => `• ${c.name} (${c.notifyMinutesBefore}分前)`)
              .join("\\n");
              
            await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
              type: 4,
              data: {
                content: `📊 **現在の通知設定**\\n\\n${conditionsList}\\n\\n📍 通知先: <#${channelId}>`,
                flags: 64
              }
            });
            break;
          }
          
          case "stop": {
            userSettings.delete(userId);
            
            await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
              type: 4,
              data: {
                content: "✅ 通知設定を削除しました。",
                flags: 64
              }
            });
            
            console.log(`🗑️ User ${userId} stopped notifications`);
            break;
          }
          
          case "test": {
            const settings = userSettings.get(userId);
            
            if (!settings) {
              await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
                type: 4,
                data: {
                  content: "❌ 通知設定が見つかりません。先に `/watch` コマンドで設定してください。",
                  flags: 64
                }
              });
              return;
            }
            
            await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
              type: 4,
              data: {
                content: "🧪 テスト通知を送信します...",
                flags: 64
              }
            });
            
            // テスト通知の送信
            const embed = {
              title: "🧪 テスト通知",
              description: "通知機能は正常に動作しています！",
              color: 0x00ff88,
              timestamp: new Date().toISOString(),
              footer: {
                text: "Splatoon3 Schedule Bot"
              }
            };
            
            await bot.helpers.sendMessage(channelId, {
              embeds: [embed]
            });
            
            console.log(`🧪 Test notification sent to user ${userId}`);
            break;
          }
        }
      } catch (error) {
        console.error("❌ Command execution error:", error);
        await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
          type: 4,
          data: {
            content: "❌ コマンドの実行中にエラーが発生しました。",
            flags: 64
          }
        });
      }
    }
  }
});

// スラッシュコマンドの登録
async function registerCommands() {
  try {
    const commands = [
      {
        name: "watch",
        description: "スケジュール通知の監視を開始",
        options: [
          {
            name: "settings",
            description: "WebUIで生成された設定文字列",
            type: 3, // STRING
            required: true
          }
        ]
      },
      {
        name: "status",
        description: "現在の通知設定を確認"
      },
      {
        name: "stop",
        description: "通知監視を停止"
      },
      {
        name: "test",
        description: "テスト通知を送信"
      }
    ];

    await bot.helpers.upsertGlobalApplicationCommands(commands);
    console.log("✅ スラッシュコマンドを登録しました");
  } catch (error) {
    console.error("❌ コマンド登録エラー:", error);
  }
}

// 定期的な通知チェック（30分ごと）
async function checkNotifications() {
  console.log("🔄 通知チェックを開始...");
  
  try {
    const scheduleData = await fetchScheduleData();
    if (!scheduleData) {
      console.log("❌ スケジュールデータの取得に失敗");
      return;
    }
    
    const allMatches = getAllMatches(scheduleData);
    let totalNotificationsSent = 0;
    
    for (const [userId, settings] of userSettings.entries()) {
      for (const condition of settings.conditions) {
        const targetMatches = getMatchesForNotification(allMatches, condition.notifyMinutesBefore);
        const matchingMatches = checkNotificationConditions(targetMatches, condition);
        
        for (const match of matchingMatches) {
          if (shouldNotify(match, condition.notifyMinutesBefore, settings.lastNotified)) {
            const notification = createNotificationMessage(condition, match);
            const success = await sendNotification(bot, settings, notification);
            
            if (success) {
              settings.lastNotified = new Date().toISOString();
              totalNotificationsSent++;
            }
          }
        }
      }
    }
    
    console.log(`✅ 通知チェック完了: ${totalNotificationsSent}件送信`);
  } catch (error) {
    console.error("❌ 通知チェックエラー:", error);
  }
}

// Deno Cron（30分ごと）
Deno.cron("notification-check", "*/30 * * * *", checkNotifications);

// Bot起動
async function main() {
  console.log("🚀 Splatoon3 Discord Bot を起動中...");
  
  await startBot(bot);
  await registerCommands();
  
  console.log("✅ Bot が正常に起動しました！");
  console.log("📅 30分ごとに通知チェックが実行されます");
}

if (import.meta.main) {
  main().catch(console.error);
}