/**
 * バージョン管理モジュール
 * Discord botのバージョン情報を管理し、各コマンド応答に表示するための機能を提供
 */

/**
 * 環境変数からバージョン情報を取得する
 * フォールバック処理を含む
 */
function getBotVersion(): string {
  try {
    const version = Deno.env.get('BOT_VERSION');
    if (version) {
      return version;
    }
    
    // 環境変数が設定されていない場合のフォールバック
    console.warn('⚠️ BOT_VERSION環境変数が設定されていません。フォールバック値を使用します。');
    return '?.?.?';
  } catch (error) {
    console.error('❌ バージョン取得エラー:', error);
    return '?.?.?';
  }
}

/**
 * 各コマンド応答で使用するフォーマットされたフッターテキストを生成
 * 形式: "v{version} | Splatoon3 Schedule Bot"
 */
export function getVersionFooterText(): string {
  const version = getBotVersion();
  return `v${version} | Splatoon3 Schedule Bot`;
}

/**
 * デバッグ用：現在のバージョン情報を取得
 */
export function getCurrentVersion(): string {
  return getBotVersion();
}