// IndexedDB Storage for Browser-based Persistence
// Stores scan history, CVE cache, user preferences - NO BACKEND REQUIRED

interface ScanHistoryRecord {
  id: string;
  timestamp: number;
  repoName: string;
  repoUrl?: string;
  scanType: 'local' | 'github' | 'website';
  findings: number;
  severity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  results: any[];
  duration?: number;
}

interface CVECacheRecord {
  packageKey: string; // "package@version"
  ecosystem: string;
  vulnerabilities: any[];
  cachedAt: number;
  expiresAt: number;
}

interface IgnoredFindingRecord {
  id: string;
  file: string;
  line: number;
  type: string;
  reason?: string;
  ignoredAt: number;
}

export interface UserPreferences {
  theme?: string;
  autoScan?: boolean;
  notifications?: boolean;
  defaultEcosystem?: string;
}

const DB_NAME = 'securify-storage';
const DB_VERSION = 1;

const STORES = {
  SCAN_HISTORY: 'scan-history',
  CVE_CACHE: 'cve-cache',
  IGNORED_FINDINGS: 'ignored-findings',
  PREFERENCES: 'preferences',
};

// Initialize IndexedDB
function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Scan History Store
      if (!db.objectStoreNames.contains(STORES.SCAN_HISTORY)) {
        const scanStore = db.createObjectStore(STORES.SCAN_HISTORY, { keyPath: 'id' });
        scanStore.createIndex('timestamp', 'timestamp', { unique: false });
        scanStore.createIndex('repoName', 'repoName', { unique: false });
        scanStore.createIndex('scanType', 'scanType', { unique: false });
      }

      // CVE Cache Store
      if (!db.objectStoreNames.contains(STORES.CVE_CACHE)) {
        const cveStore = db.createObjectStore(STORES.CVE_CACHE, { keyPath: 'packageKey' });
        cveStore.createIndex('expiresAt', 'expiresAt', { unique: false });
      }

      // Ignored Findings Store
      if (!db.objectStoreNames.contains(STORES.IGNORED_FINDINGS)) {
        const ignoredStore = db.createObjectStore(STORES.IGNORED_FINDINGS, { keyPath: 'id' });
        ignoredStore.createIndex('file', 'file', { unique: false });
      }

      // Preferences Store
      if (!db.objectStoreNames.contains(STORES.PREFERENCES)) {
        db.createObjectStore(STORES.PREFERENCES, { keyPath: 'key' });
      }
    };
  });
}

// Scan History Operations
export async function saveScanHistory(record: Omit<ScanHistoryRecord, 'id'>): Promise<string> {
  const db = await initDB();
  const id = `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const fullRecord: ScanHistoryRecord = { id, ...record };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.SCAN_HISTORY], 'readwrite');
    const store = transaction.objectStore(STORES.SCAN_HISTORY);
    const request = store.add(fullRecord);

    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
}

export async function getScanHistory(limit: number = 50): Promise<ScanHistoryRecord[]> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.SCAN_HISTORY], 'readonly');
    const store = transaction.objectStore(STORES.SCAN_HISTORY);
    const index = store.index('timestamp');
    const request = index.openCursor(null, 'prev');
    
    const results: ScanHistoryRecord[] = [];
    let count = 0;

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor && count < limit) {
        results.push(cursor.value);
        count++;
        cursor.continue();
      } else {
        resolve(results);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

export async function getScanById(id: string): Promise<ScanHistoryRecord | null> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.SCAN_HISTORY], 'readonly');
    const store = transaction.objectStore(STORES.SCAN_HISTORY);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteScanHistory(id: string): Promise<void> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.SCAN_HISTORY], 'readwrite');
    const store = transaction.objectStore(STORES.SCAN_HISTORY);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearOldScans(daysToKeep: number = 30): Promise<number> {
  const db = await initDB();
  const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.SCAN_HISTORY], 'readwrite');
    const store = transaction.objectStore(STORES.SCAN_HISTORY);
    const index = store.index('timestamp');
    const request = index.openCursor(IDBKeyRange.upperBound(cutoffTime));
    
    let deletedCount = 0;

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        deletedCount++;
        cursor.continue();
      } else {
        resolve(deletedCount);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

// CVE Cache Operations
export async function getCachedCVE(packageKey: string): Promise<any[] | null> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.CVE_CACHE], 'readonly');
    const store = transaction.objectStore(STORES.CVE_CACHE);
    const request = store.get(packageKey);

    request.onsuccess = () => {
      const record: CVECacheRecord | undefined = request.result;
      if (record && record.expiresAt > Date.now()) {
        resolve(record.vulnerabilities);
      } else {
        resolve(null);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

export async function cacheCVE(
  packageKey: string,
  ecosystem: string,
  vulnerabilities: any[],
  ttlHours: number = 24
): Promise<void> {
  const db = await initDB();
  const record: CVECacheRecord = {
    packageKey,
    ecosystem,
    vulnerabilities,
    cachedAt: Date.now(),
    expiresAt: Date.now() + (ttlHours * 60 * 60 * 1000),
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.CVE_CACHE], 'readwrite');
    const store = transaction.objectStore(STORES.CVE_CACHE);
    const request = store.put(record);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearExpiredCache(): Promise<number> {
  const db = await initDB();
  const now = Date.now();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.CVE_CACHE], 'readwrite');
    const store = transaction.objectStore(STORES.CVE_CACHE);
    const index = store.index('expiresAt');
    const request = index.openCursor(IDBKeyRange.upperBound(now));
    
    let deletedCount = 0;

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        deletedCount++;
        cursor.continue();
      } else {
        resolve(deletedCount);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

// Ignored Findings Operations
export async function ignoreFinding(
  file: string,
  line: number,
  type: string,
  reason?: string
): Promise<string> {
  const db = await initDB();
  const id = `ignore-${file}-${line}-${type}`.replace(/[^a-zA-Z0-9-]/g, '-');
  const record: IgnoredFindingRecord = {
    id,
    file,
    line,
    type,
    reason,
    ignoredAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.IGNORED_FINDINGS], 'readwrite');
    const store = transaction.objectStore(STORES.IGNORED_FINDINGS);
    const request = store.put(record);

    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
}

export async function isIgnored(file: string, line: number, type: string): Promise<boolean> {
  const db = await initDB();
  const id = `ignore-${file}-${line}-${type}`.replace(/[^a-zA-Z0-9-]/g, '-');

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.IGNORED_FINDINGS], 'readonly');
    const store = transaction.objectStore(STORES.IGNORED_FINDINGS);
    const request = store.get(id);

    request.onsuccess = () => resolve(!!request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getIgnoredFindings(): Promise<IgnoredFindingRecord[]> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.IGNORED_FINDINGS], 'readonly');
    const store = transaction.objectStore(STORES.IGNORED_FINDINGS);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function unignoreFinding(id: string): Promise<void> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.IGNORED_FINDINGS], 'readwrite');
    const store = transaction.objectStore(STORES.IGNORED_FINDINGS);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Preferences Operations
export async function savePreference(key: string, value: any): Promise<void> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.PREFERENCES], 'readwrite');
    const store = transaction.objectStore(STORES.PREFERENCES);
    const request = store.put({ key, value });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getPreference(key: string): Promise<any | null> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.PREFERENCES], 'readonly');
    const store = transaction.objectStore(STORES.PREFERENCES);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result?.value || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllPreferences(): Promise<Record<string, any>> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.PREFERENCES], 'readonly');
    const store = transaction.objectStore(STORES.PREFERENCES);
    const request = store.getAll();

    request.onsuccess = () => {
      const prefs: Record<string, any> = {};
      request.result.forEach((item: any) => {
        prefs[item.key] = item.value;
      });
      resolve(prefs);
    };

    request.onerror = () => reject(request.error);
  });
}
