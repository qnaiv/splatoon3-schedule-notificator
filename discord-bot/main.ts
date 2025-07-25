import { createBot, Intents, startBot, verifySignature } from "https://deno.land/x/discordeno@18.0.0/mod.ts";
import { BotSettings, UserSettings, NotificationCondition } from "./types.ts";
import { fetchScheduleData, getAllMatches, getMatchesForNotification } from "./schedule.ts";
import { checkNotificationConditions, sendNotification, createNotificationMessage, shouldNotify } from "./notifications.ts";

// 環境変数の取得
const DISCORD_TOKEN = Deno.env.get("DISCORD_TOKEN");
const DISCORD_APPLICATION_ID = Deno.env.get("DISCORD_APPLICATION_ID");
const DISCORD_PUBLIC_KEY = Deno.env.get("DISCORD_PUBLIC_KEY");

if (!DISCORD_TOKEN || !DISCORD_APPLICATION_ID) {
  console.error("❌ 環境変数が設定されていません:");
  console.error("  DISCORD_TOKEN:", !!DISCORD_TOKEN ? "✅" : "❌");
  console.error("  DISCORD_APPLICATION_ID:", !!DISCORD_APPLICATION_ID ? "✅" : "❌");
  console.error("  DISCORD_PUBLIC_KEY:", !!DISCORD_PUBLIC_KEY ? "✅" : "❌");
  
  if (!DISCORD_PUBLIC_KEY) {
    console.log("💡 DISCORD_PUBLIC_KEY は Discord Developer Portal の General Information にあります");
  }
  
  Deno.exit(1);
}

// ユーザー設定を保存するMap（メモリ内）
const userSettings = new Map<string, UserSettings>();

// Botの作成
const bot = createBot({
  token: DISCORD_TOKEN,
  intents: Intents.Guilds | Intents.GuildMessages,
  applicationId: BigInt(DISCORD_APPLICATION_ID),
  events: {
    ready: () => {
      console.log(`🤖 Bot がオンラインになりました！`);
      console.log(`📊 接続完了`);
    },
    
    interactionCreate: async (interaction) => {
      console.log("🔧 Debug: インタラクション受信");
      console.log("🔧 Debug: interaction type:", interaction.type);
      console.log("🔧 Debug: interaction data:", interaction.data);
      
      // インタラクションタイプが2（Application Command）でない場合はスキップ
      if (interaction.type !== 2) {
        console.log("❌ Debug: Application Commandではありません", interaction.type);
        return;
      }
      
      if (!interaction.data) {
        console.log("❌ Debug: interaction.data が存在しません");
        return;
      }
      
      const command = interaction.data.name;
      const userId = interaction.user?.id?.toString();
      const channelId = interaction.channelId?.toString();
      
      console.log("🔧 Debug: コマンド処理開始", { command, userId, channelId });
      
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
              // Base64デコードしてUTF-8文字列に復元
              const decoded = decodeURIComponent(Array.prototype.map.call(atob(settingsParam), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
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
            
            if (settings.conditions.length === 0) {
              await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
                type: 4,
                data: {
                  content: "❌ 有効な通知設定がありません。",
                  flags: 64
                }
              });
              return;
            }

            // 最初のレスポンス（必須）
            await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
              type: 4,
              data: {
                content: `📋 通知設定詳細を送信中... (${settings.conditions.length}件)`,
                flags: 64
              }
            });

            // 各条件を個別のメッセージとして送信
            for (let i = 0; i < settings.conditions.length; i++) {
              const condition = settings.conditions[i];
              const content = formatSingleConditionWithNumber(condition, channelId, i + 1, settings.conditions.length);
              
              await bot.helpers.sendMessage(channelId, {
                content
              });
            }
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
            console.log("🔧 Debug: testコマンド実行開始");
            const settings = userSettings.get(userId);
            console.log("🔧 Debug: ユーザー設定:", !!settings);
            
            if (!settings) {
              console.log("🔧 Debug: 設定なし応答送信中...");
              await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
                type: 4,
                data: {
                  content: "❌ 通知設定が見つかりません。先に `/watch` コマンドで設定してください。",
                  flags: 64
                }
              });
              console.log("✅ Debug: 設定なし応答送信完了");
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
        console.error("❌ Error details:", {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        
        try {
          await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
            type: 4,
            data: {
              content: "❌ コマンドの実行中にエラーが発生しました。",
              flags: 64
            }
          });
        } catch (responseError) {
          console.error("❌ Failed to send error response:", responseError);
        }
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

    await bot.helpers.upsertGlobalApplicationCommands(commands, DISCORD_APPLICATION_ID);
    console.log("✅ スラッシュコマンドを登録しました");
    console.log("🔧 Debug: 登録したコマンド数:", commands.length);
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

// Webhook サーバー
async function handleRequest(request: Request): Promise<Response> {
  if (request.method === "POST") {
    const signature = request.headers.get("x-signature-ed25519");
    const timestamp = request.headers.get("x-signature-timestamp");
    const body = await request.text();

    if (!signature || !timestamp || !DISCORD_PUBLIC_KEY) {
      return new Response("Unauthorized", { status: 401 });
    }

    try {
      const isValid = await verifySignature(body, signature, timestamp, DISCORD_PUBLIC_KEY);
      if (!isValid) {
        return new Response("Unauthorized", { status: 401 });
      }

      const interaction = JSON.parse(body);
      console.log("🔧 Debug: Webhook インタラクション受信", interaction.type);

      // Ping応答
      if (interaction.type === 1) {
        return new Response(JSON.stringify({ type: 1 }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      // スラッシュコマンド処理
      if (interaction.type === 2) {
        return await handleSlashCommand(interaction);
      }

      return new Response("Unknown interaction type", { status: 400 });
    } catch (error) {
      console.error("❌ Webhook処理エラー:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  return new Response("Method not allowed", { status: 405 });
}

// スラッシュコマンド処理
async function handleSlashCommand(interaction: any): Promise<Response> {
  const command = interaction.data.name;
  const userId = interaction.member?.user?.id || interaction.user?.id;
  const channelId = interaction.channel_id;

  console.log("🔧 Debug: コマンド処理", { command, userId, channelId });

  try {
    switch (command) {
      case "test": {
        const settings = userSettings.get(userId);
        
        if (!settings) {
          return new Response(JSON.stringify({
            type: 4,
            data: {
              content: "❌ 通知設定が見つかりません。先に `/watch` コマンドで設定してください。",
              flags: 64
            }
          }), {
            headers: { "Content-Type": "application/json" }
          });
        }

        return new Response(JSON.stringify({
          type: 4,
          data: {
            content: "🧪 テスト通知を送信します...",
            flags: 64
          }
        }), {
          headers: { "Content-Type": "application/json" }
        });
      }
      
      default:
        return new Response(JSON.stringify({
          type: 4,
          data: {
            content: "❌ 未知のコマンドです。",
            flags: 64
          }
        }), {
          headers: { "Content-Type": "application/json" }
        });
    }
  } catch (error) {
    console.error("❌ コマンド処理エラー:", error);
    return new Response(JSON.stringify({
      type: 4,
      data: {
        content: "❌ コマンドの実行中にエラーが発生しました。",
        flags: 64
      }
    }), {
      headers: { "Content-Type": "application/json" }
    });
  }
}

// Bot起動
async function main() {
  console.log("🚀 Splatoon3 Discord Bot を起動中...");
  console.log("🔧 Debug: 環境変数確認");
  console.log("DISCORD_TOKEN exists:", !!DISCORD_TOKEN);
  console.log("DISCORD_APPLICATION_ID exists:", !!DISCORD_APPLICATION_ID);
  console.log("DISCORD_PUBLIC_KEY exists:", !!DISCORD_PUBLIC_KEY);
  
  try {
    await registerCommands();
    console.log("✅ コマンド登録完了");
    
    // Webhook サーバー起動
    const port = 8000;
    console.log(`🌐 Webhook サーバーをポート ${port} で起動中...`);
    
    Deno.serve({ port }, handleRequest);
    
    console.log("✅ Bot が正常に起動しました！");
    console.log("📅 30分ごとに通知チェックが実行されます");
  } catch (error) {
    console.error("❌ Bot起動エラー:", error);
    throw error;
  }
}

// 単一条件の詳細情報をフォーマットする関数
function formatSingleCondition(condition: NotificationCondition, channelId: string): string {
  const formatArray = (items: string[], emptyText: string = "制限なし"): string => {
    if (items.length === 0) return emptyText;
    
    // 長い配列は改行で整理
    if (items.join(", ").length > 50) {
      return "\n      " + items.join(", ");
    }
    return items.join(", ");
  };

  const rulesText = formatArray(condition.rules);
  const matchTypesText = formatArray(condition.matchTypes);
  const stagesText = formatArray(condition.stages);

  return `📊 **通知設定**

🔔 **${condition.name}** (${condition.notifyMinutesBefore}分前)
   ├ ルール: ${rulesText}
   ├ マッチ: ${matchTypesText}
   └ ステージ: ${stagesText}

📍 通知先: <#${channelId}>`;
}

// 番号付き単一条件の詳細情報をフォーマットする関数
function formatSingleConditionWithNumber(condition: NotificationCondition, channelId: string, current: number, total: number): string {
  const formatArray = (items: string[], emptyText: string = "制限なし"): string => {
    if (items.length === 0) return emptyText;
    
    // 長い配列は改行で整理
    if (items.join(", ").length > 50) {
      return "\n      " + items.join(", ");
    }
    return items.join(", ");
  };

  const rulesText = formatArray(condition.rules);
  const matchTypesText = formatArray(condition.matchTypes);
  const stagesText = formatArray(condition.stages);

  // 最終通知時刻の表示
  const lastNotifiedText = condition.lastNotified 
    ? new Date(condition.lastNotified).toLocaleString('ja-JP', { 
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    : "まだ通知されていません";

  // 有効/無効状態（保存時にフィルタされているので基本的にすべて有効）
  const statusEmoji = condition.enabled !== false ? "✅" : "❌";
  const statusText = condition.enabled !== false ? "有効" : "無効";

  return `📊 **通知設定 ${current}/${total}**

🔔 **${condition.name}** ${statusEmoji} (${statusText})
   ├ 通知タイミング: **${condition.notifyMinutesBefore}分前**
   ├ ルール条件: ${rulesText}
   ├ マッチタイプ: ${matchTypesText}
   ├ ステージ条件: ${stagesText}
   ├ 最終通知: ${lastNotifiedText}
   └ 通知先: <#${channelId}>
`;
}

// @ts-ignore Deno specific import.meta.main
if (import.meta.main) {
  main().catch(console.error);
}