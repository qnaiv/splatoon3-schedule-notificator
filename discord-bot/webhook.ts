import {
  BotSettings,
  UserSettings,
  NotificationCondition,
  DiscordInteraction,
  Embed,
  ScheduleMatch,
  ApiMatch,
  Stage,
} from './types.ts';
import {
  fetchScheduleData,
  getAllMatches,
  getMatchesForNotification,
} from './schedule.ts';
import {
  checkNotificationConditions,
  createNotificationMessage,
  shouldNotify,
} from './notifications.ts';

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

// ユーザー設定を保存するMap（メモリ内）
const userSettings = new Map<string, UserSettings>();

// Deno KV（永続化ストレージ）
let kv: Deno.Kv | null = null;
const pendingUpdates = new Set<string>(); // 更新待ちユーザーID

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

  // バックアップAPI（GitHub Actions用）
  const url = new URL(request.url);
  if (request.method === 'POST' && url.pathname === '/api/backup') {
    console.log('🔧 Debug: バックアップAPI呼び出し');

    // 認証チェック
    const authHeader = request.headers.get('authorization');
    const backupSecret = Deno.env.get('BACKUP_SECRET');

    if (!authHeader || !backupSecret) {
      console.log('❌ バックアップAPI: 認証情報なし');
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    if (token !== backupSecret) {
      console.log('❌ バックアップAPI: 認証失敗');
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // バックアップ実行
    const result = await immediateBackup();

    return new Response(
      JSON.stringify({
        success: result.success,
        message: result.message,
        userCount: result.count,
        timestamp: new Date().toISOString(),
      }),
      {
        status: result.success ? 200 : 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
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

          // ユーザー設定を保存（ユーザーID + ギルドIDでユニークキー作成）
          const settingsKey = `${userId}_${guildId || 'dm'}`;
          userSettings.set(settingsKey, {
            userId,
            channelId,
            conditions: settings.conditions.filter((c) => c.enabled),
          });

          // バッチ更新対象に追加
          pendingUpdates.add(settingsKey);

          const enabledCount = settings.conditions.filter(
            (c) => c.enabled
          ).length;

          return new Response(
            JSON.stringify({
              type: 4,
              data: {
                content: `✅ 通知設定が完了しました！\n📊 有効な条件数: ${enabledCount}`,
                flags: 64,
              },
            }),
            {
              headers: { 'Content-Type': 'application/json' },
            }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({
              type: 4,
              data: {
                content:
                  '❌ 設定文字列の解析に失敗しました。正しい設定文字列を使用してください。',
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
        const settingsKey = `${userId}_${guildId || 'dm'}`;
        const settings = userSettings.get(settingsKey);

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
                content: `📋 通知設定詳細を送信中... (${settings.conditions.length}件)`,
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
      }

      case 'stop': {
        const settingsKey = `${userId}_${guildId || 'dm'}`;
        userSettings.delete(settingsKey);

        // バッチ削除対象に追加（KVからも削除される）
        pendingUpdates.add(settingsKey);

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
      }

      case 'test': {
        const settingsKey = `${userId}_${guildId || 'dm'}`;
        const settings = userSettings.get(settingsKey);

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
            text: 'Splatoon3 Schedule Bot',
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
      }

      case 'check': {
        const settingsKey = `${userId}_${guildId || 'dm'}`;
        const settings = userSettings.get(settingsKey);

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
        manualNotificationCheck(settingsKey, channelId);

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

// 手動通知チェック（時間条件無視）
async function manualNotificationCheck(userId: string, channelId: string) {
  console.log(`🔄 手動通知チェック開始: ユーザー ${userId}`);

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
    console.log('✅ スケジュールデータ取得成功', {
      lastUpdated: scheduleData.lastUpdated,
      hasRegular: !!scheduleData.data.result.regular,
      hasX: !!scheduleData.data.result.x,
      hasBankara: !!scheduleData.data.result.bankara_challenge,
    });

    const settings = userSettings.get(userId);
    if (!settings) {
      console.log('❌ ユーザー設定が見つかりません');
      return;
    }

    console.log('👤 ユーザー設定確認', {
      userId,
      conditionsCount: settings.conditions.length,
      conditions: settings.conditions.map((c) => ({
        name: c.name,
        enabled: c.enabled,
      })),
    });

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

    console.log('🎮 全マッチ確認', {
      totalMatches: allMatches.length,
      regularCount: scheduleData.data.result.regular?.length || 0,
      xCount: scheduleData.data.result.x?.length || 0,
      bankaraChallenge: scheduleData.data.result.bankara_challenge?.length || 0,
      bankaraOpen: scheduleData.data.result.bankara_open?.length || 0,
    });

    let notificationsSent = 0;
    const now = new Date();
    console.log('⏰ 現在時刻:', now.toISOString());

    for (const condition of settings.conditions) {
      // 現在開催中のマッチを対象
      const currentMatches = allMatches.filter((match) => {
        const startTime = new Date(match.start_time);
        const endTime = new Date(match.end_time);
        return startTime <= now && now < endTime;
      });

      console.log(`🕐 現在開催中マッチ - 条件 "${condition.name}"`, {
        totalMatches: allMatches.length,
        currentMatches: currentMatches.length,
        currentTime: now.toISOString(),
        firstMatch: allMatches[0]?.start_time,
        lastMatch: allMatches[allMatches.length - 1]?.start_time,
        sampleCurrentMatch: currentMatches[0]
          ? {
              start: currentMatches[0].start_time,
              end: currentMatches[0].end_time,
              rule: currentMatches[0].rule.name,
              type: currentMatches[0].match_type,
            }
          : null,
      });

      // ルール・ステージ・マッチタイプの条件のみチェック
      console.log(`🔍 条件チェック開始: "${condition.name}"`);
      console.log(`  - ルール条件: [${(condition.rules || []).join(', ')}]`);
      console.log(
        `  - マッチタイプ条件: [${(condition.matchTypes || []).join(', ')}]`
      );
      console.log(`  - ステージ条件: [${(condition.stages || []).join(', ')}]`);

      const matchingMatches = currentMatches.filter((match) => {
        console.log(
          `📝 マッチチェック: ${match.rule.name} / ${match.match_type}`
        );

        // ルール条件チェック
        if (
          condition.rules &&
          condition.rules.length > 0 &&
          !condition.rules.includes(match.rule.name)
        ) {
          console.log(
            `  ❌ ルール不一致: ${match.rule.name} not in [${condition.rules.join(', ')}]`
          );
          return false;
        }

        // マッチタイプ条件チェック
        if (
          condition.matchTypes &&
          condition.matchTypes.length > 0 &&
          !condition.matchTypes.includes(match.match_type)
        ) {
          console.log(
            `  ❌ マッチタイプ不一致: ${match.match_type} not in [${condition.matchTypes.join(', ')}]`
          );
          return false;
        }

        // ステージ条件チェック
        if (condition.stages && condition.stages.length > 0) {
          const matchStageIds = match.stages.map((stage: Stage) => stage.id);
          const hasMatchingStage = condition.stages.some((stageId) =>
            matchStageIds.includes(stageId)
          );
          if (!hasMatchingStage) {
            console.log(
              `  ❌ ステージ不一致: [${matchStageIds.join(', ')}] not in [${condition.stages.join(', ')}]`
            );
            return false;
          }
        }

        console.log(`  ✅ 条件一致!`);
        return true;
      });

      console.log(
        `🔍 条件 "${condition.name}": ${matchingMatches.length}件のマッチ`
      );

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

// マッチ通知送信
async function sendMatchNotification(
  userSettings: UserSettings,
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
        text: 'Splatoon3 Schedule Bot',
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

  // イベントマッチ条件の表示
  let eventMatchText = '';
  if (condition.eventMatches?.enabled) {
    const eventTypesText = formatArray(condition.eventMatches.eventTypes);
    const eventStagesText = formatArray(condition.eventMatches.eventStages);
    eventMatchText = `
   ├ 🎪 イベントマッチ: 有効
   ├   ├ イベントタイプ: ${eventTypesText}
   ├   └ イベントステージ: ${eventStagesText}`;
  } else {
    eventMatchText = `
   ├ 🎪 イベントマッチ: 無効`;
  }

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
   ├ ステージ条件: ${stagesText}${eventMatchText}
   ├ 最終通知: ${lastNotifiedText}
   └ 通知先: <#${channelId}>`;
}

// 定期的な通知チェック（10分ごと）

async function checkNotifications() {
  console.log('🔄 定期通知チェックを開始...');

  try {
    const scheduleData = await fetchScheduleData();
    if (!scheduleData) {
      console.log('❌ スケジュールデータの取得に失敗');
      return;
    }

    const allMatches = getAllMatches(scheduleData);
    let totalNotificationsSent = 0;

    for (const [userId, settings] of userSettings.entries()) {
      for (const condition of settings.conditions) {
        if (!condition.enabled) continue;

        const targetMatches = getMatchesForNotification(
          allMatches,
          condition.notifyMinutesBefore
        );
        const matchingMatches = checkNotificationConditions(
          targetMatches,
          condition
        );

        for (const match of matchingMatches) {
          if (shouldNotify(match, condition)) {
            // 通知メッセージを作成（ログ用）
            createNotificationMessage(condition, match);

            // Discord通知送信
            try {
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
                    value: match.stages.map((s) => s.name).join(' / '),
                    inline: false,
                  },
                  {
                    name: '開始時刻',
                    value: new Date(match.start_time).toLocaleString('ja-JP', {
                      timeZone: 'Asia/Tokyo',
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    }),
                    inline: false,
                  },
                ],
                color: 0x00ff88,
                timestamp: new Date().toISOString(),
              };

              await fetch(
                `https://discord.com/api/v10/channels/${settings.channelId}/messages`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bot ${DISCORD_TOKEN}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ embeds: [embed] }),
                }
              );

              condition.lastNotified = new Date().toISOString();
              pendingUpdates.add(userId); // lastNotified更新を永続化対象に追加
              totalNotificationsSent++;
              console.log(`✅ 定期通知送信成功: ${userId} - ${condition.name}`);
            } catch (error) {
              console.error(`❌ 定期通知送信失敗: ${userId}`, error);
            }
          }
        }
      }
    }

    console.log(`✅ 定期通知チェック完了: ${totalNotificationsSent}件送信`);
  } catch (error) {
    console.error('❌ 定期通知チェックエラー:', error);
  }
}

// Deno KV初期化と設定復元
async function initializeKV() {
  try {
    console.log('🗄️ Deno KV初期化中...');
    kv = await Deno.openKv();
    console.log('✅ Deno KV接続成功');

    // 既存設定の復元
    console.log('📥 既存設定を復元中...');
    const iter = kv.list({ prefix: ['user_settings'] });
    let restoredCount = 0;

    for await (const { key, value } of iter) {
      const userId = key[1] as string;
      userSettings.set(userId, value as UserSettings);
      restoredCount++;
    }

    console.log(`✅ 設定復元完了: ${restoredCount}件のユーザー設定を復元`);
  } catch (error) {
    console.error('❌ Deno KV初期化失敗:', error);
    console.log('⚠️ メモリ内モードで続行します');
    kv = null;
  }
}

// バッチ設定更新
async function batchUpdateSettings() {
  if (!kv || pendingUpdates.size === 0) {
    return;
  }

  try {
    console.log(`💾 設定バックアップ開始: ${pendingUpdates.size}件`);
    let savedCount = 0;

    for (const userId of pendingUpdates) {
      const settings = userSettings.get(userId);
      if (settings) {
        // 設定を保存
        await kv.set(['user_settings', userId], settings);
        savedCount++;
      } else {
        // 設定が削除された場合はKVからも削除
        await kv.delete(['user_settings', userId]);
        console.log(`🗑️ 設定削除: ${userId}`);
      }
    }

    pendingUpdates.clear();
    console.log(`✅ 設定バックアップ完了: ${savedCount}件保存`);
  } catch (error) {
    console.error('❌ 設定バックアップエラー:', error);
  }
}

// 緊急保存（プロセス終了時）
async function emergencySave() {
  if (pendingUpdates.size > 0) {
    console.log(`🚨 緊急保存実行: ${pendingUpdates.size}件`);
    await batchUpdateSettings();
  }
}

// 即座バックアップ（API呼び出し用）
async function immediateBackup(): Promise<{
  success: boolean;
  message: string;
  count: number;
}> {
  try {
    if (!kv) {
      return { success: false, message: 'KV not available', count: 0 };
    }

    console.log('🚀 即座バックアップ開始');

    // 全ての現在のユーザー設定をKVに保存
    let savedCount = 0;
    for (const [userId, settings] of userSettings.entries()) {
      await kv.set(['user_settings', userId], settings);
      savedCount++;
    }

    // 保留中の更新もクリア
    pendingUpdates.clear();

    const message = `即座バックアップ完了: ${savedCount}件保存`;
    console.log(`✅ ${message}`);

    return { success: true, message, count: savedCount };
  } catch (error) {
    const errorMessage = `即座バックアップ失敗: ${error.message}`;
    console.error(`❌ ${errorMessage}`);
    return { success: false, message: errorMessage, count: 0 };
  }
}

// 10分間隔での定期チェック + バッチ更新
Deno.cron('notification-and-backup', '*/10 * * * *', async () => {
  await checkNotifications();
  await batchUpdateSettings();
});

// プロセス終了シグナル対応
try {
  Deno.addSignalListener('SIGTERM', emergencySave);
  Deno.addSignalListener('SIGINT', emergencySave);
} catch (error) {
  // Deno Deployでは一部のシグナルが使用できない場合がある
  console.log('⚠️ シグナルリスナー設定をスキップ');
}

// メイン処理
async function main() {
  console.log('🚀 Discord Webhook Bot を起動中...');
  console.log('🔧 Debug: 環境変数確認');
  console.log('DISCORD_TOKEN exists:', !!DISCORD_TOKEN);
  console.log('DISCORD_APPLICATION_ID exists:', !!DISCORD_APPLICATION_ID);
  console.log('DISCORD_PUBLIC_KEY exists:', !!DISCORD_PUBLIC_KEY);

  try {
    // Deno KV初期化
    await initializeKV();

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

if (import.meta.main) {
  main().catch(console.error);
}
