import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';

// API設定
const SPLATOON3_API_URL = 'https://spla3.yuu26.com/api/schedule';
const OUTPUT_DIR = path.resolve(process.cwd(), 'public/api');
const SCHEDULE_FILE = 'schedule.json';
const LAST_UPDATED_FILE = 'last-updated.json';

// 強制更新フラグ
const FORCE_UPDATE = process.env.FORCE_UPDATE === 'true';

console.log('🦑 Splatoon3 Schedule Fetcher Started');
console.log(`Force update: ${FORCE_UPDATE}`);

async function main() {
  try {
    // 出力ディレクトリ作成
    await ensureOutputDirectory();
    
    // 前回の更新時刻をチェック
    if (!FORCE_UPDATE && await isRecentlyUpdated()) {
      console.log('⏰ Data is recent, skipping update');
      return;
    }
    
    // スケジュールデータ取得
    console.log('📡 Fetching schedule data from API...');
    const scheduleData = await fetchScheduleData();
    
    // データ変換
    console.log('🔄 Transforming data...');
    const transformedData = transformScheduleData(scheduleData);
    
    // ファイル出力
    console.log('💾 Saving transformed data...');
    await saveData(transformedData);
    
    // 最終更新時刻を保存
    await saveLastUpdated();
    
    console.log('✅ Schedule update completed successfully!');
    console.log(`📊 Total matches: ${getTotalMatchCount(transformedData)}`);
    
  } catch (error) {
    console.error('❌ Error updating schedule:', error);
    process.exit(1);
  }
}

async function ensureOutputDirectory() {
  const outputPath = path.resolve(OUTPUT_DIR);
  await fs.mkdir(outputPath, { recursive: true });
  console.log(`📁 Output directory: ${outputPath}`);
}

async function isRecentlyUpdated() {
  try {
    const lastUpdatedPath = path.join(OUTPUT_DIR, LAST_UPDATED_FILE);
    const lastUpdatedData = await fs.readFile(lastUpdatedPath, 'utf8');
    const { timestamp } = JSON.parse(lastUpdatedData);
    
    const lastUpdate = new Date(timestamp);
    const now = new Date();
    const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);
    
    console.log(`⏱️  Last update: ${lastUpdate.toISOString()} (${hoursSinceUpdate.toFixed(1)} hours ago)`);
    
    // 1.5時間以内に更新されていれば スキップ
    return hoursSinceUpdate < 1.5;
  } catch (error) {
    console.log('📝 No previous update found');
    return false;
  }
}

async function fetchScheduleData() {
  const response = await fetch(SPLATOON3_API_URL, {
    headers: {
      'User-Agent': 'Splatoon3-Schedule-Bot/1.0 (GitHub Actions)'
    }
  });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  console.log(`📅 API response received, last updated: ${data.last_updated || 'unknown'}`);
  
  return data;
}

function transformScheduleData(apiData) {
  const now = new Date();
  
  // APIデータを既存WebUI形式に変換
  const transformedData = {
    lastUpdated: now.toISOString(),
    source: 'Splatoon3 API via GitHub Actions',
    data: {
      result: {}
    }
  };
  
  // 各マッチタイプを処理
  if (apiData.result) {
    // レギュラーマッチ
    if (apiData.result.regular) {
      transformedData.data.result.regular = apiData.result.regular.map(match => ({
        ...match,
        match_type: 'レギュラーマッチ'
      }));
    }
    
    // バンカラマッチ（チャレンジ）
    if (apiData.result.bankara_challenge) {
      transformedData.data.result.bankara_challenge = apiData.result.bankara_challenge.map(match => ({
        ...match,
        match_type: 'バンカラマッチ(チャレンジ)'
      }));
    }
    
    // バンカラマッチ（オープン）
    if (apiData.result.bankara_open) {
      transformedData.data.result.bankara_open = apiData.result.bankara_open.map(match => ({
        ...match,
        match_type: 'バンカラマッチ(オープン)'
      }));
    }
    
    // Xマッチ
    if (apiData.result.x) {
      transformedData.data.result.x = apiData.result.x.map(match => ({
        ...match,
        match_type: 'Xマッチ'
      }));
    }
    
    // フェスマッチ（存在する場合）
    if (apiData.result.fest) {
      transformedData.data.result.fest = apiData.result.fest.map(match => ({
        ...match,
        match_type: 'フェスマッチ'
      }));
    }
  }
  
  return transformedData;
}

async function saveData(data) {
  const outputPath = path.join(OUTPUT_DIR, SCHEDULE_FILE);
  await fs.writeFile(outputPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`💾 Saved schedule data to: ${outputPath}`);
}

async function saveLastUpdated() {
  const lastUpdatedData = {
    timestamp: new Date().toISOString(),
    nextUpdate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2時間後
  };
  
  const outputPath = path.join(OUTPUT_DIR, LAST_UPDATED_FILE);
  await fs.writeFile(outputPath, JSON.stringify(lastUpdatedData, null, 2), 'utf8');
  console.log(`⏰ Saved last updated info to: ${outputPath}`);
}

function getTotalMatchCount(data) {
  let total = 0;
  
  if (data.data?.result) {
    Object.values(data.data.result).forEach(matches => {
      if (Array.isArray(matches)) {
        total += matches.length;
      }
    });
  }
  
  return total;
}

// スクリプト実行
main();