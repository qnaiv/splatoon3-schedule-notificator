import fs from 'fs';
import fetch from 'node-fetch';

// 設定
const SPLA3_API_URL = 'https://spla3.yuu26.com/api/schedule';
const USER_AGENT = process.env.USER_AGENT || 'Splatoon3SchedulePWA/1.0 (GitHub Pages Static API)';
const OUTPUT_DIR = 'public/api';
const DIST_OUTPUT_DIR = 'dist/api';

// ディレクトリ作成
function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
}

// 現在のマッチを抽出
function getCurrentMatches(matches) {
  const now = new Date();
  return matches.filter(match => {
    const start = new Date(match.start_time);
    const end = new Date(match.end_time);
    return now >= start && now <= end;
  });
}

// 今後のマッチを抽出（直近24時間分）
function getUpcomingMatches(matches) {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  
  return matches
    .filter(match => {
      const start = new Date(match.start_time);
      return start > now && start <= tomorrow;
    })
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
}

// データの品質チェック
function validateScheduleData(data) {
  if (!data || !data.result) {
    throw new Error('Invalid data structure: missing result object');
  }
  
  // レギュラーマッチのデータをチェック
  if (!data.result.regular || !Array.isArray(data.result.regular)) {
    throw new Error('Invalid data structure: missing regular matches array');
  }
  
  if (data.result.regular.length === 0) {
    throw new Error('No schedule data found');
  }
  
  // 最初の数件をチェック
  const sampleMatch = data.result.regular[0];
  const requiredFields = ['start_time', 'end_time', 'rule', 'stages'];
  
  for (const field of requiredFields) {
    if (!sampleMatch[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  const totalMatches = data.result.regular.length + 
    (data.result.bankara_challenge?.length || 0) + 
    (data.result.bankara_open?.length || 0);
  
  console.log(`✅ Data validation passed: ${totalMatches} matches found`);
  return true;
}

// レート制限対応のリトライ機能
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`🔄 Attempt ${i + 1}/${maxRetries}: Fetching ${url}`);
      
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        // レート制限に引っかかった場合
        const retryAfter = response.headers.get('retry-after') || 60;
        console.log(`⏳ Rate limited. Waiting ${retryAfter} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
      
    } catch (error) {
      console.error(`❌ Attempt ${i + 1} failed:`, error.message);
      
      if (i === maxRetries - 1) {
        throw error;
      }
      
      // 指数バックオフ
      const delay = Math.pow(2, i) * 1000;
      console.log(`⏳ Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// メイン処理
async function fetchAndSaveSchedule() {
  try {
    console.log('🦑 Starting Splatoon3 schedule fetch...');
    console.log(`📡 API URL: ${SPLA3_API_URL}`);
    console.log(`👤 User-Agent: ${USER_AGENT}`);
    
    // ディレクトリ作成
    ensureDirectoryExists(OUTPUT_DIR);
    ensureDirectoryExists(DIST_OUTPUT_DIR);
    
    // APIからデータ取得
    const response = await fetchWithRetry(SPLA3_API_URL, {
      headers: {
        'user-agent': USER_AGENT,
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    
    const rawData = await response.json();
    console.log('📥 Raw data received');
    
    // データ検証
    validateScheduleData(rawData);
    
    // 全てのマッチを統合
    const allMatches = [
      ...rawData.result.regular,
      ...(rawData.result.bankara_challenge || []),
      ...(rawData.result.bankara_open || [])
    ];
    
    // メタデータ付きの出力データ作成
    const timestamp = new Date().toISOString();
    const scheduleOutput = {
      lastUpdated: timestamp,
      source: 'spla3.yuu26.com',
      fetchedAt: timestamp,
      dataCount: allMatches.length,
      data: rawData
    };
    
    // 現在のマッチを抽出
    const currentMatches = getCurrentMatches(allMatches);
    const currentOutput = {
      lastUpdated: timestamp,
      dataCount: currentMatches.length,
      data: {
        results: currentMatches
      }
    };
    
    // 今後のマッチを抽出
    const upcomingMatches = getUpcomingMatches(allMatches);
    const upcomingOutput = {
      lastUpdated: timestamp,
      dataCount: upcomingMatches.length,
      data: {
        results: upcomingMatches
      }
    };
    
    // ファイル保存
    const files = [
      { name: 'schedule.json', data: scheduleOutput, desc: 'Full schedule' },
      { name: 'current.json', data: currentOutput, desc: 'Current matches' },
      { name: 'upcoming.json', data: upcomingOutput, desc: 'Upcoming matches' }
    ];
    
    for (const file of files) {
      const content = JSON.stringify(file.data, null, 2);
      
      // public と dist 両方に保存
      fs.writeFileSync(`${OUTPUT_DIR}/${file.name}`, content);
      fs.writeFileSync(`${DIST_OUTPUT_DIR}/${file.name}`, content);
      
      console.log(`💾 ${file.desc} saved: ${file.name} (${file.data.dataCount} items, ${content.length} bytes)`);
    }
    
    // サマリー情報作成
    const summary = {
      lastUpdated: timestamp,
      totalMatches: allMatches.length,
      currentMatches: currentMatches.length,
      upcomingMatches: upcomingMatches.length,
      nextMatchTime: upcomingMatches.length > 0 ? upcomingMatches[0].start_time : null,
      apiSource: SPLA3_API_URL,
      userAgent: USER_AGENT
    };
    
    fs.writeFileSync(`${OUTPUT_DIR}/summary.json`, JSON.stringify(summary, null, 2));
    fs.writeFileSync(`${DIST_OUTPUT_DIR}/summary.json`, JSON.stringify(summary, null, 2));
    
    console.log('📊 Summary:');
    console.log(`  - Total matches: ${summary.totalMatches}`);
    console.log(`  - Current matches: ${summary.currentMatches}`);
    console.log(`  - Upcoming matches (24h): ${summary.upcomingMatches}`);
    console.log(`  - Next match: ${summary.nextMatchTime || 'None'}`);
    console.log(`✅ Schedule fetch completed successfully at ${timestamp}`);
    
  } catch (error) {
    console.error('💥 Failed to fetch schedule:', error);
    
    // エラー情報をファイルに保存（デバッグ用）
    const errorInfo = {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      apiUrl: SPLA3_API_URL,
      userAgent: USER_AGENT
    };
    
    ensureDirectoryExists(OUTPUT_DIR);
    ensureDirectoryExists(DIST_OUTPUT_DIR);
    
    fs.writeFileSync(`${OUTPUT_DIR}/error.json`, JSON.stringify(errorInfo, null, 2));
    fs.writeFileSync(`${DIST_OUTPUT_DIR}/error.json`, JSON.stringify(errorInfo, null, 2));
    
    // GitHub Actionsでエラーを明確に示すために終了コード1で終了
    process.exit(1);
  }
}

// スクリプト実行
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchAndSaveSchedule();
}

export { fetchAndSaveSchedule, getCurrentMatches, getUpcomingMatches };