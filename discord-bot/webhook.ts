import { verifySignature } from "https://deno.land/x/discordeno@18.0.0/mod.ts";
import { BotSettings, UserSettings, NotificationCondition } from "./types.ts";
import { fetchScheduleData, getAllMatches, getMatchesForNotification } from "./schedule.ts";
import { checkNotificationConditions, sendNotification, createNotificationMessage, shouldNotify } from "./notifications.ts";

// 環境変数の取得
const DISCORD_TOKEN = Deno.env.get("DISCORD_TOKEN");
const DISCORD_APPLICATION_ID = Deno.env.get("DISCORD_APPLICATION_ID");
const DISCORD_PUBLIC_KEY = Deno.env.get("DISCORD_PUBLIC_KEY");

if (!DISCORD_TOKEN || !DISCORD_APPLICATION_ID || !DISCORD_PUBLIC_KEY) {
  console.error("❌ 環境変数が設定されていません:");
  console.error("  DISCORD_TOKEN:", !!DISCORD_TOKEN ? "✅" : "❌");
  console.error("  DISCORD_APPLICATION_ID:", !!DISCORD_APPLICATION_ID ? "✅" : "❌");
  console.error("  DISCORD_PUBLIC_KEY:", !!DISCORD_PUBLIC_KEY ? "✅" : "❌");
  throw new Error("必要な環境変数が設定されていません");
}

// ユーザー設定を保存するMap（メモリ内）
const userSettings = new Map<string, UserSettings>();

// Discord署名検証関数（手動実装）
async function verifyDiscordSignature(
  body: string,
  signature: string,
  timestamp: string,
  publicKey: string
): Promise<boolean> {
  try {
    const enc = new TextEncoder();
    const algorithm = { name: "Ed25519", namedCurve: "Ed25519" };
    
    // 公開鍵をインポート
    const keyData = new Uint8Array(
      publicKey.match(/.{2}/g)?.map(byte => parseInt(byte, 16)) || []
    );
    
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      algorithm,
      false,
      ["verify"]
    );
    
    // 署名をデコード
    const sigData = new Uint8Array(
      signature.match(/.{2}/g)?.map(byte => parseInt(byte, 16)) || []
    );
    
    // タイムスタンプ + ボディ でメッセージ作成
    const message = enc.encode(timestamp + body);
    
    // 署名検証
    return await crypto.subtle.verify(algorithm, cryptoKey, sigData, message);
  } catch (error) {
    console.error("署名検証エラー:", error);
    return false;
  }
}

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

    const response = await fetch(`https://discord.com/api/v10/applications/${DISCORD_APPLICATION_ID}/commands`, {
      method: "PUT",
      headers: {
        "Authorization": `Bot ${DISCORD_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(commands)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("❌ コマンド登録エラー:", error);
    } else {
      console.log("✅ スラッシュコマンドを登録しました");
      console.log("🔧 Debug: 登録したコマンド数:", commands.length);
    }
  } catch (error) {
    console.error("❌ コマンド登録エラー:", error);
  }
}

// Webhook サーバー
async function handleRequest(request: Request): Promise<Response> {
  console.log("🔧 Debug: リクエスト受信", request.method, request.url);
  
  if (request.method === "POST") {
    const signature = request.headers.get("x-signature-ed25519");
    const timestamp = request.headers.get("x-signature-timestamp");
    const body = await request.text();

    console.log("🔧 Debug: Header確認", {
      hasSignature: !!signature,
      hasTimestamp: !!timestamp,
      bodyLength: body.length
    });

    if (!signature || !timestamp) {
      console.log("❌ Debug: 署名またはタイムスタンプが見つかりません");
      return new Response("Unauthorized", { status: 401 });
    }

    try {
      // 手動署名検証（Discordenoの代替実装）
      const isValid = await verifyDiscordSignature(body, signature, timestamp, DISCORD_PUBLIC_KEY);
      
      console.log("🔧 Debug: 署名検証結果", isValid);
      
      if (!isValid) {
        console.log("❌ Debug: 署名検証に失敗");
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

  // GET リクエスト（接続テスト用）
  if (request.method === "GET") {
    console.log("🔧 Debug: GET リクエスト受信 - 接続テスト");
    return new Response("Discord Webhook Bot is running!", {
      headers: { "Content-Type": "text/plain" }
    });
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
      
      case "watch": {
        const settingsParam = interaction.data.options?.find((opt: any) => opt.name === "settings")?.value;
        
        if (!settingsParam) {
          return new Response(JSON.stringify({
            type: 4,
            data: {
              content: "❌ 設定文字列が指定されていません。",
              flags: 64
            }
          }), {
            headers: { "Content-Type": "application/json" }
          });
        }

        try {
          // Base64デコードしてJSON解析
          const decoded = atob(settingsParam);
          const settings: BotSettings = JSON.parse(decoded);
          
          // ユーザー設定を保存
          userSettings.set(userId, {
            userId,
            channelId,
            conditions: settings.conditions.filter(c => c.enabled)
          });
          
          const enabledCount = settings.conditions.filter(c => c.enabled).length;
          
          return new Response(JSON.stringify({
            type: 4,
            data: {
              content: `✅ 通知設定が完了しました！\n📊 有効な条件数: ${enabledCount}`,
              flags: 64
            }
          }), {
            headers: { "Content-Type": "application/json" }
          });
        } catch (error) {
          return new Response(JSON.stringify({
            type: 4,
            data: {
              content: "❌ 設定文字列の解析に失敗しました。正しい設定文字列を使用してください。",
              flags: 64
            }
          }), {
            headers: { "Content-Type": "application/json" }
          });
        }
      }
      
      case "status": {
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
        
        const conditionsList = settings.conditions
          .map(c => `• ${c.name} (${c.notifyMinutesBefore}分前)`)
          .join("\n");
          
        return new Response(JSON.stringify({
          type: 4,
          data: {
            content: `📊 **現在の通知設定**\n\n${conditionsList}\n\n📍 通知先: <#${channelId}>`,
            flags: 64
          }
        }), {
          headers: { "Content-Type": "application/json" }
        });
      }
      
      case "stop": {
        userSettings.delete(userId);
        
        return new Response(JSON.stringify({
          type: 4,
          data: {
            content: "✅ 通知設定を削除しました。",
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

// メイン処理
async function main() {
  console.log("🚀 Discord Webhook Bot を起動中...");
  console.log("🔧 Debug: 環境変数確認");
  console.log("DISCORD_TOKEN exists:", !!DISCORD_TOKEN);
  console.log("DISCORD_APPLICATION_ID exists:", !!DISCORD_APPLICATION_ID);
  console.log("DISCORD_PUBLIC_KEY exists:", !!DISCORD_PUBLIC_KEY);
  
  try {
    await registerCommands();
    console.log("✅ コマンド登録完了");
    
    // Webhook サーバー起動（Deno Deployが自動でポート管理）
    console.log("🌐 Webhook サーバーを起動中...");
    
    Deno.serve(handleRequest);
    
    console.log("✅ Webhook Bot が正常に起動しました！");
    console.log("🔗 Webhook エンドポイントが起動中...");
  } catch (error) {
    console.error("❌ Bot起動エラー:", error);
    throw error;
  }
}

if (import.meta.main) {
  main().catch(console.error);
}