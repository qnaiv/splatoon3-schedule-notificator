import {
  BotSettings,
  NotificationCondition,
  DiscordInteraction,
  Embed,
  ScheduleMatch,
  ApiMatch,
  Stage,
} from './types.ts';
import { KVNotificationManager } from './kv-notification-manager.ts';
import { shouldCheckForNotification } from './notifications.ts';
import { getVersionFooterText } from './version.ts';

import { NotificationChecker } from './notification-checker.ts';

// 環境変数の取得
const DISCORD_TOKEN = Deno.env.get('DISCORD_TOKEN');
const DISCORD_APPLICATION_ID = Deno.env.get('DISCORD_APPLICATION_ID');
const DISCORD_PUBLIC_KEY = Deno.env.get('DISCORD_PUBLIC_KEY');

if (!DISCORD_TOKEN || !DISCORD_APPLICATION_ID || !DISCORD_PUBLIC_KEY) {
  console.error('❌ 環境変数が設定されていません:');
  console.error('  DISCORD_TOKEN:', !!DISCORD_TOKEN ? '✅' : '❌');
  console.error(
    '  DISCORD_APPLICATION_ID:',
    !!DISCORD_APPLICATION_ID ? '✅' : '❌'
  );
  console.error('  DISCORD_PUBLIC_KEY:', !!DISCORD_PUBLIC_KEY ? '✅' : '❌');
  throw new Error('必要な環境変数が設定されていません');
}

// KV通知マネージャーとチェッカー
let kvManager: KVNotificationManager | null = null;
let notificationChecker: NotificationChecker | null = null;

// Discord署名検証関数（手動実装）
async function verifyDiscordSignature(
  body: string,
  signature: string,
  timestamp: string,
  publicKey: string
): Promise<boolean> {
  try {
    const enc = new TextEncoder();
    const algorithm = { name: 'Ed25519', namedCurve: 'Ed25519' };

    // 公開鍵をインポート
    const keyData = new Uint8Array(
      publicKey.match(/.{2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      algorithm,
      false,
      ['verify']
    );

    // 署名をデコード
    const sigData = new Uint8Array(
      signature.match(/.{2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );

    // タイムスタンプ + ボディ でメッセージ作成
    const message = enc.encode(timestamp + body);

    // 署名検証
    return await crypto.subtle.verify(algorithm, cryptoKey, sigData, message);
  } catch (error) {
    console.error('署名検証エラー:', error);
    return false;
  }
}

// スラッシュコマンドの登録
async function registerCommands() {
  try {
    const commands = [
      {
        name: 'watch',
        description: 'スケジュール通知の監視を開始',
        options: [
          {
            name: 'settings',
            description: 'WebUIで生成された設定文字列',
            type: 3, // STRING
            required: true,
          },
        ],
      },
      {
        name: 'status',
        description: '現在の通知設定を確認',
      },
      {
        name: 'stop',
        description: '通知監視を停止',
      },
      {
        name: 'test',
        description: 'テスト通知を送信',
      },
      {
        name: 'check',
        description: '今すぐ通知条件をチェックして送信',
      },
    ];

    const response = await fetch(
      `https://discord.com/api/v10/applications/${DISCORD_APPLICATION_ID}/commands`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bot ${DISCORD_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commands),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ コマンド登録エラー:', error);
    } else {
      console.log('✅ スラッシュコマンドを登録しました');
      console.log('🔧 Debug: 登録したコマンド数:', commands.length);
    }
  } catch (error) {
    console.error('❌ コマンド登録エラー:', error);
  }
}

// Webhook サーバー
async function handleRequest(request: Request): Promise<Response> {
  console.log('🔧 Debug: リクエスト受信', request.method, request.url);

  if (request.method === 'POST') {
    const signature = request.headers.get('x-signature-ed25519');
    const timestamp = request.headers.get('x-signature-timestamp');
    const body = await request.text();

    console.log('🔧 Debug: Header確認', {
      hasSignature: !!signature,
      hasTimestamp: !!timestamp,
      bodyLength: body.length,
    });

    if (!signature || !timestamp) {
      console.log('❌ Debug: 署名またはタイムスタンプが見つかりません');
      return new Response('Unauthorized', { status: 401 });
    }

    try {
      // 手動署名検証（Discordenoの代替実装）
      const isValid = await verifyDiscordSignature(
        body,
        signature,
        timestamp,
        DISCORD_PUBLIC_KEY
      );

      console.log('🔧 Debug: 署名検証結果', isValid);

      if (!isValid) {
        console.log('❌ Debug: 署名検証に失敗');
        return new Response('Unauthorized', { status: 401 });
      }

      const interaction = JSON.parse(body);
      console.log('🔧 Debug: Webhook インタラクション受信', interaction.type);

      // Ping応答
      if (interaction.type === 1) {
        return new Response(JSON.stringify({ type: 1 }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // スラッシュコマンド処理
      if (interaction.type === 2) {
        return await handleSlashCommand(interaction);
      }

      return new Response('Unknown interaction type', { status: 400 });
    } catch (error) {
      console.error('❌ Webhook処理エラー:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }

  // GET リクエスト（接続テスト用）
  if (request.method === 'GET') {
    console.log('🔧 Debug: GET リクエスト受信 - 接続テスト');
    return new Response('Discord Webhook Bot is running!', {
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return new Response('Method not allowed', { status: 405 });
}

// スラッシュコマンド処理
async function handleSlashCommand(
  interaction: DiscordInteraction
): Promise<Response> {
  const command = interaction.data.name;
  const userId = interaction.member?.user?.id || interaction.user?.id;
  const channelId = interaction.channel_id;
  const guildId = interaction.guild_id;

  console.log('🔧 Debug: コマンド処理', {
    command,
    userId,
    channelId,
    guildId,
  });

  try {
    switch (command) {
      case 'watch': {
        const settingsParam = interaction.data.options?.find(
          (opt) => opt.name === 'settings'
        )?.value;

        if (!settingsParam) {
          return new Response(
            JSON.stringify({
              type: 4,
              data: {
                content: '❌ 設定文字列が指定されていません。',
                flags: 64,
              },
            }),
            {
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }

        if (!kvManager) {
          return new Response(
            JSON.stringify({
              type: 4,
              data: {
                content:
                  '❌ システムが初期化されていません。しばらく後に再試行してください。',
                flags: 64,
              },
            }),
            {
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }

        try {
          // Base64デコードしてJSON解析
          const decoded = decodeURIComponent(
            Array.prototype.map
              .call(
                atob(settingsParam),
                (c: string) =>
                  '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
              )
              .join('')
          );
          const settings: BotSettings = JSON.parse(decoded);

          // 有効な条件のみフィルタ
          const enabledConditions = settings.conditions.filter(
            (c) => c.enabled
          );

          // 即座にKVに保存
          const settingId = await kvManager.saveUserSettings(
            userId!,
            guildId || 'dm',
            enabledConditions,
            channelId
          );

          console.log(
            `✅ Settings saved immediately: ${settingId} for user ${userId}`
          );

          return new Response(
            JSON.stringify({
              type: 4,
              data: {
                content: `✅ 通知設定が完了しました！\n📊 有効な条件数: ${enabledConditions.length}\n🔑 設定ID: ${settingId}`,
                flags: 64,
              },
            }),
            {
              headers: { 'Content-Type': 'application/json' },
            }
          );
        } catch (error) {
          console.error('❌ Failed to save settings:', error);
          return new Response(
            JSON.stringify({
              type: 4,
              data: {
                content:
                  error instanceof Error && error.message.includes('解析')
                    ? '❌ 設定文字列の解析に失敗しました。正しい設定文字列を使用してください。'
                    : '❌ 設定の保存に失敗しました。しばらく後に再試行してください。',
                flags: 64,
              },
            }),
            {
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      }

      case 'status': {
        if (!kvManager) {
          return new Response(
            JSON.stringify({
              type: 4,
              data: {
                content:
                  '❌ システムが初期化されていません。しばらく後に再試行してください。',
                flags: 64,
              },
            }),
            {
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }

        try {
          const settings = await kvManager.getUserSettings(
            userId!,
            guildId || 'dm'
          );

          if (!settings) {
            return new Response(
              JSON.stringify({
                type: 4,
                data: {
                  content:
                    '❌ 通知設定が見つかりません。先に `/watch` コマンドで設定してください。',
                  flags: 64,
                },
              }),
              {
                headers: { 'Content-Type': 'application/json' },
              }
            );
          }

          if (settings.conditions.length === 0) {
            return new Response(
              JSON.stringify({
                type: 4,
                data: {
                  content: '❌ 有効な通知設定がありません。',
                  flags: 64,
                },
              }),
              {
                headers: { 'Content-Type': 'application/json' },
              }
            );
          }

          // 最初のレスポンス（必須）
          await fetch(
            `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 4,
                data: {
                  content: `📋 通知設定詳細を送信中... (${settings.conditions.length}件)\\n🔑 設定ID: ${settings.settingId}\\n🕐 最終更新: ${new Date(settings.updatedAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`,
                  flags: 64,
                },
              }),
            }
          );

          // 各条件を個別のメッセージとして送信
          for (let i = 0; i < settings.conditions.length; i++) {
            const condition = settings.conditions[i];
            const content = formatSingleConditionWithNumber(
              condition,
              channelId,
              i + 1,
              settings.conditions.length
            );

            await sendSimpleMessage(channelId, content);
          }

          // 空のレスポンスを返す
          return new Response(null, { status: 204 });
        } catch (error) {
          console.error('❌ Failed to get user settings:', error);
          return new Response(
            JSON.stringify({
              type: 4,
              data: {
                content:
                  '❌ 設定の取得に失敗しました。しばらく後に再試行してください。',
                flags: 64,
              },
            }),
            {
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      }

      case 'stop': {
        if (!kvManager) {
          return new Response(
            JSON.stringify({
              type: 4,
              data: {
                content:
                  '❌ システムが初期化されていません。しばらく後に再試行してください。',
                flags: 64,
              },
            }),
            {
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }

        try {
          const deleted = await kvManager.deleteUserSettings(
            userId!,
            guildId || 'dm'
          );

          if (deleted) {
            console.log(`✅ Settings deleted for user ${userId}`);
            return new Response(
              JSON.stringify({
                type: 4,
                data: {
                  content: '✅ 通知設定を削除しました。',
                  flags: 64,
                },
              }),
              {
                headers: { 'Content-Type': 'application/json' },
              }
            );
          } else {
            return new Response(
              JSON.stringify({
                type: 4,
                data: {
                  content: '⚠️ 削除する通知設定が見つかりませんでした。',
                  flags: 64,
                },
              }),
              {
                headers: { 'Content-Type': 'application/json' },
              }
            );
          }
        } catch (error) {
          console.error('❌ Failed to delete settings:', error);
          return new Response(
            JSON.stringify({
              type: 4,
              data: {
                content:
                  '❌ 設定の削除に失敗しました。しばらく後に再試行してください。',
                flags: 64,
              },
            }),
            {
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      }

      case 'test': {
        if (!kvManager) {
          return new Response(
            JSON.stringify({
              type: 4,
              data: {
                content:
                  '❌ システムが初期化されていません。しばらく後に再試行してください。',
                flags: 64,
              },
            }),
            {
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }

        try {
          const settings = await kvManager.getUserSettings(
            userId!,
            guildId || 'dm'
          );

          if (!settings) {
            return new Response(
              JSON.stringify({
                type: 4,
                data: {
                  content:
                    '❌ 通知設定が見つかりません。先に `/watch` コマンドで設定してください。',
                  flags: 64,
                },
              }),
              {
                headers: { 'Content-Type': 'application/json' },
              }
            );
          }

          // テスト通知の送信
          const embed = {
            title: '🧪 テスト通知',
            description:
              '通知機能は正常に動作しています！\n\n詳細なスケジュール: https://qnaiv.github.io/splatoon3-schedule-notificator/',
            color: 0x00ff88,
            timestamp: new Date().toISOString(),
            footer: {
              text: getVersionFooterText(),
            },
          };

          await sendSimpleMessage(channelId, '', [embed]);

          return new Response(
            JSON.stringify({
              type: 4,
              data: {
                content: '✅ テスト通知を送信しました。',
                flags: 64,
              },
            }),
            {
              headers: { 'Content-Type': 'application/json' },
            }
          );
        } catch (error) {
          console.error('❌ Failed to get settings for test:', error);
          return new Response(
            JSON.stringify({
              type: 4,
              data: {
                content:
                  '❌ 設定の取得に失敗しました。しばらく後に再試行してください。',
                flags: 64,
              },
            }),
            {
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      }

      case 'check': {
        if (!kvManager) {
          return new Response(
            JSON.stringify({
              type: 4,
              data: {
                content:
                  '❌ システムが初期化されていません。しばらく後に再試行してください。',
                flags: 64,
              },
            }),
            {
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }

        try {
          const settings = await kvManager.getUserSettings(
            userId!,
            guildId || 'dm'
          );

          if (!settings) {
            return new Response(
              JSON.stringify({
                type: 4,
                data: {
                  content:
                    '❌ 通知設定が見つかりません。先に `/watch` コマンドで設定してください。',
                  flags: 64,
                },
              }),
              {
                headers: { 'Content-Type': 'application/json' },
              }
            );
          }

          // 即座に通知チェックを実行
          await manualNotificationCheck(settings, channelId);

          return new Response(
            JSON.stringify({
              type: 4,
              data: {
                content:
                  '🔄 通知チェックを実行中...\n条件に合致するマッチがあれば通知します！',
                flags: 64,
              },
            }),
            {
              headers: { 'Content-Type': 'application/json' },
            }
          );
        } catch (error) {
          console.error('❌ Failed to get settings for check:', error);
          return new Response(
            JSON.stringify({
              type: 4,
              data: {
                content:
                  '❌ 設定の取得に失敗しました。しばらく後に再試行してください。',
                flags: 64,
              },
            }),
            {
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      }

      default:
        return new Response(
          JSON.stringify({
            type: 4,
            data: {
              content: '❌ 未知のコマンドです。',
              flags: 64,
            },
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );
    }
  } catch (error) {
    console.error('❌ コマンド処理エラー:', error);
    return new Response(
      JSON.stringify({
        type: 4,
        data: {
          content: '❌ コマンドの実行中にエラーが発生しました。',
          flags: 64,
        },
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// 手動通知チェック（現在開催中のマッチのみ）
async function manualNotificationCheck(settings: any, channelId: string) {
  console.log(`🔄 手動通知チェック開始: ユーザー ${settings.userId}`);

  try {
    // GitHub Pagesからスケジュールデータ取得
    console.log('📡 スケジュールデータ取得中...');
    const response = await fetch(
      'https://qnaiv.github.io/splatoon3-schedule-notificator/api/schedule.json'
    );
    if (!response.ok) {
      throw new Error(`スケジュール取得失敗: ${response.status}`);
    }

    const scheduleData = await response.json();

    if (!settings) {
      console.log('❌ ユーザー設定が見つかりません');
      return;
    }

    // 全マッチタイプのスケジュールを取得
    const allMatches: ScheduleMatch[] = [
      ...(scheduleData.data.result.regular || []).map((m: ApiMatch) => ({
        ...m,
        match_type: 'レギュラーマッチ',
      })),
      ...(scheduleData.data.result.bankara_challenge || []).map(
        (m: ApiMatch) => ({ ...m, match_type: 'バンカラマッチ(チャレンジ)' })
      ),
      ...(scheduleData.data.result.bankara_open || []).map((m: ApiMatch) => ({
        ...m,
        match_type: 'バンカラマッチ(オープン)',
      })),
      ...(scheduleData.data.result.x || []).map((m: ApiMatch) => ({
        ...m,
        match_type: 'Xマッチ',
      })),
    ];

    let notificationsSent = 0;
    const now = new Date();

    for (const condition of settings.conditions) {
      // 統一判定ロジックで通知対象のマッチを取得
      const currentMatches = allMatches.filter((match) =>
        shouldCheckForNotification(match, condition.notifyMinutesBefore, now)
      );

      const matchingMatches = currentMatches.filter((match) => {
        // ルール条件チェック（ルール名を正規化して比較）
        if (
          condition.rules &&
          condition.rules.length > 0 &&
          !condition.rules.includes(match.rule.name)
        ) {
          return false;
        }

        // マッチタイプ条件チェック
        if (
          condition.matchTypes &&
          condition.matchTypes.length > 0 &&
          !condition.matchTypes.includes(match.match_type)
        ) {
          return false;
        }

        // ステージ条件チェック
        if (condition.stages && condition.stages.length > 0) {
          const matchStageIds = match.stages.map((stage: Stage) => stage.id);
          const hasMatchingStage = condition.stages.some((stageId) =>
            matchStageIds.includes(stageId)
          );
          if (!hasMatchingStage) {
            return false;
          }
        }

        return true;
      });

      // 最初の3件まで通知（スパム防止）
      for (const match of matchingMatches.slice(0, 3)) {
        const success = await sendMatchNotification(settings, condition, match);
        if (success) {
          notificationsSent++;
        }
      }
    }

    if (notificationsSent === 0) {
      await sendSimpleMessage(
        channelId,
        '📋 現在開催中で条件に合致するマッチはありません\n（現在時刻でのスケジュールを確認済み）'
      );
    } else {
      await sendSimpleMessage(
        channelId,
        `✅ 現在開催中の${notificationsSent}件のマッチが条件に合致しました！`
      );
    }

    console.log(`✅ 手動チェック完了: ${notificationsSent}件送信`);
  } catch (error) {
    console.error('❌ 手動通知チェックエラー:', error);
    await sendSimpleMessage(
      channelId,
      '❌ 通知チェック中にエラーが発生しました'
    );
  }
}

// マッチ通知送信（手動チェック用）
async function sendMatchNotification(
  userSettings: any,
  condition: NotificationCondition,
  match: ScheduleMatch
): Promise<boolean> {
  try {
    const stages = match.stages.map((stage: Stage) => stage.name).join(', ');
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
      description: `**${condition.name}** の条件に合致しました！\n\n詳細なスケジュール: https://qnaiv.github.io/splatoon3-schedule-notificator/`,
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
        text: getVersionFooterText(),
      },
    };

    const response = await fetch(
      `https://discord.com/api/v10/channels/${userSettings.channelId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bot ${DISCORD_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          embeds: [embed],
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ 通知送信失敗:`, error);
      return false;
    }

    console.log(`✅ 通知送信成功: "${condition.name}"`);
    return true;
  } catch (error) {
    console.error(`❌ 通知送信エラー:`, error);
    return false;
  }
}

// シンプルメッセージ送信
async function sendSimpleMessage(
  channelId: string,
  content: string,
  embeds: Embed[] = []
): Promise<void> {
  try {
    await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${DISCORD_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content, embeds }),
    });
  } catch (error) {
    console.error('メッセージ送信エラー:', error);
  }
}

// 番号付き単一条件の詳細情報をフォーマットする関数
function formatSingleConditionWithNumber(
  condition: NotificationCondition,
  channelId: string,
  current: number,
  total: number
): string {
  const formatArray = (
    items: string[],
    emptyText: string = '制限なし'
  ): string => {
    if (items.length === 0) return emptyText;

    // 長い配列は改行で整理
    if (items.join(', ').length > 50) {
      return '\n      ' + items.join(', ');
    }
    return items.join(', ');
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
        minute: '2-digit',
      })
    : 'まだ通知されていません';

  // 有効/無効状態（保存時にフィルタされているので基本的にすべて有効）
  const statusEmoji = condition.enabled !== false ? '✅' : '❌';
  const statusText = condition.enabled !== false ? '有効' : '無効';

  return `📊 **通知設定 ${current}/${total}**

🔔 **${condition.name}** ${statusEmoji} (${statusText})
   ├ 通知タイミング: **${condition.notifyMinutesBefore}分前**
   ├ ルール条件: ${rulesText}
   ├ マッチタイプ: ${matchTypesText}
   ├ ステージ条件: ${stagesText}
   ├ 最終通知: ${lastNotifiedText}
   └ 通知先: <#${channelId}>`;
}

// メイン処理
async function main() {
  console.log('🚀 Discord Webhook Bot を起動中...');
  console.log('🔧 Debug: 環境変数確認');
  console.log('DISCORD_TOKEN exists:', !!DISCORD_TOKEN);
  console.log('DISCORD_APPLICATION_ID exists:', !!DISCORD_APPLICATION_ID);
  console.log('DISCORD_PUBLIC_KEY exists:', !!DISCORD_PUBLIC_KEY);

  try {
    // KVNotificationManager初期化
    kvManager = new KVNotificationManager();
    await kvManager.initialize();
    console.log('✅ KVNotificationManager初期化完了');

    // NotificationChecker初期化
    notificationChecker = new NotificationChecker(kvManager, DISCORD_TOKEN!);
    await notificationChecker.start();
    console.log('✅ NotificationChecker起動完了');

    // 定期通知チェック（5分間隔）
    Deno.cron('notification-check', '*/5 * * * *', async () => {
      console.log('🕐 Cron notification check started');
      if (notificationChecker) {
        try {
          await notificationChecker.checkNotifications();
          console.log('✅ Cron notification check completed');
        } catch (error) {
          console.error('❌ Cron notification check failed:', error);
        }
      } else {
        console.error('❌ NotificationChecker not initialized');
      }
    });
    console.log('✅ Cron job registered (*/5 * * * *)');

    await registerCommands();
    console.log('✅ コマンド登録完了');

    // Webhook サーバー起動（Deno Deployが自動でポート管理）
    console.log('🌐 Webhook サーバーを起動中...');

    Deno.serve(handleRequest);

    console.log('✅ Webhook Bot が正常に起動しました！');
    console.log('🔗 Webhook エンドポイントが起動中...');
  } catch (error) {
    console.error('❌ Bot起動エラー:', error);
    throw error;
  }
}

// メイン処理開始
main().catch(console.error);
