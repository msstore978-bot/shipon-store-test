
const DB_NAME = 'shipon-store-offline';
const DB_VERSION = 2;

const stores = [
  'meta','customers','customer_transactions','sales','payments','due_add',
  'reminders','products','purchases','purchase_items','suppliers','supplier_transactions',
  'inventory','stock_ledger','expenses','images','sync_queue','sync_logs','audit_logs'
];

let dbPromise;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of stores) {
        if (!db.objectStoreNames.contains(name)) {
          const os = db.createObjectStore(name, { keyPath: 'id' });
          os.createIndex('updatedAt', 'updatedAt');
        }
      }
      // Useful secondary indexes.
      const customers = req.transaction.objectStore('customers');
      if (!customers.indexNames.contains('mobile')) customers.createIndex('mobile', 'mobile', {unique:false});
      if (!customers.indexNames.contains('name')) customers.createIndex('name', 'name', {unique:false});
      const queue = req.transaction.objectStore('sync_queue');
      if (!queue.indexNames.contains('status')) queue.createIndex('status', 'status');
      if (!queue.indexNames.contains('createdAt')) queue.createIndex('createdAt', 'createdAt');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function put(store, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve(value);
    tx.onerror = () => reject(tx.error);
  });
}
export async function get(store, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const r = tx.objectStore(store).get(id);
    r.onsuccess = () => resolve(r.result || null);
    r.onerror = () => reject(r.error);
  });
}
export async function getAll(store) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const r = tx.objectStore(store).getAll();
    r.onsuccess = () => resolve(r.result || []);
    r.onerror = () => reject(r.error);
  });
}
export async function remove(store, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}
export async function clearStore(store) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).clear();
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}
export async function count(store) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const r = tx.objectStore(store).count();
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() :
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random()*16|0, v = c === 'x' ? r : (r&3|8);
      return v.toString(16);
    });
}
export function nowIso() { return new Date().toISOString(); }

export async function setMeta(key, value) {
  return put('meta', {id:key, value, updatedAt:nowIso()});
}
export async function getMeta(key, fallback=null) {
  const x = await get('meta', key);
  return x ? x.value : fallback;
}
