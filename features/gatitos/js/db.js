// User-uploaded assets in IndexedDB (blobs don't fit localStorage).
// Degrades to in-memory when IndexedDB is unavailable (private mode, etc.):
// uploads then work for the session but are not kept.

const DB_NAME = 'gatitos';
const STORE = 'assets';

const memory = new Map();
let dbPromise = null;

function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  return dbPromise;
}

const wrap = (req) =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

// record: { id, kind:'cat'|'accessory', name, mime, w, h, blob?, svg?, slot?, traits? }
export async function putAsset(record) {
  memory.set(record.id, record);
  const db = await open();
  if (!db) return false;
  try {
    await wrap(db.transaction(STORE, 'readwrite').objectStore(STORE).put(record));
    return true;
  } catch {
    return false;
  }
}

export async function listAssets() {
  const db = await open();
  if (!db) return [...memory.values()];
  try {
    return await wrap(db.transaction(STORE).objectStore(STORE).getAll());
  } catch {
    return [...memory.values()];
  }
}

export async function deleteAsset(id) {
  memory.delete(id);
  const db = await open();
  if (!db) return;
  try {
    await wrap(db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id));
  } catch {
    /* ignore */
  }
}
