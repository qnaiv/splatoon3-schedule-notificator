
// Service Worker for Splatoon3 Schedule Notifications
const CACHE_NAME = 'splatoon3-schedule-v1';
const CHECK_INTERVAL = 2 * 60 * 60 * 1000; // 2時間
const DB_NAME = 'Splatoon3App';
const DB_VERSION = 1;

let notificationCheckInterval;
let isChecking = false;

// Service Worker インストール
self.addEventListener('install', (event) => {
  console.log('[SW] Install');
  self.skipWaiting();
});

// Service Worker アクティベート
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate');
  event.waitUntil(
    clients.claim().then(() => {
      startPeriodicCheck();
    })
  );
});

// メッセージ受信（メインスレッドから）
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SETTINGS_UPDATED':
      console.log('[SW] Settings updated');
      // 即座にチェック実行
      checkScheduleAndNotify();
      break;
      
    case 'START_NOTIFICATIONS':
      console.log('[SW] Starting notifications');
      startPeriodicCheck();
      break;
      
    case 'STOP_NOTIFICATIONS':
      console.log('[SW] Stopping notifications');
      stopPeriodicCheck();
      break;
      
    case 'CHECK_NOW':
      console.log('[SW] Manual check requested');
      checkScheduleAndNotify();
      break;
  }
});

// 定期チェック開始
function startPeriodicCheck() {
  if (notificationCheckInterval) {
    clearInterval(notificationCheckInterval);
  }
  
  notificationCheckInterval = setInterval(() => {
    checkScheduleAndNotify();
  }, CHECK_INTERVAL);
  
  // 即座に1回実行
  setTimeout(() => checkScheduleAndNotify(), 1000);
  console.log('[SW] Periodic check started (every 2 hours)');
}

// 定期チェック停止
function stopPeriodicCheck() {
  if (notificationCheckInterval) {
    clearInterval(notificationCheckInterval);
    notificationCheckInterval = null;
  }
  console.log('[SW] Periodic check stopped');
}

// スケジュールチェックと通知
async function checkScheduleAndNotify() {
  if (isChecking) {
    console.log('[SW] Check already in progress, skipping');
    return;
  }
  
  isChecking = true;
  
  try {
    console.log('[SW] Checking schedule...');
    
    // GitHub Pages からスケジュールデータ取得
    // 注意: 実際のGitHub PagesのURLに変更する必要があります
    const apiUrl = 'https://yourusername.github.io/splatoon3-schedule-api/api/schedule.json';
    
    const response = await fetch(apiUrl, {
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const scheduleData = await response.json();
    console.log('[SW] Schedule data fetched:', scheduleData.lastUpdated);
    
    // ユーザー設定取得
    const userSettings = await getUserSettings();
    
    if (!userSettings || !userSettings.globalSettings.enableNotifications) {
      console.log('[SW] Notifications disabled');
      return;
    }
    
    if (!userSettings.notificationConditions || userSettings.notificationConditions.length === 0) {
      console.log('[SW] No notification conditions set');
      return;
    }
    
    // 条件チェック
    const matchingNotifications = await checkNotificationConditions(
      scheduleData.data,
      userSettings.notificationConditions
    );
    
    // 通知表示
    for (const notification of matchingNotifications) {
      await self.registration.showNotification('🦑 スプラトゥーン3', {
        body: notification.message,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: `splatoon-${notification.condition.replace(/\s+/g, '-')}`,
        requireInteraction: true,
        data: notification.data,
        actions: [
          {
            action: 'view',
            title: 'スケジュールを見る'
          },
          {
            action: 'close',
            title: '閉じる'
          }
        ]
      });
      
      console.log('[SW] Notification shown:', notification.message);
    }
    
    if (matchingNotifications.length === 0) {
      console.log('[SW] No matching conditions found');
    }
    
  } catch (error) {
    console.error('[SW] Schedule check failed:', error);
  } finally {
    isChecking = false;
  }
}

// 通知条件チェック
async function checkNotificationConditions(schedule, conditions) {
  const notifications = [];
  const now = new Date();
  
  for (const condition of conditions) {
    if (!condition.enabled) continue;
    
    // 通知タイミングを計算
    const notifyTime = new Date(now.getTime() + condition.notifyMinutesBefore * 60000);
    
    for (const match of schedule.results) {
      const matchStart = new Date(match.start_time);
      
      // 通知タイミングから±2分以内かチェック（誤差許容）
      const timeDiff = Math.abs(matchStart.getTime() - notifyTime.getTime());
      if (timeDiff < 2 * 60 * 1000) {
        
        // 条件に合致するかチェック
        if (matchesUserCondition(match, condition)) {
          const stageNames = match.stages.map(s => s.name).join(' vs ');
          
          notifications.push({
            condition: condition.name,
            message: `${condition.name}: ${condition.notifyMinutesBefore}分後に開始！\n${match.rule.name} - ${stageNames}`,
            data: {
              conditionId: condition.id,
              conditionName: condition.name,
              match: match,
              startTime: match.start_time,
              rule: match.rule.name,
              stages: stageNames
            }
          });
        }
      }
    }
  }
  
  return notifications;
}

// ユーザー条件との照合
function matchesUserCondition(match, condition) {
  // ステージ条件チェック
  const stageMatch = checkConditionArray(
    match.stages.map(s => s.id),
    condition.stages.values,
    condition.stages.operator
  );
  
  // ルール条件チェック
  const ruleMatch = checkConditionArray(
    [match.rule.name],
    condition.rules.values,
    condition.rules.operator
  );
  
  // マッチタイプ条件チェック（match_typeフィールドを使用）
  const typeMatch = checkConditionArray(
    [match.match_type || 'レギュラーマッチ'], // デフォルト値
    condition.matchTypes.values,
    condition.matchTypes.operator
  );
  
  const result = stageMatch && ruleMatch && typeMatch;
  
  if (result) {
    console.log('[SW] Match found:', {
      condition: condition.name,
      rule: match.rule.name,
      stages: match.stages.map(s => s.name),
      startTime: match.start_time
    });
  }
  
  return result;
}

// 条件配列のチェック
function checkConditionArray(matchValues, conditionValues, operator) {
  if (conditionValues.length === 0) return true;
  
  if (operator === 'AND') {
    return conditionValues.every(condValue => 
      matchValues.some(matchValue => matchValue === condValue)
    );
  } else { // OR
    return conditionValues.some(condValue =>
      matchValues.some(matchValue => matchValue === condValue)
    );
  }
}

// IndexedDB からユーザー設定取得
async function getUserSettings() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings');
      }
    };
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['settings'], 'readonly');
      const store = transaction.objectStore('settings');
      const getRequest = store.get('userSettings');
      
      getRequest.onsuccess = () => {
        resolve(getRequest.result);
      };
      
      getRequest.onerror = () => {
        console.error('[SW] Failed to get user settings:', getRequest.error);
        resolve(null);
      };
    };
    
    request.onerror = () => {
      console.error('[SW] Failed to open IndexedDB:', request.error);
      resolve(null);
    };
  });
}

// 通知クリック処理
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  
  event.notification.close();
  
  if (event.action === 'view') {
    // アプリを開く
    event.waitUntil(
      clients.openWindow('/')
    );
  }
  
  // デフォルトアクション（通知自体をクリック）
  if (!event.action) {
    event.waitUntil(
      clients.matchAll().then((clientList) => {
        // 既に開いているタブがあれば、そこにフォーカス
        for (const client of clientList) {
          if (client.url === self.registration.scope && 'focus' in client) {
            return client.focus();
          }
        }
        // なければ新しいタブを開く
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});

console.log('[SW] Service Worker loaded');