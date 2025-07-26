// ユーティリティ関数

/**
 * ブラウザ互換性を考慮したUUID生成
 * 古いブラウザでcrypto.randomUUID()が利用できない場合のフォールバック処理
 */
export function generateUUID(): string {
  // crypto.randomUUID()が利用可能な場合は使用
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  // フォールバック: RFC 4122準拠のUUID v4を生成
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * UTF-8文字列を安全にBase64エンコード
 * 日本語など多バイト文字を含むJSONデータを正しくエンコードします
 *
 * @param data - エンコードするオブジェクト
 * @returns Base64エンコードされた文字列
 */
export function encodeToBase64(data: unknown): string {
  try {
    const jsonString = JSON.stringify(data);

    // UTF-8文字列をBase64に安全にエンコード
    // まずencodeURIComponentでエスケープし、その後Base64エンコード
    const encodedString = btoa(
      encodeURIComponent(jsonString).replace(/%([0-9A-F]{2})/g, (_, p1) =>
        String.fromCharCode(parseInt(p1, 16))
      )
    );

    return encodedString;
  } catch (error) {
    throw new Error(`Base64エンコードに失敗しました: ${error}`);
  }
}

/**
 * Base64文字列をUTF-8文字列にデコード
 *
 * @param encodedString - Base64エンコードされた文字列
 * @returns デコードされたオブジェクト
 */
export function decodeFromBase64<T = unknown>(encodedString: string): T {
  try {
    const decodedString = decodeURIComponent(
      atob(encodedString).replace(
        /./g,
        (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      )
    );

    return JSON.parse(decodedString) as T;
  } catch (error) {
    throw new Error(`Base64デコードに失敗しました: ${error}`);
  }
}

/**
 * 配列から重複を除去し、効率的にユニークな要素を取得
 * mapとfindを組み合わせた処理を最適化します
 *
 * @param array - 処理対象の配列
 * @param keySelector - ユニークキーを選択する関数
 * @param mapper - 結果オブジェクトを生成する関数
 * @returns 重複除去された配列
 */
export function getUniqueItems<T, K, R>(
  array: T[],
  keySelector: (item: T) => K,
  mapper: (item: T, key: K) => R
): R[] {
  const uniqueMap = new Map<K, R>();

  for (const item of array) {
    const key = keySelector(item);
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, mapper(item, key));
    }
  }

  return Array.from(uniqueMap.values());
}

/**
 * 安全なnullチェック関数
 * 非nullアサーション(!)を避けるためのヘルパー関数
 *
 * @param value - チェックする値
 * @param errorMessage - nullの場合のエラーメッセージ
 * @returns null以外の値
 * @throws エラー - 値がnullまたはundefinedの場合
 */
export function assertNotNull<T>(
  value: T | null | undefined,
  errorMessage?: string
): T {
  if (value == null) {
    throw new Error(errorMessage || '値がnullまたはundefinedです');
  }
  return value;
}

/**
 * 条件をチェックし、安全にアクセスできるかを確認
 *
 * @param value - チェックする値
 * @param fallback - デフォルト値
 * @returns 安全な値
 */
export function safeAccess<T>(value: T | null | undefined, fallback: T): T {
  return value != null ? value : fallback;
}
