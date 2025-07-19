import { useState, useEffect, useCallback } from 'react';
import { 
  UserSettings, 
  DEFAULT_SETTINGS, 
  DB_NAME, 
  DB_VERSION, 
  SETTINGS_STORE, 
  SETTINGS_KEY,
  NotificationCondition
} from '../types';

export const useSettings = () => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // IndexedDB接続
  const openDB = useCallback((): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
          db.createObjectStore(SETTINGS_STORE);
        }
      };
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error}`));
      };
    });
  }, []);

  // 設定読み込み
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const db = await openDB();
      const transaction = db.transaction([SETTINGS_STORE], 'readonly');
      const store = transaction.objectStore(SETTINGS_STORE);
      
      const request = store.get(SETTINGS_KEY);
      
      const result = await new Promise<UserSettings | null>((resolve, reject) => {
        request.onsuccess = () => {
          resolve(request.result || null);
        };
        
        request.onerror = () => {
          reject(new Error(`Failed to load settings: ${request.error}`));
        };
      });
      
      if (result) {
        setSettings(result);
      } else {
        // デフォルト設定を作成して保存
        const defaultSettings = {
          ...DEFAULT_SETTINGS,
          userId: crypto.randomUUID()
        };
        await saveSettingsToDB(defaultSettings);
        setSettings(defaultSettings);
      }
      
      db.close();
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  }, [openDB]);

  // 設定保存（内部関数）
  const saveSettingsToDB = useCallback(async (newSettings: UserSettings): Promise<void> => {
    const db = await openDB();
    const transaction = db.transaction([SETTINGS_STORE], 'readwrite');
    const store = transaction.objectStore(SETTINGS_STORE);
    
    return new Promise((resolve, reject) => {
      const request = store.put(newSettings, SETTINGS_KEY);
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = () => {
        reject(new Error(`Failed to save settings: ${request.error}`));
      };
    });
  }, [openDB]);

  // 設定保存（公開関数）
  const saveSettings = useCallback(async (newSettings: UserSettings) => {
    try {
      setError(null);
      
      const updatedSettings = {
        ...newSettings,
        globalSettings: {
          ...newSettings.globalSettings,
          lastUpdated: new Date().toISOString()
        }
      };
      
      await saveSettingsToDB(updatedSettings);
      setSettings(updatedSettings);
      
      // Service Workerに設定更新を通知
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SETTINGS_UPDATED',
          data: updatedSettings
        });
      }
      
      console.log('Settings saved successfully');
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
      throw err;
    }
  }, [saveSettingsToDB]);

  // 通知条件追加
  const addNotificationCondition = useCallback(async (condition: Omit<NotificationCondition, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!settings) return;
    
    const newCondition: NotificationCondition = {
      ...condition,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const updatedSettings = {
      ...settings,
      notificationConditions: [...settings.notificationConditions, newCondition]
    };
    
    await saveSettings(updatedSettings);
    return newCondition.id;
  }, [settings, saveSettings]);

  // 通知条件更新
  const updateNotificationCondition = useCallback(async (conditionId: string, updates: Partial<NotificationCondition>) => {
    if (!settings) return;
    
    const updatedConditions = settings.notificationConditions.map(condition =>
      condition.id === conditionId
        ? { ...condition, ...updates, updatedAt: new Date().toISOString() }
        : condition
    );
    
    const updatedSettings = {
      ...settings,
      notificationConditions: updatedConditions
    };
    
    await saveSettings(updatedSettings);
  }, [settings, saveSettings]);

  // 通知条件削除
  const deleteNotificationCondition = useCallback(async (conditionId: string) => {
    if (!settings) return;
    
    const updatedConditions = settings.notificationConditions.filter(
      condition => condition.id !== conditionId
    );
    
    const updatedSettings = {
      ...settings,
      notificationConditions: updatedConditions
    };
    
    await saveSettings(updatedSettings);
  }, [settings, saveSettings]);

  // 通知条件の有効/無効切り替え
  const toggleNotificationCondition = useCallback(async (conditionId: string, enabled: boolean) => {
    await updateNotificationCondition(conditionId, { enabled });
  }, [updateNotificationCondition]);

  // 通知許可要求
  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      setError('This browser does not support notifications');
      return false;
    }
    
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (err) {
      console.error('Failed to request notification permission:', err);
      setError('Failed to request notification permission');
      return false;
    }
  }, []);

  // Service Worker登録と通知開始
  const enableNotifications = useCallback(async (): Promise<boolean> => {
    try {
      // 通知許可確認
      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) {
        return false;
      }
      
      // Service Worker登録確認
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        console.log('Service Worker is ready:', registration);
        
        // 通知開始指示
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'START_NOTIFICATIONS'
          });
        }
        
        return true;
      } else {
        setError('Service Worker is not supported');
        return false;
      }
    } catch (err) {
      console.error('Failed to enable notifications:', err);
      setError('Failed to enable notifications');
      return false;
    }
  }, [requestNotificationPermission]);

  // 手動チェック実行
  const checkNow = useCallback(() => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CHECK_NOW'
      });
    }
  }, []);

  // 初期読み込み
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    loading,
    error,
    saveSettings,
    addNotificationCondition,
    updateNotificationCondition,
    deleteNotificationCondition,
    toggleNotificationCondition,
    requestNotificationPermission,
    enableNotifications,
    checkNow,
    reloadSettings: loadSettings
  };
};