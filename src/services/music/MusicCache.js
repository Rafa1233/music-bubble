const DB_NAME = 'AuraSoundV2DB';
const DB_VERSION = 1;
const STORE_API_CACHE = 'api_cache';
const STORE_LIBRARY = 'library_store';

const memoryCache = new Map();

function openV2DB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB tidak tersedia'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_API_CACHE)) {
        db.createObjectStore(STORE_API_CACHE);
      }
      if (!db.objectStoreNames.contains(STORE_LIBRARY)) {
        db.createObjectStore(STORE_LIBRARY);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getCachedApi(key) {
  const now = Date.now();
  const mem = memoryCache.get(key);
  if (mem && mem.expiresAt > now) {
    return mem.value;
  }

  try {
    const db = await openV2DB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_API_CACHE, 'readonly');
      const req = tx.objectStore(STORE_API_CACHE).get(key);
      req.onsuccess = () => {
        const entry = req.result;
        if (entry && entry.expiresAt > now) {
          memoryCache.set(key, entry);
          resolve(entry.value);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function setCachedApi(key, value, ttlMs = 15 * 60 * 1000) {
  const entry = { value, expiresAt: Date.now() + ttlMs };
  memoryCache.set(key, entry);

  try {
    const db = await openV2DB();
    await new Promise((resolve) => {
      const tx = db.transaction(STORE_API_CACHE, 'readwrite');
      tx.objectStore(STORE_API_CACHE).put(entry, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    // memory cache tetap aktif
  }
}

export async function clearExpiredCache() {
  const now = Date.now();
  for (const [k, v] of memoryCache.entries()) {
    if (v.expiresAt <= now) memoryCache.delete(k);
  }
  try {
    const db = await openV2DB();
    const tx = db.transaction(STORE_API_CACHE, 'readwrite');
    const store = tx.objectStore(STORE_API_CACHE);
    const req = store.openCursor();
    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (!cursor) return;
      if (!cursor.value || cursor.value.expiresAt <= now) {
        cursor.delete();
      }
      cursor.continue();
    };
  } catch {
    // abaikan
  }
}

export async function loadLibraryState(key, fallback = null) {
  try {
    const db = await openV2DB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_LIBRARY, 'readonly');
      const req = tx.objectStore(STORE_LIBRARY).get(key);
      req.onsuccess = () => resolve(req.result !== undefined ? req.result : fallback);
      req.onerror = () => resolve(fallback);
    });
  } catch {
    return fallback;
  }
}

export async function saveLibraryState(key, data) {
  try {
    const db = await openV2DB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_LIBRARY, 'readwrite');
      tx.objectStore(STORE_LIBRARY).put(data, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}
